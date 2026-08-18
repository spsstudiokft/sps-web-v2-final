import {
  S3Client,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import fs from "fs";
import { db } from "../../db.js";

export async function getR2Config() {
  let accountId = process.env.R2_ACCOUNT_ID;
  let accessKeyId = process.env.R2_ACCESS_KEY_ID;
  let secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  let bucketName = process.env.R2_BUCKET_NAME;
  let publicDomain = process.env.R2_PUBLIC_DOMAIN;

  try {
    const res = await db.execute({
      sql: `SELECT key, value FROM settings WHERE key IN ('r2_account_id', 'r2_access_key_id', 'r2_secret_access_key', 'r2_bucket_name', 'r2_public_domain')`,
      args: []
    });
    for (const row of res.rows) {
      const val = typeof row.value === 'string' ? row.value.trim() : '';
      if (val) {
        if (row.key === 'r2_account_id') accountId = val;
        else if (row.key === 'r2_access_key_id') accessKeyId = val;
        else if (row.key === 'r2_secret_access_key') secretAccessKey = val;
        else if (row.key === 'r2_bucket_name') bucketName = val;
        else if (row.key === 'r2_public_domain') publicDomain = val;
      }
    }
  } catch (err) {
    console.warn("Could not load R2 settings from database:", err);
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain };
}

function createR2Client(config: Awaited<ReturnType<typeof getR2Config>>) {
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
    throw new Error("R2 settings are incomplete (missing account ID, access key, secret key, or bucket name).");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
}

function buildPublicUrl(config: Awaited<ReturnType<typeof getR2Config>>, fileKey: string) {
  const domain = String(config.publicDomain || "").replace(/\/+$/, "");
  return domain
    ? `${/^https?:\/\//i.test(domain) ? domain : `https://${domain}`}/${fileKey}`
    : `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${fileKey}`;
}

export async function initiateR2MultipartUpload(originalName: string, contentType: string) {
  const config = await getR2Config();
  const client = createR2Client(config);
  const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const fileKey = `${crypto.randomUUID()}-${safeName}`;
  const result = await (client as any).send(new CreateMultipartUploadCommand({
    Bucket: config.bucketName,
    Key: fileKey,
    ContentType: contentType || "application/octet-stream",
  }));
  if (!result.UploadId) throw new Error("R2 did not return a multipart upload ID.");
  return { uploadId: result.UploadId, fileKey, bucket: config.bucketName!, publicUrl: buildPublicUrl(config, fileKey) };
}

export async function signR2MultipartPart(fileKey: string, uploadId: string, partNumber: number) {
  const config = await getR2Config();
  const client = createR2Client(config);
  return getSignedUrl(client, new UploadPartCommand({
    Bucket: config.bucketName,
    Key: fileKey,
    UploadId: uploadId,
    PartNumber: partNumber,
  }), { expiresIn: 15 * 60 });
}

export async function completeR2MultipartUpload(fileKey: string, uploadId: string, parts: Array<{ ETag: string; PartNumber: number }>) {
  const config = await getR2Config();
  const client = createR2Client(config);
  await (client as any).send(new CompleteMultipartUploadCommand({
    Bucket: config.bucketName,
    Key: fileKey,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber) },
  }));
  return { provider: "r2", bucket: config.bucketName!, file_key: fileKey, public_url: buildPublicUrl(config, fileKey) };
}

export async function abortR2MultipartUpload(fileKey: string, uploadId: string) {
  const config = await getR2Config();
  const client = createR2Client(config);
  await (client as any).send(new AbortMultipartUploadCommand({ Bucket: config.bucketName, Key: fileKey, UploadId: uploadId }));
}

export async function uploadToR2(file: Express.Multer.File) {
  const { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain } = await getR2Config();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("R2 settings are incomplete (missing account ID, access key, secret key, or bucket name).");
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const fileKey = (file as any).customFileKey || file.filename || `${crypto.randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

  // Stream directly from disk if available to support large files up to 10GB+ without high memory usage
  const bodyStream = file.path && fs.existsSync(file.path)
    ? fs.createReadStream(file.path)
    : file.buffer;

  if (!bodyStream) {
    throw new Error("No file data found for upload.");
  }

  const parallelUpload = new Upload({
    client: s3,
    params: {
      Bucket: bucketName,
      Key: fileKey,
      Body: bodyStream,
      ContentType: file.mimetype || "application/octet-stream",
    },
    // 20MB multipart chunk size, 4 concurrent upload threads for high throughput
    partSize: 20 * 1024 * 1024,
    queueSize: 4,
    leavePartsOnError: false,
  });

  await parallelUpload.done();

  // Clean up temporary disk file
  if (file.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch (e) {
      console.warn("Failed to delete temp file:", file.path, e);
    }
  }

  const publicUrl = buildPublicUrl({ accountId, accessKeyId, secretAccessKey, bucketName, publicDomain }, fileKey);

  return {
    provider: "r2",
    bucket: bucketName,
    file_key: fileKey,
    public_url: publicUrl,
    original_name: file.originalname,
  };
}

export async function deleteFromR2(fileKey: string, bucketName: string) {
    const { accountId, accessKeyId, secretAccessKey } = await getR2Config();

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("R2 storage is not fully configured; refusing to report the object as deleted.");
    }

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    try {
      await (s3 as any).send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
        })
      );
    } catch (err: any) {
      console.warn(`Failed to delete file ${fileKey} from R2 bucket ${bucketName}:`, err.message);
      throw err;
    }
}
