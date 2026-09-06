import { Router } from "express";
import crypto from "crypto";
import { db } from "../db.js";
import { getAppUrl } from "./appUrl.js";
import { sendTransactionalEmail } from "./services/emailService.js";

export const landingCampaignAdminRouter = Router();
export const landingCampaignPublicRouter = Router();

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reservedSlugs = new Set(["admin", "client", "auth", "invoice", "invoices", "api", "contact", "portfolio", "properties", "changelog", "login", "register"]);
const clean = (value: unknown, max = 500) => String(value || "").trim().slice(0, max);
const sqlDate = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ");

function campaignInput(body: any) {
  const slug = clean(body?.slug, 80).toLowerCase();
  const title = clean(body?.title, 160);
  const rewardType = clean(body?.reward_type, 32);
  const rewardValue = Number(body?.reward_value);
  const expiresInDays = Number(body?.expires_in_days);
  if (!slugPattern.test(slug) || reservedSlugs.has(slug)) throw new Error("Use a unique, lowercase URL slug (for example: campaign-1).");
  if (!title) throw new Error("Campaign title is required.");
  if (!["discount_percent", "discount_fixed"].includes(rewardType)) throw new Error("Unsupported discount type.");
  if (!Number.isFinite(rewardValue) || rewardValue <= 0 || (rewardType === "discount_percent" && rewardValue > 100)) throw new Error("Enter a valid discount value.");
  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 3650) throw new Error("Coupon validity must be between 1 and 3650 days.");
  const prefix = clean(body?.coupon_prefix || "SPS", 16).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (prefix.length < 2) throw new Error("Coupon prefix must contain at least two letters or numbers.");
  return { slug, title, eyebrow: clean(body?.eyebrow, 120), description: clean(body?.description, 600), backgroundImageUrl: clean(body?.background_image_url, 1000), rewardType, rewardValue, currency: clean(body?.currency || "HUF", 8).toUpperCase(), couponPrefix: prefix, assignedBonusCodeId: clean(body?.assigned_bonus_code_id, 80) || null, expiresInDays, primaryCtaUrl: clean(body?.primary_cta_url || "/", 500), secondaryCtaUrl: clean(body?.secondary_cta_url, 500), isActive: body?.is_active === false ? 0 : 1 };
}

landingCampaignAdminRouter.get("/", async (_req, res) => {
  try {
    const result = await db.execute({ sql: `SELECT c.*, COUNT(s.id) AS submission_count FROM landing_campaigns c
      LEFT JOIN landing_campaign_submissions s ON s.campaign_id = c.id GROUP BY c.id ORDER BY c.created_at DESC` });
    res.json(result.rows);
  } catch (error: any) { res.status(500).json({ error: error.message || "Failed to load campaigns." }); }
});

landingCampaignAdminRouter.get("/available-coupons", async (_req, res) => {
  try {
    const result = await db.execute({ sql: `SELECT id, code, title, reward_type, reward_value, currency, expires_at, usage_limit, usage_count
      FROM custom_bonus_codes WHERE is_active = 1 AND campaign_id IS NULL
      AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) ORDER BY created_at DESC` });
    res.json(result.rows);
  } catch (error: any) { res.status(500).json({ error: error.message || "Failed to load available coupons." }); }
});

landingCampaignAdminRouter.post("/", async (req: any, res) => {
  try {
    const data = campaignInput(req.body); const id = crypto.randomUUID();
    await db.execute({ sql: `INSERT INTO landing_campaigns (id, slug, title, eyebrow, description, background_image_url, reward_type, reward_value, currency, coupon_prefix, assigned_bonus_code_id, expires_in_days, primary_cta_url, secondary_cta_url, is_active, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [id, data.slug, data.title, data.eyebrow, data.description, data.backgroundImageUrl, data.rewardType, data.rewardValue, data.currency, data.couponPrefix, data.assignedBonusCodeId, data.expiresInDays, data.primaryCtaUrl, data.secondaryCtaUrl, data.isActive, req.user?.id || null] });
    res.status(201).json({ success: true, id });
  } catch (error: any) { res.status(/unique/i.test(error.message) ? 409 : 400).json({ error: error.message || "Failed to create campaign." }); }
});

landingCampaignAdminRouter.put("/:id", async (req, res) => {
  try {
    const data = campaignInput(req.body);
    const result = await db.execute({ sql: `UPDATE landing_campaigns SET slug=?, title=?, eyebrow=?, description=?, background_image_url=?, reward_type=?, reward_value=?, currency=?, coupon_prefix=?, assigned_bonus_code_id=?, expires_in_days=?, primary_cta_url=?, secondary_cta_url=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, args: [data.slug, data.title, data.eyebrow, data.description, data.backgroundImageUrl, data.rewardType, data.rewardValue, data.currency, data.couponPrefix, data.assignedBonusCodeId, data.expiresInDays, data.primaryCtaUrl, data.secondaryCtaUrl, data.isActive, req.params.id] });
    if (!Number((result as any).rowsAffected || 0)) return res.status(404).json({ error: "Campaign not found." }); res.json({ success: true });
  } catch (error: any) { res.status(/unique/i.test(error.message) ? 409 : 400).json({ error: error.message || "Failed to update campaign." }); }
});

