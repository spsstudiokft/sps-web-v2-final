import { Router } from "express";
import crypto from "crypto";
import { db } from "../db.js";

const budgetRouter = Router();

const SUPPORTED_BUDGET_CURRENCIES = new Set(["HUF", "EUR", "USD", "GBP", "CHF", "CAD", "AUD"]);

function normalizeBudgetCurrency(value: unknown): string {
  const currency = String(value || "").trim().toUpperCase();
  return SUPPORTED_BUDGET_CURRENCIES.has(currency) ? currency : "USD";
}

function parseBudgetExchangeRates(value: unknown): Record<string, number> {
  if (typeof value !== "string" || value.length > 2_000) return { EUR: 1 };
  try {
    const source = JSON.parse(value) as Record<string, unknown>;
    const rates: Record<string, number> = { EUR: 1 };
    for (const [currency, rate] of Object.entries(source || {})) {
      const normalized = normalizeBudgetCurrency(currency);
      const numericRate = Number(rate);
      if (SUPPORTED_BUDGET_CURRENCIES.has(normalized) && Number.isFinite(numericRate) && numericRate > 0 && numericRate < 1_000_000) {
        rates[normalized] = numericRate;
      }
    }
    return rates;
  } catch {
    return { EUR: 1 };
  }
}

function convertBudgetAmount(amount: number, sourceCurrency: string, targetCurrency: string, rates: Record<string, number>): number | null {
  if (sourceCurrency === targetCurrency) return amount;
  const sourceRate = rates[sourceCurrency];
  const targetRate = rates[targetCurrency];
  if (!Number.isFinite(sourceRate) || !Number.isFinite(targetRate) || sourceRate <= 0 || targetRate <= 0) return null;
  return amount / sourceRate * targetRate;
}

// Budget entries and their aggregates are private, mutable financial data.
// Prevent browsers and Vercel from returning a previous summary after a save.
budgetRouter.use((_req, res, next) => {
  res.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.set("CDN-Cache-Control", "no-store");
  res.set("Vercel-CDN-Cache-Control", "no-store");
  next();
});

// Helper to log budget audit trail
async function logBudgetAudit(
  entryId: string | null,
  action: "create" | "update" | "delete" | "status_change" | "settings_update",
  userId: string,
  userName: string,
  userEmail: string,
  details: Record<string, any>
) {
  try {
    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO budget_audit_logs (id, entry_id, action, performed_by_id, performed_by_name, performed_by_email, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        id,
        entryId,
        action,
        userId,
        userName || "Administrator",
        userEmail || "",
        JSON.stringify(details)
      ]
    });
  } catch (err) {
    console.error("[Budget Audit Log Error]", err);
  }
}

// Helper to fetch user role & superadmin status
async function getUserContext(userId: string, overrideViewMode?: string) {
  const res = await db.execute({
    sql: "SELECT id, email, name, role FROM users WHERE id = ?",
    args: [userId]
  });

  if (res.rows.length === 0) {
    return { id: userId, email: "", name: "Admin", role: "admin", isSuperAdmin: false };
  }

  const user = res.rows[0] as any;
  const isSuperAdminRole = user.role === "superadmin";
  
  return {
    id: user.id as string,
    email: (user.email as string) || "",
    name: (user.name as string) || ((user.email as string)?.split("@")[0] || "Admin"),
    role: (user.role as string) || "admin",
    isSuperAdmin: isSuperAdminRole || overrideViewMode === "superadmin"
  };
}

