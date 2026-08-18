import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import os from "node:os";
import { createServer as createViteServer } from "vite";
import { setupDatabase } from "./src/db.js";
import apiRouter from "./src/server/api.js";
import { processDueGoogleReviewCampaigns } from "./src/server/services/googleReviewService.js";

const PORT = Number.parseInt(process.env.PORT || "3000", 10);

async function startServer() {
  const app = express();
  
  // High body size limits for metadata / JSON payloads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Ensure uploads directory exists and serve static uploaded media files with byte-range streaming & caching
  const uploadsDir = process.env.VERCEL === "1" ? path.join(os.tmpdir(), "sps-uploads") : path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use(
    "/uploads",
    express.static(uploadsDir, {
      maxAge: "30d",
      acceptRanges: true,
      setHeaders: (res, filePath) => {
        res.setHeader("Accept-Ranges", "bytes");
        if (filePath.endsWith(".mp4") || filePath.endsWith(".webm")) {
          res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
        }
      },
    })
  );

  try {
    await setupDatabase();
  } catch (error) {
    console.error("Critical: Failed to setup database on startup", error);
  }
  
  app.use("/api", apiRouter);
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  let reviewWorkerRunning = false;
  const runReviewWorker = async () => {
    if (reviewWorkerRunning) return;
    reviewWorkerRunning = true;
    try {
      const result = await processDueGoogleReviewCampaigns();
      if (result.sent > 0) console.log(`[Google Review Worker] Sent ${result.sent} scheduled request(s).`);
    } catch (error) {
      console.error("[Google Review Worker] Processing failed:", error);
    } finally {
      reviewWorkerRunning = false;
    }
  };
  void runReviewWorker();
  const reviewWorkerTimer = setInterval(runReviewWorker, 60 * 1000);
  reviewWorkerTimer.unref();

  // Configure server timeouts to accommodate high-capacity uploads (up to 10 GB)
  server.timeout = 0; // Disable socket inactivity timeout for large stream uploads
  server.keepAliveTimeout = 600000; // 10 minutes keep-alive
  server.headersTimeout = 610000; // 10 minutes + 10s
  if ('requestTimeout' in server) {
    (server as any).requestTimeout = 0; // Node 18+ request timeout
  }
}

startServer();
