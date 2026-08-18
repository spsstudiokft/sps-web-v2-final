import express from "express";
import { setupDatabase, getDb } from "../src/db.js";
import apiRouter from "../src/server/api.js";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Basic CORS header helper for API responses
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Dedicated health and diagnostic endpoint
app.get(["/api/health", "/health"], async (req, res) => {
  try {
    const client = getDb();
    const testResult = await client.execute("SELECT 1 as alive");
    return res.json({
      status: "ok",
      database: "connected",
      dbInitialized: isDbSetup,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      status: "error",
      database: "disconnected",
      message: err.message,
      hint: "Ensure DATABASE_URL and DATABASE_AUTH_TOKEN are set in Vercel environment variables."
    });
  }
});

let isDbSetup = false;
let dbSetupPromise: Promise<void> | null = null;

// Database initialization middleware
app.use(async (req, res, next) => {
  if (!isDbSetup) {
    try {
      if (!dbSetupPromise) {
        dbSetupPromise = setupDatabase().then(() => {
          isDbSetup = true;
        }).catch((err) => {
          dbSetupPromise = null;
          throw err;
        });
      }
      await dbSetupPromise;
    } catch (err: any) {
      console.error("[Vercel API] Database initialization error:", err);
      return res.status(500).json({
        error: "Database connection failed",
        message: err.message || "Unable to reach database",
        hint: "Please verify DATABASE_URL and DATABASE_AUTH_TOKEN in Vercel Project Settings."
      });
    }
  }
  next();
});

app.use("/api", apiRouter);
// Fallback for Vercel rewrites which might strip prefix depending on environment
app.use(apiRouter);

// Explicit 404 handler
app.use((req: any, res: any) => {
  res.status(404).json({ error: "Not Found", path: req.path });
});

// Explicit error handler to prevent crashing
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

export default app;
