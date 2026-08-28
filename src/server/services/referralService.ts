import crypto from "crypto";
import { db } from "../../db.js";
import { getAppUrl } from "../appUrl.js";
import { 
  ReferralTier, 
  ClientReferral, 
  ReferralReward, 
  ReferralProgramSettings, 
  ClientReferralProfile,
  AdminReferralStats,
  ReferralRewardType,
  ReferralStatus
} from "../../lib/types.js";
import { sendTransactionalEmail, getEmailSenderConfig } from "./emailService.js";

// Helper to format currency
export function formatCurrency(amount: number, currency: string = "USD"): string {
  const curr = (currency || "USD").toUpperCase();
  const isZeroDecimal = ["HUF", "CZK", "JPY"].includes(curr);
  try {
    const locale = curr === "HUF" ? "hu-HU" : curr === "EUR" ? "de-DE" : curr === "GBP" ? "en-GB" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: curr,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2
    }).format(amount || 0);
  } catch {
    const symbol = curr === "HUF" ? "Ft" : curr === "EUR" ? "€" : curr === "GBP" ? "£" : "$";
    const numStr = isZeroDecimal ? Math.round(amount || 0).toLocaleString() : Number(amount || 0).toFixed(2);
    return ["HUF", "EUR", "RON", "PLN", "CZK", "CHF"].includes(curr) ? `${numStr} ${symbol}` : `${symbol}${numStr}`;
  }
}

