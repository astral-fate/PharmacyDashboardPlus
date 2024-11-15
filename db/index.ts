import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from "./schema.js";

// Configure Neon client settings
neonConfig.fetchConnectionCache = true;
neonConfig.useSecureWebSocket = true;

// Verify required environment variables
const requiredEnvVars = ['DATABASE_URL', 'PGDATABASE', 'PGHOST', 'PGUSER', 'PGPORT', 'PGPASSWORD'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Database configuration error: ${envVar} environment variable is not set`);
  }
}

// Configure SSL parameters for Neon.tech
const sslConfig = {
  ssl: true,
  sslmode: 'require'
};

// Connection retry configuration
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000;    // 30 seconds
const MAX_RETRIES = 5;

// Health check configuration
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

// Enhanced error handling with custom error class
class DatabaseConnectionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Create database connection with exponential backoff retry
async function createDbConnection() {
  let retryCount = 0;
  let delay = INITIAL_RETRY_DELAY;

  while (retryCount < MAX_RETRIES) {
    try {
      const sql = neon(process.env.DATABASE_URL!, {
        ...sslConfig,
        fetchOptions: {
          cache: 'no-store',
          timeout: 10000
        }
      });

      const db = drizzle(sql, { schema });
      
      // Test the connection
      await db.execute('SELECT 1');
      console.log('Database connection established successfully');
      
      // Setup periodic health checks
      setupHealthChecks(db);
      
      return db;
    } catch (error: any) {
      retryCount++;
      console.error(`Database connection attempt ${retryCount} failed:`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      if (retryCount === MAX_RETRIES) {
        throw new DatabaseConnectionError(
          `Failed to connect to database after ${MAX_RETRIES} attempts`,
          error
        );
      }

      // Exponential backoff with jitter
      delay = Math.min(delay * 1.5 * (1 + Math.random() * 0.1), MAX_RETRY_DELAY);
      console.log(`Retrying connection in ${delay}ms...`);
      await wait(delay);
    }
  }

  throw new DatabaseConnectionError('Max retries exceeded');
}

function setupHealthChecks(db: ReturnType<typeof drizzle>) {
  let isHealthy = true;
  let lastError: Error | null = null;

  async function performHealthCheck() {
    try {
      await db.execute('SELECT 1');
      if (!isHealthy) {
        console.log('Database connection restored');
        isHealthy = true;
        lastError = null;
      }
    } catch (error: any) {
      isHealthy = false;
      lastError = error;
      console.error('Database health check failed:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Start periodic health checks
  const interval = setInterval(performHealthCheck, HEALTH_CHECK_INTERVAL);

  // Clean up on process exit
  process.on('SIGTERM', () => {
    clearInterval(interval);
  });

  process.on('SIGINT', () => {
    clearInterval(interval);
  });

  return {
    isHealthy: () => isHealthy,
    lastError: () => lastError,
    check: performHealthCheck
  };
}

// Initialize database connection
let db: ReturnType<typeof drizzle>;
let healthCheck: ReturnType<typeof setupHealthChecks>;

try {
  db = await createDbConnection();
} catch (error) {
  console.error('Fatal: Could not establish database connection:', error);
  process.exit(1);
}

export { db };
export const getDatabaseHealth = () => ({
  isHealthy: healthCheck?.isHealthy() ?? false,
  lastError: healthCheck?.lastError()?.message
});
