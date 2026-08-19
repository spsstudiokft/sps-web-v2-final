import { Router } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { db } from "../db.js";
import { createZip, parseGalleryItems, prepareGalleryFile } from "./services/galleryDownloadService.js";
import { 
  getClientReferralProfile, 
  redeemRewardVoucher, 
  ensureUserReferralCode 
} from "./services/referralService.js";
import { sendTransactionalEmail, getEmailSenderConfig } from "./services/emailService.js";
import sharp from "sharp";
import { getAppUrl } from "./appUrl.js";
import bcrypt from "bcryptjs";
import { deleteMedia } from "./storage/index.js";

const clientRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtstring";
const pinAttempts = new Map<string, { count: number; resetAt: number }>();
const pinEmailRequests = new Map<string, number>();

clientRouter.use((req: any, res, next) => {
  if (req.user?.role === "property_client" && !req.path.startsWith("/property-listings")) {
    return res.status(403).json({ error: "Ez a munkamenet kizárólag az ingatlanhirdetés-kezelőhöz használható." });
  }
  next();
});

const hashDownloadPin = (projectId: string, pin: string) =>
  crypto.createHmac("sha256", JWT_SECRET).update(`${projectId}:${pin}`).digest("hex");

async function getOwnedGallery(userId: string, projectId: string, galleryId: string) {
  const result = await db.execute({
    sql: `SELECT p.id AS project_id, p.name AS project_name, pi.id, pi.title, pi.image_urls,
                 pi.media_url, pi.media_type
          FROM projects p
          JOIN project_portfolio_items ppi ON ppi.project_id = p.id
          JOIN portfolio_items pi ON pi.id = ppi.portfolio_item_id
          WHERE p.id = ? AND p.client_id = ? AND pi.id = ? LIMIT 1`,
    args: [projectId, userId, galleryId],
  });
  return result.rows[0] as any;
}

async function hasGalleryAccessToken(accessToken: string, userId: string, projectId: string) {
  if (!accessToken) return false;
  try {
    const decoded = jwt.verify(accessToken, JWT_SECRET) as any;
    const currentAccess = await db.execute({ sql: "SELECT pin_hash FROM gallery_download_access WHERE project_id = ?", args: [projectId] });
    return decoded.purpose === "gallery-download" && decoded.userId === userId && decoded.projectId === projectId
      && decoded.pinVersion === String(currentAccess.rows[0]?.pin_hash || "").slice(0, 16);
  } catch { return false; }
}

function rawGalleryItems(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return raw.trim() ? [raw.trim()] : []; }
}

const isStrongPortalPassword = (password: string) =>
  password.length >= 8
  && /[A-Z]/.test(password)
  && /[a-z]/.test(password)
  && /\d/.test(password)
  && /[^A-Za-z0-9]/.test(password);

async function sendClientAccountChangeEmail(params: {
  email: string; name: string; changeType: string; changeDetails: string; req: any;
}) {
  try {
    const emailResult = await sendTransactionalEmail({
      to: params.email,
      templateId: "client_account_changed",
      templateData: {
        "user.name": params.name || params.email.split("@")[0],
        "user.email": params.email,
        change_type: params.changeType,
        change_details: params.changeDetails,
        changed_at: new Date().toLocaleString("hu-HU", { timeZone: "Europe/Budapest" }),
        ip_address: String(params.req.ip || params.req.socket?.remoteAddress || "Unknown"),
        action_url: `${getAppUrl(params.req)}/client/settings`,
        action_text: "Review account settings",
      },
    });
    if (!emailResult.success) console.error("Failed to send client account change email:", emailResult.error);
    return emailResult;
  } catch (error) {
    console.error("Client account was updated, but its notification email could not be generated:", error);
    return { success: false, status: "failed" as const, error: error instanceof Error ? error.message : String(error) };
  }
}

clientRouter.get("/settings/profile", async (req, res) => {
  try {
    const userId = String((req as any).user?.id || "");
    let result;
    try {
      result = await db.execute({
        sql: `SELECT id, email, name, password_auth_enabled, password_updated_at, tfa_enabled, created_at
              FROM users WHERE id = ? AND role = 'client' LIMIT 1`,
        args: [userId],
      });
    } catch (schemaError) {
      // Keep the registered email/profile available during a rolling deploy
      // even if a serverless instance reaches Turso before the additive
      // account-settings migration has completed.
      console.warn("Client settings columns are not available yet; using compatibility profile query", schemaError);
      result = await db.execute({
        sql: "SELECT id, email, created_at FROM users WHERE id = ? AND role = 'client' LIMIT 1",
        args: [userId],
      });
    }
    if (result.rows.length === 0) return res.status(404).json({ error: "Client account not found." });
    const user = result.rows[0];
    res.json({
      id: String(user.id),
      email: String(user.email || ""),
      name: String(user.name || ""),
      hasPassword: Number(user.password_auth_enabled ?? 1) === 1,
      passwordUpdatedAt: user.password_updated_at || null,
      tfa: {
        enabled: Number(user.tfa_enabled || 0) === 1,
        available: false,
      },
      createdAt: user.created_at || null,
    });
  } catch (error) {
    console.error("Failed to load client settings profile", error);
    res.status(500).json({ error: "Failed to load account settings." });
  }
});

