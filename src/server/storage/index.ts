import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "node:os";
import { uploadToR2, deleteFromR2 } from "./r2.js";
import { uploadToAppwrite, deleteFromAppwrite } from "./appwrite.js";

const IS_SERVERLESS = process.env.VERCEL === "1";
const UPLOADS_DIR = IS_SERVERLESS ? path.join(os.tmpdir(), "sps-uploads") : path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function uploadMedia(file: Express.Multer.File, provider: string) {
  if (provider === "appwrite") {
    try {
      return await uploadToAppwrite(file);
    } catch (err: any) {
      if (IS_SERVERLESS) throw err;
      console.warn("Appwrite upload failed or unconfigured, falling back to local disk storage:", err.message);
      return saveToLocalStorage(file);
    }
  } else if (provider === "r2") {
    try {
      return await uploadToR2(file);
    } catch (err: any) {
      if (IS_SERVERLESS) throw err;
      console.warn("R2 upload failed or unconfigured, falling back to local disk storage:", err.message);
      return saveToLocalStorage(file);
    }
  } else {
    if (IS_SERVERLESS) throw new Error("Local media storage is unavailable on Vercel. Configure Appwrite or R2.");
    return saveToLocalStorage(file);
  }
}

function saveToLocalStorage(file: Express.Multer.File) {
  const safeExt = path.extname(file.originalname) || (file.mimetype && file.mimetype.includes("video") ? ".mp4" : ".png");
  const sanitizedName = path.basename(file.originalname, safeExt).replace(/[^a-zA-Z0-9_\-]/g, '_');
  const fileKey = (file as any).customFileKey || file.filename || `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${sanitizedName}${safeExt}`;
  const targetPath = path.join(UPLOADS_DIR, fileKey);

  if (file.path && fs.existsSync(file.path)) {
    // Fast file move/copy from temp disk storage to permanent uploads dir
    try {
      fs.renameSync(file.path, targetPath);
    } catch (renameErr) {
      fs.copyFileSync(file.path, targetPath);
      try { fs.unlinkSync(file.path); } catch {}
    }
  } else if (file.buffer) {
    fs.writeFileSync(targetPath, file.buffer);
  } else {
    throw new Error("No file content found for saving to local storage.");
  }

  const publicUrl = `/uploads/${fileKey}`;
  return {
    provider: "local",
    bucket: "local",
    file_key: fileKey,
    public_url: publicUrl,
    original_name: file.originalname,
  };
}

export async function deleteMedia(fileKey: string, bucket: string, provider: string) {
  if (provider === "appwrite") {
    await deleteFromAppwrite(fileKey, bucket);
  } else if (provider === "r2") {
    await deleteFromR2(fileKey, bucket);
  } else if (provider === "local") {
    const localPath = path.join(UPLOADS_DIR, fileKey);
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch (err) {
        console.warn(`Failed to delete local media file: ${localPath}`, err);
        throw err;
      }
    }
  } else {
    throw new Error(`Unknown media provider '${provider}'; file deletion was not performed.`);
  }
}
