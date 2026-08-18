import { Router } from "express";
import crypto from "crypto";
import multer from "multer";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { uploadMedia, deleteMedia } from "./storage/index.js";
import { diagnoseAppwriteStorage } from "./storage/appwrite.js";
import { translationService } from "./services/translationService.js";
import { getAllLegalDocuments, saveLegalDocument } from "./services/legalDocumentService.js";
import { scheduleGoogleReviewCampaign } from "./services/googleReviewService.js";
import budgetRouter from "./budgetRouter.js";
import { invoiceRouter } from "./invoiceRouter.js";
import { paymentRequestRouter } from "./paymentRequestRouter.js";
import { referralRouter } from "./referralRouter.js";
import { 
  processStructuredMediaUpload,
  validateStructuredFilename,
  buildStructuredFilename,
  sanitizeNameForFilename,
  formatItemNumber,
  batchRestructureGalleryItems,
  restructureSingleMediaItem
} from "./services/mediaProcessingService.js";
import { 
  sendTransactionalEmail, 
  sendPortalInvitationEmail,
  sendAdminInvitationEmail,
  getEmailSenderConfig, 
  generateEmailHtml, 
  getResendClient,
  getAllEmailTemplates,
  getEmailTemplateByKey,
  saveCustomEmailTemplate,
  resetEmailTemplateToDefault,
  generateEmailFromTemplate,
  interpolateTemplateTokens,
  wrapInEmailLayout,
  sanitizeEmailHtml,
  EmailTemplateData
} from "./services/emailService.js";

function isValidUrl(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string' || urlStr.trim() === '') return true;
  const trimmed = urlStr.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

// Prepare disk storage for temp upload streams (supports up to 10GB uploads without crashing RAM)
const UPLOAD_TEMP_DIR = path.join(process.cwd(), "uploads", "temp");
if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
  fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

// 10 GB limit: 10 * 1024 * 1024 * 1024 bytes = 10,737,418,240 bytes
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024;

const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
    fieldSize: 50 * 1024 * 1024,
  },
});

const adminRouter = Router();

// Mount Budget Manager sub-router
adminRouter.use("/budgets", budgetRouter);
adminRouter.use("/invoices", invoiceRouter);
adminRouter.use("/payment-requests", paymentRequestRouter);
adminRouter.use("/referrals", referralRouter);

// Multer for chunk uploads (small slices e.g. 2.5MB to 20MB)
const chunkUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      try {
        if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
          fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
        }
        cb(null, UPLOAD_TEMP_DIR);
      } catch (err: any) {
        cb(err, UPLOAD_TEMP_DIR);
      }
    },
    filename: (_req, file, cb) => {
      const safeSuffix = crypto.randomBytes(6).toString("hex");
      cb(null, `chunk-${Date.now()}-${safeSuffix}-${(file.originalname || "part").replace(/[^a-zA-Z0-9.\-_]/g, '_')}`);
    }
  }),
  limits: { 
    fileSize: 50 * 1024 * 1024,
    fieldSize: 10 * 1024 * 1024
  }
});

// Single Chunk Upload endpoint with explicit multer error trap and resilient filesystem writes
adminRouter.post("/media/upload/chunk", (req, res, next) => {
  chunkUpload.single("chunk")(req, res, (err: any) => {
    if (err) {
      console.error("[Chunk Upload] Multer processing error:", err);
      return res.status(400).json({ error: err.message || "Failed to process multipart chunk." });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks, fileName } = req.body;
    if (!req.file || !uploadId || chunkIndex === undefined) {
      return res.status(400).json({ error: "Missing chunk payload or metadata." });
    }

    if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
      fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
    }

    const chunkTarget = path.join(UPLOAD_TEMP_DIR, `${uploadId}.part${chunkIndex}`);
    
    // Resilient file placement (rename with copy fallback across mount points)
    try {
      if (fs.existsSync(chunkTarget)) {
        try { fs.unlinkSync(chunkTarget); } catch {}
      }
      fs.renameSync(req.file.path, chunkTarget);
    } catch (renameErr) {
      fs.copyFileSync(req.file.path, chunkTarget);
      try { fs.unlinkSync(req.file.path); } catch {}
    }

    res.json({ success: true, chunkIndex: Number(chunkIndex) });
  } catch (error: any) {
    console.error("Failed to process upload chunk:", error);
    res.status(500).json({ error: error.message || "Failed to process chunk" });
  }
});

// Chunked Upload Assembly and Final Upload endpoint
adminRouter.post("/media/upload/chunk-complete", async (req, res) => {
  try {
    const { uploadId, fileName, totalChunks, mimeType, fileSize } = req.body;
    if (!uploadId || !fileName || !totalChunks) {
      return res.status(400).json({ error: "Missing required parameters for completing upload." });
    }

    const count = Number(totalChunks);
    const sanitizedSafeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const finalMergedPath = path.join(UPLOAD_TEMP_DIR, `assembled-${Date.now()}-${sanitizedSafeName}`);
    const writeStream = fs.createWriteStream(finalMergedPath);

    // Verify all chunks exist
    for (let i = 0; i < count; i++) {
      const partPath = path.join(UPLOAD_TEMP_DIR, `${uploadId}.part${i}`);
      if (!fs.existsSync(partPath)) {
        writeStream.close();
        try { fs.unlinkSync(finalMergedPath); } catch {}
        return res.status(400).json({ error: `Missing chunk part ${i} for upload ${uploadId}.` });
      }
    }

    // Concatenate chunks in numerical order
    await new Promise<void>((resolve, reject) => {
      let currentIdx = 0;
      function pipeNext() {
        if (currentIdx >= count) {
          writeStream.end();
          resolve();
          return;
        }
        const partPath = path.join(UPLOAD_TEMP_DIR, `${uploadId}.part${currentIdx}`);
        const readStream = fs.createReadStream(partPath);
        readStream.pipe(writeStream, { end: false });
        readStream.on("end", () => {
          try { fs.unlinkSync(partPath); } catch {}
          currentIdx++;
          pipeNext();
        });
        readStream.on("error", (err) => {
          writeStream.close();
          reject(err);
        });
      }
      pipeNext();
    });

    const stat = fs.statSync(finalMergedPath);

    const assembledFile: Express.Multer.File = {
      fieldname: "file",
      originalname: fileName,
      encoding: "7bit",
      mimetype: mimeType || "application/octet-stream",
      size: stat.size,
      destination: UPLOAD_TEMP_DIR,
      filename: path.basename(finalMergedPath),
      path: finalMergedPath,
      buffer: undefined as any,
      stream: undefined as any,
    };

    // Get settings to determine active provider
    const result = await db.execute("SELECT * FROM settings WHERE key = 'media_provider'");
    const mediaProvider = result.rows.length > 0 ? result.rows[0].value : (process.env.MEDIA_PROVIDER || "r2");

    const mediaResult = await uploadMedia(assembledFile, mediaProvider as string);

    const id = crypto.randomUUID();
    
    await db.execute({
      sql: `INSERT INTO media_uploads (id, provider, bucket, file_key, public_url, original_name) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, mediaResult.provider, mediaResult.bucket, mediaResult.file_key, mediaResult.public_url, mediaResult.original_name]
    });

    res.json({ success: true, url: mediaResult.public_url, id, provider: mediaResult.provider });
  } catch (error: any) {
    console.error("Failed to complete chunked media upload:", error);
    const status = error.code === 413 || error.isAppwriteSizeLimit ? 413 : 500;
    res.status(status).json({ error: error.message || "Failed to finalize media upload" });
  }
});

// Appwrite Storage Diagnostics
adminRouter.get("/storage/diagnose-appwrite", async (req, res) => {
  try {
    const diagnostic = await diagnoseAppwriteStorage();
    res.json(diagnostic);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Diagnostic failed" });
  }
});

adminRouter.post("/storage/test-appwrite", async (req, res) => {
  try {
    const diagnostic = await diagnoseAppwriteStorage();
    res.json(diagnostic);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Diagnostic failed" });
  }
});

// Upload media with 10 GB capacity and disk streaming
adminRouter.post("/media/upload", (req, res, next) => {
  // Prevent socket/request timeout on long-running large file uploads
  req.setTimeout(0);
  
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File exceeds the maximum allowed limit of 10 GB." });
      }
      return res.status(400).json({ error: err.message || "Failed to upload file." });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Get settings to determine active provider
    const result = await db.execute("SELECT * FROM settings WHERE key = 'media_provider'");
    const mediaProvider = result.rows.length > 0 ? result.rows[0].value : (process.env.MEDIA_PROVIDER || "r2");

    const { projectName, categoryName, itemType, itemNumber, useStructuredName } = req.body;
    const shouldStructure = useStructuredName === true || useStructuredName === "true" || !!projectName || !!categoryName;

    if (shouldStructure) {
      const processed = await processStructuredMediaUpload({
        file: req.file,
        projectName,
        categoryName,
        itemType,
        itemNumber,
        mediaProvider: mediaProvider as string,
      });

      const origId = crypto.randomUUID();
      try {
        await db.execute({
          sql: `INSERT INTO media_uploads (id, provider, bucket, file_key, public_url, original_name) 
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [origId, processed.original.provider || mediaProvider, "", processed.original.filename, processed.original.url, processed.original.originalName]
        });
      } catch {}

      if (processed.compressed) {
        const compId = crypto.randomUUID();
        try {
          await db.execute({
            sql: `INSERT INTO media_uploads (id, provider, bucket, file_key, public_url, original_name) 
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [compId, processed.compressed.provider || mediaProvider, "", processed.compressed.filename, processed.compressed.url, processed.compressed.filename]
          });
        } catch {}
      }

      return res.json({
        success: true,
        url: processed.original.url,
        id: origId,
        filename: processed.original.filename,
        original_filename: processed.original.originalName,
        file_size: processed.original.size,
        compressed_url: processed.compressed?.url,
        compressed_filename: processed.compressed?.filename,
        compressed_size: processed.compressed?.size,
        item_number: processed.itemNumber,
        project_name: processed.projectName,
        category_name: processed.categoryName,
        provider: processed.original.provider || mediaProvider,
      });
    }

    const mediaResult = await uploadMedia(req.file, mediaProvider as string);

    const id = crypto.randomUUID();
    
    await db.execute({
      sql: `INSERT INTO media_uploads (id, provider, bucket, file_key, public_url, original_name) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, mediaResult.provider, mediaResult.bucket, mediaResult.file_key, mediaResult.public_url, mediaResult.original_name]
    });

    res.json({ success: true, url: mediaResult.public_url, id, original_name: mediaResult.original_name });
  } catch (error: any) {
    console.error("Failed to upload media", error);
    res.status(500).json({ error: error.message || "Failed to upload media" });
  }
});

// Validate structured filename pattern
adminRouter.post("/media/validate-filename", async (req, res) => {
  try {
    const { filename } = req.body;
    const validation = validateStructuredFilename(filename);
    res.json(validation);
  } catch (error: any) {
    res.status(500).json({ valid: false, error: error.message || "Failed to validate filename" });
  }
});

// Batch restructure gallery media items: renames unstructured files in bucket and creates under 10MB images
adminRouter.post("/media/batch-restructure", async (req, res) => {
  req.setTimeout(0);
  try {
    const { items, projectName, categoryName, portfolioItemId } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing or invalid items array." });
    }

    const result = await db.execute("SELECT * FROM settings WHERE key = 'media_provider'");
    const mediaProvider = result.rows.length > 0 ? result.rows[0].value : (process.env.MEDIA_PROVIDER || "r2");

    const processed = await batchRestructureGalleryItems({
      items,
      projectName,
      categoryName,
      mediaProvider: mediaProvider as string,
    });

    if (portfolioItemId) {
      const updated = await db.execute({
        sql: "UPDATE portfolio_items SET image_urls = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [JSON.stringify(processed.items), String(portfolioItemId)],
      });
      if (updated.rowsAffected === 0) return res.status(404).json({ error: "Portfolio gallery not found; bucket changes were completed but database gallery metadata could not be linked." });
    }

    res.json({
      success: true,
      items: processed.items,
      summary: processed.summary,
    });
  } catch (error: any) {
    console.error("Batch restructure media failed:", error);
    res.status(500).json({ error: error.message || "Failed to batch restructure media" });
  }
});

// Single media item restructure endpoint
adminRouter.post("/media/restructure-item", async (req, res) => {
  req.setTimeout(0);
  try {
    const { item, projectName, categoryName, itemNumber, targetFilename, sourceFilename, portfolioItemId } = req.body;
    if (!item) {
      return res.status(400).json({ error: "Missing item object." });
    }

    const result = await db.execute("SELECT * FROM settings WHERE key = 'media_provider'");
    const mediaProvider = result.rows.length > 0 ? result.rows[0].value : (process.env.MEDIA_PROVIDER || "r2");

    const processed = await restructureSingleMediaItem({
      item,
      projectName,
      categoryName,
      itemNumber,
      mediaProvider: mediaProvider as string,
      targetFilename,
      sourceFilename,
    });
    if (processed.error) return res.status(500).json({ error: processed.error, item: processed.item });

    if (portfolioItemId && processed.item) {
      const current = await db.execute({ sql: "SELECT image_urls FROM portfolio_items WHERE id = ? LIMIT 1", args: [String(portfolioItemId)] });
      if (current.rows.length === 0) return res.status(404).json({ error: "Portfolio gallery not found; bucket changes were completed but database gallery metadata could not be linked." });
      let galleryItems: any[] = [];
      try { galleryItems = JSON.parse(String(current.rows[0].image_urls || "[]")); } catch {}
      const matchIndex = galleryItems.findIndex((entry: any) =>
        (entry?.id && item.id && String(entry.id) === String(item.id))
        || (entry?.url && item.url && String(entry.url) === String(item.url))
        || (sourceFilename && String(entry?.filename || entry?.original_filename || "") === String(sourceFilename))
      );
      if (matchIndex >= 0) galleryItems[matchIndex] = { ...galleryItems[matchIndex], ...processed.item };
      else galleryItems.push(processed.item);
      await db.execute({ sql: "UPDATE portfolio_items SET image_urls = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [JSON.stringify(galleryItems), String(portfolioItemId)] });
    }

    res.json({
      success: true,
      item: processed.item,
      renamedInBucket: processed.renamedInBucket,
      compressedCreated: processed.compressedCreated,
      error: processed.error,
    });
  } catch (error: any) {
    console.error("Restructure single media item failed:", error);
    res.status(500).json({ error: error.message || "Failed to restructure media item" });
  }
});

// Upload structured media directly (explicit endpoint)
adminRouter.post("/media/upload-structured", (req, res, next) => {
  req.setTimeout(0);
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File exceeds the maximum allowed limit of 10 GB." });
      }
      return res.status(400).json({ error: err.message || "Failed to upload file." });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { projectName, categoryName, itemType, itemNumber } = req.body;
    const result = await db.execute("SELECT * FROM settings WHERE key = 'media_provider'");
    const mediaProvider = result.rows.length > 0 ? result.rows[0].value : (process.env.MEDIA_PROVIDER || "r2");

    const processed = await processStructuredMediaUpload({
      file: req.file,
      projectName,
      categoryName,
      itemType,
      itemNumber,
      mediaProvider: mediaProvider as string,
    });

    const origId = crypto.randomUUID();
    try {
      await db.execute({
        sql: `INSERT INTO media_uploads (id, provider, bucket, file_key, public_url, original_name) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [origId, processed.original.provider || mediaProvider, "", processed.original.filename, processed.original.url, processed.original.originalName]
      });
    } catch {}

    if (processed.compressed) {
      const compId = crypto.randomUUID();
      try {
        await db.execute({
          sql: `INSERT INTO media_uploads (id, provider, bucket, file_key, public_url, original_name) 
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [compId, processed.compressed.provider || mediaProvider, "", processed.compressed.filename, processed.compressed.url, processed.compressed.filename]
        });
      } catch {}
    }

    res.json({
      success: true,
      url: processed.original.url,
      id: origId,
      filename: processed.original.filename,
      original_filename: processed.original.originalName,
      file_size: processed.original.size,
      compressed_url: processed.compressed?.url,
      compressed_filename: processed.compressed?.filename,
      compressed_size: processed.compressed?.size,
      item_number: processed.itemNumber,
      project_name: processed.projectName,
      category_name: processed.categoryName,
      provider: processed.original.provider || mediaProvider,
    });
  } catch (error: any) {
    console.error("Failed to upload structured media", error);
    res.status(500).json({ error: error.message || "Failed to process structured media upload" });
  }
});

// Upload branding asset (logos, favicons) with strict format & size verification
adminRouter.post("/branding/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided for upload" });
    }

    const file = req.file;
    const allowedMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/webp",
      "image/x-icon",
      "image/vnd.microsoft.icon",
      "image/gif",
      "image/avif"
    ];

    const isFaviconType = file.originalname.toLowerCase().endsWith(".ico") || 
      file.mimetype === "image/x-icon" || 
      file.mimetype === "image/vnd.microsoft.icon";

    if (!allowedMimeTypes.includes(file.mimetype) && !isFaviconType) {
      return res.status(400).json({ 
        error: "Invalid file format. Allowed formats: PNG, JPG, SVG, WebP, ICO, GIF." 
      });
    }

    // 5MB max file size
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return res.status(400).json({ 
        error: `File size exceeds limit (${(file.size / (1024 * 1024)).toFixed(1)}MB > 5MB max)` 
      });
    }

    // Get settings to determine active provider
    const result = await db.execute("SELECT * FROM settings WHERE key = 'media_provider'");
    const mediaProvider = result.rows.length > 0 ? result.rows[0].value : (process.env.MEDIA_PROVIDER || "r2");

    const mediaResult = await uploadMedia(file, mediaProvider as string);
    const id = crypto.randomUUID();

    try {
      await db.execute({
        sql: `INSERT INTO media_uploads (id, provider, bucket, file_key, public_url, original_name) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, mediaResult.provider, mediaResult.bucket, mediaResult.file_key, mediaResult.public_url, mediaResult.original_name]
      });
    } catch (dbErr) {
      // media_uploads table is optional for branding
    }

    res.json({ 
      success: true, 
      url: mediaResult.public_url, 
      id,
      original_name: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
  } catch (error: any) {
    console.error("Failed to upload branding asset", error);
    res.status(500).json({ error: error.message || "Failed to upload branding asset" });
  }
});

// Verify token
adminRouter.get("/verify", (req, res) => {
  res.json({ valid: true });
});

// Get settings
adminRouter.get("/settings", async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM settings");
    const settings = result.rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settings);
  } catch (error) {
    console.error("Failed to fetch settings", error);
    res.status(500).json({ error: "Database error while fetching settings" });
  }
});

// Update settings
adminRouter.post("/settings", async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'string') {
        let finalValue = value;
        // Validate theme_colors
        if (key === 'theme_colors') {
          try {
            const parsed = JSON.parse(value);
            // Basic sanitization: recursively ensure all values match a color regex or are simple strings
            const sanitizeColors = (obj: any) => {
              for (const k in obj) {
                if (typeof obj[k] === 'object') {
                  sanitizeColors(obj[k]);
                } else if (typeof obj[k] === 'string') {
                  // Allow hex, rgb/a, hsl/a, and valid CSS color names. Basic defense against XSS in CSS vars.
                  const isValidColor = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+)$/.test(obj[k].trim());
                  if (!isValidColor) {
                    obj[k] = '#000000'; // fallback
                  }
                }
              }
            };
            sanitizeColors(parsed);
            finalValue = JSON.stringify(parsed);
          } catch (e) {
            // If it's invalid JSON, skip it or fallback
            finalValue = "{}";
          }
        }

        await db.execute({
          sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
          args: [key, finalValue]
        });
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

adminRouter.get("/legal-documents", async (_req, res) => {
  try {
    res.json(await getAllLegalDocuments());
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch legal documents" });
  }
});

adminRouter.put("/legal-documents/:type/:locale", async (req, res) => {
  try {
    const document = await saveLegalDocument(req.params.type, req.params.locale, req.body.title, req.body.content);
    res.json({ success: true, document });
  } catch (error: any) {
    const status = /Unknown|Invalid|required/.test(error.message || "") ? 400 : 500;
    res.status(status).json({ error: error.message || "Failed to save legal document" });
  }
});

// ==========================================
// THEME MANAGEMENT ENDPOINTS
// ==========================================

// Get all themes (presets and custom)
adminRouter.get("/themes", async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM themes ORDER BY is_preset DESC, created_at ASC");
    const themes = result.rows.map((row: any) => {
      let config = {};
      try {
        config = typeof row.config === "string" ? JSON.parse(row.config) : row.config;
      } catch (e) {
        config = {};
      }
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        target: row.target,
        isPreset: Boolean(row.is_preset),
        config,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });
    res.json(themes);
  } catch (error) {
    console.error("Failed to fetch themes", error);
    res.status(500).json({ error: "Database error while fetching themes" });
  }
});

// Create a new custom theme
adminRouter.post("/themes", async (req, res) => {
  try {
    const { name, description, target = "both", config } = req.body;
    if (!name || !config) {
      return res.status(400).json({ error: "Name and theme configuration are required." });
    }

    const id = "custom-theme-" + crypto.randomUUID().slice(0, 8);
    const configWithId = {
      ...config,
      id,
      name,
      target,
      isPreset: false
    };

    await db.execute({
      sql: `INSERT INTO themes (id, name, description, target, is_preset, config)
            VALUES (?, ?, ?, ?, 0, ?)`,
      args: [id, name, description || "", target, JSON.stringify(configWithId)]
    });

    res.json({ success: true, theme: { id, name, description, target, isPreset: false, config: configWithId } });
  } catch (error: any) {
    console.error("Failed to create theme", error);
    res.status(500).json({ error: error.message || "Failed to create theme" });
  }
});

// Update a custom theme
adminRouter.put("/themes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, target, config } = req.body;

    const existing = await db.execute({
      sql: "SELECT * FROM themes WHERE id = ?",
      args: [id]
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Theme not found" });
    }

    const isPreset = Boolean(existing.rows[0].is_preset);
    const updatedConfig = {
      ...(config || {}),
      id,
      name: name || existing.rows[0].name,
      target: target || existing.rows[0].target,
      isPreset
    };

    await db.execute({
      sql: `UPDATE themes 
            SET name = ?, description = ?, target = ?, config = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        name || existing.rows[0].name,
        description !== undefined ? description : existing.rows[0].description,
        target || existing.rows[0].target,
        JSON.stringify(updatedConfig),
        id
      ]
    });

    res.json({ success: true, theme: { id, name, description, target, isPreset, config: updatedConfig } });
  } catch (error: any) {
    console.error("Failed to update theme", error);
    res.status(500).json({ error: error.message || "Failed to update theme" });
  }
});

// Delete a custom theme
adminRouter.delete("/themes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.execute({
      sql: "SELECT * FROM themes WHERE id = ?",
      args: [id]
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Theme not found" });
    }

    if (Boolean(existing.rows[0].is_preset)) {
      return res.status(400).json({ error: "Cannot delete built-in preset themes" });
    }

    await db.execute({
      sql: "DELETE FROM themes WHERE id = ?",
      args: [id]
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete theme", error);
    res.status(500).json({ error: error.message || "Failed to delete theme" });
  }
});

// Activate theme(s) for public website and/or admin dashboard
adminRouter.post("/themes/apply", async (req, res) => {
  try {
    const { publicTheme, adminTheme, publicThemeId, adminThemeId } = req.body;

    if (publicTheme) {
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        args: ["theme_public_config", JSON.stringify(publicTheme)]
      });
      // Also update legacy theme_colors for backward compatibility
      if (publicTheme.colors) {
        await db.execute({
          sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
          args: ["theme_colors", JSON.stringify(publicTheme.colors)]
        });
      }
    }

    if (publicThemeId) {
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        args: ["active_public_theme_id", publicThemeId]
      });
    }

    if (adminTheme) {
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        args: ["theme_admin_config", JSON.stringify(adminTheme)]
      });
    }

    if (adminThemeId) {
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        args: ["active_admin_theme_id", adminThemeId]
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to apply active theme", error);
    res.status(500).json({ error: error.message || "Failed to apply active theme" });
  }
});