// =========================================================================
// 1. GET /api/admin/budgets - List budget entries (filtered & ownership checked)
// =========================================================================
budgetRouter.get("/", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const viewModeHeader = req.headers["x-budget-view-mode"] as string;
    const userCtx = await getUserContext(currentUserId, viewModeHeader);

    const {
      admin_id,
      type,
      status,
      category,
      start_date,
      end_date,
      search,
      sort_by = "date",
      sort_order = "desc"
    } = req.query;

    let sql = `
      SELECT 
        b.id,
        b.owner_admin_id,
        b.type,
        b.amount,
        b.currency,
        b.date,
        b.category,
        b.status,
        b.description,
        b.color_code,
        b.created_at,
        b.updated_at,
        u.name AS owner_name,
        u.email AS owner_email,
        u.workspace AS owner_workspace,
        u.role AS owner_role,
        s.default_color AS admin_default_color,
        COUNT(*) OVER() AS total_count
      FROM budget_entries b
      LEFT JOIN users u ON b.owner_admin_id = u.id
      LEFT JOIN budget_admin_settings s ON b.owner_admin_id = s.admin_id
      WHERE 1=1
    `;

    const args: any[] = [];

    // Ownership filter:
    // If not superadmin -> STRICTLY only own entries
    // If superadmin -> can see all, or filter by requested admin_id
    if (!userCtx.isSuperAdmin) {
      sql += " AND b.owner_admin_id = ?";
      args.push(currentUserId);
    } else if (admin_id && admin_id !== "all") {
      sql += " AND b.owner_admin_id = ?";
      args.push(admin_id);
    }

    // Type filter
    if (type && type !== "all") {
      sql += " AND b.type = ?";
      args.push(type);
    }

    // Status filter
    if (status && status !== "all") {
      sql += " AND b.status = ?";
      args.push(status);
    }

    // Category filter
    if (category && category !== "all") {
      sql += " AND b.category = ?";
      args.push(category);
    }

    // Date range filters
    if (start_date) {
      sql += " AND b.date >= ?";
      args.push(start_date);
    }
    if (end_date) {
      sql += " AND b.date <= ?";
      args.push(end_date);
    }

    // Search filter
    if (search && typeof search === "string" && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += " AND (LOWER(b.description) LIKE ? OR LOWER(b.category) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)";
      args.push(term, term, term, term);
    }

    // Sorting
    const allowedSortFields: Record<string, string> = {
      date: "b.date",
      amount: "b.amount",
      status: "b.status",
      category: "b.category",
      type: "b.type",
      created_at: "b.created_at"
    };

    const sortColumn = allowedSortFields[sort_by as string] || "b.date";
    const sortDir = String(sort_order).toLowerCase() === "asc" ? "ASC" : "DESC";

    sql += ` ORDER BY ${sortColumn} ${sortDir}, b.created_at DESC`;

    const paginationEnabled = req.query.page !== undefined || req.query.page_size !== undefined;
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(10, Number.parseInt(String(req.query.page_size || "25"), 10) || 25));
    if (paginationEnabled) { sql += " LIMIT ? OFFSET ?"; args.push(pageSize, (page - 1) * pageSize); }

    const result = await db.execute({ sql, args });

    const entries = result.rows.map((row: any) => ({
      id: row.id,
      owner_admin_id: row.owner_admin_id,
      owner_name: row.owner_name || row.owner_email?.split("@")[0] || "Admin",
      owner_email: row.owner_email || "",
      owner_workspace: row.owner_workspace || "Main Studio",
      owner_role: row.owner_role || "admin",
      type: row.type,
      amount: Number(row.amount || 0),
      currency: row.currency || "USD",
      date: row.date,
      category: row.category || "General",
      status: row.status || "planned",
      description: row.description || "",
      color_code: row.color_code || row.admin_default_color || "#3B82F6",
      created_at: row.created_at,
      updated_at: row.updated_at,
      isOwner: row.owner_admin_id === currentUserId
    }));

    res.json({
      entries,
      ...(paginationEnabled ? { pagination: { page, page_size: pageSize, total: Number(result.rows[0]?.total_count || 0), total_pages: Math.max(1, Math.ceil(Number(result.rows[0]?.total_count || 0) / pageSize)) } } : {}),
      isSuperAdmin: userCtx.isSuperAdmin,
      currentAdminId: currentUserId,
      currentAdminRole: userCtx.role
    });
  } catch (error: any) {
    console.error("Failed to fetch budget entries:", error);
    res.status(500).json({ error: "Failed to load budget entries" });
  }
});

