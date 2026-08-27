import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { checkBotId } from "botid/server";
import { db, getDb, isLocalDemoDatabase, LOCAL_DEMO_ADMIN } from "../db.js";
import { 
  processRegistrationReferral, 
  ensureUserReferralCode 
} from "./services/referralService.js";
import { translationService } from "./services/translationService.js";
import { getAllLegalDocuments } from "./services/legalDocumentService.js";
import { markGoogleReviewClicked } from "./services/googleReviewService.js";
import { getAppUrl } from "./appUrl.js";
import { prepareGalleryFile } from "./services/galleryDownloadService.js";
import { 
  sendPasswordResetToken, 
  sendInquiryAlerts, 
  sendTransactionalEmail,
  sendMagicLinkEmail,
  getEmailSenderConfig 
} from "./services/emailService.js";
import { requireAuth, requireAdmin, requireClient } from "./authMiddleware.js";
import {
  createAndSendEmailChallenge,
  hasEnabledEmailFactor,
  recordSecurityEvent,
  setEmailFactorEnabled,
  verifyEmailChallenge,
  type AccountContext,
} from "./services/mfaService.js";
export { requireAuth, requireAdmin, requireClient } from "./authMiddleware.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtstring";

function resolveLoginIdentity(user: any, accountContext: AccountContext) {
  const primaryRole = String(user.role || "admin").toLowerCase().replace(/[_-]/g, "");
  const secondaryAdminRole = String(user.admin_role || "").toLowerCase().replace(/[_-]/g, "");
  const primaryIsAdmin = ["superadmin", "admin", "editor", "viewer"].includes(primaryRole);
  const useSecondaryAdmin = accountContext === "admin" && !primaryIsAdmin && ["superadmin", "admin", "editor", "viewer"].includes(secondaryAdminRole);
  return {
    primaryRole,
    primaryIsAdmin,
    useSecondaryAdmin,
    effectiveRole: useSecondaryAdmin ? secondaryAdminRole : primaryRole,
    selectedHash: useSecondaryAdmin ? user.admin_password_hash : user.password_hash,
    effectiveActive: useSecondaryAdmin ? user.admin_is_active : user.is_active,
  };
}

function issueSession(user: any, role: string, accountContext: AccountContext, amr: string[]) {
  const publicUser = { id: user.id, email: user.email, role, name: user.name || "" };
  const token = jwt.sign({ ...publicUser, account_context: accountContext, amr, auth_time: Math.floor(Date.now() / 1000) }, JWT_SECRET, { expiresIn: "1d" });
  return { token, user: publicUser };
}

function maskEmailAddress(email: string) {
  const [local, domain] = email.split("@");
  return domain ? `${local.slice(0, 1) || "*"}***@${domain}` : "***";
}

function assertChallengeOwner(req: any, preauthToken: string, accountContext: AccountContext, purpose: "enrollment" | "disable") {
  try {
    const payload: any = jwt.verify(preauthToken, JWT_SECRET);
    if (payload?.purpose !== `2fa_${purpose}` || String(payload?.userId || "") !== String(req.user?.id || "") || payload?.accountContext !== accountContext) {
      throw new Error("mismatch");
    }
  } catch {
    throw Object.assign(new Error("The verification does not belong to this authenticated account or has expired."), { status: 403 });
  }
}

async function requireHuman(req: any, res: any, next: any) {
  // BotID is a Vercel-provided protection. Local and standalone test servers
  // do not receive its signed request metadata and must not call the verifier.
  if (process.env.VERCEL !== "1") return next();
  try {
    const verification = await checkBotId({ advancedOptions: { checkLevel: "basic", headers: req.headers } });
    if (verification.isBot) return res.status(403).json({ error: "This request could not pass the security check." });
    return next();
  } catch (error) {
    console.error("[BotID] Verification failed", error);
    if (process.env.VERCEL === "1" && process.env.NODE_ENV === "production") {
      return res.status(503).json({ error: "The security check is temporarily unavailable. Please try again shortly." });
    }
    return next();
  }
}

const PUBLIC_BOOTSTRAP_TTL_MS = 30_000;
let publicBootstrapCache: { expiresAt: number; payload: any } | null = null;
let publicBootstrapPending: Promise<any> | null = null;

async function clientWelcomeEmailsEnabled(): Promise<boolean> {
  try {
    const result = await db.execute({ sql: "SELECT value FROM settings WHERE key = 'client_welcome_email_enabled' LIMIT 1", args: [] });
    const value = String(result.rows[0]?.value ?? "1").trim().toLowerCase();
    return !["0", "false", "off", "no"].includes(value);
  } catch {
    return true;
  }
}

function hydratePublicPricing(rows: any[]): any[] {
  const tiersById = new Map(
    rows.filter((plan) => plan.type === "tier").map((plan) => [String(plan.id), plan])
  );

  return rows.filter((plan) => Boolean(plan.is_enabled)).map((plan) => {
    if (plan.type !== "bundle") return plan;
    let bundleItems: any[] = [];
    try {
      const parsed = typeof plan.bundle_services === "string"
        ? JSON.parse(plan.bundle_services || "[]")
        : plan.bundle_services;
      bundleItems = Array.isArray(parsed) ? parsed : [];
    } catch {
      return plan;
    }

    const resolvedItems = bundleItems.map((item) => {
      if (!item?.tier_id) return item;
      const tier = tiersById.get(String(item.tier_id)) as any;
      if (!tier) return { ...item, is_missing: true };
      const parseList = (value: any) => {
        try {
          const parsed = typeof value === "string" ? JSON.parse(value || "[]") : value;
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };
      return {
        ...item,
        item_type: "tier",
        service_title: tier.title,
        service_name: tier.title,
        original_price: Number(tier.price) || 0,
        features: [...new Set([...parseList(tier.features), ...parseList(tier.included_items)])],
        is_disabled: !Boolean(tier.is_enabled),
        is_missing: false,
      };
    });
    return { ...plan, bundle_services: JSON.stringify(resolvedItems) };
  });
}

function parsePublicListingArray(value: unknown): any[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value || "[]") : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizePublicPropertyListing(row: any) {
  const images = parsePublicListingArray(row.image_urls).map((image: any) => {
    const compressedUrl = String(image?.compressedUrl || image?.compressed_url || "");
    const thumbnailUrl = String(image?.thumbnailUrl || image?.thumbnail_url || "");
    const fallbackUrl = String(image?.url || "");
    return {
      url: compressedUrl || fallbackUrl,
      compressedUrl: compressedUrl || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      originalName: image?.originalName || image?.original_name || undefined,
    };
  }).filter((image: any) => image.url || image.thumbnailUrl);
  return {
    ...row,
    price_huf: Number(row.price_huf || 0),
    floor_area_sqm: Number(row.floor_area_sqm || 0),
    rooms: Number(row.rooms || 0),
    bathrooms: Number(row.bathrooms || 0),
    construction_year: row.construction_year == null ? null : Number(row.construction_year),
    floor_count: row.floor_count == null ? null : Number(row.floor_count),
    heating_types: parsePublicListingArray(row.heating_types),
    image_urls: images,
  };
}

async function loadPublicBootstrap() {
  const now = Date.now();
  if (publicBootstrapCache && publicBootstrapCache.expiresAt > now) return publicBootstrapCache.payload;
  if (publicBootstrapPending) return publicBootstrapPending;

  publicBootstrapPending = (async () => {
    const results = await getDb().batch([
      "SELECT key, value FROM settings",
      `SELECT p.*, c.name as category_name, c.slug as category_slug FROM portfolio_items p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_published = 1 ORDER BY p.sort_order ASC, p.created_at DESC LIMIT 6`,
      "SELECT * FROM services WHERE is_published = 1 ORDER BY sort_order ASC, created_at ASC",
      "SELECT * FROM pricing_plans ORDER BY sort_order ASC, created_at ASC LIMIT 3",
      "SELECT * FROM pricing_extra_services WHERE is_enabled = 1 AND (show_on_pricing_page IS NULL OR show_on_pricing_page = 1) ORDER BY sort_order ASC, created_at ASC LIMIT 3",
      "SELECT * FROM pricing_fee_rules WHERE is_enabled = 1 AND (show_on_pricing_page IS NULL OR show_on_pricing_page = 1) ORDER BY sort_order ASC, created_at ASC LIMIT 3",
      `SELECT f.*, fc.name as category_name, fc.slug as category_slug, fc.sort_order as category_sort_order FROM faqs f LEFT JOIN faq_categories fc ON f.category_id = fc.id WHERE f.is_published = 1 AND (fc.is_published = 1 OR fc.is_published IS NULL OR f.category_id IS NULL) ORDER BY COALESCE(fc.sort_order, 999) ASC, f.sort_order ASC, f.created_at ASC LIMIT 4`,
      "SELECT * FROM faq_categories WHERE is_published = 1 ORDER BY sort_order ASC LIMIT 4",
    ], "read");

    const settings = (results[0]?.rows || []).reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    const payload = {
      settings,
      portfolio: results[1]?.rows || [],
      services: results[2]?.rows || [],
      pricing: hydratePublicPricing((results[3]?.rows || []) as any[]),
      extraServices: results[4]?.rows || [],
      feeRules: results[5]?.rows || [],
      faqs: results[6]?.rows || [],
      faqCategories: results[7]?.rows || [],
      generatedAt: new Date().toISOString(),
    };
    publicBootstrapCache = { expiresAt: Date.now() + PUBLIC_BOOTSTRAP_TTL_MS, payload };
    return payload;
  })().finally(() => {
    publicBootstrapPending = null;
  });

  return publicBootstrapPending;
}

router.get("/public/google-review/:token", async (req, res) => {
  try {
    const destination = await markGoogleReviewClicked(String(req.params.token || ""));
    if (!destination) return res.status(404).send("Review request not found.");
    const safeDestination = /^https:\/\//i.test(destination) ? destination : "/";
    return res.redirect(302, safeDestination);
  } catch (error) {
    console.error("Google review tracking redirect failed:", error);
    return res.redirect(302, "/");
  }
});

router.get("/public/properties", async (_req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT pl.*,
                   COALESCE(NULLIF(pla.name, ''), NULLIF(owner.name, ''), NULLIF(creator.name, ''), 'SPS Studio') AS contact_name,
                   COALESCE(NULLIF(pla.email, ''), NULLIF(owner.email, ''), NULLIF(creator.email, ''),
                     (SELECT value FROM settings WHERE key = 'contact_email' LIMIT 1)) AS contact_email
            FROM property_listings pl
            JOIN properties p ON p.id = pl.property_id AND p.archived_at IS NULL
            LEFT JOIN property_listing_accounts pla ON pla.id = pl.owner_account_id
            LEFT JOIN users owner ON owner.id = pla.portal_user_id
            LEFT JOIN users creator ON creator.id = pl.created_by_user_id
            WHERE pl.is_enabled = 1
            ORDER BY CASE pl.listing_status WHEN 'active' THEN 0 WHEN 'reserved' THEN 1 ELSE 2 END,
                     pl.updated_at DESC`,
      args: [],
    });
    // Listing visibility is controlled by administrators and must become
    // public immediately. Do not let Vercel serve a previously cached empty
    // catalog after a listing has been enabled.
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.json(result.rows.map(normalizePublicPropertyListing));
  } catch (error) {
    console.error("Failed to load public property listings", error);
    res.status(500).json({ error: "Az ingatlanhirdetések jelenleg nem tölthetők be." });
  }
});

router.get("/public/properties/:id", async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT pl.*,
                   COALESCE(NULLIF(pla.name, ''), NULLIF(owner.name, ''), NULLIF(creator.name, ''), 'SPS Studio') AS contact_name,
                   COALESCE(NULLIF(pla.email, ''), NULLIF(owner.email, ''), NULLIF(creator.email, ''),
                     (SELECT value FROM settings WHERE key = 'contact_email' LIMIT 1)) AS contact_email
            FROM property_listings pl
            JOIN properties p ON p.id = pl.property_id AND p.archived_at IS NULL
            LEFT JOIN property_listing_accounts pla ON pla.id = pl.owner_account_id
            LEFT JOIN users owner ON owner.id = pla.portal_user_id
            LEFT JOIN users creator ON creator.id = pl.created_by_user_id
            WHERE pl.id = ? AND pl.is_enabled = 1 LIMIT 1`,
      args: [req.params.id],
    });
    if (!result.rows.length) return res.status(404).json({ error: "Az ingatlanhirdetés nem található." });
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.json(normalizePublicPropertyListing(result.rows[0]));
  } catch (error) {
    console.error("Failed to load public property listing", error);
    res.status(500).json({ error: "Az ingatlanhirdetés jelenleg nem tölthető be." });
  }
});