// Get Categories
adminRouter.get("/categories", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT c.*, 
        (SELECT p.name FROM categories p WHERE p.id = c.parent_id) as parent_name,
        (SELECT COUNT(*) FROM portfolio_items pi WHERE pi.category_id = c.id) as item_count
      FROM categories c 
      ORDER BY c.sort_order ASC, c.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch categories", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Create Category
adminRouter.post("/categories", async (req, res) => {
  try {
    const { name, slug, description, parent_id, sort_order } = req.body;
    if (!name || (typeof name === "string" && !name.trim())) {
      return res.status(400).json({ error: "Category name is required" });
    }
    const id = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO categories (id, name, slug, description, parent_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, name, slug || "", description || "", parent_id || null, sort_order || 0]
    });
    res.json({ success: true, id });
  } catch (error) {
    console.error("Failed to create category", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// Update Category
adminRouter.put("/categories/:id", async (req, res) => {
  try {
    const { name, slug, description, parent_id, sort_order } = req.body;
    if (!name || (typeof name === "string" && !name.trim())) {
      return res.status(400).json({ error: "Category name is required" });
    }
    await db.execute({
      sql: "UPDATE categories SET name = ?, slug = ?, description = ?, parent_id = ?, sort_order = ? WHERE id = ?",
      args: [name, slug || "", description || "", parent_id || null, sort_order || 0, req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update category", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// Delete Category
adminRouter.delete("/categories/:id", async (req, res) => {
  try {
    // Set category_id to NULL for all portfolio items linked to this category
    await db.execute({
      sql: "UPDATE portfolio_items SET category_id = NULL WHERE category_id = ?",
      args: [req.params.id]
    });

    await db.execute({
      sql: "DELETE FROM categories WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// Get all portfolio items
adminRouter.get("/portfolio", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT p.*, c.name as category_name, c.slug as category_slug 
      FROM portfolio_items p 
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.sort_order ASC, p.created_at DESC
    `);
    
    // Fetch associated projects
    const items = await Promise.all(result.rows.map(async (item) => {
      const projectsRes = await db.execute({
        sql: `SELECT p.id, p.name FROM projects p
              JOIN project_portfolio_items ppi ON p.id = ppi.project_id
              WHERE ppi.portfolio_item_id = ?`,
        args: [item.id]
      });
      return { ...item, projects: projectsRes.rows };
    }));
    
    res.json(items);
  } catch (error) {
    console.error("Failed to fetch portfolio", error);
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

// Create portfolio item
adminRouter.post("/portfolio", async (req, res) => {
  try {
    const { title, description, category_id, item_type, media_type, media_url, thumbnail_url, image_urls, target_url, is_featured, is_published, sort_order, keywords } = req.body;
    const id = crypto.randomUUID();
    const resolvedItemType = item_type || (media_type === "video" ? "interior_video" : "image");
    const resolvedMediaType = (resolvedItemType === "drone_video" || resolvedItemType === "interior_video" || media_type === "video") ? "video" : "image";

    await db.execute({
      sql: "INSERT INTO portfolio_items (id, title, description, category_id, item_type, media_type, media_url, thumbnail_url, image_urls, target_url, is_featured, is_published, sort_order, keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        id, 
        title, 
        description || "", 
        category_id || null, 
        resolvedItemType,
        resolvedMediaType,
        media_url || "",
        thumbnail_url || "",
        JSON.stringify(image_urls || []), 
        target_url || "", 
        is_featured ? 1 : 0, 
        is_published !== undefined ? (is_published ? 1 : 0) : 1, 
        sort_order || 0, 
        keywords || ""
      ]
    });
    res.json({ success: true, id });
  } catch (error) {
    console.error("Failed to create portfolio item", error);
    res.status(500).json({ error: "Failed to create portfolio item" });
  }
});

// Update portfolio item
adminRouter.put("/portfolio/:id", async (req, res) => {
  try {
    const { title, description, category_id, item_type, media_type, media_url, thumbnail_url, image_urls, target_url, is_featured, is_published, sort_order, keywords } = req.body;
    const resolvedItemType = item_type || (media_type === "video" ? "interior_video" : "image");
    const resolvedMediaType = (resolvedItemType === "drone_video" || resolvedItemType === "interior_video" || media_type === "video") ? "video" : "image";

    await db.execute({
      sql: "UPDATE portfolio_items SET title = ?, description = ?, category_id = ?, item_type = ?, media_type = ?, media_url = ?, thumbnail_url = ?, image_urls = ?, target_url = ?, is_featured = ?, is_published = ?, sort_order = ?, keywords = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [
        title, 
        description || "", 
        category_id || null, 
        resolvedItemType,
        resolvedMediaType,
        media_url || "",
        thumbnail_url || "",
        JSON.stringify(image_urls || []), 
        target_url || "", 
        is_featured ? 1 : 0, 
        is_published ? 1 : 0, 
        sort_order || 0, 
        keywords || "", 
        req.params.id
      ]
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update portfolio item", error);
    res.status(500).json({ error: "Failed to update portfolio item" });
  }
});

// Reorder portfolio items
adminRouter.post("/portfolio/reorder", async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, sort_order }
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items array" });
    }
    for (const item of items) {
      await db.execute({
        sql: "UPDATE portfolio_items SET sort_order = ? WHERE id = ?",
        args: [item.sort_order, item.id]
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to reorder items" });
  }
});

// Bulk actions
adminRouter.post("/portfolio/bulk", async (req, res) => {
  try {
    const { ids, action, value } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid ids array" });
    }
    const placeholders = ids.map(() => "?").join(",");
    
    if (action === "delete") {
      await db.execute({
        sql: `DELETE FROM portfolio_items WHERE id IN (${placeholders})`,
        args: ids
      });
    } else if (action === "category") {
      await db.execute({
        sql: `UPDATE portfolio_items SET category_id = ? WHERE id IN (${placeholders})`,
        args: [value || null, ...ids]
      });
    } else if (action === "item_type") {
      const resolvedMediaType = (value === "drone_video" || value === "interior_video") ? "video" : "image";
      await db.execute({
        sql: `UPDATE portfolio_items SET item_type = ?, media_type = ? WHERE id IN (${placeholders})`,
        args: [value || "image", resolvedMediaType, ...ids]
      });
    } else if (action === "publish") {
      await db.execute({
        sql: `UPDATE portfolio_items SET is_published = ? WHERE id IN (${placeholders})`,
        args: [value ? 1 : 0, ...ids]
      });
    } else if (action === "feature") {
      await db.execute({
        sql: `UPDATE portfolio_items SET is_featured = ? WHERE id IN (${placeholders})`,
        args: [value ? 1 : 0, ...ids]
      });
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Bulk action failed" });
  }
});

// Delete portfolio item
adminRouter.delete("/portfolio/:id", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM portfolio_items WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete portfolio item" });
  }
});

// ==================== SERVICES CRUD ====================
// Get all services
adminRouter.get("/services", async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM services ORDER BY sort_order ASC, created_at ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch services", error);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

// Create new service
adminRouter.post("/services", async (req, res) => {
  try {
    const { title, description, icon, image_url, link_url, link_text, is_published, sort_order } = req.body;
    
    // Validate title (can be string or JSON string from TranslatableInput)
    if (!title || (typeof title === "string" && title.trim() === "")) {
      return res.status(400).json({ error: "Service title is required" });
    }

    let calculatedSortOrder = sort_order;
    if (calculatedSortOrder === undefined || calculatedSortOrder === null) {
      const maxOrderRes = await db.execute("SELECT MAX(sort_order) as max_order FROM services");
      const currentMax = Number(maxOrderRes.rows[0]?.max_order || 0);
      calculatedSortOrder = currentMax + 1;
    }

    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO services (id, title, description, icon, image_url, link_url, link_text, is_published, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        title,
        description || "",
        icon || "camera",
        image_url || null,
        link_url || null,
        link_text || null,
        is_published === undefined || is_published === null ? 1 : (is_published ? 1 : 0),
        calculatedSortOrder
      ]
    });

    res.json({ success: true, id });
  } catch (error: any) {
    console.error("Failed to create service", error);
    res.status(500).json({ error: error.message || "Failed to create service" });
  }
});

// Update existing service
adminRouter.put("/services/:id", async (req, res) => {
  try {
    const { title, description, icon, image_url, link_url, link_text, is_published, sort_order } = req.body;
    
    if (!title || (typeof title === "string" && title.trim() === "")) {
      return res.status(400).json({ error: "Service title is required" });
    }

    await db.execute({
      sql: `UPDATE services 
            SET title = ?, description = ?, icon = ?, image_url = ?, link_url = ?, link_text = ?, 
                is_published = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        title,
        description || "",
        icon || "camera",
        image_url || null,
        link_url || null,
        link_text || null,
        is_published ? 1 : 0,
        sort_order || 0,
        req.params.id
      ]
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update service", error);
    res.status(500).json({ error: error.message || "Failed to update service" });
  }
});

// Reorder services
adminRouter.post("/services/reorder", async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, sort_order }
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items array" });
    }
    for (const item of items) {
      if (item && item.id) {
        await db.execute({
          sql: "UPDATE services SET sort_order = ? WHERE id = ?",
          args: [item.sort_order, item.id]
        });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder services", error);
    res.status(500).json({ error: "Failed to reorder services" });
  }
});

// Toggle or update publish status
adminRouter.patch("/services/:id/publish", async (req, res) => {
  try {
    const { is_published } = req.body;
    await db.execute({
      sql: "UPDATE services SET is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [is_published ? 1 : 0, req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update service status" });
  }
});

// Delete service
adminRouter.delete("/services/:id", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM services WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete service", error);
    res.status(500).json({ error: "Failed to delete service" });
  }
});

// ==================== PRICING & BUNDLES CRUD ====================
// Get all pricing plans and bundles
adminRouter.get("/pricing", async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM pricing_plans ORDER BY sort_order ASC, created_at ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch pricing plans", error);
    res.status(500).json({ error: "Failed to fetch pricing plans" });
  }
});

// Create new pricing plan or bundle
adminRouter.post("/pricing", async (req, res) => {
  try {
    const {
      type,
      title,
      subtitle,
      description,
      price,
      original_price,
      currency,
      billing_type,
      billing_period,
      discount_label,
      features,
      included_items,
      bundle_services,
      cta_label,
      cta_url,
      message_template_en,
      message_template_hu,
      is_featured,
      featured_badge,
      is_enabled,
      sort_order
    } = req.body;

    if (!title || (typeof title === "string" && title.trim() === "")) {
      return res.status(400).json({ error: "Title is required for pricing plan" });
    }

    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: "Price must be a valid positive number" });
    }

    if (original_price !== undefined && original_price !== null && original_price !== "" && (isNaN(Number(original_price)) || Number(original_price) < 0)) {
      return res.status(400).json({ error: "Original price must be a valid positive number" });
    }

    // Default template fallbacks if not provided
    const cleanTemplateEn = message_template_en !== undefined ? String(message_template_en).trim() : "";
    const cleanTemplateHu = message_template_hu !== undefined ? String(message_template_hu).trim() : "";

    let calculatedSortOrder = sort_order;
    if (calculatedSortOrder === undefined || calculatedSortOrder === null) {
      const maxOrderRes = await db.execute("SELECT MAX(sort_order) as max_order FROM pricing_plans");
      const currentMax = Number(maxOrderRes.rows[0]?.max_order || 0);
      calculatedSortOrder = currentMax + 1;
    }

    const id = crypto.randomUUID();
    const parsedFeatures = typeof features === "string" ? features : JSON.stringify(features || []);
    const parsedIncluded = typeof included_items === "string" ? included_items : JSON.stringify(included_items || []);
    const parsedBundleServices = typeof bundle_services === "string" ? bundle_services : JSON.stringify(bundle_services || []);

    await db.execute({
      sql: `INSERT INTO pricing_plans (
              id, type, title, subtitle, description, price, original_price, currency,
              billing_type, billing_period, discount_label, features, included_items, bundle_services,
              cta_label, cta_url, message_template_en, message_template_hu,
              is_featured, featured_badge, is_enabled, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        type || "tier",
        title,
        subtitle || "",
        description || "",
        Number(price) || 0,
        original_price !== undefined && original_price !== null && original_price !== "" ? Number(original_price) : null,
        currency || "USD",
        billing_type || "one_time",
        billing_period || "project",
        discount_label || "",
        parsedFeatures,
        parsedIncluded,
        parsedBundleServices,
        cta_label || "Get Started",
        cta_url || "#contact",
        cleanTemplateEn || "I am interested in the {plan_name} package ({price}). Please contact me with more details.",
        cleanTemplateHu || "Érdeklődöm a(z) {plan_name} csomag ({price}) iránt. Kérem, vegyék fel velem a kapcsolatot a részletekkel kapcsolatban.",
        is_featured ? 1 : 0,
        featured_badge || "",
        is_enabled === undefined || is_enabled === null ? 1 : (is_enabled ? 1 : 0),
        calculatedSortOrder
      ]
    });

    res.json({ success: true, id });
  } catch (error: any) {
    console.error("Failed to create pricing plan", error);
    res.status(500).json({ error: error.message || "Failed to create pricing plan" });
  }
});

// Update pricing plan or bundle
adminRouter.put("/pricing/:id", async (req, res) => {
  try {
    const {
      type,
      title,
      subtitle,
      description,
      price,
      original_price,
      currency,
      billing_type,
      billing_period,
      discount_label,
      features,
      included_items,
      bundle_services,
      cta_label,
      cta_url,
      message_template_en,
      message_template_hu,
      is_featured,
      featured_badge,
      is_enabled,
      sort_order
    } = req.body;

    if (!title || (typeof title === "string" && title.trim() === "")) {
      return res.status(400).json({ error: "Title is required for pricing plan" });
    }

    if (price !== undefined && price !== null && (isNaN(Number(price)) || Number(price) < 0)) {
      return res.status(400).json({ error: "Price must be a valid positive number" });
    }

    if (original_price !== undefined && original_price !== null && original_price !== "" && (isNaN(Number(original_price)) || Number(original_price) < 0)) {
      return res.status(400).json({ error: "Original price must be a valid positive number" });
    }

    const cleanTemplateEn = message_template_en !== undefined ? String(message_template_en).trim() : "";
    const cleanTemplateHu = message_template_hu !== undefined ? String(message_template_hu).trim() : "";

    if (!cleanTemplateEn && !cleanTemplateHu) {
      return res.status(400).json({ error: "At least one message template (English or Hungarian) is required." });
    }

    const parsedFeatures = typeof features === "string" ? features : JSON.stringify(features || []);
    const parsedIncluded = typeof included_items === "string" ? included_items : JSON.stringify(included_items || []);
    const parsedBundleServices = typeof bundle_services === "string" ? bundle_services : JSON.stringify(bundle_services || []);

    await db.execute({
      sql: `UPDATE pricing_plans 
            SET type = ?, title = ?, subtitle = ?, description = ?, price = ?, original_price = ?,
                currency = ?, billing_type = ?, billing_period = ?, discount_label = ?,
                features = ?, included_items = ?, bundle_services = ?, cta_label = ?, cta_url = ?,
                message_template_en = ?, message_template_hu = ?,
                is_featured = ?, featured_badge = ?, is_enabled = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        type || "tier",
        title,
        subtitle || "",
        description || "",
        Number(price) || 0,
        original_price !== undefined && original_price !== null && original_price !== "" ? Number(original_price) : null,
        currency || "USD",
        billing_type || "one_time",
        billing_period || "project",
        discount_label || "",
        parsedFeatures,
        parsedIncluded,
        parsedBundleServices,
        cta_label || "Get Started",
        cta_url || "#contact",
        cleanTemplateEn,
        cleanTemplateHu,
        is_featured ? 1 : 0,
        featured_badge || "",
        is_enabled ? 1 : 0,
        sort_order || 0,
        req.params.id
      ]
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update pricing plan", error);
    res.status(500).json({ error: error.message || "Failed to update pricing plan" });
  }
});

// Reorder pricing plans
adminRouter.post("/pricing/reorder", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items array" });
    }
    for (const item of items) {
      if (item && item.id) {
        await db.execute({
          sql: "UPDATE pricing_plans SET sort_order = ? WHERE id = ?",
          args: [item.sort_order, item.id]
        });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder pricing plans", error);
    res.status(500).json({ error: "Failed to reorder pricing plans" });
  }
});

// Toggle enabled status
adminRouter.patch("/pricing/:id/publish", async (req, res) => {
  try {
    const { is_enabled } = req.body;
    await db.execute({
      sql: "UPDATE pricing_plans SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [is_enabled ? 1 : 0, req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update pricing status" });
  }
});

// Toggle featured status
adminRouter.patch("/pricing/:id/feature", async (req, res) => {
  try {
    const { is_featured } = req.body;
    await db.execute({
      sql: "UPDATE pricing_plans SET is_featured = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [is_featured ? 1 : 0, req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update featured status" });
  }
});

// Delete pricing plan
adminRouter.delete("/pricing/:id", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM pricing_plans WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete pricing plan", error);
    res.status(500).json({ error: "Failed to delete pricing plan" });
  }
});

// ==========================================
// EXTRA SERVICES (ADD-ONS) CRUD
// ==========================================

// Get all extra services for admin
adminRouter.get("/extra-services", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT * FROM pricing_extra_services 
      ORDER BY sort_order ASC, created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch extra services", error);
    res.status(500).json({ error: "Failed to fetch extra services" });
  }
});

// Create extra service
adminRouter.post("/extra-services", async (req, res) => {
  try {
    const {
      title,
      subtitle,
      description,
      category,
      icon,
      price,
      price_type,
      billing_type,
      original_price,
      currency,
      unit,
      allow_quantity,
      min_quantity,
      max_quantity,
      is_featured,
      is_enabled,
      show_on_pricing_page,
      restricted_plans,
      restricted_roles,
      sort_order
    } = req.body;

    if (!title || (typeof title === "string" && title.trim() === "")) {
      return res.status(400).json({ error: "Title is required for extra service" });
    }

    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: "Price must be a valid positive number" });
    }

    let calculatedSortOrder = sort_order;
    if (calculatedSortOrder === undefined || calculatedSortOrder === null) {
      const maxOrderRes = await db.execute("SELECT MAX(sort_order) as max_order FROM pricing_extra_services");
      calculatedSortOrder = Number(maxOrderRes.rows[0]?.max_order || 0) + 1;
    }

    const id = "extra-" + crypto.randomUUID().slice(0, 8);
    const parsedPlans = typeof restricted_plans === "string" ? restricted_plans : JSON.stringify(restricted_plans || []);
    const parsedRoles = typeof restricted_roles === "string" ? restricted_roles : JSON.stringify(restricted_roles || []);

    await db.execute({
      sql: `INSERT INTO pricing_extra_services (
              id, title, subtitle, description, category, icon, price, price_type, billing_type, original_price,
              currency, unit, allow_quantity, min_quantity, max_quantity, is_featured, is_enabled,
              show_on_pricing_page, restricted_plans, restricted_roles, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        typeof title === "string" ? title : JSON.stringify(title),
        subtitle ? (typeof subtitle === "string" ? subtitle : JSON.stringify(subtitle)) : "",
        description || "",
        category || "General",
        icon || "sparkles",
        Number(price) || 0,
        price_type || "fixed",
        billing_type || "one_time",
        original_price !== undefined && original_price !== null && original_price !== "" ? Number(original_price) : null,
        currency || "USD",
        unit || "item",
        allow_quantity ? 1 : 0,
        min_quantity ? Math.max(1, Number(min_quantity)) : 1,
        max_quantity ? Math.max(1, Number(max_quantity)) : 99,
        is_featured ? 1 : 0,
        is_enabled === undefined || is_enabled === null ? 1 : (is_enabled ? 1 : 0),
        show_on_pricing_page === undefined || show_on_pricing_page === null ? 1 : (show_on_pricing_page ? 1 : 0),
        parsedPlans,
        parsedRoles,
        calculatedSortOrder
      ]
    });

    res.json({ success: true, id });
  } catch (error: any) {
    console.error("Failed to create extra service", error);
    res.status(500).json({ error: error.message || "Failed to create extra service" });
  }
});

// Update extra service
adminRouter.put("/extra-services/:id", async (req, res) => {
  try {
    const {
      title,
      subtitle,
      description,
      category,
      icon,
      price,
      price_type,
      billing_type,
      original_price,
      currency,
      unit,
      allow_quantity,
      min_quantity,
      max_quantity,
      is_featured,
      is_enabled,
      show_on_pricing_page,
      restricted_plans,
      restricted_roles,
      sort_order
    } = req.body;

    if (!title || (typeof title === "string" && title.trim() === "")) {
      return res.status(400).json({ error: "Title is required for extra service" });
    }

    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: "Price must be a valid positive number" });
    }

    const parsedPlans = typeof restricted_plans === "string" ? restricted_plans : JSON.stringify(restricted_plans || []);
    const parsedRoles = typeof restricted_roles === "string" ? restricted_roles : JSON.stringify(restricted_roles || []);

    await db.execute({
      sql: `UPDATE pricing_extra_services
            SET title = ?, subtitle = ?, description = ?, category = ?, icon = ?,
                price = ?, price_type = ?, billing_type = ?, original_price = ?, currency = ?, unit = ?,
                allow_quantity = ?, min_quantity = ?, max_quantity = ?,
                is_featured = ?, is_enabled = ?, show_on_pricing_page = ?,
                restricted_plans = ?, restricted_roles = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        typeof title === "string" ? title : JSON.stringify(title),
        subtitle ? (typeof subtitle === "string" ? subtitle : JSON.stringify(subtitle)) : "",
        description || "",
        category || "General",
        icon || "sparkles",
        Number(price) || 0,
        price_type || "fixed",
        billing_type || "one_time",
        original_price !== undefined && original_price !== null && original_price !== "" ? Number(original_price) : null,
        currency || "USD",
        unit || "item",
        allow_quantity ? 1 : 0,
        min_quantity ? Math.max(1, Number(min_quantity)) : 1,
        max_quantity ? Math.max(1, Number(max_quantity)) : 99,
        is_featured ? 1 : 0,
        is_enabled ? 1 : 0,
        show_on_pricing_page === undefined || show_on_pricing_page === null ? 1 : (show_on_pricing_page ? 1 : 0),
        parsedPlans,
        parsedRoles,
        sort_order || 0,
        req.params.id
      ]
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update extra service", error);
    res.status(500).json({ error: error.message || "Failed to update extra service" });
  }
});

// Reorder extra services
adminRouter.post("/extra-services/reorder", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items array" });
    }
    for (const item of items) {
      if (item && item.id) {
        await db.execute({
          sql: "UPDATE pricing_extra_services SET sort_order = ? WHERE id = ?",
          args: [item.sort_order, item.id]
        });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder extra services", error);
    res.status(500).json({ error: "Failed to reorder extra services" });
  }
});

// Toggle extra service enabled status
adminRouter.patch("/extra-services/:id/toggle", async (req, res) => {
  try {
    const { is_enabled } = req.body;
    await db.execute({
      sql: "UPDATE pricing_extra_services SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [is_enabled ? 1 : 0, req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle extra service" });
  }
});

// Delete extra service
adminRouter.delete("/extra-services/:id", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM pricing_extra_services WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete extra service", error);
    res.status(500).json({ error: "Failed to delete extra service" });
  }
});

// ==========================================
// PRICING FEE RULES (FIXED, PERCENTAGE & DISTANCE) CRUD
// ==========================================

// Get all fee rules for admin
adminRouter.get("/fee-rules", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT * FROM pricing_fee_rules 
      ORDER BY sort_order ASC, created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch fee rules", error);
    res.status(500).json({ error: "Failed to fetch fee rules" });
  }
});

// Create fee rule
adminRouter.post("/fee-rules", async (req, res) => {
  try {
    const {
      name,
      description,
      fee_type,
      amount,
      currency,
      unit,
      min_distance,
      min_fee,
      max_distance,
      tiers,
      applicable_conditions,
      applicable_plans,
      applicable_regions,
      applicable_order_types,
      min_order_amount,
      max_order_amount,
      is_mandatory,
      is_default_active,
      is_enabled,
      show_on_pricing_page,
      sort_order
    } = req.body;

    if (!name || (typeof name === "string" && name.trim() === "")) {
      return res.status(400).json({ error: "Name is required for fee rule" });
    }

    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ error: "Amount must be a valid positive number" });
    }

    let calculatedSortOrder = sort_order;
    if (calculatedSortOrder === undefined || calculatedSortOrder === null) {
      const maxOrderRes = await db.execute("SELECT MAX(sort_order) as max_order FROM pricing_fee_rules");
      calculatedSortOrder = Number(maxOrderRes.rows[0]?.max_order || 0) + 1;
    }

    const id = "fee-" + crypto.randomUUID().slice(0, 8);
    const parsedTiers = typeof tiers === "string" ? tiers : JSON.stringify(tiers || []);
    const parsedPlans = typeof applicable_plans === "string" ? applicable_plans : JSON.stringify(applicable_plans || []);

    await db.execute({
      sql: `INSERT INTO pricing_fee_rules (
              id, name, description, fee_type, amount, currency, unit,
              min_distance, min_fee, max_distance, tiers, applicable_conditions,
              applicable_plans, applicable_regions, applicable_order_types,
              min_order_amount, max_order_amount, is_mandatory,
              is_default_active, is_enabled, show_on_pricing_page, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        typeof name === "string" ? name : JSON.stringify(name),
        description ? (typeof description === "string" ? description : JSON.stringify(description)) : "",
        fee_type || "distance_tiered",
        Number(amount) || 0,
        currency || "USD",
        unit || "km",
        min_distance !== undefined && min_distance !== null ? Number(min_distance) : 0,
        min_fee !== undefined && min_fee !== null ? Number(min_fee) : 0,
        max_distance !== undefined && max_distance !== null && max_distance !== "" ? Number(max_distance) : null,
        parsedTiers,
        applicable_conditions || "all",
        parsedPlans,
        applicable_regions || "",
        applicable_order_types || "all",
        min_order_amount !== undefined && min_order_amount !== null && min_order_amount !== "" ? Number(min_order_amount) : null,
        max_order_amount !== undefined && max_order_amount !== null && max_order_amount !== "" ? Number(max_order_amount) : null,
        is_mandatory === undefined || is_mandatory === null ? 1 : (is_mandatory ? 1 : 0),
        is_default_active === undefined || is_default_active === null ? 1 : (is_default_active ? 1 : 0),
        is_enabled === undefined || is_enabled === null ? 1 : (is_enabled ? 1 : 0),
        show_on_pricing_page === undefined || show_on_pricing_page === null ? 1 : (show_on_pricing_page ? 1 : 0),
        calculatedSortOrder
      ]
    });

    res.json({ success: true, id });
  } catch (error: any) {
    console.error("Failed to create fee rule", error);
    res.status(500).json({ error: error.message || "Failed to create fee rule" });
  }
});

// Update fee rule
adminRouter.put("/fee-rules/:id", async (req, res) => {
  try {
    const {
      name,
      description,
      fee_type,
      amount,
      currency,
      unit,
      min_distance,
      min_fee,
      max_distance,
      tiers,
      applicable_conditions,
      applicable_plans,
      applicable_regions,
      applicable_order_types,
      min_order_amount,
      max_order_amount,
      is_mandatory,
      is_default_active,
      is_enabled,
      show_on_pricing_page,
      sort_order
    } = req.body;

    if (!name || (typeof name === "string" && name.trim() === "")) {
      return res.status(400).json({ error: "Name is required for fee rule" });
    }

    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ error: "Amount must be a valid positive number" });
    }

    const parsedTiers = typeof tiers === "string" ? tiers : JSON.stringify(tiers || []);
    const parsedPlans = typeof applicable_plans === "string" ? applicable_plans : JSON.stringify(applicable_plans || []);

    await db.execute({
      sql: `UPDATE pricing_fee_rules
            SET name = ?, description = ?, fee_type = ?, amount = ?, currency = ?, unit = ?,
                min_distance = ?, min_fee = ?, max_distance = ?, tiers = ?,
                applicable_conditions = ?, applicable_plans = ?, applicable_regions = ?, applicable_order_types = ?,
                min_order_amount = ?, max_order_amount = ?, is_mandatory = ?,
                is_default_active = ?, is_enabled = ?, show_on_pricing_page = ?,
                sort_order = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        typeof name === "string" ? name : JSON.stringify(name),
        description ? (typeof description === "string" ? description : JSON.stringify(description)) : "",
        fee_type || "distance_tiered",
        Number(amount) || 0,
        currency || "USD",
        unit || "km",
        min_distance !== undefined && min_distance !== null ? Number(min_distance) : 0,
        min_fee !== undefined && min_fee !== null ? Number(min_fee) : 0,
        max_distance !== undefined && max_distance !== null && max_distance !== "" ? Number(max_distance) : null,
        parsedTiers,
        applicable_conditions || "all",
        parsedPlans,
        applicable_regions || "",
        applicable_order_types || "all",
        min_order_amount !== undefined && min_order_amount !== null && min_order_amount !== "" ? Number(min_order_amount) : null,
        max_order_amount !== undefined && max_order_amount !== null && max_order_amount !== "" ? Number(max_order_amount) : null,
        is_mandatory ? 1 : 0,
        is_default_active ? 1 : 0,
        is_enabled ? 1 : 0,
        show_on_pricing_page === undefined || show_on_pricing_page === null ? 1 : (show_on_pricing_page ? 1 : 0),
        sort_order || 0,
        req.params.id
      ]
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update fee rule", error);
    res.status(500).json({ error: error.message || "Failed to update fee rule" });
  }
});

