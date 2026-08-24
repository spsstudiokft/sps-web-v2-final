import { Router } from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";
import os from "node:os";
import { db } from "../db.js";
import {
  sendPaymentRequestCreatedEmail,
  sendPaymentRequestApprovedEmail,
  sendPaymentRequestDeniedEmail,
  sendPaymentRequestOnHoldEmail,
  sendTransactionalEmail
} from "./services/emailService.js";
import { getAppUrl } from "./appUrl.js";

export const paymentRequestRouter = Router();

// Ensure the payment-request schema exists. Demo requests are deliberately not
// generated: an empty table must remain empty until an administrator adds data.
let tableInitialized = false;
async function ensurePaymentRequestsTable() {
  if (tableInitialized) return;
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS payment_requests (
        id TEXT PRIMARY KEY,
        request_number TEXT UNIQUE NOT NULL,
        requester_id TEXT NOT NULL,
        requester_name TEXT NOT NULL,
        requester_email TEXT NOT NULL,
        requester_avatar TEXT DEFAULT '',
        requester_role TEXT DEFAULT 'admin',
        title TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        category TEXT NOT NULL DEFAULT 'general',
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        link_type TEXT DEFAULT 'none',
        linked_budget_entry_id TEXT DEFAULT NULL,
        linked_invoice_id TEXT DEFAULT NULL,
        project_id TEXT DEFAULT NULL,
        due_date TEXT DEFAULT '',
        payment_method TEXT DEFAULT 'bank_transfer',
        beneficiary_name TEXT DEFAULT '',
        beneficiary_account TEXT DEFAULT '',
        attachments TEXT DEFAULT '[]',
        reviewed_by_id TEXT DEFAULT NULL,
        reviewed_by_name TEXT DEFAULT '',
        reviewed_by_email TEXT DEFAULT '',
        reviewed_at DATETIME DEFAULT NULL,
        review_notes TEXT DEFAULT '',
        action_history TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.execute("CREATE INDEX IF NOT EXISTS idx_payment_requests_requester ON payment_requests(requester_id)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status)");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS payment_request_categories (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const defaultCategories = [
      ["contractor", "Contractor & Freelancer"],
      ["equipment", "Equipment & Gear"],
      ["software", "Software & SaaS"],
      ["travel", "Travel & Fuel"],
      ["office", "Studio & Office"],
      ["marketing", "Marketing & Ads"],
      ["client_expense", "Client Project Expense"],
      ["reimbursement", "Personal Reimbursement"],
      ["general", "General & Other"]
    ];
    for (let index = 0; index < defaultCategories.length; index += 1) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO payment_request_categories (id, name, sort_order)
              VALUES (?, ?, ?)`,
        args: [defaultCategories[index][0], defaultCategories[index][1], index]
      });
    }
    await db.execute(`
      INSERT OR IGNORE INTO payment_request_categories (id, name, sort_order)
      SELECT DISTINCT category, REPLACE(category, '_', ' '), 100
      FROM payment_requests
      WHERE category IS NOT NULL AND TRIM(category) != ''
    `);

    // Remove the legacy demo rows created by older releases. Matching both the
    // fixed request number and title avoids touching genuine requests.
    const legacyDemoRequests = [
      ["PR-2025-001", "DJI Matrice 300 RTK High-Capacity Battery Pack Set"],
      ["PR-2025-002", "Matterport Pro3 Monthly Enterprise Cloud Processing License"],
      ["PR-2025-003", "Luxury Staging Props & Furniture Rental (Unitemized Receipt)"],
      ["PR-2025-004", "Contractor Retainer: Second Camera Operator (Weekend Estate Shoot)"],
    ];
    for (const [requestNumber, title] of legacyDemoRequests) {
      await db.execute({
        sql: "DELETE FROM payment_requests WHERE request_number = ? AND title = ?",
        args: [requestNumber, title],
      });
    }

    // Kept only as historical fixture documentation. Production seeding is
    // permanently disabled so deleted requests cannot reappear.
    const countCheck = await db.execute("SELECT COUNT(*) as count FROM payment_requests");
    const count = Number(countCheck.rows[0]?.count || 0);
    const shouldSeedDemoPaymentRequests = false;

    if (shouldSeedDemoPaymentRequests && count === 0) {
      // Find primary admin/user to assign as requester / reviewer
      const usersRes = await db.execute("SELECT id, name, email, role FROM users LIMIT 2");
      const primaryUser = usersRes.rows[0] as any || {
        id: "usr-admin-1",
        name: "Studio Admin",
        email: "spsstudiokft@gmail.com",
        role: "superadmin"
      };
      const secondUser = usersRes.rows[1] as any || primaryUser;

      const now = Date.now();
      const starterRequests = [
        {
          id: crypto.randomUUID(),
          request_number: "PR-2025-001",
          requester_id: secondUser.id,
          requester_name: secondUser.name || "Peter Photographer",
          requester_email: secondUser.email || "peter@spsstudio.com",
          requester_role: "editor",
          title: "DJI Matrice 300 RTK High-Capacity Battery Pack Set",
          amount: 380,
          currency: "USD",
          category: "equipment",
          description: "Replacement intelligent flight batteries (TB60) for scheduled commercial drone architectural surveys.",
          status: "pending",
          link_type: "none",
          due_date: new Date(now + 3 * 86400000).toISOString().split("T")[0],
          payment_method: "bank_transfer",
          beneficiary_name: "DroneZone Pro Supplies Ltd.",
          beneficiary_account: "US98 1234 5678 9012 3456",
          attachments: JSON.stringify([
            {
              id: "att-1",
              name: "drone_battery_quote_estimate.pdf",
              original_name: "drone_battery_quote_estimate.pdf",
              url: "#",
              size: 412000,
              type: "application/pdf",
              uploaded_at: new Date(now - 1 * 86400000).toISOString()
            }
          ]),
          reviewed_by_id: null,
          reviewed_by_name: "",
          reviewed_by_email: "",
          reviewed_at: null,
          review_notes: "",
          action_history: JSON.stringify([
            {
              id: crypto.randomUUID(),
              action: "created",
              actor_id: secondUser.id,
              actor_name: secondUser.name || "Peter Photographer",
              actor_email: secondUser.email,
              actor_role: "editor",
              timestamp: new Date(now - 1 * 86400000).toISOString(),
              note: "Payment request submitted for Superadmin review"
            }
          ]),
          created_at: new Date(now - 1 * 86400000).toISOString()
        },
        {
          id: crypto.randomUUID(),
          request_number: "PR-2025-002",
          requester_id: primaryUser.id,
          requester_name: primaryUser.name || "Studio Operations",
          requester_email: primaryUser.email,
          requester_role: "admin",
          title: "Matterport Pro3 Monthly Enterprise Cloud Processing License",
          amount: 149,
          currency: "USD",
          category: "software",
          description: "3D Digital Twin model hosting & automated floorplan extraction processing credits.",
          status: "approved",
          link_type: "none",
          due_date: new Date(now - 2 * 86400000).toISOString().split("T")[0],
          payment_method: "credit_card",
          beneficiary_name: "Matterport Cloud Inc.",
          beneficiary_account: "Credit Card (Auto-Pay)",
          attachments: JSON.stringify([
            {
              id: "att-2",
              name: "matterport_license_invoice_inv492.pdf",
              original_name: "matterport_license_invoice_inv492.pdf",
              url: "#",
              size: 195000,
              type: "application/pdf",
              uploaded_at: new Date(now - 3 * 86400000).toISOString()
            }
          ]),
          reviewed_by_id: primaryUser.id,
          reviewed_by_name: primaryUser.name || "Superadmin",
          reviewed_by_email: primaryUser.email,
          reviewed_at: new Date(now - 2 * 86400000).toISOString(),
          review_notes: "Approved. Monthly SaaS license expenditure allocated to software operations.",
          action_history: JSON.stringify([
            {
              id: crypto.randomUUID(),
              action: "created",
              actor_id: primaryUser.id,
              actor_name: primaryUser.name || "Studio Operations",
              actor_email: primaryUser.email,
              actor_role: "admin",
              timestamp: new Date(now - 3 * 86400000).toISOString(),
              note: "Payment request submitted"
            },
            {
              id: crypto.randomUUID(),
              action: "approved",
              actor_id: primaryUser.id,
              actor_name: primaryUser.name || "Superadmin",
              actor_email: primaryUser.email,
              actor_role: "superadmin",
              timestamp: new Date(now - 2 * 86400000).toISOString(),
              note: "Approved by Superadmin"
            }
          ]),
          created_at: new Date(now - 3 * 86400000).toISOString()
        },
        {
          id: crypto.randomUUID(),
          request_number: "PR-2025-003",
          requester_id: secondUser.id,
          requester_name: secondUser.name || "Peter Photographer",
          requester_email: secondUser.email || "peter@spsstudio.com",
          requester_role: "editor",
          title: "Luxury Staging Props & Furniture Rental (Unitemized Receipt)",
          amount: 850,
          currency: "USD",
          category: "reimbursement",
          description: "Physical prop rental fees for luxury penthouse shoot. Awaiting official itemized VAT breakdown from rental company.",
          status: "denied",
          link_type: "none",
          due_date: new Date(now - 4 * 86400000).toISOString().split("T")[0],
          payment_method: "bank_transfer",
          beneficiary_name: "Peter Photographer",
          beneficiary_account: "US12 9988 7766 5544 3322",
          attachments: "[]",
          reviewed_by_id: primaryUser.id,
          reviewed_by_name: primaryUser.name || "Superadmin",
          reviewed_by_email: primaryUser.email,
          reviewed_at: new Date(now - 2 * 86400000).toISOString(),
          review_notes: "Denied: Please attach the formal itemized VAT invoice from the rental company and specify the client job ID before resubmitting.",
          action_history: JSON.stringify([
            {
              id: crypto.randomUUID(),
              action: "created",
              actor_id: secondUser.id,
              actor_name: secondUser.name || "Peter Photographer",
              actor_email: secondUser.email,
              actor_role: "editor",
              timestamp: new Date(now - 4 * 86400000).toISOString(),
              note: "Reimbursement claim submitted"
            },
            {
              id: crypto.randomUUID(),
              action: "denied",
              actor_id: primaryUser.id,
              actor_name: primaryUser.name || "Superadmin",
              actor_email: primaryUser.email,
              actor_role: "superadmin",
              timestamp: new Date(now - 2 * 86400000).toISOString(),
              note: "Denied: Please attach the formal itemized VAT invoice from the rental company and specify the client job ID before resubmitting."
            }
          ]),
          created_at: new Date(now - 4 * 86400000).toISOString()
        },
        {
          id: crypto.randomUUID(),
          request_number: "PR-2025-004",
          requester_id: primaryUser.id,
          requester_name: primaryUser.name || "Studio Operations",
          requester_email: primaryUser.email,
          requester_role: "admin",
          title: "Contractor Retainer: Second Camera Operator (Weekend Estate Shoot)",
          amount: 450,
          currency: "USD",
          category: "contractor",
          description: "Advance retainer for freelance secondary camera operator for multi-day architectural estate coverage.",
          status: "on_hold",
          link_type: "none",
          due_date: new Date(now + 6 * 86400000).toISOString().split("T")[0],
          payment_method: "bank_transfer",
          beneficiary_name: "Apex CineMedia Freelance Services",
          beneficiary_account: "US44 5566 7788 9900 1122",
          attachments: "[]",
          reviewed_by_id: primaryUser.id,
          reviewed_by_name: primaryUser.name || "Superadmin",
          reviewed_by_email: primaryUser.email,
          reviewed_at: new Date(now - 1 * 86400000).toISOString(),
          review_notes: "Placed on hold pending weather forecast verification and final client shoot confirmation.",
          action_history: JSON.stringify([
            {
              id: crypto.randomUUID(),
              action: "created",
              actor_id: primaryUser.id,
              actor_name: primaryUser.name || "Studio Operations",
              actor_email: primaryUser.email,
              actor_role: "admin",
              timestamp: new Date(now - 2 * 86400000).toISOString(),
              note: "Contractor payment request submitted"
            },
            {
              id: crypto.randomUUID(),
              action: "on_hold",
              actor_id: primaryUser.id,
              actor_name: primaryUser.name || "Superadmin",
              actor_email: primaryUser.email,
              actor_role: "superadmin",
              timestamp: new Date(now - 1 * 86400000).toISOString(),
              note: "Placed on hold pending weather forecast verification and final client shoot confirmation."
            }
          ]),
          created_at: new Date(now - 2 * 86400000).toISOString()
        }
      ];

      for (const req of starterRequests) {
        await db.execute({
          sql: `
            INSERT INTO payment_requests (
              id, request_number, requester_id, requester_name, requester_email, requester_avatar, requester_role,
              title, amount, currency, category, description, status, link_type, due_date, payment_method,
              beneficiary_name, beneficiary_account, attachments, reviewed_by_id, reviewed_by_name, reviewed_by_email,
              reviewed_at, review_notes, action_history, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            req.id,
            req.request_number,
            req.requester_id,
            req.requester_name,
            req.requester_email,
            req.requester_role,
            req.title,
            req.amount,
            req.currency,
            req.category,
            req.description,
            req.status,
            req.link_type,
            req.due_date,
            req.payment_method,
            req.beneficiary_name,
            req.beneficiary_account,
            req.attachments,
            req.reviewed_by_id,
            req.reviewed_by_name,
            req.reviewed_by_email,
            req.reviewed_at,
            req.review_notes,
            req.action_history,
            req.created_at,
            req.created_at
          ]
        });
      }
      console.log(`[Payment Requests] Seeded ${starterRequests.length} initial demo payment requests with varied statuses.`);
    }

    tableInitialized = true;
  } catch (err) {
    console.error("[Payment Requests Table Init Error]", err);
  }
}

