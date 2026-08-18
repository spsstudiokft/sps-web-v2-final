import "dotenv/config";
import path from "path";
import { db } from "../src/db.js";
import { validateStructuredFilename } from "../src/server/services/mediaProcessingService.js";

const galleries = await db.execute("SELECT id, image_urls FROM portfolio_items");
const uploads = await db.execute("SELECT public_url, original_name, file_key, provider FROM media_uploads");
const uploadByUrl = new Map(uploads.rows.map((row: any) => [String(row.public_url), row]));
const issues: Array<{ galleryId: string; itemId: string; issue: string }> = [];
let total = 0;
let structured = 0;

for (const gallery of galleries.rows as any[]) {
  let items: any[] = [];
  try { items = JSON.parse(String(gallery.image_urls || "[]")); } catch { issues.push({ galleryId: gallery.id, itemId: "-", issue: "invalid image_urls JSON" }); continue; }
  for (const [index, raw] of items.entries()) {
    if (!raw || typeof raw === "string") continue;
    total++;
    const itemId = String(raw.id || index);
    const filename = String(raw.filename || "");
    if (!validateStructuredFilename(filename).valid) issues.push({ galleryId: gallery.id, itemId, issue: `unstructured filename: ${filename || "missing"}` });
    else structured++;
    if (raw.original_filename && String(raw.original_filename) !== filename) issues.push({ galleryId: gallery.id, itemId, issue: `original_filename differs: ${raw.original_filename}` });
    const upload: any = uploadByUrl.get(String(raw.url || ""));
    if (upload && String(upload.original_name || "") !== filename) issues.push({ galleryId: gallery.id, itemId, issue: `media_uploads.original_name differs: ${upload.original_name}` });
    if (raw.url && (String(raw.url).includes("/uploads/") || upload?.provider === "r2")) {
      const keyName = path.basename(String(upload?.file_key || String(raw.url).split("?")[0]));
      if (keyName !== filename) issues.push({ galleryId: gallery.id, itemId, issue: `bucket key differs: ${keyName}` });
    }
  }
}

console.log(JSON.stringify({ galleries: galleries.rows.length, totalMediaItems: total, structuredFilenames: structured, issueCount: issues.length, issues: issues.slice(0, 100) }, null, 2));