clientRouter.patch("/settings/profile", async (req, res) => {
  try {
    const userId = String((req as any).user?.id || "");
    const name = typeof req.body?.name === "string" ? req.body.name.trim().replace(/\s+/g, " ") : "";
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ error: "Name must contain between 2 and 100 characters." });
    }
    const accountResult = await db.execute({
      sql: "SELECT email, name FROM users WHERE id = ? AND role = 'client' LIMIT 1",
      args: [userId],
    });
    if (accountResult.rows.length === 0) return res.status(404).json({ error: "Client account not found." });
    const account = accountResult.rows[0];
    const previousName = String(account.name || "");
    if (previousName === name) return res.json({ success: true, name, unchanged: true });
    await db.execute({
      sql: "UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'client'",
      args: [name, userId],
    });
    await db.execute({
      sql: "UPDATE property_listing_accounts SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE portal_user_id = ?",
      args: [name, userId],
    }).catch(() => undefined);
    const email = await sendClientAccountChangeEmail({
      email: String(account.email || ""), name,
      changeType: "Display name changed",
      changeDetails: `The account display name was changed from “${previousName || "Not set"}” to “${name}”.`, req,
    });
    res.json({ success: true, name, email: { status: email.status } });
  } catch (error) {
    console.error("Failed to update client profile", error);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

clientRouter.put("/settings/password", async (req, res) => {
  try {
    const userId = String((req as any).user?.id || "");
    const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    if (!isStrongPortalPassword(newPassword)) {
      return res.status(400).json({ error: "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character." });
    }

    const result = await db.execute({
      sql: "SELECT email, name, password_hash, password_auth_enabled FROM users WHERE id = ? AND role = 'client' LIMIT 1",
      args: [userId],
    });
    if (result.rows.length === 0) return res.status(404).json({ error: "Client account not found." });
    const hasPassword = Number(result.rows[0].password_auth_enabled ?? 1) === 1;
    if (hasPassword) {
      if (!currentPassword) return res.status(400).json({ error: "Current password is required." });
      const matches = await bcrypt.compare(currentPassword, String(result.rows[0].password_hash || ""));
      if (!matches) return res.status(400).json({ error: "Current password is incorrect." });
      if (currentPassword === newPassword) return res.status(400).json({ error: "The new password must be different from the current password." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.execute({
      sql: `UPDATE users
            SET password_hash = ?, password_auth_enabled = 1, password_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND role = 'client'`,
      args: [passwordHash, userId],
    });
    const mode = hasPassword ? "changed" : "added";
    const email = await sendClientAccountChangeEmail({
      email: String(result.rows[0].email || ""), name: String(result.rows[0].name || ""),
      changeType: hasPassword ? "Password changed" : "Password sign-in enabled",
      changeDetails: hasPassword
        ? "The password for your client portal account was changed."
        : "A password was added to your magic-link account, so password sign-in is now available.", req,
    });
    res.json({ success: true, hasPassword: true, mode, email: { status: email.status } });
  } catch (error) {
    console.error("Failed to update client password", error);
    res.status(500).json({ error: "Failed to update password." });
  }
});

// ==================== LINKED PROPERTY LISTING ACCOUNT ====================
const CLIENT_PROPERTY_STATUSES = new Set(["active", "reserved", "sold"]);
const CLIENT_PROPERTY_TYPES = new Set(["sale", "rent"]);

function parseListingArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function normalizeClientListing(row: any) {
  return { ...row, price_huf: Number(row.price_huf || 0), floor_area_sqm: Number(row.floor_area_sqm || 0), rooms: Number(row.rooms || 0), bathrooms: Number(row.bathrooms || 0), heating_types: parseListingArray(row.heating_types), image_urls: parseListingArray(row.image_urls) };
}

function normalizeClientListingInput(body: any) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const location = typeof body?.location === "string" ? body.location.trim() : "";
  if (title.length < 2 || title.length > 180) throw new Error("A címnek 2 és 180 karakter között kell lennie.");
  if (location.length < 2 || location.length > 220) throw new Error("A helyszín megadása kötelező.");
  const numeric = (value: unknown) => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
  const optionalInteger = (value: unknown) => value === "" || value === null || value === undefined ? null : Math.round(numeric(value));
  const images = (Array.isArray(body.image_urls) ? body.image_urls : []).filter((item: any) => item && typeof item.url === "string" && item.url.trim()).slice(0, 60).map((item: any) => ({
    url: item.url.trim(), compressedUrl: typeof item.compressedUrl === "string" ? item.compressedUrl.trim() : undefined,
    thumbnailUrl: typeof item.thumbnailUrl === "string" ? item.thumbnailUrl.trim() : undefined,
    originalName: typeof item.originalName === "string" ? item.originalName.slice(0, 255) : undefined,
  }));
  return {
    title, location, price_huf: Math.round(numeric(body.price_huf)), price_text: String(body.price_text || "").trim().slice(0, 120),
    floor_area_sqm: numeric(body.floor_area_sqm), rooms: numeric(body.rooms), bathrooms: numeric(body.bathrooms), description: String(body.description || "").trim(),
    listing_status: CLIENT_PROPERTY_STATUSES.has(String(body.listing_status)) ? String(body.listing_status) : "active",
    listing_type: CLIENT_PROPERTY_TYPES.has(String(body.listing_type)) ? String(body.listing_type) : "sale",
    construction_year: optionalInteger(body.construction_year), floor_count: optionalInteger(body.floor_count),
    central_heating: body.central_heating ? 1 : 0, garden_access: body.garden_access ? 1 : 0, floor_plan_available: body.floor_plan_available ? 1 : 0,
    balcony: body.balcony ? 1 : 0, full_comfort: body.full_comfort ? 1 : 0, air_conditioned: body.air_conditioned ? 1 : 0, new_construction: body.new_construction ? 1 : 0,
    orientation: String(body.orientation || "").trim().slice(0, 40), view_type: String(body.view_type || "").trim().slice(0, 40), bathroom_toilet: String(body.bathroom_toilet || "").trim().slice(0, 40),
    heating_types: [...new Set((Array.isArray(body.heating_types) ? body.heating_types : []).map(String).map(v => v.trim()).filter(Boolean))].slice(0, 20),
    image_urls: images, is_enabled: body.is_enabled ? 1 : 0,
  };
}

async function getClientListingAccount(userId: string) {
  const result = await db.execute({ sql: "SELECT * FROM property_listing_accounts WHERE portal_user_id = ? AND is_active = 1 LIMIT 1", args: [userId] });
  return result.rows[0] as any;
}

function listingMediaUrls(images: any[]): string[] {
  const urls = new Set<string>();
  for (const image of images) for (const key of ["url", "compressedUrl", "thumbnailUrl"]) if (typeof image?.[key] === "string" && image[key].trim()) urls.add(image[key].trim());
  return [...urls];
}

async function deleteClientListingMedia(urls: string[]) {
  if (!urls.length) return;
  for (let offset = 0; offset < urls.length; offset += 100) {
    const batch = urls.slice(offset, offset + 100); const placeholders = batch.map(() => "?").join(",");
    const tracked = await db.execute({ sql: `SELECT id, provider, bucket, file_key FROM media_uploads WHERE public_url IN (${placeholders})`, args: batch });
    for (const upload of tracked.rows as any[]) {
      await deleteMedia(String(upload.file_key), String(upload.bucket), String(upload.provider));
      await db.execute({ sql: "DELETE FROM media_uploads WHERE id = ?", args: [upload.id] });
    }
  }
}

clientRouter.get("/property-listing-account", async (req, res) => {
  try {
    const account = await getClientListingAccount(String((req as any).user?.id || ""));
    res.json({ migrated: Boolean(account), account: account || null });
  } catch (error) { console.error("Failed to load linked listing account", error); res.status(500).json({ error: "A hirdetői fiók állapota nem tölthető be." }); }
});

clientRouter.post("/property-listing-account/migrate", async (req, res) => {
  const userId = String((req as any).user?.id || "");
  try {
    const existing = await getClientListingAccount(userId);
    if (existing) return res.json({ migrated: true, alreadyMigrated: true, account: existing });
    const userResult = await db.execute({ sql: "SELECT email, name, password_auth_enabled FROM users WHERE id = ? AND role = 'client' LIMIT 1", args: [userId] });
    if (!userResult.rows.length) return res.status(403).json({ error: "Csak aktív ügyfélkapus felhasználó hozhat létre hirdetői fiókot." });
    if (Number(userResult.rows[0].password_auth_enabled ?? 1) !== 1) return res.status(400).json({ error: "A migráció előtt adj hozzá jelszót az ügyfélkapu fiókbeállításaiban. Az ingatlanos felület közvetlen email–jelszó belépést használ." });
    const id = crypto.randomUUID(); const user = userResult.rows[0];
    await db.execute({ sql: "INSERT INTO property_listing_accounts (id, portal_user_id, email, name) VALUES (?, ?, ?, ?)", args: [id, userId, String(user.email || ""), String(user.name || "")] });
    const account = await getClientListingAccount(userId);
    res.status(201).json({ migrated: true, account });
  } catch (error: any) {
    if (String(error?.message || "").toUpperCase().includes("UNIQUE")) {
      const account = await getClientListingAccount(userId).catch(() => null);
      if (account) return res.json({ migrated: true, alreadyMigrated: true, account });
    }
    console.error("Failed to migrate property listing account", error); res.status(500).json({ error: "A hirdetői fiók létrehozása sikertelen." });
  }
});

clientRouter.use("/property-listings", (req: any, res, next) => {
  if (req.user?.role !== "property_client" || req.user?.scope !== "property-listings") {
    return res.status(403).json({ error: "A hirdetések kezeléséhez jelentkezz be a külön ingatlanos felületen." });
  }
  next();
});

clientRouter.get("/property-listings", async (req, res) => {
  try {
    const account = await getClientListingAccount(String((req as any).user?.id || ""));
    if (!account) return res.status(403).json({ error: "Előbb hozd létre a kapcsolt hirdetői fiókot." });
    const result = await db.execute({ sql: "SELECT * FROM property_listings WHERE owner_account_id = ? ORDER BY updated_at DESC", args: [account.id] });
    res.json(result.rows.map(normalizeClientListing));
  } catch (error) { console.error("Failed to load client listings", error); res.status(500).json({ error: "A saját hirdetések nem tölthetők be." }); }
});

clientRouter.post("/property-listings", async (req, res) => {
  try {
    const userId = String((req as any).user?.id || ""); const account = await getClientListingAccount(userId);
    if (!account) return res.status(403).json({ error: "Előbb hozd létre a kapcsolt hirdetői fiókot." });
    const item = normalizeClientListingInput(req.body); const id = crypto.randomUUID();
    await db.execute({ sql: `INSERT INTO property_listings (id,title,location,price_huf,price_text,floor_area_sqm,rooms,bathrooms,description,listing_status,listing_type,construction_year,floor_count,central_heating,garden_access,floor_plan_available,balcony,full_comfort,air_conditioned,new_construction,orientation,view_type,bathroom_toilet,heating_types,image_urls,is_enabled,owner_account_id,created_by_user_id,created_by_role) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, args: [id,item.title,item.location,item.price_huf,item.price_text,item.floor_area_sqm,item.rooms,item.bathrooms,item.description,item.listing_status,item.listing_type,item.construction_year,item.floor_count,item.central_heating,item.garden_access,item.floor_plan_available,item.balcony,item.full_comfort,item.air_conditioned,item.new_construction,item.orientation,item.view_type,item.bathroom_toilet,JSON.stringify(item.heating_types),JSON.stringify(item.image_urls),item.is_enabled,account.id,userId,"client"] });
    const created = await db.execute({ sql: "SELECT * FROM property_listings WHERE id = ? AND owner_account_id = ?", args: [id, account.id] }); res.status(201).json(normalizeClientListing(created.rows[0]));
  } catch (error: any) { console.error("Failed to create client listing", error); res.status(/kötelező|karakter/.test(error?.message || "") ? 400 : 500).json({ error: error?.message || "A hirdetés létrehozása sikertelen." }); }
});

clientRouter.put("/property-listings/:id", async (req, res) => {
  try {
    const account = await getClientListingAccount(String((req as any).user?.id || "")); if (!account) return res.status(403).json({ error: "Nincs aktív hirdetői fiók." });
    const current = await db.execute({ sql: "SELECT image_urls FROM property_listings WHERE id = ? AND owner_account_id = ?", args: [req.params.id, account.id] });
    if (!current.rows.length) return res.status(404).json({ error: "A saját hirdetés nem található." });
    const item = normalizeClientListingInput(req.body); const next = new Set(listingMediaUrls(item.image_urls)); const removed = listingMediaUrls(parseListingArray(current.rows[0].image_urls)).filter(url => !next.has(url));
    await deleteClientListingMedia(removed);
    await db.execute({ sql: `UPDATE property_listings SET title=?,location=?,price_huf=?,price_text=?,floor_area_sqm=?,rooms=?,bathrooms=?,description=?,listing_status=?,listing_type=?,construction_year=?,floor_count=?,central_heating=?,garden_access=?,floor_plan_available=?,balcony=?,full_comfort=?,air_conditioned=?,new_construction=?,orientation=?,view_type=?,bathroom_toilet=?,heating_types=?,image_urls=?,is_enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_account_id=?`, args: [item.title,item.location,item.price_huf,item.price_text,item.floor_area_sqm,item.rooms,item.bathrooms,item.description,item.listing_status,item.listing_type,item.construction_year,item.floor_count,item.central_heating,item.garden_access,item.floor_plan_available,item.balcony,item.full_comfort,item.air_conditioned,item.new_construction,item.orientation,item.view_type,item.bathroom_toilet,JSON.stringify(item.heating_types),JSON.stringify(item.image_urls),item.is_enabled,req.params.id,account.id] });
    const updated = await db.execute({ sql: "SELECT * FROM property_listings WHERE id = ? AND owner_account_id = ?", args: [req.params.id, account.id] }); res.json(normalizeClientListing(updated.rows[0]));
  } catch (error: any) { console.error("Failed to update client listing", error); res.status(/kötelező|karakter/.test(error?.message || "") ? 400 : 500).json({ error: error?.message || "A hirdetés mentése sikertelen." }); }
});

clientRouter.delete("/property-listings/:id", async (req, res) => {
  try {
    const account = await getClientListingAccount(String((req as any).user?.id || "")); if (!account) return res.status(403).json({ error: "Nincs aktív hirdetői fiók." });
    const current = await db.execute({ sql: "SELECT image_urls FROM property_listings WHERE id = ? AND owner_account_id = ?", args: [req.params.id, account.id] }); if (!current.rows.length) return res.status(404).json({ error: "A saját hirdetés nem található." });
    await deleteClientListingMedia(listingMediaUrls(parseListingArray(current.rows[0].image_urls))); await db.execute({ sql: "DELETE FROM property_listings WHERE id = ? AND owner_account_id = ?", args: [req.params.id, account.id] }); res.json({ success: true });
  } catch (error: any) { console.error("Failed to delete client listing", error); res.status(500).json({ error: error?.message || "A hirdetés törlése sikertelen." }); }
});

clientRouter.get("/dashboard", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const countRes = await db.execute({
      sql: "SELECT COUNT(*) as count FROM projects WHERE client_id = ? AND status = 'active'",
      args: [user.id]
    });
    const activeProjectCount = Number(countRes.rows[0].count);
    
    res.json({
      message: "Welcome to your client dashboard",
      activeProjectCount,
      user
    });
  } catch (error) {
    console.error("Failed to load client dashboard", error);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

clientRouter.get("/projects", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const result = await db.execute({
      sql: "SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC",
      args: [user.id]
    });

    const projectIds = result.rows.map((project: any) => String(project.id));
    const placeholders = projectIds.map(() => "?").join(",");
    const [milestoneResult, updateResult] = projectIds.length > 0
      ? await Promise.all([
          db.execute({
            sql: `SELECT id, project_id, title, description, status, due_date, completed_at, sort_order, created_at, updated_at
                  FROM project_milestones WHERE project_id IN (${placeholders})
                  ORDER BY project_id, sort_order ASC, created_at ASC`,
            args: projectIds,
          }),
          db.execute({
            sql: `SELECT id, project_id, milestone_id, title, message, status_label, created_at, updated_at
                  FROM project_updates WHERE project_id IN (${placeholders})
                  ORDER BY project_id, created_at DESC`,
            args: projectIds,
          }),
        ])
      : [{ rows: [] }, { rows: [] }];

    const milestonesByProject = new Map<string, any[]>();
    const updatesByProject = new Map<string, any[]>();
    for (const milestone of milestoneResult.rows as any[]) {
      const projectId = String(milestone.project_id);
      milestonesByProject.set(projectId, [...(milestonesByProject.get(projectId) || []), milestone]);
    }
    for (const update of updateResult.rows as any[]) {
      const projectId = String(update.project_id);
      updatesByProject.set(projectId, [...(updatesByProject.get(projectId) || []), update]);
    }
    
    const projects = await Promise.all(result.rows.map(async (project) => {
      const portRes = await db.execute({
        sql: `SELECT pi.id, pi.title, pi.image_urls, pi.description, pi.category_id,
                     pi.target_url, pi.thumbnail_url, pi.media_url, pi.media_type,
                     c.name as category_name
              FROM portfolio_items pi 
              JOIN project_portfolio_items ppi ON pi.id = ppi.portfolio_item_id 
              LEFT JOIN categories c ON pi.category_id = c.id
              WHERE ppi.project_id = ?`,
        args: [project.id]
      });
      const portfolios = portRes.rows.map((portfolio: any) => {
        const safeItems = rawGalleryItems(portfolio.image_urls).map((raw: any, index: number) => {
          const item = typeof raw === "string" ? { url: raw } : (raw || {});
          const sourceUrl = String(item.url || item.src || "");
          const type = String(item.type || item.media_type || "").toLowerCase() === "video" || /\.(mp4|mov|webm)(\?|$)/i.test(sourceUrl) ? "video" : "image";
          return {
            id: item.id || `media-${index}`, url: `secure-gallery-item:${index}`, type, title: item.title || "",
            item_number: item.item_number || String(index + 1).padStart(3, "0"),
            compressed_url: type === "image" && item.compressed_url ? `secure-optimized-gallery-item:${index}` : undefined,
            compressed_filename: type === "image" && item.compressed_filename ? String(item.compressed_filename) : undefined,
          };
        });
        return { ...portfolio, image_urls: JSON.stringify(safeItems), media_url: null, thumbnail_url: null };
      });
      return {
        ...project,
        milestones: milestonesByProject.get(String(project.id)) || [],
        updates: updatesByProject.get(String(project.id)) || [],
        portfolios
      };
    }));
    
    res.json(projects);
  } catch (error) {
    console.error("Failed to fetch client projects", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

clientRouter.post("/projects/:projectId/galleries/:galleryId/unlock", async (req, res) => {
  try {
    const user = (req as any).user;
    const gallery = await getOwnedGallery(user?.id, req.params.projectId, req.params.galleryId);
    if (!gallery) return res.status(404).json({ error: "Gallery not found" });
    const pin = String(req.body?.pin || "").trim();
    if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: "Enter the four-digit download PIN" });

    const attemptKey = `${user.id}:${req.params.projectId}`;
    const now = Date.now();
    const attempts = pinAttempts.get(attemptKey);
    if (attempts && attempts.resetAt > now && attempts.count >= 5) {
      return res.status(429).json({ error: "Too many incorrect attempts. Please try again in 15 minutes." });
    }
    const access = await db.execute({ sql: "SELECT pin_hash FROM gallery_download_access WHERE project_id = ?", args: [req.params.projectId] });
    const suppliedHash = hashDownloadPin(req.params.projectId, pin);
    const expected = String(access.rows[0]?.pin_hash || "");
    const valid = expected.length === suppliedHash.length && expected.length > 0 && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(suppliedHash));
    if (!valid) {
      pinAttempts.set(attemptKey, { count: attempts && attempts.resetAt > now ? attempts.count + 1 : 1, resetAt: now + 15 * 60 * 1000 });
      return res.status(403).json({ error: "Incorrect download PIN" });
    }
    pinAttempts.delete(attemptKey);
    const accessToken = jwt.sign({ purpose: "gallery-download", userId: user.id, projectId: req.params.projectId, pinVersion: suppliedHash.slice(0, 16) }, JWT_SECRET, { expiresIn: "12h" });
    return res.json({ success: true, access_token: accessToken, expires_in: 43200 });
  } catch (error) {
    console.error("Failed to unlock gallery", error);
    return res.status(500).json({ error: "Failed to unlock gallery" });
  }
});

clientRouter.post("/projects/:projectId/gallery-pin/resend", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });
    const projectResult = await db.execute({
      sql: `SELECT p.id, p.name, p.status, u.email, u.name AS client_name
            FROM projects p JOIN users u ON u.id = p.client_id
            WHERE p.id = ? AND p.client_id = ?
              AND EXISTS (SELECT 1 FROM project_portfolio_items ppi WHERE ppi.project_id = p.id)
            LIMIT 1`,
      args: [req.params.projectId, user.id],
    });
    const project = projectResult.rows[0] as any;
    if (!project) return res.status(404).json({ error: "Delivered project gallery not found" });
    if (String(project.status || "").toLowerCase() !== "completed") {
      return res.status(400).json({ error: "A download PIN is available after the project gallery is delivered" });
    }

    const requestKey = `${user.id}:${req.params.projectId}`;
    const now = Date.now();
    const memoryLastSent = pinEmailRequests.get(requestKey) || 0;
    if (now - memoryLastSent < 60_000) {
      return res.status(429).json({ error: "A new PIN was just sent. Please wait one minute before requesting another email.", retry_after: Math.ceil((60_000 - (now - memoryLastSent)) / 1000) });
    }
    const previous = await db.execute({ sql: "SELECT pin_hash, issued_at, pin_email_sent_at FROM gallery_download_access WHERE project_id = ?", args: [project.id] });
    const lastSentAt = previous.rows[0]?.pin_email_sent_at ? new Date(String(previous.rows[0].pin_email_sent_at)).getTime() : 0;
    if (lastSentAt && now - lastSentAt < 60_000) {
      return res.status(429).json({ error: "A new PIN was just sent. Please wait one minute before requesting another email.", retry_after: Math.ceil((60_000 - (now - lastSentAt)) / 1000) });
    }
    pinEmailRequests.set(requestKey, now);
    const newPin = String(crypto.randomInt(1000, 10000));
    const pinHash = hashDownloadPin(String(project.id), newPin);
    await db.execute({
      sql: `INSERT INTO gallery_download_access (project_id, pin_hash, issued_at, pin_email_sent_at, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(project_id) DO UPDATE SET pin_hash = excluded.pin_hash, issued_at = CURRENT_TIMESTAMP,
              pin_email_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
      args: [project.id, pinHash],
    });
    const origin = getAppUrl(req);
    const recipientName = String(project.client_name || project.email).split("@")[0];
    const emailResult = await sendTransactionalEmail({
      to: String(project.email), templateId: "gallery_pin_recovery",
      templateData: {
        recipient_name: recipientName, "user.name": recipientName, project_name: project.name,
        download_pin: newPin, gallery_url: `${origin}/client/projects`, action_url: `${origin}/client/projects`, action_text: "Open gallery",
      },
    });
    if (!emailResult.success) {
      pinEmailRequests.delete(requestKey);
      if (previous.rows[0]?.pin_hash) {
        await db.execute({
          sql: "UPDATE gallery_download_access SET pin_hash = ?, issued_at = ?, pin_email_sent_at = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?",
          args: [previous.rows[0].pin_hash, previous.rows[0].issued_at, previous.rows[0].pin_email_sent_at, project.id],
        });
      } else {
        await db.execute({ sql: "DELETE FROM gallery_download_access WHERE project_id = ?", args: [project.id] });
      }
      return res.status(502).json({ error: emailResult.error || "The PIN email could not be sent" });
    }
    return res.json({ success: true, message: `A new download PIN was sent to ${String(project.email).replace(/(^.).*(@.*$)/, "$1***$2")}` });
  } catch (error: any) {
    console.error("Failed to resend gallery PIN", error);
    return res.status(500).json({ error: error.message || "Failed to send a new gallery PIN" });
  }
});

clientRouter.post("/projects/:projectId/galleries/:galleryId/preview", async (req, res) => {
  try {
    const user = (req as any).user;
    const gallery = await getOwnedGallery(user?.id, req.params.projectId, req.params.galleryId);
    if (!gallery) return res.status(404).json({ error: "Gallery not found" });
    const index = Number(req.body?.index);
    const parsedItems = parseGalleryItems(gallery.image_urls);
    const rawItems = rawGalleryItems(gallery.image_urls);
    if (!Number.isInteger(index) || index < 0 || index >= parsedItems.length) return res.status(400).json({ error: "Invalid gallery item" });
    const unlocked = await hasGalleryAccessToken(String(req.body?.access_token || ""), user.id, req.params.projectId);
    const item = parsedItems[index];
    let previewItem = item;
    if (item.type === "video") {
      const raw = typeof rawItems[index] === "object" ? rawItems[index] : {};
      let thumbnailUrl = String(raw.thumbnail_url || raw.poster_url || "").trim();
      if (!thumbnailUrl) {
        const youtubeId = item.url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/)?.[1];
        if (youtubeId) thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
      }
      if (!thumbnailUrl) {
        const title = String(item.title || gallery.title || "Video preview").replace(/[<>&]/g, "");
        const placeholder = Buffer.from(`<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#071827"/><stop offset="1" stop-color="#164e63"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><circle cx="640" cy="330" r="72" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.72)" stroke-width="4"/><path d="M620 287 L620 373 L686 330 Z" fill="white"/><text x="640" y="470" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="34" font-weight="700">${title}</text><text x="640" y="520" text-anchor="middle" fill="rgba(255,255,255,.7)" font-family="Arial,sans-serif" font-size="22">Video</text></svg>`);
        const buffer = await sharp(placeholder).jpeg({ quality: 88 }).toBuffer();
        res.setHeader("Content-Type", "image/jpeg"); res.setHeader("Cache-Control", "private, no-store");
        return res.send(buffer);
      }
      previewItem = { url: thumbnailUrl, type: "image", title: item.title };
    } else {
      const raw = typeof rawItems[index] === "object" ? rawItems[index] : {};
      // Preview generation must not make Vercel decode the full-resolution
      // master. The stored optimized image is visually equivalent here and
      // keeps Sharp memory and execution time predictable.
      previewItem = {
        ...item,
        url: String(raw.compressed_url || raw.thumbnail_url || item.url),
      };
    }
    const prepared = await prepareGalleryFile(previewItem, index, unlocked);
    res.setHeader("Content-Type", prepared.mimeType || "image/jpeg");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(prepared.buffer);
  } catch (error: any) {
    console.error("Gallery preview failed", error);
    return res.status(500).json({ error: error.message || "Gallery preview failed" });
  }
});

clientRouter.post("/projects/:projectId/galleries/:galleryId/download", async (req, res) => {
  try {
    const user = (req as any).user;
    const gallery = await getOwnedGallery(user?.id, req.params.projectId, req.params.galleryId);
    if (!gallery) return res.status(404).json({ error: "Gallery not found" });

    const accessToken = String(req.body?.access_token || "");
    const unlocked = await hasGalleryAccessToken(accessToken, user.id, req.params.projectId);
    let items = parseGalleryItems(gallery.image_urls);
    const rawItems = rawGalleryItems(gallery.image_urls);
    if (items.length === 0 && gallery.media_url) items = [{ url: String(gallery.media_url), type: gallery.media_type === "video" ? "video" : "image" }];
    const variant = req.body?.variant === "optimized" ? "optimized" : "original";
    const requested = Array.isArray(req.body?.indexes) ? [...new Set(req.body.indexes.map(Number))] : items.map((_: any, index: number) => index);
    if (!requested.length || requested.some((index: number) => !Number.isInteger(index) || index < 0 || index >= items.length)) {
      return res.status(400).json({ error: "Select at least one valid gallery item" });
    }
    let selected = requested.map((index: number) => ({ item: items[index], index }));
    if (variant === "optimized") {
      selected = selected.filter(({ index, item }: any) => item.type === "image" && Boolean(rawItems[index]?.compressed_url)).map(({ index, item }: any) => ({
        index,
        item: {
          ...item,
          url: String(rawItems[index].compressed_url),
          title: String(rawItems[index].compressed_filename || item.title || `optimized-${index + 1}`).replace(/\.[^.]+$/, ""),
        },
      }));
      if (selected.length === 0) return res.status(404).json({ error: "No optimized images are available in this selection" });
    }
    if (!unlocked && selected.some(({ item }: any) => item.type === "video")) {
      return res.status(403).json({ error: "Enter the download PIN before downloading video files", code: "PIN_REQUIRED_FOR_VIDEO" });
    }
    const files = [];
    for (const { item, index } of selected) files.push(await prepareGalleryFile(item, index, unlocked, variant === "optimized"));
    const zip = createZip(files);
    const safeTitle = String(gallery.title || "gallery").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "gallery";
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}${variant === "optimized" ? "-optimized-under-10mb" : ""}${unlocked ? "" : "-watermarked"}.zip"`);
    res.setHeader("Content-Length", zip.length);
    return res.send(zip);
  } catch (error: any) {
    console.error("Gallery download failed", error);
    return res.status(500).json({ error: error.message || "Gallery download failed" });
  }
});

// Client's own Properties
clientRouter.get("/properties", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await db.execute({
      sql: `SELECT * FROM client_properties 
            WHERE client_id = ? 
            ORDER BY sort_order ASC, created_at ASC`,
      args: [user.id]
    });

    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch client properties", error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

clientRouter.post("/properties", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { property_name, address, metadata } = req.body || {};
    const cleanAddress = typeof address === "string" ? address.trim() : "";
    const cleanPropertyName = typeof property_name === "string" ? property_name.trim() : "";
    if (!cleanAddress) {
      return res.status(400).json({ error: "Property address is required" });
    }

    const id = crypto.randomUUID();
    const countRes = await db.execute({
      sql: "SELECT COUNT(*) as count FROM client_properties WHERE client_id = ?",
      args: [user.id]
    });
    const nextOrder = Number(countRes.rows[0]?.count || 0);

    await db.execute({
      sql: `INSERT INTO client_properties (id, client_id, property_name, address, metadata, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        id,
        user.id,
        cleanPropertyName || "Property",
        cleanAddress,
        metadata && typeof metadata === "object" ? JSON.stringify(metadata) : (typeof metadata === "string" ? metadata : "{}"),
        nextOrder
      ]
    });

    // Update users.property_address if primary is empty
    await db.execute({
      sql: `UPDATE users SET property_address = ? 
            WHERE id = ? AND (property_address IS NULL OR property_address = '')`,
      args: [cleanAddress, user.id]
    });

    const item = await db.execute({
      sql: "SELECT * FROM client_properties WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, property: item.rows[0] });
  } catch (error) {
    console.error("Failed to create property", error);
    res.status(500).json({ error: "Failed to save property" });
  }
});

clientRouter.put("/properties/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { property_name, address, metadata } = req.body || {};
    const cleanAddress = typeof address === "string" ? address.trim() : "";
    const cleanPropertyName = typeof property_name === "string" ? property_name.trim() : "";
    if (!cleanAddress) {
      return res.status(400).json({ error: "Property address is required" });
    }

    const existing = await db.execute({
      sql: "SELECT id FROM client_properties WHERE id = ? AND client_id = ?",
      args: [req.params.id, user.id]
    });
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Property not found" });
    }

    await db.execute({
      sql: `UPDATE client_properties 
            SET property_name = ?, address = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND client_id = ?`,
      args: [
        cleanPropertyName || "Property",
        cleanAddress,
        metadata && typeof metadata === "object" ? JSON.stringify(metadata) : (typeof metadata === "string" ? metadata : "{}"),
        req.params.id,
        user.id
      ]
    });

    const item = await db.execute({
      sql: "SELECT * FROM client_properties WHERE id = ?",
      args: [req.params.id]
    });

    res.json({ success: true, property: item.rows[0] });
  } catch (error) {
    console.error("Failed to update property", error);
    res.status(500).json({ error: "Failed to update property" });
  }
});

clientRouter.delete("/properties/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await db.execute({
      sql: "DELETE FROM client_properties WHERE id = ? AND client_id = ?",
      args: [req.params.id, user.id]
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete property", error);
    res.status(500).json({ error: "Failed to delete property" });
  }
});

// Client's own Links
clientRouter.get("/links", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await db.execute({
      sql: `SELECT * FROM client_links 
            WHERE client_id = ? 
            ORDER BY sort_order ASC, created_at ASC`,
      args: [user.id]
    });

    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch client links", error);
    res.status(500).json({ error: "Failed to fetch links" });
  }
});

clientRouter.post("/links", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { label, url, metadata } = req.body;
    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ error: "URL is required" });
    }

    const id = crypto.randomUUID();
    const countRes = await db.execute({
      sql: "SELECT COUNT(*) as count FROM client_links WHERE client_id = ?",
      args: [user.id]
    });
    const nextOrder = Number(countRes.rows[0]?.count || 0);

    await db.execute({
      sql: `INSERT INTO client_links (id, client_id, label, url, metadata, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        id,
        user.id,
        label ? label.trim() : "Listing Link",
        url.trim(),
        typeof metadata === "object" ? JSON.stringify(metadata) : (metadata || "{}"),
        nextOrder
      ]
    });

    const item = await db.execute({
      sql: "SELECT * FROM client_links WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, link: item.rows[0] });
  } catch (error) {
    console.error("Failed to create link", error);
    res.status(500).json({ error: "Failed to save link" });
  }
});

clientRouter.put("/links/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { label, url, metadata } = req.body;
    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ error: "URL is required" });
    }

    const existing = await db.execute({
      sql: "SELECT id FROM client_links WHERE id = ? AND client_id = ?",
      args: [req.params.id, user.id]
    });
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Link not found" });
    }

    await db.execute({
      sql: `UPDATE client_links 
            SET label = ?, url = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND client_id = ?`,
      args: [
        label ? label.trim() : "Listing Link",
        url.trim(),
        typeof metadata === "object" ? JSON.stringify(metadata) : (metadata || "{}"),
        req.params.id,
        user.id
      ]
    });

    const item = await db.execute({
      sql: "SELECT * FROM client_links WHERE id = ?",
      args: [req.params.id]
    });

    res.json({ success: true, link: item.rows[0] });
  } catch (error) {
    console.error("Failed to update link", error);
    res.status(500).json({ error: "Failed to update link" });
  }
});