// Ensure table exists on any router call
paymentRequestRouter.use(async (_req, _res, next) => {
  await ensurePaymentRequestsTable();
  next();
});

// Prepare disk storage for payment request receipt/document uploads
const UPLOAD_DIR = process.env.VERCEL === "1"
  ? path.join(os.tmpdir(), "sps-payment-requests")
  : path.join(process.cwd(), "uploads", "payment-requests");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30 MB
});

// Helper to fetch user context & role
async function getUserContext(userId: string, overrideViewMode?: string) {
  const res = await db.execute({
    sql: "SELECT id, email, name, role FROM users WHERE id = ?",
    args: [userId]
  });

  if (res.rows.length === 0) {
    return {
      id: userId,
      email: "",
      name: "Admin",
      role: "admin",
      avatar_url: "",
      isSuperAdmin: true
    };
  }

  const user = res.rows[0] as any;
  const isSuperAdminRole = user.role === "superadmin" || user.role === "admin";

  return {
    id: user.id as string,
    email: (user.email as string) || "",
    name: (user.name as string) || ((user.email as string)?.split("@")[0] || "User"),
    role: (user.role as string) || "admin",
    avatar_url: "",
    isSuperAdmin: isSuperAdminRole || overrideViewMode === "superadmin" || overrideViewMode === "all"
  };
}