// ... API routes will be added here
router.get("/setup/status", async (req, res) => {
  try {
    const result = await db.execute("SELECT COUNT(*) as count FROM users");
    const count = Number(result.rows[0].count);
    res.json({ isSetupComplete: count > 0 });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/development/demo-accounts", (_req, res) => {
  res.set("Cache-Control", "no-store");
  if (!isLocalDemoDatabase()) return res.json({ enabled: false, accounts: [] });
  res.json({
    enabled: true,
    accounts: [{
      label: "Local Demo Admin",
      email: LOCAL_DEMO_ADMIN.email,
      password: LOCAL_DEMO_ADMIN.password,
      role: LOCAL_DEMO_ADMIN.role,
    }],
  });
});

router.post("/setup", async (req, res) => {
  try {
    const result = await db.execute("SELECT COUNT(*) as count FROM users");
    if (Number(result.rows[0].count) > 0) {
      return res.status(400).json({ error: "Setup already complete" });
    }

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();

    await db.execute({
      sql: "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
      args: [id, email, hash]
    });

    // Seed default settings
    const defaultSettings = [
      ["studio_name", "SPS Studio"],
      ["hero_headline", "Premium Real Estate Photography"],
      ["hero_subheadline", "Elevating property presentations with stunning visuals."],
      ["hero_production_card_enabled", "1"],
      ["about_text", "SPS Studio is a premier real estate photography studio dedicated to showcasing properties in their best light. With years of experience and an eye for detail, we provide top-tier visual marketing for realtors and homeowners."],
      ["contact_email", "contact@spsstudio.com"],
      ["contact_phone", "+1 234 567 890"],
      ["property_menu_enabled", "1"],
    ];

    for (const [key, value] of defaultSettings) {
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        args: [key, value]
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Setup failed" });
  }
});

router.post("/auth/login", requireHuman, async (req, res) => {
  try {
    const { email, password } = req.body;
    const accountContext: AccountContext | null = req.body?.account_context === "admin" ? "admin" : req.body?.account_context === "client" ? "client" : null;
    if (!accountContext) return res.status(400).json({ error: "A valid account context is required." });
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const result = await db.execute({
      sql: "SELECT * FROM users WHERE LOWER(TRIM(email)) = ?",
      args: [cleanEmail]
    });

    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user: any = result.rows[0];
    const { primaryRole, primaryIsAdmin, useSecondaryAdmin, effectiveRole, selectedHash, effectiveActive } = resolveLoginIdentity(user, accountContext);

    if (accountContext === "admin" && !primaryIsAdmin && !useSecondaryAdmin) {
      return res.status(401).json({ error: "No admin account exists for this email address." });
    }
    if (accountContext === "client" && primaryRole !== "client") {
      return res.status(401).json({ error: "No client account exists for this email address." });
    }

    const match = await bcrypt.compare(password, String(selectedHash || ""));

    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    if (effectiveActive === 0) return res.status(403).json({ error: "Account is disabled. Please contact the studio administrator." });

    // If client role, check if associated customer record is inactive
    if (effectiveRole === 'client') {
      const crmCheck = await db.execute({
        sql: "SELECT status FROM crm_records WHERE LOWER(TRIM(email)) = ? AND type = 'customer' LIMIT 1",
        args: [cleanEmail]
      });
      if (crmCheck.rows.length > 0 && crmCheck.rows[0].status === 'inactive') {
        return res.status(403).json({ error: "Portal access is disabled because the customer account is marked inactive." });
      }
    }

    if (await hasEnabledEmailFactor(String(user.id), accountContext)) {
      const challenge = await createAndSendEmailChallenge({ userId: String(user.id), email: String(user.email), name: String(user.name || ""), accountContext, req });
      return res.status(202).json({
        requires_2fa: true,
        method: "email_otp",
        masked_email: maskEmailAddress(cleanEmail),
        challenge_id: challenge.challengeId,
        preauth_token: challenge.preauthToken,
        expires_in: challenge.expiresIn,
        resend_after: challenge.resendAfter,
      });
    }

    await db.execute({ sql: "UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP WHERE id = ?", args: [user.id] });
    res.json(issueSession(user, effectiveRole, accountContext, ["pwd"]));
  } catch (error: any) {
    console.error("[Login Error]", error);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/2fa/verify", async (req, res) => {
  try {
    const challengeId = String(req.body?.challenge_id || "");
    const preauthToken = String(req.body?.preauth_token || "");
    const code = String(req.body?.code || "").replace(/\s/g, "");
    if (!challengeId || !preauthToken || !/^\d{8}$/.test(code)) return res.status(400).json({ error: "Enter the 8-digit verification code." });
    const verified = await verifyEmailChallenge({ challengeId, preauthToken, code, req, expectedPurpose: "login" });
    const result = await db.execute({ sql: "SELECT * FROM users WHERE id = ? LIMIT 1", args: [verified.userId] });
    const user: any = result.rows[0];
    if (!user) return res.status(401).json({ error: "The account no longer exists." });
    const identity = resolveLoginIdentity(user, verified.accountContext);
    if (verified.accountContext === "admin" && !identity.primaryIsAdmin && !identity.useSecondaryAdmin) return res.status(403).json({ error: "Admin access is no longer available for this account." });
    if (verified.accountContext === "client" && identity.primaryRole !== "client") return res.status(403).json({ error: "Client access is no longer available for this account." });
    if (identity.effectiveActive === 0) return res.status(403).json({ error: "Account is disabled." });
    if (verified.accountContext === "client") {
      const crmCheck = await db.execute({ sql: "SELECT status FROM crm_records WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND type = 'customer' LIMIT 1", args: [user.email] });
      if (crmCheck.rows[0]?.status === "inactive") return res.status(403).json({ error: "Portal access is disabled because the customer account is marked inactive." });
    }
    await db.execute({ sql: "UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP WHERE id = ?", args: [user.id] });
    return res.json(issueSession(user, identity.effectiveRole, verified.accountContext, ["pwd", "email_otp"]));
  } catch (error: any) {
    return res.status(Number(error?.status || 500)).json({ error: error?.message || "Verification failed." });
  }
});

router.post("/auth/2fa/email/resend", async (req, res) => {
  try {
    const preauth: any = jwt.verify(String(req.body?.preauth_token || ""), JWT_SECRET);
    if (preauth?.purpose !== "2fa_login" || !preauth?.userId || !preauth?.accountContext) return res.status(401).json({ error: "Invalid verification session." });
    const result = await db.execute({ sql: "SELECT id, email, name FROM users WHERE id = ? LIMIT 1", args: [preauth.userId] });
    const user: any = result.rows[0];
    if (!user) return res.status(401).json({ error: "The account no longer exists." });
    const challenge = await createAndSendEmailChallenge({ userId: String(user.id), email: String(user.email), name: String(user.name || ""), accountContext: preauth.accountContext, req, previousChallengeId: String(preauth.challengeId || "") });
    return res.json({ challenge_id: challenge.challengeId, preauth_token: challenge.preauthToken, expires_in: challenge.expiresIn, resend_after: challenge.resendAfter });
  } catch (error: any) {
    if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") return res.status(401).json({ error: "The verification session is invalid or expired." });
    if (error?.retryAfter) res.setHeader("Retry-After", String(error.retryAfter));
    return res.status(Number(error?.status || 500)).json({ error: error?.message || "The verification email could not be sent." });
  }
});

router.get("/auth/2fa/status", requireAuth, async (req: any, res) => {
  const accountContext: AccountContext = req.user?.account_context === "client" || req.user?.role === "client" ? "client" : "admin";
  res.json({ account_context: accountContext, email_otp_enabled: await hasEnabledEmailFactor(String(req.user.id), accountContext), totp_enabled: false });
});

router.post("/auth/2fa/email/enrollment/start", requireAuth, async (req: any, res) => {
  try {
    const accountContext: AccountContext = req.user?.account_context === "client" || req.user?.role === "client" ? "client" : "admin";
    if (await hasEnabledEmailFactor(String(req.user.id), accountContext)) return res.status(409).json({ error: "Email verification is already enabled." });
    const result = await db.execute({ sql: "SELECT id, email, name FROM users WHERE id = ? LIMIT 1", args: [req.user.id] });
    const user: any = result.rows[0];
    if (!user) return res.status(404).json({ error: "Account not found." });
    const challenge = await createAndSendEmailChallenge({ userId: String(user.id), email: String(user.email), name: String(user.name || ""), accountContext, purpose: "enrollment", req });
    res.json({ challenge_id: challenge.challengeId, preauth_token: challenge.preauthToken, masked_email: maskEmailAddress(String(user.email)), expires_in: challenge.expiresIn });
  } catch (error: any) {
    res.status(Number(error?.status || 500)).json({ error: error?.message || "The verification email could not be sent." });
  }
});

router.post("/auth/2fa/email/enrollment/confirm", requireAuth, async (req: any, res) => {
  try {
    const challengeId = String(req.body?.challenge_id || "");
    const preauthToken = String(req.body?.preauth_token || "");
    const code = String(req.body?.code || "").replace(/\s/g, "");
    if (!/^\d{8}$/.test(code)) return res.status(400).json({ error: "Enter the 8-digit verification code." });
    const accountContext: AccountContext = req.user?.account_context === "client" || req.user?.role === "client" ? "client" : "admin";
    assertChallengeOwner(req, preauthToken, accountContext, "enrollment");
    const verified = await verifyEmailChallenge({ challengeId, preauthToken, code, req, expectedPurpose: "enrollment" });
    if (verified.userId !== String(req.user.id) || verified.accountContext !== accountContext) return res.status(403).json({ error: "The verification does not belong to this account." });
    await setEmailFactorEnabled(String(req.user.id), accountContext, true);
    await recordSecurityEvent({ userId: String(req.user.id), accountContext, eventType: "email_otp_factor_enabled", req });
    res.json({ success: true, email_otp_enabled: true });
  } catch (error: any) {
    res.status(Number(error?.status || 500)).json({ error: error?.message || "Email verification could not be enabled." });
  }
});

router.post("/auth/2fa/email/disable/start", requireAuth, async (req: any, res) => {
  try {
    const accountContext: AccountContext = req.user?.account_context === "client" || req.user?.role === "client" ? "client" : "admin";
    if (!await hasEnabledEmailFactor(String(req.user.id), accountContext)) return res.status(409).json({ error: "Email verification is not enabled." });
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!password) return res.status(400).json({ error: "Your current password is required." });
    const result = await db.execute({ sql: "SELECT * FROM users WHERE id = ? LIMIT 1", args: [req.user.id] });
    const user: any = result.rows[0];
    if (!user) return res.status(404).json({ error: "Account not found." });
    const identity = resolveLoginIdentity(user, accountContext);
    if (!await bcrypt.compare(password, String(identity.selectedHash || ""))) {
      await recordSecurityEvent({ userId: String(req.user.id), accountContext, eventType: "email_otp_disable_password_failed", success: false, req });
      return res.status(401).json({ error: "The current password is incorrect." });
    }
    const challenge = await createAndSendEmailChallenge({ userId: String(user.id), email: String(user.email), name: String(user.name || ""), accountContext, purpose: "disable", req });
    res.json({ challenge_id: challenge.challengeId, preauth_token: challenge.preauthToken, masked_email: maskEmailAddress(String(user.email)), expires_in: challenge.expiresIn });
  } catch (error: any) {
    res.status(Number(error?.status || 500)).json({ error: error?.message || "The disable verification could not be started." });
  }
});

router.post("/auth/2fa/email/disable/confirm", requireAuth, async (req: any, res) => {
  try {
    const challengeId = String(req.body?.challenge_id || "");
    const preauthToken = String(req.body?.preauth_token || "");
    const code = String(req.body?.code || "").replace(/\s/g, "");
    if (!/^\d{8}$/.test(code)) return res.status(400).json({ error: "Enter the 8-digit verification code." });
    const accountContext: AccountContext = req.user?.account_context === "client" || req.user?.role === "client" ? "client" : "admin";
    assertChallengeOwner(req, preauthToken, accountContext, "disable");
    const verified = await verifyEmailChallenge({ challengeId, preauthToken, code, req, expectedPurpose: "disable" });
    if (verified.userId !== String(req.user.id) || verified.accountContext !== accountContext) return res.status(403).json({ error: "The verification does not belong to this account." });
    await setEmailFactorEnabled(String(req.user.id), accountContext, false);
    await recordSecurityEvent({ userId: String(req.user.id), accountContext, eventType: "email_otp_factor_disabled", req });
    res.json({ success: true, email_otp_enabled: false });
  } catch (error: any) {
    res.status(Number(error?.status || 500)).json({ error: error?.message || "Email verification could not be disabled." });
  }
});

router.post("/property-auth/login", async (req, res) => {
  try {
    const cleanEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!cleanEmail || !password) return res.status(400).json({ error: "Az email-cím és a jelszó megadása kötelező." });
    const result = await db.execute({
      sql: `SELECT pla.id AS property_account_id, pla.email, pla.name, pla.is_active AS property_account_active,
                   u.id AS portal_user_id, u.password_hash, u.password_auth_enabled, u.is_active AS portal_user_active
            FROM property_listing_accounts pla
            JOIN users u ON u.id = pla.portal_user_id
            WHERE LOWER(TRIM(pla.email)) = ? LIMIT 1`,
      args: [cleanEmail],
    });
    if (!result.rows.length) return res.status(401).json({ error: "Hibás email-cím vagy jelszó." });
    const account = result.rows[0];
    if (Number(account.property_account_active) !== 1 || Number(account.portal_user_active) !== 1) return res.status(403).json({ error: "A hirdetői fiók jelenleg nem aktív." });
    if (Number(account.password_auth_enabled ?? 1) !== 1) return res.status(403).json({ error: "Ehhez a fiókhoz még nincs jelszó beállítva. Előbb adj hozzá jelszót az ügyfélkapu beállításaiban." });
    const matches = await bcrypt.compare(password, String(account.password_hash || ""));
    if (!matches) return res.status(401).json({ error: "Hibás email-cím vagy jelszó." });
    const token = jwt.sign({
      id: String(account.portal_user_id), propertyAccountId: String(account.property_account_id),
      email: String(account.email), name: String(account.name || ""), role: "property_client", scope: "property-listings",
    }, JWT_SECRET, { expiresIn: "12h" });
    await db.execute({
      sql: "UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [account.portal_user_id],
    });
    res.json({ token, user: { id: account.property_account_id, email: account.email, name: account.name || "", role: "property_client" } });
  } catch (error) {
    console.error("[Property Login Error]", error);
    res.status(500).json({ error: "Az ingatlanos bejelentkezés sikertelen." });
  }
});

// Request Magic Link for Passwordless Sign-Up or Login
router.post("/auth/magic-link", requireHuman, async (req, res) => {
  try {
    const { email, type = "signup", property_address, advertisement_link, properties, referral_code, ref } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required" });
    }

    // Validate maximum 10 properties at registration
    if (Array.isArray(properties) && properties.length > 10) {
      return res.status(400).json({ 
        error: "Registration is limited to a maximum of 10 properties." 
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
    const cleanReferralCode = (referral_code || ref || "").toString().trim();

    // Check if customer record is inactive
    const crmCheck = await db.execute({
      sql: "SELECT status FROM crm_records WHERE LOWER(TRIM(email)) = ? AND type = 'customer' LIMIT 1",
      args: [cleanEmail]
    });
    if (crmCheck.rows.length > 0 && crmCheck.rows[0].status === 'inactive') {
      return res.status(403).json({ 
        error: "Portal access is disabled for this account because the customer is marked inactive." 
      });
    }

    // Check if existing user is deactivated
    const userCheck = await db.execute({
      sql: "SELECT is_active FROM users WHERE LOWER(TRIM(email)) = ?",
      args: [cleanEmail]
    });
    if (userCheck.rows.length > 0 && userCheck.rows[0].is_active === 0) {
      return res.status(403).json({ 
        error: "Portal access is currently disabled for this account. Please contact support." 
      });
    }

    // 1. Rate Limiting: Max 5 magic link requests per email/IP in 15 minutes
    try {
      const recentAttempts = await db.execute({
        sql: `SELECT COUNT(*) as count FROM magic_links 
              WHERE (email = ? OR ip_address = ?) 
                AND created_at > datetime('now', '-15 minutes')`,
        args: [cleanEmail, clientIp]
      });

      const attemptCount = Number(recentAttempts.rows[0]?.count || 0);
      if (attemptCount >= 5) {
        return res.status(429).json({ 
          error: "Too many login link requests. Please wait a few minutes before trying again." 
        });
      }
    } catch (rateLimitErr) {
      console.warn("Rate limit check warning:", rateLimitErr);
    }

    // Determine type: if requesting login and user exists or signup
    const normalizedType: "signup" | "login" = type === "login" ? "login" : "signup";

    // 2. Dispatch Magic Link Email
    const appOrigin = getAppUrl(req);
    const result = await sendMagicLinkEmail(cleanEmail, normalizedType, appOrigin, {
      property_address: typeof property_address === "string" ? property_address.trim() : "",
      advertisement_link: typeof advertisement_link === "string" ? advertisement_link.trim() : "",
      properties: Array.isArray(properties) ? properties : undefined,
      referral_code: cleanReferralCode,
      ip_address: clientIp
    });

    if (!result.success && !result.simulated) {
      console.error("[Magic Link Error] Failed to send email:", result.error);
      return res.status(500).json({ 
        error: "Failed to dispatch email. Please check your email configuration or try again." 
      });
    }

    res.json({
      success: true,
      message: normalizedType === "signup"
        ? "We've sent a magic registration link to your email address."
        : "We've sent a magic login link to your email address.",
      simulated: result.simulated,
      deduplicated: result.deduplicated === true
    });
  } catch (error: any) {
    console.error("[Magic Link Request Exception]", error);
    res.status(500).json({ error: "Failed to process magic link request." });
  }
});

// Verify Magic Link and Establish Client Session
router.post("/auth/verify-magic-link", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Verification token is required" });
    }

    // 1. Lookup magic link token
    const linkRes = await db.execute({
      sql: "SELECT * FROM magic_links WHERE token = ?",
      args: [token.trim()]
    });

    if (linkRes.rows.length === 0) {
      return res.status(400).json({ 
        error: "Invalid or unrecognized verification link.",
        code: "INVALID_TOKEN" 
      });
    }

    const magicLink = linkRes.rows[0];

    // 2. Check if already used
    if (magicLink.used_at) {
      return res.status(400).json({ 
        error: "This magic link has already been used. Please request a new one.",
        code: "ALREADY_USED",
        email: magicLink.email
      });
    }

    // 3. Check expiration
    const expiresAt = new Date(magicLink.expires_at as string).getTime();
    if (Date.now() > expiresAt) {
      return res.status(400).json({ 
        error: "This magic link has expired. Links are valid for 20 minutes for security.",
        code: "EXPIRED",
        email: magicLink.email
      });
    }

    const userEmail = (magicLink.email as string).trim().toLowerCase();

    // Check if customer record is inactive
    const crmStatusCheck = await db.execute({
      sql: "SELECT status FROM crm_records WHERE LOWER(TRIM(email)) = ? AND type = 'customer' LIMIT 1",
      args: [userEmail]
    });
    if (crmStatusCheck.rows.length > 0 && crmStatusCheck.rows[0].status === 'inactive') {
      return res.status(403).json({ 
        error: "Portal access is disabled for this account because the customer is marked inactive.",
        code: "ACCOUNT_INACTIVE" 
      });
    }

    // Parse submitted properties if any
    let submittedProps: Array<{ property_name?: string; address: string }> = [];
    if (magicLink.properties_json) {
      try {
        const parsed = JSON.parse(magicLink.properties_json as string);
        if (Array.isArray(parsed)) submittedProps = parsed;
      } catch (e) {}
    }

    // 4. Find or Create User Account
    let userRow: any = null;
    let clientWasCreated = false;
    const existingUserRes = await db.execute({
      sql: "SELECT * FROM users WHERE LOWER(TRIM(email)) = ?",
      args: [userEmail]
    });

    const primaryPropAddr = submittedProps.length > 0
      ? submittedProps[0].address
      : ((magicLink.property_address as string) || "");

    if (existingUserRes.rows.length > 0) {
      userRow = existingUserRes.rows[0];

      if (userRow.is_active === 0) {
        return res.status(403).json({ error: "Your portal account has been disabled. Please contact support." });
      }

      // Update optional metadata if not yet populated
      const adLink = (magicLink.advertisement_link as string) || "";
      if (primaryPropAddr || adLink) {
        try {
          await db.execute({
            sql: `UPDATE users SET 
                    property_address = CASE WHEN (property_address IS NULL OR property_address = '') THEN ? ELSE property_address END,
                    advertisement_link = CASE WHEN (advertisement_link IS NULL OR advertisement_link = '') THEN ? ELSE advertisement_link END
                  WHERE id = ?`,
            args: [primaryPropAddr, adLink, userRow.id]
          });
        } catch (e) {}
      }
    } else {
      // First-time user creation
      const newUserId = crypto.randomUUID();
      // Generate a strong random placeholder hash for passwordless users
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hash = await bcrypt.hash(randomPassword, 10);

      await db.execute({
        sql: `INSERT INTO users (id, email, password_hash, role, is_active, property_address, advertisement_link, password_auth_enabled)
              VALUES (?, ?, ?, 'client', 1, ?, ?, 0)`,
        args: [
          newUserId,
          userEmail,
          hash,
          primaryPropAddr,
          (magicLink.advertisement_link as string) || ""
        ]
      });

      userRow = {
        id: newUserId,
        email: userEmail,
        role: "client",
        is_active: 1
      };
      clientWasCreated = true;
    }

    // 4b. Insert properties into client_properties table for this user
    if (submittedProps.length > 0) {
      for (let i = 0; i < submittedProps.length; i++) {
        const p = submittedProps[i];
        if (p && p.address && p.address.trim()) {
          const addr = p.address.trim();
          const pName = p.property_name?.trim() || `Property ${i + 1}`;
          try {
            const propCheck = await db.execute({
              sql: "SELECT id FROM client_properties WHERE client_id = ? AND address = ?",
              args: [userRow.id, addr]
            });
            if (propCheck.rows.length === 0) {
              await db.execute({
                sql: `INSERT INTO client_properties (id, client_id, property_name, address, sort_order)
                      VALUES (?, ?, ?, ?, ?)`,
                args: [crypto.randomUUID(), userRow.id, pName, addr, i]
              });
            }
          } catch (propErr) {
            console.warn("Error inserting client property from magic link:", propErr);
          }
        }
      }
    } else if (magicLink.property_address && (magicLink.property_address as string).trim()) {
      const addr = (magicLink.property_address as string).trim();
      try {
        const propCheck = await db.execute({
          sql: "SELECT id FROM client_properties WHERE client_id = ? AND address = ?",
          args: [userRow.id, addr]
        });
        if (propCheck.rows.length === 0) {
          await db.execute({
            sql: `INSERT INTO client_properties (id, client_id, property_name, address, sort_order)
                  VALUES (?, ?, 'Primary Property', ?, 0)`,
            args: [crypto.randomUUID(), userRow.id, addr]
          });
        }
      } catch (propErr) {
        console.warn("Error inserting primary property from magic link:", propErr);
      }
    }

    // 4c. Insert advertisement link into client_links table if present
    if (magicLink.advertisement_link && (magicLink.advertisement_link as string).trim()) {
      const adUrl = (magicLink.advertisement_link as string).trim();
      try {
        const linkCheck = await db.execute({
          sql: "SELECT id FROM client_links WHERE client_id = ? AND url = ?",
          args: [userRow.id, adUrl]
        });
        if (linkCheck.rows.length === 0) {
          await db.execute({
            sql: `INSERT INTO client_links (id, client_id, label, url, sort_order)
                  VALUES (?, ?, 'Main Listing / Ad Link', ?, 0)`,
            args: [crypto.randomUUID(), userRow.id, adUrl]
          });
        }
      } catch (linkErr) {
        console.warn("Error inserting client link from magic link:", linkErr);
      }
    }

    // 4d. Ensure client user has a referral code and tier assigned
    try {
      await ensureUserReferralCode(userRow.id, userEmail);
    } catch (refErr) {
      console.warn("Failed to ensure user referral code:", refErr);
    }

    // 4e. If magic link was created with a referral code, process referral relationship & welcome reward
    if (magicLink.referral_code && (magicLink.referral_code as string).trim()) {
      try {
        const appOrigin = getAppUrl(req);
        await processRegistrationReferral({
          refereeUserId: userRow.id,
          refereeEmail: userEmail,
          refereeName: userRow.name || userEmail.split("@")[0],
          referralCode: (magicLink.referral_code as string).trim(),
          ipAddress: (magicLink.ip_address as string) || "",
          appOrigin
        });
      } catch (refProcessErr) {
        console.warn("Failed to process registration referral from magic link:", refProcessErr);
      }
    }

    // 5. Invalidate / mark the magic link as used
    await db.execute({
      sql: "UPDATE magic_links SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [magicLink.id]
    });

    if (clientWasCreated && magicLink.type === "signup" && await clientWelcomeEmailsEnabled()) {
      const appOrigin = getAppUrl(req);
      const welcomeEmail = await sendTransactionalEmail({
        to: userEmail,
        templateId: "client_portal_welcome",
        templateData: {
          recipient_name: userRow.name || userEmail.split("@")[0],
          "user.name": userRow.name || userEmail.split("@")[0],
          "user.email": userEmail,
          action_url: `${appOrigin}/client`,
          action_text: "Ügyfélportál megnyitása",
          property_address: primaryPropAddr
        }
      });
      if (!welcomeEmail.success) console.error("Failed to send magic-link client welcome email:", welcomeEmail.error);
    }

    // 6. Generate authenticated JWT Session
    await db.execute({
      sql: "UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [userRow.id],
    });
    const userRole = userRow.role || "client";
    const sessionToken = jwt.sign(
      { id: userRow.id, email: userRow.email, role: userRole, name: userRow.name || "" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: userRow.id,
        email: userRow.email,
        role: userRole,
        name: userRow.name || "",
        property_address: userRow.property_address || primaryPropAddr
      }
    });
  } catch (error: any) {
    console.error("[Verify Magic Link Error]", error);
    res.status(500).json({ error: "Failed to verify magic link and establish session." });
  }
});

