/**
 * Robust Media Upload Helper
 * Handles streaming chunked uploads (up to 10 GB) with real-time progress,
 * automatic retry resilience for network glitches, and user-friendly error diagnostics.
 */

export interface UploadProgressCallback {
  (percent: number, loaded: number, total: number): void;
}

export interface UploadOptions {
  token?: string | null;
  onProgress?: UploadProgressCallback;
  chunkSize?: number; // In bytes, defaults to 2.5 MB
  projectName?: string | null;
  categoryName?: string | null;
  itemType?: string | null;
  itemNumber?: number | string | null;
  useStructuredName?: boolean;
}

export interface UploadResult {
  url: string;
  id?: string;
  provider?: string;
  originalName?: string;
  filename?: string;
  originalFilename?: string;
  fileSize?: number;
  compressedUrl?: string;
  compressedFilename?: string;
  compressedSize?: number;
  thumbnailUrl?: string;
  thumbnailFilename?: string;
  thumbnailSize?: number;
  itemNumber?: string;
  projectName?: string;
  categoryName?: string;
}

// 2.5 MB per chunk: optimal size that prevents reverse proxy timeouts and HTTP/2 socket drops
const DEFAULT_CHUNK_SIZE = 2.5 * 1024 * 1024;
const MAX_RETRIES_PER_CHUNK = 4;
// A direct-storage session is valid far longer than a single file request. Keep it
// while a long batch runs so a backgrounded tab does not repeatedly create sessions.
const APPWRITE_SESSION_REUSE_MS = 2 * 60 * 60 * 1000;

let appwriteSessionCache: {
  client: any;
  account: any;
  storage: any;
  sessionData: any;
  expiresAt: number;
  authKey: string;
} | null = null;
let appwriteSessionPromise: Promise<NonNullable<typeof appwriteSessionCache>> | null = null;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function fetchWithRateLimitRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  maxAttempts = 5,
): Promise<Response> {
  let response: Response | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    response = await fetch(input, init);
    if (response.status !== 429) return response;
    if (attempt === maxAttempts) return response;

    const retryAfter = response.headers.get("Retry-After");
    const retrySeconds = retryAfter ? Number(retryAfter) : NaN;
    const backoffMs = Number.isFinite(retrySeconds)
      ? Math.max(1000, retrySeconds * 1000)
      : Math.min(12_000, 1000 * 2 ** (attempt - 1));
    await delay(backoffMs + Math.floor(Math.random() * 350));
  }
  return response!;
}

export async function uploadMediaFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const token = options.token;
  const onProgress = options.onProgress;
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const totalSize = file.size;

  // On Vercel the file bytes must not pass through the serverless function.
  // R2 and Appwrite both support browser-to-storage uploads; use that path for
  // small gallery images as well as large media.
  const storageFile = options.useStructuredName ? createStructuredUploadFile(file, options) : file;
  const storageDirectResult = await uploadDirectToConfiguredStorage(
    storageFile,
    token,
    (percent, loaded, total) => onProgress?.(Math.round(percent * 0.75), loaded, total),
    file.name,
  );
  if (storageDirectResult) {
    const optimizedFile = await createOptimizedImageFile(storageFile);
    if (optimizedFile) {
      try {
        const optimizedResult = await uploadDirectToConfiguredStorage(
          optimizedFile,
          token,
          (percent) => onProgress?.(75 + Math.round(percent * 0.17), file.size, file.size),
          file.name,
        );
        if (optimizedResult) {
          let thumbnailResult: UploadResult | null = null;
          let thumbnailFile: File | null = null;
          try {
            thumbnailFile = await createCardPreviewImageFile(optimizedFile);
            if (thumbnailFile) {
              thumbnailResult = await uploadDirectToConfiguredStorage(
                thumbnailFile,
                token,
                (percent) => onProgress?.(92 + Math.round(percent * 0.08), file.size, file.size),
                file.name,
              );
            }
          } catch (error) {
            console.warn(`[Card Preview] Could not upload card preview for "${file.name}":`, error);
          }
          onProgress?.(100, file.size, file.size);
          return {
            ...storageDirectResult,
            compressedUrl: optimizedResult.url,
            compressedFilename: optimizedFile.name,
            compressedSize: optimizedFile.size,
            thumbnailUrl: thumbnailResult?.url,
            thumbnailFilename: thumbnailFile?.name,
            thumbnailSize: thumbnailFile?.size,
          };
        }
      } catch (error) {
        // The original is already safely stored. Keep it usable as a fallback
        // if optimization upload fails, without losing the gallery item.
        console.warn(`[Image Optimization] Could not upload optimized variant for "${file.name}":`, error);
      }
    }
    onProgress?.(100, file.size, file.size);
    return storageDirectResult;
  }

  // For smaller files (<= 2.5 MB), direct upload is faster, but chunked is used for everything else
  const totalChunks = Math.ceil(totalSize / chunkSize);

  if (totalChunks <= 1) {
    return uploadDirectWithRetry(file, token, onProgress, options);
  }

  return uploadChunked(file, token, chunkSize, totalChunks, onProgress, options);
}

