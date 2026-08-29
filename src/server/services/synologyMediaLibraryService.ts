import { db } from "../../db.js";

type SynologyFile = { name: string; path: string; isDir: boolean; size?: number; modifiedAt?: number };

const allowedMediaRoles = new Set(["superadmin", "admin", "videoeditor"]);

function normalizedRole(value: unknown) { return String(value || "").toLowerCase().replace(/[_-]/g, ""); }
function configuredBaseUrl() {
  const raw = String(process.env.SYNOLOGY_MEDIA_BASE_URL || "").trim();
  if (!raw) throw new Error("A Synology médiatár nincs konfigurálva.");
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("A Synology médiatárhoz HTTPS kapcsolat szükséges.");
  return url.toString().replace(/\/$/, "");
}
async function ensureSynologyMediaAccessTable() {
  await db.execute(`CREATE TABLE IF NOT EXISTS synology_media_editor_access (
    user_id TEXT PRIMARY KEY,
    roots_json TEXT NOT NULL,
    updated_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
}

function normalizeRoots(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((entry) => String(entry || "").trim().replace(/\\/g, "/").replace(/\/+/g, "/"))
    .filter((entry) => entry.startsWith("/") && !entry.includes("/../") && !entry.endsWith("/..")))];
}

async function configuredRoots(user: { id?: string; email?: string; role?: string }) {
  const role = normalizedRole(user.role);
  if (!allowedMediaRoles.has(role)) throw new Error("Nincs jogosultsága a közös médiatárhoz.");
  const sharedRoot = String(process.env.SYNOLOGY_MEDIA_SHARED_ROOT || "").trim();
  if (!sharedRoot.startsWith("/")) throw new Error("A Synology közös médiatár gyökérmappája nincs konfigurálva.");
  if (role !== "videoeditor") return [sharedRoot];
  await ensureSynologyMediaAccessTable();
  const stored = await db.execute({ sql: "SELECT roots_json FROM synology_media_editor_access WHERE user_id = ? LIMIT 1", args: [String(user.id || "")] });
  if (stored.rows.length) {
    try {
      const roots = normalizeRoots(JSON.parse(String(stored.rows[0].roots_json || "[]")));
      if (!roots.length) throw new Error("Ehhez a vágó fiókhoz nincs Synology médiamappa hozzárendelve.");
      return roots;
    } catch (error: any) {
      if (String(error?.message || "").includes("nincs Synology médiamappa")) throw error;
      throw new Error("A vágói médiatár-mappák mentett beállítása érvénytelen.");
    }
  }
  let mapping: Record<string, string[]> = {};
  try { mapping = JSON.parse(String(process.env.SYNOLOGY_MEDIA_EDITOR_ROOTS_JSON || "{}")); } catch { throw new Error("A vágói médiatár-mappák konfigurációja érvénytelen."); }
  const roots = normalizeRoots([...(mapping[String(user.id || "")] || []), ...(mapping[String(user.email || "").toLowerCase()] || [])]);
  if (!roots.length) throw new Error("Ehhez a vágó fiókhoz nincs Synology médiamappa hozzárendelve.");
  return [...new Set(roots)];
}
function resolvedPath(roots: string[], candidate?: string) {
  const path = String(candidate || roots[0]).trim().replace(/\\/g, "/").replace(/\/+/g, "/");
  if (!path.startsWith("/") || path.includes("/../") || path.endsWith("/..") || !roots.some((root) => path === root || path.startsWith(`${root}/`))) throw new Error("A kért mappa nem érhető el.");
  return path;
}
async function synologyRequest(baseUrl: string, params: Record<string, string>, sid?: string) {
  const query = new URLSearchParams({ ...params, ...(sid ? { _sid: sid } : {}) });
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/webapi/entry.cgi?${query.toString()}`, { signal: AbortSignal.timeout(8_000) });
  } catch (error: any) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") throw new Error("A Synology File Station nem válaszolt időben. Ellenőrizze a NAS külső elérhetőségét és a mappa méretét.");
    throw new Error("A Synology File Station hálózati kapcsolata sikertelen.");
  }
  if (!response.ok) throw new Error("A Synology szerver nem válaszol megfelelően.");
  const body = await response.json() as any;
  if (!body?.success) throw new Error("A Synology API elutasította a kérést.");
  return body.data;
}
async function withSynologySession<T>(run: (baseUrl: string, sid: string) => Promise<T>) {
  const baseUrl = configuredBaseUrl();
  const account = String(process.env.SYNOLOGY_MEDIA_USERNAME || "");
  const password = String(process.env.SYNOLOGY_MEDIA_PASSWORD || "");
  if (!account || !password) throw new Error("A Synology szolgáltatási fiók nincs konfigurálva.");
  const auth = await synologyRequest(baseUrl, { api: "SYNO.API.Auth", version: "6", method: "login", account, passwd: password, session: "SPSMediaLibrary", format: "sid" });
  const sid = String(auth?.sid || "");
  if (!sid) throw new Error("A Synology bejelentkezés sikertelen.");
  try { return await run(baseUrl, sid); }
  finally { await synologyRequest(baseUrl, { api: "SYNO.API.Auth", version: "6", method: "logout", session: "SPSMediaLibrary" }, sid).catch(() => undefined); }
}