// Reorder fee rules
adminRouter.post("/fee-rules/reorder", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items array" });
    }
    for (const item of items) {
      if (item && item.id) {
        await db.execute({
          sql: "UPDATE pricing_fee_rules SET sort_order = ? WHERE id = ?",
          args: [item.sort_order, item.id]
        });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder fee rules", error);
    res.status(500).json({ error: "Failed to reorder fee rules" });
  }
});

// Toggle fee rule enabled status
adminRouter.patch("/fee-rules/:id/toggle", async (req, res) => {
  try {
    const { is_enabled } = req.body;
    await db.execute({
      sql: "UPDATE pricing_fee_rules SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [is_enabled ? 1 : 0, req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle fee rule" });
  }
});

// Delete fee rule
adminRouter.delete("/fee-rules/:id", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM pricing_fee_rules WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete fee rule", error);
    res.status(500).json({ error: "Failed to delete fee rule" });
  }
});

// ==================== FAQ CATEGORIES CRUD ====================
// Helper to generate a clean URL-friendly slug
function generateSlug(text: string): string {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null) {
      text = parsed["en"] || Object.values(parsed)[0] || "";
    }
  } catch {}
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Get all FAQ Categories
adminRouter.get("/faq-categories", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        fc.*,
        (SELECT COUNT(*) FROM faqs f WHERE f.category_id = fc.id OR (f.category_id IS NULL AND f.category = fc.name)) as faq_count,
        (SELECT p.name FROM faq_categories p WHERE p.id = fc.parent_id) as parent_name
      FROM faq_categories fc
      ORDER BY fc.sort_order ASC, fc.created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch faq categories", error);
    res.status(500).json({ error: "Failed to fetch FAQ categories" });
  }
});

// Create new FAQ Category
adminRouter.post("/faq-categories", async (req, res) => {
  try {
    const { name, slug, description, parent_id, is_published, sort_order } = req.body;

    if (!name || (typeof name === "string" && name.trim() === "")) {
      return res.status(400).json({ error: "Category name is required" });
    }

    let finalSlug = slug && typeof slug === "string" && slug.trim() ? slug.trim() : generateSlug(name);
    if (!finalSlug) finalSlug = `category-${Date.now()}`;

    let calculatedSortOrder = sort_order;
    if (calculatedSortOrder === undefined || calculatedSortOrder === null || isNaN(Number(calculatedSortOrder))) {
      const maxOrderRes = await db.execute("SELECT MAX(sort_order) as max_order FROM faq_categories");
      const currentMax = Number(maxOrderRes.rows[0]?.max_order || 0);
      calculatedSortOrder = currentMax + 1;
    }

    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO faq_categories (id, name, slug, description, parent_id, is_published, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        name,
        finalSlug,
        description || null,
        parent_id || null,
        is_published === undefined || is_published === null ? 1 : (is_published ? 1 : 0),
        Number(calculatedSortOrder) || 0
      ]
    });

    res.json({ success: true, id });
  } catch (error: any) {
    console.error("Failed to create FAQ category", error);
    res.status(500).json({ error: error.message || "Failed to create FAQ category" });
  }
});

// Update existing FAQ Category
adminRouter.put("/faq-categories/:id", async (req, res) => {
  try {
    const { name, slug, description, parent_id, is_published, sort_order } = req.body;
    const { id } = req.params;

    if (!name || (typeof name === "string" && name.trim() === "")) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Disallow assigning category to itself as parent
    let safeParentId = parent_id || null;
    if (safeParentId === id) {
      safeParentId = null;
    }

    let finalSlug = slug && typeof slug === "string" && slug.trim() ? slug.trim() : generateSlug(name);
    if (!finalSlug) finalSlug = `category-${id.slice(0, 8)}`;

    await db.execute({
      sql: `UPDATE faq_categories 
            SET name = ?, slug = ?, description = ?, parent_id = ?, is_published = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        name,
        finalSlug,
        description || null,
        safeParentId,
        is_published ? 1 : 0,
        Number(sort_order) || 0,
        id
      ]
    });

    // Also update category string in faqs table for consistent labels
    try {
      await db.execute({
        sql: "UPDATE faqs SET category = ? WHERE category_id = ?",
        args: [name, id]
      });
    } catch {}

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update FAQ category", error);
    res.status(500).json({ error: error.message || "Failed to update FAQ category" });
  }
});

// Reorder FAQ Categories
adminRouter.post("/faq-categories/reorder", async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, sort_order }
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items array" });
    }
    for (const item of items) {
      if (item && item.id) {
        await db.execute({
          sql: "UPDATE faq_categories SET sort_order = ? WHERE id = ?",
          args: [Number(item.sort_order) || 0, item.id]
        });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder FAQ categories", error);
    res.status(500).json({ error: "Failed to reorder FAQ categories" });
  }
});

// Toggle or update category publish status
adminRouter.patch("/faq-categories/:id/publish", async (req, res) => {
  try {
    const { is_published } = req.body;
    await db.execute({
      sql: "UPDATE faq_categories SET is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [is_published ? 1 : 0, req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update category status" });
  }
});

// Delete FAQ Category with safe handling of existing FAQs
adminRouter.delete("/faq-categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const reassignTo = (req.query.reassign_to || req.body.reassign_to) as string | undefined;

    // Reset parent_id for any subcategories
    await db.execute({
      sql: "UPDATE faq_categories SET parent_id = NULL WHERE parent_id = ?",
      args: [id]
    });

    if (reassignTo && reassignTo !== "none" && reassignTo !== id) {
      // Find destination category name
      const targetCatRes = await db.execute({
        sql: "SELECT id, name FROM faq_categories WHERE id = ?",
        args: [reassignTo]
      });

      if (targetCatRes.rows.length > 0) {
        const targetName = targetCatRes.rows[0].name as string;
        await db.execute({
          sql: "UPDATE faqs SET category_id = ?, category = ? WHERE category_id = ? OR category = (SELECT name FROM faq_categories WHERE id = ?)",
          args: [reassignTo, targetName, id, id]
        });
      } else {
        // Fallback to General
        await db.execute({
          sql: "UPDATE faqs SET category_id = NULL, category = 'General' WHERE category_id = ?",
          args: [id]
        });
      }
    } else {
      // Default safe handling: Move remaining FAQs in this category to 'General' (so content is never lost!)
      await db.execute({
        sql: "UPDATE faqs SET category_id = NULL, category = 'General' WHERE category_id = ?",
        args: [id]
      });
    }

    // Delete the category
    await db.execute({
      sql: "DELETE FROM faq_categories WHERE id = ?",
      args: [id]
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete FAQ category", error);
    res.status(500).json({ error: "Failed to delete FAQ category" });
  }
});

// ==================== FAQS CRUD ====================
// Get all FAQs (with category joined info)
adminRouter.get("/faqs", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        f.*,
        fc.name as category_name,
        fc.slug as category_slug
      FROM faqs f
      LEFT JOIN faq_categories fc ON f.category_id = fc.id
      ORDER BY f.sort_order ASC, f.created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch faqs", error);
    res.status(500).json({ error: "Failed to fetch faqs" });
  }
});

// Create new FAQ
adminRouter.post("/faqs", async (req, res) => {
  try {
    const { question, answer, category, category_id, is_published, sort_order } = req.body;

    if (!question || (typeof question === "string" && question.trim() === "")) {
      return res.status(400).json({ error: "Question is required" });
    }
    if (!answer || (typeof answer === "string" && answer.trim() === "")) {
      return res.status(400).json({ error: "Answer is required" });
    }

    let calculatedSortOrder = sort_order;
    if (calculatedSortOrder === undefined || calculatedSortOrder === null || isNaN(Number(calculatedSortOrder))) {
      const maxOrderRes = await db.execute("SELECT MAX(sort_order) as max_order FROM faqs");
      const currentMax = Number(maxOrderRes.rows[0]?.max_order || 0);
      calculatedSortOrder = currentMax + 1;
    }

    let resolvedCategory = category ? (typeof category === "string" ? category.trim() : category) : "General";
    let resolvedCategoryId = category_id || null;

    if (resolvedCategoryId && !category) {
      const catRes = await db.execute({
        sql: "SELECT name FROM faq_categories WHERE id = ?",
        args: [resolvedCategoryId]
      });
      if (catRes.rows.length > 0) {
        resolvedCategory = catRes.rows[0].name as string;
      }
    }

    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO faqs (id, question, answer, category, category_id, is_published, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        question,
        answer,
        resolvedCategory,
        resolvedCategoryId,
        is_published === undefined || is_published === null ? 1 : (is_published ? 1 : 0),
        Number(calculatedSortOrder) || 0
      ]
    });

    res.json({ success: true, id });
  } catch (error: any) {
    console.error("Failed to create FAQ", error);
    res.status(500).json({ error: error.message || "Failed to create FAQ" });
  }
});

// Update existing FAQ
adminRouter.put("/faqs/:id", async (req, res) => {
  try {
    const { question, answer, category, category_id, is_published, sort_order } = req.body;

    if (!question || (typeof question === "string" && question.trim() === "")) {
      return res.status(400).json({ error: "Question is required" });
    }
    if (!answer || (typeof answer === "string" && answer.trim() === "")) {
      return res.status(400).json({ error: "Answer is required" });
    }

    let resolvedCategory = category ? (typeof category === "string" ? category.trim() : category) : "General";
    let resolvedCategoryId = category_id || null;

    if (resolvedCategoryId && (!category || category === "General")) {
      const catRes = await db.execute({
        sql: "SELECT name FROM faq_categories WHERE id = ?",
        args: [resolvedCategoryId]
      });
      if (catRes.rows.length > 0) {
        resolvedCategory = catRes.rows[0].name as string;
      }
    }

    await db.execute({
      sql: `UPDATE faqs 
            SET question = ?, answer = ?, category = ?, category_id = ?, is_published = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        question,
        answer,
        resolvedCategory,
        resolvedCategoryId,
        is_published ? 1 : 0,
        Number(sort_order) || 0,
        req.params.id
      ]
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update FAQ", error);
    res.status(500).json({ error: error.message || "Failed to update FAQ" });
  }
});

// Reorder FAQs
adminRouter.post("/faqs/reorder", async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, sort_order }
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items array" });
    }
    for (const item of items) {
      if (item && item.id) {
        await db.execute({
          sql: "UPDATE faqs SET sort_order = ? WHERE id = ?",
          args: [item.sort_order, item.id]
        });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder FAQs", error);
    res.status(500).json({ error: "Failed to reorder FAQs" });
  }
});

// Toggle or update FAQ publish status
adminRouter.patch("/faqs/:id/publish", async (req, res) => {
  try {
    const { is_published } = req.body;
    await db.execute({
      sql: "UPDATE faqs SET is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [is_published ? 1 : 0, req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update FAQ status" });
  }
});

// Delete FAQ
adminRouter.delete("/faqs/:id", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM faqs WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete FAQ", error);
    res.status(500).json({ error: "Failed to delete FAQ" });
  }
});

// Contact submissions
adminRouter.get("/contacts", async (req, res: any) => {
  try {
    const { archived } = req.query;
    let sql = "SELECT * FROM contact_submissions";
    let args: any[] = [];

    if (archived === "true" || archived === "1") {
      sql += " WHERE is_archived = 1";
    } else if (archived === "false" || archived === "0") {
      sql += " WHERE (is_archived = 0 OR is_archived IS NULL)";
    }
    sql += " ORDER BY created_at DESC";

    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch contacts", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// Mark contact as read
adminRouter.put("/contacts/:id/read", async (req: any, res: any) => {
  try {
    const check = await db.execute({
      sql: "SELECT is_archived FROM contact_submissions WHERE id = ?",
      args: [req.params.id]
    });
    if (check.rows.length > 0 && check.rows[0].is_archived === 1) {
      return res.status(403).json({ error: "Archived messages are read-only. Unarchive first to change read status." });
    }

    await db.execute({
      sql: "UPDATE contact_submissions SET is_read = 1 WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

// Archive individual contact
adminRouter.put("/contacts/:id/archive", async (req: any, res: any) => {
  try {
    const actor = req.user?.email || "Admin";
    const now = new Date().toISOString();
    await db.execute({
      sql: "UPDATE contact_submissions SET is_archived = 1, archived_at = ?, archived_by = ? WHERE id = ?",
      args: [now, actor, req.params.id]
    });
    res.json({ success: true, is_archived: 1, archived_at: now, archived_by: actor });
  } catch (error) {
    console.error("Failed to archive contact", error);
    res.status(500).json({ error: "Failed to archive contact" });
  }
});

// Unarchive individual contact
adminRouter.put("/contacts/:id/unarchive", async (req: any, res: any) => {
  try {
    const actor = req.user?.email || "Admin";
    const now = new Date().toISOString();
    await db.execute({
      sql: "UPDATE contact_submissions SET is_archived = 0, unarchived_at = ?, unarchived_by = ? WHERE id = ?",
      args: [now, actor, req.params.id]
    });
    res.json({ success: true, is_archived: 0, unarchived_at: now, unarchived_by: actor });
  } catch (error) {
    console.error("Failed to unarchive contact", error);
    res.status(500).json({ error: "Failed to unarchive contact" });
  }
});

// Bulk Archive contacts
adminRouter.post("/contacts/bulk-archive", async (req: any, res: any) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No ids provided" });
    }
    const actor = req.user?.email || "Admin";
    const now = new Date().toISOString();
    const placeholders = ids.map(() => "?").join(",");
    await db.execute({
      sql: `UPDATE contact_submissions SET is_archived = 1, archived_at = ?, archived_by = ? WHERE id IN (${placeholders})`,
      args: [now, actor, ...ids]
    });
    res.json({ success: true, count: ids.length, archived_at: now, archived_by: actor });
  } catch (error) {
    console.error("Failed to bulk archive contacts", error);
    res.status(500).json({ error: "Failed to bulk archive contacts" });
  }
});

// Bulk Unarchive contacts
adminRouter.post("/contacts/bulk-unarchive", async (req: any, res: any) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No ids provided" });
    }
    const actor = req.user?.email || "Admin";
    const now = new Date().toISOString();
    const placeholders = ids.map(() => "?").join(",");
    await db.execute({
      sql: `UPDATE contact_submissions SET is_archived = 0, unarchived_at = ?, unarchived_by = ? WHERE id IN (${placeholders})`,
      args: [now, actor, ...ids]
    });
    res.json({ success: true, count: ids.length, unarchived_at: now, unarchived_by: actor });
  } catch (error) {
    console.error("Failed to bulk unarchive contacts", error);
    res.status(500).json({ error: "Failed to bulk unarchive contacts" });
  }
});

// Bulk Delete contacts
adminRouter.post("/contacts/bulk-delete", async (req: any, res: any) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No ids provided" });
    }
    const placeholders = ids.map(() => "?").join(",");
    await db.execute({
      sql: `DELETE FROM contact_submissions WHERE id IN (${placeholders})`,
      args: ids
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete contacts" });
  }
});

// Bulk Update contacts (disallows archived messages)
adminRouter.post("/contacts/bulk-update", async (req: any, res: any) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0 || !updates) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    
    // Check if any of the target IDs are archived
    const placeholders = ids.map(() => "?").join(",");
    const checkArchived = await db.execute({
      sql: `SELECT id FROM contact_submissions WHERE id IN (${placeholders}) AND is_archived = 1`,
      args: ids
    });

    if (checkArchived.rows.length > 0) {
      return res.status(403).json({ 
        error: `Cannot update ${checkArchived.rows.length} archived message(s). Unarchive them first to make modifications.` 
      });
    }

    let updateSql = [];
    let args = [];
    
    if (updates.status !== undefined) {
      updateSql.push("status = ?");
      args.push(updates.status);
    }
    if (updates.is_read !== undefined) {
      updateSql.push("is_read = ?");
      args.push(updates.is_read ? 1 : 0);
    }
    
    if (updateSql.length > 0) {
      await db.execute({
        sql: `UPDATE contact_submissions SET ${updateSql.join(", ")} WHERE id IN (${placeholders})`,
        args: [...args, ...ids]
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update contacts" });
  }
});

// Update contact (restricted on archived)
adminRouter.put("/contacts/:id", async (req: any, res: any) => {
  try {
    const { status, notes, is_read, customer_id } = req.body;

    // Check if message is currently archived
    const check = await db.execute({
      sql: "SELECT is_archived FROM contact_submissions WHERE id = ?",
      args: [req.params.id]
    });

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Contact submission not found" });
    }

    if (check.rows[0].is_archived === 1 && (status !== undefined || notes !== undefined || is_read !== undefined)) {
      return res.status(403).json({ 
        error: "This message is archived and read-only. Unarchive it first to edit notes, change status, or mark read." 
      });
    }

    let updates = [];
    let args = [];
    
    if (status !== undefined) {
      updates.push("status = ?");
      args.push(status);
    }
    if (notes !== undefined) {
      updates.push("notes = ?");
      args.push(notes);
    }
    if (is_read !== undefined) {
      updates.push("is_read = ?");
      args.push(is_read ? 1 : 0);
    }
    if (customer_id !== undefined) {
      updates.push("customer_id = ?");
      args.push(customer_id);
    }
    
    if (updates.length > 0) {
      args.push(req.params.id);
      await db.execute({
        sql: `UPDATE contact_submissions SET ${updates.join(", ")} WHERE id = ?`,
        args
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update contact" });
  }
});

// Delete contact
adminRouter.delete("/contacts/:id", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM contact_submissions WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete contact" });
  }
});


// Client Management
adminRouter.get("/clients", async (req, res) => {
  try {
    const search = (req.query.search as string) || '';
    let sql = `
      SELECT u.id, u.email, u.role, u.is_active, u.property_address, u.advertisement_link, u.created_at,
             u.portal_access_disabled_at, u.portal_access_disabled_reason, u.portal_access_disabled_by,
             c.id AS customer_id,
             c.name AS customer_name,
             c.status AS customer_status,
             (SELECT COUNT(*) FROM projects p WHERE p.client_id = u.id) as project_count,
             (SELECT json_group_array(json_object('id', p.id, 'name', p.name)) FROM projects p WHERE p.client_id = u.id) as projects_json,
             (SELECT COUNT(*) FROM client_properties cp WHERE cp.client_id = u.id OR (c.id IS NOT NULL AND cp.client_id = c.id)) as properties_count,
             (SELECT COUNT(*) FROM client_links cl WHERE cl.client_id = u.id OR (c.id IS NOT NULL AND cl.client_id = c.id)) as links_count
      FROM users u 
      LEFT JOIN crm_records c 
        ON LOWER(TRIM(u.email)) = LOWER(TRIM(c.email)) 
       AND c.type = 'customer'
      WHERE u.role = 'client'
    `;
    let args: any[] = [];
    if (search) {
      sql += " AND (u.email LIKE ? OR u.property_address LIKE ? OR c.name LIKE ?)";
      args.push('%' + search + '%', '%' + search + '%', '%' + search + '%');
    }
    sql += " ORDER BY u.created_at DESC";
    
    try {
      const result = await db.execute({ sql, args });
      
      // Parse the JSON array
      const clients = result.rows.map(row => ({
        ...row,
        projects: row.projects_json ? JSON.parse(row.projects_json as string) : []
      }));
      
      res.json(clients);
    } catch (queryErr) {
      console.warn("Retrying fetch clients with fallback query:", queryErr);
      let fallbackSql = `
        SELECT u.id, u.email, u.role, u.is_active, u.property_address, u.advertisement_link, u.created_at,
               u.portal_access_disabled_at, u.portal_access_disabled_reason, u.portal_access_disabled_by,
               c.id AS customer_id,
               c.name AS customer_name,
               c.status AS customer_status,
               (SELECT COUNT(*) FROM projects p WHERE p.client_id = u.id) as project_count,
               (SELECT json_group_array(json_object('id', p.id, 'name', p.name)) FROM projects p WHERE p.client_id = u.id) as projects_json,
               CASE WHEN u.property_address IS NOT NULL AND TRIM(u.property_address) != '' THEN 1 ELSE 0 END as properties_count,
               CASE WHEN u.advertisement_link IS NOT NULL AND TRIM(u.advertisement_link) != '' THEN 1 ELSE 0 END as links_count
        FROM users u 
        LEFT JOIN crm_records c 
          ON LOWER(TRIM(u.email)) = LOWER(TRIM(c.email)) 
         AND c.type = 'customer'
        WHERE u.role = 'client'
      `;
      let fallbackArgs: any[] = [];
      if (search) {
        fallbackSql += " AND (u.email LIKE ? OR u.property_address LIKE ? OR c.name LIKE ?)";
        fallbackArgs.push('%' + search + '%', '%' + search + '%', '%' + search + '%');
      }
      fallbackSql += " ORDER BY u.created_at DESC";
      const fallbackResult = await db.execute({ sql: fallbackSql, args: fallbackArgs });
      const clients = fallbackResult.rows.map(row => ({
        ...row,
        projects: row.projects_json ? JSON.parse(row.projects_json as string) : []
      }));
      res.json(clients);
    }
  } catch (error) {
    console.error("Failed to fetch clients", error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

adminRouter.get("/clients/:id", async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT u.id, u.email, u.role, u.is_active, u.property_address, u.advertisement_link, u.created_at,
                   u.portal_access_disabled_at, u.portal_access_disabled_reason, u.portal_access_disabled_by,
                   c.id AS customer_id,
                   c.name AS customer_name,
                   c.status AS customer_status
            FROM users u
            LEFT JOIN crm_records c 
              ON LOWER(TRIM(u.email)) = LOWER(TRIM(c.email)) 
             AND c.type = 'customer'
            WHERE u.id = ?`,
      args: [req.params.id]
    });
    if (result.rows.length === 0) return res.status(404).json({ error: "Client not found" });
    
    const clientData: any = { ...result.rows[0] };
    const customerId = clientData.customer_id;
    
    // Fetch associated projects
    const projectsResult = await db.execute({
      sql: "SELECT id, name, status, created_at FROM projects WHERE client_id = ? ORDER BY created_at DESC",
      args: [req.params.id]
    });
    clientData.projects = projectsResult.rows;

    // Fetch client properties (from users or linked customer CRM)
    const propsResult = await db.execute({
      sql: `SELECT * FROM client_properties 
            WHERE client_id = ? ${customerId ? "OR client_id = ?" : ""} 
            ORDER BY sort_order ASC, created_at ASC`,
      args: customerId ? [req.params.id, customerId] : [req.params.id]
    });
    clientData.properties = propsResult.rows;

    // Fetch client links
    const linksResult = await db.execute({
      sql: `SELECT * FROM client_links 
            WHERE client_id = ? ${customerId ? "OR client_id = ?" : ""} 
            ORDER BY sort_order ASC, created_at ASC`,
      args: customerId ? [req.params.id, customerId] : [req.params.id]
    });
    clientData.links = linksResult.rows;
    
    res.json(clientData);
  } catch (error) {
    console.error("Failed to fetch client", error);
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

adminRouter.post("/clients", async (req, res) => {
  let createdClientId: string | null = null;
  try {
    const { email, password, is_active, property_address, advertisement_link, properties, links } = req.body;
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ error: "Email is required" });
    }
    if (advertisement_link && !isValidUrl(advertisement_link)) {
      return res.status(400).json({ error: "Advertisement link must be a valid URL starting with http:// or https://" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanLinks = Array.isArray(links) ? links : [];
    for (const link of cleanLinks) {
      const candidateUrl = typeof link === "string" ? link.trim() : String(link?.url || "").trim();
      if (candidateUrl && !isValidUrl(candidateUrl)) {
        return res.status(400).json({ error: "Every listing link must start with http:// or https://" });
      }
    }

    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE LOWER(TRIM(email)) = ?",
      args: [normalizedEmail]
    });
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "A client with this email already exists" });
    }

    const clientPassword = password || "ClientPass123!";
    const hash = await bcrypt.hash(clientPassword, 10);
    const id = crypto.randomUUID();

    const primaryAddr = (Array.isArray(properties) && properties.length > 0)
      ? (typeof properties[0] === 'string' ? properties[0] : (properties[0].address || ''))
      : (property_address ? property_address.trim() : "");

    const primaryLink = (Array.isArray(links) && links.length > 0)
      ? (typeof links[0] === 'string' ? links[0] : (links[0].url || ''))
      : (advertisement_link ? advertisement_link.trim() : "");

    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, role, is_active, property_address, advertisement_link, created_at)
            VALUES (?, ?, ?, 'client', ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        id,
        normalizedEmail,
        hash,
        is_active === undefined || is_active === null ? 1 : (is_active ? 1 : 0),
        primaryAddr,
        primaryLink
      ]
    });
    createdClientId = id;

    // Save properties if provided (unlimited for admin)
    if (Array.isArray(properties)) {
      for (let i = 0; i < properties.length; i++) {
        const p = properties[i];
        const addr = typeof p === 'string' ? p.trim() : (p.address ? p.address.trim() : '');
        const pName = typeof p === 'string' ? `Property ${i + 1}` : (p.property_name?.trim() || `Property ${i + 1}`);
        if (addr) {
          await db.execute({
            sql: `INSERT INTO client_properties (id, client_id, property_name, address, metadata, sort_order, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            args: [
              crypto.randomUUID(),
              id,
              pName,
              addr,
              typeof p === 'object' && p.metadata ? JSON.stringify(p.metadata) : "{}",
              i
            ]
          });
        }
      }
    } else if (primaryAddr) {
      await db.execute({
        sql: `INSERT INTO client_properties (id, client_id, property_name, address, sort_order, created_at, updated_at)
              VALUES (?, ?, 'Primary Property', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [crypto.randomUUID(), id, primaryAddr]
      });
    }

    // Save links if provided (unlimited for admin)
    if (Array.isArray(links)) {
      for (let i = 0; i < links.length; i++) {
        const l = links[i];
        const u = typeof l === 'string' ? l.trim() : (l.url ? l.url.trim() : '');
        const lbl = typeof l === 'string' ? `Link ${i + 1}` : (l.label?.trim() || `Link ${i + 1}`);
        if (u) {
          await db.execute({
            sql: `INSERT INTO client_links (id, client_id, label, url, metadata, sort_order, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            args: [
              crypto.randomUUID(),
              id,
              lbl,
              u,
              typeof l === 'object' && l.metadata ? JSON.stringify(l.metadata) : "{}",
              i
            ]
          });
        }
      }
    } else if (primaryLink) {
      await db.execute({
        sql: `INSERT INTO client_links (id, client_id, label, url, sort_order, created_at, updated_at)
              VALUES (?, ?, 'Main Listing / Ad Link', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [crypto.randomUUID(), id, primaryLink]
      });
    }

    res.status(201).json({ success: true, id });
  } catch (error: any) {
    console.error("Failed to create client", error);
    if (createdClientId) {
      try {
        await db.execute({ sql: "DELETE FROM client_links WHERE client_id = ?", args: [createdClientId] });
        await db.execute({ sql: "DELETE FROM client_properties WHERE client_id = ?", args: [createdClientId] });
        await db.execute({ sql: "DELETE FROM users WHERE id = ? AND role = 'client'", args: [createdClientId] });
      } catch (rollbackError) {
        console.error("Failed to roll back partial client creation", rollbackError);
      }
    }
    res.status(500).json({ error: error.message || "Failed to create client" });
  }
});

adminRouter.put("/clients/:id", async (req, res) => {
  try {
    const { email, is_active, property_address, advertisement_link, reason } = req.body;
    if (advertisement_link && !isValidUrl(advertisement_link)) {
      return res.status(400).json({ error: "Advertisement link must be a valid URL starting with http:// or https://" });
    }

    const existingUser = await db.execute({
      sql: "SELECT * FROM users WHERE id = ? AND role = 'client'",
      args: [req.params.id]
    });
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const prevActive = existingUser.rows[0].is_active;
    const newActive = is_active !== undefined ? (is_active ? 1 : 0) : prevActive;
    const actorUser = (req as any).user || {};
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";

    await db.execute({
      sql: `UPDATE users 
            SET email = COALESCE(?, email), 
                is_active = ?, 
                property_address = ?, 
                advertisement_link = ?,
                portal_access_disabled_at = CASE WHEN ? = 0 THEN CURRENT_TIMESTAMP ELSE NULL END,
                portal_access_disabled_reason = CASE WHEN ? = 0 THEN ? ELSE '' END,
                portal_access_disabled_by = CASE WHEN ? = 0 THEN ? ELSE '' END
            WHERE id = ? AND role = 'client'`,
      args: [
        email !== undefined ? email.trim() : null,
        newActive,
        property_address !== undefined && property_address !== null ? property_address.trim() : '',
        advertisement_link !== undefined && advertisement_link !== null ? advertisement_link.trim() : '',
        newActive,
        newActive,
        reason || 'Updated by admin',
        newActive,
        actorUser.email || 'admin',
        req.params.id
      ]
    });

    if (prevActive !== newActive) {
      const auditId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO audit_logs (id, entity_type, entity_id, action, actor_id, actor_email, actor_role, details, ip_address, created_at)
              VALUES (?, 'portal_access', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [
          auditId,
          req.params.id,
          newActive === 0 ? 'PORTAL_ACCESS_DISABLED_MANUAL' : 'PORTAL_ACCESS_ENABLED_MANUAL',
          actorUser.id || null,
          actorUser.email || null,
          actorUser.role || 'admin',
          JSON.stringify({
            client_id: req.params.id,
            client_email: existingUser.rows[0].email,
            previous_active: prevActive,
            new_active: newActive,
            reason: reason || (newActive === 0 ? 'Manually disabled by admin' : 'Manually enabled by admin')
          }),
          clientIp
        ]
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update client", error);
    res.status(500).json({ error: error.message || "Failed to update client" });
  }
});

adminRouter.delete("/clients/:id", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM client_properties WHERE client_id = ?",
      args: [req.params.id]
    });
    await db.execute({
      sql: "DELETE FROM client_links WHERE client_id = ?",
      args: [req.params.id]
    });
    await db.execute({
      sql: "DELETE FROM users WHERE id = ? AND role = 'client'",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete client" });
  }
});

// ==================== CLIENT PROPERTIES (UNLIMITED FOR ADMIN) ====================
adminRouter.get("/clients/:id/properties", async (req, res) => {
  try {
    const clientId = req.params.id;
    // Check if there's also a customer with the same email or id
    const userRes = await db.execute({
      sql: "SELECT email FROM users WHERE id = ?",
      args: [clientId]
    });
    const userEmail = userRes.rows[0]?.email as string;

    const result = await db.execute({
      sql: `SELECT * FROM client_properties 
            WHERE client_id = ? 
               OR (SELECT id FROM crm_records WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND type = 'customer' LIMIT 1) = client_id
            ORDER BY sort_order ASC, created_at ASC`,
      args: [clientId, userEmail || ""]
    });
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch client properties", error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

adminRouter.post("/clients/:id/properties", async (req, res) => {
  try {
    const clientId = req.params.id;
    const { property_name, address, metadata } = req.body;
    if (!address || typeof address !== "string" || !address.trim()) {
      return res.status(400).json({ error: "Property address is required" });
    }

    const countRes = await db.execute({
      sql: "SELECT COUNT(*) as count FROM client_properties WHERE client_id = ?",
      args: [clientId]
    });
    const nextOrder = Number(countRes.rows[0]?.count || 0);
    const id = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO client_properties (id, client_id, property_name, address, metadata, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        id,
        clientId,
        property_name ? property_name.trim() : "Property",
        address.trim(),
        typeof metadata === "object" ? JSON.stringify(metadata) : (metadata || "{}"),
        nextOrder
      ]
    });

    const item = await db.execute({
      sql: "SELECT * FROM client_properties WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, property: item.rows[0] });
  } catch (error) {
    console.error("Failed to add property", error);
    res.status(500).json({ error: "Failed to add property" });
  }
});

adminRouter.put("/clients/:id/properties/:propertyId", async (req, res) => {
  try {
    const { property_name, address, metadata } = req.body;
    if (!address || typeof address !== "string" || !address.trim()) {
      return res.status(400).json({ error: "Property address is required" });
    }

    await db.execute({
      sql: `UPDATE client_properties 
            SET property_name = ?, address = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        property_name ? property_name.trim() : "Property",
        address.trim(),
        typeof metadata === "object" ? JSON.stringify(metadata) : (metadata || "{}"),
        req.params.propertyId
      ]
    });

    const item = await db.execute({
      sql: "SELECT * FROM client_properties WHERE id = ?",
      args: [req.params.propertyId]
    });

    res.json({ success: true, property: item.rows[0] });
  } catch (error) {
    console.error("Failed to update property", error);
    res.status(500).json({ error: "Failed to update property" });
  }
});