// =========================================================================
// 2. GET /api/admin/budgets/summary - Aggregated stats and charts data
// =========================================================================
budgetRouter.get("/summary", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const viewModeHeader = req.headers["x-budget-view-mode"] as string;
    const userCtx = await getUserContext(currentUserId, viewModeHeader);

    const {
      admin_id,
      start_date,
      end_date,
      type,
      status,
      category,
      currency,
      rates
    } = req.query;
    const displayCurrency = normalizeBudgetCurrency(currency);
    const exchangeRates = parseBudgetExchangeRates(rates);
    const unconvertedCurrencies = new Set<string>();

    let baseSql = `
      SELECT 
        b.id,
        b.owner_admin_id,
        b.type,
        b.amount,
        b.currency,
        b.date,
        b.category,
        b.status,
        b.color_code,
        u.name AS owner_name,
        u.email AS owner_email,
        u.role AS owner_role,
        s.default_color AS admin_default_color
      FROM budget_entries b
      LEFT JOIN users u ON b.owner_admin_id = u.id
      LEFT JOIN budget_admin_settings s ON b.owner_admin_id = s.admin_id
      WHERE 1=1
    `;

    const args: any[] = [];

    if (!userCtx.isSuperAdmin) {
      baseSql += " AND b.owner_admin_id = ?";
      args.push(currentUserId);
    } else if (admin_id && admin_id !== "all") {
      baseSql += " AND b.owner_admin_id = ?";
      args.push(admin_id);
    }

    if (type && type !== "all") {
      baseSql += " AND b.type = ?";
      args.push(type);
    }
    if (status && status !== "all") {
      baseSql += " AND b.status = ?";
      args.push(status);
    }
    if (category && category !== "all") {
      baseSql += " AND b.category = ?";
      args.push(category);
    }
    if (start_date) {
      baseSql += " AND b.date >= ?";
      args.push(start_date);
    }
    if (end_date) {
      baseSql += " AND b.date <= ?";
      args.push(end_date);
    }

    const result = await db.execute({ sql: baseSql, args });
    const rows = result.rows;

    let totalIncome = 0;
    let totalOutcome = 0;
    let confirmedIncome = 0;
    let confirmedOutcome = 0;
    let plannedIncome = 0;
    let plannedOutcome = 0;
    let pendingIncome = 0;
    let pendingOutcome = 0;
    let rejectedIncome = 0;
    let rejectedOutcome = 0;

    const monthlyMap: Record<string, { month: string; income: number; outcome: number; net: number }> = {};
    const categoryIncomesMap: Record<string, { category: string; amount: number; count: number; color?: string }> = {};
    const categoryOutcomesMap: Record<string, { category: string; amount: number; count: number; color?: string }> = {};
    const adminMap: Record<string, { adminId: string; adminName: string; adminEmail: string; adminRole: string; adminColor: string; totalIncome: number; totalOutcome: number; net: number; entryCount: number; confirmedIncome: number; confirmedOutcome: number }> = {};

    rows.forEach((row: any) => {
      const sourceCurrency = normalizeBudgetCurrency(row.currency);
      const convertedAmount = convertBudgetAmount(Number(row.amount || 0), sourceCurrency, displayCurrency, exchangeRates);
      if (convertedAmount === null) {
        unconvertedCurrencies.add(sourceCurrency);
        return;
      }
      const amt = convertedAmount;
      const isIncome = row.type === "income";
      const cat = row.category || "General";
      const stat = row.status || "planned";
      const adminId = row.owner_admin_id;
      const adminName = row.owner_name || row.owner_email?.split("@")[0] || "Admin";
      const adminEmail = row.owner_email || "";
      const adminRole = row.owner_role || "admin";
      const adminColor = row.color_code || row.admin_default_color || "#3B82F6";

      // Date parsing for month group (YYYY-MM)
      const dateStr = String(row.date || "");
      const monthKey = dateStr.slice(0, 7) || "Current";

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, income: 0, outcome: 0, net: 0 };
      }

      if (isIncome) {
        totalIncome += amt;
        monthlyMap[monthKey].income += amt;

        if (stat === "confirmed") confirmedIncome += amt;
        else if (stat === "planned") plannedIncome += amt;
        else if (stat === "pending") pendingIncome += amt;
        else if (stat === "rejected") rejectedIncome += amt;

        if (!categoryIncomesMap[cat]) {
          categoryIncomesMap[cat] = { category: cat, amount: 0, count: 0, color: row.color_code };
        }
        categoryIncomesMap[cat].amount += amt;
        categoryIncomesMap[cat].count += 1;
      } else {
        totalOutcome += amt;
        monthlyMap[monthKey].outcome += amt;

        if (stat === "confirmed") confirmedOutcome += amt;
        else if (stat === "planned") plannedOutcome += amt;
        else if (stat === "pending") pendingOutcome += amt;
        else if (stat === "rejected") rejectedOutcome += amt;

        if (!categoryOutcomesMap[cat]) {
          categoryOutcomesMap[cat] = { category: cat, amount: 0, count: 0, color: row.color_code };
        }
        categoryOutcomesMap[cat].amount += amt;
        categoryOutcomesMap[cat].count += 1;
      }

      monthlyMap[monthKey].net = monthlyMap[monthKey].income - monthlyMap[monthKey].outcome;

      // Superadmin Admin Breakdown
      if (!adminMap[adminId]) {
        adminMap[adminId] = {
          adminId,
          adminName,
          adminEmail,
          adminRole,
          adminColor,
          totalIncome: 0,
          totalOutcome: 0,
          net: 0,
          entryCount: 0,
          confirmedIncome: 0,
          confirmedOutcome: 0
        };
      }

      adminMap[adminId].entryCount += 1;
      if (isIncome) {
        adminMap[adminId].totalIncome += amt;
        if (stat === "confirmed") adminMap[adminId].confirmedIncome += amt;
      } else {
        adminMap[adminId].totalOutcome += amt;
        if (stat === "confirmed") adminMap[adminId].confirmedOutcome += amt;
      }
      adminMap[adminId].net = adminMap[adminId].totalIncome - adminMap[adminId].totalOutcome;
    });

    // Sort months chronologically
    const monthlyBreakdown = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

    const netBalance = totalIncome - totalOutcome;
    const confirmedNet = confirmedIncome - confirmedOutcome;
    const profitMargin = totalIncome > 0 ? ((netBalance / totalIncome) * 100) : 0;

    // Fetch admin target settings
    let targetIncome = 0;
    let budgetCap = 0;
    let periodStatus = "in_progress";
    let periodNotes = "";

    try {
      const targetAdminId = (!userCtx.isSuperAdmin || (admin_id && admin_id !== "all")) 
        ? (admin_id && admin_id !== "all" ? admin_id : currentUserId)
        : currentUserId;

      const settingsRes = await db.execute({
        sql: "SELECT * FROM budget_admin_settings WHERE admin_id = ?",
        args: [targetAdminId]
      });

      if (settingsRes.rows.length > 0) {
        const s: any = settingsRes.rows[0];
        targetIncome = Number(s.monthly_target_income || 0);
        budgetCap = Number(s.monthly_budget_cap || 0);
        periodStatus = s.period_status || "in_progress";
        periodNotes = s.period_notes || "";
      }
    } catch (e) {}

    res.json({
      totalIncome,
      totalOutcome,
      netBalance,
      confirmedIncome,
      confirmedOutcome,
      confirmedNet,
      plannedIncome,
      plannedOutcome,
      pendingIncome,
      pendingOutcome,
      rejectedIncome,
      rejectedOutcome,
      profitMargin,
      totalEntries: rows.length,
      displayCurrency,
      unconvertedCurrencies: Array.from(unconvertedCurrencies),
      monthlyBreakdown,
      categoryBreakdown: {
        incomes: Object.values(categoryIncomesMap).sort((a, b) => b.amount - a.amount),
        outcomes: Object.values(categoryOutcomesMap).sort((a, b) => b.amount - a.amount)
      },
      adminBreakdown: Object.values(adminMap).sort((a, b) => b.totalIncome - a.totalIncome),
      targets: {
        monthlyTargetIncome: targetIncome,
        monthlyBudgetCap: budgetCap,
        periodStatus,
        periodNotes,
        incomeProgress: targetIncome > 0 ? Math.min(100, (totalIncome / targetIncome) * 100) : 0,
        budgetUsed: budgetCap > 0 ? (totalOutcome / budgetCap) * 100 : 0
      }
    });
  } catch (error: any) {
    console.error("Failed to compute budget summary:", error);
    res.status(500).json({ error: "Failed to generate budget summary" });
  }
});