export async function synologyMediaAccess(user: { id?: string; email?: string; role?: string }) {
  const roots = await configuredRoots(user);
  return { roots, role: normalizedRole(user.role) };
}

export async function browseSynologyMedia(user: { id?: string; email?: string; role?: string }, requestedPath?: string) {
  const { roots } = await synologyMediaAccess(user);
  const folderPath = resolvedPath(roots, requestedPath);
  return withSynologySession(async (baseUrl, sid) => {
    const data = await synologyRequest(baseUrl, { api: "SYNO.FileStation.List", version: "2", method: "list", folder_path: folderPath, offset: "0", limit: "200", sort_by: "name", sort_direction: "asc", additional: JSON.stringify(["real_path", "size", "time"]) }, sid);
    const files: SynologyFile[] = (data?.files || []).map((file: any) => ({ name: String(file.name || ""), path: String(file.path || ""), isDir: Boolean(file.isdir), size: Number(file.additional?.size || 0), modifiedAt: Number(file.additional?.time?.mtime || 0) }));
    return { path: folderPath, roots, files, total: Number(data?.total || files.length), isTruncated: Number(data?.total || files.length) > files.length };
  });
}

export async function getSynologyEditorAccesses() {
  await ensureSynologyMediaAccessTable();
  const result = await db.execute(`SELECT u.id, u.email, COALESCE(NULLIF(TRIM(u.name), ''), u.email) AS name,
      a.roots_json, a.updated_at
    FROM users u
    LEFT JOIN synology_media_editor_access a ON a.user_id = u.id
    WHERE LOWER(REPLACE(REPLACE(TRIM(COALESCE(u.admin_role, u.role, '')), '_', ''), '-', '')) = 'videoeditor'
    ORDER BY name COLLATE NOCASE, u.email COLLATE NOCASE`);
  return result.rows.map((row: any) => {
    let roots: string[] = [];
    let hasSavedAccess = row.roots_json !== null && row.roots_json !== undefined;
    try { if (hasSavedAccess) roots = normalizeRoots(JSON.parse(String(row.roots_json))); } catch { hasSavedAccess = false; }
    return { id: String(row.id), email: String(row.email), name: String(row.name || row.email), roots, hasSavedAccess, updatedAt: row.updated_at || null };
  });
}

export async function saveSynologyEditorAccess(userId: string, rootsInput: unknown, updatedBy?: string) {
  const roots = normalizeRoots(rootsInput);
  const editor = await db.execute({ sql: `SELECT id FROM users WHERE id = ? AND LOWER(REPLACE(REPLACE(TRIM(COALESCE(admin_role, role, '')), '_', ''), '-', '')) = 'videoeditor' LIMIT 1`, args: [userId] });
  if (!editor.rows.length) throw new Error("A kiválasztott felhasználó nem vágó szerepkörű.");
  await ensureSynologyMediaAccessTable();
  await db.execute({ sql: "INSERT OR REPLACE INTO synology_media_editor_access (user_id, roots_json, updated_by, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)", args: [userId, JSON.stringify(roots), updatedBy || null] });
  return roots;
}

export async function clearSynologyEditorAccess(userId: string) {
  await ensureSynologyMediaAccessTable();
  await db.execute({ sql: "DELETE FROM synology_media_editor_access WHERE user_id = ?", args: [userId] });
}
