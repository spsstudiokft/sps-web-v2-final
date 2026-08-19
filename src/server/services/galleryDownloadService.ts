import path from "path";
import sharp from "sharp";
import { downloadOrReadMediaBuffer } from "./mediaProcessingService.js";
import { db } from "../../db.js";

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

const WATERMARK_GLYPHS: Record<string, string[]> = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
};

function createWatermarkPath(label: string) {
  const glyphWidth = 5;
  const glyphGap = 1.5;
  const pixelSize = 0.84;
  const commands: string[] = [];
  let cursor = 0;

  for (const character of label.toUpperCase()) {
    const glyph = WATERMARK_GLYPHS[character] || WATERMARK_GLYPHS[" "];
    glyph.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        if (row[x] === "1") commands.push(`M${cursor + x} ${y}h${pixelSize}v${pixelSize}h-${pixelSize}z`);
      }
    });
    cursor += glyphWidth + glyphGap;
  }

  return { path: commands.join(""), width: Math.max(1, cursor - glyphGap), height: 7 };
}

let watermarkLogoCache: { expiresAt: number; url: string; buffer: Buffer | null } | null = null;

async function loadWatermarkLogo() {
  const now = Date.now();
  if (watermarkLogoCache && watermarkLogoCache.expiresAt > now) return watermarkLogoCache.buffer;

  try {
    const result = await db.execute(`SELECT key, value FROM settings
      WHERE key IN ('logo_header_dark', 'logo_header_light')`);
    const settings = Object.fromEntries(result.rows.map((row: any) => [String(row.key), String(row.value || "")]));
    const url = String(settings.logo_header_dark || settings.logo_header_light || "").trim();
    if (!url) {
      watermarkLogoCache = { expiresAt: now + 60_000, url: "", buffer: null };
      return null;
    }
    if (watermarkLogoCache?.url === url && watermarkLogoCache.buffer) {
      watermarkLogoCache.expiresAt = now + 5 * 60_000;
      return watermarkLogoCache.buffer;
    }

    const source = await downloadOrReadMediaBuffer(url);
    watermarkLogoCache = { expiresAt: now + 5 * 60_000, url, buffer: source.buffer };
    return source.buffer;
  } catch (error) {
    console.warn("Watermark logo could not be loaded; using text-only watermark", error);
    watermarkLogoCache = { expiresAt: now + 30_000, url: "", buffer: null };
    return null;
  }
}

async function createContinuousWatermark(width: number, height: number): Promise<Buffer> {
  const cellWidth = Math.max(360, Math.min(680, Math.round(width * 0.34)));
  const cellHeight = Math.max(170, Math.round(cellWidth * 0.43));
  const fontSize = Math.max(24, Math.min(48, Math.round(cellWidth * 0.072)));
  const mark = createWatermarkPath("Courtesy of SPS Studio");
  const scale = Math.min(fontSize / mark.height, (cellWidth * 0.78) / mark.width);
  const textWidth = mark.width * scale;
  let logoMarkup = "";
  let logoWidth = 0;
  const logoSource = await loadWatermarkLogo();
  if (logoSource) {
    try {
      const targetHeight = Math.max(30, Math.round(fontSize * 1.05));
      const renderedLogo = await sharp(logoSource, { failOn: "none" })
        .resize({ width: Math.round(cellWidth * 0.22), height: targetHeight, fit: "inside", withoutEnlargement: false })
        .png()
        .toBuffer({ resolveWithObject: true });
      logoWidth = renderedLogo.info.width;
      const logoHeight = renderedLogo.info.height;
      const padX = Math.max(6, Math.round(fontSize * 0.18));
      const padY = Math.max(5, Math.round(fontSize * 0.14));
      logoMarkup = `<g transform="translate(LOGO_X ${-logoHeight / 2})">
        <rect x="${-padX}" y="${-padY}" width="${logoWidth + padX * 2}" height="${logoHeight + padY * 2}" rx="${Math.round((logoHeight + padY * 2) * 0.28)}"
          fill="#061522" fill-opacity="0.58" stroke="#ffffff" stroke-opacity="0.68" stroke-width="1.25"/>
        <image width="${logoWidth}" height="${logoHeight}" href="data:image/png;base64,${renderedLogo.data.toString("base64")}"/>
      </g>`;
    } catch (error) {
      console.warn("Watermark logo could not be rasterized; using text-only watermark", error);
    }
  }
  const logoGap = logoMarkup ? Math.max(18, Math.round(fontSize * 0.55)) : 0;
  const totalWidth = logoWidth + logoGap + textWidth;
  const logoX = -totalWidth / 2;
  const textX = logoX + logoWidth + logoGap;
  const marks: string[] = [];
  for (let y = -cellHeight; y < height + cellHeight; y += cellHeight) {
    for (let x = -cellWidth; x < width + cellWidth; x += cellWidth) {
      const offset = (Math.floor(y / cellHeight) % 2) * (cellWidth / 2);
      const centerX = Math.round(x + offset + cellWidth / 2);
      const centerY = Math.round(y + cellHeight / 2);
      marks.push(`<g transform="translate(${centerX} ${centerY}) rotate(-27)">
        ${logoMarkup.replace("LOGO_X", String(logoX))}
        <path d="${mark.path}" transform="translate(${textX} ${-(mark.height * scale) / 2}) scale(${scale})"
          fill="#ffffff" fill-opacity="0.55" stroke="#061522" stroke-opacity="0.78" stroke-width="0.28" stroke-linejoin="round"/>
      </g>`);
    }
  }
  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#061522" fill-opacity="0.035"/>
      ${marks.join("\n")}
    </svg>
  `);
}

export async function prepareGalleryFile(item: DownloadableGalleryItem, index: number, unlocked: boolean, forceJpeg = false) {
  const source = await downloadOrReadMediaBuffer(item.url);
  let buffer = source.buffer;
  let mimeType = source.mimeType;
  if (!unlocked && item.type === "image") {
    // Normalize EXIF rotation before sizing the overlay. This also avoids
    // platform-specific SVG/composite differences between local Sharp and the
    // Linux binary used by Vercel Functions.
    buffer = await sharp(buffer, { failOn: "none" }).rotate().jpeg({ quality: 90, progressive: true, mozjpeg: true }).toBuffer();
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 1600;
    const height = metadata.height || Math.round(width * .67);
    const svg = await createContinuousWatermark(width, height);
    buffer = await sharp(buffer).composite([{ input: svg, gravity: "center" }]).jpeg({ quality: 90, progressive: true, mozjpeg: true }).toBuffer();
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
