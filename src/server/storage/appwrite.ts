import { Client, Storage, Users, ID, Permission, Role, AppwriteException } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import fs from "fs";
import crypto from "crypto";
import { db } from "../../db.js";

export async function getAppwriteConfig() {
  let endpoint = process.env.APPWRITE_ENDPOINT;
  let projectId = process.env.APPWRITE_PROJECT_ID;
  let apiKey = process.env.APPWRITE_API_KEY;
  let bucketId = process.env.APPWRITE_BUCKET_ID;

  try {
    const res = await db.execute({
      sql: `SELECT key, value FROM settings WHERE key IN ('appwrite_endpoint', 'appwrite_project_id', 'appwrite_api_key', 'appwrite_bucket_id')`,
      args: []
    });
    for (const row of res.rows) {
      const val = typeof row.value === 'string' ? row.value.trim() : '';
      if (val) {
        if (row.key === 'appwrite_endpoint') endpoint = val;
        else if (row.key === 'appwrite_project_id') projectId = val;
        else if (row.key === 'appwrite_api_key') apiKey = val;
        else if (row.key === 'appwrite_bucket_id') bucketId = val;
      }
    }
  } catch (err) {
    console.warn("Could not load Appwrite settings from database:", err);
  }

  return { endpoint, projectId, apiKey, bucketId };
}

export async function createAppwriteUploadSession(appUser: { id: string; email?: string; name?: string }) {
  const config = await getAppwriteConfig();
  if (!config.endpoint || !config.projectId || !config.apiKey || !config.bucketId) {
    throw new Error("Appwrite settings are incomplete (endpoint, project ID, API key, or bucket ID is missing).");
  }

  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
  const users = new Users(client);
  const appwriteUserId = `sps_${crypto.createHash("sha256").update(String(appUser.id)).digest("hex").slice(0, 30)}`;
  let user: any;
  try {
    user = await users.get({ userId: appwriteUserId });
  } catch (error: any) {
    if (Number(error?.code || error?.status) !== 404) throw error;
    user = await users.create({
      userId: appwriteUserId,
      email: appUser.email || undefined,
      name: String(appUser.name || appUser.email || "SPS uploader").slice(0, 128),
    });
  }

  const labels = Array.isArray(user.labels) ? user.labels : [];
  if (!labels.includes("storageuploader")) {
    await users.updateLabels({ userId: appwriteUserId, labels: [...labels, "storageuploader"] });
  }
  // Create the usable session through the API-key authenticated Server SDK.
  // The browser-side account.createSession endpoint is limited to 10 attempts
  // per hour for an IP + user pair, which breaks multi-file gallery uploads.
  let session: any;
  try {
    session = await users.createSession({ userId: appwriteUserId });
  } catch (error: any) {
    // The uploader account is dedicated to storage. Recover from sessions left
    // behind by older deployments only when Appwrite reports the session cap.
    const message = String(error?.message || "").toLowerCase();
    if (Number(error?.code || error?.status) === 409 || message.includes("session") && message.includes("limit")) {
      await users.deleteSessions({ userId: appwriteUserId });
      session = await users.createSession({ userId: appwriteUserId });
    } else {
      throw error;
    }
  }
  return {
    endpoint: config.endpoint.replace(/\/+$/, ""),
    projectId: config.projectId,
    bucketId: config.bucketId,
    userId: appwriteUserId,
    secret: session.secret,
    sessionId: session.$id,
  };
}

export function getAppwritePublicUrl(endpoint: string, projectId: string, bucketId: string, fileId: string) {
  return `${endpoint.replace(/\/+$/, "")}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}/view?project=${encodeURIComponent(projectId)}`;
}

