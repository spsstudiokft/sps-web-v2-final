import { Router } from "express";
import crypto from "crypto";
import { db } from "../db.js";

export const exitCouponPublicRouter = Router();
export const exitCouponAdminRouter = Router();

let schemaReady = false;
async function ensureExitCouponSchema() {
  if (schemaReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS exit_intent_coupon_issues (
    id TEXT PRIMARY KEY, visitor_id TEXT UNIQUE NOT NULL, bonus_code_id TEXT UNIQUE NOT NULL,
    discount_percent INTEGER NOT NULL, page_path TEXT NOT NULL DEFAULT '/', user_agent TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_exit_intent_coupon_issues_created ON exit_intent_coupon_issues(created_at DESC)");
  schemaReady = true;
}

async function readConfig() {
  // Config is the first endpoint the public page and admin screen call. Make
  // it the migration gate as well, rather than deferring schema creation until
  // the first issued coupon is queried or claimed.
  await ensureExitCouponSchema();
  const result = await db.execute({ sql: "SELECT key, value FROM settings WHERE key IN ('exit_coupon_enabled', 'exit_coupon_expires_days', 'exit_coupon_repeat_days', 'exit_coupon_repeat_visits')", args: [] });
  const values = result.rows.reduce((acc: Record<string, string>, row: any) => ({ ...acc, [String(row.key)]: String(row.value || "") }), {});
  return { enabled: ["1", "true"].includes(values.exit_coupon_enabled?.toLowerCase() || ""), expiresDays: Math.min(90, Math.max(1, Number(values.exit_coupon_expires_days || 14) || 14)), repeatDays: Math.min(365, Math.max(1, Number(values.exit_coupon_repeat_days || 30) || 30)), repeatVisits: Math.min(100, Math.max(1, Number(values.exit_coupon_repeat_visits || 5) || 5)) };
}

exitCouponPublicRouter.get("/config", async (_req, res) => {
  try { const config = await readConfig(); res.set("Cache-Control", "public, max-age=30, s-maxage=60"); res.json(config); }
  catch { res.json({ enabled: false, expiresDays: 14, repeatDays: 30, repeatVisits: 5 }); }
});

exitCouponPublicRouter.post("/claim", async (req, res) => {
  try {
    await ensureExitCouponSchema();
    const config = await readConfig();
    if (!config.enabled) return res.status(404).json({ error: "Exit coupon is unavailable." });
    const visitorId = String(req.body?.visitor_id || "").trim();
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(visitorId)) return res.status(400).json({ error: "Invalid visitor identifier." });
    const existing = await db.execute({ sql: `SELECT i.discount_percent, c.code, c.expires_at FROM exit_intent_coupon_issues i JOIN custom_bonus_codes c ON c.id = i.bonus_code_id WHERE i.visitor_id = ? LIMIT 1`, args: [visitorId] });
    if (existing.rows.length) return res.json({ ...existing.rows[0], existing: true });
    const discount = crypto.randomInt(5, 26);
    const expiresAt = new Date(Date.now() + config.expiresDays * 86_400_000).toISOString().slice(0, 19).replace("T", " ");
    for (let attempt = 0; attempt < 5; attempt++) {
      const bonusId = crypto.randomUUID(); const code = `EXIT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      try {
        await db.execute({ sql: `INSERT INTO custom_bonus_codes (id, code, title, description, reward_type, reward_value, currency, usage_limit, expires_at, is_active, created_by_user_id)
          VALUES (?, ?, 'Exit-intent visitor coupon', 'Automatically issued when a visitor attempted to leave the public site.', 'discount_percent', ?, 'HUF', 1, ?, 1, NULL)`, args: [bonusId, code, discount, expiresAt] });
        await db.execute({ sql: "INSERT INTO exit_intent_coupon_issues (id, visitor_id, bonus_code_id, discount_percent, page_path, user_agent) VALUES (?, ?, ?, ?, ?, ?)", args: [crypto.randomUUID(), visitorId, bonusId, discount, String(req.body?.page_path || "/").slice(0, 500), String(req.headers["user-agent"] || "").slice(0, 1000)] });
        return res.status(201).json({ code, discount_percent: discount, expires_at: expiresAt, existing: false });
      } catch (error: any) {
        if (!/unique/i.test(String(error?.message || ""))) throw error;
      }
    }
    res.status(503).json({ error: "Coupon could not be generated. Try again." });
  } catch (error: any) { console.error("Exit coupon claim error", error); res.status(500).json({ error: error.message || "Coupon could not be generated." }); }
});

exitCouponAdminRouter.get("/config", async (_req, res) => {
  try { res.json(await readConfig()); } catch (error: any) { res.status(500).json({ error: error.message || "Could not load configuration." }); }
});
exitCouponAdminRouter.put("/config", async (req: any, res) => {
  if (String(req.user?.role || "").toLowerCase() !== "superadmin") return res.status(403).json({ error: "Only Superadmin can configure exit coupons." });
  const enabled = Boolean(req.body?.enabled); const expiresDays = Math.min(90, Math.max(1, Math.round(Number(req.body?.expiresDays) || 14))); const repeatDays = Math.min(365, Math.max(1, Math.round(Number(req.body?.repeatDays) || 30))); const repeatVisits = Math.min(100, Math.max(1, Math.round(Number(req.body?.repeatVisits) || 5)));
  try { await Promise.all([["exit_coupon_enabled", enabled ? "1" : "0"], ["exit_coupon_expires_days", String(expiresDays)], ["exit_coupon_repeat_days", String(repeatDays)], ["exit_coupon_repeat_visits", String(repeatVisits)]].map(([key, value]) => db.execute({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", args: [key, value] }))); res.json({ enabled, expiresDays, repeatDays, repeatVisits }); }
  catch (error: any) { res.status(500).json({ error: error.message || "Could not save configuration." }); }
});
exitCouponAdminRouter.get("/issues", async (_req, res) => {
  try { await ensureExitCouponSchema(); const rows = await db.execute({ sql: `SELECT i.*, c.code, c.expires_at, c.is_active, c.usage_count, COALESCE((SELECT COUNT(*) FROM custom_bonus_code_redemptions r WHERE r.bonus_code_id = c.id), 0) AS redemptions FROM exit_intent_coupon_issues i JOIN custom_bonus_codes c ON c.id = i.bonus_code_id ORDER BY i.created_at DESC LIMIT 500`, args: [] }); res.json(rows.rows); }
  catch (error: any) { res.status(500).json({ error: error.message || "Could not load issued coupons." }); }
});
