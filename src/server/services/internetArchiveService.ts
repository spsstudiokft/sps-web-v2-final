import { db } from "../../db.js";

const WAYBACK_SAVE_ENDPOINT = "https://web.archive.org/save/";

function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (url.protocol === "https:" || url.protocol === "http:") &&
      host !== "localhost" && host !== "127.0.0.1" && host !== "::1" && !host.endsWith(".local");
  } catch { return false; }
}

export async function archivePublishedListing(listingId: string, appOrigin: string): Promise<{ attempted: boolean; archived: boolean; archiveUrl?: string; error?: string }> {
  const targetUrl = `${appOrigin.replace(/\/$/, "")}/properties/${encodeURIComponent(listingId)}`;
  if (!isPublicHttpUrl(targetUrl)) return { attempted: false, archived: false, error: "A local development URL cannot be archived." };

  try {
    const setting = await db.execute({ sql: "SELECT value FROM settings WHERE key = 'internet_archive_enabled' LIMIT 1", args: [] });
    if (String(setting.rows[0]?.value ?? "0") !== "1") return { attempted: false, archived: false };

    const response = await fetch(`${WAYBACK_SAVE_ENDPOINT}${encodeURIComponent(targetUrl)}`, {
      method: "POST", redirect: "manual", signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "SPS-Studio-Listing-Archive/1.0" }
    });
    const archivePath = response.headers.get("content-location") || response.headers.get("location") || "";
    const archiveUrl = archivePath.startsWith("http") ? archivePath : (archivePath ? `https://web.archive.org${archivePath}` : undefined);
    const archived = response.ok || response.status === 301 || response.status === 302;
    return archived ? { attempted: true, archived: true, archiveUrl } : { attempted: true, archived: false, error: `Internet Archive returned HTTP ${response.status}.` };
  } catch (error: any) {
    return { attempted: true, archived: false, error: error?.message || "Internet Archive request failed." };
  }
}