// =========================================================================
// 3. GET /api/admin/budgets/admins - List all admins with budget metrics
// =========================================================================
budgetRouter.get("/admins", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const adminsRes = await db.execute(`
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.role, 
        u.workspace, 
        u.is_active,
        s.default_color,
        s.default_currency,
        s.period_status,
        (SELECT COUNT(*) FROM budget_entries WHERE owner_admin_id = u.id) AS entry_count,
        (SELECT COALESCE(SUM(amount), 0) FROM budget_entries WHERE owner_admin_id = u.id AND type = 'income') AS total_income,
        (SELECT COALESCE(SUM(amount), 0) FROM budget_entries WHERE owner_admin_id = u.id AND type = 'outcome') AS total_outcome
      FROM users u
      LEFT JOIN budget_admin_settings s ON u.id = s.admin_id
      WHERE u.role IN ('admin', 'superadmin', 'editor', 'viewer') AND u.is_active = 1
      ORDER BY 
        CASE u.role WHEN 'superadmin' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
        u.name ASC, 
        u.email ASC
    `);

    const admins = adminsRes.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      name: row.name || row.email?.split("@")[0] || "Admin",
      role: row.role,
      workspace: row.workspace || "Main Studio",
      defaultColor: row.default_color || "#3B82F6",
      defaultCurrency: row.default_currency || "USD",
      periodStatus: row.period_status || "in_progress",
      entryCount: Number(row.entry_count || 0),
      totalIncome: Number(row.total_income || 0),
      totalOutcome: Number(row.total_outcome || 0),
      net: Number(row.total_income || 0) - Number(row.total_outcome || 0),
      isSelf: row.id === currentUserId
    }));

    res.json(admins);
  } catch (error: any) {
    console.error("Failed to fetch admin list for budget:", error);
    res.status(500).json({ error: "Failed to fetch admins" });
  }
});