export async function diagnoseAppwriteStorage() {
  const { endpoint, projectId, apiKey, bucketId } = await getAppwriteConfig();

  if (!endpoint || !projectId || !apiKey || !bucketId) {
    return {
      success: false,
      message: "Appwrite configuration is incomplete. Please check endpoint, project ID, API key, and bucket ID.",
      details: { endpoint: !!endpoint, projectId: !!projectId, apiKey: !!apiKey, bucketId: !!bucketId }
    };
  }

  try {
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const storage = new Storage(client);
    
    // Check bucket metadata
    const bucket = await storage.getBucket(bucketId);
    
    return {
      success: true,
      message: "Successfully connected to Appwrite Storage.",
      bucket: {
        id: bucket.$id,
        name: bucket.name,
        maximumFileSize: bucket.maximumFileSize,
        maximumFileSizeFormatted: `${Math.round((bucket.maximumFileSize || 0) / (1024 * 1024 * 1024) * 10) / 10} GB (${bucket.maximumFileSize} bytes)`,
        allowedFileExtensions: bucket.allowedFileExtensions,
        enabled: bucket.enabled,
        encryption: bucket.encryption,
      },
      tips: [
        "1. Appwrite Bucket Maximum file size in console applies per bucket.",
        "2. For self-hosted Appwrite instances, the server environment variable _APP_STORAGE_LIMIT must also be set >= 10737418240 (10 GB).",
        "3. Any reverse proxy (Nginx, Traefik, Apache) in front of Appwrite must have client_max_body_size >= 10G or 0 (disabled).",
        "4. Chunked uploading is supported and enabled in the studio client to bypass single-request body limits."
      ]
    };
  } catch (err: any) {
    let errorDetail = err.message || "Unknown error";
    let advice = "Please verify your Appwrite URL, Project ID, API Secret Key, and Bucket ID.";

    if (err.code === 401 || err.code === 403) {
      advice = "The API key does not have sufficient Storage permissions (requires 'files.read', 'files.write', 'buckets.read').";
    } else if (err.code === 404) {
      advice = `Bucket '${bucketId}' or project '${projectId}' was not found.`;
    }

    return {
      success: false,
      message: `Appwrite diagnostic failed: ${errorDetail}`,
      code: err.code || 500,
      type: err.type || "unknown",
      advice
    };
  }
}

export async function uploadToAppwrite(file: Express.Multer.File) {
  const { endpoint, projectId, apiKey, bucketId } = await getAppwriteConfig();

  if (!endpoint || !projectId || !apiKey || !bucketId) {
    throw new Error("Appwrite settings are incomplete (missing endpoint, project ID, API key, or bucket ID).");
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const storage = new Storage(client);
  const fileId = ID.unique();
  
  let inputFile: any;
  if (file.path && fs.existsSync(file.path)) {
    inputFile = InputFile.fromPath(file.path, file.originalname);
  } else if (file.buffer) {
    inputFile = InputFile.fromBuffer(file.buffer, file.originalname);
  } else {
    throw new Error("No file content found for upload.");
  }

  try {
    await storage.createFile(bucketId, fileId, inputFile, [
      Permission.read(Role.any())
    ]);
  } catch (err: any) {
    // If Appwrite returns 413 (Payload Too Large / storage_file_too_large) or any other API error
    if (err instanceof AppwriteException || err.code === 413 || err.status === 413 || (err.message && err.message.includes("413")) || (err.message && err.message.includes("storage_file_too_large"))) {
      const detailedMsg = `Appwrite rejected file "${file.originalname}" with HTTP 413 (storage_file_too_large). Even if the bucket is configured for 10 GB in the console, your self-hosted Appwrite server requires '_APP_STORAGE_LIMIT=10737418240' (10 GB) in its .env and Nginx 'client_max_body_size 10G;'.`;
      console.warn(detailedMsg, err.message);
      const enhancedErr = new Error(detailedMsg);
      (enhancedErr as any).code = 413;
      (enhancedErr as any).isAppwriteSizeLimit = true;
      throw enhancedErr;
    } else {
      console.warn(`Appwrite upload failed for "${file.originalname}":`, err.message);
      throw err;
    }
  }

  // Delete temp file after successful upload to Appwrite
  if (file.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch (e) {
      console.warn("Failed to delete temp file:", file.path);
    }
  }

  const cleanEndpoint = endpoint.replace(/\/+$/, "");
  const publicUrl = `${cleanEndpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;

  return {
    provider: "appwrite",
    bucket: bucketId,
    file_key: fileId,
    public_url: publicUrl,
    original_name: file.originalname,
  };
}

export async function deleteFromAppwrite(fileId: string, bucketId: string) {
  const { endpoint, projectId, apiKey } = await getAppwriteConfig();

  if (!endpoint || !projectId || !apiKey) {
    throw new Error("Appwrite storage is not fully configured; refusing to report the file as deleted.");
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const storage = new Storage(client);
  
  try {
    await storage.deleteFile(bucketId, fileId);
  } catch (err: any) {
    if (Number(err?.code) === 404) return;
    console.warn(`Failed to delete file ${fileId} from Appwrite bucket ${bucketId}:`, err.message);
    throw err;
  }
}