router.post("/auth/register", requireHuman, async (req, res) => {
  try {
    const { email, password, property_address, advertisement_link, properties, referral_code, ref } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required" });
    }

    // Validate maximum 10 properties at registration
    if (Array.isArray(properties) && properties.length > 10) {
      return res.status(400).json({ 
        error: "Registration is limited to a maximum of 10 properties." 
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanReferralCode = (referral_code || ref || "").toString().trim();

    // Check if customer record is inactive
    const crmCheck = await db.execute({
      sql: "SELECT status FROM crm_records WHERE LOWER(TRIM(email)) = ? AND type = 'customer' LIMIT 1",
      args: [cleanEmail]
    });
    if (crmCheck.rows.length > 0 && crmCheck.rows[0].status === 'inactive') {
      return res.status(403).json({ 
        error: "Registration is disabled because this customer account is marked inactive." 
      });
    }

    // If no password provided, initiate the magic link registration flow
    if (!password) {
      const appOrigin = getAppUrl(req);
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";

      const result = await sendMagicLinkEmail(cleanEmail, "signup", appOrigin, {
        property_address: property_address || "",
        advertisement_link: advertisement_link || "",
        properties: Array.isArray(properties) ? properties : undefined,
        referral_code: cleanReferralCode,
        ip_address: clientIp
      });

      return res.json({
        success: true,
        magicLink: true,
        message: "We've sent a magic verification link to your email to complete your registration.",
        simulated: result.simulated
      });
    }

    if (typeof password !== "string" || password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character." });
    }

    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [cleanEmail]
    });
    if (existing.rows.length > 0) return res.status(400).json({ error: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();

    const primaryAddress = Array.isArray(properties) && properties.length > 0
      ? (typeof properties[0] === 'string' ? properties[0] : (properties[0].address || ''))
      : (property_address || "");

    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, role, is_active, property_address, advertisement_link, password_auth_enabled, password_updated_at) 
            VALUES (?, ?, ?, 'client', 1, ?, ?, 1, CURRENT_TIMESTAMP)`,
      args: [id, cleanEmail, hash, primaryAddress, advertisement_link || ""]
    });

    // Ensure user referral code is generated
    await ensureUserReferralCode(id, cleanEmail);

    // Process referral relationship if referral code was provided
    if (cleanReferralCode) {
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
      const appOrigin = getAppUrl(req);
      await processRegistrationReferral({
        refereeUserId: id,
        refereeEmail: cleanEmail,
        referralCode: cleanReferralCode,
        ipAddress: clientIp,
        appOrigin
      });
    }

    // Insert properties into client_properties
    if (Array.isArray(properties)) {
      for (let i = 0; i < properties.length; i++) {
        const p = properties[i];
        const addr = typeof p === 'string' ? p.trim() : (p.address ? p.address.trim() : '');
        const pName = typeof p === 'string' ? `Property ${i + 1}` : (p.property_name?.trim() || `Property ${i + 1}`);
        if (addr) {
          await db.execute({
            sql: `INSERT INTO client_properties (id, client_id, property_name, address, sort_order)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [crypto.randomUUID(), id, pName, addr, i]
          });
        }
      }
    } else if (primaryAddress.trim()) {
      await db.execute({
        sql: `INSERT INTO client_properties (id, client_id, property_name, address, sort_order)
              VALUES (?, ?, 'Primary Property', ?, 0)`,
        args: [crypto.randomUUID(), id, primaryAddress.trim()]
      });
    }

    // Insert link if provided
    if (advertisement_link && advertisement_link.trim()) {
      await db.execute({
        sql: `INSERT INTO client_links (id, client_id, label, url, sort_order)
              VALUES (?, ?, 'Main Listing / Ad Link', ?, 0)`,
        args: [crypto.randomUUID(), id, advertisement_link.trim()]
      });
    }

    // Await delivery before returning. Vercel may freeze a serverless invocation
    // as soon as the HTTP response is sent, so fire-and-forget email work is not
    // reliable here even though account creation itself must remain successful.
    const appOrigin = getAppUrl(req);
    const welcomeEmail = await (await clientWelcomeEmailsEnabled() ? sendTransactionalEmail({
      to: cleanEmail,
      templateId: "client_password_registration",
      templateData: {
        recipientName: cleanEmail.split("@")[0], userEmail: cleanEmail,
        actionUrl: `${appOrigin}/client`, actionText: "Open Client Portal", account_role: "Active Client",
        registration_method: "Email and password",
        registered_date: new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "Europe/Budapest" }).format(new Date()),
      }
    }) : Promise.resolve(null));
    if (welcomeEmail && !welcomeEmail.success) {
      console.error("Failed to send password-registration welcome email:", welcomeEmail.error);
    }

    await db.execute({
      sql: "UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [id],
    });
    const token = jwt.sign({ id, email: cleanEmail, role: 'client' }, JWT_SECRET, { expiresIn: "1d" });
    res.json({
      token,
      user: { id, email: cleanEmail, role: 'client' },
      welcomeEmail: welcomeEmail ? { status: welcomeEmail.status, sent: welcomeEmail.status === "sent" } : { status: "disabled", sent: false }
    });
  } catch (error: any) {
    console.error("[Register Error]", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Request Password Reset
router.post("/auth/forgot-password", requireHuman, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "A valid email address is required" });
    }

    const appOrigin = getAppUrl(req);
    const result = await sendPasswordResetToken(email.trim(), appOrigin);
    
    // Always return success to prevent email enumeration
    res.json({ 
      success: true, 
      message: "If an account exists with this email, a password reset link has been dispatched." 
    });
  } catch (error: any) {
    console.error("[Forgot Password Error]", error);
    res.status(500).json({ error: "Failed to process password reset request" });
  }
});

