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
  itemNumber?: string;
  projectName?: string;
  categoryName?: string;
}

// 2.5 MB per chunk: optimal size that prevents reverse proxy timeouts and HTTP/2 socket drops
const DEFAULT_CHUNK_SIZE = 2.5 * 1024 * 1024;
const MAX_RETRIES_PER_CHUNK = 4;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function uploadMediaFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const token = options.token;
  const onProgress = options.onProgress;
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const totalSize = file.size;

  // For smaller files (<= 2.5 MB), direct upload is faster, but chunked is used for everything else
  const totalChunks = Math.ceil(totalSize / chunkSize);

  if (totalChunks <= 1) {
    return uploadDirectWithRetry(file, token, onProgress, options);
  }

  return uploadChunked(file, token, chunkSize, totalChunks, onProgress, options);
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
      const completeRes = await fetch("/api/admin/media/upload/chunk-complete", {
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
