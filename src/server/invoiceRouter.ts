import { Router } from "express";
import crypto from "crypto";
import { db } from "../db.js";
import { 
  sendTransactionalEmail, 
  getEmailSenderConfig 
} from "./services/emailService.js";
import { processInvoicePaymentReferral } from "./services/referralService.js";
import { getAppUrl } from "./appUrl.js";

export const invoiceRouter = Router();
export const publicInvoiceRouter = Router();

function normalizeEmail(email: unknown): string {
  return String(email || "").trim().toLowerCase();
}

async function findPortalClientIdByEmail(email: string): Promise<string | null> {
  const result = await db.execute({
    sql: `SELECT id FROM users
          WHERE role = 'client' AND LOWER(TRIM(email)) = ?
          LIMIT 1`,
    args: [email]
  });

  return result.rows.length > 0 ? String(result.rows[0].id) : null;
}

async function validateInvoiceBusinessLinks(clientId: string | null, projectId: unknown, propertyId: unknown) {
  const cleanProjectId = String(projectId || "").trim();
  const cleanPropertyId = String(propertyId || "").trim();
  let project: any = null;
  if (cleanProjectId) {
    const result = await db.execute({ sql: "SELECT id, client_id, property_id FROM projects WHERE id = ?", args: [cleanProjectId] });
    project = result.rows[0] as any;
    if (!project) throw new Error("The selected project does not exist");
    if (!clientId || String(project.client_id || "") !== clientId) throw new Error("The selected project does not belong to the invoice client");
  }
  if (cleanPropertyId) {
    const result = await db.execute({ sql: "SELECT id, client_id FROM client_properties WHERE id = ?", args: [cleanPropertyId] });
    const property = result.rows[0] as any;
    if (!property) throw new Error("The selected property does not exist");
    if (!clientId || String(property.client_id || "") !== clientId) throw new Error("The selected property does not belong to the invoice client");
    if (project?.property_id && String(project.property_id) !== cleanPropertyId) throw new Error("The selected property conflicts with the project property");
  }
}

// Helper to format currency for email and display
function formatCurrency(amount: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
}

// Generate styled HTML table for line items in emails
function escapeEmailHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateLineItemsEmailHtml(items: any[], currency: string = "USD"): string {
  if (!items || items.length === 0) return "";
  
  let rowsHtml = items.map((item) => {
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.unit_price || 0);
    const lineTotal = Number(item.total || (qty * unitPrice));
    return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-size: 13px; line-height: 1.45; color: #1e293b; font-weight: 500; overflow-wrap: anywhere;">${escapeEmailHtml(item.description || "Service item")}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #64748b; text-align: center;">${qty}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #64748b; text-align: right;">${formatCurrency(unitPrice, currency)}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">${formatCurrency(lineTotal, currency)}</td>
      </tr>
    `;
  }).join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: collapse; table-layout: auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 6px;">
      <thead>
        <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">
          <th style="padding: 8px 12px;">Description</th>
          <th style="padding: 8px 12px; text-align: center;">Qty</th>
          <th style="padding: 8px 12px; text-align: right;">Rate</th>
          <th style="padding: 8px 12px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

// =========================================================================
// 1. GET /api/admin/invoices/next-number - Compute next sequential invoice #
// =========================================================================
invoiceRouter.get("/next-number", async (req: any, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}-`;

    const result = await db.execute({
      sql: `SELECT invoice_number FROM invoices 
            WHERE invoice_number LIKE ? 
            ORDER BY invoice_number DESC LIMIT 1`,
      args: [`${prefix}%`]
    });

    let nextSeq = 1;
    if (result.rows.length > 0) {
      const lastNum = String(result.rows[0].invoice_number);
      const match = lastNum.match(/INV-\d{4}-(\d+)/);
      if (match && match[1]) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }

    const nextInvoiceNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    res.json({ nextInvoiceNumber, sequence: nextSeq });
  } catch (error: any) {
    console.error("Error generating next invoice number:", error);
    const fallback = `INV-${new Date().getFullYear()}-0001`;
    res.json({ nextInvoiceNumber: fallback, sequence: 1 });
  }
});

// =========================================================================
// 2. GET /api/admin/invoices/clients-lookup - Quick lookup of CRM records/users
// =========================================================================
invoiceRouter.get("/clients-lookup", async (req: any, res) => {
  try {
    // 1. CRM customers and leads
    const crmRes = await db.execute(`
      SELECT id, name, email, phone, property_address, type, status 
      FROM crm_records 
      WHERE email IS NOT NULL AND TRIM(email) != ''
      ORDER BY name ASC
    `);

    // 2. Portal user clients
    const userRes = await db.execute(`
      SELECT id, name, email, phone, property_address, role 
      FROM users 
      WHERE role = 'client' AND email IS NOT NULL AND TRIM(email) != ''
      ORDER BY name ASC
    `);

    const clientsMap = new Map<string, any>();

    crmRes.rows.forEach((r: any) => {
      if (r.email) {
        clientsMap.set(r.email.toLowerCase().trim(), {
          id: r.id,
          name: r.name || r.email.split("@")[0],
          email: r.email.trim(),
          phone: r.phone || "",
          property_address: r.property_address || "",
          type: r.type || "customer",
          source: "crm"
        });
      }
    });

    userRes.rows.forEach((r: any) => {
      if (r.email) {
        const key = r.email.toLowerCase().trim();
        if (!clientsMap.has(key)) {
          clientsMap.set(key, {
            id: r.id,
            name: r.name || r.email.split("@")[0],
            email: r.email.trim(),
            phone: r.phone || "",
            property_address: r.property_address || "",
            type: "client",
            source: "user"
          });
        }
      }
    });

    res.json(Array.from(clientsMap.values()));
  } catch (error: any) {
    console.error("Error looking up clients for invoices:", error);
    res.status(500).json({ error: "Failed to load clients lookup" });
  }
});