// Complete Password Reset
router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    const resetRecord = await db.execute({
      sql: "SELECT * FROM password_resets WHERE token = ? AND used_at IS NULL",
      args: [token]
    });

    if (resetRecord.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired password reset link." });
    }

    const resetRow = resetRecord.rows[0];
    const expiresAt = new Date(resetRow.expires_at as string).getTime();
    if (Date.now() > expiresAt) {
      return res.status(400).json({ error: "This password reset link has expired. Please request a new one." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db.execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [newHash, resetRow.user_id]
    });

    // Mark token as used
    await db.execute({
      sql: "UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [resetRow.id]
    });

    res.json({ success: true, message: "Your password has been successfully reset. You can now log in." });
  } catch (error: any) {
    console.error("[Reset Password Error]", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// Validate Invitation Token (Public)
router.get("/invitations/validate", async (req, res) => {
  try {
    const token = (req.query.token as string)?.trim();
    if (!token) {
      return res.status(400).json({ error: "Invitation token is required", valid: false });
    }

    const result = await db.execute({
      sql: "SELECT * FROM invitations WHERE token = ?",
      args: [token]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: "Invalid or unrecognized invitation token. Please check the link in your email or contact the studio administrator.", 
        valid: false,
        status: "not_found"
      });
    }

    const invitation: any = result.rows[0];

    // Check if already used
    if (invitation.status === "accepted" || invitation.used_at) {
      return res.status(400).json({
        error: "This invitation has already been accepted and activated. You can sign in using your credentials.",
        valid: false,
        status: "already_used",
        email: invitation.email
      });
    }

    // Check if revoked
    if (invitation.status === "revoked") {
      return res.status(400).json({
        error: "This invitation has been revoked or replaced by a new invitation from an administrator.",
        valid: false,
        status: "revoked"
      });
    }

    // Check expiration (7 days)
    const expiresAt = new Date(invitation.expires_at).getTime();
    if (Date.now() > expiresAt) {
      try {
        await db.execute({
          sql: "UPDATE invitations SET status = 'expired' WHERE id = ?",
          args: [invitation.id]
        });
      } catch {}
      return res.status(400).json({
        error: "This invitation link has expired (invitations are valid for 7 days). Please request a new invitation from your administrator.",
        valid: false,
        status: "expired",
        email: invitation.email
      });
    }

    // Fetch studio brand name for display
    let studioName = "SPS Studio";
    try {
      const settingRes = await db.execute("SELECT value FROM settings WHERE key = 'studio_name'");
      if (settingRes.rows.length > 0) {
        const val = settingRes.rows[0].value as string;
        try {
          const parsed = JSON.parse(val);
          studioName = parsed.en || Object.values(parsed)[0] || studioName;
        } catch {
          studioName = val;
        }
      }
    } catch {}

    res.json({
      valid: true,
      status: "pending",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name || "",
        role: invitation.role || "editor",
        workspace: invitation.workspace || "Main Studio",
        team_id: invitation.team_id || null,
        custom_message: invitation.custom_message || "",
        inviter_email: invitation.inviter_email || "",
        inviter_name: invitation.inviter_email ? invitation.inviter_email.split("@")[0] : "Studio Administrator",
        expires_at: invitation.expires_at,
        studio_name: studioName
      }
    });
  } catch (error: any) {
    console.error("[Invitation Validate Error]", error);
    res.status(500).json({ error: "Failed to validate invitation token" });
  }
});