// =========================================================================
// 4. POST /api/admin/budgets - Create a new budget entry
// =========================================================================
budgetRouter.post("/", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userCtx = await getUserContext(currentUserId);
    const {
      type,
      amount,
      currency = "USD",
      date,
      category = "General",
      status = "planned",
      description = "",
      color_code,
      project_id
    } = req.body;

    // Validation
    if (!type || (type !== "income" && type !== "outcome")) {
      return res.status(400).json({ error: "Invalid type: must be 'income' or 'outcome'" });
    }

    const numAmount = amount === undefined || amount === null || amount === "" ? 0 : Number(amount);
    if (isNaN(numAmount) || numAmount < 0) return res.status(400).json({ error: "Amount cannot be negative" });

    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "Date is required (YYYY-MM-DD)" });
    }

    const validStatuses = ["planned", "confirmed", "pending", "rejected"];
    const finalStatus = validStatuses.includes(status) ? status : "planned";

    // Resolve color: if not specified, fetch admin's default color or fallback
    let finalColor = color_code;
    if (!finalColor || typeof finalColor !== "string") {
      const sRes = await db.execute({
        sql: "SELECT default_color FROM budget_admin_settings WHERE admin_id = ?",
        args: [currentUserId]
      });
      finalColor = sRes.rows[0]?.default_color || (type === "income" ? "#10B981" : "#EF4444");
    }

    const newId = crypto.randomUUID();
    const cleanCategory = typeof category === "string" && category.trim() ? category.trim() : "General";
    const cleanDescription = typeof description === "string" ? description.trim() : "";
    const cleanCurrency = typeof currency === "string" ? currency.trim().toUpperCase().slice(0, 5) : "USD";
    if (project_id) {
      const project = await db.execute({ sql: "SELECT id FROM projects WHERE id = ?", args: [project_id] });
      if (!project.rows.length) return res.status(400).json({ error: "The selected project does not exist" });
    }

    await db.execute({
      sql: `INSERT INTO budget_entries (
        id, owner_admin_id, type, amount, currency, date, category, status, description, color_code, project_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        newId,
        currentUserId,
        type,
        numAmount,
        cleanCurrency,
        date.trim(),
        cleanCategory,
        finalStatus,
        cleanDescription,
        finalColor,
        project_id || null
      ]
    });

    // Record audit log
    await logBudgetAudit(
      newId,
      "create",
      currentUserId,
      userCtx.name,
      userCtx.email,
      {
        type,
        amount: numAmount,
        currency: cleanCurrency,
        date: date.trim(),
        category: cleanCategory,
        status: finalStatus,
        description: cleanDescription,
        color_code: finalColor
      }
    );

    const createdEntryRes = await db.execute({
      sql: `
        SELECT 
          b.*,
          u.name AS owner_name,
          u.email AS owner_email,
          u.workspace AS owner_workspace,
          u.role AS owner_role
        FROM budget_entries b
        LEFT JOIN users u ON b.owner_admin_id = u.id
        WHERE b.id = ?
      `,
      args: [newId]
    });

    const entry = createdEntryRes.rows[0];

    res.status(201).json({
      success: true,
      entry: {
        ...entry,
        isOwner: true
      }
    });
  } catch (error: any) {
    console.error("Failed to create budget entry:", error);
    res.status(500).json({ error: error.message || "Failed to create budget entry" });
  }
});

// =========================================================================
// 5. PUT /api/admin/budgets/:id - Update budget entry (Strict Ownership Access)
// =========================================================================
budgetRouter.put("/:id", async (req: any, res, next) => {
  try {
    // The static settings route is declared later in this router. Let Express
    // continue to it instead of treating "settings" as a budget entry ID.
    if (req.params.id === "settings") {
      return next();
    }

    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const userCtx = await getUserContext(currentUserId);

    // Fetch existing entry
    const existingRes = await db.execute({
      sql: "SELECT * FROM budget_entries WHERE id = ?",
      args: [id]
    });

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: "Budget entry not found" });
    }

    const existing: any = existingRes.rows[0];

    // STRICT PERMISSION CHECK:
    // Only the owner of the entry can edit it!
    // Superadmins have read-only access to other admins' entries.
    if (existing.owner_admin_id !== currentUserId) {
      return res.status(403).json({
        error: "Permission denied: Superadmins and other administrators have read-only access and cannot edit another admin's budget entries."
      });
    }

    const {
      type,
      amount,
      currency,
      date,
      category,
      status,
      description,
      color_code,
      project_id
    } = req.body;

    const targetType = (type === "income" || type === "outcome") ? type : existing.type;
    const targetAmount = amount !== undefined ? Number(amount) : Number(existing.amount);
    if (isNaN(targetAmount) || targetAmount < 0) return res.status(400).json({ error: "Amount cannot be negative" });

    const validStatuses = ["planned", "confirmed", "pending", "rejected"];
    const targetStatus = (status && validStatuses.includes(status)) ? status : existing.status;
    const targetCurrency = currency ? String(currency).trim().toUpperCase().slice(0, 5) : existing.currency;
    const targetDate = date ? String(date).trim() : existing.date;
    const targetCategory = category !== undefined ? String(category).trim() : existing.category;
    const targetDescription = description !== undefined ? String(description).trim() : existing.description;
    const targetColor = color_code ? String(color_code).trim() : existing.color_code;
    if (project_id) {
      const project = await db.execute({ sql: "SELECT id FROM projects WHERE id = ?", args: [project_id] });
      if (!project.rows.length) return res.status(400).json({ error: "The selected project does not exist" });
    }

    await db.execute({
      sql: `UPDATE budget_entries 
            SET type = ?, amount = ?, currency = ?, date = ?, category = ?, status = ?, description = ?, color_code = ?, project_id = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [
        targetType,
        targetAmount,
        targetCurrency,
        targetDate,
        targetCategory,
        targetStatus,
        targetDescription,
        targetColor,
        project_id === undefined ? existing.project_id || null : project_id || null,
        id
      ]
    });

    // Record audit log
    await logBudgetAudit(
      id,
      "update",
      currentUserId,
      userCtx.name,
      userCtx.email,
      {
        before: {
          type: existing.type,
          amount: existing.amount,
          currency: existing.currency,
          date: existing.date,
          category: existing.category,
          status: existing.status,
          description: existing.description,
          color_code: existing.color_code
        },
        after: {
          type: targetType,
          amount: targetAmount,
          currency: targetCurrency,
          date: targetDate,
          category: targetCategory,
          status: targetStatus,
          description: targetDescription,
          color_code: targetColor
        }
      }
    );

    const updatedRes = await db.execute({
      sql: `
        SELECT 
          b.*,
          u.name AS owner_name,
          u.email AS owner_email,
          u.workspace AS owner_workspace,
          u.role AS owner_role
        FROM budget_entries b
        LEFT JOIN users u ON b.owner_admin_id = u.id
        WHERE b.id = ?
      `,
      args: [id]
    });

    res.json({
      success: true,
      entry: {
        ...updatedRes.rows[0],
        isOwner: true
      }
    });
  } catch (error: any) {
    console.error("Failed to update budget entry:", error);
    res.status(500).json({ error: error.message || "Failed to update budget entry" });
  }
});