// =========================================================================
// 3. GET /api/admin/invoices/summary - Invoicing summary metrics
// =========================================================================
invoiceRouter.get("/summary", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    const { admin_id, client_email, start_date, end_date, currency } = req.query;

    let sql = `SELECT * FROM invoices WHERE archived_at IS NULL`;
    const args: any[] = [];

    // Optional admin filter
    if (admin_id && admin_id !== "all") {
      sql += ` AND owner_admin_id = ?`;
      args.push(admin_id);
    }
    if (client_email && typeof client_email === "string") {
      sql += ` AND LOWER(TRIM(client_email)) = ?`;
      args.push(normalizeEmail(client_email));
    }
    if (start_date) {
      sql += ` AND issue_date >= ?`;
      args.push(start_date);
    }
    if (end_date) {
      sql += ` AND issue_date <= ?`;
      args.push(end_date);
    }
    if (currency && typeof currency === "string") {
      sql += ` AND UPPER(currency) = ?`;
      args.push(currency.trim().toUpperCase());
    }

    const result = await db.execute({ sql, args });
    const invoices = result.rows as any[];

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;

    let draftCount = 0;
    let sentCount = 0;
    let viewedCount = 0;
    let paidCount = 0;
    let overdueCount = 0;
    let cancelledCount = 0;

    const todayStr = new Date().toISOString().split("T")[0];
    const clientMap = new Map<string, { name: string; email: string; invoiced: number; paid: number; count: number }>();

    for (const inv of invoices) {
      const total = Number(inv.total_amount || 0);
      const paid = Number(inv.amount_paid || 0);
      const due = Math.max(0, total - paid);
      let status = inv.status;

      // Auto-check overdue if not paid or cancelled
      if (status !== "paid" && status !== "cancelled" && inv.due_date && inv.due_date < todayStr) {
        status = "overdue";
      }

      if (status !== "cancelled") {
        totalInvoiced += total;
        totalPaid += paid;
        totalOutstanding += due;

        if (status === "overdue") {
          totalOverdue += due;
        }
      }

      switch (status) {
        case "draft": draftCount++; break;
        case "sent": sentCount++; break;
        case "viewed": viewedCount++; break;
        case "paid": paidCount++; break;
        case "overdue": overdueCount++; break;
        case "cancelled": cancelledCount++; break;
      }

      // Group by client
      const cEmail = (inv.client_email || "").toLowerCase().trim();
      if (cEmail && status !== "cancelled") {
        const existing = clientMap.get(cEmail) || {
          name: inv.client_name || cEmail,
          email: cEmail,
          invoiced: 0,
          paid: 0,
          count: 0
        };
        existing.invoiced += total;
        existing.paid += paid;
        existing.count += 1;
        clientMap.set(cEmail, existing);
      }
    }

    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    const clientBreakdown = Array.from(clientMap.values()).map(c => ({
      client_name: c.name,
      client_email: c.email,
      total_invoiced: c.invoiced,
      total_paid: c.paid,
      total_due: Math.max(0, c.invoiced - c.paid),
      invoice_count: c.count
    })).sort((a, b) => b.total_invoiced - a.total_invoiced);

    res.json({
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      totalOverdue,
      collectionRate: Math.round(collectionRate * 10) / 10,
      totalCount: invoices.length,
      draftCount,
      sentCount,
      viewedCount,
      paidCount,
      overdueCount,
      cancelledCount,
      clientBreakdown
    });
  } catch (error: any) {
    console.error("Error computing invoice summary:", error);
    res.status(500).json({ error: "Failed to compute invoice summary" });
  }
});