// Generate unique referral code (e.g. REF-ALEX9K4M)
export async function generateUniqueReferralCode(email?: string): Promise<string> {
  const prefix = email 
    ? email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4) 
    : "VIP";
  
  let attempts = 0;
  while (attempts < 10) {
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const candidate = `REF-${prefix}${randomSuffix}`;
    
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE referral_code = ?",
      args: [candidate]
    });
    if (existing.rows.length === 0) {
      return candidate;
    }
    attempts++;
  }
  return `REF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

// Generate unique voucher code for rewards
export function generateVoucherCode(prefix: string = "REW"): string {
  return `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function issuePortalInviteCoupon(email: string, issuedById?: string): Promise<{ code: string; expiresAt: string }> {
  const settings = await getReferralProgramSettings();
  if (!settings.is_active) throw new Error("A VIP meghívóprogram jelenleg szünetel.");
  const code = generateVoucherCode("WELCOME");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  await db.execute({ sql: `INSERT INTO portal_invite_coupons (id, email, code, reward_type, reward_value, currency, description, issued_by_id, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [crypto.randomUUID(), email.trim().toLowerCase(), code, settings.referee_welcome_type, Number(settings.referee_welcome_value || 0), settings.currency || "USD", settings.referee_welcome_description || "VIP welcome reward", issuedById || null, expiresAt] });
  return { code, expiresAt };
}

export async function redeemPortalInviteCoupon(code: string, email: string, userId: string): Promise<boolean> {
  const settings = await getReferralProgramSettings();
  if (!settings.is_active) return false;
  const found = await db.execute({ sql: `SELECT * FROM portal_invite_coupons WHERE UPPER(code) = ? AND LOWER(email) = ? AND status = 'issued' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`, args: [code.trim().toUpperCase(), email.trim().toLowerCase()] });
  if (!found.rows.length) return false;
  const coupon: any = found.rows[0];
  await db.execute({ sql: "UPDATE portal_invite_coupons SET status = 'redeemed', redeemed_by_user_id = ?, redeemed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'issued'", args: [userId, coupon.id] });
  await db.execute({ sql: `INSERT INTO referral_rewards (id, user_id, recipient_role, reward_type, reward_value, currency, title, description, voucher_code, status, expires_at) VALUES (?, ?, 'invitee', ?, ?, ?, 'VIP welcome invitation reward', ?, ?, 'available', ?)`, args: [crypto.randomUUID(), userId, coupon.reward_type, coupon.reward_value, coupon.currency, coupon.description, coupon.code, coupon.expires_at] });
  return true;
}

// Ensure user has a referral code and tier assigned
export async function ensureUserReferralCode(userId: string, email?: string): Promise<string> {
  const userRes = await db.execute({
    sql: "SELECT id, email, referral_code, referral_tier_id FROM users WHERE id = ?",
    args: [userId]
  });

  if (userRes.rows.length === 0) {
    throw new Error("User not found");
  }

  const u = userRes.rows[0] as any;
  let code = u.referral_code;

  if (!code || typeof code !== "string" || !code.trim()) {
    code = await generateUniqueReferralCode(email || u.email);
    await db.execute({
      sql: "UPDATE users SET referral_code = ?, referral_tier_id = COALESCE(referral_tier_id, 'tier-bronze') WHERE id = ?",
      args: [code, userId]
    });
  }

  if (!u.referral_tier_id) {
    await db.execute({
      sql: "UPDATE users SET referral_tier_id = 'tier-bronze' WHERE id = ?",
      args: [userId]
    });
  }

  return code;
}

// Get global referral settings
export async function getReferralProgramSettings(): Promise<ReferralProgramSettings> {
  const res = await db.execute(`
    SELECT key, value FROM settings WHERE key IN (
      'referral_program_active', 'referral_success_criteria', 'referral_min_spend',
      'referral_fraud_ip_check', 'referral_credit_currency', 'referral_referee_welcome_type',
      'referral_referee_welcome_value', 'referral_referee_welcome_desc', 'referral_custom_terms',
      'currency', 'default_currency'
    )
  `);

  const map = new Map<string, string>();
  for (const row of res.rows as any[]) {
    map.set(row.key, row.value);
  }

  const detectedCurrency = map.get("referral_credit_currency") || map.get("currency") || map.get("default_currency") || "USD";

  return {
    is_active: map.get("referral_program_active") !== "0",
    success_criteria: (map.get("referral_success_criteria") || "first_payment") as any,
    min_spend: Number(map.get("referral_min_spend") || 50),
    referee_welcome_type: (map.get("referral_referee_welcome_type") || "discount_percent") as any,
    referee_welcome_value: Number(map.get("referral_referee_welcome_value") || 10),
    referee_welcome_description: map.get("referral_referee_welcome_desc") || "10% off your first photography booking",
    fraud_ip_check: map.get("referral_fraud_ip_check") !== "0",
    currency: detectedCurrency,
    custom_terms: map.get("referral_custom_terms") || ""
  };
}

// Update global referral settings
export async function updateReferralProgramSettings(settings: Partial<ReferralProgramSettings>): Promise<ReferralProgramSettings> {
  const updates: Array<{ key: string; value: string }> = [];

  if (settings.is_active !== undefined) {
    updates.push({ key: "referral_program_active", value: settings.is_active ? "1" : "0" });
  }
  if (settings.success_criteria !== undefined) {
    updates.push({ key: "referral_success_criteria", value: settings.success_criteria });
  }
  if (settings.min_spend !== undefined) {
    updates.push({ key: "referral_min_spend", value: String(settings.min_spend) });
  }
  if (settings.referee_welcome_type !== undefined) {
    updates.push({ key: "referral_referee_welcome_type", value: settings.referee_welcome_type });
  }
  if (settings.referee_welcome_value !== undefined) {
    updates.push({ key: "referral_referee_welcome_value", value: String(settings.referee_welcome_value) });
  }
  if (settings.referee_welcome_description !== undefined) {
    updates.push({ key: "referral_referee_welcome_desc", value: settings.referee_welcome_description });
  }
  if (settings.fraud_ip_check !== undefined) {
    updates.push({ key: "referral_fraud_ip_check", value: settings.fraud_ip_check ? "1" : "0" });
  }
  if (settings.currency !== undefined) {
    updates.push({ key: "referral_credit_currency", value: settings.currency });
  }
  if (settings.custom_terms !== undefined) {
    updates.push({ key: "referral_custom_terms", value: settings.custom_terms });
  }

  for (const item of updates) {
    await db.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      args: [item.key, item.value]
    });
  }

  return getReferralProgramSettings();
}

// Get all referral tiers sorted by sort_order
export async function getReferralTiers(): Promise<ReferralTier[]> {
  const res = await db.execute(`
    SELECT * FROM referral_tiers ORDER BY sort_order ASC, min_referrals ASC
  `);

  return res.rows.map((row: any) => {
    let perks: string[] = [];
    try {
      perks = JSON.parse(row.perks_json || "[]");
    } catch {
      perks = [];
    }
    return {
      ...row,
      min_referrals: Number(row.min_referrals || 0),
      min_revenue: Number(row.min_revenue || 0),
      reward_value: Number(row.reward_value || 0),
      referee_reward_value: Number(row.referee_reward_value || 0),
      is_default: Number(row.is_default || 0),
      sort_order: Number(row.sort_order || 0),
      perks
    };
  });
}

// Create tier
export async function createReferralTier(tier: Partial<ReferralTier>): Promise<ReferralTier> {
  const id = tier.id || `tier-${crypto.randomBytes(4).toString("hex")}`;
  const slug = (tier.slug || tier.name || id).toLowerCase().replace(/[^a-z0-9]/g, "-");
  const perksJson = Array.isArray(tier.perks) ? JSON.stringify(tier.perks) : (tier.perks_json || "[]");

  await db.execute({
    sql: `INSERT INTO referral_tiers (
      id, name, slug, min_referrals, min_revenue, reward_type, reward_value, reward_description,
      referee_reward_type, referee_reward_value, referee_reward_description, badge_color, icon,
      perks_json, is_default, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    args: [
      id,
      tier.name || "New Tier",
      slug,
      Number(tier.min_referrals || 0),
      Number(tier.min_revenue || 0),
      tier.reward_type || "discount_percent",
      Number(tier.reward_value || 10),
      tier.reward_description || "",
      tier.referee_reward_type || "discount_percent",
      Number(tier.referee_reward_value || 10),
      tier.referee_reward_description || "",
      tier.badge_color || "#3B82F6",
      tier.icon || "award",
      perksJson,
      tier.is_default ? 1 : 0,
      Number(tier.sort_order || 0)
    ]
  });

  const res = await db.execute({ sql: "SELECT * FROM referral_tiers WHERE id = ?", args: [id] });
  return res.rows[0] as any;
}

// Update tier
export async function updateReferralTier(id: string, tier: Partial<ReferralTier>): Promise<ReferralTier> {
  const perksJson = Array.isArray(tier.perks) ? JSON.stringify(tier.perks) : (tier.perks_json || undefined);

  await db.execute({
    sql: `UPDATE referral_tiers SET
      name = COALESCE(?, name),
      slug = COALESCE(?, slug),
      min_referrals = COALESCE(?, min_referrals),
      min_revenue = COALESCE(?, min_revenue),
      reward_type = COALESCE(?, reward_type),
      reward_value = COALESCE(?, reward_value),
      reward_description = COALESCE(?, reward_description),
      referee_reward_type = COALESCE(?, referee_reward_type),
      referee_reward_value = COALESCE(?, referee_reward_value),
      referee_reward_description = COALESCE(?, referee_reward_description),
      badge_color = COALESCE(?, badge_color),
      icon = COALESCE(?, icon),
      perks_json = COALESCE(?, perks_json),
      is_default = COALESCE(?, is_default),
      sort_order = COALESCE(?, sort_order),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    args: [
      tier.name ?? null,
      tier.slug ?? null,
      tier.min_referrals !== undefined ? Number(tier.min_referrals) : null,
      tier.min_revenue !== undefined ? Number(tier.min_revenue) : null,
      tier.reward_type ?? null,
      tier.reward_value !== undefined ? Number(tier.reward_value) : null,
      tier.reward_description ?? null,
      tier.referee_reward_type ?? null,
      tier.referee_reward_value !== undefined ? Number(tier.referee_reward_value) : null,
      tier.referee_reward_description ?? null,
      tier.badge_color ?? null,
      tier.icon ?? null,
      perksJson ?? null,
      tier.is_default !== undefined ? (tier.is_default ? 1 : 0) : null,
      tier.sort_order !== undefined ? Number(tier.sort_order) : null,
      id
    ]
  });

  const res = await db.execute({ sql: "SELECT * FROM referral_tiers WHERE id = ?", args: [id] });
  return res.rows[0] as any;
}

// Delete tier
export async function deleteReferralTier(id: string): Promise<boolean> {
  const fallbackTier = await db.execute({
    sql: "SELECT id FROM referral_tiers WHERE id != ? ORDER BY sort_order ASC LIMIT 1",
    args: [id]
  });
  const fallbackId = fallbackTier.rows[0]?.id || "tier-bronze";

  // Reassign users currently on this tier to fallback tier
  await db.execute({
    sql: "UPDATE users SET referral_tier_id = ? WHERE referral_tier_id = ?",
    args: [fallbackId, id]
  });

  const res = await db.execute({
    sql: "DELETE FROM referral_tiers WHERE id = ?",
    args: [id]
  });

  return res.rowsAffected > 0;
}

// Recalculate user tier based on converted referrals & referred revenue
export async function recalculateUserTier(userId: string): Promise<ReferralTier | null> {
  const tiers = await getReferralTiers();
  if (tiers.length === 0) return null;

  // Calculate successful referrals and total revenue from referee invoices
  const statsRes = await db.execute({
    sql: `SELECT 
            COUNT(*) as successful_count,
            COALESCE(SUM(conversion_value), 0) as total_revenue
          FROM client_referrals 
          WHERE referrer_user_id = ? AND status = 'converted'`,
    args: [userId]
  });

  const successfulCount = Number(statsRes.rows[0]?.successful_count || 0);
  const totalRevenue = Number(statsRes.rows[0]?.total_revenue || 0);

  // Find the highest tier that matches criteria
  let eligibleTier = tiers[0];
  for (const tier of tiers) {
    if (successfulCount >= tier.min_referrals && (tier.min_revenue === 0 || totalRevenue >= tier.min_revenue)) {
      eligibleTier = tier;
    }
  }

  // Fetch current tier of user
  const userRes = await db.execute({
    sql: "SELECT referral_tier_id, email, name FROM users WHERE id = ?",
    args: [userId]
  });
  const currentTierId = userRes.rows[0]?.referral_tier_id;

  if (currentTierId !== eligibleTier.id) {
    await db.execute({
      sql: "UPDATE users SET referral_tier_id = ? WHERE id = ?",
      args: [eligibleTier.id, userId]
    });

    // Send Tier Upgrade celebration email!
    try {
      const user = userRes.rows[0] as any;
      if (user && user.email) {
        const config = await getEmailSenderConfig();
        await sendTransactionalEmail({
          to: user.email,
          templateId: "account_created_confirmation",
          subject: `Congratulations! You unlocked ${eligibleTier.name} Status · ${config.studioName} VIP Program`,
          templateData: {
            name: user.name || "Valued Client",
            title: `You've unlocked ${eligibleTier.name} Status!`,
            content: `Thanks to your active recommendations, you've advanced to the <strong>${eligibleTier.name}</strong> tier! You now enjoy: ${eligibleTier.reward_description || "exclusive studio benefits"}.`,
            action_url: "/client/referrals",
            action_text: "View Your VIP Perks",
            studio_name: config.studioName
          }
        });
      }
    } catch (e) {
      console.warn("Failed to send tier upgrade email:", e);
    }
  }

  return eligibleTier;
}