// =========================================================================
// 6. DELETE /api/admin/budgets/:id - Delete budget entry (Strict Ownership Access)
// =========================================================================
budgetRouter.delete("/:id", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const userCtx = await getUserContext(currentUserId);

    const existingRes = await db.execute({
      sql: "SELECT * FROM budget_entries WHERE id = ?",
      args: [id]
    });

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: "Budget entry not found" });
    }

    const existing: any = existingRes.rows[0];

    // STRICT PERMISSION CHECK:
    // Only the owner can delete their entries.
    // Superadmins cannot delete other admins' entries.
    if (existing.owner_admin_id !== currentUserId) {
      return res.status(403).json({
        error: "Permission denied: Superadmins and other administrators have read-only access and cannot delete another admin's budget entries."
      });
    }

    const dependencies = await db.execute({ sql: "SELECT COUNT(*) AS payment_requests FROM payment_requests WHERE linked_budget_entry_id = ?", args: [id] });
    if (Number((dependencies.rows[0] as any)?.payment_requests || 0)) {
      return res.status(409).json({ error: "This budget entry is linked to payment requests and cannot be deleted." });
    }

    await db.execute({
      sql: "DELETE FROM budget_entries WHERE id = ?",
      args: [id]
    });

    // Record audit log
    await logBudgetAudit(
      id,
      "delete",
      currentUserId,
      userCtx.name,
      userCtx.email,
      {
        deleted_entry: {
          id: existing.id,
          type: existing.type,
          amount: existing.amount,
          currency: existing.currency,
          date: existing.date,
          category: existing.category,
          status: existing.status,
          description: existing.description
        }
      }
    );

    res.json({ success: true, message: "Budget entry deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete budget entry:", error);
    res.status(500).json({ error: error.message || "Failed to delete budget entry" });
  }
});