// Helper to log budget audit trail
async function logBudgetAudit(
  entryId: string | null,
  action: string,
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
        userName || "User",
        userEmail || "",
        JSON.stringify(details)
      ]
    });
  } catch (err) {
    console.error("[Payment Request Audit Log Error]", err);
  }
}

// Helper to generate sequential request number: PR-YYYY-XXXX
async function generateRequestNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `PR-${currentYear}-`;

  try {
    const res = await db.execute({
      sql: `SELECT request_number FROM payment_requests WHERE request_number LIKE ? ORDER BY created_at DESC LIMIT 1`,
      args: [`${prefix}%`]
    });

    if (res.rows.length === 0) {
      return `${prefix}0001`;
    }

    const lastNumStr = (res.rows[0].request_number as string).replace(prefix, "");
    const lastNum = parseInt(lastNumStr, 10);
    if (isNaN(lastNum)) {
      const countRes = await db.execute("SELECT COUNT(*) as count FROM payment_requests");
      const nextCount = Number(countRes.rows[0]?.count || 0) + 1;
      return `${prefix}${String(nextCount).padStart(4, "0")}`;
    }

    return `${prefix}${String(lastNum + 1).padStart(4, "0")}`;
  } catch (e) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${randomSuffix}`;
  }
}

function categoryIdFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return slug || `category_${crypto.randomBytes(4).toString("hex")}`;
}

async function paymentRequestCategoryExists(id: string): Promise<boolean> {
  const result = await db.execute({
    sql: "SELECT id FROM payment_request_categories WHERE id = ? LIMIT 1",
    args: [id]
  });
  return result.rows.length > 0;
}

/**
 * Keep the optional payment-request links within one business chain.  Database
 * constraints are intentionally not used for these legacy-compatible columns,
 * so validation must happen on every create and update.
 */
async function validatePaymentRequestBusinessLinks(projectId: unknown, invoiceId: unknown, budgetEntryId: unknown): Promise<string | null> {
  const cleanProjectId = String(projectId || "").trim();
  const cleanInvoiceId = String(invoiceId || "").trim();
  const cleanBudgetEntryId = String(budgetEntryId || "").trim();
  let project: any = null;

  if (cleanProjectId) {
    const result = await db.execute({ sql: "SELECT id, client_id FROM projects WHERE id = ?", args: [cleanProjectId] });
    project = result.rows[0] as any;
    if (!project) return "The selected project does not exist";
  }

  if (cleanInvoiceId) {
    const result = await db.execute({ sql: "SELECT id, client_id, project_id FROM invoices WHERE id = ?", args: [cleanInvoiceId] });
    const invoice = result.rows[0] as any;
    if (!invoice) return "The selected invoice does not exist";
    if (project?.client_id && invoice.client_id && String(project.client_id) !== String(invoice.client_id)) {
      return "The selected invoice belongs to a different client than the project";
    }
    if (project && invoice.project_id && String(project.id) !== String(invoice.project_id)) {
      return "The selected invoice is already linked to a different project";
    }
  }

  if (cleanBudgetEntryId) {
    const result = await db.execute({ sql: "SELECT id, project_id FROM budget_entries WHERE id = ?", args: [cleanBudgetEntryId] });
    const budgetEntry = result.rows[0] as any;
    if (!budgetEntry) return "The selected budget entry does not exist";
    if (project && budgetEntry.project_id && String(project.id) !== String(budgetEntry.project_id)) {
      return "The selected budget entry is already linked to a different project";
    }
  }

  return null;
}

async function requireSuperAdmin(req: any, res: any) {
  const user = await getUserContext(req.user?.id || "");
  if (!user.isSuperAdmin) {
    res.status(403).json({ error: "Only Superadmin can manage payment request categories" });
    return null;
  }
  return user;
}

// Payment request category management
paymentRequestRouter.get("/categories", async (_req: any, res) => {
  try {
    await ensurePaymentRequestsTable();
    const result = await db.execute(
      "SELECT id, name, sort_order, created_at, updated_at FROM payment_request_categories ORDER BY sort_order ASC, name ASC"
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load categories" });
  }
});

paymentRequestRouter.post("/categories", async (req: any, res) => {
  try {
    await ensurePaymentRequestsTable();
    if (!await requireSuperAdmin(req, res)) return;
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Category name is required" });

    let id = categoryIdFromName(name);
    const existingId = await db.execute({ sql: "SELECT id FROM payment_request_categories WHERE id = ?", args: [id] });
    if (existingId.rows.length > 0) id = `${id}_${crypto.randomBytes(3).toString("hex")}`;
    const orderResult = await db.execute("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM payment_request_categories");
    await db.execute({
      sql: "INSERT INTO payment_request_categories (id, name, sort_order) VALUES (?, ?, ?)",
      args: [id, name, Number(orderResult.rows[0]?.next_order || 0)]
    });
    res.status(201).json({ id, name });
  } catch (error: any) {
    const duplicate = String(error.message || "").toLowerCase().includes("unique");
    res.status(duplicate ? 409 : 500).json({ error: duplicate ? "Category name already exists" : "Failed to create category" });
  }
});

paymentRequestRouter.put("/categories/:id", async (req: any, res) => {
  try {
    await ensurePaymentRequestsTable();
    if (!await requireSuperAdmin(req, res)) return;
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Category name is required" });
    const result = await db.execute({
      sql: "UPDATE payment_request_categories SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [name, req.params.id]
    });
    if (!result.rowsAffected) return res.status(404).json({ error: "Category not found" });
    res.json({ success: true, id: req.params.id, name });
  } catch (error: any) {
    const duplicate = String(error.message || "").toLowerCase().includes("unique");
    res.status(duplicate ? 409 : 500).json({ error: duplicate ? "Category name already exists" : "Failed to update category" });
  }
});

paymentRequestRouter.delete("/categories/:id", async (req: any, res) => {
  try {
    await ensurePaymentRequestsTable();
    if (!await requireSuperAdmin(req, res)) return;
    const usage = await db.execute({
      sql: "SELECT COUNT(*) AS count FROM payment_requests WHERE category = ?",
      args: [req.params.id]
    });
    if (Number(usage.rows[0]?.count || 0) > 0) {
      return res.status(409).json({ error: "This category is used by existing payment requests and cannot be deleted" });
    }
    const result = await db.execute({
      sql: "DELETE FROM payment_request_categories WHERE id = ?",
      args: [req.params.id]
    });
    if (!result.rowsAffected) return res.status(404).json({ error: "Category not found" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete category" });
  }
});

// =========================================================================
// 1. POST /api/admin/payment-requests/upload - File attachment upload
// =========================================================================
paymentRequestRouter.post("/upload", upload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const relativeUrl = `/uploads/payment-requests/${req.file.filename}`;
    const attachment = {
      id: crypto.randomUUID(),
      name: req.file.originalname,
      url: relativeUrl,
      size: req.file.size,
      mime_type: req.file.mimetype,
      uploaded_at: new Date().toISOString()
    };

    res.json({ success: true, file: attachment });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Failed to upload file" });
  }
});

// =========================================================================
// 2. GET /api/admin/payment-requests/summary - Summary counts & amounts
// =========================================================================
paymentRequestRouter.get("/summary", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const viewModeHeader = req.headers["x-budget-view-mode"] as string;
    const userCtx = await getUserContext(currentUserId, viewModeHeader);

    let whereClause = "";
    let args: any[] = [];
    const requestedCurrency = typeof req.query.currency === "string"
      ? req.query.currency.trim().toUpperCase()
      : "";

    // If not superadmin, only show self summary
    if (!userCtx.isSuperAdmin) {
      whereClause = "WHERE requester_id = ?";
      args.push(currentUserId);
    }
    if (requestedCurrency) {
      whereClause += whereClause ? " AND UPPER(currency) = ?" : "WHERE UPPER(currency) = ?";
      args.push(requestedCurrency);
    }

    const resAll = await db.execute({
      sql: `SELECT 
              status,
              amount,
              currency,
              created_at
            FROM payment_requests ${whereClause}`,
      args
    });

    let totalCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let deniedCount = 0;
    let onHoldCount = 0;
    let totalPendingAmount = 0;
    let totalApprovedAmount = 0;
    let totalDeniedAmount = 0;

    for (const row of resAll.rows) {
      const status = row.status as string;
      const amt = Number(row.amount) || 0;
      totalCount++;

      if (status === "pending" || status === "resubmitted") {
        pendingCount++;
        totalPendingAmount += amt;
      } else if (status === "approved" || status === "paid") {
        approvedCount++;
        totalApprovedAmount += amt;
      } else if (status === "denied") {
        deniedCount++;
        totalDeniedAmount += amt;
      } else if (status === "on_hold") {
        onHoldCount++;
      }
    }

    res.json({
      totalCount,
      pendingCount,
      approvedCount,
      deniedCount,
      onHoldCount,
      totalPendingAmount,
      totalApprovedAmount,
      totalDeniedAmount
    });
  } catch (err: any) {
    console.error("Summary error:", err);
    res.status(500).json({ error: err.message || "Failed to load summary" });
  }
});

// =========================================================================
// 3. GET /api/admin/payment-requests/links-lookup - For linking to entries
// =========================================================================
paymentRequestRouter.get("/links-lookup", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const viewModeHeader = req.headers["x-budget-view-mode"] as string;
    const userCtx = await getUserContext(currentUserId, viewModeHeader);

    let budgetSql = "SELECT id, description, amount, currency, type, date, status FROM budget_entries";
    let budgetArgs: any[] = [];
    if (!userCtx.isSuperAdmin) {
      budgetSql += " WHERE owner_admin_id = ?";
      budgetArgs.push(currentUserId);
    }
    budgetSql += " ORDER BY date DESC LIMIT 100";

    const budgetRes = await db.execute({ sql: budgetSql, args: budgetArgs });

    let invoiceSql = "SELECT id, invoice_number, client_name, total_amount, currency, issue_date, status FROM invoices";
    let invoiceArgs: any[] = [];
    if (!userCtx.isSuperAdmin) {
      invoiceSql += " WHERE owner_admin_id = ?";
      invoiceArgs.push(currentUserId);
    }
    invoiceSql += " ORDER BY issue_date DESC LIMIT 100";

    const invoiceRes = await db.execute({ sql: invoiceSql, args: invoiceArgs });

    res.json({
      budgetEntries: budgetRes.rows,
      invoices: invoiceRes.rows
    });
  } catch (err: any) {
    console.error("Links lookup error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch links" });
  }
});

// =========================================================================
// 4. GET /api/admin/payment-requests - List requests (with ownership checks)
// =========================================================================
paymentRequestRouter.get("/", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const viewModeHeader = req.headers["x-budget-view-mode"] as string;
    const userCtx = await getUserContext(currentUserId, viewModeHeader);

    const {
      status,
      requester_id,
      category,
      search,
      start_date,
      end_date,
      link_type
    } = req.query;

    const conditions: string[] = [];
    const args: any[] = [];

    // Role-based visibility
    if (!userCtx.isSuperAdmin) {
      // Coworkers see only their own requests
      conditions.push("p.requester_id = ?");
      args.push(currentUserId);
    } else if (requester_id && requester_id !== "all") {
      // Superadmin filtering by specific coworker
      conditions.push("p.requester_id = ?");
      args.push(requester_id);
    }

    if (status && status !== "all") {
      if (status === "pending") {
        conditions.push("(p.status = 'pending' OR p.status = 'resubmitted')");
      } else if (status === "approved") {
        conditions.push("(p.status = 'approved' OR p.status = 'paid')");
      } else if (status === "denied") {
        conditions.push("p.status = 'denied'");
      } else if (status === "on_hold") {
        conditions.push("p.status = 'on_hold'");
      } else {
        conditions.push("p.status = ?");
        args.push(status);
      }
    }

    if (category && category !== "all") {
      conditions.push("p.category = ?");
      args.push(category);
    }

    if (link_type && link_type !== "all") {
      conditions.push("p.link_type = ?");
      args.push(link_type);
    }

    if (start_date) {
      conditions.push("DATE(p.created_at) >= DATE(?)");
      args.push(start_date);
    }

    if (end_date) {
      conditions.push("DATE(p.created_at) <= DATE(?)");
      args.push(end_date);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push("(LOWER(p.request_number) LIKE ? OR LOWER(p.title) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.requester_name) LIKE ? OR LOWER(p.beneficiary_name) LIKE ?)");
      args.push(term, term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT 
        p.*,
        b.description AS linked_budget_description,
        b.amount AS linked_budget_amount,
        b.currency AS linked_budget_currency,
        b.status AS linked_budget_status,
        b.type AS linked_budget_type,
        i.invoice_number AS linked_invoice_number,
        i.client_name AS linked_invoice_client_name,
        i.total_amount AS linked_invoice_total_amount,
        i.currency AS linked_invoice_currency,
        i.status AS linked_invoice_status,
        project.name AS project_name
      FROM payment_requests p
      LEFT JOIN budget_entries b ON p.linked_budget_entry_id = b.id
      LEFT JOIN invoices i ON p.linked_invoice_id = i.id
      LEFT JOIN projects project ON p.project_id = project.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN p.status = 'pending' OR p.status = 'resubmitted' THEN 1
          WHEN p.status = 'on_hold' THEN 2
          WHEN p.status = 'approved' THEN 3
          WHEN p.status = 'denied' THEN 4
          ELSE 5
        END,
        p.created_at DESC
    `;

    const result = await db.execute({ sql, args });

    const requests = result.rows.map((row: any) => {
      let attachments = [];
      let action_history = [];

      try {
        attachments = row.attachments ? JSON.parse(row.attachments) : [];
      } catch (e) {
        attachments = [];
      }

      try {
        action_history = row.action_history ? JSON.parse(row.action_history) : [];
      } catch (e) {
        action_history = [];
      }

      return {
        id: row.id,
        request_number: row.request_number,
        requester_id: row.requester_id,
        requester_name: row.requester_name,
        requester_email: row.requester_email,
        requester_avatar: row.requester_avatar,
        requester_role: row.requester_role,
        title: row.title,
        amount: Number(row.amount) || 0,
        currency: row.currency || "USD",
        category: row.category || "general",
        description: row.description || "",
        status: row.status,
        link_type: row.link_type || "none",
        linked_budget_entry_id: row.linked_budget_entry_id,
        linked_invoice_id: row.linked_invoice_id,
        project_id: row.project_id || null,
        project_name: row.project_name || null,
        due_date: row.due_date || "",
        payment_method: row.payment_method || "bank_transfer",
        beneficiary_name: row.beneficiary_name || "",
        beneficiary_account: row.beneficiary_account || "",
        attachments,
        reviewed_by_id: row.reviewed_by_id,
        reviewed_by_name: row.reviewed_by_name,
        reviewed_by_email: row.reviewed_by_email,
        reviewed_at: row.reviewed_at,
        review_notes: row.review_notes || "",
        action_history,
        created_at: row.created_at,
        updated_at: row.updated_at,
        linked_budget_entry: row.linked_budget_entry_id ? {
          id: row.linked_budget_entry_id,
          description: row.linked_budget_description || "Linked Budget Entry",
          amount: Number(row.linked_budget_amount) || 0,
          currency: row.linked_budget_currency || "USD",
          status: row.linked_budget_status || "planned",
          type: row.linked_budget_type || "outcome"
        } : undefined,
        linked_invoice: row.linked_invoice_id ? {
          id: row.linked_invoice_id,
          invoice_number: row.linked_invoice_number || "Invoice",
          client_name: row.linked_invoice_client_name || "",
          total_amount: Number(row.linked_invoice_total_amount) || 0,
          currency: row.linked_invoice_currency || "USD",
          status: row.linked_invoice_status || "draft"
        } : undefined
      };
    });

    res.json({
      requests,
      isSuperAdmin: userCtx.isSuperAdmin
    });
  } catch (err: any) {
    console.error("List payment requests error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch payment requests" });
  }
});