// Process referral when a user registers with a referral code
export async function processRegistrationReferral(options: {
  refereeUserId: string;
  refereeEmail: string;
  refereeName?: string;
  referralCode: string;
  ipAddress?: string;
  appOrigin?: string;
}): Promise<{ success: boolean; referral?: ClientReferral; error?: string }> {
  const { refereeUserId, refereeEmail, refereeName, referralCode, ipAddress, appOrigin } = options;

  if (!referralCode || !referralCode.trim()) {
    return { success: false, error: "No referral code provided" };
  }

  // A paused program must not create referral links, vouchers, credits, or
  // notification emails even if an older invitation URL is still in use.
  const settings = await getReferralProgramSettings();
  if (!settings.is_active) {
    return { success: false, error: "Referral program is currently paused" };
  }

  const cleanCode = referralCode.trim().toUpperCase();

  // 1. Find referrer by referral code
  const referrerRes = await db.execute({
    sql: "SELECT id, email, name, referral_tier_id, referral_credits FROM users WHERE UPPER(referral_code) = ?",
    args: [cleanCode]
  });

  if (referrerRes.rows.length === 0) {
    return { success: false, error: "Invalid referral code" };
  }

  const referrer = referrerRes.rows[0] as any;

  // 2. Prevent self-referral
  if (referrer.id === refereeUserId || referrer.email.toLowerCase() === refereeEmail.toLowerCase()) {
    return { success: false, error: "Self-referral is not allowed" };
  }

  // 3. Check if referee was already referred
  const existingRef = await db.execute({
    sql: "SELECT id FROM client_referrals WHERE referee_user_id = ? OR LOWER(referee_email) = ?",
    args: [refereeUserId, refereeEmail.toLowerCase()]
  });

  if (existingRef.rows.length > 0) {
    return { success: false, error: "Client has already been referred" };
  }

  // 4. Check fraud / IP rules
  let isFraud = false;
  if (settings.fraud_ip_check && ipAddress) {
    const ipCountRes = await db.execute({
      sql: "SELECT COUNT(*) as count FROM client_referrals WHERE referee_ip = ? AND created_at > datetime('now', '-1 day')",
      args: [ipAddress]
    });
    if (Number(ipCountRes.rows[0]?.count || 0) >= 3) {
      isFraud = true;
    }
  }

  // 5. Get Referrer's current Tier
  const tiers = await getReferralTiers();
  const referrerTier = (tiers.find(t => t.id === referrer.referral_tier_id) || tiers[0] || {
    id: "tier-bronze",
    reward_type: "credit",
    reward_value: 25,
    reward_description: "$25 Studio Credit",
    referee_reward_type: "discount_percent",
    referee_reward_value: 10,
    referee_reward_description: "10% Welcome Discount"
  }) as ReferralTier;

  const referralId = crypto.randomUUID();
  const shouldConvertImmediately = settings.success_criteria === "registration" && !isFraud;
  const status: ReferralStatus = isFraud ? "fraud_suspected" : (shouldConvertImmediately ? "converted" : "pending");

  // 6. Link user record
  await db.execute({
    sql: "UPDATE users SET referred_by_code = ?, referred_by_user_id = ? WHERE id = ?",
    args: [cleanCode, referrer.id, refereeUserId]
  });

  // 7. Insert client_referrals record
  await db.execute({
    sql: `INSERT INTO client_referrals (
      id, referrer_user_id, referee_user_id, referee_email, referral_code_used,
      status, conversion_trigger, conversion_value, referrer_reward_granted,
      referee_reward_granted, referrer_reward_description, referee_reward_description,
      referee_ip, rejection_reason, notes, converted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'registration', 0, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    args: [
      referralId,
      referrer.id,
      refereeUserId,
      refereeEmail.toLowerCase().trim(),
      cleanCode,
      status,
      shouldConvertImmediately ? 1 : 0,
      1, // referee welcome reward is granted upon signup
      referrerTier.reward_description || `${referrerTier.reward_value}% Referrer Reward`,
      referrerTier.referee_reward_description || `${referrerTier.referee_reward_value}% Welcome Discount`,
      ipAddress || "",
      isFraud ? "Multiple signups detected from same IP address" : "",
      `Referee registered with invite code ${cleanCode}`,
      shouldConvertImmediately ? new Date().toISOString() : null
    ]
  });

  // 8. Grant Welcome Voucher to Referee
  const refereeVoucherCode = generateVoucherCode("WELCOME");
  await db.execute({
    sql: `INSERT INTO referral_rewards (
      id, user_id, referral_id, reward_tier_id, recipient_role,
      reward_type, reward_value, currency, title, description,
      voucher_code, status, created_at
    ) VALUES (?, ?, ?, ?, 'referee', ?, ?, ?, ?, ?, ?, 'available', CURRENT_TIMESTAMP)`,
    args: [
      crypto.randomUUID(),
      refereeUserId,
      referralId,
      referrerTier.id || "tier-bronze",
      referrerTier.referee_reward_type || settings.referee_welcome_type,
      referrerTier.referee_reward_value || settings.referee_welcome_value,
      settings.currency,
      "Welcome Referral Discount",
      referrerTier.referee_reward_description || settings.referee_welcome_description,
      refereeVoucherCode
    ]
  });

  // 9. If immediate conversion (registration-based), grant referrer reward immediately
  if (shouldConvertImmediately) {
    const referrerVoucherCode = generateVoucherCode("REWARD");
    await db.execute({
      sql: `INSERT INTO referral_rewards (
        id, user_id, referral_id, reward_tier_id, recipient_role,
        reward_type, reward_value, currency, title, description,
        voucher_code, status, created_at
      ) VALUES (?, ?, ?, ?, 'referrer', ?, ?, ?, ?, ?, ?, 'available', CURRENT_TIMESTAMP)`,
      args: [
        crypto.randomUUID(),
        referrer.id,
        referralId,
        referrerTier.id || "tier-bronze",
        referrerTier.reward_type,
        referrerTier.reward_value,
        settings.currency,
        `Referral Reward (${refereeEmail})`,
        referrerTier.reward_description || `Earned from inviting ${refereeEmail}`,
        referrerVoucherCode
      ]
    });

    // If reward is credit, add to user's credit balance
    if (referrerTier.reward_type === "credit") {
      await db.execute({
        sql: "UPDATE users SET referral_credits = referral_credits + ? WHERE id = ?",
        args: [Number(referrerTier.reward_value || 0), referrer.id]
      });
    }

    // Recalculate referrer tier
    await recalculateUserTier(referrer.id);
  }

  // 10. Send email notification to referrer
  try {
    const config = await getEmailSenderConfig();
    const origin = appOrigin || "https://studio.com";
    await sendTransactionalEmail({
      to: referrer.email,
      templateId: "account_created_confirmation",
      subject: `New Referral! ${refereeName || refereeEmail} just joined using your invite link · ${config.studioName}`,
      templateData: {
        name: referrer.name || "Advocate",
        title: "A friend joined using your referral link!",
        content: `Great news! <strong>${refereeName || refereeEmail}</strong> just registered an account using your referral code <code>${cleanCode}</code>.${shouldConvertImmediately ? " Your referral reward has been credited to your account!" : " Once they book their first photoshoot, your reward will be unlocked!"}`,
        action_url: `${origin}/client/referrals`,
        action_text: "View Your Referral Dashboard",
        studio_name: config.studioName
      }
    });
  } catch (e) {
    console.warn("Failed to send referral email notification to referrer:", e);
  }

  const createdRef = await db.execute({ sql: "SELECT * FROM client_referrals WHERE id = ?", args: [referralId] });
  return { success: true, referral: createdRef.rows[0] as any };
}

// Process referral conversion when an invoice is paid
export async function processInvoicePaymentReferral(options: {
  invoiceId: string;
  clientUserId?: string;
  clientEmail?: string;
  amountPaid: number;
  appOrigin?: string;
}): Promise<{ converted: boolean; referralId?: string }> {
  const { invoiceId, clientUserId, clientEmail, amountPaid, appOrigin } = options;

  const settings = await getReferralProgramSettings();
  if (!settings.is_active) {
    return { converted: false };
  }

  const cleanEmail = (clientEmail || "").toLowerCase().trim();

  // Find pending referral for this client
  const refRes = await db.execute({
    sql: `SELECT * FROM client_referrals 
          WHERE (referee_user_id = ? OR LOWER(referee_email) = ?) 
            AND status = 'pending'`,
    args: [clientUserId || "", cleanEmail]
  });

  if (refRes.rows.length === 0) {
    return { converted: false };
  }

  const ref = refRes.rows[0] as any;

  // Check min spend if configured
  if (settings.success_criteria === "min_spend" && amountPaid < settings.min_spend) {
    return { converted: false };
  }

  // Fetch referrer details & tier
  const referrerRes = await db.execute({
    sql: "SELECT id, email, name, referral_tier_id FROM users WHERE id = ?",
    args: [ref.referrer_user_id]
  });

  if (referrerRes.rows.length === 0) {
    return { converted: false };
  }

  const referrer = referrerRes.rows[0] as any;
  const tiers = await getReferralTiers();
  const referrerTier = (tiers.find(t => t.id === referrer.referral_tier_id) || tiers[0] || {
    id: "tier-bronze",
    reward_type: "credit",
    reward_value: 25,
    reward_description: "$25 Studio Credit"
  }) as ReferralTier;

  // Convert referral status
  await db.execute({
    sql: `UPDATE client_referrals SET
      status = 'converted',
      conversion_value = ?,
      referrer_reward_granted = 1,
      converted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    args: [amountPaid, ref.id]
  });

  // Issue Referrer reward voucher
  const referrerVoucherCode = generateVoucherCode("REWARD");
  await db.execute({
    sql: `INSERT INTO referral_rewards (
      id, user_id, referral_id, reward_tier_id, recipient_role,
      reward_type, reward_value, currency, title, description,
      voucher_code, status, created_at
    ) VALUES (?, ?, ?, ?, 'referrer', ?, ?, ?, ?, ?, ?, 'available', CURRENT_TIMESTAMP)`,
    args: [
      crypto.randomUUID(),
      referrer.id,
      ref.id,
      referrerTier.id || "tier-bronze",
      referrerTier.reward_type,
      referrerTier.reward_value,
      settings.currency,
      `Referral Reward (${ref.referee_email})`,
      referrerTier.reward_description || `Earned from referral booking by ${ref.referee_email}`,
      referrerVoucherCode
    ]
  });

  // If credit reward, increment user's balance
  if (referrerTier.reward_type === "credit") {
    await db.execute({
      sql: "UPDATE users SET referral_credits = referral_credits + ? WHERE id = ?",
      args: [Number(referrerTier.reward_value || 0), referrer.id]
    });
  }

  // Recalculate Referrer's tier and potentially upgrade them!
  await recalculateUserTier(referrer.id);

  // Send Reward Unlocked Email to referrer
  try {
    const config = await getEmailSenderConfig();
    const origin = appOrigin || "https://studio.com";
    await sendTransactionalEmail({
      to: referrer.email,
      templateId: "account_created_confirmation",
      subject: `Reward Unlocked! You earned ${referrerTier.reward_description || `${referrerTier.reward_value} Reward`} · ${config.studioName}`,
      templateData: {
        name: referrer.name || "Advocate",
        title: "Your referral reward is ready!",
        content: `Fantastic news! <strong>${ref.referee_email}</strong> just completed their booking. You have unlocked your reward: <strong>${referrerTier.reward_description || `${referrerTier.reward_value} ${referrerTier.reward_type}`}</strong>.<br/><br/>Your voucher code is: <code>${referrerVoucherCode}</code>.`,
        action_url: `${origin}/client/referrals`,
        action_text: "Claim Your Reward",
        studio_name: config.studioName
      }
    });
  } catch (e) {
    console.warn("Failed to dispatch reward email:", e);
  }

  return { converted: true, referralId: ref.id };
}