// =========================================================================
// 7. GET & PUT /api/admin/budgets/settings - Per-admin budget customization
// =========================================================================
budgetRouter.get("/settings", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { admin_id } = req.query;
    const targetAdminId = (admin_id && typeof admin_id === "string") ? admin_id : currentUserId;

    const settingsRes = await db.execute({
      sql: "SELECT * FROM budget_admin_settings WHERE admin_id = ?",
      args: [targetAdminId]
    });

    if (settingsRes.rows.length === 0) {
      // Auto-create default settings
      const id = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO budget_admin_settings (
          id, admin_id, default_color, default_currency, monthly_target_income, monthly_budget_cap, period_status, period_notes, created_at, updated_at
        ) VALUES (?, ?, '#3B82F6', 'USD', 5000, 2000, 'in_progress', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [id, targetAdminId]
      });

      return res.json({
        id,
        admin_id: targetAdminId,
        default_color: "#3B82F6",
        default_currency: "USD",
        monthly_target_income: 5000,
        monthly_budget_cap: 2000,
        period_status: "in_progress",
        period_notes: ""
      });
    }

    res.json(settingsRes.rows[0]);
  } catch (error: any) {
    console.error("Failed to fetch budget settings:", error);
    res.status(500).json({ error: "Failed to fetch budget settings" });
  }
});

