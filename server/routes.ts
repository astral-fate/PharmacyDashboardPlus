import { Express } from "express";
import { setupAuth } from "./auth.js";
import { db } from "../db/index.js";
import { 
  medicines, 
  pharmacies, 
  inventory, 
  users, 
  locations, 
  medicineCategories, 
  customerSupport,
  type User
} from "../db/schema.js";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express) {
  setupAuth(app);

  // Users endpoints
  app.get("/api/users", async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers.map((user: User) => ({ ...user, password: undefined })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Medicines endpoints
  app.get("/api/medicines", async (req, res) => {
    try {
      const allMedicines = await db
        .select()
        .from(medicines)
        .leftJoin(medicineCategories, eq(medicines.categoryId, medicineCategories.id));
      res.json(allMedicines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch medicines" });
    }
  });

  app.post("/api/medicines", async (req, res) => {
    try {
      const [newMedicine] = await db.insert(medicines).values(req.body).returning();
      res.json(newMedicine);
    } catch (error) {
      res.status(500).json({ error: "Failed to create medicine" });
    }
  });

  // Medicine Categories endpoints
  app.get("/api/medicine-categories", async (req, res) => {
    try {
      const allCategories = await db.select().from(medicineCategories);
      res.json(allCategories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch medicine categories" });
    }
  });

  app.post("/api/medicine-categories", async (req, res) => {
    try {
      const [newCategory] = await db.insert(medicineCategories).values(req.body).returning();
      res.json(newCategory);
    } catch (error) {
      res.status(500).json({ error: "Failed to create medicine category" });
    }
  });

  // Locations endpoints
  app.get("/api/locations", async (req, res) => {
    try {
      const allLocations = await db.select().from(locations);
      res.json(allLocations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.post("/api/locations", async (req, res) => {
    try {
      const [newLocation] = await db.insert(locations).values(req.body).returning();
      res.json(newLocation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create location" });
    }
  });

  // Pharmacies endpoints
  app.get("/api/pharmacies", async (req, res) => {
    try {
      const allPharmacies = await db
        .select()
        .from(pharmacies)
        .leftJoin(locations, eq(pharmacies.locationId, locations.id));
      res.json(allPharmacies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pharmacies" });
    }
  });

  app.post("/api/pharmacies", async (req, res) => {
    try {
      const [newPharmacy] = await db.insert(pharmacies).values(req.body).returning();
      res.json(newPharmacy);
    } catch (error) {
      res.status(500).json({ error: "Failed to create pharmacy" });
    }
  });

  // Customer Support endpoints
  app.get("/api/customer-support", async (req, res) => {
    try {
      const allTickets = await db
        .select()
        .from(customerSupport)
        .leftJoin(users, eq(customerSupport.userId, users.id));
      res.json(allTickets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch support tickets" });
    }
  });

  app.post("/api/customer-support", async (req, res) => {
    try {
      const [newTicket] = await db.insert(customerSupport).values(req.body).returning();
      res.json(newTicket);
    } catch (error) {
      res.status(500).json({ error: "Failed to create support ticket" });
    }
  });

  // Inventory endpoints
  app.get("/api/inventory", async (req, res) => {
    try {
      const allInventory = await db
        .select()
        .from(inventory)
        .leftJoin(medicines, eq(inventory.medicineId, medicines.id))
        .leftJoin(pharmacies, eq(inventory.pharmacyId, pharmacies.id));
      res.json(allInventory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const [newInventory] = await db.insert(inventory).values(req.body).returning();
      res.json(newInventory);
    } catch (error) {
      res.status(500).json({ error: "Failed to update inventory" });
    }
  });
}