landingCampaignAdminRouter.get("/:id/submissions", async (req, res) => {
  try { const result = await db.execute({ sql: "SELECT * FROM landing_campaign_submissions WHERE campaign_id = ? ORDER BY created_at DESC", args: [req.params.id] }); res.json(result.rows); }
  catch (error: any) { res.status(500).json({ error: error.message || "Failed to load submissions." }); }
});

landingCampaignAdminRouter.patch("/:id/active", async (req, res) => {
  if (typeof req.body?.is_active !== "boolean") return res.status(400).json({ error: "An active status is required." });
  const result = await db.execute({ sql: "UPDATE landing_campaigns SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [req.body.is_active ? 1 : 0, req.params.id] });
  if (!Number((result as any).rowsAffected || 0)) return res.status(404).json({ error: "Campaign not found." });
  res.json({ success: true });
});

landingCampaignAdminRouter.delete("/:id", async (req, res) => {
  try {
    const used = await db.execute({ sql: "SELECT COUNT(*) AS count FROM landing_campaign_submissions WHERE campaign_id = ?", args: [req.params.id] });
    if (Number((used.rows[0] as any)?.count || 0) > 0) return res.status(409).json({ error: "A kitöltésekkel rendelkező kampány nem törölhető. Kapcsold ki, hogy az auditadatok megmaradjanak." });
    const result = await db.execute({ sql: "DELETE FROM landing_campaigns WHERE id = ?", args: [req.params.id] });
    if (!Number((result as any).rowsAffected || 0)) return res.status(404).json({ error: "Campaign not found." });
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message || "Failed to delete campaign." }); }
});

landingCampaignPublicRouter.get("/:slug", async (req, res) => {
  const result = await db.execute({ sql: "SELECT id, slug, title, eyebrow, description, background_image_url, reward_type, reward_value, currency, expires_in_days, primary_cta_url, secondary_cta_url FROM landing_campaigns WHERE slug = ? AND is_active = 1 LIMIT 1", args: [String(req.params.slug || "").toLowerCase()] });
  if (!result.rows.length) return res.status(404).json({ error: "Campaign not found or inactive." }); res.json(result.rows[0]);
});