adminRouter.delete("/clients/:id/properties/:propertyId", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM client_properties WHERE id = ?",
      args: [req.params.propertyId]
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete property", error);
    res.status(500).json({ error: "Failed to delete property" });
  }
});

adminRouter.post("/clients/:id/properties/reorder", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items array is required" });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const targetId = typeof item === 'string' ? item : item.id;
      const order = typeof item === 'object' && item.sort_order !== undefined ? item.sort_order : i;
      await db.execute({
        sql: "UPDATE client_properties SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [order, targetId]
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder properties", error);
    res.status(500).json({ error: "Failed to reorder properties" });
  }
});

// ==================== CLIENT LINKS (UNLIMITED FOR ADMIN) ====================
adminRouter.get("/clients/:id/links", async (req, res) => {
  try {
    const clientId = req.params.id;
    const userRes = await db.execute({
      sql: "SELECT email FROM users WHERE id = ?",
      args: [clientId]
    });
    const userEmail = userRes.rows[0]?.email as string;

    const result = await db.execute({
      sql: `SELECT * FROM client_links 
            WHERE client_id = ? 
               OR (SELECT id FROM crm_records WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND type = 'customer' LIMIT 1) = client_id
            ORDER BY sort_order ASC, created_at ASC`,
      args: [clientId, userEmail || ""]
    });
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch client links", error);
    res.status(500).json({ error: "Failed to fetch links" });
  }
});

adminRouter.post("/clients/:id/links", async (req, res) => {
  try {
    const clientId = req.params.id;
    const { label, url, metadata } = req.body;
    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ error: "URL is required" });
    }
    if (!isValidUrl(url.trim())) {
      return res.status(400).json({ error: "Link must be a valid URL starting with http:// or https://" });
    }

    const countRes = await db.execute({
      sql: "SELECT COUNT(*) as count FROM client_links WHERE client_id = ?",
      args: [clientId]
    });
    const nextOrder = Number(countRes.rows[0]?.count || 0);
    const id = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO client_links (id, client_id, label, url, metadata, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        id,
        clientId,
        label ? label.trim() : "Listing Link",
        url.trim(),
        typeof metadata === "object" ? JSON.stringify(metadata) : (metadata || "{}"),
        nextOrder
      ]
    });

    const item = await db.execute({
      sql: "SELECT * FROM client_links WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, link: item.rows[0] });
  } catch (error) {
    console.error("Failed to add link", error);
    res.status(500).json({ error: "Failed to add link" });
  }
});

