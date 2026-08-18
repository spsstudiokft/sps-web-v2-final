import { Router } from "express";
import { 
  getAdminReferralDashboardData,
  getReferralProgramSettings,
  updateReferralProgramSettings,
  getReferralTiers,
  createReferralTier,
  updateReferralTier,
  deleteReferralTier,
  adminUpdateReferralStatus,
  grantManualReward,
  redeemRewardVoucher
} from "./services/referralService.js";
import { db } from "../db.js";

export const referralRouter = Router();
export const publicReferralRouter = Router();

// =========================================================================
// 1. GET /api/admin/referrals/dashboard - Full Dashboard Analytics & Data
// =========================================================================
referralRouter.get("/dashboard", async (req: any, res) => {
  try {
    const data = await getAdminReferralDashboardData();
    res.json(data);
  } catch (error: any) {
    console.error("Failed to load referral dashboard:", error);
    res.status(500).json({ error: error.message || "Failed to load referral data" });
  }
});

// =========================================================================
// 2. GET /api/admin/referrals/stats - KPIs and Top Advocates
// =========================================================================
referralRouter.get("/stats", async (req: any, res) => {
  try {
    const dashboardData = await getAdminReferralDashboardData();
    const { stats, clientsSummary } = dashboardData;

    // Build top advocates formatted for UI
    const topReferrers = clientsSummary
      .filter((c: any) => Number(c.successful_invited || 0) > 0 || Number(c.total_invited || 0) > 0)
      .slice(0, 10)
      .map((c: any) => ({
        user_id: c.id,
        name: c.name || c.email?.split("@")[0] || "VIP Advocate",
        email: c.email,
        tier_name: c.tier_name || "Bronze Starter",
        tier_color: c.tier_badge_color || "#3B82F6",
        referrals_count: Number(c.successful_invited || 0),
        total_revenue: Number(c.total_revenue || 0)
      }));

    const responseStats = {
      ...stats,
      total_referrals: stats.totalReferrals,
      converted_referrals: stats.convertedReferrals,
      pending_referrals: stats.pendingReferrals,
      rejected_referrals: stats.rejectedReferrals,
      total_conversion_value: stats.totalReferredRevenue,
      total_rewards_issued: stats.totalRewardsIssued,
      total_credits_granted: stats.totalCreditsGranted,
      active_referrers_count: stats.activeReferrersCount,
      active_advocates: stats.activeReferrersCount,
      conversion_rate: stats.conversionRate,
      top_referrers: topReferrers
    };

    res.json(responseStats);
  } catch (error: any) {
    console.error("Failed to load referral stats:", error);
    res.status(500).json({ error: error.message || "Failed to load referral stats" });
  }
});

// =========================================================================
// 3. GET /api/admin/referrals/list - Referral Relationships Log
// =========================================================================
referralRouter.get("/list", async (req: any, res) => {
  try {
    const dashboardData = await getAdminReferralDashboardData();
    const formatted = dashboardData.referralsLog.map((r: any) => ({
      ...r,
      referral_code: r.referral_code_used || r.referral_code
    }));
    res.json(formatted);
  } catch (error: any) {
    console.error("Failed to fetch referrals list:", error);
    res.status(500).json({ error: error.message || "Failed to fetch referrals" });
  }
});

// =========================================================================
// 4. GET /api/admin/referrals/rewards - Issued Rewards Log
// =========================================================================
referralRouter.get("/rewards", async (req: any, res) => {
  try {
    const dashboardData = await getAdminReferralDashboardData();
    res.json(dashboardData.rewardsLog);
  } catch (error: any) {
    console.error("Failed to fetch referral rewards:", error);
    res.status(500).json({ error: error.message || "Failed to fetch rewards" });
  }
});

