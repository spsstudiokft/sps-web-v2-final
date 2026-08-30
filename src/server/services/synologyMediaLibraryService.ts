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
async function ensureSynologyMediaFileRequestTable() {
  await db.execute(`CREATE TABLE IF NOT EXISTS synology_media_file_requests (
    folder_path TEXT PRIMARY KEY,
    request_url TEXT NOT NULL,
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
type SynologyResponse = { data: any };
type SynologyUploadFile = { buffer: Buffer; originalname: string; mimetype?: string };

async function synologyRequest(baseUrl: string, params: Record<string, string>, sid?: string, apiPath = "entry.cgi"): Promise<SynologyResponse> {
  const form = new URLSearchParams({ ...params, ...(sid ? { _sid: sid } : {}) });
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/webapi/${apiPath.replace(/^\/+/, "")}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error: any) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") throw new Error("A Synology File Station nem válaszolt időben. Ellenőrizze a NAS külső elérhetőségét és a mappa méretét.");
    throw new Error("A Synology File Station hálózati kapcsolata sikertelen.");
  }
  if (!response.ok) {
    const responseText = (await response.text().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 240);
    throw new Error(`A Synology szerver HTTP ${response.status} választ adott${responseText ? `: ${responseText}` : ""}`);
  }
  let body: any;
  try { body = await response.json(); }
  catch { throw new Error("A Synology szerver nem JSON API-választ adott."); }
  if (!body?.success) {
    const code = body?.error?.code;
    const details = Array.isArray(body?.error?.errors) ? body.error.errors.map((item: any) => item?.code).filter(Boolean).join(", ") : "";
    throw new Error(`A Synology API elutasította a ${params.api}.${params.method} kérést${code ? ` (hibakód: ${code}${details ? `; részlet: ${details}` : ""})` : ""}.`);
  }
  return { data: body.data };
}

async function synologyMultipartRequest(baseUrl: string, params: Record<string, string>, sid: string, file: SynologyUploadFile): Promise<SynologyResponse> {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...params, _sid: sid })) form.append(key, value);
  // File Station requires the binary part to be the final multipart field.
  form.append("file", new Blob([file.buffer], { type: file.mimetype || "application/octet-stream" }), file.originalname);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/webapi/entry.cgi`, { method: "POST", body: form, signal: AbortSignal.timeout(30_000) });
  } catch (error: any) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") throw new Error("A Synology File Station nem válaszolt időben a feltöltésre.");
    throw new Error("A Synology File Station feltöltési kapcsolata sikertelen.");
  }
  if (!response.ok) {
    const responseText = (await response.text().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 240);
    throw new Error(`A Synology szerver HTTP ${response.status} választ adott a feltöltésre${responseText ? `: ${responseText}` : ""}`);
  }
  let body: any;
  try { body = await response.json(); }
  catch { throw new Error("A Synology szerver nem JSON API-választ adott a feltöltésre."); }
  if (!body?.success) {
    const code = body?.error?.code;
    throw new Error(`A Synology API elutasította a feltöltést${code ? ` (hibakód: ${code})` : ""}.`);
  }
  return { data: body.data };
}

async function withSynologySession<T>(run: (baseUrl: string, sid: string) => Promise<T>) {
  const baseUrl = configuredBaseUrl();
  const account = String(process.env.SYNOLOGY_MEDIA_USERNAME || "");
  const password = String(process.env.SYNOLOGY_MEDIA_PASSWORD || "");
  if (!account || !password) throw new Error("A Synology szolgáltatási fiók nincs konfigurálva.");
  // Use the documented SID session format for all File Station calls.  Mixing
  // the cookie and _sid transports can make DSM reject the next call as SID 119.
  const authResponse = await synologyRequest(baseUrl, { api: "SYNO.API.Auth", version: "6", method: "login", account, passwd: password, session: "FileStation", format: "sid" });
  const auth = authResponse.data;
  const sid = String(auth?.sid || "");
  if (!sid) throw new Error("A Synology bejelentkezés nem adott érvényes munkamenet-azonosítót.");
  try { return await run(baseUrl, sid); }
  finally { await synologyRequest(baseUrl, { api: "SYNO.API.Auth", version: "6", method: "logout", session: "FileStation" }, sid).catch(() => undefined); }
}

