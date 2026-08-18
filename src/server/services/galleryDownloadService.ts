import path from "path";
import sharp from "sharp";
import { downloadOrReadMediaBuffer } from "./mediaProcessingService.js";

export type DownloadableGalleryItem = {
  url: string;
  type: "image" | "video";
  title?: string;
};

export function parseGalleryItems(raw: unknown): DownloadableGalleryItem[] {
  let value: any = raw;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { value = []; }
  }
  if (!Array.isArray(value)) return [];
  return value.map((item: any): DownloadableGalleryItem => {
    if (typeof item === "string") return { url: item, type: /\.(mp4|mov|webm)(\?|$)/i.test(item) ? "video" : "image" };
    const url = String(item?.url || item?.src || "");
    const hintedType = String(item?.type || item?.media_type || "").toLowerCase();
    const type: "image" | "video" = hintedType === "video" || /\.(mp4|mov|webm)(\?|$)/i.test(url) ? "video" : "image";
    return { url, type, title: item?.title };
  }).filter((item) => Boolean(item.url));
}

const extensionFor = (mime: string, url: string) => {
  const known: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm" };
  return known[mime.split(";")[0].toLowerCase()] || path.extname(url.split("?")[0]) || ".bin";
};

function createContinuousWatermark(width: number, height: number): Buffer {
  // A dense, diagonal marketplace-style pattern protects the full frame while
  // remaining transparent enough for clients to evaluate the photograph.
  const cellWidth = Math.max(360, Math.min(680, Math.round(width * 0.34)));
  const cellHeight = Math.max(170, Math.round(cellWidth * 0.43));
  const fontSize = Math.max(24, Math.min(48, Math.round(cellWidth * 0.072)));
  const mark = "Courtesy of SPS Studio";
  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="wm-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur"/>
          <feOffset dy="1" result="offset"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="wm" width="${cellWidth}" height="${cellHeight}" patternUnits="userSpaceOnUse" patternTransform="rotate(-27)">
          <text x="${cellWidth / 2}" y="${cellHeight / 2}"
            dominant-baseline="middle" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="0.5"
            fill="rgba(255,255,255,0.40)" stroke="rgba(8,20,32,0.42)" stroke-width="1.4"
            paint-order="stroke fill" filter="url(#wm-shadow)">${mark}</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wm)"/>
    </svg>
  `);
}

export async function prepareGalleryFile(item: DownloadableGalleryItem, index: number, unlocked: boolean, forceJpeg = false) {
  const source = await downloadOrReadMediaBuffer(item.url);
  let buffer = source.buffer;
  let mimeType = source.mimeType;
  if (!unlocked && item.type === "image") {
    const metadata = await sharp(buffer).metadata();
    const width = Math.max(600, metadata.width || 1600);
    const height = metadata.height || Math.round(width * .67);
    const svg = createContinuousWatermark(width, height);
    buffer = await sharp(buffer).composite([{ input: svg, gravity: "center" }]).jpeg({ quality: 90 }).toBuffer();
    mimeType = "image/jpeg";
  } else if (forceJpeg && item.type === "image" && mimeType.split(";")[0].toLowerCase() !== "image/jpeg") {
    buffer = await sharp(buffer).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    mimeType = "image/jpeg";
  }
  const base = (item.title || `media-${String(index + 1).padStart(3, "0")}`).replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || `media-${index + 1}`;
  return { name: `${base}${extensionFor(mimeType, item.url)}`, buffer, mimeType };
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (data: Buffer) => {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

export function createZip(files: Array<{ name: string; buffer: Buffer }>): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(file.buffer);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x0800, 6);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(file.buffer.length, 18); header.writeUInt32LE(file.buffer.length, 22); header.writeUInt16LE(name.length, 26);
    local.push(header, name, file.buffer);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(file.buffer.length, 20); entry.writeUInt32LE(file.buffer.length, 24); entry.writeUInt16LE(name.length, 28); entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += header.length + name.length + file.buffer.length;
  }
  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}