// =========================================================================
// 4b. GET /api/admin/referrals/clients - Registered Clients for Manual Rewards
// =========================================================================
referralRouter.get("/clients", async (req: any, res) => {
  try {
    const search = (req.query.search as string || "").trim().toLowerCase();
    let sql = `
      SELECT 
        u.id, 
        COALESCE(NULLIF(TRIM(u.name), ''), NULLIF(TRIM(c.name), ''), u.email) as name,
        u.email, 
        u.role, 
        u.is_active,
        u.referral_code,
        COALESCE(u.referral_credits, 0) as referral_credits,
        c.id as customer_id,
        c.name as customer_name,
        c.phone as phone,
        t.id as tier_id,
        t.name as tier_name,
        t.badge_color as tier_color
      FROM users u
      LEFT JOIN crm_records c 
        ON LOWER(TRIM(u.email)) = LOWER(TRIM(c.email)) 
       AND c.type = 'customer'
      LEFT JOIN referral_tiers t
        ON u.referral_tier_id = t.id
      WHERE u.role = 'client'
    `;
    const args: any[] = [];
    if (search) {
      sql += " AND (LOWER(u.email) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(u.referral_code) LIKE ?)";
      const pattern = `%${search}%`;
      args.push(pattern, pattern, pattern, pattern);
    }
    sql += " ORDER BY COALESCE(NULLIF(TRIM(u.name), ''), NULLIF(TRIM(c.name), ''), u.email) ASC";

    const result = await db.execute({ sql, args });
    
    // If no client role records found, fallback to all users in the system
    if (result.rows.length === 0 && !search) {
      const fallbackResult = await db.execute({
        sql: `SELECT u.id, COALESCE(NULLIF(TRIM(u.name), ''), u.email) as name, u.email, u.role, u.is_active, u.referral_code, COALESCE(u.referral_credits, 0) as referral_credits FROM users u ORDER BY u.email ASC`
      });
      return res.json(fallbackResult.rows);
    }

    res.json(result.rows);
  } catch (error: any) {
    console.error("Failed to fetch clients for referrals:", error);
    res.status(500).json({ error: error.message || "Failed to fetch clients" });
  }
});

