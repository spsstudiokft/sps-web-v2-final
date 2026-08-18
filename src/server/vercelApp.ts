import express from "express";
import { setupDatabase } from "../db.js";

let isDbSetup = false;
let dbSetupPromise: Promise<void> | null = null;

// The installed Express declaration resolves express() to core.Express instead
// of core.Application, even though the runtime value is the full application.
// Keep this boundary untyped so Vercel's per-function typecheck sees the real
// callable Express handler without losing app.use().
export function createVercelApp(configureRoutes: (app: any) => void): any {
  const app: any = express();

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  app.use(async (_req, res, next) => {
    if (isDbSetup) return next();
    try {
      if (!dbSetupPromise) {
        dbSetupPromise = setupDatabase()
          .then(() => { isDbSetup = true; })
          .catch((error) => {
            dbSetupPromise = null;
            throw error;
          });
      }
      await dbSetupPromise;
      next();
    } catch (error: any) {
      console.error("[Vercel API] Database initialization error:", error);
      res.status(500).json({
        error: "Database connection failed",
        message: error?.message || "Unable to reach database",
      });
    }
  });

  configureRoutes(app);

  app.use((req, res) => res.status(404).json({ error: "Not Found", path: req.path }));
  app.use((error: any, _req: any, res: any, _next: any) => {
    console.error("Unhandled Server Error:", error);
    res.status(500).json({ error: "Internal Server Error", message: error?.message });
  });

  return app;
}