// Get Client Referral Portal Profile
export async function getClientReferralProfile(userId: string, appOrigin: string): Promise<ClientReferralProfile> {
  const code = await ensureUserReferralCode(userId);

  const userRes = await db.execute({
    sql: "SELECT id, email, name, referral_code, referral_tier_id, referral_credits FROM users WHERE id = ?",
    args: [userId]
  });
  const user = userRes.rows[0] as any;

  const tiers = await getReferralTiers();
  const currentTier = tiers.find(t => t.id === user.referral_tier_id) || tiers[0];
  const currentIndex = tiers.findIndex(t => t.id === currentTier.id);
  const nextTier = (currentIndex >= 0 && currentIndex < tiers.length - 1) ? tiers[currentIndex + 1] : null;

  // Fetch referrals stats
  const refsRes = await db.execute({
    sql: `SELECT * FROM client_referrals 
          WHERE referrer_user_id = ? 
          ORDER BY created_at DESC`,
    args: [userId]
  });

  const allRefs = refsRes.rows as any[];
  const successfulRefs = allRefs.filter(r => r.status === "converted");
  const pendingRefs = allRefs.filter(r => r.status === "pending");

  const totalReferrals = allRefs.length;
  const successfulCount = successfulRefs.length;
  const pendingCount = pendingRefs.length;

  const totalRevenueGenerated = successfulRefs.reduce((acc, r) => acc + Number(r.conversion_value || 0), 0);

  // Rewards list
  const rewardsRes = await db.execute({
    sql: `SELECT r.*, t.name as tier_name 
          FROM referral_rewards r
          LEFT JOIN referral_tiers t ON r.reward_tier_id = t.id
          WHERE r.user_id = ? 
          ORDER BY r.created_at DESC`,
    args: [userId]
  });

  const rewards = rewardsRes.rows.map((row: any) => ({
    ...row,
    reward_value: Number(row.reward_value || 0)
  }));

  const totalCreditsEarned = rewards
    .filter(r => r.reward_type === "credit")
    .reduce((acc, r) => acc + r.reward_value, 0);

  // Progress to next tier
  let referralsNeeded = 0;
  let progressPercent = 100;
  if (nextTier) {
    const currentBase = currentTier.min_referrals;
    const nextTarget = nextTier.min_referrals;
    const progressSpan = Math.max(1, nextTarget - currentBase);
    const progressCount = Math.max(0, successfulCount - currentBase);
    progressPercent = Math.min(100, Math.round((progressCount / progressSpan) * 100));
    referralsNeeded = Math.max(0, nextTarget - successfulCount);
  }

  const referralLink = `${appOrigin.replace(/\/$/, "")}/client/register?ref=${code}`;
  const settings = await getReferralProgramSettings();

  return {
    referral_code: code,
    referral_link: referralLink,
    currency: settings.currency,
    program_settings: settings,
    current_tier: currentTier,
    next_tier: nextTier,
    referrals_needed_for_next_tier: referralsNeeded,
    progress_percent: progressPercent,
    total_referrals: totalReferrals,
    successful_referrals: successfulCount,
    pending_referrals: pendingCount,
    total_credits_earned: totalCreditsEarned,
    available_credits: Number(user.referral_credits || 0),
    total_revenue_generated: totalRevenueGenerated,
    all_tiers: tiers,
    rewards: rewards as any,
    recent_referrals: allRefs.slice(0, 15) as any
  };
}

