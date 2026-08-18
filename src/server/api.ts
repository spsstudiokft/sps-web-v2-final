import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../db.js";
import { publicInvoiceRouter } from "./invoiceRouter.js";
import { publicReferralRouter } from "./referralRouter.js";
import { 
  processRegistrationReferral, 
  ensureUserReferralCode 
} from "./services/referralService.js";
import { translationService } from "./services/translationService.js";
import { getAllLegalDocuments } from "./services/legalDocumentService.js";
import { markGoogleReviewClicked } from "./services/googleReviewService.js";
import { getAppUrl } from "./appUrl.js";
import { 
  sendPasswordResetToken, 
  sendInquiryAlerts, 
  sendTransactionalEmail,
  sendMagicLinkEmail,
  getEmailSenderConfig 
} from "./services/emailService.js";
export { requireAuth, requireAdmin, requireClient } from "./authMiddleware.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtstring";

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

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Cache for incident.io summary
let cachedStatusSummary: any = null;
let lastStatusFetchTime = 0;
const STATUS_CACHE_TTL_MS = 25000; // 25 seconds

// Proxy endpoint for incident.io Status Widget API
router.get("/status-summary", async (req, res) => {
  const now = Date.now();
  if (cachedStatusSummary && (now - lastStatusFetchTime < STATUS_CACHE_TTL_MS)) {
    return res.json(cachedStatusSummary);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch("https://status.spsstudio.hu/api/v1/summary", {
      headers: {
        "Accept": "application/json",
        "User-Agent": "SPSStudio-StatusWidget/1.0"
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`incident.io API responded with ${response.status}`);
    }

    const data = await response.json();
    cachedStatusSummary = { success: true, data };
    lastStatusFetchTime = now;
    return res.json(cachedStatusSummary);
  } catch (error: any) {
    console.debug("[StatusWidget] Failed to fetch incident.io summary:", error?.message || error);
    // If we have stale cache, return it
    if (cachedStatusSummary) {
      return res.json({ ...cachedStatusSummary, stale: true });
    }
    // Return empty operational state rather than an error code
    return res.json({
      success: false,
      error: "Status summary unavailable",
      data: {
        summary: {
          status: "operational",
          ongoing_incidents: [],
          in_progress_maintenances: []
        }
      }
    });
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
      ["about_text", "SPS Studio is a premier real estate photography studio dedicated to showcasing properties in their best light. With years of experience and an eye for detail, we provide top-tier visual marketing for realtors and homeowners."],
      ["contact_email", "contact@spsstudio.com"],
      ["contact_phone", "+1 234 567 890"],
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

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const result = await db.execute({
      sql: "SELECT * FROM users WHERE LOWER(TRIM(email)) = ?",
      args: [cleanEmail]
    });

    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash as string);

    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    if (user.is_active === 0) return res.status(403).json({ error: "Account is disabled. Please contact the studio administrator." });

    // If client role, check if associated customer record is inactive
    if (user.role === 'client') {
      const crmCheck = await db.execute({
        sql: "SELECT status FROM crm_records WHERE LOWER(TRIM(email)) = ? AND type = 'customer' LIMIT 1",
        args: [cleanEmail]
      });
      if (crmCheck.rows.length > 0 && crmCheck.rows[0].status === 'inactive') {
        return res.status(403).json({ error: "Portal access is disabled because the customer account is marked inactive." });
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'admin' }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role || 'admin' } });
  } catch (error: any) {
    console.error("[Login Error]", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Request Magic Link for Passwordless Sign-Up or Login
router.post("/auth/magic-link", async (req, res) => {
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
      simulated: result.simulated
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
        sql: `INSERT INTO users (id, email, password_hash, role, is_active, property_address, advertisement_link)
              VALUES (?, ?, ?, 'client', 1, ?, ?)`,
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

    // 6. Generate authenticated JWT Session
    const userRole = userRow.role || "client";
    const sessionToken = jwt.sign(
      { id: userRow.id, email: userRow.email, role: userRole },
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
        property_address: userRow.property_address || primaryPropAddr
      }
    });
  } catch (error: any) {
    console.error("[Verify Magic Link Error]", error);
    res.status(500).json({ error: "Failed to verify magic link and establish session." });
  }
});

router.post("/auth/register", async (req, res) => {
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
      sql: `INSERT INTO users (id, email, password_hash, role, is_active, property_address, advertisement_link) 
            VALUES (?, ?, ?, 'client', 1, ?, ?)`,
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

    // Send Branded Welcome / Account Verification Email asynchronously
    const appOrigin = getAppUrl(req);
    sendTransactionalEmail({
      to: cleanEmail,
      subject: "Welcome to SPS Studio Client Portal",
      templateId: "account_verification",
      templateData: {
        recipientName: cleanEmail.split("@")[0],
        actionUrl: `${appOrigin}/client/login`,
        actionText: "Log in to Client Portal",
        details: {
          "Registered Email": cleanEmail,
          "Account Status": "Active Client",
          "Date": new Date().toLocaleDateString()
        }
      }
    }).catch(e => console.error("Failed to send welcome email:", e));

    const token = jwt.sign({ id, email: cleanEmail, role: 'client' }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id, email: cleanEmail, role: 'client' } });
  } catch (error: any) {
    console.error("[Register Error]", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Request Password Reset
router.post("/auth/forgot-password", async (req, res) => {
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
    const role = invitation.role || "editor";
    const workspace = invitation.workspace || "Main Studio";
    const teamId = invitation.team_id || null;

    const hash = await bcrypt.hash(password, 10);
    let userId: string;

    // Check if user record with this email already exists
    const existingUserRes = await db.execute({
      sql: "SELECT id FROM users WHERE LOWER(TRIM(email)) = ?",
      args: [cleanEmail]
    });

    if (existingUserRes.rows.length > 0) {
      userId = existingUserRes.rows[0].id as string;
      await db.execute({
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
    const { locale } = req.params;
    const dict = await translationService.getDictionary(locale);
    res.json(dict);
  } catch (error) {
    console.error(`Translations fetch error for locale ${req.params.locale}:`, error);
    res.status(500).json({ error: "Failed to fetch locale translations" });
  }
});

router.get("/public/settings", async (req, res) => {
  try {
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

router.get("/public/services", async (req, res) => {
  try {
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
    const result = await db.execute(`
      SELECT * FROM pricing_plans 
      WHERE is_enabled = 1 
      ORDER BY sort_order ASC, created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Pricing fetch error:", error);
    res.json([]);
  }
});

router.get("/public/extra-services", async (req, res) => {
  try {
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

router.post("/public/contact", async (req, res) => {
  try {
    const { name, email, phone, message, subject, property_address, property_city, availability_start, availability_end, plan_id, plan_name } = req.body;

    if (req.body.cookie_consent !== true) {
      return res.status(403).json({ error: "Cookie consent is required before submitting the contact form" });
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

router.use("/public/invoices", publicInvoiceRouter);
router.use("/public/referrals", publicReferralRouter);
export default router;