// =========================================================================
// 4. GET /api/admin/invoices - List invoices with filters
// =========================================================================
invoiceRouter.get("/", async (req: any, res) => {
  try {
    const {
      status,
      search,
      client_id,
      client_email,
      start_date,
      end_date,
      admin_id,
      sort_by = "created_at",
      sort_order = "desc"
    } = req.query;

    let sql = `
      SELECT 
        i.*,
        COUNT(*) OVER() AS total_count,
        u.name AS owner_name,
        u.email AS owner_email,
        b.description AS linked_budget_description,
        b.amount AS linked_budget_amount,
        b.status AS linked_budget_status
      FROM invoices i
      LEFT JOIN users u ON i.owner_admin_id = u.id
      LEFT JOIN budget_entries b ON i.budget_entry_id = b.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (status === "archived") {
      sql += ` AND i.archived_at IS NOT NULL`;
    } else {
      sql += ` AND i.archived_at IS NULL`;
    }

    if (admin_id && admin_id !== "all") {
      sql += ` AND i.owner_admin_id = ?`;
      args.push(admin_id);
    }

    if (status && status !== "all" && status !== "archived") {
      if (status === "overdue") {
        const todayStr = new Date().toISOString().split("T")[0];
        sql += ` AND i.status != 'paid' AND i.status != 'cancelled' AND i.due_date < ?`;
        args.push(todayStr);
      } else {
        sql += ` AND i.status = ?`;
        args.push(status);
      }
    }

    if (client_id) {
      sql += ` AND (i.client_id = ? OR i.client_email = ?)`;
      args.push(client_id, client_id);
    }

    if (client_email) {
      sql += ` AND LOWER(i.client_email) = LOWER(?)`;
      args.push(client_email.trim());
    }

    if (start_date) {
      sql += ` AND i.issue_date >= ?`;
      args.push(start_date);
    }

    if (end_date) {
      sql += ` AND i.issue_date <= ?`;
      args.push(end_date);
    }

    if (search) {
      const term = `%${search.trim()}%`;
      sql += ` AND (i.invoice_number LIKE ? OR i.client_name LIKE ? OR i.client_email LIKE ? OR i.property_address LIKE ? OR i.notes LIKE ?)`;
      args.push(term, term, term, term, term);
    }

    // Sorting
    const validSortCols = ["created_at", "issue_date", "due_date", "total_amount", "invoice_number", "status"];
    const sortCol = validSortCols.includes(String(sort_by)) ? String(sort_by) : "created_at";
    const direction = String(sort_order).toUpperCase() === "ASC" ? "ASC" : "DESC";

    sql += ` ORDER BY i.${sortCol} ${direction}`;

    const paginationEnabled = req.query.page !== undefined || req.query.page_size !== undefined;
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(10, Number.parseInt(String(req.query.page_size || "25"), 10) || 25));
    if (paginationEnabled) { sql += " LIMIT ? OFFSET ?"; args.push(pageSize, (page - 1) * pageSize); }

    const result = await db.execute({ sql, args });
    const todayStr = new Date().toISOString().split("T")[0];

    // Compute dynamic overdue status & fetch line items count
    const invoices = await Promise.all(result.rows.map(async (inv: any) => {
      let resolvedStatus = inv.status;
      if (resolvedStatus !== "paid" && resolvedStatus !== "cancelled" && inv.due_date && inv.due_date < todayStr) {
        resolvedStatus = "overdue";
      }

      // Quick fetch line items
      const itemsRes = await db.execute({
        sql: "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC, created_at ASC",
        args: [inv.id]
      });

      return {
        ...inv,
        status: resolvedStatus,
        items: itemsRes.rows,
        linked_budget_entry: inv.budget_entry_id ? {
          id: inv.budget_entry_id,
          description: inv.linked_budget_description,
          amount: inv.linked_budget_amount,
          status: inv.linked_budget_status
        } : null
      };
    }));

    if (!paginationEnabled) return res.json(invoices.map(({ total_count: _total, ...invoice }: any) => invoice));
    const total = Number(result.rows[0]?.total_count || 0);
    res.json({ items: invoices.map(({ total_count: _total, ...invoice }: any) => invoice), pagination: { page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)) } });
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// =========================================================================
// 5. GET /api/admin/invoices/:id - Detailed invoice view with items & payments
// =========================================================================
invoiceRouter.get("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;

    const invoiceRes = await db.execute({
      sql: `
        SELECT 
          i.*,
          u.name AS owner_name,
          u.email AS owner_email,
          b.description AS linked_budget_description,
          b.amount AS linked_budget_amount,
          b.status AS linked_budget_status
        FROM invoices i
        LEFT JOIN users u ON i.owner_admin_id = u.id
        LEFT JOIN budget_entries b ON i.budget_entry_id = b.id
        WHERE i.id = ?
      `,
      args: [id]
    });

    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const inv = invoiceRes.rows[0] as any;
    const todayStr = new Date().toISOString().split("T")[0];
    if (inv.status !== "paid" && inv.status !== "cancelled" && inv.due_date && inv.due_date < todayStr) {
      inv.status = "overdue";
    }

    // Line items
    const itemsRes = await db.execute({
      sql: "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC, created_at ASC",
      args: [id]
    });

    // Payments
    const paymentsRes = await db.execute({
      sql: "SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date DESC, created_at DESC",
      args: [id]
    });

    res.json({
      ...inv,
      items: itemsRes.rows,
      payments: paymentsRes.rows,
      linked_budget_entry: inv.budget_entry_id ? {
        id: inv.budget_entry_id,
        description: inv.linked_budget_description,
        amount: inv.linked_budget_amount,
        status: inv.linked_budget_status
      } : null
    });
  } catch (error: any) {
    console.error("Error fetching invoice details:", error);
    res.status(500).json({ error: "Failed to fetch invoice details" });
  }
});

// =========================================================================
// 6. POST /api/admin/invoices - Create new invoice
// =========================================================================
invoiceRouter.post("/", async (req: any, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      invoice_number,
      budget_entry_id,
      create_budget_entry,
      client_name,
      client_email,
      client_phone = "",
      client_address = "",
      property_address = "",
      project_id = null,
      property_id = null,
      issue_date,
      due_date,
      currency = "USD",
      status = "draft",
      tax_rate = 0,
      discount_amount = 0,
      payment_terms = "Payment due within 14 days of invoice date.",
      notes = "",
      payment_method_instructions = "",
      payment_link = "",
      items = []
    } = req.body;

    if (!client_name || !client_email) {
      return res.status(400).json({ error: "Client name and email are required" });
    }

    const normalizedClientEmail = normalizeEmail(client_email);
    const portalClientId = await findPortalClientIdByEmail(normalizedClientEmail);
    await validateInvoiceBusinessLinks(portalClientId, project_id, property_id);

    const id = crypto.randomUUID();
    const accessToken = crypto.randomBytes(24).toString("hex");

    // Auto-generate invoice number if not supplied
    let resolvedNumber = (invoice_number || "").trim();
    if (!resolvedNumber) {
      const currentYear = new Date().getFullYear();
      const prefix = `INV-${currentYear}-`;
      const numRes = await db.execute({
        sql: "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1",
        args: [`${prefix}%`]
      });
      let seq = 1;
      if (numRes.rows.length > 0) {
        const lastNum = String(numRes.rows[0].invoice_number);
        const match = lastNum.match(/INV-\d{4}-(\d+)/);
        if (match && match[1]) seq = parseInt(match[1], 10) + 1;
      }
      resolvedNumber = `${prefix}${String(seq).padStart(4, "0")}`;
    }

    // Compute line items totals
    let subtotal = 0;
    const cleanItems: any[] = [];

    if (Array.isArray(items) && items.length > 0) {
      items.forEach((item: any, idx: number) => {
        const qty = Math.max(0.01, Number(item.quantity || 1));
        const price = Math.max(0, Number(item.unit_price || 0));
        const lineTotal = Number(item.total || (qty * price));
        subtotal += lineTotal;
        cleanItems.push({
          id: crypto.randomUUID(),
          invoice_id: id,
          description: String(item.description || "Photography & Visual Production Service").trim(),
          quantity: qty,
          unit_price: price,
          tax_rate: Number(item.tax_rate || 0),
          total: lineTotal,
          sort_order: idx
        });
      });
    } else {
      // Default single line item if none provided
      const defaultAmount = Number(req.body.total_amount || req.body.amount || 0);
      subtotal = defaultAmount;
      cleanItems.push({
        id: crypto.randomUUID(),
        invoice_id: id,
        description: notes || "Real Estate Media & Photography Services",
        quantity: 1,
        unit_price: defaultAmount,
        tax_rate: 0,
        total: defaultAmount,
        sort_order: 0
      });
    }

    const cleanTaxRate = Number(tax_rate || 0);
    const taxAmount = (subtotal * cleanTaxRate) / 100;
    const cleanDiscount = Math.max(0, Number(discount_amount || 0));
    const totalAmount = Math.max(0, subtotal + taxAmount - cleanDiscount);

    const now = new Date().toISOString();
    const resolvedIssueDate = issue_date || now.split("T")[0];
    const resolvedDueDate = due_date || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

    let linkedBudgetId = budget_entry_id || null;

    // Optional: Auto-create a linked budget income entry if user requested it
    if (create_budget_entry && !linkedBudgetId) {
      const budgetEntryId = crypto.randomUUID();
      await db.execute({
        sql: `
          INSERT INTO budget_entries (
            id, owner_admin_id, type, amount, currency, date, category, status, description, color_code, created_at, updated_at
          ) VALUES (?, ?, 'income', ?, ?, ?, 'Client Invoices', ?, ?, '#10B981', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        args: [
          budgetEntryId,
          currentUserId,
          totalAmount,
          currency,
          resolvedIssueDate,
          status === "paid" ? "confirmed" : "planned",
          `Invoice ${resolvedNumber} - ${client_name}${property_address ? ` (${property_address})` : ""}`
        ]
      });
      linkedBudgetId = budgetEntryId;
    }

    // Insert Invoice
    await db.execute({
      sql: `
        INSERT INTO invoices (
          id, invoice_number, budget_entry_id, owner_admin_id, client_id, project_id, property_id,
          client_name, client_email, client_phone, client_address, property_address,
          issue_date, due_date, currency, status,
          subtotal, tax_rate, tax_amount, discount_amount, total_amount, amount_paid,
          payment_terms, notes, payment_method_instructions, payment_link,
          access_token, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      args: [
        id,
        resolvedNumber,
        linkedBudgetId,
        currentUserId,
        portalClientId,
        project_id || null,
        property_id || null,
        client_name.trim(),
        normalizedClientEmail,
        client_phone.trim(),
        client_address.trim(),
        property_address.trim(),
        resolvedIssueDate,
        resolvedDueDate,
        currency,
        status,
        subtotal,
        cleanTaxRate,
        taxAmount,
        cleanDiscount,
        totalAmount,
        payment_terms,
        notes,
        payment_method_instructions,
        payment_link,
        accessToken
      ]
    });

    // Insert Line items
    for (const itm of cleanItems) {
      await db.execute({
        sql: `
          INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, tax_rate, total, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          itm.id,
          itm.invoice_id,
          itm.description,
          itm.quantity,
          itm.unit_price,
          itm.tax_rate,
          itm.total,
          itm.sort_order
        ]
      });
    }

    res.status(201).json({
      success: true,
      id,
      invoice_number: resolvedNumber,
      access_token: accessToken,
      total_amount: totalAmount,
      budget_entry_id: linkedBudgetId
    });
  } catch (error: any) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: error.message || "Failed to create invoice" });
  }
});