adminRouter.put("/clients/:id/links/:linkId", async (req, res) => {
  try {
    const { label, url, metadata } = req.body;
    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ error: "URL is required" });
    }
    if (!isValidUrl(url.trim())) {
      return res.status(400).json({ error: "Link must be a valid URL starting with http:// or https://" });
    }

    await db.execute({
      sql: `UPDATE client_links 
            SET label = ?, url = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        label ? label.trim() : "Listing Link",
        url.trim(),
        typeof metadata === "object" ? JSON.stringify(metadata) : (metadata || "{}"),
        req.params.linkId
      ]
    });

    const item = await db.execute({
      sql: "SELECT * FROM client_links WHERE id = ?",
      args: [req.params.linkId]
    });

    res.json({ success: true, link: item.rows[0] });
  } catch (error) {
    console.error("Failed to update link", error);
    res.status(500).json({ error: "Failed to update link" });
  }
});

adminRouter.delete("/clients/:id/links/:linkId", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM client_links WHERE id = ?",
      args: [req.params.linkId]
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete link", error);
    res.status(500).json({ error: "Failed to delete link" });
  }
});

adminRouter.post("/clients/:id/links/reorder", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items array is required" });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const targetId = typeof item === 'string' ? item : item.id;
      const order = typeof item === 'object' && item.sort_order !== undefined ? item.sort_order : i;
      await db.execute({
        sql: "UPDATE client_links SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [order, targetId]
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder links", error);
    res.status(500).json({ error: "Failed to reorder links" });
  }
});

// Project Management CRUD
async function sendProjectTimelineEmail(projectId: string, input: { title: string; message: string; statusLabel?: string }, appOrigin: string) {
  const result = await db.execute({
    sql: `SELECT p.name, p.status, u.email AS client_email, u.name AS client_name
          FROM projects p LEFT JOIN users u ON u.id = p.client_id WHERE p.id = ? LIMIT 1`,
    args: [projectId],
  });
  if (!result.rows.length) throw new Error("Project not found");
  const project = result.rows[0];
  if (!project.client_email) throw new Error("No client email associated with this project");
  const recipientName = String(project.client_name || project.client_email).split("@")[0];
  return sendTransactionalEmail({
    to: String(project.client_email),
    templateId: "project_update",
    templateData: {
      recipient_name: recipientName,
      "user.name": recipientName,
      project_name: project.name,
      project_status: input.statusLabel || input.title,
      additional_notes: input.message,
      action_url: `${appOrigin.replace(/\/$/, "")}/client`,
      action_text: "View project timeline",
    },
  });
}

adminRouter.get("/projects", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT p.*, u.email as client_email 
      FROM projects p 
      LEFT JOIN users u ON p.client_id = u.id 
      ORDER BY p.created_at DESC
    `);
    
    // Fetch associated portfolio items for each project
    const projects = await Promise.all(result.rows.map(async (project) => {
      const portRes = await db.execute({
        sql: `SELECT pi.id, pi.title 
              FROM portfolio_items pi 
              JOIN project_portfolio_items ppi ON pi.id = ppi.portfolio_item_id 
              WHERE ppi.project_id = ?`,
        args: [project.id]
      });
      return {
        ...project,
        portfolios: portRes.rows
      };
    }));
    
    res.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

adminRouter.post("/projects", async (req, res) => {
  try {
    const { name, description, status, client_id, portfolio_ids, keywords } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Project name is required" });
    }
    
    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO projects (id, name, description, status, client_id, keywords, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [id, name.trim(), description || "", status || "active", client_id || null, keywords || ""]
    });
    
    if (Array.isArray(portfolio_ids) && portfolio_ids.length > 0) {
      for (const portfolioId of portfolio_ids) {
        await db.execute({
          sql: "INSERT INTO project_portfolio_items (project_id, portfolio_item_id) VALUES (?, ?)",
          args: [id, portfolioId]
        });
      }
    }
    
    res.json({ success: true, id });
  } catch (error) {
    console.error("Failed to create project", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

adminRouter.put("/projects/:id", async (req, res) => {
  try {
    const { name, description, status, client_id, portfolio_ids, keywords } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Project name is required" });
    }
    
    await db.execute({
      sql: `UPDATE projects SET name = ?, description = ?, status = ?, client_id = ?, keywords = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [name.trim(), description || "", status || "active", client_id || null, keywords || "", req.params.id]
    });
    
    // Clear old links
    await db.execute({
      sql: "DELETE FROM project_portfolio_items WHERE project_id = ?",
      args: [req.params.id]
    });
    
    // Insert new links
    if (Array.isArray(portfolio_ids) && portfolio_ids.length > 0) {
      for (const portfolioId of portfolio_ids) {
        await db.execute({
          sql: "INSERT INTO project_portfolio_items (project_id, portfolio_item_id) VALUES (?, ?)",
          args: [req.params.id, portfolioId]
        });
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update project", error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

adminRouter.post("/projects/:id/notify-client", async (req, res) => {
  try {
    const { customMessage } = req.body;
    const projectRes = await db.execute({
      sql: `SELECT p.*, u.email as client_email, u.name as client_name, u.property_address 
            FROM projects p 
            LEFT JOIN users u ON p.client_id = u.id 
            WHERE p.id = ?`,
      args: [req.params.id]
    });
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const project = projectRes.rows[0];
    if (!project.client_email) {
      return res.status(400).json({ error: "No client email associated with this project" });
    }

    const appOrigin = `${req.protocol}://${req.get("host")}`;
    const isGalleryDelivery = String(project.status || "").toLowerCase() === "completed";
    const mediaCounts = isGalleryDelivery ? await db.execute({
      sql: `SELECT
              SUM(CASE WHEN COALESCE(pi.media_type, 'image') = 'video' THEN 0 ELSE 1 END) AS photo_count,
              SUM(CASE WHEN pi.media_type = 'video' THEN 1 ELSE 0 END) AS video_count
            FROM portfolio_items pi
            JOIN project_portfolio_items ppi ON ppi.portfolio_item_id = pi.id
            WHERE ppi.project_id = ?`,
      args: [project.id],
    }) : null;
    const recipientName = String(project.client_name || project.client_email).split("@")[0];
    const downloadPin = isGalleryDelivery ? String(crypto.randomInt(1000, 10000)) : "";
    const templateData = isGalleryDelivery ? {
      recipient_name: recipientName,
      "user.name": recipientName,
      project_name: project.name,
      gallery_url: `${appOrigin}/client/projects`,
      photo_count: Number(mediaCounts?.rows[0]?.photo_count || 0),
      video_count: Number(mediaCounts?.rows[0]?.video_count || 0),
      download_pin: downloadPin,
      action_text: "Open delivered gallery",
      project_id: project.id,
    } : {
      recipientName,
      projectName: project.name as string,
      projectStatus: (project.status as string)?.toUpperCase() || "IN PROGRESS",
      additionalNotes: customMessage || (project.description as string) || "New media updates and deliverables have been uploaded to your portal.",
      actionUrl: `${appOrigin}/client`,
      actionText: "Open Client Portal"
    };
    const result = await sendTransactionalEmail({
      to: project.client_email as string,
      subject: isGalleryDelivery ? undefined : `Project Update: ${project.name}`,
      templateId: isGalleryDelivery ? "gallery_ready" : "project_update",
      templateData
    });

    if (result.success && isGalleryDelivery) {
      const pinHash = crypto.createHmac("sha256", process.env.JWT_SECRET || "supersecretjwtstring")
        .update(`${project.id}:${downloadPin}`).digest("hex");
      await db.execute({
        sql: `INSERT INTO gallery_download_access (project_id, pin_hash, issued_at, pin_email_sent_at, updated_at)
              VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT(project_id) DO UPDATE SET pin_hash = excluded.pin_hash, issued_at = CURRENT_TIMESTAMP, pin_email_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
        args: [project.id, pinHash],
      });
      const reviewSetting = await db.execute({ sql: "SELECT value FROM settings WHERE key = 'google_review_url' LIMIT 1", args: [] });
      const configuredUrl = String(reviewSetting.rows[0]?.value || "").trim();
      const destinationUrl = /^https:\/\//i.test(configuredUrl)
        ? configuredUrl
        : `https://www.google.com/search?q=${encodeURIComponent("SPS Studio Google Reviews")}`;
      await scheduleGoogleReviewCampaign({
        projectId: String(project.id),
        recipientEmail: String(project.client_email),
        recipientName,
        projectName: String(project.name),
        appOrigin,
        destinationUrl,
      });
    }

    res.json({ success: result.success, status: result.status, error: result.error, template: isGalleryDelivery ? "gallery_ready" : "project_update", reviewCampaignScheduled: result.success && isGalleryDelivery });
  } catch (error: any) {
    console.error("Failed to notify client:", error);
    res.status(500).json({ error: error.message || "Failed to notify client" });
  }
});

adminRouter.get("/projects/:id/timeline", async (req, res) => {
  try {
    const [milestones, updates] = await Promise.all([
      db.execute({ sql: "SELECT * FROM project_milestones WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC", args: [req.params.id] }),
      db.execute({ sql: "SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at DESC", args: [req.params.id] }),
    ]);
    res.json({ milestones: milestones.rows, updates: updates.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load project timeline" });
  }
});

adminRouter.post("/projects/:id/milestones", async (req, res) => {
  try {
    const { title, description = "", status = "pending", due_date = null, notify_client = false } = req.body;
    if (!String(title || "").trim()) return res.status(400).json({ error: "Milestone title is required" });
    const id = crypto.randomUUID();
    const order = await db.execute({ sql: "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM project_milestones WHERE project_id = ?", args: [req.params.id] });
    await db.execute({
      sql: `INSERT INTO project_milestones (id, project_id, title, description, status, due_date, sort_order, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
      args: [id, req.params.id, String(title).trim(), String(description).trim(), status, due_date || null, Number(order.rows[0]?.next_order || 0), status],
    });
    let emailResult: any = null;
    if (notify_client) {
      emailResult = await sendProjectTimelineEmail(req.params.id, { title, message: description || `Milestone status: ${status}`, statusLabel: `Milestone · ${title} · ${status}` }, `${req.protocol}://${req.get("host")}`);
      if (emailResult.success) await db.execute({ sql: "UPDATE project_milestones SET client_notified_at = CURRENT_TIMESTAMP WHERE id = ?", args: [id] });
    }
    const created = await db.execute({ sql: "SELECT * FROM project_milestones WHERE id = ?", args: [id] });
    res.json({ milestone: created.rows[0], email: emailResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create milestone" });
  }
});

adminRouter.put("/projects/:id/milestones/:milestoneId", async (req, res) => {
  try {
    const { title, description = "", status = "pending", due_date = null, notify_client = false } = req.body;
    if (!String(title || "").trim()) return res.status(400).json({ error: "Milestone title is required" });
    await db.execute({
      sql: `UPDATE project_milestones SET title = ?, description = ?, status = ?, due_date = ?,
            completed_at = CASE WHEN ? = 'completed' THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP WHERE id = ? AND project_id = ?`,
      args: [String(title).trim(), String(description).trim(), status, due_date || null, status, req.params.milestoneId, req.params.id],
    });
    let emailResult: any = null;
    if (notify_client) {
      emailResult = await sendProjectTimelineEmail(req.params.id, { title, message: description || `Milestone status: ${status}`, statusLabel: `Milestone · ${title} · ${status}` }, `${req.protocol}://${req.get("host")}`);
      if (emailResult.success) await db.execute({ sql: "UPDATE project_milestones SET client_notified_at = CURRENT_TIMESTAMP WHERE id = ?", args: [req.params.milestoneId] });
    }
    const updated = await db.execute({ sql: "SELECT * FROM project_milestones WHERE id = ? AND project_id = ?", args: [req.params.milestoneId, req.params.id] });
    res.json({ milestone: updated.rows[0], email: emailResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update milestone" });
  }
});

adminRouter.delete("/projects/:id/milestones/:milestoneId", async (req, res) => {
  try {
    await db.execute({ sql: "UPDATE project_updates SET milestone_id = NULL WHERE milestone_id = ? AND project_id = ?", args: [req.params.milestoneId, req.params.id] });
    await db.execute({ sql: "DELETE FROM project_milestones WHERE id = ? AND project_id = ?", args: [req.params.milestoneId, req.params.id] });
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message || "Failed to delete milestone" }); }
});

adminRouter.post("/projects/:id/updates", async (req, res) => {
  try {
    const { title, message, status_label = "", milestone_id = null, notify_client = true } = req.body;
    if (!String(title || "").trim() || !String(message || "").trim()) return res.status(400).json({ error: "Update title and message are required" });
    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO project_updates (id, project_id, milestone_id, title, message, status_label) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, req.params.id, milestone_id || null, String(title).trim(), String(message).trim(), String(status_label).trim()],
    });
    let emailResult: any = null;
    if (notify_client) {
      emailResult = await sendProjectTimelineEmail(req.params.id, { title, message, statusLabel: status_label || title }, `${req.protocol}://${req.get("host")}`);
      await db.execute({
        sql: `UPDATE project_updates SET sent_to_client = ?, sent_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END,
              email_status = ?, email_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [emailResult.success ? 1 : 0, emailResult.success ? 1 : 0, emailResult.status, emailResult.error || null, id],
      });
    }
    const created = await db.execute({ sql: "SELECT * FROM project_updates WHERE id = ?", args: [id] });
    res.json({ update: created.rows[0], email: emailResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to publish project update" });
  }
});

adminRouter.delete("/projects/:id/updates/:updateId", async (req, res) => {
  try {
    await db.execute({ sql: "DELETE FROM project_updates WHERE id = ? AND project_id = ?", args: [req.params.updateId, req.params.id] });
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message || "Failed to delete project update" }); }
});

adminRouter.delete("/projects/:id", async (req, res) => {
  try {
    await db.execute({ sql: "DELETE FROM project_updates WHERE project_id = ?", args: [req.params.id] });
    await db.execute({ sql: "DELETE FROM project_milestones WHERE project_id = ?", args: [req.params.id] });
    await db.execute({
      sql: "DELETE FROM project_portfolio_items WHERE project_id = ?",
      args: [req.params.id]
    });
    
    await db.execute({
      sql: "DELETE FROM projects WHERE id = ?",
      args: [req.params.id]
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// CRM Management (Leads & Customers)
adminRouter.get("/crm/check-email", async (req, res) => {
  try {
    const email = (req.query.email as string)?.trim().toLowerCase();
    if (!email) {
      return res.json({ exists: false, customer: null, has_portal_account: false, portal_user: null });
    }
    const customerRes = await db.execute({
      sql: `SELECT c.*,
                   u.id AS portal_user_id,
                   CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS has_portal_account,
                   u.is_active AS portal_user_is_active
            FROM crm_records c
            LEFT JOIN users u 
              ON LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)) 
             AND u.role = 'client' 
             AND c.email IS NOT NULL 
             AND TRIM(c.email) != ''
            WHERE LOWER(TRIM(c.email)) = ? AND c.type = 'customer' LIMIT 1`,
      args: [email]
    });
    const exists = customerRes.rows.length > 0;

    // Also check if a client portal account exists with this email
    const portalRes = await db.execute({
      sql: "SELECT id, email, is_active, property_address, advertisement_link FROM users WHERE LOWER(TRIM(email)) = ? AND role = 'client' LIMIT 1",
      args: [email]
    });
    const hasPortal = portalRes.rows.length > 0;

    res.json({ 
      exists, 
      customer: exists ? customerRes.rows[0] : null,
      has_portal_account: hasPortal,
      portal_user: hasPortal ? portalRes.rows[0] : null
    });
  } catch (error) {
    console.error("Failed to check email in CRM", error);
    res.status(500).json({ error: "Failed to check email" });
  }
});

// Check if an email has a client portal account
adminRouter.get("/crm/check-portal", async (req, res) => {
  try {
    const email = (req.query.email as string)?.trim().toLowerCase();
    if (!email) {
      return res.json({ has_portal_account: false, portal_user: null });
    }
    const portalRes = await db.execute({
      sql: "SELECT id, email, is_active, property_address, advertisement_link FROM users WHERE LOWER(TRIM(email)) = ? AND role = 'client' LIMIT 1",
      args: [email]
    });
    const hasPortal = portalRes.rows.length > 0;
    res.json({
      has_portal_account: hasPortal,
      portal_user: hasPortal ? portalRes.rows[0] : null
    });
  } catch (error) {
    console.error("Failed to check portal account for email", error);
    res.status(500).json({ error: "Failed to check portal account" });
  }
});

// Helper to write audit logs
async function logAuditEvent({
  entity_type,
  entity_id,
  action,
  actor_id,
  actor_email,
  actor_role,
  details,
  ip_address = ""
}: {
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  details: Record<string, any> | string;
  ip_address?: string;
}) {
  try {
    const id = crypto.randomUUID();
    const detailsStr = typeof details === "string" ? details : JSON.stringify(details);
    await db.execute({
      sql: `INSERT INTO audit_logs (id, entity_type, entity_id, action, actor_id, actor_email, actor_role, details, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        id,
        entity_type,
        entity_id,
        action,
        actor_id || null,
        actor_email || null,
        actor_role || "admin",
        detailsStr,
        ip_address
      ]
    });
  } catch (err) {
    console.warn("Failed to write audit log:", err);
  }
}

adminRouter.get("/crm/:type", async (req, res) => {
  try {
    const type = req.params.type;
    if (type !== 'lead' && type !== 'customer') {
      return res.status(400).json({ error: "Invalid CRM type" });
    }
    const search = (req.query.search as string) || '';
    let sql = `
      SELECT c.*,
             u.id AS portal_user_id,
             CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS has_portal_account,
             u.is_active AS portal_user_is_active,
             COALESCE(u.portal_access_disabled_at, c.portal_access_disabled_at) AS portal_access_disabled_at,
             COALESCE(u.portal_access_disabled_reason, c.portal_access_disabled_reason) AS portal_access_disabled_reason,
             COALESCE(u.portal_access_disabled_by, c.portal_access_disabled_by) AS portal_access_disabled_by,
             (SELECT COUNT(*) FROM client_properties cp WHERE cp.client_id = c.id OR (u.id IS NOT NULL AND cp.client_id = u.id)) as properties_count,
             (SELECT COUNT(*) FROM client_links cl WHERE cl.client_id = c.id OR (u.id IS NOT NULL AND cl.client_id = u.id)) as links_count
      FROM crm_records c
      LEFT JOIN users u 
        ON LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)) 
       AND u.role = 'client' 
       AND c.email IS NOT NULL 
       AND TRIM(c.email) != ''
      WHERE c.type = ?
    `;
    let args: any[] = [type];
    
    if (search) {
      sql += " AND (c.name LIKE ? OR c.email LIKE ? OR c.property_address LIKE ?)";
      args.push('%' + search + '%', '%' + search + '%', '%' + search + '%');
    }
    sql += " ORDER BY c.updated_at DESC";
    
    try {
      const result = await db.execute({ sql, args });
      res.json(result.rows);
    } catch (queryErr) {
      console.warn("Retrying CRM records query with fallback (ignoring property subqueries):", queryErr);
      let fallbackSql = `
        SELECT c.*,
               u.id AS portal_user_id,
               CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS has_portal_account,
               u.is_active AS portal_user_is_active,
               COALESCE(u.portal_access_disabled_at, c.portal_access_disabled_at) AS portal_access_disabled_at,
               COALESCE(u.portal_access_disabled_reason, c.portal_access_disabled_reason) AS portal_access_disabled_reason,
               COALESCE(u.portal_access_disabled_by, c.portal_access_disabled_by) AS portal_access_disabled_by,
               CASE WHEN c.property_address IS NOT NULL AND TRIM(c.property_address) != '' THEN 1 ELSE 0 END as properties_count,
               CASE WHEN c.advertisement_link IS NOT NULL AND TRIM(c.advertisement_link) != '' THEN 1 ELSE 0 END as links_count
        FROM crm_records c
        LEFT JOIN users u 
          ON LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)) 
         AND u.role = 'client' 
         AND c.email IS NOT NULL 
         AND TRIM(c.email) != ''
        WHERE c.type = ?
      `;
      let fallbackArgs: any[] = [type];
      if (search) {
        fallbackSql += " AND (c.name LIKE ? OR c.email LIKE ? OR c.property_address LIKE ?)";
        fallbackArgs.push('%' + search + '%', '%' + search + '%', '%' + search + '%');
      }
      fallbackSql += " ORDER BY c.updated_at DESC";
      const fallbackResult = await db.execute({ sql: fallbackSql, args: fallbackArgs });
      res.json(fallbackResult.rows);
    }
  } catch (error) {
    console.error("Failed to fetch CRM records", error);
    res.status(500).json({ error: "Failed to fetch CRM records" });
  }
});

adminRouter.post("/crm", async (req, res) => {
  try {
    const { type, name, email, phone, source, status, notes, owner_id, property_address, advertisement_link, linked_contact_id, properties, links } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: "Name is required" });
    }
    if (advertisement_link && !isValidUrl(advertisement_link)) {
      return res.status(400).json({ error: "Advertisement link must be a valid URL starting with http:// or https://" });
    }

    const id = crypto.randomUUID();
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const initialStatus = status || (type === 'customer' ? 'active' : 'new');
    const actorUser = (req as any).user || {};
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";

    const isInitiallyInactive = type === 'customer' && initialStatus === 'inactive';

    const primaryAddr = (Array.isArray(properties) && properties.length > 0)
      ? (typeof properties[0] === 'string' ? properties[0] : (properties[0].address || ''))
      : (property_address ? property_address.trim() : '');

    const primaryLink = (Array.isArray(links) && links.length > 0)
      ? (typeof links[0] === 'string' ? links[0] : (links[0].url || ''))
      : (advertisement_link ? advertisement_link.trim() : '');

    await db.execute({
      sql: `INSERT INTO crm_records 
            (id, type, name, email, phone, source, status, notes, owner_id, property_address, advertisement_link, 
             portal_access_disabled_at, portal_access_disabled_reason, portal_access_disabled_by,
             created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        id,
        type || 'lead',
        name.trim(),
        cleanEmail,
        phone ? phone.trim() : '',
        source ? source.trim() : '',
        initialStatus,
        notes || '',
        owner_id || '',
        primaryAddr,
        primaryLink,
        isInitiallyInactive ? new Date().toISOString() : null,
        isInitiallyInactive ? 'Customer created with inactive status' : '',
        isInitiallyInactive ? (actorUser.email || 'admin') : ''
      ]
    });

    // Save properties for CRM record (unlimited for admin)
    if (Array.isArray(properties)) {
      for (let i = 0; i < properties.length; i++) {
        const p = properties[i];
        const addr = typeof p === 'string' ? p.trim() : (p.address ? p.address.trim() : '');
        const pName = typeof p === 'string' ? `Property ${i + 1}` : (p.property_name?.trim() || `Property ${i + 1}`);
        if (addr) {
          await db.execute({
            sql: `INSERT INTO client_properties (id, client_id, property_name, address, metadata, sort_order, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            args: [
              crypto.randomUUID(),
              id,
              pName,
              addr,
              typeof p === 'object' && p.metadata ? JSON.stringify(p.metadata) : "{}",
              i
            ]
          });
        }
      }
    } else if (primaryAddr) {
      await db.execute({
        sql: `INSERT INTO client_properties (id, client_id, property_name, address, sort_order, created_at, updated_at)
              VALUES (?, ?, 'Primary Property', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [crypto.randomUUID(), id, primaryAddr]
      });
    }

    // Save links for CRM record (unlimited for admin)
    if (Array.isArray(links)) {
      for (let i = 0; i < links.length; i++) {
        const l = links[i];
        const u = typeof l === 'string' ? l.trim() : (l.url ? l.url.trim() : '');
        const lbl = typeof l === 'string' ? `Link ${i + 1}` : (l.label?.trim() || `Link ${i + 1}`);
        if (u) {
          await db.execute({
            sql: `INSERT INTO client_links (id, client_id, label, url, metadata, sort_order, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            args: [
              crypto.randomUUID(),
              id,
              lbl,
              u,
              typeof l === 'object' && l.metadata ? JSON.stringify(l.metadata) : "{}",
              i
            ]
          });
        }
      }
    } else if (primaryLink) {
      await db.execute({
        sql: `INSERT INTO client_links (id, client_id, label, url, sort_order, created_at, updated_at)
              VALUES (?, ?, 'Main Listing / Ad Link', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [crypto.randomUUID(), id, primaryLink]
      });
    }

    // If initial status is inactive and a portal user exists, disable them
    if (isInitiallyInactive && cleanEmail) {
      await db.execute({
        sql: `UPDATE users 
              SET is_active = 0,
                  portal_access_disabled_at = CURRENT_TIMESTAMP,
                  portal_access_disabled_reason = 'Customer created with inactive status',
                  portal_access_disabled_by = ?
              WHERE LOWER(TRIM(email)) = ? AND role = 'client'`,
        args: [actorUser.email || 'admin', cleanEmail]
      });

      await logAuditEvent({
        entity_type: 'customer',
        entity_id: id,
        action: 'PORTAL_ACCESS_DISABLED_INACTIVITY',
        actor_id: actorUser.id,
        actor_email: actorUser.email,
        actor_role: actorUser.role,
        details: {
          customer_id: id,
          customer_name: name.trim(),
          customer_email: cleanEmail,
          status: 'inactive',
          reason: 'Customer created with inactive status - portal access automatically disabled'
        },
        ip_address: clientIp
      });
    }

    // Log creation
    await logAuditEvent({
      entity_type: 'customer',
      entity_id: id,
      action: 'CUSTOMER_CREATED',
      actor_id: actorUser.id,
      actor_email: actorUser.email,
      actor_role: actorUser.role,
      details: {
        customer_id: id,
        customer_name: name.trim(),
        customer_email: cleanEmail,
        type: type || 'lead',
        status: initialStatus
      },
      ip_address: clientIp
    });

    // If a contact submission ID is provided to link, update the contact record
    if (linked_contact_id) {
      try {
        await db.execute({
          sql: "UPDATE contact_submissions SET customer_id = ? WHERE id = ?",
          args: [id, linked_contact_id]
        });
      } catch (linkErr) {
        console.warn("Failed to link contact submission to new customer:", linkErr);
      }
    }

    // Fetch the inserted record with joined portal status
    const createdQuery = await db.execute({
      sql: `SELECT c.*,
                   u.id AS portal_user_id,
                   CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS has_portal_account,
                   u.is_active AS portal_user_is_active,
                   COALESCE(u.portal_access_disabled_at, c.portal_access_disabled_at) AS portal_access_disabled_at,
                   COALESCE(u.portal_access_disabled_reason, c.portal_access_disabled_reason) AS portal_access_disabled_reason,
                   COALESCE(u.portal_access_disabled_by, c.portal_access_disabled_by) AS portal_access_disabled_by
            FROM crm_records c
            LEFT JOIN users u 
              ON LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)) 
             AND u.role = 'client' 
             AND c.email IS NOT NULL 
             AND TRIM(c.email) != ''
            WHERE c.id = ?`,
      args: [id]
    });

    res.json({ success: true, id, record: createdQuery.rows[0] });
  } catch (error: any) {
    console.error("Failed to create CRM record", error);
    res.status(500).json({ error: error.message || "Failed to create CRM record" });
  }
});

adminRouter.put("/crm/:id", async (req, res) => {
  try {
    const { type, name, email, phone, source, status, notes, owner_id, property_address, advertisement_link, re_enable_portal } = req.body;
    if (advertisement_link !== undefined && advertisement_link !== null && !isValidUrl(advertisement_link)) {
      return res.status(400).json({ error: "Advertisement link must be a valid URL starting with http:// or https://" });
    }

    const existingRes = await db.execute({
      sql: `SELECT c.*,
                   u.id AS portal_user_id,
                   CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS has_portal_account,
                   u.is_active AS portal_user_is_active
            FROM crm_records c
            LEFT JOIN users u 
              ON LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)) 
             AND u.role = 'client' 
             AND c.email IS NOT NULL 
             AND TRIM(c.email) != ''
            WHERE c.id = ?`,
      args: [req.params.id]
    });

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: "CRM record not found" });
    }

    const existing = existingRes.rows[0];
    const prevStatus = existing.status as string;
    const newStatus = status !== undefined ? status : prevStatus;
    const customerEmail = (email !== undefined ? email : existing.email as string)?.trim().toLowerCase();
    const actorUser = (req as any).user || {};
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";

    const isCustomer = (type || existing.type) === 'customer';
    const becomingInactive = isCustomer && newStatus === 'inactive' && prevStatus !== 'inactive';
    const becomingActive = isCustomer && newStatus === 'active' && prevStatus === 'inactive';

    let portalDisabledAt = existing.portal_access_disabled_at;
    let portalDisabledReason = existing.portal_access_disabled_reason;
    let portalDisabledBy = existing.portal_access_disabled_by;

    if (newStatus === 'inactive' && isCustomer) {
      portalDisabledAt = new Date().toISOString();
      portalDisabledReason = 'Customer marked inactive';
      portalDisabledBy = actorUser.email || 'admin';
    } else if (becomingActive && re_enable_portal) {
      portalDisabledAt = null;
      portalDisabledReason = '';
      portalDisabledBy = '';
    }

    await db.execute({
      sql: `UPDATE crm_records SET 
            type = COALESCE(?, type),
            name = COALESCE(?, name),
            email = COALESCE(?, email),
            phone = COALESCE(?, phone),
            source = COALESCE(?, source),
            status = COALESCE(?, status),
            notes = COALESCE(?, notes),
            owner_id = COALESCE(?, owner_id),
            property_address = ?,
            advertisement_link = ?,
            portal_access_disabled_at = ?,
            portal_access_disabled_reason = ?,
            portal_access_disabled_by = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        type || null,
        name !== undefined ? name.trim() : null,
        email !== undefined ? email.trim() : null,
        phone !== undefined ? phone.trim() : null,
        source !== undefined ? source.trim() : null,
        status || null,
        notes !== undefined ? notes : null,
        owner_id !== undefined ? owner_id : null,
        property_address !== undefined && property_address !== null ? property_address.trim() : '',
        advertisement_link !== undefined && advertisement_link !== null ? advertisement_link.trim() : '',
        portalDisabledAt,
        portalDisabledReason,
        portalDisabledBy,
        req.params.id
      ]
    });

    // 1. AUTOMATICALLY DISABLE PORTAL ACCESS WHEN CUSTOMER IS MARKED INACTIVE
    let portalAccountsAffected = 0;
    if (newStatus === 'inactive' && isCustomer && customerEmail) {
      const disableUsersRes = await db.execute({
        sql: `UPDATE users 
              SET is_active = 0,
                  portal_access_disabled_at = CURRENT_TIMESTAMP,
                  portal_access_disabled_reason = 'Customer marked inactive',
                  portal_access_disabled_by = ?
              WHERE LOWER(TRIM(email)) = ? AND role = 'client'`,
        args: [actorUser.email || 'admin', customerEmail]
      });
      portalAccountsAffected = Number(disableUsersRes.rowsAffected || 0);

      // Audit Log for disabling portal access due to inactivity
      await logAuditEvent({
        entity_type: 'customer',
        entity_id: req.params.id,
        action: 'PORTAL_ACCESS_DISABLED_INACTIVITY',
        actor_id: actorUser.id,
        actor_email: actorUser.email,
        actor_role: actorUser.role,
        details: {
          customer_id: req.params.id,
          customer_name: (name !== undefined ? name : existing.name),
          customer_email: customerEmail,
          previous_status: prevStatus,
          new_status: 'inactive',
          portal_accounts_disabled: portalAccountsAffected,
          reason: 'Customer status set to Inactive — portal access automatically disabled and active sessions blocked.'
        },
        ip_address: clientIp
      });
    }

    // 2. OPTIONAL RE-ENABLE PORTAL ACCESS ON CUSTOMER REACTIVATION
    if (becomingActive && re_enable_portal && customerEmail) {
      const enableUsersRes = await db.execute({
        sql: `UPDATE users 
              SET is_active = 1,
                  portal_access_disabled_at = NULL,
                  portal_access_disabled_reason = '',
                  portal_access_disabled_by = ''
              WHERE LOWER(TRIM(email)) = ? AND role = 'client'`,
        args: [customerEmail]
      });
      portalAccountsAffected = Number(enableUsersRes.rowsAffected || 0);

      await logAuditEvent({
        entity_type: 'customer',
        entity_id: req.params.id,
        action: 'PORTAL_ACCESS_ENABLED_REACTIVATION',
        actor_id: actorUser.id,
        actor_email: actorUser.email,
        actor_role: actorUser.role,
        details: {
          customer_id: req.params.id,
          customer_name: (name !== undefined ? name : existing.name),
          customer_email: customerEmail,
          previous_status: prevStatus,
          new_status: 'active',
          portal_accounts_reactivated: portalAccountsAffected,
          reason: 'Customer reactivated to Active — portal access restored.'
        },
        ip_address: clientIp
      });
    }

    // 3. Log general status update if status changed
    if (prevStatus !== newStatus) {
      await logAuditEvent({
        entity_type: 'customer',
        entity_id: req.params.id,
        action: 'CUSTOMER_STATUS_CHANGED',
        actor_id: actorUser.id,
        actor_email: actorUser.email,
        actor_role: actorUser.role,
        details: {
          customer_id: req.params.id,
          customer_name: (name !== undefined ? name : existing.name),
          previous_status: prevStatus,
          new_status: newStatus
        },
        ip_address: clientIp
      });
    }

    const updatedQuery = await db.execute({
      sql: `SELECT c.*,
                   u.id AS portal_user_id,
                   CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS has_portal_account,
                   u.is_active AS portal_user_is_active,
                   COALESCE(u.portal_access_disabled_at, c.portal_access_disabled_at) AS portal_access_disabled_at,
                   COALESCE(u.portal_access_disabled_reason, c.portal_access_disabled_reason) AS portal_access_disabled_reason,
                   COALESCE(u.portal_access_disabled_by, c.portal_access_disabled_by) AS portal_access_disabled_by
            FROM crm_records c
            LEFT JOIN users u 
              ON LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)) 
             AND u.role = 'client' 
             AND c.email IS NOT NULL 
             AND TRIM(c.email) != ''
            WHERE c.id = ?`,
      args: [req.params.id]
    });

    res.json({ 
      success: true, 
      record: updatedQuery.rows[0],
      portal_disabled_automatically: becomingInactive && Boolean(existing.has_portal_account)
    });
  } catch (error: any) {
    console.error("Failed to update CRM record", error);
    res.status(500).json({ error: error.message || "Failed to update CRM record" });
  }
});

// Explicitly toggle/manage portal access for a specific customer
adminRouter.post("/crm/customers/:id/portal-access", async (req, res) => {
  try {
    const { is_active, reason } = req.body;
    const targetActive = is_active ? 1 : 0;
    const actorUser = (req as any).user || {};
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";

    const customerRes = await db.execute({
      sql: "SELECT * FROM crm_records WHERE id = ?",
      args: [req.params.id]
    });
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = customerRes.rows[0];
    const customerEmail = (customer.email as string)?.trim().toLowerCase();
    if (!customerEmail) {
      return res.status(400).json({ error: "Customer does not have an email address" });
    }

    // Update portal user(s)
    const updateUsersRes = await db.execute({
      sql: `UPDATE users 
            SET is_active = ?,
                portal_access_disabled_at = CASE WHEN ? = 0 THEN CURRENT_TIMESTAMP ELSE NULL END,
                portal_access_disabled_reason = CASE WHEN ? = 0 THEN ? ELSE '' END,
                portal_access_disabled_by = CASE WHEN ? = 0 THEN ? ELSE '' END
            WHERE LOWER(TRIM(email)) = ? AND role = 'client'`,
      args: [
        targetActive,
        targetActive,
        targetActive,
        reason || (targetActive === 0 ? 'Admin revoked portal access' : ''),
        targetActive,
        actorUser.email || 'admin',
        customerEmail
      ]
    });

    // Update CRM record disabled info
    await db.execute({
      sql: `UPDATE crm_records
            SET portal_access_disabled_at = CASE WHEN ? = 0 THEN CURRENT_TIMESTAMP ELSE NULL END,
                portal_access_disabled_reason = CASE WHEN ? = 0 THEN ? ELSE '' END,
                portal_access_disabled_by = CASE WHEN ? = 0 THEN ? ELSE '' END
            WHERE id = ?`,
      args: [
        targetActive,
        targetActive,
        reason || (targetActive === 0 ? 'Admin revoked portal access' : ''),
        targetActive,
        actorUser.email || 'admin',
        req.params.id
      ]
    });

    const actionName = targetActive === 0 ? 'PORTAL_ACCESS_DISABLED_MANUAL' : 'PORTAL_ACCESS_ENABLED_MANUAL';
    await logAuditEvent({
      entity_type: 'customer',
      entity_id: req.params.id,
      action: actionName,
      actor_id: actorUser.id,
      actor_email: actorUser.email,
      actor_role: actorUser.role,
      details: {
        customer_id: req.params.id,
        customer_name: customer.name,
        customer_email: customerEmail,
        is_active: targetActive,
        reason: reason || (targetActive === 0 ? 'Portal access disabled by admin' : 'Portal access enabled by admin'),
        users_affected: Number(updateUsersRes.rowsAffected || 0)
      },
      ip_address: clientIp
    });

    const updatedQuery = await db.execute({
      sql: `SELECT c.*,
                   u.id AS portal_user_id,
                   CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS has_portal_account,
                   u.is_active AS portal_user_is_active,
                   COALESCE(u.portal_access_disabled_at, c.portal_access_disabled_at) AS portal_access_disabled_at,
                   COALESCE(u.portal_access_disabled_reason, c.portal_access_disabled_reason) AS portal_access_disabled_reason,
                   COALESCE(u.portal_access_disabled_by, c.portal_access_disabled_by) AS portal_access_disabled_by
            FROM crm_records c
            LEFT JOIN users u 
              ON LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)) 
             AND u.role = 'client' 
             AND c.email IS NOT NULL 
             AND TRIM(c.email) != ''
            WHERE c.id = ?`,
      args: [req.params.id]
    });

    res.json({
      success: true,
      is_active: targetActive === 1,
      record: updatedQuery.rows[0],
      users_affected: Number(updateUsersRes.rowsAffected || 0)
    });
  } catch (error: any) {
    console.error("Failed to toggle customer portal access:", error);
    res.status(500).json({ error: error.message || "Failed to update portal access" });
  }
});

