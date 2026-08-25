import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import os from "node:os";
import { uploadMedia, deleteMedia } from "../storage/index.js";
import { db } from "../../db.js";

async function replaceBucketObject(oldUrl: string | undefined, uploaded: any, originalName: string) {
  await db.execute({
    sql: `INSERT INTO media_uploads (id, provider, bucket, file_key, public_url, original_name, created_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    args: [crypto.randomUUID(), uploaded.provider, uploaded.bucket || "", uploaded.file_key, uploaded.public_url, originalName],
  });
  if (!oldUrl || oldUrl === uploaded.public_url) return;
  const oldRecord = await db.execute({ sql: "SELECT id, provider, bucket, file_key FROM media_uploads WHERE public_url = ? LIMIT 1", args: [oldUrl] });
  let provider = String(oldRecord.rows[0]?.provider || "");
  let bucket = String(oldRecord.rows[0]?.bucket || "");
  let fileKey = String(oldRecord.rows[0]?.file_key || "");
  if (!fileKey && oldUrl.includes("/uploads/")) {
    provider = "local"; bucket = "local"; fileKey = path.basename(oldUrl.split("?")[0]);
  } else if (!fileKey && oldUrl.includes("/storage/buckets/") && oldUrl.includes("/files/")) {
    provider = "appwrite";
    bucket = oldUrl.match(/\/storage\/buckets\/([^/]+)/)?.[1] || uploaded.bucket || "";
    fileKey = oldUrl.match(/\/files\/([^/]+)/)?.[1] || "";
  } else if (!fileKey && uploaded.provider === "r2") {
    provider = "r2"; bucket = uploaded.bucket || ""; fileKey = decodeURIComponent(path.basename(oldUrl.split("?")[0]));
  }
  if (provider && bucket && fileKey) await deleteMedia(fileKey, bucket, provider);
  if (oldRecord.rows[0]?.id) await db.execute({ sql: "DELETE FROM media_uploads WHERE id = ?", args: [oldRecord.rows[0].id] });
}

export interface StructuredNamingOptions {
  projectName?: string | null;
  categoryName?: string | null;
  itemType?: string | null;
  itemNumber?: number | string | null;
  originalFileName?: string | null;
  extension?: string | null;
  is10MbVersion?: boolean;
}

export interface ProcessedMediaResult {
  original: {
    url: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    provider?: string;
  };
  compressed?: {
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    provider?: string;
    reductionPercentage: number;
  };
  itemNumber: string;
  projectName: string;
  categoryName: string;
}

/**
 * Sanitizes any string into a clean, lowercased slug for filenames:
 * - Lowercase
 * - Spaces and hyphens replaced with single underscore
 * - Strips special characters
 * - Trims leading/trailing underscores
 */
export function sanitizeNameForFilename(input?: string | null, fallback: string = "general"): string {
  if (!input || typeof input !== "string" || !input.trim()) {
    return fallback;
  }
  
  let clean = input.trim().toLowerCase();

  // Try to parse if it was a JSON localized string (e.g. {"en":"Sunset Villa"})
  try {
    if (clean.startsWith("{") && clean.endsWith("}")) {
      const parsed = JSON.parse(clean);
      if (parsed && typeof parsed === "object") {
        clean = (parsed["en"] || Object.values(parsed)[0] || fallback).toString().toLowerCase();
      }
    }
  } catch {}

  clean = clean
    .replace(/[^a-z0-9\s_-]/g, "") // strip non-alphanumeric except spaces/dashes/underscores
    .replace(/[\s-]+/g, "_") // replace spaces and dashes with underscore
    .replace(/_+/g, "_") // collapse multiple underscores
    .replace(/^_+|_+$/g, ""); // trim leading/trailing underscores

  return clean || fallback;
}

/**
 * Formats a sequential number into a 3-digit padded string (001, 002, etc.)
 */
export function formatItemNumber(num?: number | string | null, defaultNum: number = 1): string {
  if (num === undefined || num === null || num === "") {
    return String(defaultNum).padStart(3, "0");
  }
  const parsed = parseInt(String(num).replace(/[^0-9]/g, ""), 10);
  if (isNaN(parsed) || parsed <= 0) {
    return String(defaultNum).padStart(3, "0");
  }
  return String(parsed).padStart(3, "0");
}

/**
 * Builds the structured filename according to specifications:
 * Original: [projectname]_[category]_[itemnumber].[ext]
 * 10MB Compressed: [projectname]_[category]_10mb_[itemnumber].[ext]
 */
export function buildStructuredFilename(options: StructuredNamingOptions): string {
  const project = sanitizeNameForFilename(options.projectName, "project");
  
  // Resolve category name (photos, drone, interior, or custom category)
  let categoryRaw = options.categoryName;
  if (!categoryRaw && options.itemType) {
    if (options.itemType === "drone_video") categoryRaw = "drone";
    else if (options.itemType === "interior_video") categoryRaw = "interior";
    else if (options.itemType === "drone_photo") categoryRaw = "drone-photos";
    else categoryRaw = "photos";
  }
  const category = sanitizeNameForFilename(categoryRaw, "photos");
  const itemNumber = formatItemNumber(options.itemNumber);
  
  let ext = options.extension;
  if (!ext && options.originalFileName) {
    ext = path.extname(options.originalFileName);
  }
  if (!ext) {
    ext = ".jpg";
  }
  if (!ext.startsWith(".")) {
    ext = `.${ext}`;
  }
  ext = ext.toLowerCase();

  if (options.is10MbVersion) {
    return `${project}_${category}_10mb_${itemNumber}${ext}`;
  }
  return `${project}_${category}_${itemNumber}${ext}`;
}

/**
 * Validates whether a user-edited filename strictly adheres to the structured pattern:
 * Standard: [projectname]_[category]_[itemnumber].[ext]
 * 10MB Variant: [projectname]_[category]_10mb_[itemnumber].[ext]
 */
export function validateStructuredFilename(filename: string): {
  valid: boolean;
  error?: string;
  parsed?: {
    projectName: string;
    categoryName: string;
    itemNumber: string;
    is10Mb: boolean;
    extension: string;
  };
} {
  if (!filename || typeof filename !== "string" || !filename.trim()) {
    return {
      valid: false,
      error: "Filename cannot be empty.",
    };
  }

  const trimmed = filename.trim().toLowerCase();
  
  // Regex pattern matching [project]_[category]_[itemnumber].[ext] OR [project]_[category]_10mb_[itemnumber].[ext]
  // Allows lowercase letters, numbers, and underscores in project and category names
  const regex = /^([a-z0-9]+(?:_[a-z0-9]+)*)_([a-z0-9]+(?:_[a-z0-9]+)*)_(?:(10mb)_)?(\d{3,})(\.[a-z0-9]+)?$/i;
  const match = trimmed.match(regex);

  if (!match) {
    return {
      valid: false,
      error: 'Filename must follow the structured pattern: [projectname]_[category]_[itemnumber].[ext] (e.g., skyline_residence_photos_001.jpg). Only lowercase alphanumeric characters and underscores are permitted.',
    };
  }

  const projectName = match[1];
  const categoryName = match[2];
  const is10Mb = match[3] === "10mb";
  const itemNumber = match[4];
  const extension = match[5] || "";

  return {
    valid: true,
    parsed: {
      projectName,
      categoryName,
      itemNumber,
      is10Mb,
      extension,
    },
  };
}

/**
 * Processes an uploaded image or video:
 * 1. Creates original file with structured name [projectname]_[category]_[itemnumber].[ext]
 * 2. If it is an image, generates a compressed version under 10 MB named [projectname]_[category]_10mb_[itemnumber].[ext]
 * 3. Uploads both to storage provider and returns full metadata
 */
export async function processStructuredMediaUpload({
  file,
  projectName,
  categoryName,
  itemType,
  itemNumber,
  mediaProvider = "local"
}: {
  file: Express.Multer.File;
  projectName?: string;
  categoryName?: string;
  itemType?: string;
  itemNumber?: number | string;
  mediaProvider?: string;
}): Promise<ProcessedMediaResult> {
  const UPLOADS_TEMP_DIR = process.env.VERCEL === "1" ? path.join(os.tmpdir(), "sps-upload-temp") : path.join(process.cwd(), "uploads", "temp");
  const UPLOADS_DIR = process.env.VERCEL === "1" ? path.join(os.tmpdir(), "sps-uploads") : path.join(process.cwd(), "uploads");

  if (!fs.existsSync(UPLOADS_TEMP_DIR)) {
    fs.mkdirSync(UPLOADS_TEMP_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const rawExt = path.extname(file.originalname).toLowerCase() || (file.mimetype.includes("video") ? ".mp4" : ".jpg");
  const isImage = file.mimetype.startsWith("image/") && !file.mimetype.includes("svg");
  const resolvedItemNumber = formatItemNumber(itemNumber);

  // Generate structured filename for original
  const originalStructuredName = buildStructuredFilename({
    projectName,
    categoryName,
    itemType,
    itemNumber: resolvedItemNumber,
    extension: rawExt,
    is10MbVersion: false,
  });

  // Prepare a temporary file copy with the structured name
  const tempOriginalPath = path.join(UPLOADS_TEMP_DIR, `orig-${Date.now()}-${originalStructuredName}`);
  
  if (file.path && fs.existsSync(file.path)) {
    fs.copyFileSync(file.path, tempOriginalPath);
  } else if (file.buffer) {
    fs.writeFileSync(tempOriginalPath, file.buffer);
  } else {
    throw new Error("Missing upload file content.");
  }

  const originalStat = fs.statSync(tempOriginalPath);

  // Create multer-like object for original file
  const originalUploadObj: Express.Multer.File = {
    ...file,
    originalname: originalStructuredName,
    filename: originalStructuredName,
    path: tempOriginalPath,
    size: originalStat.size,
  };

  // Upload original to configured storage provider
  const originalUploadResult = await uploadMedia(originalUploadObj, mediaProvider);

  // Clean temp original copy
  try { fs.unlinkSync(tempOriginalPath); } catch {}

  const result: ProcessedMediaResult = {
    original: {
      url: originalUploadResult.public_url,
      filename: originalStructuredName,
      originalName: file.originalname,
      size: originalStat.size,
      mimeType: file.mimetype,
      provider: originalUploadResult.provider,
    },
    itemNumber: resolvedItemNumber,
    projectName: sanitizeNameForFilename(projectName, "project"),
    categoryName: sanitizeNameForFilename(categoryName, "photos"),
  };

  // If this is an image, generate the compressed < 10 MB version using Sharp
  if (isImage) {
    try {
      const compressedStructuredName = buildStructuredFilename({
        projectName,
        categoryName,
        itemType,
        itemNumber: resolvedItemNumber,
        extension: rawExt === ".png" ? ".jpg" : rawExt, // Optimize large PNGs to crisp JPEG/WebP
        is10MbVersion: true,
      });

      const tempCompressedPath = path.join(UPLOADS_TEMP_DIR, `comp-${Date.now()}-${compressedStructuredName}`);
      
      const sourcePath = file.path && fs.existsSync(file.path) ? file.path : null;
      let sharpInstance = sourcePath ? sharp(sourcePath) : sharp(file.buffer);

      // Inspect metadata
      const metadata = await sharpInstance.metadata();
      const width = metadata.width || 3840;
      const height = metadata.height || 2160;

      // If dimensions are massive (> 3840px), resize while maintaining aspect ratio
      const maxDimension = 3840;
      if (width > maxDimension || height > maxDimension) {
        sharpInstance = sharpInstance.resize({
          width: width > height ? maxDimension : undefined,
          height: height >= width ? maxDimension : undefined,
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      // 10 MB target threshold in bytes (10 * 1024 * 1024 = 10,485,760 bytes)
      const MAX_10MB_BYTES = 10 * 1024 * 1024;
      let outputQuality = 88;

      if (rawExt === ".webp") {
        await sharpInstance
          .webp({ quality: outputQuality, effort: 4 })
          .toFile(tempCompressedPath);
      } else if (rawExt === ".png" && originalStat.size < 5 * 1024 * 1024) {
        // If PNG is already reasonably small, optimize PNG
        await sharpInstance
          .png({ compressionLevel: 8, quality: outputQuality })
          .toFile(tempCompressedPath);
      } else {
        // Default to highly optimized JPEG with progressive rendering
        await sharpInstance
          .jpeg({ quality: outputQuality, progressive: true, mozjpeg: true })
          .toFile(tempCompressedPath);
      }

      let compressedStat = fs.statSync(tempCompressedPath);

      // If still above 10MB (rare), apply stronger compression
      if (compressedStat.size > MAX_10MB_BYTES) {
        outputQuality = 75;
        const fallbackSharp = sourcePath ? sharp(sourcePath) : sharp(file.buffer);
        await fallbackSharp
          .resize({ width: 2560, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: outputQuality, progressive: true, mozjpeg: true })
          .toFile(tempCompressedPath);
        compressedStat = fs.statSync(tempCompressedPath);
      }

      // Create multer-like object for compressed file
      const compressedUploadObj: Express.Multer.File = {
        ...file,
        originalname: compressedStructuredName,
        filename: compressedStructuredName,
        path: tempCompressedPath,
        size: compressedStat.size,
        mimetype: "image/jpeg",
      };

      const compressedUploadResult = await uploadMedia(compressedUploadObj, mediaProvider);

      // Clean temp compressed copy
      try { fs.unlinkSync(tempCompressedPath); } catch {}

      const reductionPercentage = Math.max(
        0,
        Math.round(((originalStat.size - compressedStat.size) / originalStat.size) * 100)
      );

      result.compressed = {
        url: compressedUploadResult.public_url,
        filename: compressedStructuredName,
        size: compressedStat.size,
        mimeType: "image/jpeg",
        provider: compressedUploadResult.provider,
        reductionPercentage,
      };
    } catch (compressionErr: any) {
      console.warn("[MediaProcessing] Image compression warning:", compressionErr.message);
    }
  }

  return result;
}

/**
 * Downloads or reads a media file into a Buffer from either local disk or remote HTTP URL
 */
export async function downloadOrReadMediaBuffer(mediaUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!mediaUrl || typeof mediaUrl !== "string") {
    throw new Error("Invalid or empty media URL.");
  }

  const cleanUrl = mediaUrl.split("?")[0];

  // Check if it is a local upload path
  if (cleanUrl.startsWith("/uploads/") || cleanUrl.includes("/uploads/")) {
    const filename = path.basename(cleanUrl);
    const localPath = path.join(process.cwd(), "uploads", filename);
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const ext = path.extname(filename).toLowerCase();
      let mimeType = "image/jpeg";
      if (ext === ".png") mimeType = "image/png";
      else if (ext === ".webp") mimeType = "image/webp";
      else if (ext === ".mp4") mimeType = "video/mp4";
      else if (ext === ".mov") mimeType = "video/quicktime";
      return { buffer, mimeType };
    }
  }

  // Fetch via HTTP/HTTPS
  let fetchUrl = mediaUrl;
  if (fetchUrl.startsWith("//")) {
    fetchUrl = "https:" + fetchUrl;
  } else if (fetchUrl.startsWith("/")) {
    // Relative local URL
    const localPath = path.join(process.cwd(), fetchUrl);
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      return { buffer, mimeType: "image/jpeg" };
    }
  }

  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch media from URL (${response.status} ${response.statusText}): ${fetchUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = response.headers.get("content-type") || "application/octet-stream";

  return { buffer, mimeType };
}

/**
 * Restructures a single gallery media item:
 * 1. Checks if the item already has a valid structured filename.
 *    - If YES: keeps the filename unchanged (does not rename in bucket).
 *      If it is an image and lacks a 10MB version, generates and uploads the <10MB version to the bucket.
 *    - If NO: assigns new structured filename, renames/re-uploads the file to the storage bucket,
 *      and generates + uploads the <10MB compressed image version.
 */
export async function restructureSingleMediaItem({
  item,
  projectName,
  categoryName,
  itemNumber,
  mediaProvider = "local",
  targetFilename,
  sourceFilename,
}: {
  item: any;
  projectName?: string;
  categoryName?: string;
  itemNumber?: number | string;
  mediaProvider?: string;
  targetFilename?: string;
  sourceFilename?: string;
}): Promise<{
  item: any;
  renamedInBucket: boolean;
  compressedCreated: boolean;
  error?: string;
}> {
  const UPLOADS_TEMP_DIR = process.env.VERCEL === "1" ? path.join(os.tmpdir(), "sps-upload-temp") : path.join(process.cwd(), "uploads", "temp");
  if (!fs.existsSync(UPLOADS_TEMP_DIR)) {
    fs.mkdirSync(UPLOADS_TEMP_DIR, { recursive: true });
  }

  const isVideo = item.type === "video" || item.item_type?.includes("video") || (item.url && (item.url.includes(".mp4") || item.url.includes(".mov") || item.url.includes(".webm")));
  const isImage = !isVideo;
  const isExternalVideoEmbed = isVideo && (item.embed_type === "youtube" || item.embed_type === "vimeo" || (item.url && (item.url.includes("youtube.com") || item.url.includes("youtu.be") || item.url.includes("vimeo.com"))));

  // Determine if the item already possesses a valid structured filename
  const existingFilename = sourceFilename || item.filename || (item.url ? path.basename(item.url.split("?")[0]) : "");
  const validation = validateStructuredFilename(existingFilename);
  const targetValidation = targetFilename ? validateStructuredFilename(targetFilename) : null;
  if (targetFilename && !targetValidation?.valid) throw new Error(targetValidation?.error || "Invalid target structured filename");
  const forceRename = Boolean(targetFilename && targetFilename !== existingFilename);
  const isAlreadyStructured = validation.valid && !validation.parsed?.is10Mb && !forceRename;

  const resolvedItemNumber = formatItemNumber(
    isAlreadyStructured && validation.parsed?.itemNumber ? validation.parsed.itemNumber : itemNumber
  );

  let category = categoryName || "photos";
  if (isVideo) {
    category = item.item_type === "interior_video" ? "interior" : "drone";
  }

  // CASE 1: File is already structured
  if (isAlreadyStructured) {
    let updatedItem = { ...item, filename: existingFilename };
    let compressedCreated = false;

    // If it's an image and missing the 10MB version, create it
    if (isImage && (!item.compressed_url || !item.compressed_filename) && item.url) {
      try {
        const { buffer } = await downloadOrReadMediaBuffer(item.url);
        const extMatch = existingFilename.match(/\.[a-z0-9]+$/i);
        const ext = extMatch ? extMatch[0].toLowerCase() : ".jpg";

        let compressedStructuredName = item.compressed_filename;
        if (!compressedStructuredName || !validateStructuredFilename(compressedStructuredName).valid) {
          compressedStructuredName = buildStructuredFilename({
            projectName: validation.parsed?.projectName || projectName,
            categoryName: validation.parsed?.categoryName || category,
            itemNumber: resolvedItemNumber,
            extension: ext === ".png" ? ".jpg" : ext,
            is10MbVersion: true,
          });
        }

        let sharpInstance = sharp(buffer);
        const metadata = await sharpInstance.metadata();
        const maxDimension = 3840;
        if ((metadata.width && metadata.width > maxDimension) || (metadata.height && metadata.height > maxDimension)) {
          sharpInstance = sharpInstance.resize({
            width: (metadata.width || 0) > (metadata.height || 0) ? maxDimension : undefined,
            height: (metadata.height || 0) >= (metadata.width || 0) ? maxDimension : undefined,
            fit: "inside",
            withoutEnlargement: true,
          });
        }

        const compressedBuffer = await sharpInstance
          .jpeg({ quality: 88, progressive: true, mozjpeg: true })
          .toBuffer();

        const compUploadObj: Express.Multer.File = {
          fieldname: "file",
          originalname: compressedStructuredName,
          filename: compressedStructuredName,
          encoding: "7bit",
          mimetype: "image/jpeg",
          size: compressedBuffer.length,
          path: "",
          destination: UPLOADS_TEMP_DIR,
          buffer: compressedBuffer,
          stream: null as any,
        };
        (compUploadObj as any).customFileKey = compressedStructuredName;

        const compUploadResult = await uploadMedia(compUploadObj, mediaProvider);

        updatedItem = {
          ...updatedItem,
          compressed_url: compUploadResult.public_url,
          compressed_filename: compressedStructuredName,
          compressed_size: compressedBuffer.length,
        };
        compressedCreated = true;
      } catch (err: any) {
        console.warn(`[BatchRestructure] Could not create 10MB version for already structured image ${existingFilename}:`, err.message);
      }
    }

    return {
      item: updatedItem,
      renamedInBucket: false,
      compressedCreated,
    };
  }

  // CASE 2: File is NOT structured yet -> Generate new structured name, update in bucket, create <10MB version
  try {
    let rawExt = ".jpg";
    if (existingFilename && existingFilename.includes(".")) {
      rawExt = path.extname(existingFilename).toLowerCase();
    } else if (item.url && item.url.includes(".")) {
      const p = item.url.split("?")[0];
      rawExt = path.extname(p).toLowerCase() || (isVideo ? ".mp4" : ".jpg");
    }

    const newStructuredFilename = targetFilename || buildStructuredFilename({
      projectName,
      categoryName: category,
      itemType: item.item_type || (isVideo ? "drone_video" : "image"),
      itemNumber: resolvedItemNumber,
      extension: rawExt,
      is10MbVersion: false,
    });

    // Skip downloading remote stream if external youtube/vimeo embed
    if (isExternalVideoEmbed) {
      return {
        item: {
          ...item,
          filename: newStructuredFilename,
          item_number: resolvedItemNumber,
          project_name: sanitizeNameForFilename(projectName, "project"),
          category_name: sanitizeNameForFilename(category, "photos"),
        },
        renamedInBucket: false,
        compressedCreated: false,
      };
    }

    if (!item.url) {
      throw new Error(`Media item ${item.id || item.title || "unnamed"} has no URL.`);
    }

    // Read/fetch file data
    const { buffer, mimeType } = await downloadOrReadMediaBuffer(item.url);
    const originalSize = buffer.length;

    // Upload directly from the downloaded buffer. Writing a second full copy of
    // large videos to Vercel's limited /tmp volume can cause ENOSPC failures.
    const origUploadObj: Express.Multer.File = {
      fieldname: "file",
      originalname: newStructuredFilename,
      filename: newStructuredFilename,
      encoding: "7bit",
      mimetype: mimeType,
      size: originalSize,
      path: "",
      destination: UPLOADS_TEMP_DIR,
      buffer,
      stream: null as any,
    };
    (origUploadObj as any).customFileKey = newStructuredFilename;

    const origUploadResult = await uploadMedia(origUploadObj, mediaProvider);
    await replaceBucketObject(item.url, origUploadResult, newStructuredFilename);

    let compressedUrl: string | undefined = undefined;
    let compressedFilename: string | undefined = undefined;
    let compressedSize: number | undefined = undefined;
    let compressedCreated = false;

    // 2. If it is an image, generate the <10MB version and upload to storage bucket
    if (isImage) {
      try {
        const newCompressedFilename = buildStructuredFilename({
          projectName,
          categoryName: category,
          itemType: "image",
          itemNumber: resolvedItemNumber,
          extension: rawExt === ".png" ? ".jpg" : rawExt,
          is10MbVersion: true,
        });

        let sharpInstance = sharp(buffer);
        const metadata = await sharpInstance.metadata();
        const maxDimension = 3840;
        if ((metadata.width && metadata.width > maxDimension) || (metadata.height && metadata.height > maxDimension)) {
          sharpInstance = sharpInstance.resize({
            width: (metadata.width || 0) > (metadata.height || 0) ? maxDimension : undefined,
            height: (metadata.height || 0) >= (metadata.width || 0) ? maxDimension : undefined,
            fit: "inside",
            withoutEnlargement: true,
          });
        }

        const MAX_10MB_BYTES = 10 * 1024 * 1024;
        let quality = 88;
        let compressedBuffer = await sharpInstance
          .jpeg({ quality, progressive: true, mozjpeg: true })
          .toBuffer();

        if (compressedBuffer.length > MAX_10MB_BYTES) {
          quality = 75;
          compressedBuffer = await sharp(buffer)
            .resize({ width: 2560, fit: "inside", withoutEnlargement: true })
            .jpeg({ quality, progressive: true, mozjpeg: true })
            .toBuffer();
        }

        const compUploadObj: Express.Multer.File = {
          fieldname: "file",
          originalname: newCompressedFilename,
          filename: newCompressedFilename,
          encoding: "7bit",
          mimetype: "image/jpeg",
          size: compressedBuffer.length,
          path: "",
          destination: UPLOADS_TEMP_DIR,
          buffer: compressedBuffer,
          stream: null as any,
        };
        (compUploadObj as any).customFileKey = newCompressedFilename;

        const compUploadResult = await uploadMedia(compUploadObj, mediaProvider);
        await replaceBucketObject(item.compressed_url, compUploadResult, newCompressedFilename);

        compressedUrl = compUploadResult.public_url;
        compressedFilename = newCompressedFilename;
        compressedSize = compressedBuffer.length;
        compressedCreated = true;
      } catch (compErr: any) {
        console.warn(`[BatchRestructure] Image compression warning for ${newStructuredFilename}:`, compErr.message);
      }
    }

    const updatedItem = {
      ...item,
      url: origUploadResult.public_url,
      filename: newStructuredFilename,
      original_filename: newStructuredFilename,
      storage_provider: origUploadResult.provider,
      storage_bucket: origUploadResult.bucket,
      storage_file_key: origUploadResult.file_key,
      file_size: originalSize,
      compressed_url: compressedUrl || item.compressed_url,
      compressed_filename: compressedFilename || item.compressed_filename,
      compressed_size: compressedSize || item.compressed_size,
      item_number: resolvedItemNumber,
      project_name: sanitizeNameForFilename(projectName, "project"),
      category_name: sanitizeNameForFilename(category, "photos"),
      item_type: isVideo ? (item.item_type || "drone_video") : "image",
      type: isVideo ? "video" : "image",
    };

    return {
      item: updatedItem,
      renamedInBucket: true,
      compressedCreated,
    };
  } catch (err: any) {
    console.error(`[BatchRestructure] Error restructuring item ${item.id}:`, err);
    return {
      item,
      renamedInBucket: false,
      compressedCreated: false,
      error: err.message || "Failed to restructure item in storage",
    };
  }
}

/**
 * Batch restructures a full array of gallery items:
 * Ensures sequential numbers for unstructured items, preserves already structured items without renaming,
 * updates filenames in the bucket, and creates under 10MB images for all items.
 */
export async function batchRestructureGalleryItems({
  items,
  projectName = "project",
  categoryName = "photos",
  mediaProvider = "local",
}: {
  items: any[];
  projectName?: string;
  categoryName?: string;
  mediaProvider?: string;
}): Promise<{
  items: any[];
  summary: {
    total: number;
    renamedInBucket: number;
    alreadyStructured: number;
    compressedCreated: number;
    errors: Array<{ id: string; error: string }>;
  };
}> {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return {
      items: [],
      summary: {
        total: 0,
        renamedInBucket: 0,
        alreadyStructured: 0,
        compressedCreated: 0,
        errors: [],
      },
    };
  }

  // Count existing structured sequence numbers to avoid number collisions
  let photoCounter = 1;
  let droneCounter = 1;
  let interiorCounter = 1;

  // Track numbers already claimed by structured items
  const claimedPhotoNumbers = new Set<number>();
  const claimedDroneNumbers = new Set<number>();
  const claimedInteriorNumbers = new Set<number>();

  for (const itm of items) {
    const fn = itm.filename || (itm.url ? path.basename(itm.url.split("?")[0]) : "");
    const v = validateStructuredFilename(fn);
    if (v.valid && v.parsed?.itemNumber) {
      const num = parseInt(v.parsed.itemNumber, 10);
      const isVid = itm.type === "video" || itm.item_type?.includes("video");
      if (isVid) {
        if (itm.item_type === "interior_video") claimedInteriorNumbers.add(num);
        else claimedDroneNumbers.add(num);
      } else {
        claimedPhotoNumbers.add(num);
      }
    }
  }

  const getNextPhotoNumber = () => {
    while (claimedPhotoNumbers.has(photoCounter)) {
      photoCounter++;
    }
    const allocated = photoCounter;
    claimedPhotoNumbers.add(allocated);
    photoCounter++;
    return allocated;
  };

  const getNextDroneNumber = () => {
    while (claimedDroneNumbers.has(droneCounter)) {
      droneCounter++;
    }
    const allocated = droneCounter;
    claimedDroneNumbers.add(allocated);
    droneCounter++;
    return allocated;
  };

  const getNextInteriorNumber = () => {
    while (claimedInteriorNumbers.has(interiorCounter)) {
      interiorCounter++;
    }
    const allocated = interiorCounter;
    claimedInteriorNumbers.add(allocated);
    interiorCounter++;
    return allocated;
  };

  const updatedItems: any[] = [];
  let renamedInBucket = 0;
  let alreadyStructured = 0;
  let compressedCreated = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const item of items) {
    const isVid = item.type === "video" || item.item_type?.includes("video");
    const isInterior = item.item_type === "interior_video";

    const fn = item.filename || (item.url ? path.basename(item.url.split("?")[0]) : "");
    const v = validateStructuredFilename(fn);

    let seqNumber: number;
    if (v.valid && v.parsed?.itemNumber) {
      seqNumber = parseInt(v.parsed.itemNumber, 10);
    } else {
      seqNumber = isVid ? (isInterior ? getNextInteriorNumber() : getNextDroneNumber()) : getNextPhotoNumber();
    }

    const itemCategory = isVid ? (isInterior ? "interior" : "drone") : (categoryName || "photos");
    const sourceExt = path.extname(fn || String(item.url || "").split("?")[0]).toLowerCase() || (isVid ? ".mp4" : ".jpg");
    const targetFilename = buildStructuredFilename({
      projectName,
      categoryName: itemCategory,
      itemType: item.item_type || (isVid ? "drone_video" : "image"),
      itemNumber: seqNumber,
      extension: sourceExt,
      is10MbVersion: false,
    });

    const result = await restructureSingleMediaItem({
      item,
      projectName,
      categoryName: itemCategory,
      itemNumber: seqNumber,
      mediaProvider,
      targetFilename,
    });

    updatedItems.push(result.item);

    if (result.renamedInBucket) renamedInBucket++;
    else alreadyStructured++;

    if (result.compressedCreated) compressedCreated++;

    if (result.error) {
      errors.push({ id: item.id || item.title || "item", error: result.error });
    }
  }

  return {
    items: updatedItems,
    summary: {
      total: items.length,
      renamedInBucket,
      alreadyStructured,
      compressedCreated,
      errors,
    },
  };
}