clientRouter.delete("/links/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await db.execute({
      sql: "DELETE FROM client_links WHERE id = ? AND client_id = ?",
      args: [req.params.id, user.id]
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete link", error);
    res.status(500).json({ error: "Failed to delete link" });
  }
});

// Client's own Invoices
clientRouter.get("/invoices", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userEmail = (user.email || "").toLowerCase().trim();

    const result = await db.execute({
      sql: `SELECT * FROM invoices
            WHERE LOWER(TRIM(client_email)) = ?
              AND LOWER(TRIM(status)) NOT IN ('draft', 'cancelled')
              AND (
                archived_at IS NULL
                OR LOWER(TRIM(status)) = 'paid'
                OR COALESCE(amount_paid, 0) >= COALESCE(total_amount, 0)
              )
            ORDER BY issue_date DESC, created_at DESC`,
      args: [userEmail]
    });

    const todayStr = new Date().toISOString().split("T")[0];
    const invoices = await Promise.all(result.rows.map(async (inv: any) => {
      let status = inv.status;
      if (status !== "paid" && status !== "cancelled" && inv.due_date && inv.due_date < todayStr) {
        status = "overdue";
      }

      const itemsRes = await db.execute({
        sql: "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC",
        args: [inv.id]
      });

      return {
        ...inv,
        status,
        items: itemsRes.rows
      };
    }));

    res.json(invoices);
  } catch (error) {
    console.error("Failed to fetch client invoices", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

clientRouter.get("/invoices/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userEmail = (user.email || "").toLowerCase().trim();

    const result = await db.execute({
      sql: `SELECT * FROM invoices
            WHERE id = ?
              AND LOWER(TRIM(client_email)) = ?
              AND LOWER(TRIM(status)) NOT IN ('draft', 'cancelled')
              AND (
                archived_at IS NULL
                OR LOWER(TRIM(status)) = 'paid'
                OR COALESCE(amount_paid, 0) >= COALESCE(total_amount, 0)
              )`,
      args: [req.params.id, userEmail]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const inv = result.rows[0] as any;
    const itemsRes = await db.execute({
      sql: "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC",
      args: [inv.id]
    });

    const paymentsRes = await db.execute({
      sql: "SELECT amount, payment_date, payment_method, transaction_reference, created_at FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date DESC",
      args: [inv.id]
    });

    res.json({
      ...inv,
      items: itemsRes.rows,
      payments: paymentsRes.rows
    });
  } catch (error) {
    console.error("Failed to fetch client invoice detail", error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

// =========================================================================
// Client's Referral & Invite Program Endpoints
// =========================================================================

// Get client's complete referral profile, stats, vouchers & tier status
clientRouter.get("/referrals/profile", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const origin = getAppUrl(req);
    const profile = await getClientReferralProfile(user.id, origin);
    res.json(profile);
  } catch (error: any) {
    console.error("Failed to fetch client referral profile:", error);
    res.status(500).json({ error: error.message || "Failed to load referral profile" });
  }
});

// Send direct email invite to a friend/colleague
clientRouter.post("/referrals/invite-email", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { recipient_email, recipient_name, custom_message } = req.body;
    if (!recipient_email || typeof recipient_email !== "string" || !recipient_email.includes("@")) {
      return res.status(400).json({ error: "Valid recipient email is required" });
    }

    const targetEmail = recipient_email.trim().toLowerCase();
    if (targetEmail === (user.email || "").toLowerCase()) {
      return res.status(400).json({ error: "You cannot invite yourself" });
    }

    const origin = getAppUrl(req);
    const code = await ensureUserReferralCode(user.id, user.email);
    const inviteUrl = `${origin}/client/register?ref=${code}`;
    const config = await getEmailSenderConfig();

    const senderName = user.name || user.email.split("@")[0];
    const subject = `${senderName} invited you to join ${config.studioName} VIP Client Portal`;

    const emailResult = await sendTransactionalEmail({
      to: targetEmail,
      templateId: "account_created_confirmation",
      subject,
      templateData: {
        name: recipient_name || "Colleague",
        title: `${senderName} has invited you to ${config.studioName}`,
        content: `
          <p style="margin-bottom: 12px;"><strong>${senderName}</strong> is recommending our photography, floor plan, and visual media production services.</p>
          ${custom_message ? `<blockquote style="border-left: 3px solid #3b82f6; padding-left: 12px; margin: 12px 0; color: #475569; font-style: italic;">"${custom_message}"</blockquote>` : ""}
          <p style="margin-top: 12px;">Register your client account today with exclusive referral code <code>${code}</code> to unlock special welcome discounts on your first booking!</p>
        `,
        action_url: inviteUrl,
        action_text: "Accept Invitation & Register",
        studio_name: config.studioName
      }
    });

    res.json({
      success: true,
      message: `Invitation successfully sent to ${targetEmail}`,
      invite_url: inviteUrl,
      emailResult
    });
  } catch (error: any) {
    console.error("Failed to send referral email invite:", error);
    res.status(500).json({ error: error.message || "Failed to send invitation" });
  }
});

export default clientRouter;