// =========================================================================
// 5. GET /api/admin/payment-requests/:id - Fetch single request
// =========================================================================
paymentRequestRouter.get("/:id", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const viewModeHeader = req.headers["x-budget-view-mode"] as string;
    const userCtx = await getUserContext(currentUserId, viewModeHeader);

    const result = await db.execute({
      sql: `
        SELECT 
          p.*,
          b.description AS linked_budget_description,
          b.amount AS linked_budget_amount,
          b.currency AS linked_budget_currency,
          b.status AS linked_budget_status,
          b.type AS linked_budget_type,
          i.invoice_number AS linked_invoice_number,
          i.client_name AS linked_invoice_client_name,
          i.total_amount AS linked_invoice_total_amount,
          i.currency AS linked_invoice_currency,
          i.status AS linked_invoice_status
        FROM payment_requests p
        LEFT JOIN budget_entries b ON p.linked_budget_entry_id = b.id
        LEFT JOIN invoices i ON p.linked_invoice_id = i.id
        WHERE p.id = ?
      `,
      args: [id]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Payment request not found" });
    }

    const row = result.rows[0] as any;

    // Check permission
    if (!userCtx.isSuperAdmin && row.requester_id !== currentUserId) {
      return res.status(403).json({ error: "Forbidden: You can only view your own payment requests" });
    }

    let attachments = [];
    let action_history = [];
    try {
      attachments = row.attachments ? JSON.parse(row.attachments) : [];
    } catch (e) {}
    try {
      action_history = row.action_history ? JSON.parse(row.action_history) : [];
    } catch (e) {}

    const request = {
      id: row.id,
      request_number: row.request_number,
      requester_id: row.requester_id,
      requester_name: row.requester_name,
      requester_email: row.requester_email,
      requester_avatar: row.requester_avatar,
      requester_role: row.requester_role,
      title: row.title,
      amount: Number(row.amount) || 0,
      currency: row.currency || "USD",
      category: row.category || "general",
      description: row.description || "",
      status: row.status,
      link_type: row.link_type || "none",
      linked_budget_entry_id: row.linked_budget_entry_id,
      linked_invoice_id: row.linked_invoice_id,
      due_date: row.due_date || "",
      payment_method: row.payment_method || "bank_transfer",
      beneficiary_name: row.beneficiary_name || "",
      beneficiary_account: row.beneficiary_account || "",
      attachments,
      reviewed_by_id: row.reviewed_by_id,
      reviewed_by_name: row.reviewed_by_name,
      reviewed_by_email: row.reviewed_by_email,
      reviewed_at: row.reviewed_at,
      review_notes: row.review_notes || "",
      action_history,
      created_at: row.created_at,
      updated_at: row.updated_at,
      linked_budget_entry: row.linked_budget_entry_id ? {
        id: row.linked_budget_entry_id,
        description: row.linked_budget_description || "Linked Budget Entry",
        amount: Number(row.linked_budget_amount) || 0,
        currency: row.linked_budget_currency || "USD",
        status: row.linked_budget_status || "planned",
        type: row.linked_budget_type || "outcome"
      } : undefined,
      linked_invoice: row.linked_invoice_id ? {
        id: row.linked_invoice_id,
        invoice_number: row.linked_invoice_number || "Invoice",
        client_name: row.linked_invoice_client_name || "",
        total_amount: Number(row.linked_invoice_total_amount) || 0,
        currency: row.linked_invoice_currency || "USD",
        status: row.linked_invoice_status || "draft"
      } : undefined
    };

    res.json(request);
  } catch (err: any) {
    console.error("Get payment request error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch payment request" });
  }
});