// Accept Invitation and Create/Activate Account (Public)
router.post("/invitations/accept", async (req, res) => {
  try {
    const { token, name, password, phone } = req.body;

    if (!token || typeof token !== "string" || token.trim() === "") {
      return res.status(400).json({ error: "Invitation token is required." });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const tokenClean = token.trim();
    const result = await db.execute({
      sql: "SELECT * FROM invitations WHERE token = ?",
      args: [tokenClean]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Invalid invitation token." });
    }

    const invitation: any = result.rows[0];

    if (invitation.status === "accepted" || invitation.used_at) {
      return res.status(400).json({ error: "This invitation has already been accepted." });
    }

    if (invitation.status === "revoked") {
      return res.status(400).json({ error: "This invitation has been revoked." });
    }

    const expiresAt = new Date(invitation.expires_at).getTime();
    if (Date.now() > expiresAt) {
      return res.status(400).json({ error: "This invitation link has expired." });
    }

    const cleanEmail = invitation.email.trim().toLowerCase();
    const cleanName = (name && typeof name === "string" && name.trim()) ? name.trim() : (invitation.name || cleanEmail.split("@")[0]);
    const cleanPhone = (phone && typeof phone === "string") ? phone.trim() : "";
    const rawRole = String(invitation.role || "editor").toLowerCase().replace(/[_-]/g, "");
    const role = ["admin", "editor", "viewer"].includes(rawRole) ? rawRole : "editor";
    const workspace = invitation.workspace || "Main Studio";
    const teamId = invitation.team_id || null;

    const hash = await bcrypt.hash(password, 10);
    let userId: string;

    // Check if user record with this email already exists
    const existingUserRes = await db.execute({
      sql: "SELECT id, role FROM users WHERE LOWER(TRIM(email)) = ?",
      args: [cleanEmail]
    });

    if (existingUserRes.rows.length > 0) {
      userId = existingUserRes.rows[0].id as string;
      const existingRole = String((existingUserRes.rows[0] as any).role || "").toLowerCase().replace(/[_-]/g, "");
      if (existingRole === "client") {
        await db.execute({
          sql: `UPDATE users SET admin_password_hash = ?, admin_role = ?, admin_is_active = 1,
                  name = COALESCE(NULLIF(?, ''), name), phone = COALESCE(NULLIF(?, ''), phone),
                  admin_workspace = ?, admin_team_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          args: [hash, role, cleanName, cleanPhone, workspace, teamId, userId]
        });
      } else await db.execute({
        sql: `UPDATE users 
              SET password_hash = ?, 
                  role = ?, 
                  is_active = 1, 
                  name = ?, 
                  phone = ?, 
                  workspace = ?,
                  team_id = ?,
                  updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?`,
        args: [hash, role, cleanName, cleanPhone, workspace, teamId, userId]
      });
    } else {
      userId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO users (id, email, password_hash, role, is_active, name, phone, workspace, team_id, created_at, updated_at) 
              VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [userId, cleanEmail, hash, role, cleanName, cleanPhone, workspace, teamId]
      });
    }

    // Mark current invitation as accepted
    await db.execute({
      sql: "UPDATE invitations SET status = 'accepted', used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [invitation.id]
    });

    // Invalidate any other pending invitations for this email
    try {
      await db.execute({
        sql: "UPDATE invitations SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP WHERE LOWER(TRIM(email)) = ? AND id != ? AND status = 'pending'",
        args: [cleanEmail, invitation.id]
      });
    } catch {}

    // Send Welcome Email asynchronously
    const appOrigin = getAppUrl(req);
    sendTransactionalEmail({
      to: cleanEmail,
      templateId: "account_verification",
      templateData: {
        recipient_name: cleanName,
        "user.name": cleanName,
        recipientName: cleanName,
        userEmail: cleanEmail,
        "user.email": cleanEmail,
        account_role: role.toUpperCase(),
        actionUrl: `${appOrigin}/admin`,
        actionText: "Open Admin Dashboard",
        details: {
          "Account Email": cleanEmail,
          "Role": role.toUpperCase(),
          "Workspace": workspace,
          "Activated On": new Date().toLocaleDateString()
        }
      }
    }).catch(e => console.error("Failed to send welcome confirmation email:", e));

    // Generate JWT session token for seamless automatic login
    await db.execute({
      sql: "UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [userId],
    });
    const sessionToken = jwt.sign(
      { 
        id: userId, 
        email: cleanEmail, 
        role: role, 
        name: cleanName, 
        workspace: workspace,
        team_id: teamId
      }, 
      JWT_SECRET, 
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: userId,
        email: cleanEmail,
        role: role,
        name: cleanName,
        workspace: workspace
      },
      message: `Account activated successfully. Welcome to ${workspace}!`
    });
  } catch (error: any) {
    console.error("[Invitation Accept Error]", error);
    res.status(500).json({ error: error.message || "Failed to accept invitation and create account" });
  }
});

// ... public endpoints
router.get("/public/translations", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Vercel-CDN-Cache-Control", "no-store");
    const { locale, group } = req.query;
    if (locale && typeof locale === "string") {
      const dict = await translationService.getDictionary(locale);
      return res.json(dict);
    }
    const dicts = await translationService.getAllDictionaries();
    res.json(dicts);
  } catch (error) {
    console.error("Translations fetch error:", error);
    res.status(500).json({ error: "Failed to fetch translations" });
  }
});

router.get("/public/translations/:locale", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Vercel-CDN-Cache-Control", "no-store");
    const { locale } = req.params;
    const dict = await translationService.getDictionary(locale);
    res.json(dict);
  } catch (error) {
    console.error(`Translations fetch error for locale ${req.params.locale}:`, error);
    res.status(500).json({ error: "Failed to fetch locale translations" });
  }
});

router.get("/public/bootstrap", async (_req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=30");
    res.set("Vercel-CDN-Cache-Control", "public, s-maxage=60, stale-while-revalidate=300, stale-if-error=86400");
    res.json(await loadPublicBootstrap());
  } catch (error) {
    console.error("Public bootstrap fetch error:", error);
    res.status(500).json({ error: "Failed to load public website data" });
  }
});

router.get("/public/coming-soon-config", async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store, max-age=0");
    res.set("Vercel-CDN-Cache-Control", "no-store");
    const result = await db.execute(`
      SELECT key, value FROM settings
      WHERE key LIKE 'coming_soon_%'
         OR key IN (
           'studio_name', 'site_languages', 'default_language', 'custom_translations',
           'theme_colors', 'theme_public_config', 'logo_header_light', 'logo_header_dark',
           'logo_footer_light', 'logo_footer_dark', 'logo_alt_text', 'footer_brand_display',
           'footer_version', 'footer_ai_notice', 'footer_created_prefix', 'footer_created_suffix'
         )
    `);
    const settings = result.rows.reduce((acc: Record<string, unknown>, row: any) => {
      acc[String(row.key)] = row.value;
      return acc;
    }, {});
    res.json(settings);
  } catch (error) {
    console.error("Coming soon config fetch error:", error);
    res.status(500).json({ error: "Failed to load coming soon configuration" });
  }
});

router.get("/public/settings", async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
    const result = await db.execute("SELECT * FROM settings");
    const settings = result.rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settings);
  } catch (error) {
    console.error("Settings fetch error:", error);
    res.json({});
  }
});

router.get("/public/legal-documents", async (_req, res) => {
  try {
    res.json(await getAllLegalDocuments());
  } catch (error) {
    console.error("Legal documents fetch error:", error);
    res.status(500).json({ error: "Failed to fetch legal documents" });
  }
});

router.get("/public/cookie-catalog", async (_req, res) => {
  try {
    const result = await db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: ["cookie_catalog_v1"] });
    const defaults = [
      { id: "consent", name: "sps_cookie_consent_v2", category: "necessary", consent_scope: "essential", storage: "localStorage", provider: "SPS Studio", duration: "12 months", purpose: "Stores the cookie preference decision.", active: true, required: true, visible_public: true },
      { id: "legacy-consent", name: "sps_cookie_consent_v1", category: "necessary", consent_scope: "essential", storage: "localStorage", provider: "SPS Studio", duration: "Until migrated", purpose: "Legacy consent value retained only to migrate prior choices.", active: true, required: true, visible_public: true },
      { id: "language", name: "site_lang", category: "preferences", consent_scope: "all", storage: "localStorage", provider: "SPS Studio", duration: "12 months", purpose: "Remembers the selected website language.", active: true, required: false, visible_public: true },
      { id: "theme", name: "public-theme-mode, theme", category: "preferences", consent_scope: "all", storage: "localStorage", provider: "SPS Studio", duration: "12 months / legacy", purpose: "Remembers the public website colour mode.", active: true, required: false, visible_public: true },
      { id: "bootstrap", name: "sps-public-bootstrap-v1", category: "necessary", consent_scope: "essential", storage: "sessionStorage", provider: "SPS Studio", duration: "30 seconds", purpose: "Short-lived cache used to load the public website reliably.", active: true, required: true, visible_public: true },
      { id: "infobar-session", name: "sps_dismissed_infobar_session", category: "necessary", consent_scope: "necessary", storage: "sessionStorage", provider: "SPS Studio", duration: "Session", purpose: "Avoids repeating an information-bar message during a visit.", active: true, required: true, visible_public: true },
      { id: "infobar-permanent", name: "sps_dismissed_infobar_permanent", category: "preferences", consent_scope: "all", storage: "localStorage", provider: "SPS Studio", duration: "Until settings change", purpose: "Remembers dismissed non-critical information-bar messages.", active: true, required: false, visible_public: true },
      { id: "incident-dismissal", name: "sps_incident_status_dismissed_v2", category: "necessary", consent_scope: "necessary", storage: "localStorage / sessionStorage", provider: "SPS Studio", duration: "Until incident changes", purpose: "Avoids repeating an incident-status message already dismissed by the visitor.", active: true, required: true, visible_public: true },
      { id: "google-analytics", name: "_ga, _ga_*, _gid, _gat_*", category: "analytics", consent_scope: "all", storage: "cookie", provider: "Google Analytics", duration: "Up to 2 years", purpose: "Measures visits, pages and interactions after analytics consent.", active: true, required: false, visible_public: true },
      { id: "ahrefs-analytics", name: "analytics.ahrefs.com/analytics.js", category: "analytics", consent_scope: "all", storage: "script", provider: "Ahrefs Web Analytics", duration: "No persistent cookie", purpose: "Aggregated website-usage analytics loaded after analytics consent.", active: true, required: false, visible_public: true },
      { id: "vercel-web-analytics", name: "/_vercel/insights/script.js", category: "analytics", consent_scope: "all", storage: "script", provider: "Vercel Web Analytics", duration: "No persistent cookie", purpose: "Measures anonymized page views after analytics consent.", active: true, required: false, visible_public: true },
      { id: "vercel-speed-insights", name: "/_vercel/speed-insights/script.js", category: "analytics", consent_scope: "all", storage: "script", provider: "Vercel Speed Insights", duration: "No persistent cookie", purpose: "Measures Core Web Vitals after analytics consent.", active: true, required: false, visible_public: true },
    ];
    const stored = result.rows.length ? JSON.parse(String(result.rows[0].value || "[]")) : [];
    const savedItems = Array.isArray(stored) ? stored : [];
    const items = [...defaults.map((item) => ({ ...item, ...(savedItems.find((saved: any) => saved?.id === item.id) || {}) })), ...savedItems.filter((item: any) => item?.id && !defaults.some((entry) => entry.id === item.id))];
    res.json(items.filter((item: any) => item?.active !== false && item?.visible_public !== false));
  } catch { res.json([]); }
});

router.get("/public/categories", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT * FROM categories 
      ORDER BY sort_order ASC, name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Categories fetch error:", error);
    res.json([]);
  }
});

router.get("/public/portfolio", async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
    const result = await db.execute(`
      SELECT p.*, c.name as category_name, c.slug as category_slug 
      FROM portfolio_items p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_published = 1 
      ORDER BY p.sort_order ASC, p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Portfolio fetch error:", error);
    res.json([]);
  }
});

router.get("/public/portfolio/:slug", async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
    const result = await db.execute({
      sql: `SELECT p.*, c.name as category_name, c.slug as category_slug
            FROM portfolio_items p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.slug = ? AND p.is_published = 1
            LIMIT 1`,
      args: [String(req.params.slug || "")],
    });
    if (result.rows.length === 0) return res.status(404).json({ error: "Portfolio gallery not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Public portfolio gallery fetch error:", error);
    res.status(500).json({ error: "Failed to fetch portfolio gallery" });
  }
});

router.get("/public/portfolio/:slug/media/:index/watermarked", async (req, res) => {
  try {
    const index = Number(req.params.index);
    if (!Number.isSafeInteger(index) || index < 0) {
      return res.status(400).json({ error: "Invalid portfolio media index" });
    }

    const result = await db.execute({
      sql: `SELECT slug, title, image_urls
            FROM portfolio_items
            WHERE slug = ? AND is_published = 1
            LIMIT 1`,
      args: [String(req.params.slug || "")],
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Portfolio gallery not found" });
    }

    const row: any = result.rows[0];
    let gallery: any = row.image_urls;
    for (let attempt = 0; attempt < 2 && typeof gallery === "string"; attempt += 1) {
      try { gallery = JSON.parse(gallery); } catch { gallery = []; }
    }
    if (!Array.isArray(gallery) || index >= gallery.length) {
      return res.status(404).json({ error: "Portfolio media not found" });
    }

    const raw = gallery[index];
    const media: any = typeof raw === "string" ? { url: raw } : raw || {};
    const sourceUrl = String(media.compressed_url || media.thumbnail_url || media.url || media.src || "");
    const hintedType = String(media.type || media.media_type || "").toLowerCase();
    const isVideo = hintedType === "video" || /\.(mp4|mov|webm)(\?|$)/i.test(sourceUrl);
    if (!sourceUrl) return res.status(404).json({ error: "Portfolio image source not found" });
    if (isVideo) return res.status(400).json({ error: "Watermarked download is available for images only" });

    const prepared = await prepareGalleryFile({
      url: sourceUrl,
      type: "image",
      title: String(media.title || row.title || `portfolio-${index + 1}`),
    }, index, false, true);
    const safeSlug = String(row.slug || "portfolio").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "portfolio";

    res.set("Content-Type", "image/jpeg");
    res.set("Content-Disposition", `attachment; filename="${safeSlug}-${index + 1}-watermarked.jpg"`);
    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.send(prepared.buffer);
  } catch (error) {
    console.error("Public watermarked portfolio download error:", error);
    res.status(500).json({ error: "Failed to prepare watermarked portfolio image" });
  }
});

const escapeXml = (value: unknown) => String(value || "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const sitemapLastModified = (value: unknown) => {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : `<lastmod>${escapeXml(date.toISOString())}</lastmod>`;
};

const absolutePublicUrl = (origin: string, value: unknown) => {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${origin}${url}`;
  return "";
};

const sitemapImages = (origin: string, rawImages: unknown, fallbackTitle: unknown) => {
  let items: any = rawImages;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  if (!Array.isArray(items)) return "";

  return items.slice(0, 1_000).map((item: any) => {
    const media = typeof item === "string" ? { url: item } : item || {};
    const source = media.optimized_url || media.compressed_url || media.thumbnail_url || media.url || media.src;
    const location = absolutePublicUrl(origin, source);
    const type = String(media.type || media.media_type || "").toLowerCase();
    if (!location || type === "video" || /\.(mp4|mov|webm)(\?|$)/i.test(location)) return "";
    const title = String(media.title || fallbackTitle || "").trim();
    return `<image:image><image:loc>${escapeXml(location)}</image:loc>${title ? `<image:title>${escapeXml(title)}</image:title>` : ""}</image:image>`;
  }).join("");
};

// The Vercel function receives the original /sitemap.xml path after its
// rewrite, while the local Express API is mounted below /api. Support both.
router.get(["/public/sitemap.xml", "/sitemap.xml"], async (req, res) => {
  try {
    const origin = getAppUrl(req).replace(/\/$/, "");
    const [portfolioResult, propertiesResult] = await Promise.all([
      db.execute(`SELECT slug, title, image_urls, COALESCE(updated_at, created_at) AS lastmod
                  FROM portfolio_items
                  WHERE is_published = 1 AND slug IS NOT NULL AND TRIM(slug) != ''
                  ORDER BY updated_at DESC, created_at DESC`),
      db.execute(`SELECT id, title, image_urls, COALESCE(updated_at, created_at) AS lastmod
                  FROM property_listings
                  WHERE is_enabled = 1
                  ORDER BY updated_at DESC, created_at DESC`),
    ]);
    const urls = [
      `<url><loc>${escapeXml(origin)}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
      `<url><loc>${escapeXml(origin)}/properties</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`,
      ...portfolioResult.rows.map((row: any) => `<url><loc>${escapeXml(origin)}/portfolio/${encodeURIComponent(String(row.slug))}</loc>${sitemapLastModified(row.lastmod)}<changefreq>monthly</changefreq><priority>0.8</priority>${sitemapImages(origin, row.image_urls, row.title)}</url>`),
      ...propertiesResult.rows.map((row: any) => `<url><loc>${escapeXml(origin)}/properties/${encodeURIComponent(String(row.id))}</loc>${sitemapLastModified(row.lastmod)}<changefreq>weekly</changefreq><priority>0.7</priority>${sitemapImages(origin, row.image_urls, row.title)}</url>`),
    ];
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
    res.set("X-Robots-Tag", "noindex");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls.join("")}</urlset>`);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).type("text/plain").send("Failed to generate sitemap");
  }
});

// Like the sitemap route, support both local /api mounting and Vercel's
// original rewritten path. Keep private application areas out of crawlers.
router.get(["/public/robots.txt", "/robots.txt"], (req, res) => {
  const origin = getAppUrl(req).replace(/\/$/, "");
  res.type("text/plain").set("Cache-Control", "public, max-age=300, s-maxage=3600").send([
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /client/",
    "Disallow: /api/",
    "Disallow: /auth/",
    "Disallow: /invite/",
    "Disallow: /invoice/",
    "Disallow: /invoices/",
    "Disallow: /property-listings/",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
  ].join("\n"));
});

router.get("/public/services", async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
    const result = await db.execute(`
      SELECT * FROM services 
      WHERE is_published = 1 
      ORDER BY sort_order ASC, created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Services fetch error:", error);
    res.json([]);
  }
});

router.get("/public/pricing", async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=120");
    const result = await db.execute(`
      SELECT * FROM pricing_plans
      ORDER BY sort_order ASC, created_at ASC
    `);

    // Bundles store a snapshot of their components for backwards compatibility,
    // but referenced tiers must always be rendered from the current catalog.
    // Resolve against every tier (including a disabled one referenced by an
    // enabled bundle), then only expose enabled plans as top-level cards.
    const allPlans = result.rows as any[];
    const tiersById = new Map(
      allPlans
        .filter((plan) => plan.type === "tier")
        .map((plan) => [String(plan.id), plan])
    );

    const publicPlans = allPlans
      .filter((plan) => Boolean(plan.is_enabled))
      .map((plan) => {
        if (plan.type !== "bundle") return plan;

        let bundleItems: any[] = [];
        try {
          const parsed = typeof plan.bundle_services === "string"
            ? JSON.parse(plan.bundle_services || "[]")
            : plan.bundle_services;
          bundleItems = Array.isArray(parsed) ? parsed : [];
        } catch {
          return plan;
        }

        const resolvedItems = bundleItems.map((item) => {
          if (!item?.tier_id) return item;
          const tier = tiersById.get(String(item.tier_id));
          if (!tier) return { ...item, is_missing: true };

          let tierFeatures: any[] = [];
          let tierIncludedItems: any[] = [];
          try {
            const parsed = typeof tier.features === "string" ? JSON.parse(tier.features || "[]") : tier.features;
            tierFeatures = Array.isArray(parsed) ? parsed : [];
          } catch {}
          try {
            const parsed = typeof tier.included_items === "string" ? JSON.parse(tier.included_items || "[]") : tier.included_items;
            tierIncludedItems = Array.isArray(parsed) ? parsed : [];
          } catch {}

          return {
            ...item,
            item_type: "tier",
            service_title: tier.title,
            service_name: tier.title,
            original_price: Number(tier.price) || 0,
            features: [...new Set([...tierFeatures, ...tierIncludedItems])],
            is_disabled: !Boolean(tier.is_enabled),
            is_missing: false,
          };
        });

        return { ...plan, bundle_services: JSON.stringify(resolvedItems) };
      });

    res.json(publicPlans);
  } catch (error) {
    console.error("Pricing fetch error:", error);
    res.json([]);
  }
});