// =========================================================================
// 7. PUT /api/admin/invoices/:id - Update invoice
// =========================================================================
invoiceRouter.put("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const existingRes = await db.execute({
      sql: "SELECT * FROM invoices WHERE id = ?",
      args: [id]
    });

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const {
      invoice_number,
      client_name,
      client_email,
      client_phone = "",
      client_address = "",
      property_address = "",
      project_id = null,
      property_id = null,
      issue_date,
      due_date,
      currency = "USD",
      status,
      tax_rate = 0,
      discount_amount = 0,
      payment_terms,
      notes = "",
      payment_method_instructions = "",
      payment_link = "",
      items = []
    } = req.body;

    if (!client_name || !client_email) {
      return res.status(400).json({ error: "Client name and email are required" });
    }

    const normalizedClientEmail = normalizeEmail(client_email);
    const portalClientId = await findPortalClientIdByEmail(normalizedClientEmail);
    await validateInvoiceBusinessLinks(portalClientId, project_id, property_id);

    // Compute line items
    let subtotal = 0;
    const cleanItems: any[] = [];

    if (Array.isArray(items) && items.length > 0) {
      items.forEach((item: any, idx: number) => {
        const qty = Math.max(0.01, Number(item.quantity || 1));
        const price = Math.max(0, Number(item.unit_price || 0));
        const lineTotal = Number(item.total || (qty * price));
        subtotal += lineTotal;
        cleanItems.push({
          id: item.id || crypto.randomUUID(),
          invoice_id: id,
          description: String(item.description || "Photography & Visual Production Service").trim(),
          quantity: qty,
          unit_price: price,
          tax_rate: Number(item.tax_rate || 0),
          total: lineTotal,
          sort_order: idx
        });
      });
    }

    const cleanTaxRate = Number(tax_rate || 0);
    const taxAmount = (subtotal * cleanTaxRate) / 100;
    const cleanDiscount = Math.max(0, Number(discount_amount || 0));
    const totalAmount = Math.max(0, subtotal + taxAmount - cleanDiscount);

    await db.execute({
      sql: `
        UPDATE invoices SET
          invoice_number = ?,
          client_id = ?,
          client_name = ?,
          client_email = ?,
          client_phone = ?,
          client_address = ?,
          property_address = ?,
          project_id = ?,
          property_id = ?,
          issue_date = ?,
          due_date = ?,
          currency = ?,
          status = COALESCE(?, status),
          subtotal = ?,
          tax_rate = ?,
          tax_amount = ?,
          discount_amount = ?,
          total_amount = ?,
          payment_terms = ?,
          notes = ?,
          payment_method_instructions = ?,
          payment_link = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        invoice_number || existingRes.rows[0].invoice_number,
        portalClientId,
        client_name.trim(),
        normalizedClientEmail,
        client_phone.trim(),
        client_address.trim(),
        property_address.trim(),
        project_id || null,
        property_id || null,
        issue_date || existingRes.rows[0].issue_date,
        due_date || existingRes.rows[0].due_date,
        currency,
        status || null,
        subtotal,
        cleanTaxRate,
        taxAmount,
        cleanDiscount,
        totalAmount,
        payment_terms || existingRes.rows[0].payment_terms,
        notes,
        payment_method_instructions,
        payment_link,
        id
      ]
    });

    // Replace line items
    if (cleanItems.length > 0) {
      await db.execute({
        sql: "DELETE FROM invoice_items WHERE invoice_id = ?",
        args: [id]
      });

      for (const itm of cleanItems) {
        await db.execute({
          sql: `
            INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, tax_rate, total, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            itm.id,
            itm.invoice_id,
            itm.description,
            itm.quantity,
            itm.unit_price,
            itm.tax_rate,
            itm.total,
            itm.sort_order
          ]
        });
      }
    }

    res.json({ success: true, id, total_amount: totalAmount });
  } catch (error: any) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ error: error.message || "Failed to update invoice" });
  }
});