budgetRouter.put("/settings", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userCtx = await getUserContext(currentUserId);
    const {
      default_color = "#3B82F6",
      default_currency = "USD",
      monthly_target_income = 0,
      monthly_budget_cap = 0,
      period_status = "in_progress",
      period_notes = ""
    } = req.body;

    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO budget_admin_settings (
        id, admin_id, default_color, default_currency, monthly_target_income, monthly_budget_cap, period_status, period_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(admin_id) DO UPDATE SET
        default_color = excluded.default_color,
        default_currency = excluded.default_currency,
        monthly_target_income = excluded.monthly_target_income,
        monthly_budget_cap = excluded.monthly_budget_cap,
        period_status = excluded.period_status,
        period_notes = excluded.period_notes,
        updated_at = CURRENT_TIMESTAMP`,
      args: [
        id,
        currentUserId,
        default_color,
        default_currency.toUpperCase(),
        Number(monthly_target_income) || 0,
        Number(monthly_budget_cap) || 0,
        period_status,
        period_notes
      ]
    });

    await logBudgetAudit(
      null,
      "settings_update",
      currentUserId,
      userCtx.name,
      userCtx.email,
      {
        default_color,
        default_currency,
        monthly_target_income,
        monthly_budget_cap,
        period_status,
        period_notes
      }
    );

    res.json({
      success: true,
      message: "Budget preferences saved successfully",
      settings: {
        admin_id: currentUserId,
        default_color,
        default_currency,
        monthly_target_income: Number(monthly_target_income) || 0,
        monthly_budget_cap: Number(monthly_budget_cap) || 0,
        period_status,
        period_notes
      }
    });
  } catch (error: any) {
    console.error("Failed to update budget settings:", error);
    res.status(500).json({ error: error.message || "Failed to update budget settings" });
  }
});

// =========================================================================
// 8. GET /api/admin/budgets/audit-logs - Audit trail
// =========================================================================
budgetRouter.get("/audit-logs", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const viewModeHeader = req.headers["x-budget-view-mode"] as string;
    const userCtx = await getUserContext(currentUserId, viewModeHeader);

    const { entry_id, limit = 50 } = req.query;

    let sql = `
      SELECT 
        l.id,
        l.entry_id,
        l.action,
        l.performed_by_id,
        l.performed_by_name,
        l.performed_by_email,
        l.details,
        l.created_at,
        u.role AS performer_role
      FROM budget_audit_logs l
      LEFT JOIN users u ON l.performed_by_id = u.id
      WHERE 1=1
    `;

    const args: any[] = [];

    // If not superadmin, only show own actions or logs for own entries
    if (!userCtx.isSuperAdmin) {
      sql += " AND l.performed_by_id = ?";
      args.push(currentUserId);
    }

    if (entry_id) {
      sql += " AND l.entry_id = ?";
      args.push(entry_id);
    }

    sql += " ORDER BY l.created_at DESC LIMIT ?";
    args.push(Math.min(200, Number(limit) || 50));

    const result = await db.execute({ sql, args });

    const logs = result.rows.map((row: any) => {
      let parsedDetails = {};
      try {
        parsedDetails = typeof row.details === "string" ? JSON.parse(row.details) : row.details;
      } catch (e) {
        parsedDetails = { raw: row.details };
      }

      return {
        id: row.id,
        entryId: row.entry_id,
        action: row.action,
        performedById: row.performed_by_id,
        performedByName: row.performed_by_name || "Admin",
        performedByEmail: row.performed_by_email || "",
        performerRole: row.performer_role || "admin",
        details: parsedDetails,
        createdAt: row.created_at
      };
    });

    res.json(logs);
  } catch (error: any) {
    console.error("Failed to fetch audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

export default budgetRouter;