router.get("/public/extra-services", async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=120");
    const result = await db.execute(`
      SELECT * FROM pricing_extra_services 
      WHERE is_enabled = 1 AND (show_on_pricing_page IS NULL OR show_on_pricing_page = 1)
      ORDER BY sort_order ASC, created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Extra services fetch error:", error);
    res.json([]);
  }
});

router.get("/public/fee-rules", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT * FROM pricing_fee_rules 
      WHERE is_enabled = 1 AND (show_on_pricing_page IS NULL OR show_on_pricing_page = 1)
      ORDER BY sort_order ASC, created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Fee rules fetch error:", error);
    res.json([]);
  }
});

const travelDistanceCache = new Map<string, { expires: number; data: any }>();
const travelRateLimit = new Map<string, number>();
router.get("/public/travel-distance", async (req, res) => {
  try {
    const city = String(req.query.city || "").trim().replace(/\s+/g, " ");
    if (city.length < 2 || city.length > 100) return res.status(400).json({ error: "Enter a valid city name." });
    const cacheKey = city.toLocaleLowerCase("hu-HU");
    const cached = travelDistanceCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return res.json(cached.data);
    const ip = String((req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "unknown");
    const lastRequest = travelRateLimit.get(ip) || 0;
    if (Date.now() - lastRequest < 1200) return res.status(429).json({ error: "Please wait before calculating another city." });
    travelRateLimit.set(ip, Date.now());
    const userAgent = `SPSStudioTravelCalculator/1.0 (${process.env.CONTACT_EMAIL || "contact@spsstudio.hu"})`;
    const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=hu&city=${encodeURIComponent(city)}`, { headers: { "User-Agent": userAgent, "Accept-Language": "hu,en" }, signal: AbortSignal.timeout(8000) });
    if (!geoResponse.ok) throw new Error(`Geocoding service returned ${geoResponse.status}`);
    const places: any[] = await geoResponse.json();
    if (!places.length) return res.status(404).json({ error: "The city could not be found in Hungary." });
    const destination = { lat: Number(places[0].lat), lon: Number(places[0].lon) };
    const studio = { lat: 46.4167, lon: 20.3333 };
    const routeResponse = await fetch(`https://router.project-osrm.org/route/v1/driving/${studio.lon},${studio.lat};${destination.lon},${destination.lat}?overview=false&alternatives=false&steps=false`, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(10000) });
    if (!routeResponse.ok) throw new Error(`Routing service returned ${routeResponse.status}`);
    const routeData: any = await routeResponse.json();
    const meters = Number(routeData?.routes?.[0]?.distance);
    if (!Number.isFinite(meters)) return res.status(502).json({ error: "No driving route was found for this city." });
    const oneWayKm = Math.round((meters / 1000) * 10) / 10;
    const data = { origin: "Hódmezővásárhely", destination: places[0].display_name, city, oneWayKm, roundTripKm: Math.round(oneWayKm * 2 * 10) / 10 };
    travelDistanceCache.set(cacheKey, { expires: Date.now() + 24 * 60 * 60 * 1000, data });
    res.json(data);
  } catch (error: any) {
    console.error("Travel distance calculation failed:", error);
    res.status(502).json({ error: "The route distance is temporarily unavailable. Please try again." });
  }
});