// Bulk customer status update with automatic portal disable & audit logging
adminRouter.post("/crm/customers/bulk-status", async (req, res) => {
  try {
    const { customer_ids, status, re_enable_portal, reason } = req.body;
    if (!Array.isArray(customer_ids) || customer_ids.length === 0) {
      return res.status(400).json({ error: "customer_ids must be a non-empty array of customer IDs" });
    }
    if (!status || !['active', 'inactive', 'archived', 'pending', 'new'].includes(status)) {
      return res.status(400).json({ error: "Valid status is required" });
    }

    const actorUser = (req as any).user || {};
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
    const placeholders = customer_ids.map(() => "?").join(",");

    // 1. Fetch targeted customers
    const customersQuery = await db.execute({
      sql: `SELECT c.*,
                   u.id AS portal_user_id,
                   CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS has_portal_account,
                   u.is_active AS portal_user_is_active
            FROM crm_records c
            LEFT JOIN users u 
              ON LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)) 
             AND u.role = 'client' 
             AND c.email IS NOT NULL 
             AND TRIM(c.email) != ''
            WHERE c.id IN (${placeholders})`,
      args: customer_ids
    });

    let portalAccountsDisabled = 0;
    let portalAccountsReactivated = 0;

    for (const customer of customersQuery.rows) {
      const email = (customer.email as string)?.trim().toLowerCase();
      const prevStatus = customer.status as string;

      // Update customer record
      await db.execute({
        sql: `UPDATE crm_records SET 
              status = ?,
              portal_access_disabled_at = CASE WHEN ? = 'inactive' THEN CURRENT_TIMESTAMP ELSE (CASE WHEN ? = 1 THEN NULL ELSE portal_access_disabled_at END) END,
              portal_access_disabled_reason = CASE WHEN ? = 'inactive' THEN ? ELSE (CASE WHEN ? = 1 THEN '' ELSE portal_access_disabled_reason END) END,
              portal_access_disabled_by = CASE WHEN ? = 'inactive' THEN ? ELSE (CASE WHEN ? = 1 THEN '' ELSE portal_access_disabled_by END) END,
              updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [
          status,
          status,
          re_enable_portal ? 1 : 0,
          status,
          reason || 'Bulk marked inactive',
          re_enable_portal ? 1 : 0,
          status,
          actorUser.email || 'admin',
          re_enable_portal ? 1 : 0,
          customer.id
        ]
      });

      // If status is inactive -> disable all portal users
      if (status === 'inactive' && email) {
        const disRes = await db.execute({
          sql: `UPDATE users 
                SET is_active = 0,
                    portal_access_disabled_at = CURRENT_TIMESTAMP,
                    portal_access_disabled_reason = ?,
                    portal_access_disabled_by = ?
                WHERE LOWER(TRIM(email)) = ? AND role = 'client'`,
          args: [reason || 'Bulk customer marked inactive', actorUser.email || 'admin', email]
        });
        if (Number(disRes.rowsAffected || 0) > 0) {
          portalAccountsDisabled += Number(disRes.rowsAffected || 0);
        }

        await logAuditEvent({
          entity_type: 'customer',
          entity_id: customer.id as string,
          action: 'PORTAL_ACCESS_DISABLED_INACTIVITY',
          actor_id: actorUser.id,
          actor_email: actorUser.email,
          actor_role: actorUser.role,
          details: {
            customer_id: customer.id,
            customer_name: customer.name,
            customer_email: email,
            previous_status: prevStatus,
            new_status: 'inactive',
            reason: reason || 'Bulk action: customer set to Inactive — portal access automatically disabled.'
          },
          ip_address: clientIp
        });
      } else if (status === 'active' && re_enable_portal && email) {
        // Reactivate portal users
        const enRes = await db.execute({
          sql: `UPDATE users 
                SET is_active = 1,
                    portal_access_disabled_at = NULL,
                    portal_access_disabled_reason = '',
                    portal_access_disabled_by = ''
                WHERE LOWER(TRIM(email)) = ? AND role = 'client'`,
          args: [email]
        });
        if (Number(enRes.rowsAffected || 0) > 0) {
          portalAccountsReactivated += Number(enRes.rowsAffected || 0);
        }

        await logAuditEvent({
          entity_type: 'customer',
          entity_id: customer.id as string,
          action: 'PORTAL_ACCESS_ENABLED_REACTIVATION',
          actor_id: actorUser.id,
          actor_email: actorUser.email,
          actor_role: actorUser.role,
          details: {
            customer_id: customer.id,
            customer_name: customer.name,
            customer_email: email,
            previous_status: prevStatus,
            new_status: 'active',
            reason: 'Bulk action: customer reactivated to Active — portal access restored.'
          },
          ip_address: clientIp
        });
      } else if (prevStatus !== status) {
        await logAuditEvent({
          entity_type: 'customer',
          entity_id: customer.id as string,
          action: 'CUSTOMER_STATUS_CHANGED',
          actor_id: actorUser.id,
          actor_email: actorUser.email,
          actor_role: actorUser.role,
          details: {
            customer_id: customer.id,
            customer_name: customer.name,
            previous_status: prevStatus,
            new_status: status
          },
          ip_address: clientIp
        });
      }
    }

    res.json({
      success: true,
      updated_count: customersQuery.rows.length,
      portal_accounts_disabled: portalAccountsDisabled,
      portal_accounts_reactivated: portalAccountsReactivated,
      new_status: status
    });
  } catch (error: any) {
    console.error("Failed to bulk update customer status:", error);
    res.status(500).json({ error: error.message || "Failed to bulk update status" });
  }
});

// Fetch Audit Logs for a specific customer
adminRouter.get("/crm/customers/:id/audit-logs", async (req, res) => {
  try {
    const customerId = req.params.id;
    const result = await db.execute({
      sql: `SELECT * FROM audit_logs 
            WHERE entity_id = ? 
               OR (entity_type = 'customer' AND details LIKE ?)
            ORDER BY created_at DESC 
            LIMIT 100`,
      args: [customerId, `%"customer_id":"${customerId}"%`]
    });
    res.json(result.rows);
  } catch (error: any) {
    console.error("Failed to fetch customer audit logs:", error);
    res.status(500).json({ error: error.message || "Failed to fetch audit logs" });
  }
});

// Fetch Global System Audit Logs
adminRouter.get("/audit-logs", async (req, res) => {
  try {
    const { entity_type, action, limit = 100, offset = 0 } = req.query;
    let sql = "SELECT * FROM audit_logs WHERE 1=1";
    const args: any[] = [];

    if (entity_type && typeof entity_type === "string") {
      sql += " AND entity_type = ?";
      args.push(entity_type);
    }
    if (action && typeof action === "string") {
      sql += " AND action = ?";
      args.push(action);
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    args.push(Number(limit), Number(offset));

    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (error: any) {
    console.error("Failed to fetch global audit logs:", error);
    res.status(500).json({ error: error.message || "Failed to fetch audit logs" });
  }
});

adminRouter.delete("/crm/:id", async (req, res) => {
  try {
    const actorUser = (req as any).user || {};
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";

    const existing = await db.execute({
      sql: "SELECT * FROM crm_records WHERE id = ?",
      args: [req.params.id]
    });

    if (existing.rows.length > 0) {
      await logAuditEvent({
        entity_type: 'customer',
        entity_id: req.params.id,
        action: 'CUSTOMER_DELETED',
        actor_id: actorUser.id,
        actor_email: actorUser.email,
        actor_role: actorUser.role,
        details: {
          customer_id: req.params.id,
          customer_name: existing.rows[0].name,
          customer_email: existing.rows[0].email
        },
        ip_address: clientIp
      });
    }

    await db.execute({
      sql: "DELETE FROM client_properties WHERE client_id = ?",
      args: [req.params.id]
    });
    await db.execute({
      sql: "DELETE FROM client_links WHERE client_id = ?",
      args: [req.params.id]
    });
    await db.execute({
      sql: "DELETE FROM crm_records WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete CRM record", error);
    res.status(500).json({ error: "Failed to delete CRM record" });
  }
});

// ==================== CRM RECORD PROPERTIES (UNLIMITED FOR ADMIN) ====================
adminRouter.get("/crm/:id/properties", async (req, res) => {
  try {
    const crmId = req.params.id;
    // Also find linked user email/id
    const crmRes = await db.execute({
      sql: "SELECT email FROM crm_records WHERE id = ?",
      args: [crmId]
    });
    const crmEmail = crmRes.rows[0]?.email as string;

    const result = await db.execute({
      sql: `SELECT * FROM client_properties 
            WHERE client_id = ? 
               OR (SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND role = 'client' LIMIT 1) = client_id
            ORDER BY sort_order ASC, created_at ASC`,
      args: [crmId, crmEmail || ""]
    });
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch CRM properties", error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

adminRouter.post("/crm/:id/properties", async (req, res) => {
  try {
    const crmId = req.params.id;
    const { property_name, address, metadata } = req.body;
    if (!address || typeof address !== "string" || !address.trim()) {
      return res.status(400).json({ error: "Property address is required" });
    }

    const countRes = await db.execute({
      sql: "SELECT COUNT(*) as count FROM client_properties WHERE client_id = ?",
      args: [crmId]
    });
    const nextOrder = Number(countRes.rows[0]?.count || 0);
    const id = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO client_properties (id, client_id, property_name, address, metadata, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        id,
        crmId,
        property_name ? property_name.trim() : "Property",
        address.trim(),
        typeof metadata === "object" ? JSON.stringify(metadata) : (metadata || "{}"),
        nextOrder
      ]
    });

    const item = await db.execute({
      sql: "SELECT * FROM client_properties WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, property: item.rows[0] });
  } catch (error) {
    console.error("Failed to add property", error);
    res.status(500).json({ error: "Failed to add property" });
  }
});

adminRouter.put("/crm/:id/properties/:propertyId", async (req, res) => {
  try {
    const { property_name, address, metadata } = req.body;
    if (!address || typeof address !== "string" || !address.trim()) {
      return res.status(400).json({ error: "Property address is required" });
    }

    await db.execute({
      sql: `UPDATE client_properties 
            SET property_name = ?, address = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        property_name ? property_name.trim() : "Property",
        address.trim(),
        typeof metadata === "object" ? JSON.stringify(metadata) : (metadata || "{}"),
        req.params.propertyId
      ]
    });

    const item = await db.execute({
      sql: "SELECT * FROM client_properties WHERE id = ?",
      args: [req.params.propertyId]
    });

    res.json({ success: true, property: item.rows[0] });
  } catch (error) {
    console.error("Failed to update property", error);
    res.status(500).json({ error: "Failed to update property" });
  }
});

adminRouter.delete("/crm/:id/properties/:propertyId", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM client_properties WHERE id = ?",
      args: [req.params.propertyId]
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete property", error);
    res.status(500).json({ error: "Failed to delete property" });
  }
});

adminRouter.post("/crm/:id/properties/reorder", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items array is required" });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const targetId = typeof item === 'string' ? item : item.id;
      const order = typeof item === 'object' && item.sort_order !== undefined ? item.sort_order : i;
      await db.execute({
        sql: "UPDATE client_properties SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [order, targetId]
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder properties", error);
    res.status(500).json({ error: "Failed to reorder properties" });
  }
});

// ==================== CRM RECORD LINKS (UNLIMITED FOR ADMIN) ====================
adminRouter.get("/crm/:id/links", async (req, res) => {
  try {
    const crmId = req.params.id;
    const crmRes = await db.execute({
      sql: "SELECT email FROM crm_records WHERE id = ?",
      args: [crmId]
    });
    const crmEmail = crmRes.rows[0]?.email as string;

    const result = await db.execute({
      sql: `SELECT * FROM client_links 
            WHERE client_id = ? 
               OR (SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND role = 'client' LIMIT 1) = client_id
            ORDER BY sort_order ASC, created_at ASC`,
      args: [crmId, crmEmail || ""]
    });
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch CRM links", error);
    res.status(500).json({ error: "Failed to fetch links" });
  }
});

adminRouter.post("/crm/:id/links", async (req, res) => {
  try {
    const crmId = req.params.id;
    const { label, url, metadata } = req.body;
    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ error: "URL is required" });
    }
    if (!isValidUrl(url.trim())) {
      return res.status(400).json({ error: "Link must be a valid URL starting with http:// or https://" });
    }

    const countRes = await db.execute({
      sql: "SELECT COUNT(*) as count FROM client_links WHERE client_id = ?",
      args: [crmId]
    });
    const nextOrder = Number(countRes.rows[0]?.count || 0);
    const id = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO client_links (id, client_id, label, url, metadata, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        id,
        crmId,
        label ? label.trim() : "Listing Link",
        url.trim(),
        typeof metadata === "object" ? JSON.stringify(metadata) : (metadata || "{}"),
        nextOrder
      ]
    });

    const item = await db.execute({
      sql: "SELECT * FROM client_links WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, link: item.rows[0] });
  } catch (error) {
    console.error("Failed to add link", error);
    res.status(500).json({ error: "Failed to add link" });
  }
});

adminRouter.put("/crm/:id/links/:linkId", async (req, res) => {
  try {
    const { label, url, metadata } = req.body;
    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ error: "URL is required" });
    }
    if (!isValidUrl(url.trim())) {
      return res.status(400).json({ error: "Link must be a valid URL starting with http:// or https://" });
    }

    await db.execute({
      sql: `UPDATE client_links 
            SET label = ?, url = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        label ? label.trim() : "Listing Link",
        url.trim(),
        typeof metadata === "object" ? JSON.stringify(metadata) : (metadata || "{}"),
        req.params.linkId
      ]
    });

    const item = await db.execute({
      sql: "SELECT * FROM client_links WHERE id = ?",
      args: [req.params.linkId]
    });

    res.json({ success: true, link: item.rows[0] });
  } catch (error) {
    console.error("Failed to update link", error);
    res.status(500).json({ error: "Failed to update link" });
  }
});

adminRouter.delete("/crm/:id/links/:linkId", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM client_links WHERE id = ?",
      args: [req.params.linkId]
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete link", error);
    res.status(500).json({ error: "Failed to delete link" });
  }
});

adminRouter.post("/crm/:id/links/reorder", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items array is required" });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const targetId = typeof item === 'string' ? item : item.id;
      const order = typeof item === 'object' && item.sort_order !== undefined ? item.sort_order : i;
      await db.execute({
        sql: "UPDATE client_links SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [order, targetId]
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder links", error);
    res.status(500).json({ error: "Failed to reorder links" });
  }
});

// Send single customer portal invitation email
adminRouter.post("/crm/customers/:id/send-portal-invite", async (req, res) => {
  try {
    const customerId = req.params.id;
    const customerRes = await db.execute({
      sql: `SELECT c.*,
                   u.id AS portal_user_id,
                   CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS has_portal_account,
                   u.is_active AS portal_user_is_active
            FROM crm_records c
            LEFT JOIN users u 
              ON LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)) 
             AND u.role = 'client' 
             AND c.email IS NOT NULL 
             AND TRIM(c.email) != ''
            WHERE c.id = ?`,
      args: [customerId]
    });

    if (customerRes.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = customerRes.rows[0];
    const email = (customer.email as string)?.trim();
    if (!email) {
      return res.status(400).json({ error: "Customer does not have a valid email address" });
    }

    const appOrigin = `${req.protocol}://${req.get("host")}`;
    const result = await sendPortalInvitationEmail(
      {
        id: customer.id as string,
        name: (customer.name as string) || email.split("@")[0],
        email: email,
        property_address: customer.property_address as string | undefined,
        advertisement_link: customer.advertisement_link as string | undefined
      },
      appOrigin,
      { expiresInHours: 48 }
    );

    res.json({
      success: result.success,
      recipient: email,
      name: customer.name,
      simulated: result.simulated,
      expiresAt: result.expiresAt,
      error: result.error,
      message: result.simulated
        ? `Portal invitation email simulated for ${email} (Preview link logged in system)`
        : `Portal invitation email sent successfully to ${email}`
    });
  } catch (error: any) {
    console.error("Failed to send portal invitation email:", error);
    res.status(500).json({ error: error.message || "Failed to send portal invitation email" });
  }
});

// Bulk customer portal invitations
adminRouter.post("/crm/customers/bulk-portal-invite", async (req, res) => {
  try {
    const { customer_ids } = req.body;
    if (!Array.isArray(customer_ids) || customer_ids.length === 0) {
      return res.status(400).json({ error: "customer_ids must be a non-empty array of customer IDs" });
    }

    const placeholders = customer_ids.map(() => "?").join(",");
    const customersQuery = await db.execute({
      sql: `SELECT c.*,
                   u.id AS portal_user_id,
                   CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS has_portal_account
            FROM crm_records c
            LEFT JOIN users u 
              ON LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)) 
             AND u.role = 'client' 
             AND c.email IS NOT NULL 
             AND TRIM(c.email) != ''
            WHERE c.id IN (${placeholders})`,
      args: customer_ids
    });

    const appOrigin = `${req.protocol}://${req.get("host")}`;
    const results: Array<{
      id: string;
      name: string;
      email: string;
      success: boolean;
      error?: string;
      simulated?: boolean;
      alreadyHadPortal?: boolean;
    }> = [];

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const customer of customersQuery.rows) {
      const email = (customer.email as string)?.trim();
      const name = (customer.name as string) || "Customer";
      const id = customer.id as string;

      if (!email) {
        skippedCount++;
        results.push({
          id,
          name,
          email: "",
          success: false,
          error: "No email address registered for this customer."
        });
        continue;
      }

      try {
        const inviteRes = await sendPortalInvitationEmail(
          {
            id,
            name,
            email,
            property_address: customer.property_address as string | undefined,
            advertisement_link: customer.advertisement_link as string | undefined
          },
          appOrigin,
          { expiresInHours: 48 }
        );

        if (inviteRes.success) {
          sentCount++;
          results.push({
            id,
            name,
            email,
            success: true,
            simulated: inviteRes.simulated,
            alreadyHadPortal: Boolean(customer.has_portal_account)
          });
        } else {
          failedCount++;
          results.push({
            id,
            name,
            email,
            success: false,
            error: inviteRes.error || "Failed to dispatch email",
            simulated: inviteRes.simulated
          });
        }
      } catch (err: any) {
        failedCount++;
        results.push({
          id,
          name,
          email,
          success: false,
          error: err?.message || "Unexpected error during dispatch"
        });
      }
    }

    res.json({
      success: true,
      total_requested: customer_ids.length,
      total_processed: customersQuery.rows.length,
      sent_count: sentCount,
      failed_count: failedCount,
      skipped_count: skippedCount,
      results
    });
  } catch (error: any) {
    console.error("Failed to process bulk portal invitations:", error);
    res.status(500).json({ error: error.message || "Failed to process bulk portal invitations" });
  }
});

// ==========================================
// TRANSLATIONS MANAGEMENT ENDPOINTS
// ==========================================

// Get list of translations with search, locale filter, group filter, and pagination
adminRouter.get("/translations", async (req, res) => {
  try {
    const { locale, group, search, limit, offset } = req.query;
    const result = await translationService.getList({
      locale: typeof locale === "string" ? locale : undefined,
      group: typeof group === "string" ? group : undefined,
      search: typeof search === "string" ? search : undefined,
      limit: limit ? Number(limit) : 200,
      offset: offset ? Number(offset) : 0,
    });
    res.json(result);
  } catch (error: any) {
    console.error("Failed to fetch translations:", error);
    res.status(500).json({ error: error.message || "Failed to fetch translations" });
  }
});

// Get translation statistics & missing keys
adminRouter.get("/translations/stats", async (req, res) => {
  try {
    const stats = await translationService.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error("Failed to fetch translation stats:", error);
    res.status(500).json({ error: error.message || "Failed to fetch stats" });
  }
});

// Discover missing keys and full health report
adminRouter.get("/translations/missing", async (req, res) => {
  try {
    const report = await translationService.getMissingReport();
    res.json(report);
  } catch (error: any) {
    console.error("Failed to generate missing translation report:", error);
    res.status(500).json({ error: error.message || "Failed to analyze translation keys" });
  }
});

// Scan codebase and automatically import all missing keys across all locales
adminRouter.post("/translations/scan-import", async (req, res) => {
  try {
    const { force = false } = req.body;
    const result = await translationService.importFromHardcoded(force);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Failed to scan and import translation keys:", error);
    res.status(500).json({ error: error.message || "Failed to scan and import translations" });
  }
});

// Upsert a single translation
adminRouter.post("/translations", async (req, res) => {
  try {
    const { locale, key, value, group_name } = req.body;
    if (!locale || !key) {
      return res.status(400).json({ error: "Locale and key are required" });
    }

    const item = await translationService.upsert(locale, key, value, group_name);
    res.json({ success: true, item });
  } catch (error: any) {
    console.error("Failed to upsert translation:", error);
    res.status(500).json({ error: error.message || "Failed to save translation" });
  }
});

// Batch upsert multiple translations
adminRouter.post("/translations/batch", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required" });
    }

    const count = await translationService.batchUpsert(items);
    res.json({ success: true, count });
  } catch (error: any) {
    console.error("Failed to batch upsert translations:", error);
    res.status(500).json({ error: error.message || "Failed to batch save translations" });
  }
});

// Re-sync / migrate all translations from hardcoded files
adminRouter.post("/translations/migrate", async (req, res) => {
  try {
    const { force = true } = req.body;
    const result = await translationService.importFromHardcoded(force);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Failed to run translation migration:", error);
    res.status(500).json({ error: error.message || "Failed to run translation migration" });
  }
});

// Delete a specific translation (single locale)
adminRouter.delete("/translations/:locale/:key", async (req, res) => {
  try {
    const { locale, key } = req.params;
    await translationService.delete(locale, key);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete translation:", error);
    res.status(500).json({ error: error.message || "Failed to delete translation" });
  }
});

// Delete a key across all locales
adminRouter.delete("/translations/key/:key", async (req, res) => {
  try {
    const { key } = req.params;
    await translationService.deleteKeyAllLocales(key);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete key across locales:", error);
    res.status(500).json({ error: error.message || "Failed to delete key" });
  }
});

// ============================================================================
// SOCIAL LINKS TREE MANAGER ENDPOINTS
// ============================================================================

// Helper to build tree from flat list
function buildSocialTree(nodes: any[]): any[] {
  const nodeMap = new Map<string, any>();
  nodes.forEach(n => {
    nodeMap.set(n.id, { ...n, children: [] });
  });

  const roots: any[] = [];
  nodes.forEach(n => {
    const mapped = nodeMap.get(n.id);
    if (n.parent_id && nodeMap.has(n.parent_id)) {
      nodeMap.get(n.parent_id).children.push(mapped);
    } else {
      roots.push(mapped);
    }
  });
  return roots;
}

// 1. Get all social tree nodes (flat + child_count)
adminRouter.get("/social-links", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT s.*,
        (SELECT COUNT(*) FROM social_tree_nodes c WHERE c.parent_id = s.id) as child_count,
        (SELECT p.title FROM social_tree_nodes p WHERE p.id = s.parent_id) as parent_title
      FROM social_tree_nodes s
      ORDER BY s.sort_order ASC, s.created_at ASC
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Failed to fetch social tree nodes:", error);
    res.status(500).json({ error: error.message || "Failed to fetch social links" });
  }
});