landingCampaignPublicRouter.post("/:slug/submit", async (req, res) => {
  try {
    const campaignResult = await db.execute({ sql: "SELECT * FROM landing_campaigns WHERE slug = ? AND is_active = 1 LIMIT 1", args: [String(req.params.slug || "").toLowerCase()] });
    const campaign: any = campaignResult.rows[0]; if (!campaign) return res.status(404).json({ error: "Campaign not found or inactive." });
    const fullName = clean(req.body?.full_name, 160); const email = clean(req.body?.email, 254).toLowerCase();
    const identityType = clean(req.body?.identity_type, 120); const interest = clean(req.body?.interest, 120);
    if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || !identityType || !interest || req.body?.privacy_accepted !== true) return res.status(400).json({ error: "Please complete all required fields and accept the privacy notice." });
    const existing = await db.execute({ sql: "SELECT coupon_code, coupon_expires_at, email_status, email FROM landing_campaign_submissions WHERE campaign_id = ? AND email = ? LIMIT 1", args: [campaign.id, email] });
    if (existing.rows.length) {
      const prior: any = existing.rows[0];
      let emailStatus = String(prior.email_status || "pending"); let messageId = "";
      if (emailStatus !== "sent") {
        try {
          const reward = campaign.reward_type === "discount_percent" ? `${campaign.reward_value}%` : `${campaign.reward_value} ${campaign.currency}`;
          const sent = await sendTransactionalEmail({ to: email, templateId: "campaign_coupon_claimed", templateData: { recipient_name: fullName, campaign_title: campaign.title, coupon_code: prior.coupon_code, reward_value_label: reward, expires_at: prior.coupon_expires_at ? new Date(`${prior.coupon_expires_at}Z`).toLocaleDateString("hu-HU") : "", action_url: `${getAppUrl(req)}/${campaign.slug}`, action_text: "Megnézem a kampányt" } });
          emailStatus = sent.status; messageId = sent.messageId || "";
          await db.execute({ sql: "UPDATE landing_campaign_submissions SET email_status = ?, email_message_id = ? WHERE campaign_id = ? AND email = ?", args: [emailStatus, messageId, campaign.id, email] });
        } catch (error) { console.error("Campaign coupon resend failed", error); }
      }
      return res.json({ success: true, already_claimed: true, coupon: { ...prior, email_status: emailStatus }, email, campaign: { title: campaign.title, reward_type: campaign.reward_type, reward_value: campaign.reward_value, currency: campaign.currency, expires_in_days: campaign.expires_in_days } });
    }
    let expiresAt = new Date(Date.now() + Number(campaign.expires_in_days) * 86400000); let code = ""; let assignedCode: any = null;
    if (campaign.assigned_bonus_code_id) { const assigned = await db.execute({ sql: "SELECT * FROM custom_bonus_codes WHERE id = ? AND is_active = 1 AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP) AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) LIMIT 1", args: [campaign.assigned_bonus_code_id] }); assignedCode = assigned.rows[0]; if (!assignedCode) return res.status(409).json({ error: "The campaign's assigned coupon is unavailable, inactive, or expired." }); code = String(assignedCode.code); if (assignedCode.expires_at) expiresAt = new Date(`${assignedCode.expires_at}Z`); }
    if (!assignedCode) for (let attempt = 0; attempt < 5; attempt++) { const candidate = `${campaign.coupon_prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`; const found = await db.execute({ sql: "SELECT id FROM custom_bonus_codes WHERE code = ? LIMIT 1", args: [candidate] }); if (!found.rows.length) { code = candidate; break; } }
    if (!code) throw new Error("Could not generate a unique coupon. Please try again.");
    const bonusId = assignedCode ? null : crypto.randomUUID(); const submissionId = crypto.randomUUID();
    if (!assignedCode) await db.execute({ sql: `INSERT INTO custom_bonus_codes (id, code, title, description, reward_type, reward_value, currency, usage_limit, expires_at, is_active, created_by_user_id, issued_to_email, campaign_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 1, NULL, ?, ?)`, args: [bonusId, code, campaign.title, `Personal campaign coupon for ${email}`, campaign.reward_type, campaign.reward_value, campaign.currency, sqlDate(expiresAt), email, campaign.id] });
    try { await db.execute({ sql: `INSERT INTO landing_campaign_submissions (id, campaign_id, full_name, email, phone, identity_type, interest, city, marketing_consent, privacy_accepted, coupon_code, coupon_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`, args: [submissionId, campaign.id, fullName, email, clean(req.body?.phone, 60), identityType, interest, clean(req.body?.city, 160), req.body?.marketing_consent === true ? 1 : 0, code, sqlDate(expiresAt)] }); }
    catch (error) { if (bonusId) await db.execute({ sql: "DELETE FROM custom_bonus_codes WHERE id = ?", args: [bonusId] }); throw error; }
    let emailStatus = "failed"; let messageId = "";
    try {
      const rewardType = assignedCode?.reward_type || campaign.reward_type; const rewardValue = assignedCode?.reward_value ?? campaign.reward_value; const rewardCurrency = assignedCode?.currency || campaign.currency; const reward = rewardType === "discount_percent" ? `${rewardValue}%` : `${rewardValue} ${rewardCurrency}`;
      const sent = await sendTransactionalEmail({ to: email, templateId: "campaign_coupon_claimed", templateData: { recipient_name: fullName, campaign_title: campaign.title, coupon_code: code, reward_value_label: reward, expires_at: expiresAt.toLocaleDateString("hu-HU"), action_url: `${getAppUrl(req)}/${campaign.slug}`, action_text: "Megnézem a kampányt" } });
      emailStatus = sent.status; messageId = sent.messageId || "";
    } catch (error) { console.error("Campaign coupon email failed", error); }
    await db.execute({ sql: "UPDATE landing_campaign_submissions SET email_status = ?, email_message_id = ? WHERE id = ?", args: [emailStatus, messageId, submissionId] });
    res.status(201).json({ success: true, email, coupon: { coupon_code: code, coupon_expires_at: sqlDate(expiresAt), email_status: emailStatus }, campaign: { title: campaign.title, reward_type: campaign.reward_type, reward_value: campaign.reward_value, currency: campaign.currency, expires_in_days: campaign.expires_in_days } });
  } catch (error: any) { console.error("Campaign submission failed", error); res.status(/unique/i.test(error.message) ? 409 : 500).json({ error: error.message || "Could not submit the form." }); }
});