async function createCardPreviewImageFile(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/")) return null;
  const bitmap = await createImageBitmap(file);
  try {
    const maxDimension = 840;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return null;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    if (!blob) return null;
    const baseName = file.name.replace(/_optimized\.jpg$/i, "").replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}_card.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

function createStructuredUploadFile(file: File, options: UploadOptions): File {
  const extensionMatch = file.name.match(/\.([a-zA-Z0-9]{1,10})$/);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : "bin";
  const cleanPart = (value: unknown, fallback: string) => {
    const normalized = String(value || fallback)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    return normalized || fallback;
  };
  const project = cleanPart(options.projectName, "project");
  const category = cleanPart(options.categoryName, "media");
  const type = cleanPart(options.itemType, "item");
  const itemNumber = String(options.itemNumber ?? Date.now()).padStart(3, "0");
  const structuredName = `${project}_${category}_${type}_${itemNumber}.${extension}`;
  return new File([file], structuredName, { type: file.type, lastModified: file.lastModified });
}

async function createOptimizedImageFile(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/") || /image\/(gif|svg\+xml)/i.test(file.type)) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 2200;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      bitmap.close();
      return null;
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const outputType = "image/jpeg";
    const maxOptimizedBytes = 10 * 1024 * 1024 - 64 * 1024;
    let blob: Blob | null = null;

    // Preserve as much detail as possible: start at premium JPEG quality and
    // only step down when the encoded file would exceed the strict 10 MB cap.
    for (const quality of [0.92, 0.89, 0.86, 0.82, 0.78, 0.72, 0.66]) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, quality));
      if (blob && blob.size <= maxOptimizedBytes) break;
    }
    if (!blob || blob.size > maxOptimizedBytes) return null;

    // When the source is already a smaller JPEG, keep its bytes instead of
    // making a larger derivative, while still registering an optimized asset.
    if (/image\/jpeg/i.test(file.type) && file.size <= maxOptimizedBytes && file.size < blob.size) {
      blob = file;
    }
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}_optimized.jpg`, { type: outputType, lastModified: Date.now() });
  } catch (error) {
    console.warn(`[Image Optimization] Browser could not optimize "${file.name}":`, error);
    return null;
  }
}

async function uploadDirectWithRetry(
  file: File,
  token?: string | null,
  onProgress?: UploadProgressCallback,
  options?: UploadOptions
): Promise<UploadResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES_PER_CHUNK; attempt++) {
    try {
      return await uploadDirectOnce(file, token, onProgress, options);
    } catch (err: any) {
      lastError = err;
      console.warn(`[Direct Upload] Attempt ${attempt}/${MAX_RETRIES_PER_CHUNK} failed for "${file.name}":`, err.message);
      if (attempt < MAX_RETRIES_PER_CHUNK) {
        await delay(attempt * 800);
      }
    }
  }

  throw lastError || new Error(`Upload failed for "${file.name}" after ${MAX_RETRIES_PER_CHUNK} attempts.`);
}

function uploadDirectOnce(
  file: File,
  token?: string | null,
  onProgress?: UploadProgressCallback,
  options?: UploadOptions
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media/upload", true);
    xhr.timeout = 120000; // 2 minutes timeout for direct files

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent, e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.url) {
            resolve({
              url: data.url,
              id: data.id,
              provider: data.provider,
              originalName: file.name,
              filename: data.filename,
              originalFilename: data.original_filename || file.name,
              fileSize: data.file_size || file.size,
              compressedUrl: data.compressed_url,
              compressedFilename: data.compressed_filename,
              compressedSize: data.compressed_size,
              thumbnailUrl: data.thumbnail_url,
              thumbnailFilename: data.thumbnail_filename,
              thumbnailSize: data.thumbnail_size,
              itemNumber: data.item_number,
              projectName: data.project_name,
              categoryName: data.category_name,
            });
          } else {
            reject(new Error("Server completed upload but did not return a valid media URL."));
          }
        } catch {
          reject(new Error("Invalid response format received from server."));
        }
      } else {
        const errorMsg = formatUploadError(xhr.status, xhr.responseText);
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error(`Network connection error occurred while uploading "${file.name}".`));
    };

    xhr.ontimeout = () => {
      reject(new Error(`Upload connection timed out for "${file.name}".`));
    };

    const formData = new FormData();
    formData.append("file", file);
    if (options?.projectName) formData.append("projectName", options.projectName);
    if (options?.categoryName) formData.append("categoryName", options.categoryName);
    if (options?.itemType) formData.append("itemType", options.itemType);
    if (options?.itemNumber !== undefined && options?.itemNumber !== null) formData.append("itemNumber", String(options.itemNumber));
    if (options?.useStructuredName) formData.append("useStructuredName", "true");

    xhr.send(formData);
  });
}

async function uploadChunked(
  file: File,
  token: string | null | undefined,
  chunkSize: number,
  totalChunks: number,
  onProgress?: UploadProgressCallback,
  options?: UploadOptions
): Promise<UploadResult> {
  const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  let uploadedBytes = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunkBlob = file.slice(start, end);

    // Upload single chunk with automatic retry on network drops
    await uploadSingleChunkWithRetry(
      uploadId,
      chunkIndex,
      totalChunks,
      file.name,
      chunkBlob,
      token,
      (chunkLoaded) => {
        if (onProgress) {
          const currentTotalLoaded = uploadedBytes + chunkLoaded;
          const percent = Math.min(99, Math.round((currentTotalLoaded / file.size) * 100));
          onProgress(percent, currentTotalLoaded, file.size);
        }
      }
    );

    uploadedBytes += (end - start);
    if (onProgress) {
      const percent = Math.min(99, Math.round((uploadedBytes / file.size) * 100));
      onProgress(percent, uploadedBytes, file.size);
    }
  }

  // Complete chunked upload and trigger storage assembly (with retry)
  let completeData: any = null;
  let completeError: any = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const completeRes = await fetchWithRateLimitRetry("/api/admin/media/upload/chunk-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          uploadId,
          fileName: file.name,
          totalChunks,
          mimeType: file.type || "video/mp4",
          fileSize: file.size
        })
      });

      if (!completeRes.ok) {
        const text = await completeRes.text();
        throw new Error(formatUploadError(completeRes.status, text));
      }

      completeData = await completeRes.json();
      break;
    } catch (err: any) {
      completeError = err;
      console.warn(`[Chunk Assembly] Attempt ${attempt}/3 failed:`, err.message);
      if (attempt < 3) {
        await delay(attempt * 1000);
      }
    }
  }

  if (!completeData) {
    throw completeError || new Error(`Failed to finalize uploaded chunks for "${file.name}".`);
  }

  if (onProgress) {
    onProgress(100, file.size, file.size);
  }

  return {
    url: completeData.url,
    id: completeData.id,
    provider: completeData.provider,
    originalName: file.name
  };
}

async function uploadDirectToConfiguredStorage(
  file: File,
  token?: string | null,
  onProgress?: UploadProgressCallback,
  originalFileName?: string,
): Promise<UploadResult | null> {
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const initResponse = await fetchWithRateLimitRetry("/api/admin/media/upload/direct/init", {
    method: "POST",
    headers,
    body: JSON.stringify({ fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size }),
  });

  // Older/local deployments or a non-R2 provider keep using the legacy path.
  if (initResponse.status === 404) return null;
  const initData = await initResponse.json().catch(() => ({}));
  if (!initResponse.ok) throw new Error(initData.error || "Could not initialize direct bucket upload.");
  if (!initData.directUpload) {
    if (String(initData.provider).toLowerCase() === "appwrite") {
      return uploadDirectlyToAppwrite(file, token, onProgress, originalFileName);
    }
    return null;
  }

  const partSize = 10 * 1024 * 1024; // R2/S3 requires every non-final multipart part to be at least 5 MB.
  const totalParts = Math.ceil(file.size / partSize);
  const completedParts: Array<{ ETag: string; PartNumber: number }> = [];
  let uploadedBytes = 0;

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, file.size);
      const blob = file.slice(start, end);
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES_PER_CHUNK; attempt++) {
        try {
          const signResponse = await fetchWithRateLimitRetry("/api/admin/media/upload/direct/sign-part", {
            method: "POST",
            headers,
            body: JSON.stringify({ fileKey: initData.fileKey, uploadId: initData.uploadId, partNumber }),
          });
          const signData = await signResponse.json().catch(() => ({}));
          if (!signResponse.ok || !signData.url) throw new Error(signData.error || "Could not sign upload part.");
          const etag = await putBlobToSignedUrl(signData.url, blob, (loaded) => {
            onProgress?.(Math.min(99, Math.round(((uploadedBytes + loaded) / file.size) * 100)), uploadedBytes + loaded, file.size);
          });
          completedParts.push({ ETag: etag, PartNumber: partNumber });
          lastError = null;
          break;
        } catch (error: any) {
          lastError = error;
          if (attempt < MAX_RETRIES_PER_CHUNK) await delay(Math.min(3000, 500 * 2 ** (attempt - 1)));
        }
      }
      if (lastError) throw lastError;
      uploadedBytes += blob.size;
      onProgress?.(Math.min(99, Math.round((uploadedBytes / file.size) * 100)), uploadedBytes, file.size);
    }

    const completeResponse = await fetchWithRateLimitRetry("/api/admin/media/upload/direct/complete", {
      method: "POST",
      headers,
      body: JSON.stringify({ fileKey: initData.fileKey, uploadId: initData.uploadId, parts: completedParts, fileName: file.name, fileSize: file.size }),
    });
    const completeData = await completeResponse.json().catch(() => ({}));
    if (!completeResponse.ok || !completeData.url) throw new Error(completeData.error || "Could not finalize direct bucket upload.");
    onProgress?.(100, file.size, file.size);
    return { url: completeData.url, id: completeData.id, provider: completeData.provider, originalName: originalFileName || file.name, filename: file.name, fileSize: file.size };
  } catch (error) {
    fetch("/api/admin/media/upload/direct/abort", {
      method: "POST",
      headers,
      body: JSON.stringify({ fileKey: initData.fileKey, uploadId: initData.uploadId }),
    }).catch(() => undefined);
    throw error;
  }
}

async function uploadDirectlyToAppwrite(
  file: File,
  token?: string | null,
  onProgress?: UploadProgressCallback,
  originalFileName?: string,
): Promise<UploadResult> {
  const authHeaders = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { ID, Permission, Role } = await import("appwrite");
  let uploadedFileId: string | null = null;

  try {
    const { storage, sessionData } = await getReusableAppwriteSession(authHeaders);

    const uploaded = await storage.createFile({
      bucketId: sessionData.bucketId,
      fileId: ID.unique(),
      file,
      permissions: [Permission.read(Role.any()), Permission.delete(Role.user(sessionData.userId))],
      onProgress: (progress) => {
        const loaded = Number(progress.sizeUploaded || 0);
        onProgress?.(Math.min(99, Math.round(Number(progress.progress || 0))), loaded, file.size);
      },
    });
    uploadedFileId = uploaded.$id;

    const registerResponse = await fetchWithRateLimitRetry("/api/admin/media/upload/appwrite/register", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ fileId: uploaded.$id, fileName: originalFileName || file.name, fileSize: file.size, storedFileName: file.name }),
    });
    const registered = await registerResponse.json().catch(() => ({}));
    if (!registerResponse.ok || !registered.url) throw new Error(registered.error || "The Appwrite file was uploaded but could not be registered.");
    onProgress?.(100, file.size, file.size);
    return { url: registered.url, id: registered.id, provider: "appwrite", originalName: originalFileName || file.name, filename: file.name, fileSize: file.size };
  } catch (error: any) {
    if (uploadedFileId) {
      const cached = appwriteSessionCache;
      if (cached) await cached.storage.deleteFile({ bucketId: cached.sessionData.bucketId, fileId: uploadedFileId }).catch(() => undefined);
    }
    if (Number(error?.code) === 401 || Number(error?.code) === 403) {
      appwriteSessionCache = null;
      throw new Error(`${error.message} Check that the bucket grants CREATE permission to label:storageuploader and that the domain is registered as an Appwrite Web platform.`);
    }
    throw error;
  }
}

async function getReusableAppwriteSession(authHeaders: Record<string, string>) {
  const authKey = authHeaders.Authorization || "anonymous";
  if (appwriteSessionCache && appwriteSessionCache.authKey === authKey && appwriteSessionCache.expiresAt > Date.now()) return appwriteSessionCache;
  if (appwriteSessionCache?.authKey !== authKey) appwriteSessionCache = null;
  if (appwriteSessionPromise) return appwriteSessionPromise;

  appwriteSessionPromise = (async () => {
    const sessionResponse = await fetchWithRateLimitRetry("/api/admin/media/upload/appwrite/session", { method: "POST", headers: authHeaders });
    const sessionData = await sessionResponse.json().catch(() => ({}));
    if (!sessionResponse.ok) throw new Error(sessionData.error || "Could not authorize direct Appwrite upload.");

    const { Client, Storage } = await import("appwrite");
    const client = new Client().setEndpoint(sessionData.endpoint).setProject(sessionData.projectId);
    const storage = new Storage(client);
    // The Server SDK already created this session with the API key. Setting its
    // secret avoids the rate-limited browser Account.createSession endpoint.
    client.setSession(sessionData.secret);

    appwriteSessionCache = { client, account: null, storage, sessionData, expiresAt: Date.now() + APPWRITE_SESSION_REUSE_MS, authKey };
    return appwriteSessionCache;
  })();

  try {
    return await appwriteSessionPromise;
  } finally {
    appwriteSessionPromise = null;
  }
}

function putBlobToSignedUrl(url: string, blob: Blob, onProgress?: (loaded: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.timeout = 10 * 60 * 1000;
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress?.(event.loaded); };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(`R2 rejected upload part with HTTP ${xhr.status}.`));
      const etag = xhr.getResponseHeader("ETag");
      if (!etag) return reject(new Error("R2 did not expose the ETag response header. Add ETag to the bucket CORS ExposeHeaders setting."));
      resolve(etag);
    };
    xhr.onerror = () => reject(new Error("Direct connection to the R2 bucket failed. Check the bucket CORS configuration."));
    xhr.ontimeout = () => reject(new Error("Direct R2 upload part timed out."));
    xhr.send(blob);
  });
}

/**
 * Uploads a single chunk with automatic retry mechanism for network drops
 */
async function uploadSingleChunkWithRetry(
  uploadId: string,
  chunkIndex: number,
  totalChunks: number,
  fileName: string,
  chunkBlob: Blob,
  token?: string | null,
  onChunkProgress?: (loaded: number) => void
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES_PER_CHUNK; attempt++) {
    try {
      await uploadSingleChunkAttempt(
        uploadId,
        chunkIndex,
        totalChunks,
        fileName,
        chunkBlob,
        token,
        onChunkProgress
      );
      return; // Succeeded!
    } catch (err: any) {
      lastError = err;
      console.warn(
        `[Chunk Upload] Chunk ${chunkIndex + 1}/${totalChunks} attempt ${attempt}/${MAX_RETRIES_PER_CHUNK} failed:`,
        err.message
      );

      if (attempt < MAX_RETRIES_PER_CHUNK) {
        // Exponential backoff: 500ms, 1200ms, 2500ms
        const backoffMs = Math.min(3000, 500 * Math.pow(2, attempt - 1));
        await delay(backoffMs);
      }
    }
  }

  throw lastError || new Error(`Network error while uploading chunk ${chunkIndex + 1}/${totalChunks}.`);
}

function uploadSingleChunkAttempt(
  uploadId: string,
  chunkIndex: number,
  totalChunks: number,
  fileName: string,
  chunkBlob: Blob,
  token?: string | null,
  onChunkProgress?: (loaded: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media/upload/chunk", true);
    xhr.timeout = 90000; // 90 seconds timeout per chunk

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onChunkProgress) {
        onChunkProgress(e.loaded);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        const errorMsg = formatUploadError(xhr.status, xhr.responseText);
        reject(new Error(`Chunk ${chunkIndex + 1}/${totalChunks} failed (HTTP ${xhr.status}): ${errorMsg}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error(`Connection reset or network drop while uploading chunk ${chunkIndex + 1}/${totalChunks}.`));
    };

    xhr.ontimeout = () => {
      reject(new Error(`Upload timed out for chunk ${chunkIndex + 1}/${totalChunks}.`));
    };

    const formData = new FormData();
    formData.append("uploadId", uploadId);
    formData.append("chunkIndex", String(chunkIndex));
    formData.append("totalChunks", String(totalChunks));
    formData.append("fileName", fileName);
    formData.append("chunk", chunkBlob, `${fileName}.part${chunkIndex}`);

    xhr.send(formData);
  });
}

function formatUploadError(status: number, responseText: string): string {
  try {
    const data = JSON.parse(responseText);
    if (data.error) return data.error;
  } catch {}

  if (status === 413) {
    return "HTTP 413 (Payload Too Large): The server or storage provider rejected the upload size. If using self-hosted Appwrite, verify that `_APP_STORAGE_LIMIT=10737418240` (10 GB) is set in your Appwrite .env and reverse proxy `client_max_body_size` is set to 10G.";
  }

  if (status === 504 || status === 502) {
    return "Gateway Timeout / Bad Gateway: The reverse proxy or storage backend took too long to process the upload.";
  }

  if (status === 401 || status === 403) {
    return "Authentication or authorization error. Please ensure you are logged in with admin privileges.";
  }

  return `Upload failed with HTTP ${status}${responseText ? `: ${responseText.slice(0, 150)}` : ""}`;
}