// 2. Get full nested social tree
adminRouter.get("/social-links/tree", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT s.*,
        (SELECT COUNT(*) FROM social_tree_nodes c WHERE c.parent_id = s.id) as child_count
      FROM social_tree_nodes s
      ORDER BY s.sort_order ASC, s.created_at ASC
    `);
    const tree = buildSocialTree(result.rows as any[]);
    res.json(tree);
  } catch (error: any) {
    console.error("Failed to fetch social tree:", error);
    res.status(500).json({ error: error.message || "Failed to fetch social tree" });
  }
});

// 3. Create a new social node (group or link)
adminRouter.post("/social-links", async (req, res) => {
  try {
    const {
      parent_id = null,
      type = "link",
      title,
      subtitle = "",
      platform = "custom",
      url = "",
      icon = "",
      badge = "",
      color = "",
      is_enabled = 1,
      is_expanded_default = 1,
      sort_order
    } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ error: "Title is required" });
    }

    let finalUrl = url?.trim() || "";
    if (type === "link") {
      if (finalUrl) {
        const isSpecialScheme = /^(mailto:|tel:|wa\.me|t\.me|https?:\/\/|\/\/)/i.test(finalUrl);
        if (!isSpecialScheme && !finalUrl.includes(".")) {
          return res.status(400).json({ error: "Please enter a valid URL (e.g. https://instagram.com/user, mailto: or tel:)" });
        }
        if (!isSpecialScheme && (finalUrl.startsWith("www.") || finalUrl.includes("."))) {
          finalUrl = `https://${finalUrl}`;
        }
      }
    } else {
      finalUrl = "";
    }

    const id = crypto.randomUUID();

    // Determine default sort_order if not provided
    let finalSortOrder = typeof sort_order === "number" ? sort_order : 0;
    if (sort_order === undefined || sort_order === null) {
      const maxOrderResult = parent_id
        ? await db.execute({
            sql: "SELECT MAX(sort_order) as max_order FROM social_tree_nodes WHERE parent_id = ?",
            args: [parent_id]
          })
        : await db.execute({
            sql: "SELECT MAX(sort_order) as max_order FROM social_tree_nodes WHERE parent_id IS NULL"
          });
      finalSortOrder = (Number(maxOrderResult.rows[0]?.max_order) || 0) + 1;
    }

    await db.execute({
      sql: `INSERT INTO social_tree_nodes 
            (id, parent_id, type, title, subtitle, platform, url, icon, badge, color, is_enabled, is_expanded_default, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        parent_id || null,
        type === "group" ? "group" : "link",
        title.trim(),
        subtitle?.trim() || "",
        platform?.trim() || "custom",
        finalUrl,
        icon?.trim() || "",
        badge?.trim() || "",
        color?.trim() || "",
        is_enabled ? 1 : 0,
        is_expanded_default ? 1 : 0,
        finalSortOrder
      ]
    });

    const created = await db.execute({
      sql: "SELECT * FROM social_tree_nodes WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, item: created.rows[0] });
  } catch (error: any) {
    console.error("Failed to create social link node:", error);
    res.status(500).json({ error: error.message || "Failed to create social link node" });
  }
});

// 4. Update an existing social node
adminRouter.put("/social-links/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      parent_id,
      type,
      title,
      subtitle,
      platform,
      url,
      icon,
      badge,
      color,
      is_enabled,
      is_expanded_default,
      sort_order
    } = req.body;

    // Check if node exists
    const existing = await db.execute({
      sql: "SELECT * FROM social_tree_nodes WHERE id = ?",
      args: [id]
    });
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Social node not found" });
    }

    // Prevent circular parenting (a node cannot be its own parent)
    if (parent_id && parent_id === id) {
      return res.status(400).json({ error: "A node cannot be its own parent" });
    }

    if (title !== undefined && (!title || typeof title !== "string" || title.trim() === "")) {
      return res.status(400).json({ error: "Title cannot be empty" });
    }

    const current = existing.rows[0];
    const nodeType = type !== undefined ? type : current.type;

    let finalUrl = url !== undefined ? (url?.trim() || "") : current.url;
    if (nodeType === "link") {
      if (finalUrl) {
        const isSpecialScheme = /^(mailto:|tel:|wa\.me|t\.me|https?:\/\/|\/\/)/i.test(finalUrl);
        if (!isSpecialScheme && !finalUrl.includes(".")) {
          return res.status(400).json({ error: "Please enter a valid URL (e.g. https://instagram.com/user, mailto: or tel:)" });
        }
        if (!isSpecialScheme && (finalUrl.startsWith("www.") || finalUrl.includes("."))) {
          finalUrl = `https://${finalUrl}`;
        }
      }
    } else {
      finalUrl = "";
    }

    const updatedParentId = parent_id !== undefined ? (parent_id || null) : current.parent_id;
    const updatedType = nodeType;
    const updatedTitle = title !== undefined ? title.trim() : current.title;
    const updatedSubtitle = subtitle !== undefined ? (subtitle?.trim() || "") : current.subtitle;
    const updatedPlatform = platform !== undefined ? platform : current.platform;
    const updatedUrl = finalUrl;
    const updatedIcon = icon !== undefined ? (icon?.trim() || "") : current.icon;
    const updatedBadge = badge !== undefined ? (badge?.trim() || "") : current.badge;
    const updatedColor = color !== undefined ? (color?.trim() || "") : current.color;
    const updatedIsEnabled = is_enabled !== undefined ? (is_enabled ? 1 : 0) : current.is_enabled;
    const updatedIsExpanded = is_expanded_default !== undefined ? (is_expanded_default ? 1 : 0) : current.is_expanded_default;
    const updatedSortOrder = sort_order !== undefined ? Number(sort_order) : current.sort_order;

    await db.execute({
      sql: `UPDATE social_tree_nodes 
            SET parent_id = ?, type = ?, title = ?, subtitle = ?, platform = ?, 
                url = ?, icon = ?, badge = ?, color = ?, is_enabled = ?, 
                is_expanded_default = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        updatedParentId,
        updatedType,
        updatedTitle,
        updatedSubtitle,
        updatedPlatform,
        updatedUrl,
        updatedIcon,
        updatedBadge,
        updatedColor,
        updatedIsEnabled,
        updatedIsExpanded,
        updatedSortOrder,
        id
      ]
    });

    const updated = await db.execute({
      sql: "SELECT * FROM social_tree_nodes WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, item: updated.rows[0] });
  } catch (error: any) {
    console.error("Failed to update social link node:", error);
    res.status(500).json({ error: error.message || "Failed to update social link node" });
  }
});

// 5. Toggle active status
adminRouter.patch("/social-links/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.execute({
      sql: "SELECT is_enabled FROM social_tree_nodes WHERE id = ?",
      args: [id]
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Node not found" });
    }

    const currentStatus = Number(existing.rows[0].is_enabled);
    const newStatus = currentStatus === 1 ? 0 : 1;

    await db.execute({
      sql: "UPDATE social_tree_nodes SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [newStatus, id]
    });

    res.json({ success: true, is_enabled: newStatus });
  } catch (error: any) {
    console.error("Failed to toggle status:", error);
    res.status(500).json({ error: error.message || "Failed to toggle status" });
  }
});

// 6. Reorder nodes or move across parents
adminRouter.post("/social-links/reorder", async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, sort_order, parent_id? }
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items array is required" });
    }

    for (const item of items) {
      if (item.id && typeof item.sort_order === "number") {
        if (item.parent_id !== undefined) {
          await db.execute({
            sql: "UPDATE social_tree_nodes SET sort_order = ?, parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            args: [item.sort_order, item.parent_id || null, item.id]
          });
        } else {
          await db.execute({
            sql: "UPDATE social_tree_nodes SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            args: [item.sort_order, item.id]
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to reorder social links:", error);
    res.status(500).json({ error: error.message || "Failed to reorder social links" });
  }
});

// 7. Delete node (and handle children by cascading or moving to root)
adminRouter.delete("/social-links/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteChildren = true } = req.query;

    if (deleteChildren === "true" || deleteChildren === true) {
      // Delete child links recursively
      await db.execute({
        sql: "DELETE FROM social_tree_nodes WHERE parent_id = ?",
        args: [id]
      });
    } else {
      // Move children to root
      await db.execute({
        sql: "UPDATE social_tree_nodes SET parent_id = NULL WHERE parent_id = ?",
        args: [id]
      });
    }

    await db.execute({
      sql: "DELETE FROM social_tree_nodes WHERE id = ?",
      args: [id]
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete social link node:", error);
    res.status(500).json({ error: error.message || "Failed to delete social link node" });
  }
});

// 8. Reset to default preset tree
adminRouter.post("/social-links/reset-defaults", async (req, res) => {
  try {
    await db.execute("DELETE FROM social_tree_nodes");

    const defaultSocialNodes = [
      {
        id: "group-main-socials",
        parent_id: null,
        type: "group",
        title: "Main Socials",
        subtitle: "Official social media channels",
        platform: "custom",
        url: "",
        icon: "share-2",
        badge: "Active",
        color: "#3b82f6",
        is_enabled: 1,
        is_expanded_default: 1,
        sort_order: 1
      },
      {
        id: "link-instagram",
        parent_id: "group-main-socials",
        type: "link",
        title: "Instagram",
        subtitle: "@spsstudio · Daily Shoots & Stories",
        platform: "instagram",
        url: "https://instagram.com/spsstudio",
        icon: "instagram",
        badge: "Daily",
        color: "#E4405F",
        is_enabled: 1,
        is_expanded_default: 1,
        sort_order: 1
      },
      {
        id: "link-facebook",
        parent_id: "group-main-socials",
        type: "link",
        title: "Facebook",
        subtitle: "SPS Real Estate Studio Community",
        platform: "facebook",
        url: "https://facebook.com/spsstudio",
        icon: "facebook",
        badge: "",
        color: "#1877F2",
        is_enabled: 1,
        is_expanded_default: 1,
        sort_order: 2
      },
      {
        id: "link-youtube",
        parent_id: "group-main-socials",
        type: "link",
        title: "YouTube",
        subtitle: "4K Cinematic Property Tours & Walkthroughs",
        platform: "youtube",
        url: "https://youtube.com/@spsstudio",
        icon: "youtube",
        badge: "4K Video",
        color: "#FF0000",
        is_enabled: 1,
        is_expanded_default: 1,
        sort_order: 3
      },
      {
        id: "link-tiktok",
        parent_id: "group-main-socials",
        type: "link",
        title: "TikTok",
        subtitle: "Short-form luxury architecture teasers",
        platform: "tiktok",
        url: "https://tiktok.com/@spsstudio",
        icon: "video",
        badge: "Trending",
        color: "#000000",
        is_enabled: 1,
        is_expanded_default: 1,
        sort_order: 4
      },
      {
        id: "group-pro-portfolios",
        parent_id: null,
        type: "group",
        title: "Professional & Portfolios",
        subtitle: "Commercial networks & showcase galleries",
        platform: "custom",
        url: "",
        icon: "briefcase",
        badge: "B2B",
        color: "#0A66C2",
        is_enabled: 1,
        is_expanded_default: 1,
        sort_order: 2
      },
      {
        id: "link-linkedin",
        parent_id: "group-pro-portfolios",
        type: "link",
        title: "LinkedIn",
        subtitle: "Commercial Partnerships & Agency Relations",
        platform: "linkedin",
        url: "https://linkedin.com/company/spsstudio",
        icon: "linkedin",
        badge: "Network",
        color: "#0A66C2",
        is_enabled: 1,
        is_expanded_default: 1,
        sort_order: 1
      },
      {
        id: "link-vimeo",
        parent_id: "group-pro-portfolios",
        type: "link",
        title: "Vimeo Showcase",
        subtitle: "High-Bitrate Uncompressed HDR Master Video",
        platform: "vimeo",
        url: "https://vimeo.com/spsstudio",
        icon: "video",
        badge: "HDR",
        color: "#1AB7EA",
        is_enabled: 1,
        is_expanded_default: 1,
        sort_order: 2
      },
      {
        id: "link-pinterest",
        parent_id: "group-pro-portfolios",
        type: "link",
        title: "Pinterest Moodboards",
        subtitle: "Interior Styling & Architectural Inspo",
        platform: "pinterest",
        url: "https://pinterest.com/spsstudio",
        icon: "image",
        badge: "",
        color: "#E60023",
        is_enabled: 1,
        is_expanded_default: 1,
        sort_order: 3
      },
      {
        id: "group-direct-chat",
        parent_id: null,
        type: "group",
        title: "Direct Messengers",
        subtitle: "Fast response direct messaging channels",
        platform: "custom",
        url: "",
        icon: "message-circle",
        badge: "Instant",
        color: "#25D366",
        is_enabled: 1,
        is_expanded_default: 1,
        sort_order: 3
      },
      {
        id: "link-whatsapp",
        parent_id: "group-direct-chat",
        type: "link",
        title: "WhatsApp Business",
        subtitle: "Quick Shoot Booking & Instant Estimates",
        platform: "whatsapp",
        url: "https://wa.me/36301234567",
        icon: "message-square",
        badge: "Fast Reply",
        color: "#25D366",
        is_enabled: 1,
        is_expanded_default: 1,
        sort_order: 1
      },
      {
        id: "link-telegram",
        parent_id: "group-direct-chat",
        type: "link",
        title: "Telegram Channel",
        subtitle: "Announcements, Drop Offs & Backstage",
        platform: "telegram",
        url: "https://t.me/spsstudio",
        icon: "send",
        badge: "",
        color: "#229ED9",
        is_enabled: 1,
        is_expanded_default: 1,
        sort_order: 2
      }
    ];

    for (const node of defaultSocialNodes) {
      await db.execute({
        sql: `INSERT INTO social_tree_nodes 
              (id, parent_id, type, title, subtitle, platform, url, icon, badge, color, is_enabled, is_expanded_default, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          node.id,
          node.parent_id,
          node.type,
          node.title,
          node.subtitle,
          node.platform,
          node.url,
          node.icon,
          node.badge,
          node.color,
          node.is_enabled,
          node.is_expanded_default,
          node.sort_order
        ]
      });
    }

    res.json({ success: true, count: defaultSocialNodes.length });
  } catch (error: any) {
    console.error("Failed to reset social link defaults:", error);
    res.status(500).json({ error: error.message || "Failed to reset defaults" });
  }
});

// ==========================================
// RESEND EMAIL INTEGRATION & TEMPLATE ENDPOINTS
// ==========================================

// Get current email service status & configuration
adminRouter.get("/email/config", async (req, res) => {
  try {
    const config = await getEmailSenderConfig();
    const apiKey = process.env.RESEND_API_KEY;
    const apiKeyPresent = Boolean(apiKey && apiKey.trim().length > 0);

    // Mask API key preview if present (e.g. re_123***)
    const maskedKey = apiKeyPresent && apiKey 
      ? `${apiKey.slice(0, 5)}••••••••${apiKey.slice(-4)}`
      : null;

    res.json({
      apiKeyPresent,
      maskedKey,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      replyToEmail: config.replyToEmail,
      adminNotificationEmail: config.adminNotificationEmail,
      footerText: config.footerText,
      studioName: config.studioName,
      isDefaultDomain: config.fromEmail.includes("resend.dev")
    });
  } catch (error: any) {
    console.error("Failed to get email config:", error);
    res.status(500).json({ error: "Failed to load email service configuration" });
  }
});

// List all system & customized email templates
adminRouter.get("/email/templates", async (req, res) => {
  try {
    const templates = await getAllEmailTemplates();
    res.json(templates);
  } catch (error: any) {
    console.error("Failed to get email templates:", error);
    res.status(500).json({ error: "Failed to fetch email templates" });
  }
});

const MARKETING_TOKENS = [
  { token: "{{recipient_name}}", label: "Recipient name", description: "Name used in the greeting", example: "Alex" },
  { token: "{{headline}}", label: "Headline", description: "Campaign headline", example: "A new story is waiting" },
  { token: "{{message}}", label: "Message", description: "Main campaign message", example: "Discover our latest work." },
  { token: "{{action_url}}", label: "Button URL", description: "Destination of the call-to-action", example: "https://spsstudio.com" },
  { token: "{{action_text}}", label: "Button text", description: "Call-to-action label", example: "View now" },
  { token: "{{studio_name}}", label: "Studio name", description: "Configured studio name", example: "SPS Studio" }
];
const MARKETING_SAMPLE = { recipient_name: "Alex", headline: "A new visual story is waiting", message: "We would love to share our latest work and studio news with you.", action_url: "https://spsstudio.com", action_text: "Explore the update", studio_name: "SPS Studio" };
const requireMarketingWrite = (req: any, res: any, next: any) => req.user?.role === "viewer" ? res.status(403).json({ error: "View-only accounts cannot change or send marketing emails." }) : next();

adminRouter.post("/email/templates/marketing", requireMarketingWrite, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Template name is required." });
    const id = crypto.randomUUID();
    const key = `marketing_${id.replace(/-/g, "")}`;
    const subject = String(req.body.subject || "A visual update from {{studio_name}}").trim();
    const bodyHtml = sanitizeEmailHtml(String(req.body.body_html || `<h1 style="font-size:28px;color:#0f172a;margin:0 0 18px">{{headline}}</h1><p style="font-size:16px;line-height:1.7;color:#334155">Hello {{recipient_name}},</p><p style="font-size:16px;line-height:1.7;color:#334155">{{message}}</p><p style="margin:28px 0"><a href="{{action_url}}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:700">{{action_text}}</a></p>`));
    const bodyText = String(req.body.body_text || "{{headline}}\n\nHello {{recipient_name}},\n\n{{message}}\n\n{{action_text}}: {{action_url}}").trim();
    const now = new Date().toISOString();
    await db.execute({ sql: `INSERT INTO email_templates (id, template_key, name, category, description, subject, body_html, body_text, available_tokens, sample_data, version, is_customized, last_updated_at, updated_by) VALUES (?, ?, ?, 'marketing', ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`, args: [id, key, name, String(req.body.description || "Manual marketing campaign"), subject, bodyHtml, bodyText, JSON.stringify(MARKETING_TOKENS), JSON.stringify(MARKETING_SAMPLE), now, (req as any).user?.email || "admin"] });
    res.status(201).json({ success: true, template: await getEmailTemplateByKey(key) });
  } catch (error: any) { res.status(500).json({ error: error.message || "Failed to create marketing template" }); }
});

adminRouter.put("/email/templates/marketing/:key/metadata", requireMarketingWrite, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Template name is required." });
    const result = await db.execute({ sql: "UPDATE email_templates SET name = ?, description = ?, last_updated_at = ?, updated_by = ? WHERE template_key = ? AND category = 'marketing'", args: [name, String(req.body.description || ""), new Date().toISOString(), (req as any).user?.email || "admin", req.params.key] });
    if (!result.rowsAffected) return res.status(404).json({ error: "Marketing template not found." });
    res.json({ success: true, template: await getEmailTemplateByKey(req.params.key) });
  } catch (error: any) { res.status(500).json({ error: error.message || "Failed to rename template" }); }
});

adminRouter.delete("/email/templates/marketing/:key", requireMarketingWrite, async (req, res) => {
  try {
    const result = await db.execute({ sql: "DELETE FROM email_templates WHERE template_key = ? AND category = 'marketing'", args: [req.params.key] });
    if (!result.rowsAffected) return res.status(404).json({ error: "Marketing template not found." });
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message || "Failed to delete template" }); }
});

adminRouter.post("/email/templates/marketing/:key/send", requireMarketingWrite, async (req, res) => {
  try {
    const recipient = String(req.body.recipient || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return res.status(400).json({ error: "A valid recipient email address is required." });
    const template = await getEmailTemplateByKey(req.params.key);
    if (!template || template.category !== "marketing") return res.status(404).json({ error: "Marketing template not found." });
    const config = await getEmailSenderConfig();
    const tokens = { ...template.sample_data, recipient_name: recipient.split("@")[0], ...(req.body.tokens || {}) };
    const subject = interpolateTemplateTokens(template.subject, tokens, config);
    const html = wrapInEmailLayout(interpolateTemplateTokens(template.body_html, tokens, config), template.name, config);
    const text = interpolateTemplateTokens(template.body_text, tokens, config);
    const result = await sendTransactionalEmail({ to: recipient, subject, templateId: template.template_key, customHtml: html, customText: text, templateData: tokens });
    if (!result.success) return res.status(400).json({ error: result.error || "Email dispatch failed.", status: result.status });
    res.json({ success: true, messageId: result.messageId, simulated: result.simulated, notice: result.simulated ? result.error : "Marketing email sent successfully." });
  } catch (error: any) { res.status(500).json({ error: error.message || "Failed to send marketing email" }); }
});

// Get a single email template by key
adminRouter.get("/email/templates/:key", async (req, res) => {
  try {
    const template = await getEmailTemplateByKey(req.params.key);
    if (!template) {
      return res.status(404).json({ error: `Email template '${req.params.key}' not found.` });
    }
    res.json(template);
  } catch (error: any) {
    console.error("Failed to fetch email template:", error);
    res.status(500).json({ error: error.message || "Failed to load email template" });
  }
});

// Save customized email template
adminRouter.put("/email/templates/:key", async (req, res) => {
  try {
    const { subject, body_html, body_text } = req.body;
    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({ error: "A template subject line is required." });
    }
    if (!body_html || typeof body_html !== "string" || !body_html.trim()) {
      return res.status(400).json({ error: "Template HTML body content is required." });
    }

    const updated = await saveCustomEmailTemplate(req.params.key, {
      subject,
      body_html,
      body_text: body_text || "",
      updated_by: (req as any).user?.email || "admin"
    });

    res.json({
      success: true,
      message: `Template '${updated.name}' successfully updated.`,
      template: updated
    });
  } catch (error: any) {
    console.error("Failed to save email template:", error);
    res.status(500).json({ error: error.message || "Failed to save email template" });
  }
});

// Reset template back to code default
adminRouter.post("/email/templates/:key/reset", async (req, res) => {
  try {
    const restored = await resetEmailTemplateToDefault(req.params.key);
    res.json({
      success: true,
      message: `Template '${restored.name}' reset to factory default.`,
      template: restored
    });
  } catch (error: any) {
    console.error("Failed to reset email template:", error);
    res.status(500).json({ error: error.message || "Failed to reset email template" });
  }
});

// Live Preview of email template (supports live drafting or saved key)
adminRouter.post("/email/templates/preview", async (req, res) => {
  try {
    const { 
      templateKey = "test_email", 
      subject, 
      bodyHtml, 
      bodyText, 
      sampleData = {} 
    } = req.body;

    const config = await getEmailSenderConfig();
    const template = await getEmailTemplateByKey(templateKey);

    const activeSubjectTemplate = subject || template?.subject || "{{studio_name}}";
    const activeHtmlTemplate = bodyHtml || template?.body_html || "<p>Hello World</p>";
    const activeTextTemplate = bodyText || template?.body_text || "Hello World";
    const title = template?.name || "Email Preview";

    // Merge provided sample data with template default sample data
    const mergedTokens = {
      ...(template?.sample_data || {}),
      ...sampleData
    };

    const renderedSubject = interpolateTemplateTokens(activeSubjectTemplate, mergedTokens, config);
    const renderedInnerHtml = interpolateTemplateTokens(activeHtmlTemplate, mergedTokens, config);
    const renderedText = interpolateTemplateTokens(activeTextTemplate, mergedTokens, config);

    const fullHtml = wrapInEmailLayout(renderedInnerHtml, title, config);

    res.json({
      html: fullHtml,
      text: renderedText,
      subject: renderedSubject,
      title
    });
  } catch (error: any) {
    console.error("Failed to generate template preview:", error);
    res.status(500).json({ error: "Failed to render template preview" });
  }
});

// Send test email from editor or catalog
adminRouter.post("/email/templates/send-test", async (req, res) => {
  try {
    const { 
      recipient, 
      templateKey = "test_email", 
      subject, 
      bodyHtml, 
      bodyText, 
      sampleData = {} 
    } = req.body;

    if (!recipient || typeof recipient !== "string" || !recipient.includes("@")) {
      return res.status(400).json({ error: "A valid recipient email address is required." });
    }

    const config = await getEmailSenderConfig();
    const template = await getEmailTemplateByKey(templateKey);

    const activeSubjectTemplate = subject || template?.subject || `[Test] ${template?.name || "Email"}`;
    const activeHtmlTemplate = bodyHtml || template?.body_html || "<p>Hello World</p>";
    const activeTextTemplate = bodyText || template?.body_text || "Hello World";
    const title = template?.name || "System Test Email";

    const mergedTokens = {
      ...(template?.sample_data || {}),
      recipient_name: recipient.split("@")[0],
      ...sampleData
    };

    const renderedSubject = interpolateTemplateTokens(activeSubjectTemplate, mergedTokens, config);
    const renderedInnerHtml = interpolateTemplateTokens(activeHtmlTemplate, mergedTokens, config);
    const renderedText = interpolateTemplateTokens(activeTextTemplate, mergedTokens, config);
    const fullHtml = wrapInEmailLayout(renderedInnerHtml, title, config);

    const result = await sendTransactionalEmail({
      to: recipient.trim(),
      subject: renderedSubject,
      templateId: templateKey,
      customHtml: fullHtml,
      customText: renderedText,
      templateData: mergedTokens
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || "Failed to send test email through Resend.",
        status: result.status
      });
    }

    res.json({
      success: true,
      messageId: result.messageId,
      status: result.status,
      simulated: result.simulated,
      notice: result.simulated ? result.error : "Test email successfully dispatched via Resend."
    });
  } catch (error: any) {
    console.error("Failed to send test template email:", error);
    res.status(500).json({ error: error.message || "Failed to send test email" });
  }
});

// Legacy send test email endpoint
adminRouter.post("/email/send-test", async (req, res) => {
  try {
    const { recipient, templateId = "test_email", customSubject } = req.body;

    if (!recipient || typeof recipient !== "string" || !recipient.includes("@")) {
      return res.status(400).json({ error: "A valid recipient email address is required." });
    }

    const config = await getEmailSenderConfig();
    const appOrigin = `${req.protocol}://${req.get("host")}`;

    const sampleData: EmailTemplateData = {
      recipientName: "Studio Admin",
      studioName: config.studioName,
      actionUrl: `${appOrigin}/admin/settings`,
      actionText: "Verify in Admin Dashboard",
      projectName: "Penthouse at Grand Avenue (Sample)",
      projectStatus: "HDR Color Grading Completed",
      additionalNotes: "52 high-resolution photos and 1 uncompressed 4K video reel are ready for client download.",
      inquiryDetails: {
        name: "Alexandra Vance",
        email: recipient,
        phone: "+1 (555) 234-8901",
        property_address: "742 Evergreen Terrace, Springfield",
        subject: "Luxury Architectural Shoot Request",
        message: "Hello! We are looking to book a twilight HDR session with drone aerials for an upcoming luxury listing next Wednesday."
      }
    };

    const result = await sendTransactionalEmail({
      to: recipient.trim(),
      subject: customSubject || undefined,
      templateId: templateId as any,
      templateData: sampleData
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || "Failed to send test email through Resend.",
        status: result.status
      });
    }

    res.json({
      success: true,
      messageId: result.messageId,
      status: result.status,
      simulated: result.simulated,
      notice: result.simulated ? result.error : "Email successfully dispatched via Resend."
    });
  } catch (error: any) {
    console.error("Failed to execute test email:", error);
    res.status(500).json({ error: error.message || "Failed to send test email" });
  }
});

// Legacy live preview email template HTML
adminRouter.post("/email/preview", async (req, res) => {
  try {
    const { templateId = "test_email", customData } = req.body;
    const config = await getEmailSenderConfig();
    const appOrigin = `${req.protocol}://${req.get("host")}`;

    const sampleData: EmailTemplateData = {
      recipientName: "Valued Client",
      studioName: config.studioName,
      actionUrl: `${appOrigin}/admin/settings`,
      actionText: "Review in Dashboard",
      projectName: "Penthouse at Grand Avenue",
      projectStatus: "Ready for Client Review",
      additionalNotes: "All aerial drone shots and twilight stills have been processed.",
      inquiryDetails: {
        name: "Marcus Aurelius",
        email: "marcus@example.com",
        phone: "+1 (555) 987-6543",
        property_address: "108 Ocean Boulevard",
        subject: "Full Property Marketing Package",
        message: "We need full HDR photography and a 60-second social video tour by next Friday."
      },
      ...(customData || {})
    };

    const generated = generateEmailHtml(templateId as any, sampleData, config);
    res.json({
      html: generated.html,
      text: generated.text,
      defaultSubject: generated.defaultSubject
    });
  } catch (error: any) {
    console.error("Failed to generate preview:", error);
    res.status(500).json({ error: "Failed to render email preview" });
  }
});

// Get email logs
adminRouter.get("/email/logs", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const result = await db.execute({
      sql: `SELECT * FROM email_logs ORDER BY created_at DESC LIMIT ?`,
      args: [limit]
    });
    res.json(result.rows);
  } catch (error: any) {
    console.error("Failed to fetch email logs:", error);
    res.status(500).json({ error: "Failed to fetch email logs" });
  }
});

// Clear email logs
adminRouter.delete("/email/logs", async (req, res) => {
  try {
    await db.execute("DELETE FROM email_logs");
    res.json({ success: true, message: "Email logs cleared successfully" });
  } catch (error: any) {
    console.error("Failed to clear email logs:", error);
    res.status(500).json({ error: "Failed to clear email logs" });
  }
});

// ==========================================
// Team Members & Admin Invitations Endpoints
// ==========================================

adminRouter.get("/teams", async (_req, res) => {
  try {
    const result = await db.execute(`SELECT t.*, COUNT(u.id) AS member_count FROM teams t LEFT JOIN users u ON u.team_id = t.id GROUP BY t.id ORDER BY t.name ASC`);
    res.json(result.rows);
  } catch (error: any) { res.status(500).json({ error: error.message || "Failed to fetch teams" }); }
});

adminRouter.post("/teams", async (req, res) => {
  try {
    const { name, description = "", color = "#3B82F6" } = req.body;
    if (!String(name || "").trim()) return res.status(400).json({ error: "Team name is required" });
    const id = crypto.randomUUID();
    await db.execute({ sql: "INSERT INTO teams (id, name, description, color) VALUES (?, ?, ?, ?)", args: [id, String(name).trim(), String(description).trim(), String(color)] });
    const created = await db.execute({ sql: "SELECT *, 0 AS member_count FROM teams WHERE id = ?", args: [id] });
    res.json({ team: created.rows[0] });
  } catch (error: any) { res.status(error.message?.includes("UNIQUE") ? 409 : 500).json({ error: error.message?.includes("UNIQUE") ? "A team with this name already exists" : error.message }); }
});