export async function synologyMediaAccess(user: { id?: string; email?: string; role?: string }) {
  const roots = await configuredRoots(user);
  return { roots, role: normalizedRole(user.role) };
}

export async function browseSynologyMedia(user: { id?: string; email?: string; role?: string }, requestedPath?: string) {
  const { roots } = await synologyMediaAccess(user);
  const folderPath = resolvedPath(roots, requestedPath);
  return withSynologySession(async (baseUrl, sid) => {
    // File Station's `folder_path` is a JSON-style string (for example
    // `"/video"`).  The sort fields, however, are ordinary enum values; DSM
    // returns HTTP 400 when those are quoted as JSON strings.
    const result = await synologyRequest(baseUrl, {
      api: "SYNO.FileStation.List", version: "2", method: "list",
      folder_path: JSON.stringify(folderPath), offset: "0", limit: "50",
      sort_by: "name", sort_direction: "asc",
    }, sid);
    const data = result.data;
    const files: SynologyFile[] = (data?.files || []).map((file: any) => ({ name: String(file.name || ""), path: String(file.path || ""), isDir: Boolean(file.isdir), size: Number(file.additional?.size || 0), modifiedAt: Number(file.additional?.time?.mtime || 0) }));
    return { path: folderPath, roots, files, total: Number(data?.total || files.length), isTruncated: Number(data?.total || files.length) > files.length };
  });
}