// =========================================================================
// 6. POST /api/admin/payment-requests - Create a new payment request
// =========================================================================
paymentRequestRouter.post("/", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userCtx = await getUserContext(currentUserId);
    const {
      title,
      amount,
      currency = "USD",
      category = "general",
      description = "",
      link_type = "none",
      linked_budget_entry_id = null,
      linked_invoice_id = null,
      project_id = null,
      due_date = "",
      payment_method = "bank_transfer",
      beneficiary_name = "",
      beneficiary_account = "",
      attachments = []
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title/Subject is required" });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "A valid positive amount is required" });
    }
    if (!await paymentRequestCategoryExists(String(category).trim())) {
      return res.status(400).json({ error: "Selected payment request category does not exist" });
    }
    const linkValidationError = await validatePaymentRequestBusinessLinks(project_id, linked_invoice_id, linked_budget_entry_id);
    if (linkValidationError) return res.status(400).json({ error: linkValidationError });

    const id = crypto.randomUUID();
    const requestNumber = await generateRequestNumber();

    const initialHistory = [
      {
        id: crypto.randomUUID(),
        action: "created",
        actor_id: userCtx.id,
        actor_name: userCtx.name,
        actor_email: userCtx.email,
        actor_role: userCtx.role,
        timestamp: new Date().toISOString(),
        note: "Payment request created and submitted for Superadmin review"
      }
    ];

    await db.execute({
      sql: `
        INSERT INTO payment_requests (
          id,
          request_number,
          requester_id,
          requester_name,
          requester_email,
          requester_avatar,
          requester_role,
          title,
          amount,
          currency,
          category,
          description,
          status,
          link_type,
          linked_budget_entry_id,
          linked_invoice_id,
          project_id,
          due_date,
          payment_method,
          beneficiary_name,
          beneficiary_account,
          attachments,
          action_history,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      args: [
        id,
        requestNumber,
        userCtx.id,
        userCtx.name,
        userCtx.email,
        userCtx.avatar_url || "",
        userCtx.role,
        title.trim(),
        numAmount,
        (currency || "USD").toUpperCase(),
        category.trim(),
        description.trim(),
        "pending",
        link_type,
        linked_budget_entry_id || null,
        linked_invoice_id || null,
        project_id || null,
        due_date || "",
        payment_method || "bank_transfer",
        beneficiary_name.trim(),
        beneficiary_account.trim(),
        JSON.stringify(attachments || []),
        JSON.stringify(initialHistory)
      ]
    });

    // Log budget audit
    await logBudgetAudit(
      linked_budget_entry_id || null,
      "payment_request_create",
      userCtx.id,
      userCtx.name,
      userCtx.email,
      {
        payment_request_id: id,
        request_number: requestNumber,
        title: title.trim(),
        amount: numAmount,
        currency,
        category
      }
    );

    // Dispatch "Payment request – approval needed" email to Superadmins
    try {
      const origin = getAppUrl(req);
      
      // Look up linked budget/invoice names if available
      let linkedBudgetTitle = "";
      if (linked_budget_entry_id) {
        const bRes = await db.execute({
          sql: "SELECT category, description FROM budget_entries WHERE id = ?",
          args: [linked_budget_entry_id]
        });
        if (bRes.rows.length > 0) {
          linkedBudgetTitle = (bRes.rows[0].description as string) || (bRes.rows[0].category as string) || "";
        }
      }

      let linkedInvoiceNumber = "";
      if (linked_invoice_id) {
        const iRes = await db.execute({
          sql: "SELECT invoice_number FROM invoices WHERE id = ?",
          args: [linked_invoice_id]
        });
        if (iRes.rows.length > 0) {
          linkedInvoiceNumber = (iRes.rows[0].invoice_number as string) || "";
        }
      }

      sendPaymentRequestCreatedEmail({
        id,
        request_number: requestNumber,
        requester_name: userCtx.name,
        requester_email: userCtx.email,
        title: title.trim(),
        amount: numAmount,
        currency: (currency || "USD").toUpperCase(),
        category: category.trim(),
        description: description.trim(),
        status: "pending",
        created_at: new Date().toISOString(),
        due_date: due_date || "",
        beneficiary_name: beneficiary_name.trim(),
        beneficiary_account: beneficiary_account.trim(),
        linked_budget_entry_id: linked_budget_entry_id || null,
        linked_budget_title: linkedBudgetTitle,
        linked_invoice_id: linked_invoice_id || null,
        linked_invoice_number: linkedInvoiceNumber
      }, origin).catch((err) => console.warn("Superadmin payment request notification warning:", err));
    } catch (notifyErr) {
      console.warn("Superadmin notification warning:", notifyErr);
    }

    res.status(201).json({
      success: true,
      message: `Payment request ${requestNumber} submitted successfully`,
      id,
      request_number: requestNumber
    });
  } catch (err: any) {
    console.error("Create payment request error:", err);
    res.status(500).json({ error: err.message || "Failed to create payment request" });
  }
});

// =========================================================================
// 7. PUT /api/admin/payment-requests/:id - Edit or Resubmit
// =========================================================================
paymentRequestRouter.put("/:id", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const viewModeHeader = req.headers["x-budget-view-mode"] as string;
    const userCtx = await getUserContext(currentUserId, viewModeHeader);

    // Find existing request
    const existing = await db.execute({
      sql: "SELECT * FROM payment_requests WHERE id = ?",
      args: [id]
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Payment request not found" });
    }

    const row = existing.rows[0] as any;

    // Check ownership/permissions
    if (!userCtx.isSuperAdmin && row.requester_id !== currentUserId) {
      return res.status(403).json({ error: "Forbidden: You cannot edit other users' requests" });
    }

    const {
      title,
      amount,
      currency = "USD",
      category = "general",
      description = "",
      link_type = "none",
      linked_budget_entry_id = null,
      linked_invoice_id = null,
      project_id = null,
      due_date = "",
      payment_method = "bank_transfer",
      beneficiary_name = "",
      beneficiary_account = "",
      attachments = []
    } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "A valid positive amount is required" });
    }
    if (!await paymentRequestCategoryExists(String(category).trim())) {
      return res.status(400).json({ error: "Selected payment request category does not exist" });
    }
    const linkValidationError = await validatePaymentRequestBusinessLinks(project_id, linked_invoice_id, linked_budget_entry_id);
    if (linkValidationError) return res.status(400).json({ error: linkValidationError });

    let existingHistory = [];
    try {
      existingHistory = row.action_history ? JSON.parse(row.action_history) : [];
    } catch (e) {}

    // Determine new status: if it was denied or on_hold and being resubmitted by coworker, reset to 'pending'
    let newStatus = row.status;
    let actionType = "edited";
    let noteText = "Payment request details updated";

    if (row.status === "denied" || row.status === "on_hold") {
      newStatus = "pending";
      actionType = "resubmitted";
      noteText = `Request updated and resubmitted by ${userCtx.name} for review`;
    }

    existingHistory.push({
      id: crypto.randomUUID(),
      action: actionType,
      actor_id: userCtx.id,
      actor_name: userCtx.name,
      actor_email: userCtx.email,
      actor_role: userCtx.role,
      timestamp: new Date().toISOString(),
      note: noteText
    });

    await db.execute({
      sql: `
        UPDATE payment_requests SET
          title = ?,
          amount = ?,
          currency = ?,
          category = ?,
          description = ?,
          status = ?,
          link_type = ?,
          linked_budget_entry_id = ?,
          linked_invoice_id = ?,
          project_id = ?,
          due_date = ?,
          payment_method = ?,
          beneficiary_name = ?,
          beneficiary_account = ?,
          attachments = ?,
          action_history = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        title ? title.trim() : row.title,
        numAmount,
        (currency || "USD").toUpperCase(),
        category ? category.trim() : row.category,
        description ? description.trim() : row.description,
        newStatus,
        link_type || row.link_type,
        linked_budget_entry_id || null,
        linked_invoice_id || null,
        project_id || null,
        due_date || "",
        payment_method || "bank_transfer",
        beneficiary_name ? beneficiary_name.trim() : row.beneficiary_name,
        beneficiary_account ? beneficiary_account.trim() : row.beneficiary_account,
        JSON.stringify(attachments || []),
        JSON.stringify(existingHistory),
        id
      ]
    });

    await logBudgetAudit(
      linked_budget_entry_id || row.linked_budget_entry_id || null,
      actionType === "resubmitted" ? "payment_request_resubmit" : "payment_request_update",
      userCtx.id,
      userCtx.name,
      userCtx.email,
      {
        payment_request_id: id,
        request_number: row.request_number,
        action: actionType,
        new_status: newStatus,
        amount: numAmount
      }
    );

    // If request was resubmitted, alert superadmins again
    if (actionType === "resubmitted") {
      try {
        const origin = getAppUrl(req);
        sendPaymentRequestCreatedEmail({
          id,
          request_number: row.request_number,
          requester_name: userCtx.name,
          requester_email: userCtx.email,
          title: title ? title.trim() : row.title,
          amount: numAmount,
          currency: (currency || row.currency || "USD").toUpperCase(),
          category: category ? category.trim() : row.category,
          description: description ? description.trim() : row.description,
          status: "pending",
          created_at: row.created_at,
          due_date: due_date || row.due_date || "",
          beneficiary_name: beneficiary_name ? beneficiary_name.trim() : row.beneficiary_name,
          beneficiary_account: beneficiary_account ? beneficiary_account.trim() : row.beneficiary_account
        }, origin).catch((err) => console.warn("Superadmin resubmission notification warning:", err));
      } catch (notifyErr) {
        console.warn("Superadmin resubmission warning:", notifyErr);
      }
    }

    res.json({
      success: true,
      message: actionType === "resubmitted" ? "Payment request resubmitted for review" : "Payment request updated successfully",
      status: newStatus
    });
  } catch (err: any) {
    console.error("Update payment request error:", err);
    res.status(500).json({ error: err.message || "Failed to update payment request" });
  }
});