adminRouter.put("/teams/:id", async (req, res) => {
  try {
    const existing = await db.execute({ sql: "SELECT * FROM teams WHERE id = ?", args: [req.params.id] });
    if (!existing.rows.length) return res.status(404).json({ error: "Team not found" });
    const { name, description, color, is_active } = req.body;
    const nextName = String(name ?? existing.rows[0].name).trim();
    await db.execute({ sql: "UPDATE teams SET name = ?, description = ?, color = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [nextName, description ?? existing.rows[0].description, color ?? existing.rows[0].color, is_active === false || is_active === 0 ? 0 : 1, req.params.id] });
    await db.execute({ sql: "UPDATE users SET workspace = ? WHERE team_id = ?", args: [nextName, req.params.id] });
    await db.execute({ sql: "UPDATE invitations SET workspace = ? WHERE team_id = ? AND status = 'pending'", args: [nextName, req.params.id] });
    const updated = await db.execute({ sql: "SELECT * FROM teams WHERE id = ?", args: [req.params.id] });
    res.json({ team: updated.rows[0] });
  } catch (error: any) { res.status(500).json({ error: error.message || "Failed to update team" }); }
});

adminRouter.delete("/teams/:id", async (req, res) => {
  try {
    const count = await db.execute({ sql: "SELECT COUNT(*) AS count FROM users WHERE team_id = ?", args: [req.params.id] });
    if (Number(count.rows[0]?.count || 0) > 0) return res.status(409).json({ error: "Move all members out of this team before deleting it" });
    await db.execute({ sql: "UPDATE invitations SET team_id = NULL WHERE team_id = ?", args: [req.params.id] });
    await db.execute({ sql: "DELETE FROM teams WHERE id = ?", args: [req.params.id] });
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message || "Failed to delete team" }); }
});

// Get Team Members (Admin, Editor, Viewer)
adminRouter.get("/team", async (req: any, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.phone, 
        u.role, 
        u.workspace,
        u.team_id,
        t.name AS team_name,
        u.is_active, 
        u.last_login_at, 
        u.created_at, 
        u.updated_at 
      FROM users u
      LEFT JOIN teams t ON t.id = u.team_id
      WHERE u.role IN ('superadmin', 'admin', 'editor', 'viewer')
      ORDER BY 
        CASE u.role 
          WHEN 'superadmin' THEN 1
          WHEN 'admin' THEN 2 
          WHEN 'editor' THEN 3 
          WHEN 'viewer' THEN 4 
          ELSE 5 
        END,
        u.name ASC, 
        u.email ASC
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error("Failed to fetch team members:", error);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
});

// Update Team Member
adminRouter.put("/team/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, workspace, team_id, is_active } = req.body;

    const existingRes = await db.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [id]
    });

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: "Team member not found" });
    }

    const existingUser: any = existingRes.rows[0];

    // If changing role away from admin/superadmin or deactivating, ensure at least one other active admin remains
    if ((existingUser.role === "admin" || existingUser.role === "superadmin") && (role !== "admin" && role !== "superadmin" || is_active === 0 || is_active === false)) {
      const activeAdminsRes = await db.execute(`
        SELECT COUNT(*) as count FROM users 
        WHERE role IN ('admin', 'superadmin') AND is_active = 1 AND id != ?
      `, [id]);
      const remainingAdmins = Number(activeAdminsRes.rows[0]?.count || 0);
      if (remainingAdmins === 0) {
        return res.status(400).json({ 
          error: "Cannot demote or deactivate the last remaining active Administrator account." 
        });
      }
    }

    const validRoles = ["superadmin", "admin", "editor", "viewer"];
    const targetRole = validRoles.includes(role) ? role : existingUser.role;
    const targetActive = is_active !== undefined ? (is_active ? 1 : 0) : existingUser.is_active;

    let targetTeamId = team_id !== undefined ? (team_id || null) : existingUser.team_id;
    let targetWorkspace = workspace !== undefined ? workspace : existingUser.workspace;
    if (targetTeamId) {
      const team = await db.execute({ sql: "SELECT name FROM teams WHERE id = ? AND is_active = 1", args: [targetTeamId] });
      if (!team.rows.length) return res.status(400).json({ error: "Selected team does not exist or is inactive" });
      targetWorkspace = team.rows[0].name;
    }
    await db.execute({
      sql: `UPDATE users 
            SET name = ?, phone = ?, role = ?, workspace = ?, team_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [
        name !== undefined ? name : existingUser.name,
        phone !== undefined ? phone : existingUser.phone,
        targetRole,
        targetWorkspace,
        targetTeamId,
        targetActive,
        id
      ]
    });

    const updatedRes = await db.execute({
      sql: "SELECT id, email, name, phone, role, workspace, team_id, is_active, last_login_at, created_at, updated_at FROM users WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, user: updatedRes.rows[0] });
  } catch (error: any) {
    console.error("Failed to update team member:", error);
    res.status(500).json({ error: error.message || "Failed to update team member" });
  }
});

// Delete Team Member
adminRouter.delete("/team/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const currentAdminId = req.user?.id;

    if (id === currentAdminId) {
      return res.status(400).json({ error: "You cannot delete your own account while logged in." });
    }

    const existingRes = await db.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [id]
    });

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingUser: any = existingRes.rows[0];

    // If deleting an admin, ensure another active admin remains
    if (existingUser.role === "admin") {
      const activeAdminsRes = await db.execute(`
        SELECT COUNT(*) as count FROM users 
        WHERE role = 'admin' AND is_active = 1 AND id != ?
      `, [id]);
      const remainingAdmins = Number(activeAdminsRes.rows[0]?.count || 0);
      if (remainingAdmins === 0) {
        return res.status(400).json({ 
          error: "Cannot delete the last remaining active Administrator account." 
        });
      }
    }

    await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, message: "Team member deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete team member:", error);
    res.status(500).json({ error: "Failed to delete team member" });
  }
});

// Get Invitations (with auto-expiration check and search/status filters)
adminRouter.get("/invitations", async (req: any, res) => {
  try {
    const { search, status, role } = req.query;

    // Auto-update expired pending invitations
    try {
      await db.execute(`
        UPDATE invitations 
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
        WHERE status = 'pending' AND datetime(expires_at) < datetime('now')
      `);
    } catch (e) {
      console.warn("Error updating expired invitations:", e);
    }

    let query = "SELECT * FROM invitations WHERE 1=1";
    const args: any[] = [];

    if (status && status !== "all") {
      query += " AND status = ?";
      args.push(status);
    }

    if (role && role !== "all") {
      query += " AND role = ?";
      args.push(role);
    }

    if (search && typeof search === "string" && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      query += " AND (LOWER(email) LIKE ? OR LOWER(name) LIKE ? OR LOWER(workspace) LIKE ?)";
      args.push(s, s, s);
    }

    query += " ORDER BY created_at DESC";

    const result = await db.execute({
      sql: query,
      args
    });

    // Decorate invitation rows with full accept_url for admin reference / manual link copy
    const appOrigin = `${req.protocol}://${req.get("host")}`;
    const formatted = result.rows.map((row: any) => ({
      ...row,
      accept_link: `${appOrigin}/invite/accept?token=${row.token}`,
      is_expired: new Date(row.expires_at).getTime() < Date.now()
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error("Failed to fetch invitations:", error);
    res.status(500).json({ error: "Failed to fetch invitations" });
  }
});

// Create and Send Invitation
adminRouter.post("/invitations", async (req: any, res) => {
  try {
    const { email, name, role = "editor", workspace = "Main Studio", team_id = null, custom_message = "", send_email = true } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === "string") ? name.trim() : "";
    let cleanWorkspace = (workspace && typeof workspace === "string") ? workspace.trim() : "Main Studio";
    let cleanTeamId: string | null = team_id ? String(team_id) : null;
    if (cleanTeamId) {
      const team = await db.execute({ sql: "SELECT name FROM teams WHERE id = ? AND is_active = 1", args: [cleanTeamId] });
      if (!team.rows.length) return res.status(400).json({ error: "Selected team does not exist or is inactive" });
      cleanWorkspace = String(team.rows[0].name);
    }
    const cleanMessage = (custom_message && typeof custom_message === "string") ? custom_message.trim() : "";

    const validRoles = ["admin", "editor", "viewer"];
    const targetRole = validRoles.includes(role) ? role : "editor";

    // Check if user already exists with this email and is active
    const existingUserRes = await db.execute({
      sql: "SELECT id, role, is_active FROM users WHERE LOWER(TRIM(email)) = ?",
      args: [cleanEmail]
    });

    if (existingUserRes.rows.length > 0 && existingUserRes.rows[0].is_active) {
      return res.status(409).json({ error: "This email already belongs to an active team member. Edit the existing member to change their role or team." });
    }

    // Revoke any existing pending invitations for this email
    try {
      await db.execute({
        sql: "UPDATE invitations SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP WHERE LOWER(TRIM(email)) = ? AND status = 'pending'",
        args: [cleanEmail]
      });
    } catch {}

    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString("hex");
    const ttlDays = 7; // 7-day expiration
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    const inviterId = req.user?.id || null;
    const inviterEmail = req.user?.email || "admin@spsstudio.com";
    const inviterName = req.user?.name || (inviterEmail ? inviterEmail.split("@")[0] : "Studio Administrator");

    await db.execute({
      sql: `INSERT INTO invitations (
        id, email, name, role, workspace, team_id, custom_message, token, inviter_id, inviter_email, status, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        id,
        cleanEmail,
        cleanName,
        targetRole,
        cleanWorkspace,
        cleanTeamId,
        cleanMessage,
        token,
        inviterId,
        inviterEmail,
        expiresAt
      ]
    });

    const appOrigin = `${req.protocol}://${req.get("host")}`;
    const acceptLink = `${appOrigin}/invite/accept?token=${token}`;

    let emailResult = null;
    if (send_email !== false) {
      emailResult = await sendAdminInvitationEmail(
        {
          email: cleanEmail,
          name: cleanName,
          role: targetRole,
          workspace: cleanWorkspace,
          custom_message: cleanMessage,
          inviter_name: inviterName,
          inviter_email: inviterEmail
        },
        appOrigin,
        {
          token,
          expiresInDays: ttlDays
        }
      );
    }

    res.json({
      success: true,
      invitation: {
        id,
        email: cleanEmail,
        name: cleanName,
        role: targetRole,
        workspace: cleanWorkspace,
        team_id: cleanTeamId,
        custom_message: cleanMessage,
        token,
        status: "pending",
        expires_at: expiresAt,
        accept_link: acceptLink
      },
      emailResult,
      message: `Invitation generated successfully for ${cleanEmail}.${send_email !== false ? " Invitation email dispatched." : ""}`
    });
  } catch (error: any) {
    console.error("Failed to create invitation:", error);
    res.status(500).json({ error: error.message || "Failed to create and dispatch invitation" });
  }
});

// Resend / Reissue Invitation Email
adminRouter.post("/invitations/:id/resend", async (req: any, res) => {
  try {
    const { id } = req.params;

    const inviteRes = await db.execute({
      sql: "SELECT * FROM invitations WHERE id = ?",
      args: [id]
    });

    if (inviteRes.rows.length === 0) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    const inv: any = inviteRes.rows[0];

    // Generate fresh token and extend expiration by 7 days
    const newToken = crypto.randomBytes(32).toString("hex");
    const ttlDays = 7;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    await db.execute({
      sql: `UPDATE invitations 
            SET token = ?, 
                status = 'pending', 
                expires_at = ?, 
                revoked_at = NULL, 
                used_at = NULL, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [newToken, expiresAt, id]
    });

    const appOrigin = `${req.protocol}://${req.get("host")}`;
    const inviterEmail = req.user?.email || inv.inviter_email || "admin@spsstudio.com";
    const inviterName = req.user?.name || (inviterEmail ? inviterEmail.split("@")[0] : "Studio Administrator");

    const emailResult = await sendAdminInvitationEmail(
      {
        email: inv.email,
        name: inv.name,
        role: inv.role,
        workspace: inv.workspace,
        custom_message: inv.custom_message,
        inviter_name: inviterName,
        inviter_email: inviterEmail
      },
      appOrigin,
      {
        token: newToken,
        expiresInDays: ttlDays
      }
    );

    res.json({
      success: true,
      invitation: {
        ...inv,
        token: newToken,
        status: "pending",
        expires_at: expiresAt,
        accept_link: `${appOrigin}/invite/accept?token=${newToken}`
      },
      emailResult,
      message: `New invitation token reissued and emailed to ${inv.email}.`
    });
  } catch (error: any) {
    console.error("Failed to resend invitation:", error);
    res.status(500).json({ error: "Failed to resend invitation" });
  }
});

// Revoke Invitation
adminRouter.post("/invitations/:id/revoke", async (req: any, res) => {
  try {
    const { id } = req.params;

    await db.execute({
      sql: "UPDATE invitations SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, message: "Invitation revoked successfully" });
  } catch (error: any) {
    console.error("Failed to revoke invitation:", error);
    res.status(500).json({ error: "Failed to revoke invitation" });
  }
});

// Delete Invitation Record
adminRouter.delete("/invitations/:id", async (req: any, res) => {
  try {
    const { id } = req.params;

    await db.execute({
      sql: "DELETE FROM invitations WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, message: "Invitation record deleted" });
  } catch (error: any) {
    console.error("Failed to delete invitation:", error);
    res.status(500).json({ error: "Failed to delete invitation" });
  }
});

/* =========================================================================
   INFO BAR & ANNOUNCEMENTS ADMIN API
   ========================================================================= */

// 1. Get all Info Bar Categories
adminRouter.get("/info-bar/categories", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT c.*,
             (SELECT COUNT(*) FROM info_bar_messages m WHERE m.category_id = c.id) as message_count
      FROM info_bar_categories c
      ORDER BY c.sort_order ASC, c.created_at ASC
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Failed to fetch info bar categories:", error);
    res.status(500).json({ error: error.message || "Failed to fetch categories" });
  }
});

// 2. Create Info Bar Category
adminRouter.post("/info-bar/categories", async (req, res) => {
  try {
    const { name, label, bg_color, text_color, dark_bg_color, dark_text_color, icon, is_enabled, sort_order } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Category code/name is required" });
    }
    if (!label || typeof label !== "string" || !label.trim()) {
      return res.status(400).json({ error: "Category label is required" });
    }
    if (!bg_color) {
      return res.status(400).json({ error: "Background color is required" });
    }

    const id = "cat_" + name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_") + "_" + Math.random().toString(36).substring(2, 6);

    await db.execute({
      sql: `INSERT INTO info_bar_categories (id, name, label, bg_color, text_color, dark_bg_color, dark_text_color, icon, is_enabled, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        id,
        name.trim().toLowerCase(),
        label.trim(),
        bg_color.trim(),
        text_color ? text_color.trim() : '#ffffff',
        dark_bg_color ? dark_bg_color.trim() : '',
        dark_text_color ? dark_text_color.trim() : '',
        icon ? icon.trim() : 'info',
        is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1,
        sort_order !== undefined ? Number(sort_order) : 0
      ]
    });

    const created = await db.execute({
      sql: "SELECT * FROM info_bar_categories WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, category: created.rows[0] });
  } catch (error: any) {
    console.error("Failed to create info bar category:", error);
    res.status(500).json({ error: error.message || "Failed to create category" });
  }
});

// 3. Update Info Bar Category
adminRouter.put("/info-bar/categories/:id", async (req, res) => {
  try {
    const { name, label, bg_color, text_color, dark_bg_color, dark_text_color, icon, is_enabled, sort_order } = req.body;
    const { id } = req.params;

    const existing = await db.execute({
      sql: "SELECT * FROM info_bar_categories WHERE id = ?",
      args: [id]
    });
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    await db.execute({
      sql: `UPDATE info_bar_categories SET
              name = COALESCE(?, name),
              label = COALESCE(?, label),
              bg_color = COALESCE(?, bg_color),
              text_color = COALESCE(?, text_color),
              dark_bg_color = ?,
              dark_text_color = ?,
              icon = COALESCE(?, icon),
              is_enabled = COALESCE(?, is_enabled),
              sort_order = COALESCE(?, sort_order),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        name !== undefined ? name.trim().toLowerCase() : null,
        label !== undefined ? label.trim() : null,
        bg_color !== undefined ? bg_color.trim() : null,
        text_color !== undefined ? text_color.trim() : null,
        dark_bg_color !== undefined ? dark_bg_color.trim() : '',
        dark_text_color !== undefined ? dark_text_color.trim() : '',
        icon !== undefined ? icon.trim() : null,
        is_enabled !== undefined ? (is_enabled ? 1 : 0) : null,
        sort_order !== undefined ? Number(sort_order) : null,
        id
      ]
    });

    const updated = await db.execute({
      sql: "SELECT * FROM info_bar_categories WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, category: updated.rows[0] });
  } catch (error: any) {
    console.error("Failed to update info bar category:", error);
    res.status(500).json({ error: error.message || "Failed to update category" });
  }
});

// 4. Delete Info Bar Category
adminRouter.delete("/info-bar/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if any messages are using this category
    const messageCheck = await db.execute({
      sql: "SELECT COUNT(*) as count FROM info_bar_messages WHERE category_id = ?",
      args: [id]
    });
    const messageCount = Number(messageCheck.rows[0]?.count || 0);
    if (messageCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category: ${messageCount} announcement(s) are currently assigned to it. Please reassign or delete those announcements first.`
      });
    }

    await db.execute({
      sql: "DELETE FROM info_bar_categories WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, message: "Category deleted" });
  } catch (error: any) {
    console.error("Failed to delete info bar category:", error);
    res.status(500).json({ error: error.message || "Failed to delete category" });
  }
});

// 5. Get all Info Bar Messages (Announcements)
adminRouter.get("/info-bar/messages", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT m.*,
             c.name as category_name,
             c.label as category_label,
             c.icon as category_icon,
             c.bg_color as category_bg_color,
             c.text_color as category_text_color,
             c.dark_bg_color as category_dark_bg_color,
             c.dark_text_color as category_dark_text_color,
             c.is_enabled as category_is_enabled
      FROM info_bar_messages m
      LEFT JOIN info_bar_categories c ON m.category_id = c.id
      ORDER BY m.sort_order ASC, m.created_at DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Failed to fetch info bar messages:", error);
    res.status(500).json({ error: error.message || "Failed to fetch announcements" });
  }
});

// 6. Create Info Bar Message
adminRouter.post("/info-bar/messages", async (req, res) => {
  try {
    const {
      category_id,
      text,
      link_url,
      link_label,
      link_target_blank,
      badge_text,
      start_date,
      end_date,
      is_enabled,
      is_dismissible,
      dismiss_scope,
      sort_order
    } = req.body;

    if (!category_id) {
      return res.status(400).json({ error: "Category is required" });
    }
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Announcement text is required" });
    }

    const id = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO info_bar_messages (
              id, category_id, text, link_url, link_label, link_target_blank, badge_text,
              start_date, end_date, is_enabled, is_dismissible, dismiss_scope, sort_order,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        id,
        category_id,
        text.trim(),
        link_url ? link_url.trim() : '',
        link_label ? link_label.trim() : '',
        link_target_blank ? 1 : 0,
        badge_text ? badge_text.trim() : '',
        start_date ? start_date : null,
        end_date ? end_date : null,
        is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1,
        is_dismissible !== undefined ? (is_dismissible ? 1 : 0) : 1,
        dismiss_scope ? dismiss_scope : 'session',
        sort_order !== undefined ? Number(sort_order) : 0
      ]
    });

    const created = await db.execute({
      sql: `SELECT m.*,
                   c.name as category_name,
                   c.label as category_label,
                   c.icon as category_icon,
                   c.bg_color as category_bg_color,
                   c.text_color as category_text_color,
                   c.dark_bg_color as category_dark_bg_color,
                   c.dark_text_color as category_dark_text_color
            FROM info_bar_messages m
            LEFT JOIN info_bar_categories c ON m.category_id = c.id
            WHERE m.id = ?`,
      args: [id]
    });

    res.json({ success: true, message: created.rows[0] });
  } catch (error: any) {
    console.error("Failed to create info bar message:", error);
    res.status(500).json({ error: error.message || "Failed to create announcement" });
  }
});

// 7. Update Info Bar Message
adminRouter.put("/info-bar/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category_id,
      text,
      link_url,
      link_label,
      link_target_blank,
      badge_text,
      start_date,
      end_date,
      is_enabled,
      is_dismissible,
      dismiss_scope,
      sort_order
    } = req.body;

    const existing = await db.execute({
      sql: "SELECT * FROM info_bar_messages WHERE id = ?",
      args: [id]
    });
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    await db.execute({
      sql: `UPDATE info_bar_messages SET
              category_id = COALESCE(?, category_id),
              text = COALESCE(?, text),
              link_url = ?,
              link_label = ?,
              link_target_blank = ?,
              badge_text = ?,
              start_date = ?,
              end_date = ?,
              is_enabled = COALESCE(?, is_enabled),
              is_dismissible = COALESCE(?, is_dismissible),
              dismiss_scope = COALESCE(?, dismiss_scope),
              sort_order = COALESCE(?, sort_order),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        category_id || null,
        text !== undefined ? text.trim() : null,
        link_url !== undefined ? link_url.trim() : '',
        link_label !== undefined ? link_label.trim() : '',
        link_target_blank ? 1 : 0,
        badge_text !== undefined ? badge_text.trim() : '',
        start_date !== undefined ? (start_date || null) : null,
        end_date !== undefined ? (end_date || null) : null,
        is_enabled !== undefined ? (is_enabled ? 1 : 0) : null,
        is_dismissible !== undefined ? (is_dismissible ? 1 : 0) : null,
        dismiss_scope !== undefined ? dismiss_scope : null,
        sort_order !== undefined ? Number(sort_order) : null,
        id
      ]
    });

    const updated = await db.execute({
      sql: `SELECT m.*,
                   c.name as category_name,
                   c.label as category_label,
                   c.icon as category_icon,
                   c.bg_color as category_bg_color,
                   c.text_color as category_text_color,
                   c.dark_bg_color as category_dark_bg_color,
                   c.dark_text_color as category_dark_text_color
            FROM info_bar_messages m
            LEFT JOIN info_bar_categories c ON m.category_id = c.id
            WHERE m.id = ?`,
      args: [id]
    });

    res.json({ success: true, message: updated.rows[0] });
  } catch (error: any) {
    console.error("Failed to update info bar message:", error);
    res.status(500).json({ error: error.message || "Failed to update announcement" });
  }
});

// 8. Delete Info Bar Message
adminRouter.delete("/info-bar/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute({
      sql: "DELETE FROM info_bar_messages WHERE id = ?",
      args: [id]
    });
    res.json({ success: true, message: "Announcement deleted" });
  } catch (error: any) {
    console.error("Failed to delete info bar message:", error);
    res.status(500).json({ error: error.message || "Failed to delete announcement" });
  }
});

// 9. Reorder Info Bar Messages
adminRouter.post("/info-bar/messages/reorder", async (req, res) => {
  try {
    const { items } = req.body; // Array of { id: string, sort_order: number }
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "items must be an array of { id, sort_order }" });
    }

    for (const item of items) {
      if (item.id && typeof item.sort_order === "number") {
        await db.execute({
          sql: "UPDATE info_bar_messages SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          args: [item.sort_order, item.id]
        });
      }
    }

    res.json({ success: true, message: "Reordered successfully" });
  } catch (error: any) {
    console.error("Failed to reorder info bar messages:", error);
    res.status(500).json({ error: error.message || "Failed to reorder announcements" });
  }
});

// 10. Get Info Bar Settings
adminRouter.get("/info-bar/settings", async (req, res) => {
  try {
    const keys = [
      "info_bar_enabled",
      "info_bar_rotation_interval",
      "info_bar_pause_on_hover",
      "info_bar_show_indicators",
      "info_bar_animation"
    ];
    const placeholders = keys.map(() => "?").join(",");
    const result = await db.execute({
      sql: `SELECT key, value FROM settings WHERE key IN (${placeholders})`,
      args: keys
    });

    const settingsMap: Record<string, any> = {
      info_bar_enabled: true,
      info_bar_rotation_interval: 7,
      info_bar_pause_on_hover: true,
      info_bar_show_indicators: true,
      info_bar_animation: "slide"
    };

    for (const row of result.rows) {
      const k = row.key as string;
      const v = row.value as string;
      if (k === "info_bar_enabled") settingsMap.info_bar_enabled = v === "1" || v === "true";
      else if (k === "info_bar_rotation_interval") settingsMap.info_bar_rotation_interval = Math.max(3, parseInt(v, 10) || 7);
      else if (k === "info_bar_pause_on_hover") settingsMap.info_bar_pause_on_hover = v === "1" || v === "true";
      else if (k === "info_bar_show_indicators") settingsMap.info_bar_show_indicators = v === "1" || v === "true";
      else if (k === "info_bar_animation") settingsMap.info_bar_animation = v || "slide";
    }

    res.json(settingsMap);
  } catch (error: any) {
    console.error("Failed to fetch info bar settings:", error);
    res.status(500).json({ error: error.message || "Failed to fetch settings" });
  }
});

// 11. Update Info Bar Settings
adminRouter.put("/info-bar/settings", async (req, res) => {
  try {
    const {
      info_bar_enabled,
      info_bar_rotation_interval,
      info_bar_pause_on_hover,
      info_bar_show_indicators,
      info_bar_animation
    } = req.body;

    const updates: Record<string, string> = {};
    if (info_bar_enabled !== undefined) updates["info_bar_enabled"] = info_bar_enabled ? "1" : "0";
    if (info_bar_rotation_interval !== undefined) updates["info_bar_rotation_interval"] = String(Math.max(3, Number(info_bar_rotation_interval) || 7));
    if (info_bar_pause_on_hover !== undefined) updates["info_bar_pause_on_hover"] = info_bar_pause_on_hover ? "1" : "0";
    if (info_bar_show_indicators !== undefined) updates["info_bar_show_indicators"] = info_bar_show_indicators ? "1" : "0";
    if (info_bar_animation !== undefined) updates["info_bar_animation"] = String(info_bar_animation);

    for (const [k, v] of Object.entries(updates)) {
      const existing = await db.execute({
        sql: "SELECT value FROM settings WHERE key = ?",
        args: [k]
      });
      if (existing.rows.length > 0) {
        await db.execute({
          sql: "UPDATE settings SET value = ? WHERE key = ?",
          args: [v, k]
        });
      } else {
        await db.execute({
          sql: "INSERT INTO settings (key, value) VALUES (?, ?)",
          args: [k, v]
        });
      }
    }

    res.json({ success: true, message: "Info bar settings saved" });
  } catch (error: any) {
    console.error("Failed to update info bar settings:", error);
    res.status(500).json({ error: error.message || "Failed to save settings" });
  }
});

export default adminRouter;