router.get("/public/faq-categories", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT * FROM faq_categories 
      WHERE is_published = 1 
      ORDER BY sort_order ASC, created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("FAQ categories fetch error:", error);
    res.json([]);
  }
});

router.get("/public/faqs", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        f.*,
        fc.name as category_name,
        fc.slug as category_slug,
        fc.sort_order as category_sort_order
      FROM faqs f
      LEFT JOIN faq_categories fc ON f.category_id = fc.id
      WHERE f.is_published = 1 AND (fc.is_published = 1 OR fc.is_published IS NULL OR f.category_id IS NULL)
      ORDER BY COALESCE(fc.sort_order, 999) ASC, f.sort_order ASC, f.created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("FAQs fetch error:", error);
    res.json([]);
  }
});

// Public Social Tree & Links
router.get("/public/social-links", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT * FROM social_tree_nodes
      WHERE is_enabled = 1
      ORDER BY sort_order ASC, created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Social links fetch error:", error);
    res.json([]);
  }
});

router.get("/public/social-links/tree", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT * FROM social_tree_nodes
      WHERE is_enabled = 1
      ORDER BY sort_order ASC, created_at ASC
    `);
    
    const nodes = result.rows as any[];
    // Build tree structure
    const nodeMap = new Map<string, any>();
    nodes.forEach(n => {
      nodeMap.set(n.id, { ...n, children: [] });
    });

    const rootNodes: any[] = [];
    nodes.forEach(n => {
      const mappedNode = nodeMap.get(n.id);
      if (n.parent_id && nodeMap.has(n.parent_id)) {
        nodeMap.get(n.parent_id).children.push(mappedNode);
      } else {
        rootNodes.push(mappedNode);
      }
    });

    res.json(rootNodes);
  } catch (error) {
    console.error("Social tree fetch error:", error);
    res.json([]);
  }
});

// Public Info Bar Endpoint
router.get("/public/info-bar", async (req, res) => {
  try {
    const keys = [
      "info_bar_enabled",
      "info_bar_rotation_interval",
      "info_bar_pause_on_hover",
      "info_bar_show_indicators",
      "info_bar_animation"
    ];
    const placeholders = keys.map(() => "?").join(",");
    const settingsRes = await db.execute({
      sql: `SELECT key, value FROM settings WHERE key IN (${placeholders})`,
      args: keys
    });

    const settingsMap: Record<string, any> = {
      info_bar_enabled: true,
      info_bar_rotation_interval: 7,
      info_bar_pause_on_hover: true,
      info_bar_show_indicators: true,
      info_bar_animation: "slide"
    };

    for (const row of settingsRes.rows) {
      const k = row.key as string;
      const v = row.value as string;
      if (k === "info_bar_enabled") settingsMap.info_bar_enabled = v === "1" || v === "true";
      else if (k === "info_bar_rotation_interval") settingsMap.info_bar_rotation_interval = Math.max(3, parseInt(v, 10) || 7);
      else if (k === "info_bar_pause_on_hover") settingsMap.info_bar_pause_on_hover = v === "1" || v === "true";
      else if (k === "info_bar_show_indicators") settingsMap.info_bar_show_indicators = v === "1" || v === "true";
      else if (k === "info_bar_animation") settingsMap.info_bar_animation = v || "slide";
    }

    if (!settingsMap.info_bar_enabled) {
      return res.json({
        settings: settingsMap,
        categories: [],
        messages: []
      });
    }

    const categoriesRes = await db.execute(`
      SELECT * FROM info_bar_categories
      WHERE is_enabled = 1
      ORDER BY sort_order ASC, name ASC
    `);

    // Fetch active and scheduled messages within date bounds
    const messagesRes = await db.execute(`
      SELECT m.*,
             c.name as category_name,
             c.label as category_label,
             c.icon as category_icon,
             c.bg_color as category_bg_color,
             c.text_color as category_text_color,
             c.dark_bg_color as category_dark_bg_color,
             c.dark_text_color as category_dark_text_color
      FROM info_bar_messages m
      INNER JOIN info_bar_categories c ON m.category_id = c.id
      WHERE m.is_enabled = 1
        AND c.is_enabled = 1
        AND (m.start_date IS NULL OR datetime(m.start_date) <= datetime('now'))
        AND (m.end_date IS NULL OR datetime(m.end_date) >= datetime('now'))
      ORDER BY m.sort_order ASC, m.created_at DESC
    `);

    res.json({
      settings: settingsMap,
      categories: categoriesRes.rows,
      messages: messagesRes.rows
    });
  } catch (error) {
    console.error("Public info bar fetch error:", error);
    res.json({
      settings: {
        info_bar_enabled: false,
        info_bar_rotation_interval: 7,
        info_bar_pause_on_hover: true,
        info_bar_show_indicators: true,
        info_bar_animation: "slide"
      },
      categories: [],
      messages: []
    });
  }
});

router.post("/public/contact", requireHuman, async (req, res) => {
  try {
    const { name, email, phone, message, subject, property_address, property_city, availability_start, availability_end, plan_id, plan_name } = req.body;

    if (req.body.cookie_consent !== true) {
      return res.status(403).json({ error: "Cookie consent is required before submitting the contact form" });
    }
    if (req.body.privacy_policy_accepted !== true || req.body.terms_accepted !== true) {
      return res.status(403).json({ error: "Privacy Policy and Terms and Conditions acceptance is required before submitting the contact form" });
    }
    
    // Validate required base fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email || typeof email !== "string" || email.trim() === "") {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ error: "Message is required" });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check settings for phone and availability requirements
    let isPhoneRequired = false;
    let isAvailabilityShown = true;
    let isAvailabilityRequired = false;

    try {
      const settingsRes = await db.execute("SELECT key, value FROM settings WHERE key IN ('contact_form_require_phone', 'contact_form_show_availability', 'contact_form_require_availability')");
      const settingsMap: Record<string, string> = {};
      for (const row of settingsRes.rows) {
        settingsMap[row.key as string] = row.value as string;
      }

      isPhoneRequired = settingsMap['contact_form_require_phone'] === "1" || settingsMap['contact_form_require_phone'] === "true";
      isAvailabilityShown = settingsMap['contact_form_show_availability'] !== "0" && settingsMap['contact_form_show_availability'] !== "false";
      isAvailabilityRequired = settingsMap['contact_form_require_availability'] === "1" || settingsMap['contact_form_require_availability'] === "true";
    } catch {}

    const trimmedPhone = phone && typeof phone === "string" ? phone.trim() : "";

    if (isPhoneRequired && !trimmedPhone) {
      return res.status(400).json({ error: "Phone number is required by studio settings" });
    }

    // If phone is provided (either required or optional), validate format
    if (trimmedPhone) {
      const digitsCount = (trimmedPhone.match(/\d/g) || []).length;
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{4,20}$/;
      if (digitsCount < 6 || !phoneRegex.test(trimmedPhone)) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }
    }

    // Validate availability date-time range if shown
    let cleanStart = availability_start && typeof availability_start === "string" ? availability_start.trim() : "";
    let cleanEnd = availability_end && typeof availability_end === "string" ? availability_end.trim() : "";

    if (!isAvailabilityShown) {
      cleanStart = "";
      cleanEnd = "";
    } else {
      if (isAvailabilityRequired && (!cleanStart || !cleanEnd)) {
        return res.status(400).json({ error: "Availability date and time range is required" });
      }

      if (cleanStart || cleanEnd) {
        if (!cleanStart || !cleanEnd) {
          return res.status(400).json({ error: "Both start and end date and time are required for the availability window" });
        }

        const startDate = new Date(cleanStart);
        const endDate = new Date(cleanEnd);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ error: "Invalid date and time format for availability window" });
        }

        if (endDate.getTime() <= startDate.getTime()) {
          return res.status(400).json({ error: "End date and time must be after the start date and time" });
        }

        // Check not in past (allow 5-min tolerance for timezone/client clock skew)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        if (startDate.getTime() < fiveMinutesAgo) {
          return res.status(400).json({ error: "Start date and time cannot be in the past" });
        }
      }
    }

    const id = crypto.randomUUID();
    const cleanSubject = subject && typeof subject === "string" ? subject.trim() : "";
    const cleanAddress = property_address && typeof property_address === "string" ? property_address.trim() : "";
    const cleanPropertyCity = property_city && typeof property_city === "string" ? property_city.trim() : "";
    const cleanTravelOneWayKm = Number.isFinite(Number(req.body.travel_distance_one_way_km)) ? Math.max(0, Number(req.body.travel_distance_one_way_km)) : 0;
    const cleanTravelRoundTripKm = Number.isFinite(Number(req.body.travel_distance_round_trip_km)) ? Math.max(0, Number(req.body.travel_distance_round_trip_km)) : 0;
    const cleanPlanId = plan_id && typeof plan_id === "string" ? plan_id.trim() : null;
    const cleanPlanName = plan_name && typeof plan_name === "string" ? plan_name.trim() : "";
    const cleanExtraServices = typeof req.body.extra_services === "string" ? req.body.extra_services : JSON.stringify(req.body.extra_services || []);
    const cleanFeeDetails = typeof req.body.fee_details === "string" ? req.body.fee_details : JSON.stringify(req.body.fee_details || {});
    const cleanEstimatedTotal = req.body.estimated_total !== undefined && req.body.estimated_total !== null && !isNaN(Number(req.body.estimated_total)) ? Number(req.body.estimated_total) : 0;
    let cleanCurrency = req.body.currency && typeof req.body.currency === "string" ? req.body.currency.trim() : "USD";
    let cleanPlanPrice = 0;
    if (cleanPlanId) {
      try {
        const planResult = await db.execute({
          sql: "SELECT price, currency FROM pricing_plans WHERE id = ? AND is_enabled = 1 LIMIT 1",
          args: [cleanPlanId],
        });
        if (planResult.rows.length > 0) {
          cleanPlanPrice = Number(planResult.rows[0].price) || 0;
          cleanCurrency = String(planResult.rows[0].currency || cleanCurrency);
        }
      } catch (error) {
        console.warn("Unable to resolve selected pricing plan for inquiry email:", error);
      }
    }

    await db.execute({
      sql: `INSERT INTO contact_submissions 
            (id, name, email, phone, subject, property_address, availability_start, availability_end, message, plan_id, plan_name, extra_services, fee_details, estimated_total, currency, is_read, status, is_archived) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'new', 0)`,
      args: [
        id,
        name.trim(),
        email.trim(),
        trimmedPhone,
        cleanSubject,
        cleanAddress,
        cleanStart,
        cleanEnd,
        message.trim(),
        cleanPlanId,
        cleanPlanName,
        cleanExtraServices,
        cleanFeeDetails,
        cleanEstimatedTotal,
        cleanCurrency
      ]
    });

    // If client had previously archived submissions, auto-unarchive them on new reply/inquiry
    try {
      const now = new Date().toISOString();
      await db.execute({
        sql: `UPDATE contact_submissions 
              SET is_archived = 0, 
                  unarchived_at = ?, 
                  unarchived_by = 'System (New Client Message)' 
              WHERE LOWER(email) = LOWER(?) AND is_archived = 1`,
        args: [now, email.trim()]
      });
    } catch (unarchiveErr) {
      console.warn("Auto-unarchive on new client message failed:", unarchiveErr);
    }
    
    // Wait for both Resend requests before returning. A serverless function may
    // terminate work left running after the HTTP response has been sent.
    const appOrigin = getAppUrl(req);
    const emailDelivery = await sendInquiryAlerts({
      name: name.trim(),
      email: email.trim(),
      phone: trimmedPhone,
      subject: cleanSubject,
      property_address: cleanAddress,
      property_city: cleanPropertyCity,
      travel_distance_one_way_km: cleanTravelOneWayKm,
      travel_distance_round_trip_km: cleanTravelRoundTripKm,
      availability_start: isAvailabilityShown ? cleanStart : "",
      availability_end: isAvailabilityShown ? cleanEnd : "",
      message: message.trim(),
      plan_id: cleanPlanId || undefined,
      plan_name: cleanPlanName || undefined,
      plan_price: cleanPlanPrice,
      extra_services: cleanExtraServices,
      fee_details: cleanFeeDetails,
      estimated_total: cleanEstimatedTotal,
      currency: cleanCurrency,
    }, appOrigin);

    if (!emailDelivery.success) {
      console.error("Inquiry saved, but email delivery was not accepted:", emailDelivery.errors);
      return res.status(502).json({
        success: false,
        submission_saved: true,
        id,
        error: "Your inquiry was saved, but the confirmation emails could not be sent. The studio has been notified in the system; please do not submit the form again.",
      });
    }

    res.json({
      success: true,
      id,
      email_status: "accepted",
      admin_email_id: emailDelivery.admin?.messageId,
      customer_email_id: emailDelivery.customer?.messageId,
    });
  } catch (error: any) {
    console.error("Public contact submission error:", error);
    res.status(500).json({ error: "Submission failed. Please try again later." });
  }
});

export default router;