// =========================================================================
// 5. Settings: GET & PUT /api/admin/referrals/settings
// =========================================================================
referralRouter.get("/settings", async (req: any, res) => {
  try {
    const rawSettings = await getReferralProgramSettings();
    // Provide both snake_case and UI-specific aliases for maximum compatibility
    const settings = {
      ...rawSettings,
      is_enabled: rawSettings.is_active,
      referral_trigger: rawSettings.success_criteria === "min_spend" || rawSettings.success_criteria === "first_payment" 
        ? "on_first_paid_invoice" 
        : "on_registration",
      min_invoice_amount_for_conversion: rawSettings.min_spend || 0,
      referee_reward_type: rawSettings.referee_welcome_type,
      referee_reward_value: rawSettings.referee_welcome_value,
      referee_reward_description: rawSettings.referee_welcome_description
    };
    res.json(settings);
  } catch (error: any) {
    console.error("Failed to get referral settings:", error);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

referralRouter.put("/settings", async (req: any, res) => {
  try {
    const body = req.body || {};
    // Map UI inputs to core settings if present
    const payload: any = {
      is_active: body.is_enabled !== undefined ? Boolean(body.is_enabled) : (body.is_active !== undefined ? Boolean(body.is_active) : true),
      success_criteria: body.referral_trigger === "on_first_paid_invoice" 
        ? (Number(body.min_invoice_amount_for_conversion || body.min_spend || 0) > 0 ? "min_spend" : "first_payment")
        : (body.success_criteria || "first_payment"),
      min_spend: Number(body.min_invoice_amount_for_conversion !== undefined ? body.min_invoice_amount_for_conversion : (body.min_spend || 0)),
      referee_welcome_type: body.referee_reward_type || body.referee_welcome_type || "discount_percent",
      referee_welcome_value: Number(body.referee_reward_value !== undefined ? body.referee_reward_value : (body.referee_welcome_value || 10)),
      referee_welcome_description: body.referee_reward_description || body.referee_welcome_description || "10% Welcome Discount",
      fraud_ip_check: body.fraud_ip_check !== undefined ? Boolean(body.fraud_ip_check) : true,
      currency: body.currency || "USD",
      custom_terms: body.custom_terms || ""
    };

    const updated = await updateReferralProgramSettings(payload);
    res.json({ 
      success: true, 
      settings: {
        ...updated,
        is_enabled: updated.is_active,
        referral_trigger: updated.success_criteria === "min_spend" || updated.success_criteria === "first_payment" 
          ? "on_first_paid_invoice" 
          : "on_registration",
        min_invoice_amount_for_conversion: updated.min_spend || 0,
        referee_reward_type: updated.referee_welcome_type,
        referee_reward_value: updated.referee_welcome_value,
        referee_reward_description: updated.referee_welcome_description
      }
    });
  } catch (error: any) {
    console.error("Failed to update referral settings:", error);
    res.status(500).json({ error: error.message || "Failed to update settings" });
  }
});

// =========================================================================
// 6. Tiers CRUD: /api/admin/referrals/tiers
// =========================================================================
referralRouter.get("/tiers", async (req: any, res) => {
  try {
    const tiers = await getReferralTiers();
    const formatted = tiers.map((t: any) => ({
      ...t,
      min_referred_revenue: t.min_revenue || 0,
      perks: Array.isArray(t.perks) ? t.perks : (typeof t.perks_json === "string" ? JSON.parse(t.perks_json || "[]") : [])
    }));
    res.json(formatted);
  } catch (error: any) {
    console.error("Failed to fetch referral tiers:", error);
    res.status(500).json({ error: "Failed to load tiers" });
  }
});

referralRouter.post("/tiers", async (req: any, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Tier name is required" });
    }

    const payload = {
      ...req.body,
      reward_type: req.body.reward_type === "store_credit" ? "credit" : req.body.reward_type,
      min_revenue: req.body.min_referred_revenue !== undefined ? req.body.min_referred_revenue : (req.body.min_revenue || 0)
    };

    const tier = await createReferralTier(payload);
    res.status(201).json({ success: true, tier });
  } catch (error: any) {
    console.error("Failed to create referral tier:", error);
    res.status(500).json({ error: error.message || "Failed to create tier" });
  }
});

referralRouter.put("/tiers/:id", async (req: any, res) => {
  try {
    const payload = {
      ...req.body,
      reward_type: req.body.reward_type === "store_credit" ? "credit" : req.body.reward_type,
      min_revenue: req.body.min_referred_revenue !== undefined ? req.body.min_referred_revenue : (req.body.min_revenue || 0)
    };

    const tier = await updateReferralTier(req.params.id, payload);
    res.json({ success: true, tier });
  } catch (error: any) {
    console.error("Failed to update referral tier:", error);
    res.status(500).json({ error: error.message || "Failed to update tier" });
  }
});

referralRouter.delete("/tiers/:id", async (req: any, res) => {
  try {
    const success = await deleteReferralTier(req.params.id);
    res.json({ success });
  } catch (error: any) {
    console.error("Failed to delete referral tier:", error);
    res.status(500).json({ error: error.message || "Failed to delete tier" });
  }
});

// =========================================================================
// 7. Update Referral Status: Handlers for PATCH/POST
// =========================================================================
const updateReferralStatusHandler = async (req: any, res: any) => {
  try {
    const { status, reason } = req.body;
    if (!status || !["pending", "converted", "rejected", "fraud_suspected"].includes(status)) {
      return res.status(400).json({ error: "Invalid referral status" });
    }

    const success = await adminUpdateReferralStatus(req.params.id, status, reason);
    if (!success) {
      return res.status(404).json({ error: "Referral not found" });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update referral status:", error);
    res.status(500).json({ error: error.message || "Failed to update status" });
  }
};

referralRouter.patch("/relationships/:id/status", updateReferralStatusHandler);
referralRouter.post("/relationships/:id/status", updateReferralStatusHandler);
referralRouter.post("/referrals/:id/status", updateReferralStatusHandler);
referralRouter.patch("/referrals/:id/status", updateReferralStatusHandler);

// =========================================================================
// 8. Grant / Issue Manual Reward
// =========================================================================
const issueManualRewardHandler = async (req: any, res: any) => {
  try {
    const { user_id, reward_type, reward_value, title, description, currency } = req.body;
    if (!user_id || !reward_type || reward_value === undefined) {
      return res.status(400).json({ error: "User ID, reward type, and value are required" });
    }

    const normalizedRewardType = reward_type === "store_credit" ? "credit" : reward_type;

    const reward = await grantManualReward({
      userId: user_id,
      rewardType: normalizedRewardType,
      rewardValue: Number(reward_value),
      title: title || "Special VIP Reward",
      description,
      currency
    });

    res.status(201).json({ success: true, reward });
  } catch (error: any) {
    console.error("Failed to grant manual reward:", error);
    res.status(500).json({ error: error.message || "Failed to grant reward" });
  }
};

referralRouter.post("/rewards/grant", issueManualRewardHandler);
referralRouter.post("/rewards/issue", issueManualRewardHandler);

// =========================================================================
// 9. Update Reward Voucher Status (Redeem or Revoke)
// =========================================================================
const updateRewardStatusHandler = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["redeemed", "revoked", "available", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const normStatus = status === "revoked" ? "cancelled" : status;

    await db.execute({
      sql: `UPDATE referral_rewards SET 
              status = ?, 
              redeemed_at = CASE WHEN ? = 'redeemed' THEN CURRENT_TIMESTAMP ELSE redeemed_at END 
            WHERE id = ?`,
      args: [normStatus, normStatus, id]
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update reward status:", error);
    res.status(500).json({ error: error.message || "Failed to update reward status" });
  }
};

referralRouter.patch("/rewards/:id/status", updateRewardStatusHandler);
referralRouter.post("/rewards/:id/status", updateRewardStatusHandler);

// =========================================================================
// 10. Redeem Reward Voucher by Code: POST /api/admin/referrals/rewards/redeem
// =========================================================================
referralRouter.post("/rewards/redeem", async (req: any, res) => {
  try {
    const { voucher_code, invoice_id, notes } = req.body;
    if (!voucher_code) {
      return res.status(400).json({ error: "Voucher code is required" });
    }

    const result = await redeemRewardVoucher(voucher_code, invoice_id, notes);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    console.error("Failed to redeem reward voucher:", error);
    res.status(500).json({ error: error.message || "Failed to redeem voucher" });
  }
});

// =========================================================================
// 11. Manually Set User Tier: POST /api/admin/referrals/users/:userId/tier
// =========================================================================
referralRouter.post("/users/:userId/tier", async (req: any, res) => {
  try {
    const { tier_id } = req.body;
    if (!tier_id) {
      return res.status(400).json({ error: "Tier ID is required" });
    }

    await db.execute({
      sql: "UPDATE users SET referral_tier_id = ? WHERE id = ?",
      args: [tier_id, req.params.userId]
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update user tier:", error);
    res.status(500).json({ error: "Failed to update tier" });
  }
});

// =========================================================================
// PUBLIC ROUTES: /api/public/referrals/validate-code/:code
// =========================================================================
publicReferralRouter.get("/validate-code/:code", async (req: any, res) => {
  try {
    const { code } = req.params;
    if (!code || typeof code !== "string") {
      return res.json({ valid: false });
    }

    const cleanCode = code.trim().toUpperCase();
    const userRes = await db.execute({
      sql: `SELECT u.id, u.name, u.referral_code, t.name as tier_name, t.referee_reward_type, t.referee_reward_value, t.referee_reward_description
            FROM users u
            LEFT JOIN referral_tiers t ON u.referral_tier_id = t.id
            WHERE UPPER(u.referral_code) = ?`,
      args: [cleanCode]
    });

    if (userRes.rows.length === 0) {
      return res.json({ valid: false, message: "Referral code not recognized" });
    }

    const referrer = userRes.rows[0] as any;
    const settings = await getReferralProgramSettings();

    res.json({
      valid: true,
      referral_code: cleanCode,
      referrer_name: referrer.name ? referrer.name.split(" ")[0] : "A VIP Client",
      welcome_reward: {
        type: referrer.referee_reward_type || settings.referee_welcome_type,
        value: referrer.referee_reward_value || settings.referee_welcome_value,
        description: referrer.referee_reward_description || settings.referee_welcome_description
      }
    });
  } catch (error: any) {
    console.error("Failed to validate referral code:", error);
    res.status(500).json({ valid: false, error: "Validation error" });
  }
});