// =========================================================================
// 8. DELETE /api/admin/invoices/:id - Delete invoice
// =========================================================================
invoiceRouter.delete("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;

    const dependencies = await db.execute({ sql: "SELECT (SELECT COUNT(*) FROM invoice_payments WHERE invoice_id = ?) AS payments, (SELECT COUNT(*) FROM payment_requests WHERE linked_invoice_id = ?) AS payment_requests", args: [id, id] });
    const dependency = dependencies.rows[0] as any;
    if (Number(dependency?.payments || 0) || Number(dependency?.payment_requests || 0)) {
      return res.status(409).json({ error: "This invoice has payments or payment requests and cannot be deleted. Archive it instead." });
    }

    await db.execute({ sql: "DELETE FROM invoice_items WHERE invoice_id = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM invoice_payments WHERE invoice_id = ?", args: [id] });
    const result = await db.execute({ sql: "DELETE FROM invoices WHERE id = ?", args: [id] });

    res.json({ success: true, deleted: result.rowsAffected > 0 });
  } catch (error: any) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

// =========================================================================
// 9. POST /api/admin/invoices/:id/send - Send invoice payment request email
// =========================================================================
invoiceRouter.post("/:id/send", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { custom_message, payment_link_override } = req.body;

    const invoiceRes = await db.execute({
      sql: `SELECT * FROM invoices WHERE id = ?`,
      args: [id]
    });

    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const inv = invoiceRes.rows[0] as any;

    if (inv.status === "paid" || inv.archived_at) {
      return res.status(409).json({ error: inv.archived_at
        ? "Archived invoices cannot receive payment requests"
        : "Paid invoices cannot receive payment requests" });
    }

    const itemsRes = await db.execute({
      sql: "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC",
      args: [id]
    });

    const config = await getEmailSenderConfig();
    const origin = getAppUrl(req);
    const invoiceUrl = `${origin}/invoice/${inv.id}?token=${inv.access_token}`;
    const paymentLink = payment_link_override || inv.payment_link || invoiceUrl;

    const amountDue = Math.max(0, Number(inv.total_amount) - Number(inv.amount_paid));
    const formattedAmountDue = formatCurrency(amountDue, inv.currency);
    const formattedTotalAmount = formatCurrency(Number(inv.total_amount), inv.currency);
    const lineItemsHtml = generateLineItemsEmailHtml(itemsRes.rows, inv.currency);

    const emailResult = await sendTransactionalEmail({
      to: inv.client_email,
      templateId: "invoice_payment_request",
      subject: `Invoice ${inv.invoice_number} from ${config.studioName} · ${formattedAmountDue} due ${inv.due_date}`,
      templateData: {
        client_name: inv.client_name,
        invoice_number: inv.invoice_number,
        amount_due: formattedAmountDue,
        total_amount: formattedTotalAmount,
        currency: inv.currency,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        property_address: inv.property_address,
        payment_link: paymentLink,
        action_url: invoiceUrl,
        action_text: "Review & Pay Invoice",
        line_items_html: lineItemsHtml,
        payment_method_instructions: inv.payment_method_instructions,
        payment_terms: inv.payment_terms,
        notes: custom_message || inv.notes,
        studio_name: config.studioName
      }
    });

    // Update status to 'sent' if draft
    const newStatus = inv.status === "draft" ? "sent" : inv.status;
    await db.execute({
      sql: `UPDATE invoices SET status = ?, sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [newStatus, id]
    });

    res.json({
      success: true,
      emailResult,
      invoice_url: invoiceUrl,
      status: newStatus
    });
  } catch (error: any) {
    console.error("Error sending invoice email:", error);
    res.status(500).json({ error: error.message || "Failed to send invoice email" });
  }
});

// =========================================================================
// 10. POST /api/admin/invoices/:id/send-reminder - Send payment reminder
// =========================================================================
invoiceRouter.post("/:id/send-reminder", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { custom_message } = req.body;

    const invoiceRes = await db.execute({
      sql: "SELECT * FROM invoices WHERE id = ?",
      args: [id]
    });

    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const inv = invoiceRes.rows[0] as any;
    if (inv.status === "paid" || inv.archived_at) {
      return res.status(409).json({ error: inv.archived_at
        ? "Archived invoices cannot receive payment reminders"
        : "Paid invoices cannot receive payment reminders" });
    }
    const config = await getEmailSenderConfig();
    const origin = getAppUrl(req);
    const invoiceUrl = `${origin}/invoice/${inv.id}?token=${inv.access_token}`;
    const amountDue = Math.max(0, Number(inv.total_amount) - Number(inv.amount_paid));
    const formattedAmountDue = formatCurrency(amountDue, inv.currency);

    const emailResult = await sendTransactionalEmail({
      to: inv.client_email,
      templateId: "invoice_payment_request",
      subject: `Friendly Payment Reminder: Invoice ${inv.invoice_number} (${formattedAmountDue}) · ${config.studioName}`,
      templateData: {
        client_name: inv.client_name,
        invoice_number: inv.invoice_number,
        amount_due: formattedAmountDue,
        total_amount: formatCurrency(Number(inv.total_amount), inv.currency),
        currency: inv.currency,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        property_address: inv.property_address,
        payment_link: inv.payment_link || invoiceUrl,
        action_url: invoiceUrl,
        action_text: "Pay Outstanding Balance",
        payment_method_instructions: inv.payment_method_instructions,
        payment_terms: inv.payment_terms,
        notes: custom_message || `This is a friendly reminder regarding outstanding invoice #${inv.invoice_number} due on ${inv.due_date}.`,
        studio_name: config.studioName
      }
    });

    await db.execute({
      sql: `UPDATE invoices SET last_reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [id]
    });

    res.json({ success: true, emailResult });
  } catch (error: any) {
    console.error("Error sending payment reminder:", error);
    res.status(500).json({ error: error.message || "Failed to send reminder" });
  }
});

// =========================================================================
// 11. POST /api/admin/invoices/:id/payments - Record a payment
// =========================================================================
invoiceRouter.post("/:id/payments", async (req: any, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const currentUserName = req.user?.name || "Administrator";

    const {
      amount,
      payment_date,
      payment_method = "bank_transfer",
      transaction_reference = "",
      notes = "",
      send_receipt = true
    } = req.body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: "Valid payment amount is required" });
    }

    const invoiceRes = await db.execute({
      sql: "SELECT * FROM invoices WHERE id = ?",
      args: [id]
    });

    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const inv = invoiceRes.rows[0] as any;
    const paymentId = crypto.randomUUID();
    const resolvedDate = payment_date || new Date().toISOString().split("T")[0];

    // Insert payment record
    await db.execute({
      sql: `
        INSERT INTO invoice_payments (
          id, invoice_id, amount, payment_date, payment_method,
          transaction_reference, notes, recorded_by_id, recorded_by_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      args: [
        paymentId,
        id,
        paymentAmount,
        resolvedDate,
        payment_method,
        transaction_reference,
        notes,
        currentUserId || null,
        currentUserName
      ]
    });

    // Recompute total amount paid
    const totalPaidRes = await db.execute({
      sql: "SELECT SUM(amount) as total_paid FROM invoice_payments WHERE invoice_id = ?",
      args: [id]
    });

    const newAmountPaid = Number(totalPaidRes.rows[0]?.total_paid || 0);
    const isFullyPaid = newAmountPaid >= Number(inv.total_amount);
    const newStatus = isFullyPaid ? "paid" : inv.status;
    const paidAtTimestamp = isFullyPaid ? new Date().toISOString() : inv.paid_at;

    await db.execute({
      sql: `
        UPDATE invoices SET
          amount_paid = ?,
          status = ?,
          paid_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [newAmountPaid, newStatus, paidAtTimestamp, id]
    });

    // If linked to a budget entry, update the budget entry status to confirmed when fully paid
    if (inv.budget_entry_id && isFullyPaid) {
      try {
        await db.execute({
          sql: "UPDATE budget_entries SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          args: [inv.budget_entry_id]
        });
      } catch (budgetSyncErr) {
        console.warn("Failed to sync linked budget entry:", budgetSyncErr);
      }
    }

    // Process Referral Program conversion check for referee
    try {
      const appOrigin = getAppUrl(req);
      await processInvoicePaymentReferral({
        invoiceId: id,
        clientUserId: inv.client_id || undefined,
        clientEmail: inv.client_email,
        amountPaid: paymentAmount,
        appOrigin
      });
    } catch (refPaymentErr) {
      console.warn("Failed to process referral conversion on payment:", refPaymentErr);
    }

    // Optionally send payment receipt email
    if (send_receipt && inv.client_email) {
      try {
        const config = await getEmailSenderConfig();
        const origin = getAppUrl(req);
        const invoiceUrl = `${origin}/invoice/${inv.id}?token=${inv.access_token}`;
        const balanceDue = Math.max(0, Number(inv.total_amount) - newAmountPaid);

        await sendTransactionalEmail({
          to: inv.client_email,
          templateId: "invoice_payment_receipt",
          subject: `Payment Received: Invoice ${inv.invoice_number} (${formatCurrency(paymentAmount, inv.currency)}) · ${config.studioName}`,
          templateData: {
            client_name: inv.client_name,
            invoice_number: inv.invoice_number,
            amount_paid: formatCurrency(paymentAmount, inv.currency),
            currency: inv.currency,
            payment_date: resolvedDate,
            payment_status: isFullyPaid ? "Paid in Full" : "Partial Payment Recorded",
            balance_due: formatCurrency(balanceDue, inv.currency),
            transaction_reference: transaction_reference,
            action_url: invoiceUrl,
            studio_name: config.studioName
          }
        });
      } catch (receiptErr) {
        console.warn("Failed to dispatch payment receipt email:", receiptErr);
      }
    }

    res.json({
      success: true,
      payment_id: paymentId,
      amount_paid: newAmountPaid,
      status: newStatus,
      is_fully_paid: isFullyPaid
    });
  } catch (error: any) {
    console.error("Error recording payment:", error);
    res.status(500).json({ error: error.message || "Failed to record payment" });
  }
});

// =========================================================================
// 12. PATCH /api/admin/invoices/:id/status - Change status manually
// =========================================================================
invoiceRouter.patch("/:id/status", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["draft", "sent", "viewed", "paid", "overdue", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid invoice status" });
    }

    const paidAt = status === "paid" ? new Date().toISOString() : null;

    await db.execute({
      sql: `UPDATE invoices SET status = ?, paid_at = COALESCE(?, paid_at), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [status, paidAt, id]
    });

    res.json({ success: true, id, status });
  } catch (error: any) {
    console.error("Error updating invoice status:", error);
    res.status(500).json({ error: "Failed to update invoice status" });
  }
});