// Get Admin Comprehensive Referral Dashboard Data
export async function getAdminReferralDashboardData(): Promise<{
  stats: AdminReferralStats;
  tiers: ReferralTier[];
  settings: ReferralProgramSettings;
  clientsSummary: any[];
  referralsLog: any[];
  rewardsLog: any[];
  tierDistribution: Array<{ tier_name: string; badge_color: string; client_count: number }>;
}> {
  const settings = await getReferralProgramSettings();
  const tiers = await getReferralTiers();

  // 1. Overall stats
  const refStatsRes = await db.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'rejected' OR status = 'fraud_suspected' THEN 1 ELSE 0 END) as rejected,
      COALESCE(SUM(CASE WHEN status = 'converted' THEN conversion_value ELSE 0 END), 0) as revenue
    FROM client_referrals
  `);

  const sRow = refStatsRes.rows[0] as any;
  const totalReferrals = Number(sRow?.total || 0);
  const convertedReferrals = Number(sRow?.converted || 0);
  const pendingReferrals = Number(sRow?.pending || 0);
  const rejectedReferrals = Number(sRow?.rejected || 0);
  const totalReferredRevenue = Number(sRow?.revenue || 0);
  const conversionRate = totalReferrals > 0 ? Math.round((convertedReferrals / totalReferrals) * 100) : 0;

  // Active Referrers count
  const activeReferrersRes = await db.execute(`
    SELECT COUNT(DISTINCT referrer_user_id) as count FROM client_referrals
  `);
  const activeReferrersCount = Number(activeReferrersRes.rows[0]?.count || 0);

  // Rewards stats
  const rewardsStatsRes = await db.execute(`
    SELECT 
      COUNT(*) as total_rewards,
      COALESCE(SUM(CASE WHEN reward_type = 'credit' THEN reward_value ELSE 0 END), 0) as total_credits
    FROM referral_rewards
  `);
  const totalRewardsIssued = Number(rewardsStatsRes.rows[0]?.total_rewards || 0);
  const totalCreditsGranted = Number(rewardsStatsRes.rows[0]?.total_credits || 0);

  const stats: AdminReferralStats = {
    totalReferrals,
    convertedReferrals,
    pendingReferrals,
    rejectedReferrals,
    conversionRate,
    totalRewardsIssued,
    totalCreditsGranted,
    totalReferredRevenue,
    activeReferrersCount
  };

  // 2. Clients summary table with referral metrics
  const clientsRes = await db.execute(`
    SELECT 
      u.id, u.email, u.name, u.role, u.referral_code, u.referral_tier_id, u.referral_credits, u.created_at,
      t.name as tier_name, t.badge_color as tier_badge_color, t.icon as tier_icon,
      (SELECT COUNT(*) FROM client_referrals WHERE referrer_user_id = u.id) as total_invited,
      (SELECT COUNT(*) FROM client_referrals WHERE referrer_user_id = u.id AND status = 'converted') as successful_invited,
      (SELECT COALESCE(SUM(conversion_value), 0) FROM client_referrals WHERE referrer_user_id = u.id AND status = 'converted') as total_revenue
    FROM users u
    LEFT JOIN referral_tiers t ON u.referral_tier_id = t.id
    WHERE u.role = 'client' OR (SELECT COUNT(*) FROM client_referrals WHERE referrer_user_id = u.id) > 0
    ORDER BY successful_invited DESC, total_invited DESC, u.created_at DESC
  `);

  // 3. Detailed Referrals log
  const logRes = await db.execute(`
    SELECT 
      r.*,
      u1.name as referrer_name, u1.email as referrer_email,
      u2.name as referee_name
    FROM client_referrals r
    LEFT JOIN users u1 ON r.referrer_user_id = u1.id
    LEFT JOIN users u2 ON r.referee_user_id = u2.id
    ORDER BY r.created_at DESC
    LIMIT 100
  `);

  // 4. Rewards log
  const rewardsRes = await db.execute(`
    SELECT 
      rw.*,
      u.name as user_name, u.email as user_email,
      t.name as tier_name
    FROM referral_rewards rw
    LEFT JOIN users u ON rw.user_id = u.id
    LEFT JOIN referral_tiers t ON rw.reward_tier_id = t.id
    ORDER BY rw.created_at DESC
    LIMIT 100
  `);

  // 5. Tier Distribution
  const tierDistRes = await db.execute(`
    SELECT 
      COALESCE(t.name, 'Bronze Starter') as tier_name,
      COALESCE(t.badge_color, '#94A3B8') as badge_color,
      COUNT(u.id) as client_count
    FROM users u
    LEFT JOIN referral_tiers t ON u.referral_tier_id = t.id
    WHERE u.role = 'client'
    GROUP BY t.id, t.name, t.badge_color
    ORDER BY client_count DESC
  `);

  return {
    stats,
    tiers,
    settings,
    clientsSummary: clientsRes.rows as any[],
    referralsLog: logRes.rows as any[],
    rewardsLog: rewardsRes.rows as any[],
    tierDistribution: tierDistRes.rows as any[]
  };
}

// Admin manual status update for referral
export async function adminUpdateReferralStatus(
  referralId: string, 
  status: ReferralStatus, 
  reason?: string
): Promise<boolean> {
  const refRes = await db.execute({ sql: "SELECT * FROM client_referrals WHERE id = ?", args: [referralId] });
  if (refRes.rows.length === 0) return false;

  const ref = refRes.rows[0] as any;

  await db.execute({
    sql: `UPDATE client_referrals SET
      status = ?,
      rejection_reason = COALESCE(?, rejection_reason),
      converted_at = CASE WHEN ? = 'converted' AND converted_at IS NULL THEN CURRENT_TIMESTAMP ELSE converted_at END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    args: [status, reason ?? null, status, referralId]
  });

  if (status === "converted" && !ref.referrer_reward_granted) {
    const referrerRes = await db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [ref.referrer_user_id] });
    if (referrerRes.rows.length > 0) {
      const referrer = referrerRes.rows[0] as any;
      const tiers = await getReferralTiers();
      const referrerTier = tiers.find(t => t.id === referrer.referral_tier_id) || tiers[0];
      const settings = await getReferralProgramSettings();

      const voucherCode = generateVoucherCode("REWARD");
      await db.execute({
        sql: `INSERT INTO referral_rewards (
          id, user_id, referral_id, reward_tier_id, recipient_role,
          reward_type, reward_value, currency, title, description,
          voucher_code, status, created_at
        ) VALUES (?, ?, ?, ?, 'referrer', ?, ?, ?, ?, ?, ?, 'available', CURRENT_TIMESTAMP)`,
        args: [
          crypto.randomUUID(),
          referrer.id,
          referralId,
          referrerTier.id,
          referrerTier.reward_type,
          referrerTier.reward_value,
          settings.currency,
          `Referral Reward (${ref.referee_email})`,
          referrerTier.reward_description || `Manual referral confirmation by administrator`,
          voucherCode
        ]
      });

      if (referrerTier.reward_type === "credit") {
        await db.execute({
          sql: "UPDATE users SET referral_credits = referral_credits + ? WHERE id = ?",
          args: [Number(referrerTier.reward_value || 0), referrer.id]
        });
      }

      await db.execute({
        sql: "UPDATE client_referrals SET referrer_reward_granted = 1 WHERE id = ?",
        args: [referralId]
      });

      await recalculateUserTier(referrer.id);
    }
  }

  return true;
}