// =========================================================================
// 8. POST /api/admin/payment-requests/:id/review - Superadmin Approval/Denial
// =========================================================================
paymentRequestRouter.post("/:id/review", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const viewModeHeader = req.headers["x-budget-view-mode"] as string;
    const userCtx = await getUserContext(currentUserId, viewModeHeader);

    // Permission check: Reviewing requires Superadmin
    if (!userCtx.isSuperAdmin && userCtx.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Only Superadmin can approve or deny payment requests" });
    }

    const {
      action, // 'approve' | 'deny' | 'on_hold'
      review_notes = "",
      create_budget_outcome = false
    } = req.body;

    if (!["approve", "deny", "on_hold"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be 'approve', 'deny', or 'on_hold'" });
    }

    // Denial strictly requires review notes / reason
    if (action === "deny" && (!review_notes || !review_notes.trim())) {
      return res.status(400).json({ error: "A detailed reason/comment is required when denying a payment request" });
    }

    // Fetch existing request
    const existing = await db.execute({
      sql: "SELECT * FROM payment_requests WHERE id = ?",
      args: [id]
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Payment request not found" });
    }

    const row = existing.rows[0] as any;

    let targetStatus = "pending";
    if (action === "approve") targetStatus = "approved";
    if (action === "deny") targetStatus = "denied";
    if (action === "on_hold") targetStatus = "on_hold";

    let existingHistory = [];
    try {
      existingHistory = row.action_history ? JSON.parse(row.action_history) : [];
    } catch (e) {}

    existingHistory.push({
      id: crypto.randomUUID(),
      action: targetStatus,
      actor_id: userCtx.id,
      actor_name: userCtx.name,
      actor_email: userCtx.email,
      actor_role: userCtx.role,
      timestamp: new Date().toISOString(),
      note: review_notes.trim() || (action === "approve" ? "Approved by Superadmin" : "Placed on hold")
    });

    let newLinkedBudgetEntryId = row.linked_budget_entry_id;

    // If approving and requested to create or update budget outcome
    if (action === "approve") {
      if (row.linked_budget_entry_id) {
        // Mark existing linked budget entry as confirmed
        await db.execute({
          sql: "UPDATE budget_entries SET status = 'confirmed', project_id = COALESCE(project_id, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          args: [row.project_id || null, row.linked_budget_entry_id]
        });
      } else if (create_budget_outcome) {
        // Create new confirmed outcome budget entry
        const newBudgetId = crypto.randomUUID();
        const todayStr = new Date().toISOString().split("T")[0];
        await db.execute({
          sql: `
            INSERT INTO budget_entries (
              id,
              owner_admin_id,
              type,
              amount,
              currency,
              date,
              category,
              status,
              description,
              color_code,
              project_id,
              created_at,
              updated_at
            ) VALUES (?, ?, 'outcome', ?, ?, ?, ?, 'confirmed', ?, '#EF4444', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `,
          args: [
            newBudgetId,
            row.requester_id,
            Number(row.amount) || 0,
            row.currency || "USD",
            row.due_date || todayStr,
            row.category || "Payment Request",
            `Approved [${row.request_number}]: ${row.title}`,
            row.project_id || null
          ]
        });
        newLinkedBudgetEntryId = newBudgetId;
      }
    }

    // Update payment request
    await db.execute({
      sql: `
        UPDATE payment_requests SET
          status = ?,
          reviewed_by_id = ?,
          reviewed_by_name = ?,
          reviewed_by_email = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          review_notes = ?,
          linked_budget_entry_id = ?,
          action_history = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        targetStatus,
        userCtx.id,
        userCtx.name,
        userCtx.email,
        review_notes.trim(),
        newLinkedBudgetEntryId,
        JSON.stringify(existingHistory),
        id
      ]
    });

    // Log in budget audit
    await logBudgetAudit(
      newLinkedBudgetEntryId || null,
      `payment_request_${action}`,
      userCtx.id,
      userCtx.name,
      userCtx.email,
      {
        payment_request_id: id,
        request_number: row.request_number,
        action,
        review_notes: review_notes.trim(),
        requester: row.requester_name,
        amount: row.amount,
        currency: row.currency
      }
    );

    // Dispatch dedicated template email to requester (Approved / Denied / Hold)
    try {
      if (row.requester_email) {
        const origin = getAppUrl(req);

        // Fetch linked budget/invoice titles if any
        let linkedBudgetTitle = "";
        const targetBudgetId = newLinkedBudgetEntryId || row.linked_budget_entry_id;
        if (targetBudgetId) {
          const bRes = await db.execute({
            sql: "SELECT category, description FROM budget_entries WHERE id = ?",
            args: [targetBudgetId]
          });
          if (bRes.rows.length > 0) {
            linkedBudgetTitle = (bRes.rows[0].description as string) || (bRes.rows[0].category as string) || "";
          }
        }

        let linkedInvoiceNumber = "";
        if (row.linked_invoice_id) {
          const iRes = await db.execute({
            sql: "SELECT invoice_number FROM invoices WHERE id = ?",
            args: [row.linked_invoice_id]
          });
          if (iRes.rows.length > 0) {
            linkedInvoiceNumber = (iRes.rows[0].invoice_number as string) || "";
          }
        }

        const emailData = {
          id: row.id,
          request_number: row.request_number,
          requester_name: row.requester_name,
          requester_email: row.requester_email,
          superadmin_name: userCtx.name,
          title: row.title,
          amount: Number(row.amount) || 0,
          currency: row.currency || "USD",
          category: row.category,
          description: row.description,
          notes: review_notes.trim(),
          review_notes: review_notes.trim(),
          denial_reason: review_notes.trim(),
          hold_reason: review_notes.trim(),
          status: targetStatus,
          created_at: row.created_at,
          decision_at: new Date().toISOString(),
          due_date: row.due_date,
          beneficiary_name: row.beneficiary_name,
          beneficiary_account: row.beneficiary_account,
          linked_budget_entry_id: targetBudgetId || null,
          linked_budget_title: linkedBudgetTitle,
          linked_invoice_id: row.linked_invoice_id || null,
          linked_invoice_number: linkedInvoiceNumber
        };

        if (action === "approve") {
          sendPaymentRequestApprovedEmail(emailData, origin).catch((err) =>
            console.warn("Requester approval email warning:", err)
          );
        } else if (action === "deny") {
          sendPaymentRequestDeniedEmail(emailData, origin).catch((err) =>
            console.warn("Requester denial email warning:", err)
          );
        } else if (action === "hold" || targetStatus === "on_hold") {
          sendPaymentRequestOnHoldEmail(emailData, origin).catch((err) =>
            console.warn("Requester on-hold email warning:", err)
          );
        } else {
          // Generic fallback
          sendTransactionalEmail({
            to: row.requester_email,
            subject: `[Status Update] Payment Request ${row.request_number}: ${row.title}`,
            templateId: "admin_notification",
            templateData: {
              recipientName: row.requester_name,
              headline: `Your Payment Request Status: ${targetStatus}`,
              message: `Superadmin ${userCtx.name} has updated your payment request (${row.request_number}) for ${row.amount} ${row.currency}.`,
              additionalNotes: review_notes.trim() ? `Reviewer Comments:\n${review_notes.trim()}` : undefined,
              actionText: "View in Budget Portal",
              actionUrl: `${origin}/admin/payment-requests?requestId=${encodeURIComponent(row.id)}`
            }
          }).catch(() => {});
        }
      }
    } catch (emailErr) {
      console.warn("Requester notification warning:", emailErr);
    }

    res.json({
      success: true,
      message: `Payment request marked as ${targetStatus}`,
      status: targetStatus,
      reviewed_at: new Date().toISOString(),
      linked_budget_entry_id: newLinkedBudgetEntryId
    });
  } catch (err: any) {
    console.error("Review payment request error:", err);
    res.status(500).json({ error: err.message || "Failed to submit review" });
  }
});

// =========================================================================
// 9. DELETE /api/admin/payment-requests/:id - Delete request
// =========================================================================
paymentRequestRouter.delete("/:id", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const viewModeHeader = req.headers["x-budget-view-mode"] as string;
    const userCtx = await getUserContext(currentUserId, viewModeHeader);

    const existing = await db.execute({
      sql: "SELECT * FROM payment_requests WHERE id = ?",
      args: [id]
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Payment request not found" });
    }

    const row = existing.rows[0] as any;

    // Only owner (if draft/pending) or superadmin can delete
    if (!userCtx.isSuperAdmin && row.requester_id !== currentUserId) {
      return res.status(403).json({ error: "Forbidden: You cannot delete another user's request" });
    }

    await db.execute({
      sql: "DELETE FROM payment_requests WHERE id = ?",
      args: [id]
    });

    await logBudgetAudit(
      row.linked_budget_entry_id || null,
      "payment_request_delete",
      userCtx.id,
      userCtx.name,
      userCtx.email,
      {
        payment_request_id: id,
        request_number: row.request_number,
        title: row.title,
        amount: row.amount
      }
    );

    res.json({ success: true, message: `Payment request ${row.request_number} deleted` });
  } catch (err: any) {
    console.error("Delete payment request error:", err);
    res.status(500).json({ error: err.message || "Failed to delete payment request" });
  }
});