invoiceRouter.patch("/:id/archive", async (req: any, res) => {
  try {
    const { id } = req.params;
    const invoiceRes = await db.execute({
      sql: "SELECT status, archived_at FROM invoices WHERE id = ?",
      args: [id]
    });

    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const invoice = invoiceRes.rows[0] as any;
    if (invoice.status !== "paid") {
      return res.status(409).json({ error: "Only paid invoices can be archived" });
    }
    if (invoice.archived_at) {
      return res.status(409).json({ error: "Invoice is already archived" });
    }

    await db.execute({
      sql: "UPDATE invoices SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [id]
    });

    res.json({ success: true, id, archived: true });
  } catch (error: any) {
    console.error("Error archiving invoice:", error);
    res.status(500).json({ error: "Failed to archive invoice" });
  }
});

// =========================================================================
// 13. POST /api/admin/invoices/from-budget/:budgetId - Pre-fill from budget
// =========================================================================
invoiceRouter.post("/from-budget/:budgetId", async (req: any, res) => {
  try {
    const { budgetId } = req.params;

    const budgetRes = await db.execute({
      sql: `SELECT * FROM budget_entries WHERE id = ?`,
      args: [budgetId]
    });

    if (budgetRes.rows.length === 0) {
      return res.status(404).json({ error: "Budget entry not found" });
    }

    const entry = budgetRes.rows[0] as any;
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}-`;

    const numRes = await db.execute({
      sql: "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1",
      args: [`${prefix}%`]
    });

    let seq = 1;
    if (numRes.rows.length > 0) {
      const lastNum = String(numRes.rows[0].invoice_number);
      const match = lastNum.match(/INV-\d{4}-(\d+)/);
      if (match && match[1]) seq = parseInt(match[1], 10) + 1;
    }
    const nextInvoiceNumber = `${prefix}${String(seq).padStart(4, "0")}`;

    // Extract potential client name or description
    const desc = entry.description || "Real Estate Media Production";
    const amount = Number(entry.amount || 0);

    const draftData = {
      invoice_number: nextInvoiceNumber,
      budget_entry_id: entry.id,
      amount: amount,
      currency: entry.currency || "USD",
      issue_date: entry.date || new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      notes: desc,
      items: [
        {
          description: desc,
          quantity: 1,
          unit_price: amount,
          tax_rate: 0,
          total: amount
        }
      ]
    };

    res.json(draftData);
  } catch (error: any) {
    console.error("Error pre-filling invoice from budget:", error);
    res.status(500).json({ error: "Failed to generate draft from budget entry" });
  }
});

// =========================================================================
// PUBLIC INVOICE ROUTES: /api/public/invoices/:id
// =========================================================================
publicInvoiceRouter.get("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    const invoiceRes = await db.execute({
      sql: `SELECT * FROM invoices WHERE id = ?`,
      args: [id]
    });

    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const inv = invoiceRes.rows[0] as any;

    // Verify token if supplied or if protected
    if (token && inv.access_token && token !== inv.access_token) {
      return res.status(403).json({ error: "Invalid access token for this invoice" });
    }

    // If status is 'sent', transition to 'viewed' upon first client opening
    if (inv.status === "sent") {
      try {
        await db.execute({
          sql: `UPDATE invoices SET status = 'viewed', viewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          args: [id]
        });
        inv.status = "viewed";
      } catch (vErr) {
        console.warn("Viewed timestamp update warning:", vErr);
      }
    }

    // Line items
    const itemsRes = await db.execute({
      sql: "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC, created_at ASC",
      args: [id]
    });

    // Payments
    const paymentsRes = await db.execute({
      sql: "SELECT amount, payment_date, payment_method, transaction_reference, created_at FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date DESC",
      args: [id]
    });

    // Sender/Studio Info
    const config = await getEmailSenderConfig();

    res.json({
      invoice: {
        ...inv,
        items: itemsRes.rows,
        payments: paymentsRes.rows
      },
      studio: {
        name: config.studioName,
        fromEmail: config.fromEmail,
        replyToEmail: config.replyToEmail,
        footerText: config.footerText
      }
    });
  } catch (error: any) {
    console.error("Error fetching public invoice:", error);
    res.status(500).json({ error: "Failed to load invoice" });
  }
});

// Client notifies intent or submits transfer reference on public invoice page
publicInvoiceRouter.post("/:id/notify-intent", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { reference, notes, payer_name } = req.body;

    const invoiceRes = await db.execute({
      sql: "SELECT * FROM invoices WHERE id = ?",
      args: [id]
    });

    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const inv = invoiceRes.rows[0] as any;
    console.log(`[Payment Intent Notification] Invoice: ${inv.invoice_number}, Payer: ${payer_name}, Ref: ${reference}, Notes: ${notes}`);

    res.json({ success: true, message: "Payment notification received. Thank you!" });
  } catch (error: any) {
    console.error("Error logging payment intent:", error);
    res.status(500).json({ error: "Failed to notify payment" });
  }
});
