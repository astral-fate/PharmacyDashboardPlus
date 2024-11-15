import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { createServer } from "http";
import { setupMiddleware, notFoundHandler, errorHandler } from "./middleware.js";
import compression from "compression";
import { db } from "../db/index.js";
import { WebSocket, WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable compression early
app.use(compression({
  level: 6,
  threshold: 0,
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Trust proxy in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Add health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Add readiness probe with database check
app.get('/ready', async (req: Request, res: Response) => {
  try {
    await db.execute('SELECT 1');
    res.json({ status: 'ready' });
  } catch (error: any) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

(async () => {
  try {
    // Database connection check first
    try {
      await db.execute('SELECT 1');
      console.log('Database health check passed');
    } catch (error) {
      console.error('Database health check failed:', error);
      process.exit(1);
    }

    // Create server instance
    const server = createServer(app);

    // Setup middleware before routes
    setupMiddleware(app);
    
    // Setup routes
    registerRoutes(app);

    // Setup static file serving and SPA handling
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, server);
    } else {
      // Serve static files from the dist/public directory
      const staticPath = path.join(__dirname, '..', 'public');
      console.log('Serving static files from:', staticPath);
      
      // Serve static files with aggressive caching
      app.use(express.static(staticPath, {
        maxAge: '7d',
        etag: true,
        lastModified: true,
        immutable: true,
        cacheControl: true
      }));

      // SPA fallback for client-side routing
      app.get('/*', (req: Request, res: Response, next: NextFunction) => {
        if (req.path.startsWith('/api')) {
          return next();
        }
        res.sendFile(path.join(staticPath, 'index.html'), {
          maxAge: '1h',
          etag: true,
          lastModified: true
        }, (err) => {
          if (err) {
            console.error('Error serving index.html:', err);
            next(err);
          }
        });
      });
    }

    // Setup WebSocket server with improved error handling and connection management
    const wss = new WebSocketServer({ 
      server,
      path: '/ws',
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
      },
      maxPayload: 5 * 1024 * 1024 // 5MB max payload
    });

    // WebSocket connection handling with improved error handling
    wss.on('connection', (ws: WebSocket & { isAlive?: boolean }) => {
      console.log('New WebSocket connection established');

      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });

      const heartbeat = setInterval(() => {
        if (!ws.isAlive) {
          clearInterval(heartbeat);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      }, 30000);

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        clearInterval(heartbeat);
      });

      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        clearInterval(heartbeat);
      });

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'pong') {
            ws.send(JSON.stringify({ type: 'ack' }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });
    });

    // Add 404 handler for API routes
    app.use('/api/*', notFoundHandler);

    // Add error handler for static files
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      if (err.message.includes('ENOENT')) {
        console.error('Static file not found:', req.path);
        res.status(404).send('File Not Found');
      } else {
        console.error('Static file error:', err);
        res.status(500).send('Internal Server Error');
      }
    });

    // Add error handler last
    app.use(errorHandler);

    // Server configuration
    const PORT = process.env.PORT || 3000;
    const HOST = '0.0.0.0';

    server.listen(Number(PORT), HOST, () => {
      console.log(`[${new Date().toLocaleTimeString()}] Server running in ${app.get('env')} mode`);
      console.log(`Local URL: http://${HOST}:${PORT}`);
      
      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        console.log(`Production URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
      }
    });

    // Graceful shutdown handler
    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      
      // Close WebSocket server first
      wss.close(() => {
        console.log('WebSocket server closed');
        // Then close HTTP server
        server.close(() => {
          console.log('HTTP server closed');
          process.exit(0);
        });
      });

      // Force close after 10s
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Setup signal handlers
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Global error handlers
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      shutdown().catch(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