export async function uploadSynologyMedia(user: { id?: string; email?: string; role?: string }, requestedPath: string | undefined, file: SynologyUploadFile) {
  const { roots } = await synologyMediaAccess(user);
  const folderPath = resolvedPath(roots, requestedPath);
  const originalName = String(file.originalname || "").trim();
  const safeName = originalName.replace(/[\\/\0]/g, "_").replace(/[<>:"|?*]/g, "_").slice(0, 200);
  if (!safeName || safeName === "." || safeName === "..") throw new Error("A feltöltendő fájl neve érvénytelen.");
  if (!Buffer.isBuffer(file.buffer) || !file.buffer.length) throw new Error("A feltöltendő fájl üres.");
  return withSynologySession(async (baseUrl, sid) => {
    await synologyMultipartRequest(baseUrl, {
      api: "SYNO.FileStation.Upload", version: "2", method: "upload",
      path: folderPath, create_parents: "false", overwrite: "false",
    }, sid, { ...file, originalname: safeName });
    return { path: folderPath, name: safeName, size: file.buffer.length };
  });
}

export async function createSynologyMediaFolder(user: { id?: string; email?: string; role?: string }, requestedPath: string | undefined, nameInput: unknown) {
  const { roots } = await synologyMediaAccess(user);
  const folderPath = resolvedPath(roots, requestedPath);
  const name = String(nameInput || "").trim();
  if (!name || name.length > 120 || name === "." || name === ".." || /[\\/\0<>:"|?*]/.test(name)) throw new Error("A mappanév érvénytelen. Ne használjon perjelet vagy fájlrendszerben tiltott karaktert.");
  return withSynologySession(async (baseUrl, sid) => {
    const result = await synologyRequest(baseUrl, {
      api: "SYNO.FileStation.CreateFolder", version: "2", method: "create",
      folder_path: JSON.stringify([folderPath]), name: JSON.stringify([name]), force_parent: "false",
    }, sid);
    const created = Array.isArray(result.data?.folders) ? result.data.folders[0] : null;
    if (!created?.path) throw new Error("A Synology nem igazolta vissza az új mappa létrehozását.");
    return { path: String(created.path), name: String(created.name || name) };
  });
}

function directSynologyUrl(baseUrl: string, sourceUrl: unknown) {
  const source = new URL(String(sourceUrl || ""));
  const target = new URL(baseUrl);
  return `${target.origin}${source.pathname}${source.search}`;
}

function nextCalendarDay() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return value.toISOString().slice(0, 10);
}

export async function createSynologyMediaDownloadLink(user: { id?: string; email?: string; role?: string }, requestedPath: string | undefined) {
  const { roots } = await synologyMediaAccess(user);
  const filePath = resolvedPath(roots, requestedPath);
  return withSynologySession(async (baseUrl, sid) => {
    const result = await synologyRequest(baseUrl, {
      api: "SYNO.FileStation.Sharing", version: "3", method: "create",
      path: JSON.stringify(filePath), date_expired: JSON.stringify(nextCalendarDay()),
    }, sid);
    const link = Array.isArray(result.data?.links) ? result.data.links.find((item: any) => !item?.error && item?.url) : null;
    if (!link?.url) throw new Error("A Synology nem tudott letöltési linket létrehozni ehhez a fájlhoz.");
    return { url: directSynologyUrl(baseUrl, link.url), expiresOn: nextCalendarDay() };
  });
}

export async function getSynologyMediaFileRequestUrl(user: { id?: string; email?: string; role?: string }, requestedPath: string | undefined) {
  const { roots } = await synologyMediaAccess(user);
  const folderPath = resolvedPath(roots, requestedPath);
  await ensureSynologyMediaFileRequestTable();
  const result = await db.execute({
    sql: `SELECT request_url FROM synology_media_file_requests
      WHERE folder_path = ? OR ? LIKE folder_path || '/%'
      ORDER BY LENGTH(folder_path) DESC LIMIT 1`,
    args: [folderPath, folderPath],
  });
  return { path: folderPath, url: result.rows.length ? String(result.rows[0].request_url || "") : "" };
}

export async function getSynologyMediaFileRequests() {
  await ensureSynologyMediaFileRequestTable();
  const result = await db.execute("SELECT folder_path, request_url, updated_by, updated_at FROM synology_media_file_requests ORDER BY folder_path COLLATE NOCASE");
  return result.rows.map((row: any) => ({ path: String(row.folder_path), url: String(row.request_url), updatedBy: row.updated_by || null, updatedAt: row.updated_at || null }));
}

export async function saveSynologyMediaFileRequest(pathInput: unknown, urlInput: unknown, updatedBy?: string) {
  const folderPath = String(pathInput || "").trim().replace(/\\/g, "/").replace(/\/+/g, "/");
  if (!folderPath.startsWith("/") || folderPath.includes("/../") || folderPath.endsWith("/..")) throw new Error("A Synology File Request célmappája érvénytelen.");
  let requestUrl: URL;
  try { requestUrl = new URL(String(urlInput || "").trim()); }
  catch { throw new Error("A Synology File Request linkje érvénytelen."); }
  if (requestUrl.protocol !== "https:" || !requestUrl.pathname.startsWith("/sharing/")) throw new Error("A File Request linknek HTTPS-es Synology /sharing/ linknek kell lennie.");
  await ensureSynologyMediaFileRequestTable();
  await db.execute({
    sql: `INSERT INTO synology_media_file_requests (folder_path, request_url, updated_by, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(folder_path) DO UPDATE SET request_url = excluded.request_url, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`,
    args: [folderPath, requestUrl.toString(), updatedBy || null],
  });
  const saved = await db.execute({ sql: "SELECT request_url FROM synology_media_file_requests WHERE folder_path = ? LIMIT 1", args: [folderPath] });
  if (String(saved.rows[0]?.request_url || "") !== requestUrl.toString()) throw new Error("A közvetlen feltöltési link mentése nem ellenőrizhető.");
  return { path: folderPath, url: String(saved.rows[0].request_url) };
}

export async function clearSynologyMediaFileRequest(pathInput: unknown) {
  await ensureSynologyMediaFileRequestTable();
  await db.execute({ sql: "DELETE FROM synology_media_file_requests WHERE folder_path = ?", args: [String(pathInput || "").trim()] });
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