// Grant manual reward / bonus voucher by admin
export async function grantManualReward(options: {
  userId: string;
  rewardType: ReferralRewardType;
  rewardValue: number;
  title: string;
  description?: string;
  currency?: string;
  expiresInDays?: number;
}): Promise<ReferralReward> {
  const { userId, rewardType, rewardValue, title, description, currency, expiresInDays } = options;
  const voucherCode = generateVoucherCode("BONUS");
  const id = crypto.randomUUID();
  const expiresAt = Number(expiresInDays) > 0 ? new Date(Date.now() + Number(expiresInDays) * 86400000).toISOString() : null;

  await db.execute({
    sql: `INSERT INTO referral_rewards (
      id, user_id, referral_id, reward_tier_id, recipient_role,
      reward_type, reward_value, currency, title, description,
      voucher_code, status, expires_at, created_at
    ) VALUES (?, ?, NULL, NULL, 'admin_grant', ?, ?, ?, ?, ?, ?, 'available', ?, CURRENT_TIMESTAMP)`,
    args: [
      id,
      userId,
      rewardType,
      Number(rewardValue || 0),
      currency || "USD",
      title || "Special VIP Reward Voucher",
      description || "Granted directly by studio management",
      voucherCode,
      expiresAt
    ]
  });

  if (rewardType === "credit") {
    await db.execute({
      sql: "UPDATE users SET referral_credits = referral_credits + ? WHERE id = ?",
      args: [Number(rewardValue || 0), userId]
    });
  }

  const res = await db.execute({ sql: "SELECT r.*, u.email, u.name FROM referral_rewards r JOIN users u ON u.id = r.user_id WHERE r.id = ?", args: [id] });
  const reward: any = res.rows[0];
  const rewardValueLabel = rewardType === "discount_percent" ? `${Number(rewardValue)}% discount` : `${formatCurrency(Number(rewardValue), currency || "USD")} credit`;
  try {
    await sendTransactionalEmail({ to: String(reward.email), templateId: "vip_manual_coupon_assigned", templateData: { "user.name": reward.name || String(reward.email).split("@")[0], "user.email": reward.email, reward_title: title || "Special VIP Reward", reward_value_label: rewardValueLabel, voucher_code: voucherCode, reward_description: description || "Granted directly by studio management", expires_at: expiresAt ? new Intl.DateTimeFormat("hu-HU", { dateStyle: "long" }).format(new Date(expiresAt)) : "No expiry date", action_url: `${getAppUrl()}/client/referrals`, action_text: "View VIP Benefits" } });
  } catch (emailError) { console.error("Failed to send manual VIP coupon email:", emailError); }
  return reward as any;
}

// Redeem reward voucher
export async function redeemRewardVoucher(
  voucherCode: string, 
  invoiceId?: string, 
  notes?: string
): Promise<{ success: boolean; reward?: ReferralReward; error?: string }> {
  const code = voucherCode.trim().toUpperCase();
  const rewardRes = await db.execute({
    sql: "SELECT * FROM referral_rewards WHERE UPPER(voucher_code) = ?",
    args: [code]
  });

  if (rewardRes.rows.length === 0) {
    return { success: false, error: "Voucher code not found" };
  }

  const reward = rewardRes.rows[0] as any;
  if (reward.status !== "available") {
    return { success: false, error: `Voucher is already ${reward.status}` };
  }

  await db.execute({
    sql: `UPDATE referral_rewards SET
      status = 'redeemed',
      redeemed_at = CURRENT_TIMESTAMP,
      redeemed_invoice_id = ?,
      redeemed_notes = ?
    WHERE id = ?`,
    args: [invoiceId || null, notes || "Redeemed against studio order", reward.id]
  });

  const updated = await db.execute({ sql: "SELECT * FROM referral_rewards WHERE id = ?", args: [reward.id] });
  return { success: true, reward: updated.rows[0] as any };
}
