import { createClient } from "@libsql/client";
import crypto from "node:crypto";
import { createPortfolioSlug } from "./server/portfolioSlug.js";

// In production environments like Vercel or Cloud Run, the filesystem is often read-only except for /tmp.
const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
const defaultDbUrl = isProd ? "file:/tmp/local.db" : "file:local.db";

let dbInstance: ReturnType<typeof createClient> | null = null;

function sanitizeString(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim().replace(/^["']|["']$/g, "").trim();
  if (
    !trimmed ||
    trimmed === "*" ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === "[REDACTED]" ||
    trimmed.startsWith("<") ||
    trimmed.includes("your-")
  ) {
    return undefined;
  }
  return trimmed;
}

export const getDb = () => {
  if (!dbInstance) {
    const rawUrls = [
      process.env.TURSO_DATABASE_URL,
      process.env.DATABASE_URL,
      process.env.LIBSQL_URL,
      process.env.TURSO_URL,
      process.env.DB_URL,
    ];

    let url: string | undefined = undefined;
    for (const candidate of rawUrls) {
      const sanitized = sanitizeString(candidate);
      if (sanitized) {
        // Skip postgres if turso is what we support
        if (sanitized.startsWith("postgres:") || sanitized.startsWith("postgresql:")) {
          console.warn(
            `[DB Warning] Connection string is PostgreSQL (${sanitized.split("@")[1] || "remote"}), but this application uses LibSQL / Turso.`
          );
          continue;
        }
        url = sanitized;
        break;
      }
    }

    if (!url) {
      url = defaultDbUrl;
    }

    // Auto-normalize file path if no protocol is present
    if (url && !url.includes("://") && !url.startsWith("file:")) {
      url = `file:${url}`;
    }

    // Resolve Auth Token - prioritize valid JWT tokens (e.g. starts with eyJ or length > 20)
    const rawTokens = [
      process.env.TURSO_AUTH_TOKEN,
      process.env.DATABASE_AUTH_TOKEN,
      process.env.LIBSQL_AUTH_TOKEN,
      process.env.TURSO_TOKEN,
      process.env.DB_AUTH_TOKEN,
      process.env.DB_PASSWORD,
      process.env.DB_PASS,
    ];

    const validTokens: string[] = [];
    for (const candidate of rawTokens) {
      const sanitized = sanitizeString(candidate);
      if (sanitized && sanitized.length > 5) {
        validTokens.push(sanitized);
      }
    }

    // Pick token: prefer JWTs starting with eyJ, otherwise first valid token
    const jwtToken = validTokens.find((t) => t.startsWith("eyJ") || t.split(".").length === 3);
    const authToken = jwtToken || validTokens[0] || undefined;

    // Validate URL scheme to prevent unhelpful crashes
    if (
      url &&
      !url.startsWith("file:") &&
      !url.startsWith("libsql:") &&
      !url.startsWith("http:") &&
      !url.startsWith("https:") &&
      !url.startsWith("ws:") &&
      !url.startsWith("wss:")
    ) {
      console.warn(`[DB Warning] Unsupported URL scheme: ${url}. Defaulting to SQLite.`);
      url = defaultDbUrl;
    }

    try {
      dbInstance = createClient({
        url,
        authToken: url.startsWith("file:") ? undefined : authToken,
      });
      console.log(`[DB] Connected to database: ${url.startsWith("file:") ? url : url.replace(/\/\/.*@/, "//***@")}`);
    } catch (clientErr: any) {
      console.error("[DB Error] Failed to create database client:", clientErr);
      throw clientErr;
    }
  }
  return dbInstance;
};

// Wrapper for execute
export const db = {
  execute: async (stmt: any) => {
    return getDb().execute(stmt);
  },
  batch: async (statements: any[], mode: "read" | "write" = "write") => {
    return getDb().batch(statements, mode);
  }
};

export const setupDatabase = async () => {
  const client = getDb();

  // Lightweight migrations must run before the initialized-database fast path.
  try {
    await client.execute("ALTER TABLE invoices ADD COLUMN archived_at DATETIME DEFAULT NULL");
  } catch {
    // Table/column may not exist yet or the column already exists.
  }

  // Core business-object chain migrations.  These deliberately use nullable
  // references for legacy records, while new writes validate the relationship
  // in the relevant router.  Financial records are never cascade-deleted.
  try { await client.execute("ALTER TABLE projects ADD COLUMN property_id TEXT DEFAULT NULL"); } catch {}
  try { await client.execute("ALTER TABLE invoices ADD COLUMN project_id TEXT DEFAULT NULL"); } catch {}
  try { await client.execute("ALTER TABLE invoices ADD COLUMN property_id TEXT DEFAULT NULL"); } catch {}
  try { await client.execute("ALTER TABLE budget_entries ADD COLUMN project_id TEXT DEFAULT NULL"); } catch {}
  try { await client.execute("ALTER TABLE payment_requests ADD COLUMN project_id TEXT DEFAULT NULL"); } catch {}
  // Customer 360 fields were introduced after the v8 initialization marker,
  // so existing local and Turso databases must receive them on every startup.
  try { await client.execute("ALTER TABLE crm_records ADD COLUMN is_vip INTEGER DEFAULT 0"); } catch {}
  try { await client.execute("ALTER TABLE crm_records ADD COLUMN custom_price_list TEXT DEFAULT ''"); } catch {}
  try {
    await client.batch([
      "CREATE INDEX IF NOT EXISTS idx_projects_client_property ON projects(client_id, property_id)",
      "CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id)",
      "CREATE INDEX IF NOT EXISTS idx_invoices_property ON invoices(property_id)",
      "CREATE INDEX IF NOT EXISTS idx_budget_entries_project ON budget_entries(project_id)",
      "CREATE INDEX IF NOT EXISTS idx_payment_requests_project ON payment_requests(project_id)",
    ], "write");
  } catch {}

  // Keep legacy single-value client fields compatible while making the
  // normalized tables the canonical multi-value source.  Each insert is
  // idempotent, so this also repairs records imported from older releases.
  try {
    await client.batch([
      `INSERT INTO client_properties (id, client_id, property_name, address, metadata, sort_order)
       SELECT lower(hex(randomblob(16))), u.id, 'Primary property', TRIM(u.property_address), '{"source":"legacy_users"}', 0
       FROM users u
       WHERE u.role = 'client' AND u.property_address IS NOT NULL AND TRIM(u.property_address) <> ''
         AND NOT EXISTS (SELECT 1 FROM client_properties cp WHERE cp.client_id = u.id AND TRIM(cp.address) = TRIM(u.property_address))`,
      `INSERT INTO client_links (id, client_id, label, url, metadata, sort_order)
       SELECT lower(hex(randomblob(16))), u.id, 'Primary listing link', TRIM(u.advertisement_link), '{"source":"legacy_users"}', 0
       FROM users u
       WHERE u.role = 'client' AND u.advertisement_link IS NOT NULL AND TRIM(u.advertisement_link) <> ''
         AND NOT EXISTS (SELECT 1 FROM client_links cl WHERE cl.client_id = u.id AND TRIM(cl.url) = TRIM(u.advertisement_link))`,
      `INSERT INTO client_properties (id, client_id, property_name, address, metadata, sort_order)
       SELECT lower(hex(randomblob(16))), c.id, COALESCE(NULLIF(TRIM(c.name), ''), 'Primary property'), TRIM(c.property_address), '{"source":"legacy_crm"}', 0
       FROM crm_records c
       WHERE c.property_address IS NOT NULL AND TRIM(c.property_address) <> ''
         AND NOT EXISTS (SELECT 1 FROM client_properties cp WHERE cp.client_id = c.id AND TRIM(cp.address) = TRIM(c.property_address))`,
      `INSERT INTO client_links (id, client_id, label, url, metadata, sort_order)
       SELECT lower(hex(randomblob(16))), c.id, 'Primary listing link', TRIM(c.advertisement_link), '{"source":"legacy_crm"}', 0
       FROM crm_records c
       WHERE c.advertisement_link IS NOT NULL AND TRIM(c.advertisement_link) <> ''
         AND NOT EXISTS (SELECT 1 FROM client_links cl WHERE cl.client_id = c.id AND TRIM(cl.url) = TRIM(c.advertisement_link))`,
      `CREATE TABLE IF NOT EXISTS business_relation_audits (
        id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
        issue_type TEXT NOT NULL, details TEXT DEFAULT '', resolved_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_business_relation_audit_open ON business_relation_audits(entity_type, entity_id, issue_type)",
    ], "write");
  } catch (error) {
    // Some tables are created later on a brand-new database; the next startup
    // runs the same safe reconciliation after initialization.
    console.warn("Business relation legacy reconciliation notice:", error);
  }

  // Review automation was added after the v8 initialization marker, so it must
  // be created before the initialized-database fast path.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS google_review_campaigns (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, recipient_email TEXT NOT NULL,
      recipient_name TEXT, project_name TEXT NOT NULL, tracking_token TEXT UNIQUE NOT NULL,
      destination_url TEXT NOT NULL, app_origin TEXT NOT NULL, gallery_ready_sent_at DATETIME NOT NULL,
      next_sequence INTEGER DEFAULT 0, next_send_at DATETIME NOT NULL, last_sent_at DATETIME,
      clicked_at DATETIME, completed_at DATETIME, status TEXT DEFAULT 'pending',
      processing_started_at DATETIME, last_error TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_google_review_campaign_due ON google_review_campaigns(status, next_send_at)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_google_review_campaign_project ON google_review_campaigns(project_id)`);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS project_milestones (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT DEFAULT '',
      status TEXT DEFAULT 'pending', due_date DATETIME, completed_at DATETIME, sort_order INTEGER DEFAULT 0,
      client_notified_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones(project_id, sort_order)`);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS project_updates (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, milestone_id TEXT, title TEXT NOT NULL,
      message TEXT NOT NULL, status_label TEXT DEFAULT '', sent_to_client INTEGER DEFAULT 0,
      sent_at DATETIME, email_status TEXT, email_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id, created_at)`);

  // Property listings are managed in admin while the public real-estate page
  // remains locked. Keep this table in the lightweight phase so existing
  // production databases receive it without replaying the full initializer.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      property_name TEXT NOT NULL,
      address TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      archived_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS property_clients (
      property_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      relation_type TEXT DEFAULT 'owner',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (property_id, client_id)
    )
  `);
  await client.execute("CREATE INDEX IF NOT EXISTS idx_properties_archived ON properties(archived_at, updated_at DESC)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_property_clients_client ON property_clients(client_id, property_id)");
  await client.execute(`CREATE TABLE IF NOT EXISTS property_activity (
    id TEXT PRIMARY KEY, property_id TEXT NOT NULL, activity_type TEXT NOT NULL, title TEXT NOT NULL,
    details TEXT DEFAULT '{}', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  try { await client.batch([
    "ALTER TABLE properties ADD COLUMN city TEXT DEFAULT ''", "ALTER TABLE properties ADD COLUMN postal_code TEXT DEFAULT ''",
    "ALTER TABLE properties ADD COLUMN latitude REAL DEFAULT NULL", "ALTER TABLE properties ADD COLUMN longitude REAL DEFAULT NULL",
    "ALTER TABLE properties ADD COLUMN property_type TEXT DEFAULT ''", "ALTER TABLE properties ADD COLUMN floor_area_sqm REAL DEFAULT NULL",
    "ALTER TABLE properties ADD COLUMN rooms REAL DEFAULT NULL", "ALTER TABLE properties ADD COLUMN lot_size_sqm REAL DEFAULT NULL",
    "ALTER TABLE properties ADD COLUMN construction_year INTEGER DEFAULT NULL", "ALTER TABLE properties ADD COLUMN condition_status TEXT DEFAULT ''",
    "ALTER TABLE properties ADD COLUMN primary_client_id TEXT DEFAULT NULL", "ALTER TABLE properties ADD COLUMN agency_name TEXT DEFAULT ''",
    "ALTER TABLE properties ADD COLUMN agent_name TEXT DEFAULT ''"
  ], "write"); } catch {}
  await client.execute("CREATE INDEX IF NOT EXISTS idx_property_activity_property ON property_activity(property_id, created_at DESC)");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS property_listings (
      id TEXT PRIMARY KEY,
      property_id TEXT DEFAULT NULL,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      price_huf INTEGER DEFAULT 0,
      price_text TEXT DEFAULT '',
      floor_area_sqm REAL DEFAULT 0,
      rooms REAL DEFAULT 0,
      bathrooms REAL DEFAULT 0,
      description TEXT DEFAULT '',
      listing_status TEXT DEFAULT 'active',
      listing_type TEXT DEFAULT 'sale',
      construction_year INTEGER,
      floor_count INTEGER,
      central_heating INTEGER DEFAULT 0,
      garden_access INTEGER DEFAULT 0,
      floor_plan_available INTEGER DEFAULT 0,
      balcony INTEGER DEFAULT 0,
      full_comfort INTEGER DEFAULT 0,
      air_conditioned INTEGER DEFAULT 0,
      new_construction INTEGER DEFAULT 0,
      orientation TEXT DEFAULT '',
      view_type TEXT DEFAULT '',
      bathroom_toilet TEXT DEFAULT '',
      heating_types TEXT DEFAULT '[]',
      image_urls TEXT DEFAULT '[]',
      is_enabled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute("CREATE INDEX IF NOT EXISTS idx_property_listings_admin ON property_listings(updated_at DESC)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_property_listings_public ON property_listings(is_enabled, listing_status, created_at DESC)");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS property_listing_accounts (
      id TEXT PRIMARY KEY,
      portal_user_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      migrated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_property_listing_accounts_user ON property_listing_accounts(portal_user_id)");
  try {
    const listingSchema = await client.execute("PRAGMA table_info(property_listings)");
    const listingColumns = new Set(listingSchema.rows.map((column: any) => String(column.name)));
    const listingMigrations = [
      ["property_id", "ALTER TABLE property_listings ADD COLUMN property_id TEXT DEFAULT NULL"],
      ["owner_account_id", "ALTER TABLE property_listings ADD COLUMN owner_account_id TEXT DEFAULT NULL"],
      ["created_by_user_id", "ALTER TABLE property_listings ADD COLUMN created_by_user_id TEXT DEFAULT NULL"],
      ["created_by_role", "ALTER TABLE property_listings ADD COLUMN created_by_role TEXT DEFAULT 'admin'"],
    ].filter(([name]) => !listingColumns.has(name)).map(([, sql]) => sql);
    if (listingMigrations.length) await client.batch(listingMigrations, "write");
  } catch {}
  // Migrate the prior client-scoped property records without changing their
  // identifiers, so current project and invoice links remain valid while the
  // new Property model becomes the canonical source for listings.
  try {
    await client.batch([
      `INSERT OR IGNORE INTO properties (id, property_name, address, metadata, created_at, updated_at)
       SELECT id, COALESCE(NULLIF(TRIM(property_name), ''), 'Property'), address, metadata, created_at, updated_at FROM client_properties`,
      `INSERT OR IGNORE INTO property_clients (property_id, client_id, relation_type)
       SELECT id, client_id, 'owner' FROM client_properties`,
      `INSERT OR IGNORE INTO properties (id, property_name, address, metadata)
       SELECT id, title, location, '{"source":"legacy_listing"}' FROM property_listings WHERE property_id IS NULL`,
      `UPDATE property_listings SET property_id = id WHERE property_id IS NULL`
    ], "write");
  } catch (error) {
    console.warn("[DB Setup] Property Core migration notice:", error);
  }
  await client.execute("CREATE INDEX IF NOT EXISTS idx_property_listings_owner ON property_listings(owner_account_id, updated_at DESC)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_property_listings_property ON property_listings(property_id, updated_at DESC)");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS gallery_download_access (
      project_id TEXT PRIMARY KEY, pin_hash TEXT NOT NULL,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP, pin_email_sent_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { await client.execute("ALTER TABLE gallery_download_access ADD COLUMN pin_email_sent_at DATETIME"); } catch {}

  await client.execute(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT DEFAULT '', color TEXT DEFAULT '#3B82F6',
      is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { await client.execute("ALTER TABLE teams ADD COLUMN description TEXT DEFAULT ''"); } catch {}
  try { await client.execute("ALTER TABLE teams ADD COLUMN color TEXT DEFAULT '#3B82F6'"); } catch {}
  try { await client.execute("ALTER TABLE teams ADD COLUMN is_active INTEGER DEFAULT 1"); } catch {}
  try { await client.execute("ALTER TABLE teams ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch {}
  try { await client.execute("ALTER TABLE teams ADD COLUMN updated_at DATETIME DEFAULT NULL"); } catch {}
  try { await client.execute("ALTER TABLE users ADD COLUMN team_id TEXT DEFAULT NULL"); } catch {}
  try { await client.execute("ALTER TABLE invitations ADD COLUMN team_id TEXT DEFAULT NULL"); } catch {}
  // Teams are fully user-managed. Do not seed or restore a default team here:
  // setupDatabase runs at every server start, so a seed would recreate a team
  // an administrator had intentionally deleted.
  try { await client.execute("ALTER TABLE users ADD COLUMN admin_role TEXT DEFAULT NULL"); } catch {}
  try { await client.execute("ALTER TABLE users ADD COLUMN admin_password_hash TEXT DEFAULT NULL"); } catch {}
  try { await client.execute("ALTER TABLE users ADD COLUMN admin_is_active INTEGER DEFAULT NULL"); } catch {}
  try { await client.execute("ALTER TABLE users ADD COLUMN admin_workspace TEXT DEFAULT NULL"); } catch {}
  try { await client.execute("ALTER TABLE users ADD COLUMN admin_team_id TEXT DEFAULT NULL"); } catch {}
  try { await client.execute("ALTER TABLE email_templates ADD COLUMN token_defaults TEXT NOT NULL DEFAULT '{}'"); } catch {}

  // Client account settings were introduced after the v8 initialization
  // marker. These migrations must run before the initialized-database fast
  // path or existing Turso databases will make /client/settings/profile fail.
  try {
    const usersSchema = await client.execute("PRAGMA table_info(users)");
    const existingUserColumns = new Set(usersSchema.rows.map((column: any) => String(column.name)));
    const missingUserColumns = [
      ["name", "ALTER TABLE users ADD COLUMN name TEXT DEFAULT ''"],
      ["updated_at", "ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT NULL"],
      ["password_auth_enabled", "ALTER TABLE users ADD COLUMN password_auth_enabled INTEGER DEFAULT 1"],
      ["password_updated_at", "ALTER TABLE users ADD COLUMN password_updated_at DATETIME DEFAULT NULL"],
      ["tfa_enabled", "ALTER TABLE users ADD COLUMN tfa_enabled INTEGER DEFAULT 0"],
      ["last_login_at", "ALTER TABLE users ADD COLUMN last_login_at DATETIME DEFAULT NULL"],
      ["last_activity_at", "ALTER TABLE users ADD COLUMN last_activity_at DATETIME DEFAULT NULL"],
    ].filter(([name]) => !existingUserColumns.has(name)).map(([, sql]) => sql);
    if (missingUserColumns.length > 0) await client.batch(missingUserColumns, "write");
  } catch {
    // A brand-new database creates the complete users table below.
  }

  // Portfolio gallery pages were added after the v8 marker. Run this compact
  // migration before the fast path so existing production galleries receive
  // stable public URLs without replaying the full schema setup.
  try { await client.execute("ALTER TABLE portfolio_items ADD COLUMN slug TEXT"); } catch {}
  try {
    const missingSlugs = await client.execute("SELECT id, title FROM portfolio_items WHERE slug IS NULL OR TRIM(slug) = ''");
    for (const item of missingSlugs.rows as any[]) {
      await client.execute({
        sql: "UPDATE portfolio_items SET slug = ? WHERE id = ?",
        args: [createPortfolioSlug(item.title, String(item.id)), item.id],
      });
    }
    await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_slug ON portfolio_items(slug)");
  } catch (error) {
    console.warn("Portfolio slug lightweight migration warning", error);
  }

  // Public landing-page reads repeatedly filter and order by these columns.
  // Create their indexes in a single remote batch to keep Turso cold starts
  // from paying one network round-trip per index.
  try {
    await client.batch([
      "CREATE INDEX IF NOT EXISTS idx_portfolio_public_sort ON portfolio_items(is_published, sort_order, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_services_public_sort ON services(is_published, sort_order, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_pricing_plans_sort ON pricing_plans(sort_order, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_extra_services_public_sort ON pricing_extra_services(is_enabled, show_on_pricing_page, sort_order, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_fee_rules_public_sort ON pricing_fee_rules(is_enabled, show_on_pricing_page, sort_order, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_faq_public_sort ON faqs(is_published, category_id, sort_order, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_faq_categories_public_sort ON faq_categories(is_published, sort_order, created_at)",
    ]);
  } catch {
    // On a brand-new database these tables are created below. The idempotent
    // batch succeeds on the next boot after initialization.
  }

  // Fast check: If database is already initialized up to v8, return immediately
  try {
    const initCheck = await client.execute("SELECT value FROM settings WHERE key = '__db_initialized_v8'");
    if (initCheck.rows.length > 0 && initCheck.rows[0].value === "1") {
      return;
    }
  } catch {
    // Settings table does not exist yet; proceed with table creations
  }

  // Ensure critical multi-property & link & invoice & payment request tables exist immediately
  try {
    await client.execute(`
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
    await client.execute("CREATE INDEX IF NOT EXISTS idx_payment_requests_requester ON payment_requests(requester_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_payment_requests_category ON payment_requests(category)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_payment_requests_budget ON payment_requests(linked_budget_entry_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_payment_requests_invoice ON payment_requests(linked_invoice_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_payment_requests_created ON payment_requests(created_at)");

    await client.execute(`
      CREATE TABLE IF NOT EXISTS client_properties (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        property_name TEXT DEFAULT '',
        address TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS client_links (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        label TEXT DEFAULT '',
        url TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        budget_entry_id TEXT DEFAULT NULL,
        owner_admin_id TEXT NOT NULL,
        client_id TEXT DEFAULT NULL,
        project_id TEXT DEFAULT NULL,
        property_id TEXT DEFAULT NULL,
        client_name TEXT NOT NULL,
        client_email TEXT NOT NULL,
        client_phone TEXT DEFAULT '',
        client_address TEXT DEFAULT '',
        property_address TEXT DEFAULT '',
        issue_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'draft',
        subtotal REAL NOT NULL DEFAULT 0,
        tax_rate REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0,
        amount_paid REAL NOT NULL DEFAULT 0,
        payment_terms TEXT DEFAULT 'Payment due within 14 days of invoice date.',
        notes TEXT DEFAULT '',
        payment_method_instructions TEXT DEFAULT '',
        payment_link TEXT DEFAULT '',
        sent_at DATETIME DEFAULT NULL,
        viewed_at DATETIME DEFAULT NULL,
        paid_at DATETIME DEFAULT NULL,
        archived_at DATETIME DEFAULT NULL,
        last_reminder_sent_at DATETIME DEFAULT NULL,
        access_token TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        description TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL DEFAULT 0,
        tax_rate REAL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_date TEXT NOT NULL,
        payment_method TEXT DEFAULT 'bank_transfer',
        transaction_reference TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        recorded_by_id TEXT DEFAULT NULL,
        recorded_by_name TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);
    await client.execute("CREATE INDEX IF NOT EXISTS idx_client_properties_client_id ON client_properties(client_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_client_links_client_id ON client_links(client_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_invoices_owner ON invoices(owner_admin_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_invoices_budget ON invoices(budget_entry_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id)");
  } catch (initErr) {
    console.warn("[DB Setup] Property/links/invoices table creation notice:", initErr);
  }

  // Batch core table definitions for instant 1-roundtrip schema creation
  try {
    if (typeof client.batch === "function") {
      await client.batch([
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'admin',
          is_active INTEGER DEFAULT 1,
          property_address TEXT DEFAULT '',
          advertisement_link TEXT DEFAULT '',
          name TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          workspace TEXT DEFAULT 'Main Studio',
          team_id TEXT DEFAULT NULL,
          password_auth_enabled INTEGER DEFAULT 1,
          password_updated_at DATETIME DEFAULT NULL,
          tfa_enabled INTEGER DEFAULT 0,
          last_login_at DATETIME DEFAULT NULL,
          last_activity_at DATETIME DEFAULT NULL,
          updated_at DATETIME DEFAULT NULL,
          portal_access_disabled_at DATETIME DEFAULT NULL,
          portal_access_disabled_reason TEXT DEFAULT '',
          portal_access_disabled_by TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT DEFAULT '',
          description TEXT DEFAULT '',
          parent_id TEXT DEFAULT NULL,
          sort_order INTEGER DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS portfolio_items (
          id TEXT PRIMARY KEY,
          slug TEXT UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          category_id TEXT,
          item_type TEXT DEFAULT 'image',
          media_type TEXT DEFAULT 'image',
          media_url TEXT DEFAULT '',
          thumbnail_url TEXT DEFAULT '',
          image_urls TEXT NOT NULL,
          target_url TEXT,
          is_featured INTEGER DEFAULT 0,
          is_published INTEGER DEFAULT 1,
          sort_order INTEGER DEFAULT 0,
          keywords TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS contact_submissions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT DEFAULT '',
          subject TEXT DEFAULT '',
          property_address TEXT DEFAULT '',
          availability_start TEXT DEFAULT '',
          availability_end TEXT DEFAULT '',
          message TEXT NOT NULL,
          is_read INTEGER DEFAULT 0,
          status TEXT DEFAULT 'new',
          notes TEXT DEFAULT '',
          is_archived INTEGER DEFAULT 0,
          archived_at DATETIME DEFAULT NULL,
          archived_by TEXT DEFAULT '',
          unarchived_at DATETIME DEFAULT NULL,
          unarchived_by TEXT DEFAULT '',
          customer_id TEXT DEFAULT NULL,
          plan_id TEXT DEFAULT NULL,
          plan_name TEXT DEFAULT '',
          extra_services TEXT DEFAULT '[]',
          fee_details TEXT DEFAULT '{}',
          estimated_total REAL DEFAULT 0,
          currency TEXT DEFAULT 'USD',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS crm_records (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          source TEXT,
          status TEXT,
          notes TEXT,
          owner_id TEXT,
          property_address TEXT DEFAULT '',
          advertisement_link TEXT DEFAULT '',
          portal_access_disabled_at DATETIME DEFAULT NULL,
          portal_access_disabled_reason TEXT DEFAULT '',
          portal_access_disabled_by TEXT DEFAULT '',
          is_vip INTEGER DEFAULT 0,
          custom_price_list TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS client_properties (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          property_name TEXT DEFAULT '',
          address TEXT NOT NULL,
          metadata TEXT DEFAULT '{}',
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS client_links (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          label TEXT DEFAULT '',
          url TEXT NOT NULL,
          metadata TEXT DEFAULT '{}',
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      ], "write");
    }
  } catch (batchErr) {
    console.warn("[DB Setup] Table batch setup notice (will verify individually):", batchErr);
  }

  // Users table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      is_active INTEGER DEFAULT 1,
      property_address TEXT DEFAULT '',
      advertisement_link TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    // Add role and is_active columns if they don't exist
    await client.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin'");
  } catch (e) {
    // Column might already exist
  }
  try {
    await client.execute("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
  } catch (e) {
    // Column might already exist
  }
  try {
    await client.execute("ALTER TABLE users ADD COLUMN property_address TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }
  try {
    await client.execute("ALTER TABLE users ADD COLUMN advertisement_link TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }
  try {
    await client.execute("ALTER TABLE users ADD COLUMN name TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }
  try { await client.execute("ALTER TABLE users ADD COLUMN password_auth_enabled INTEGER DEFAULT 1"); } catch {}
  try { await client.execute("ALTER TABLE users ADD COLUMN password_updated_at DATETIME DEFAULT NULL"); } catch {}
  try { await client.execute("ALTER TABLE users ADD COLUMN tfa_enabled INTEGER DEFAULT 0"); } catch {}
  try {
    await client.execute("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }
  try {
    await client.execute("ALTER TABLE users ADD COLUMN workspace TEXT DEFAULT 'Main Studio'");
  } catch (e) {
    // Column might already exist
  }
  try { await client.execute("ALTER TABLE users ADD COLUMN team_id TEXT DEFAULT NULL"); } catch {}
  try {
    await client.execute("ALTER TABLE users ADD COLUMN last_login_at DATETIME DEFAULT NULL");
  } catch (e) {
    // Column might already exist
  }
  try {
    await client.execute("ALTER TABLE users ADD COLUMN last_activity_at DATETIME DEFAULT NULL");
  } catch (e) {
    // Column might already exist
  }
  try {
    await client.execute("ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT NULL");
  } catch (e) {
    // Column might already exist
  }


  // Settings table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Portfolio categories
  await client.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    )
  `);

  try {
    await client.execute("ALTER TABLE categories ADD COLUMN slug TEXT DEFAULT ''");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE categories ADD COLUMN description TEXT DEFAULT ''");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE categories ADD COLUMN parent_id TEXT DEFAULT NULL");
  } catch (e) {}

  // Portfolio items
  await client.execute(`
    CREATE TABLE IF NOT EXISTS portfolio_items (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      item_type TEXT DEFAULT 'image',
      media_type TEXT DEFAULT 'image',
      media_url TEXT DEFAULT '',
      thumbnail_url TEXT DEFAULT '',
      image_urls TEXT NOT NULL,
      target_url TEXT,
      is_featured INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      keywords TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  try {
    await client.execute("ALTER TABLE portfolio_items ADD COLUMN item_type TEXT DEFAULT 'image'");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE portfolio_items ADD COLUMN slug TEXT");
  } catch (e) {}
  try {
    const missingSlugs = await client.execute("SELECT id, title FROM portfolio_items WHERE slug IS NULL OR TRIM(slug) = ''");
    for (const item of missingSlugs.rows as any[]) {
      await client.execute({
        sql: "UPDATE portfolio_items SET slug = ? WHERE id = ?",
        args: [createPortfolioSlug(item.title, String(item.id)), item.id],
      });
    }
    await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_slug ON portfolio_items(slug)");
  } catch (error) {
    console.warn("Portfolio slug migration warning", error);
  }

  // Backfill item_type for existing items based on category if needed
  try {
    await client.execute("UPDATE portfolio_items SET item_type = 'image' WHERE (item_type IS NULL OR item_type = '') AND (category_id = 'cat-photos' OR media_type = 'image')");
    await client.execute("UPDATE portfolio_items SET item_type = 'drone_video' WHERE category_id = 'cat-drone-videos' OR (category_id IN (SELECT id FROM categories WHERE slug = 'drone-videos' OR name LIKE '%Drone%'))");
    await client.execute("UPDATE portfolio_items SET item_type = 'interior_video' WHERE category_id = 'cat-indoor-videos' OR (category_id IN (SELECT id FROM categories WHERE slug = 'indoor-videos' OR slug = 'interior-videos' OR name LIKE '%Indoor%' OR name LIKE '%Interior%'))");
  } catch (e) {}

  // Contact submissions
  await client.execute(`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      subject TEXT DEFAULT '',
      property_address TEXT DEFAULT '',
      availability_start TEXT DEFAULT '',
      availability_end TEXT DEFAULT '',
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      status TEXT DEFAULT 'new',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN phone TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN subject TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN property_address TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN availability_start TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN availability_end TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN status TEXT DEFAULT 'new'");
  } catch (e) {
    // Column might already exist
  }
  
  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN notes TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN is_archived INTEGER DEFAULT 0");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN archived_at DATETIME DEFAULT NULL");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN archived_by TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN unarchived_at DATETIME DEFAULT NULL");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN unarchived_by TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN customer_id TEXT DEFAULT NULL");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN plan_id TEXT DEFAULT NULL");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN plan_name TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN extra_services TEXT DEFAULT '[]'");
  } catch (e) {}

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN fee_details TEXT DEFAULT '{}'");
  } catch (e) {}

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN estimated_total REAL DEFAULT 0");
  } catch (e) {}

  try {
    await client.execute("ALTER TABLE contact_submissions ADD COLUMN currency TEXT DEFAULT 'USD'");
  } catch (e) {}

  // CRM tables
  await client.execute(`
    CREATE TABLE IF NOT EXISTS crm_records (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, 
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      source TEXT,
      status TEXT,
      notes TEXT,
      owner_id TEXT,
      property_address TEXT DEFAULT '',
      advertisement_link TEXT DEFAULT '',
      is_vip INTEGER DEFAULT 0,
      custom_price_list TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await client.execute("ALTER TABLE crm_records ADD COLUMN property_address TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }
  try {
    await client.execute("ALTER TABLE crm_records ADD COLUMN advertisement_link TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }
  try { await client.execute("ALTER TABLE crm_records ADD COLUMN is_vip INTEGER DEFAULT 0"); } catch (e) {}
  try { await client.execute("ALTER TABLE crm_records ADD COLUMN custom_price_list TEXT DEFAULT ''"); } catch (e) {}

  // Client Properties table (unlimited properties for clients/leads/customers)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS client_properties (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      property_name TEXT DEFAULT '',
      address TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await client.execute("CREATE INDEX IF NOT EXISTS idx_client_properties_client_id ON client_properties(client_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_client_properties_sort ON client_properties(client_id, sort_order)");
  } catch (e) {}

  // Client Links table (unlimited advertisement/listing/social links for clients/leads/customers)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS client_links (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      label TEXT DEFAULT '',
      url TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await client.execute("CREATE INDEX IF NOT EXISTS idx_client_links_client_id ON client_links(client_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_client_links_sort ON client_links(client_id, sort_order)");
  } catch (e) {}

  // Migrate existing single property_address & advertisement_link to client_properties and client_links
  try {
    // 1. From users table
    const usersWithProps = await client.execute("SELECT id, property_address, advertisement_link FROM users WHERE property_address IS NOT NULL AND TRIM(property_address) != ''");
    for (const u of usersWithProps.rows) {
      const uId = String(u.id);
      const addr = String(u.property_address).trim();
      const existing = await client.execute({
        sql: "SELECT id FROM client_properties WHERE client_id = ? AND address = ?",
        args: [uId, addr]
      });
      if (existing.rows.length === 0) {
        await client.execute({
          sql: "INSERT INTO client_properties (id, client_id, property_name, address, sort_order) VALUES (?, ?, ?, ?, 0)",
          args: [crypto.randomUUID(), uId, "Primary Property", addr]
        });
      }
    }

    const usersWithLinks = await client.execute("SELECT id, advertisement_link FROM users WHERE advertisement_link IS NOT NULL AND TRIM(advertisement_link) != ''");
    for (const u of usersWithLinks.rows) {
      const uId = String(u.id);
      const linkUrl = String(u.advertisement_link).trim();
      const existing = await client.execute({
        sql: "SELECT id FROM client_links WHERE client_id = ? AND url = ?",
        args: [uId, linkUrl]
      });
      if (existing.rows.length === 0) {
        await client.execute({
          sql: "INSERT INTO client_links (id, client_id, label, url, sort_order) VALUES (?, ?, ?, ?, 0)",
          args: [crypto.randomUUID(), uId, "Main Listing / Ad Link", linkUrl]
        });
      }
    }

    // 2. From crm_records table
    const crmWithProps = await client.execute("SELECT id, property_address FROM crm_records WHERE property_address IS NOT NULL AND TRIM(property_address) != ''");
    for (const c of crmWithProps.rows) {
      const cId = String(c.id);
      const addr = String(c.property_address).trim();
      const existing = await client.execute({
        sql: "SELECT id FROM client_properties WHERE client_id = ? AND address = ?",
        args: [cId, addr]
      });
      if (existing.rows.length === 0) {
        await client.execute({
          sql: "INSERT INTO client_properties (id, client_id, property_name, address, sort_order) VALUES (?, ?, ?, ?, 0)",
          args: [crypto.randomUUID(), cId, "Primary Property", addr]
        });
      }
    }

    const crmWithLinks = await client.execute("SELECT id, advertisement_link FROM crm_records WHERE advertisement_link IS NOT NULL AND TRIM(advertisement_link) != ''");
    for (const c of crmWithLinks.rows) {
      const cId = String(c.id);
      const linkUrl = String(c.advertisement_link).trim();
      const existing = await client.execute({
        sql: "SELECT id FROM client_links WHERE client_id = ? AND url = ?",
        args: [cId, linkUrl]
      });
      if (existing.rows.length === 0) {
        await client.execute({
          sql: "INSERT INTO client_links (id, client_id, label, url, sort_order) VALUES (?, ?, ?, ?, 0)",
          args: [crypto.randomUUID(), cId, "Main Listing / Ad Link", linkUrl]
        });
      }
    }
  } catch (migErr) {
    console.warn("Client properties/links initial backfill notice:", migErr);
  }

  // Add columns to portfolio_items if they don't exist
  try {
    await client.execute("ALTER TABLE portfolio_items ADD COLUMN keywords TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }
  try {
    await client.execute("ALTER TABLE portfolio_items ADD COLUMN media_type TEXT DEFAULT 'image'");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE portfolio_items ADD COLUMN media_url TEXT DEFAULT ''");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE portfolio_items ADD COLUMN thumbnail_url TEXT DEFAULT ''");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE portfolio_items ADD COLUMN updated_at DATETIME DEFAULT NULL");
  } catch (e) {}
  try {
    await client.execute("UPDATE portfolio_items SET updated_at = datetime('now') WHERE updated_at IS NULL");
  } catch (e) {}

  // Seed default portfolio categories (Photos, Indoor Videos, Drone Videos)
  try {
    const defaultPortfolioCategories = [
      {
        id: "cat-photos",
        name: "Photos",
        slug: "photos",
        description: "High-resolution interior and architectural photography.",
        sort_order: 1
      },
      {
        id: "cat-indoor-videos",
        name: "Indoor Videos",
        slug: "indoor-videos",
        description: "Cinematic 4K walkthrough tours and stabilized interior video reels.",
        sort_order: 2
      },
      {
        id: "cat-drone-videos",
        name: "Drone Videos",
        slug: "drone-videos",
        description: "Stunning high-altitude aerial perspectives, flyovers, and landscape sweeps.",
        sort_order: 3
      }
    ];

    for (const cat of defaultPortfolioCategories) {
      const existing = await client.execute({
        sql: "SELECT id FROM categories WHERE id = ? OR slug = ? OR name = ?",
        args: [cat.id, cat.slug, cat.name]
      });
      if (existing.rows.length === 0) {
        await client.execute({
          sql: "INSERT INTO categories (id, name, slug, description, sort_order) VALUES (?, ?, ?, ?, ?)",
          args: [cat.id, cat.name, cat.slug, cat.description, cat.sort_order]
        });
      }
    }
  } catch (e) {
    console.error("Failed to seed default portfolio categories:", e);
  }

  // Seed default portfolio items for each category
  try {
    const portCount = await client.execute("SELECT COUNT(*) as count FROM portfolio_items");
    if (Number(portCount.rows[0]?.count || 0) === 0) {
      const defaultPortfolioItems = [
        // === PHOTOS (9 items for 3x3 grid) ===
        {
          id: "port-photo-1",
          title: "Modern Architectural Villa - Sunset Façade",
          description: "Twilight architectural exposure showcasing clean linear geometry, ambient exterior lighting, and landscaped reflection pool.",
          category_id: "cat-photos",
          media_type: "image",
          media_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
          thumbnail_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
          image_urls: JSON.stringify([
            { id: "img-1", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85", title: "Sunset Façade" }
          ]),
          target_url: "",
          is_featured: 1,
          is_published: 1,
          sort_order: 1,
          keywords: "modern villa, twilight exterior, architecture, luxury"
        },
        {
          id: "port-photo-2",
          title: "Minimalist Open-Concept Living Room",
          description: "Double-height ceiling with floor-to-ceiling glass panels and natural Italian oak bespoke joinery.",
          category_id: "cat-photos",
          media_type: "image",
          media_url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          thumbnail_url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80",
          image_urls: JSON.stringify([
            { id: "img-2", url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=85", title: "Open Concept Living" }
          ]),
          target_url: "",
          is_featured: 1,
          is_published: 1,
          sort_order: 2,
          keywords: "minimalist, living room, luxury interior"
        },
        {
          id: "port-photo-3",
          title: "Executive Master Suite & Panoramic Terrace",
          description: "Spacious master bedroom framing panoramic skyline vistas, featuring plush velvet finishes and ambient cove lighting.",
          category_id: "cat-photos",
          media_type: "image",
          media_url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
          thumbnail_url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=600&q=80",
          image_urls: JSON.stringify([
            { id: "img-3", url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1600&q=85", title: "Master Suite" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 3,
          keywords: "master bedroom, terrace, penthouse"
        },
        {
          id: "port-photo-4",
          title: "Contemporary Chef's Kitchen & Marble Island",
          description: "Calacatta marble waterfall island paired with integrated German appliances and matte bronze tapware.",
          category_id: "cat-photos",
          media_type: "image",
          media_url: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80",
          thumbnail_url: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=600&q=80",
          image_urls: JSON.stringify([
            { id: "img-4", url: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1600&q=85", title: "Chef's Kitchen" }
          ]),
          target_url: "",
          is_featured: 1,
          is_published: 1,
          sort_order: 4,
          keywords: "chef kitchen, calacatta marble, luxury dining"
        },
        {
          id: "port-photo-5",
          title: "Infinity Pool & Valley Sun Deck",
          description: "Heated infinity-edge pool perched over a private rolling hill estate with integrated spa jets.",
          category_id: "cat-photos",
          media_type: "image",
          media_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
          thumbnail_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80",
          image_urls: JSON.stringify([
            { id: "img-5", url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1600&q=85", title: "Infinity Pool" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 5,
          keywords: "infinity pool, outdoor patio, luxury estate"
        },
        {
          id: "port-photo-6",
          title: "Spa-Inspired Master Bathroom",
          description: "Bookmatched travertine stone walls, matte black fittings, and a centerpiece freestanding stone tub.",
          category_id: "cat-photos",
          media_type: "image",
          media_url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",
          thumbnail_url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
          image_urls: JSON.stringify([
            { id: "img-6", url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1600&q=85", title: "Spa Bathroom" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 6,
          keywords: "spa bathroom, stone tub, travertine"
        },
        {
          id: "port-photo-7",
          title: "Sunlit Dining Pavilion & Courtyard Garden",
          description: "Seemingly boundless indoor-outdoor dining room opening onto a landscaped Japanese maple garden.",
          category_id: "cat-photos",
          media_type: "image",
          media_url: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          thumbnail_url: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=600&q=80",
          image_urls: JSON.stringify([
            { id: "img-7", url: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1600&q=85", title: "Dining Pavilion" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 7,
          keywords: "dining room, outdoor courtyard, natural light"
        },
        {
          id: "port-photo-8",
          title: "Climate-Controlled Wine Cellar & Tasting Room",
          description: "Custom backlit walnut racking holding over 800 vintage bottles with tasting sommelier bar.",
          category_id: "cat-photos",
          media_type: "image",
          media_url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
          thumbnail_url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80",
          image_urls: JSON.stringify([
            { id: "img-8", url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1600&q=85", title: "Wine Cellar" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 8,
          keywords: "wine cellar, tasting lounge, luxury details"
        },
        {
          id: "port-photo-9",
          title: "Sculptural Floating Glass Staircase & Foyer",
          description: "Architectural cantilevered oak treads with frameless glass balustrades and museum-grade spotlighting.",
          category_id: "cat-photos",
          media_type: "image",
          media_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
          thumbnail_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80",
          image_urls: JSON.stringify([
            { id: "img-9", url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85", title: "Floating Staircase" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 9,
          keywords: "floating stairs, architectural foyer, entryway"
        },

        // === INDOOR VIDEOS (9 items for 3x3 grid) ===
        {
          id: "port-indoor-1",
          title: "Cinematic Penthouse Interior Walkthrough",
          description: "Smooth 4K gimbal walkthrough highlighting sprawling floor plans, high ceilings, and premium material palettes.",
          category_id: "cat-indoor-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "vid-1", url: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80", title: "Penthouse Tour" }
          ]),
          target_url: "",
          is_featured: 1,
          is_published: 1,
          sort_order: 1,
          keywords: "penthouse video, interior walkthrough, 4K tour"
        },
        {
          id: "port-indoor-2",
          title: "Luxury Kitchen & Dining Masterclass Tour",
          description: "Detailed motion reel capturing culinary spaces, hidden pantries, and custom cabinetry finishes.",
          category_id: "cat-indoor-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "vid-2", url: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80", title: "Kitchen Reel" }
          ]),
          target_url: "",
          is_featured: 1,
          is_published: 1,
          sort_order: 2,
          keywords: "kitchen tour, video walkthrough, real estate video"
        },
        {
          id: "port-indoor-3",
          title: "Modern Living Room 60FPS Stabilized Reel",
          description: "Ultra-smooth tracking shots through expansive living areas with seamless indoor-to-patio transitions.",
          category_id: "cat-indoor-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "vid-3", url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80", title: "Living Room Reel" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 3,
          keywords: "living room, 60fps, stabilized video"
        },
        {
          id: "port-indoor-4",
          title: "Master Suite & Private Balcony Experience",
          description: "Intimate and relaxing motion tour through the primary retreat, walk-in dressing room, and balcony.",
          category_id: "cat-indoor-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "vid-4", url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80", title: "Master Suite Tour" }
          ]),
          target_url: "",
          is_featured: 1,
          is_published: 1,
          sort_order: 4,
          keywords: "master suite, bedroom tour, luxury video"
        },
        {
          id: "port-indoor-5",
          title: "Architectural Glass Stairwell & Atrium",
          description: "Vertical and panning motion showcase highlighting architectural geometry and natural lightwells.",
          category_id: "cat-indoor-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "vid-5", url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80", title: "Stairwell Atrium" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 5,
          keywords: "architectural video, stairwell, design"
        },
        {
          id: "port-indoor-6",
          title: "Private Home Cinema & Acoustic Lounge",
          description: "Atmospheric dim-lit showcase demonstrating customized fiber-optic starlight ceiling and theater seating.",
          category_id: "cat-indoor-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "vid-6", url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80", title: "Home Cinema" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 6,
          keywords: "home cinema, theater room, luxury entertainment"
        },
        {
          id: "port-indoor-7",
          title: "Glass-Enclosed Home Wellness & Spa Suite",
          description: "Relaxing video tour capturing cedarwood dry sauna, steam room, and cold-plunge hydrotherapy area.",
          category_id: "cat-indoor-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "vid-7", url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80", title: "Wellness Suite" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 7,
          keywords: "wellness spa, sauna, luxury video tour"
        },
        {
          id: "port-indoor-8",
          title: "Double-Height Library & Executive Office",
          description: "Slow-motion architectural glide through handcrafted floor-to-ceiling bookshelves and marble workstation.",
          category_id: "cat-indoor-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "vid-8", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80", title: "Executive Library" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 8,
          keywords: "executive office, library, interior reel"
        },
        {
          id: "port-indoor-9",
          title: "Minimalist Sunroom & Courtyard Walkthrough",
          description: "Ambient morning light exposure gliding between sliding pocket doors and zen water features.",
          category_id: "cat-indoor-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "vid-9", url: "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1200&q=80", title: "Zen Sunroom" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 9,
          keywords: "sunroom, courtyard, indoor outdoor video"
        },

        // === DRONE VIDEOS (9 items for 3x3 grid) ===
        {
          id: "port-drone-1",
          title: "Golden Hour Coastal Estate 4K Aerial Flight",
          description: "Cinematic drone descent tracking rocky cliffside perches, wave breaks, and private oceanfront deck.",
          category_id: "cat-drone-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "drone-1", url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80", title: "Coastal Estate Aerial" }
          ]),
          target_url: "",
          is_featured: 1,
          is_published: 1,
          sort_order: 1,
          keywords: "drone video, aerial real estate, coastal estate"
        },
        {
          id: "port-drone-2",
          title: "Mountain Peak Villa 360° Drone Orbit",
          description: "High-altitude rotational orbit framing alpine peaks, cantilevered balconies, and solar array rooftops.",
          category_id: "cat-drone-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "drone-2", url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80", title: "Mountain Peak Orbit" }
          ]),
          target_url: "",
          is_featured: 1,
          is_published: 1,
          sort_order: 2,
          keywords: "mountain villa, drone orbit, 4k aerial"
        },
        {
          id: "port-drone-3",
          title: "Lakefront Estate Canopy & Harbor Approach",
          description: "Low-altitude tree canopy glide revealing private boat dock, boathouse, and sandy beach frontage.",
          category_id: "cat-drone-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "drone-3", url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80", title: "Lakefront Flyover" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 3,
          keywords: "lakefront, boat dock, aerial approach"
        },
        {
          id: "port-drone-4",
          title: "Sprawling Country Manor Bird's-Eye Flyover",
          description: "Wide panoramic sweep over 15-acre manicured equestrian grounds, tennis court, and guest cottages.",
          category_id: "cat-drone-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "drone-4", url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80", title: "Country Manor" }
          ]),
          target_url: "",
          is_featured: 1,
          is_published: 1,
          sort_order: 4,
          keywords: "country estate, acreage, drone showcase"
        },
        {
          id: "port-drone-5",
          title: "Vineyard & Sunset Valley Aerial Panorama",
          description: "Golden hour flight drifting over terraced grapevines and private winery tasting pavilion.",
          category_id: "cat-drone-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "drone-5", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80", title: "Vineyard Panorama" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 5,
          keywords: "vineyard, sunset valley, aerial panorama"
        },
        {
          id: "port-drone-6",
          title: "Luxury Rooftop Terrace Skyline Sweep",
          description: "Ascending vertical drone reveal showcasing urban penthouse rooftop pool, fire pit, and skyline backdrop.",
          category_id: "cat-drone-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "drone-6", url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80", title: "Skyline Sweep" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 6,
          keywords: "city skyline, rooftop drone, urban luxury"
        },
        {
          id: "port-drone-7",
          title: "Championship Golf Course Residence Flyby",
          description: "High-speed stabilized sweep following fairway greens directly to private fairway clubhouse.",
          category_id: "cat-drone-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1535827841776-24afc1e255ac?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "drone-7", url: "https://images.unsplash.com/photo-1535827841776-24afc1e255ac?auto=format&fit=crop&w=1200&q=80", title: "Golf Course Flyby" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 7,
          keywords: "golf course, fairway residence, drone flyby"
        },
        {
          id: "port-drone-8",
          title: "Private Island Villa Coastal Approach",
          description: "Island approach flight gliding over coral reefs, turquoise shallow waters, and private helicopter pad.",
          category_id: "cat-drone-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "drone-8", url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80", title: "Island Approach" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 8,
          keywords: "private island, turquoise waters, aerial approach"
        },
        {
          id: "port-drone-9",
          title: "Alpine Pine Forest & Glass Villa Flyover",
          description: "Dramatic morning mist flight carving through pine forest crowns to reveal a modern timber and glass chalet.",
          category_id: "cat-drone-videos",
          media_type: "video",
          media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80",
          image_urls: JSON.stringify([
            { id: "drone-9", url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80", title: "Alpine Forest Flyover" }
          ]),
          target_url: "",
          is_featured: 0,
          is_published: 1,
          sort_order: 9,
          keywords: "alpine forest, pine trees, architectural chalet, drone"
        }
      ];

      for (const item of defaultPortfolioItems) {
        const itemType = item.category_id === 'cat-drone-videos' ? 'drone_video' : (item.category_id === 'cat-indoor-videos' ? 'interior_video' : 'image');
        await client.execute({
          sql: `INSERT INTO portfolio_items 
                (id, title, description, category_id, item_type, media_type, media_url, thumbnail_url, image_urls, target_url, is_featured, is_published, sort_order, keywords)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            item.id,
            item.title,
            item.description,
            item.category_id,
            (item as any).item_type || itemType,
            item.media_type,
            item.media_url,
            item.thumbnail_url,
            item.image_urls,
            item.target_url,
            item.is_featured,
            item.is_published,
            item.sort_order,
            item.keywords
          ]
        });
      }
    }
  } catch (e) {
    console.error("Failed to seed default portfolio items:", e);
  }

  // Projects table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      client_id TEXT,
      property_id TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add keywords column to projects if it doesn't exist
  try {
    await client.execute("ALTER TABLE projects ADD COLUMN keywords TEXT DEFAULT ''");
  } catch (e) {
    // Column might already exist
  }

  // Projects <-> Portfolio Items junction
  await client.execute(`
    CREATE TABLE IF NOT EXISTS project_portfolio_items (
      project_id TEXT,
      portfolio_item_id TEXT,
      PRIMARY KEY (project_id, portfolio_item_id)
    )
  `);

  // Media uploads
  await client.execute(`
    CREATE TABLE IF NOT EXISTS media_uploads (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      bucket TEXT NOT NULL,
      file_key TEXT NOT NULL,
      public_url TEXT NOT NULL,
      original_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Services table for feature/service cards
  await client.execute(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'camera',
      image_url TEXT,
      link_url TEXT,
      link_text TEXT,
      price REAL DEFAULT NULL,
      is_published INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await client.execute("ALTER TABLE services ADD COLUMN price REAL DEFAULT NULL");
  } catch (e) {}

  // Seed default services if table is empty
  try {
    const servicesCount = await client.execute("SELECT COUNT(*) as count FROM services");
    if (Number(servicesCount.rows[0]?.count || 0) === 0) {
      const defaultServices = [
        {
          id: "srv-photo",
          title: "Professional Photography",
          description: "High-resolution, beautifully composed images that highlight the best features of every property.",
          icon: "camera",
          sort_order: 1
        },
        {
          id: "srv-video",
          title: "Cinematic Video Tours",
          description: "Smooth, stabilized walkthrough videos that provide a realistic and engaging viewing experience.",
          icon: "video",
          sort_order: 2
        },
        {
          id: "srv-drone",
          title: "Drone & Aerial",
          description: "Stunning aerial perspectives that showcase the property exterior, land, and surrounding neighborhood.",
          icon: "helicopter",
          sort_order: 3
        },
        {
          id: "srv-staging",
          title: "Virtual Staging",
          description: "Transform empty spaces into furnished, inviting homes that help buyers visualize their future.",
          icon: "couch",
          sort_order: 4
        },
        {
          id: "srv-floorplan",
          title: "Floor Plans",
          description: "Accurate, clean floor plans with precise measurements to help buyers understand the layout.",
          icon: "ruler",
          sort_order: 5
        },
        {
          id: "srv-twilight",
          title: "Twilight Photography",
          description: "Dramatic evening shots that make properties stand out and evoke an emotional connection.",
          icon: "moon",
          sort_order: 6
        }
      ];

      for (const s of defaultServices) {
        await client.execute({
          sql: "INSERT INTO services (id, title, description, icon, is_published, sort_order) VALUES (?, ?, ?, ?, 1, ?)",
          args: [s.id, s.title, s.description, s.icon, s.sort_order]
        });
      }
    }
  } catch (e) {
    console.error("Failed to seed default services:", e);
  }

  // FAQ Categories table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS faq_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT,
      description TEXT,
      parent_id TEXT,
      is_published INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default FAQ Categories if empty
  try {
    const catsCount = await client.execute("SELECT COUNT(*) as count FROM faq_categories");
    if (Number(catsCount.rows[0]?.count || 0) === 0) {
      const defaultCategories = [
        {
          id: "cat-turnaround",
          name: "Turnaround & Delivery",
          slug: "turnaround-delivery",
          description: "Details regarding editing times, turnaround guarantees, and file delivery formats.",
          parent_id: null,
          sort_order: 1
        },
        {
          id: "cat-prep",
          name: "Preparation & Staging",
          slug: "preparation-staging",
          description: "Tips and guidelines for readying listings before photographers arrive on-site.",
          parent_id: null,
          sort_order: 2
        },
        {
          id: "cat-licensing",
          name: "Licensing & Safety",
          slug: "licensing-safety",
          description: "FAA drone certifications, commercial liability insurance, and media copyright usage.",
          parent_id: null,
          sort_order: 3
        },
        {
          id: "cat-services",
          name: "Services & Add-ons",
          slug: "services-addons",
          description: "Information about virtual staging, floor plans, 3D tours, and twilight shoots.",
          parent_id: null,
          sort_order: 4
        },
        {
          id: "cat-pricing",
          name: "Pricing & Invoicing",
          slug: "pricing-invoicing",
          description: "Payment terms, package options, volume discounts, and cancellation policies.",
          parent_id: null,
          sort_order: 5
        }
      ];

      for (const cat of defaultCategories) {
        await client.execute({
          sql: `INSERT INTO faq_categories (id, name, slug, description, parent_id, is_published, sort_order)
                VALUES (?, ?, ?, ?, ?, 1, ?)`,
          args: [cat.id, cat.name, cat.slug, cat.description, cat.parent_id, cat.sort_order]
        });
      }
    }
  } catch (e) {
    console.error("Failed to seed default FAQ categories:", e);
  }

  // FAQs table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT,
      category_id TEXT,
      is_published INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure category_id column exists if table was already created
  try {
    await client.execute(`ALTER TABLE faqs ADD COLUMN category_id TEXT`);
  } catch (e) {
    // Column may already exist
  }

  // Link existing FAQs to category_id based on category name if null
  try {
    await client.execute(`
      UPDATE faqs 
      SET category_id = (SELECT id FROM faq_categories WHERE faq_categories.name = faqs.category LIMIT 1)
      WHERE category_id IS NULL AND category IS NOT NULL
    `);
  } catch (e) {
    // ignore
  }

  // Seed default FAQs if table is empty
  try {
    const faqsCount = await client.execute("SELECT COUNT(*) as count FROM faqs");
    if (Number(faqsCount.rows[0]?.count || 0) === 0) {
      const defaultFaqs = [
        {
          id: "faq-turnaround",
          question: "What is your typical turnaround time?",
          answer: "We understand that speed is crucial in real estate. Our standard turnaround time for photography and floor plans is 24 to 48 hours after the shoot is completed. Video tours and virtual staging may require an additional day.",
          category: "Turnaround & Delivery",
          category_id: "cat-turnaround",
          sort_order: 1
        },
        {
          id: "faq-prep",
          question: "How should the property be prepared before the shoot?",
          answer: "The property should be perfectly clean, decluttered, and staged as you want it to appear. We recommend removing personal items, turning on all interior and exterior lights, opening all blinds, and moving vehicles out of the driveway.",
          category: "Preparation & Staging",
          category_id: "cat-prep",
          sort_order: 2
        },
        {
          id: "faq-drone",
          question: "Are you licensed and insured for drone photography?",
          answer: "Yes, our drone operators are fully licensed and insured. We adhere to all local aviation regulations and safety guidelines to capture stunning aerial perspectives of your property.",
          category: "Licensing & Safety",
          category_id: "cat-licensing",
          sort_order: 3
        },
        {
          id: "faq-staging",
          question: "Do you offer virtual staging for empty rooms?",
          answer: "Absolutely. We provide high-quality, realistic virtual staging for vacant properties to help potential buyers visualize themselves in the space and understand the room's scale.",
          category: "Services & Add-ons",
          category_id: "cat-services",
          sort_order: 4
        },
        {
          id: "faq-delivery",
          question: "How will I receive the final files?",
          answer: "Once editing is complete, you will receive an email with a secure link to an online gallery. From there, you can view, share, and download the high-resolution files directly to your device.",
          category: "Turnaround & Delivery",
          category_id: "cat-turnaround",
          sort_order: 5
        }
      ];

      for (const f of defaultFaqs) {
        await client.execute({
          sql: "INSERT INTO faqs (id, question, answer, category, category_id, is_published, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?)",
          args: [f.id, f.question, f.answer, f.category, f.category_id, f.sort_order]
        });
      }
    }
  } catch (e) {
    console.error("Failed to seed default FAQs:", e);
  }

  // Themes table for storing custom and preset themes
  await client.execute(`
    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      target TEXT NOT NULL DEFAULT 'both',
      is_preset INTEGER DEFAULT 0,
      config TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default presets into themes table if empty
  try {
    const themeCount = await client.execute("SELECT COUNT(*) as count FROM themes");
    if (Number(themeCount.rows[0]?.count || 0) === 0) {
      // Import presets dynamically or use static data
      const defaultPresets = [
        {
          id: "preset-modern-minimal",
          name: "Modern Minimal",
          description: "Clean slate architecture with balanced contrast, neutral tones, and crisp typography.",
          target: "both",
          is_preset: 1,
          config: JSON.stringify({
            id: "preset-modern-minimal",
            name: "Modern Minimal",
            target: "both",
            isPreset: true,
            colors: {
              light: {
                background: "#ffffff",
                surface: "#f8fafc",
                surfaceHover: "#f1f5f9",
                text: "#0f172a",
                mutedText: "#64748b",
                inverseText: "#ffffff",
                border: "#e2e8f0",
                primary: "#0f172a",
                primaryForeground: "#ffffff",
                accent: "#3b82f6",
                accentForeground: "#ffffff"
              },
              dark: {
                background: "#0b0f17",
                surface: "#131b2e",
                surfaceHover: "#1e293b",
                text: "#f8fafc",
                mutedText: "#94a3b8",
                inverseText: "#0f172a",
                border: "#1e293b",
                primary: "#f8fafc",
                primaryForeground: "#0f172a",
                accent: "#3b82f6",
                accentForeground: "#ffffff"
              }
            },
            typography: {
              headingFont: "Plus Jakarta Sans",
              bodyFont: "Plus Jakarta Sans",
              fontSizeScale: "normal",
              headingWeight: "bold",
              letterSpacing: "normal"
            },
            uiStyle: {
              borderRadius: "lg",
              shadows: "subtle",
              spacing: "normal"
            }
          })
        },
        {
          id: "preset-luxury-editorial",
          name: "Luxury Editorial",
          description: "Serif display elegance, warm champagne accents, and soft paper surfaces for high-end listings.",
          target: "public",
          is_preset: 1,
          config: JSON.stringify({
            id: "preset-luxury-editorial",
            name: "Luxury Editorial",
            target: "public",
            isPreset: true,
            colors: {
              light: {
                background: "#faf9f6",
                surface: "#f3efe6",
                surfaceHover: "#eae4d8",
                text: "#1c1917",
                mutedText: "#78716c",
                inverseText: "#fafaf9",
                border: "#e7e2d7",
                primary: "#78350f",
                primaryForeground: "#ffffff",
                accent: "#d97706",
                accentForeground: "#ffffff"
              },
              dark: {
                background: "#141210",
                surface: "#1f1c19",
                surfaceHover: "#2b2723",
                text: "#f5f5f4",
                mutedText: "#a8a29e",
                inverseText: "#141210",
                border: "#2e2924",
                primary: "#f59e0b",
                primaryForeground: "#1c1917",
                accent: "#fbbf24",
                accentForeground: "#1c1917"
              }
            },
            typography: {
              headingFont: "Playfair Display",
              bodyFont: "Plus Jakarta Sans",
              fontSizeScale: "comfortable",
              headingWeight: "semibold",
              letterSpacing: "wide"
            },
            uiStyle: {
              borderRadius: "sm",
              shadows: "medium",
              spacing: "relaxed"
            }
          })
        },
        {
          id: "preset-slate-darkroom",
          name: "Slate Darkroom",
          description: "Deep cinematic graphite surfaces and luminous cyan accents, optimized for photo studios.",
          target: "both",
          is_preset: 1,
          config: JSON.stringify({
            id: "preset-slate-darkroom",
            name: "Slate Darkroom",
            target: "both",
            isPreset: true,
            colors: {
              light: {
                background: "#f8fafc",
                surface: "#f1f5f9",
                surfaceHover: "#e2e8f0",
                text: "#0f172a",
                mutedText: "#64748b",
                inverseText: "#ffffff",
                border: "#cbd5e1",
                primary: "#0284c7",
                primaryForeground: "#ffffff",
                accent: "#06b6d4",
                accentForeground: "#ffffff"
              },
              dark: {
                background: "#090d16",
                surface: "#0f172a",
                surfaceHover: "#1e293b",
                text: "#f8fafc",
                mutedText: "#94a3b8",
                inverseText: "#090d16",
                border: "#1e293b",
                primary: "#38bdf8",
                primaryForeground: "#090d16",
                accent: "#22d3ee",
                accentForeground: "#090d16"
              }
            },
            typography: {
              headingFont: "Outfit",
              bodyFont: "Plus Jakarta Sans",
              fontSizeScale: "normal",
              headingWeight: "bold",
              letterSpacing: "tight"
            },
            uiStyle: {
              borderRadius: "xl",
              shadows: "subtle",
              spacing: "normal"
            }
          })
        }
      ];

      for (const t of defaultPresets) {
        await client.execute({
          sql: "INSERT INTO themes (id, name, description, target, is_preset, config) VALUES (?, ?, ?, ?, ?, ?)",
          args: [t.id, t.name, t.description, t.target, t.is_preset, t.config]
        });
      }
    }
  } catch (e) {
    console.error("Failed to seed default themes:", e);
  }

  // Translations table for database-driven localization
  await client.execute(`
    CREATE TABLE IF NOT EXISTS translations (
      id TEXT PRIMARY KEY,
      locale TEXT NOT NULL,
      key TEXT NOT NULL,
      group_name TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(locale, key)
    )
  `);

  // Indexes for high-performance lookups by locale, key, and group
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_translations_locale ON translations(locale)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(key)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_translations_group ON translations(group_name)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_translations_locale_key ON translations(locale, key)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_translations_locale_group ON translations(locale, group_name)`);

  // Social Tree Nodes Table for popup system
  await client.execute(`
    CREATE TABLE IF NOT EXISTS social_tree_nodes (
      id TEXT PRIMARY KEY,
      parent_id TEXT DEFAULT NULL,
      type TEXT NOT NULL DEFAULT 'link',
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      platform TEXT DEFAULT 'custom',
      url TEXT DEFAULT '',
      icon TEXT DEFAULT '',
      badge TEXT DEFAULT '',
      color TEXT DEFAULT '',
      is_enabled INTEGER DEFAULT 1,
      is_expanded_default INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_social_tree_parent ON social_tree_nodes(parent_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_social_tree_sort ON social_tree_nodes(sort_order)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_social_tree_enabled ON social_tree_nodes(is_enabled)`);

  // Seed default social tree structure if empty
  try {
    const socialCount = await client.execute("SELECT COUNT(*) as count FROM social_tree_nodes");
    if (Number(socialCount.rows[0]?.count || 0) === 0) {
      const defaultSocialNodes = [
        // 1. Group: Main Social Channels
        {
          id: "group-main-socials",
          parent_id: null,
          type: "group",
          title: "Main Socials",
          subtitle: "Official social media channels",
          platform: "custom",
          url: "",
          icon: "share-2",
          badge: "Active",
          color: "#3b82f6",
          is_enabled: 1,
          is_expanded_default: 1,
          sort_order: 1
        },
        {
          id: "link-instagram",
          parent_id: "group-main-socials",
          type: "link",
          title: "Instagram",
          subtitle: "@spsstudio · Daily Shoots & Stories",
          platform: "instagram",
          url: "https://instagram.com/spsstudio",
          icon: "instagram",
          badge: "Daily",
          color: "#E4405F",
          is_enabled: 1,
          is_expanded_default: 1,
          sort_order: 1
        },
        {
          id: "link-facebook",
          parent_id: "group-main-socials",
          type: "link",
          title: "Facebook",
          subtitle: "SPS Real Estate Studio Community",
          platform: "facebook",
          url: "https://facebook.com/spsstudio",
          icon: "facebook",
          badge: "",
          color: "#1877F2",
          is_enabled: 1,
          is_expanded_default: 1,
          sort_order: 2
        },
        {
          id: "link-youtube",
          parent_id: "group-main-socials",
          type: "link",
          title: "YouTube",
          subtitle: "4K Cinematic Property Tours & Walkthroughs",
          platform: "youtube",
          url: "https://youtube.com/@spsstudio",
          icon: "youtube",
          badge: "4K Video",
          color: "#FF0000",
          is_enabled: 1,
          is_expanded_default: 1,
          sort_order: 3
        },
        {
          id: "link-tiktok",
          parent_id: "group-main-socials",
          type: "link",
          title: "TikTok",
          subtitle: "Short-form luxury architecture teasers",
          platform: "tiktok",
          url: "https://tiktok.com/@spsstudio",
          icon: "video",
          badge: "Trending",
          color: "#000000",
          is_enabled: 1,
          is_expanded_default: 1,
          sort_order: 4
        },

        // 2. Group: Professional & Portfolio
        {
          id: "group-pro-portfolios",
          parent_id: null,
          type: "group",
          title: "Professional & Portfolios",
          subtitle: "Commercial networks & showcase galleries",
          platform: "custom",
          url: "",
          icon: "briefcase",
          badge: "B2B",
          color: "#0A66C2",
          is_enabled: 1,
          is_expanded_default: 1,
          sort_order: 2
        },
        {
          id: "link-linkedin",
          parent_id: "group-pro-portfolios",
          type: "link",
          title: "LinkedIn",
          subtitle: "Commercial Partnerships & Agency Relations",
          platform: "linkedin",
          url: "https://linkedin.com/company/spsstudio",
          icon: "linkedin",
          badge: "Network",
          color: "#0A66C2",
          is_enabled: 1,
          is_expanded_default: 1,
          sort_order: 1
        },
        {
          id: "link-vimeo",
          parent_id: "group-pro-portfolios",
          type: "link",
          title: "Vimeo Showcase",
          subtitle: "High-Bitrate Uncompressed HDR Master Video",
          platform: "vimeo",
          url: "https://vimeo.com/spsstudio",
          icon: "video",
          badge: "HDR",
          color: "#1AB7EA",
          is_enabled: 1,
          is_expanded_default: 1,
          sort_order: 2
        },
        {
          id: "link-pinterest",
          parent_id: "group-pro-portfolios",
          type: "link",
          title: "Pinterest Moodboards",
          subtitle: "Interior Styling & Architectural Inspo",
          platform: "pinterest",
          url: "https://pinterest.com/spsstudio",
          icon: "image",
          badge: "",
          color: "#E60023",
          is_enabled: 1,
          is_expanded_default: 1,
          sort_order: 3
        },

        // 3. Group: Direct Messaging & Quotes
        {
          id: "group-direct-chat",
          parent_id: null,
          type: "group",
          title: "Direct Messengers",
          subtitle: "Fast response direct messaging channels",
          platform: "custom",
          url: "",
          icon: "message-circle",
          badge: "Instant",
          color: "#25D366",
          is_enabled: 1,
          is_expanded_default: 1,
          sort_order: 3
        },
        {
          id: "link-whatsapp",
          parent_id: "group-direct-chat",
          type: "link",
          title: "WhatsApp Business",
          subtitle: "Quick Shoot Booking & Instant Estimates",
          platform: "whatsapp",
          url: "https://wa.me/36301234567",
          icon: "message-square",
          badge: "Fast Reply",
          color: "#25D366",
          is_enabled: 1,
          is_expanded_default: 1,
          sort_order: 1
        },
        {
          id: "link-telegram",
          parent_id: "group-direct-chat",
          type: "link",
          title: "Telegram Channel",
          subtitle: "Announcements, Drop Offs & Backstage",
          platform: "telegram",
          url: "https://t.me/spsstudio",
          icon: "send",
          badge: "",
          color: "#229ED9",
          is_enabled: 1,
          is_expanded_default: 1,
          sort_order: 2
        }
      ];

      for (const node of defaultSocialNodes) {
        await client.execute({
          sql: `INSERT INTO social_tree_nodes 
                (id, parent_id, type, title, subtitle, platform, url, icon, badge, color, is_enabled, is_expanded_default, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            node.id,
            node.parent_id,
            node.type,
            node.title,
            node.subtitle,
            node.platform,
            node.url,
            node.icon,
            node.badge,
            node.color,
            node.is_enabled,
            node.is_expanded_default,
            node.sort_order
          ]
        });
      }
    }
  } catch (e) {
    console.error("Failed to seed default social tree nodes:", e);
  }

  // Email logs table for tracking transactional email activity
  await client.execute(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      recipient TEXT NOT NULL,
      sender TEXT NOT NULL,
      subject TEXT NOT NULL,
      template_id TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Email templates table for editable transactional emails
  await client.execute(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY,
      template_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'transactional',
      description TEXT,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT NOT NULL,
      available_tokens TEXT NOT NULL,
      sample_data TEXT NOT NULL,
      token_defaults TEXT NOT NULL DEFAULT '{}',
      version INTEGER DEFAULT 1,
      is_customized BOOLEAN DEFAULT 0,
      last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT DEFAULT 'system'
    )
  `);

  // Automated Google review requests started after a gallery-ready delivery.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS google_review_campaigns (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      project_name TEXT NOT NULL,
      tracking_token TEXT UNIQUE NOT NULL,
      destination_url TEXT NOT NULL,
      app_origin TEXT NOT NULL,
      gallery_ready_sent_at DATETIME NOT NULL,
      next_sequence INTEGER DEFAULT 0,
      next_send_at DATETIME NOT NULL,
      last_sent_at DATETIME,
      clicked_at DATETIME,
      completed_at DATETIME,
      status TEXT DEFAULT 'pending',
      processing_started_at DATETIME,
      last_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_google_review_campaign_due ON google_review_campaigns(status, next_send_at)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_google_review_campaign_project ON google_review_campaigns(project_id)`);

  // Password reset tokens table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Magic Link tokens table for passwordless sign-up and login
  await client.execute(`
    CREATE TABLE IF NOT EXISTS magic_links (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      user_id TEXT,
      token TEXT NOT NULL UNIQUE,
      type TEXT DEFAULT 'signup',
      property_address TEXT DEFAULT '',
      advertisement_link TEXT DEFAULT '',
      properties_json TEXT DEFAULT '[]',
      ip_address TEXT DEFAULT '',
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // One-time compatibility migration for accounts originally created by a
  // signup magic link. Their bcrypt value is a random placeholder, not a
  // client-chosen password, so settings must offer "add password" instead of
  // asking for a current password the client never knew.
  try {
    const passwordModeMigration = await client.execute({
      sql: "SELECT value FROM settings WHERE key = ? LIMIT 1",
      args: ["migration_password_auth_mode_v1"],
    });
    if (passwordModeMigration.rows.length === 0) {
      await client.execute(`
        UPDATE users
        SET password_auth_enabled = 0
        WHERE role = 'client'
          AND EXISTS (
            SELECT 1 FROM magic_links ml
            WHERE LOWER(TRIM(ml.email)) = LOWER(TRIM(users.email))
              AND ml.type = 'signup'
              AND ml.used_at IS NOT NULL
              AND ABS(strftime('%s', COALESCE(users.created_at, ml.used_at)) - strftime('%s', ml.used_at)) <= 600
          )
      `);
      await client.execute({
        sql: "INSERT INTO settings (key, value) VALUES (?, ?)",
        args: ["migration_password_auth_mode_v1", new Date().toISOString()],
      });
    }
  } catch (passwordModeMigrationError) {
    console.warn("[DB Setup] Password-auth mode migration notice:", passwordModeMigrationError);
  }

  try {
    await client.execute("ALTER TABLE magic_links ADD COLUMN properties_json TEXT DEFAULT '[]'");
  } catch (e) {}

  // Add index on magic_links token and email if possible
  try {
    await client.execute("CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email)");
  } catch (e) {
    // Indexes might already exist or not supported in current mode
  }

  // Account verification tokens table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS account_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Admin & Team user invitations table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'editor',
      workspace TEXT DEFAULT 'Main Studio',
      team_id TEXT DEFAULT NULL,
      custom_message TEXT DEFAULT '',
      token TEXT NOT NULL UNIQUE,
      inviter_id TEXT,
      inviter_email TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at DATETIME NOT NULL,
      used_at DATETIME DEFAULT NULL,
      revoked_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await client.execute("CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status)");
  } catch (e) {
    // Indexes might already exist or not supported
  }

  // Pricing plans table (plans, tiers, bundles)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS pricing_plans (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'tier',
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      description TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      original_price REAL DEFAULT NULL,
      currency TEXT DEFAULT 'USD',
      billing_type TEXT DEFAULT 'one_time',
      billing_period TEXT DEFAULT 'project',
      discount_label TEXT DEFAULT '',
      features TEXT DEFAULT '[]',
      included_items TEXT DEFAULT '[]',
      cta_label TEXT DEFAULT 'Get Started',
      cta_url TEXT DEFAULT '#contact',
      message_template_en TEXT DEFAULT '',
      message_template_hu TEXT DEFAULT '',
      is_featured INTEGER DEFAULT 0,
      featured_badge TEXT DEFAULT '',
      is_enabled INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await client.execute("ALTER TABLE pricing_plans ADD COLUMN message_template_en TEXT DEFAULT ''");
  } catch (e) {}

  try {
    await client.execute("ALTER TABLE pricing_plans ADD COLUMN bundle_services TEXT DEFAULT '[]'");
  } catch (e) {}

  // Extra services table (add-ons)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS pricing_extra_services (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'General',
      icon TEXT DEFAULT 'sparkles',
      price REAL NOT NULL DEFAULT 0,
      price_type TEXT DEFAULT 'fixed',
      billing_type TEXT DEFAULT 'one_time',
      original_price REAL DEFAULT NULL,
      currency TEXT DEFAULT 'USD',
      unit TEXT DEFAULT 'item',
      allow_quantity INTEGER DEFAULT 1,
      min_quantity INTEGER DEFAULT 1,
      max_quantity INTEGER DEFAULT 99,
      is_featured INTEGER DEFAULT 0,
      is_enabled INTEGER DEFAULT 1,
      show_on_pricing_page INTEGER DEFAULT 1,
      restricted_plans TEXT DEFAULT '[]',
      restricted_roles TEXT DEFAULT '[]',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await client.execute("ALTER TABLE pricing_extra_services ADD COLUMN price_type TEXT DEFAULT 'fixed'");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE pricing_extra_services ADD COLUMN billing_type TEXT DEFAULT 'one_time'");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE pricing_extra_services ADD COLUMN show_on_pricing_page INTEGER DEFAULT 1");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE pricing_extra_services ADD COLUMN restricted_plans TEXT DEFAULT '[]'");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE pricing_extra_services ADD COLUMN restricted_roles TEXT DEFAULT '[]'");
  } catch (e) {}

  // Fixed and distance-based fee rules table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS pricing_fee_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      fee_type TEXT NOT NULL DEFAULT 'distance_tiered',
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      unit TEXT DEFAULT 'km',
      min_distance REAL DEFAULT 0,
      min_fee REAL DEFAULT 0,
      max_distance REAL DEFAULT NULL,
      tiers TEXT DEFAULT '[]',
      applicable_conditions TEXT DEFAULT 'all',
      applicable_plans TEXT DEFAULT '[]',
      applicable_regions TEXT DEFAULT '',
      applicable_order_types TEXT DEFAULT 'all',
      min_order_amount REAL DEFAULT NULL,
      max_order_amount REAL DEFAULT NULL,
      is_mandatory INTEGER DEFAULT 1,
      is_default_active INTEGER DEFAULT 1,
      is_enabled INTEGER DEFAULT 1,
      show_on_pricing_page INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await client.execute("ALTER TABLE pricing_fee_rules ADD COLUMN is_mandatory INTEGER DEFAULT 1");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE pricing_fee_rules ADD COLUMN applicable_plans TEXT DEFAULT '[]'");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE pricing_fee_rules ADD COLUMN applicable_regions TEXT DEFAULT ''");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE pricing_fee_rules ADD COLUMN applicable_order_types TEXT DEFAULT 'all'");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE pricing_fee_rules ADD COLUMN min_order_amount REAL DEFAULT NULL");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE pricing_fee_rules ADD COLUMN max_order_amount REAL DEFAULT NULL");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE pricing_fee_rules ADD COLUMN show_on_pricing_page INTEGER DEFAULT 1");
  } catch (e) {}

  // Seed default extra services if empty
  try {
    const extraCount = await client.execute("SELECT COUNT(*) as count FROM pricing_extra_services");
    if (Number(extraCount.rows[0]?.count || 0) === 0) {
      const defaultExtras = [
        {
          id: "extra-twilight",
          title: JSON.stringify({
            en: "Golden Hour / Twilight Photoshoot",
            hu: "Aranyóra / Alkonyati Fotózás"
          }),
          subtitle: JSON.stringify({
            en: "4-6 high-impact evening exterior photographs",
            hu: "4-6 prémium hangulatú esti külső fotó"
          }),
          description: "Captures the warm interior glow and dramatic sunset sky to maximize listing visual appeal.",
          category: "Photography",
          icon: "moon",
          price: 120,
          original_price: 150,
          currency: "USD",
          unit: "shoot",
          allow_quantity: 0,
          min_quantity: 1,
          max_quantity: 1,
          is_featured: 1,
          sort_order: 1
        },
        {
          id: "extra-aerial-pack",
          title: JSON.stringify({
            en: "Aerial Drone Stills Pack",
            hu: "Drónos Légi Fotó Csomag"
          }),
          subtitle: JSON.stringify({
            en: "5 ultra-high-resolution 48MP drone images",
            hu: "5 db nagyfelbontású 48MP légi felvétel"
          }),
          description: "Showcases property boundaries, topography, lot layout, and neighborhood amenities.",
          category: "Aerial",
          icon: "helicopter",
          price: 95,
          original_price: null,
          currency: "USD",
          unit: "pack",
          allow_quantity: 1,
          min_quantity: 1,
          max_quantity: 5,
          is_featured: 1,
          sort_order: 2
        },
        {
          id: "extra-floorplan-2d3d",
          title: JSON.stringify({
            en: "2D & 3D Schematic Floor Plan",
            hu: "2D & 3D Alaprajz és Helyiségméretek"
          }),
          subtitle: JSON.stringify({
            en: "Accurate architectural floor layout with dimensions",
            hu: "Pontos méretezett építészeti alaprajz"
          }),
          description: "Delivered in print-ready vector PDF and high-res web PNG with room measurements and total area.",
          category: "Planning",
          icon: "ruler",
          price: 85,
          original_price: null,
          currency: "USD",
          unit: "floor",
          allow_quantity: 1,
          min_quantity: 1,
          max_quantity: 10,
          is_featured: 0,
          sort_order: 3
        },
        {
          id: "extra-virtual-staging",
          title: JSON.stringify({
            en: "Virtual Staging per Room",
            hu: "Virtuális Bútorozás (szobánként)"
          }),
          subtitle: JSON.stringify({
            en: "Photorealistic designer furniture for vacant spaces",
            hu: "Fotorealisztikus berendezés üres helyiségekhez"
          }),
          description: "Transforms cold, empty rooms into inviting luxury spaces that inspire prospective buyers.",
          category: "Digital",
          icon: "couch",
          price: 45,
          original_price: 60,
          currency: "USD",
          unit: "room",
          allow_quantity: 1,
          min_quantity: 1,
          max_quantity: 15,
          is_featured: 0,
          sort_order: 4
        },
        {
          id: "extra-social-reel",
          title: JSON.stringify({
            en: "Instagram & TikTok 4K Reel (60s)",
            hu: "Közösségi Média 4K Videó Reel (60s)"
          }),
          subtitle: JSON.stringify({
            en: "Engaging 9:16 vertical walkthrough tour with music",
            hu: "9:16 vertikális ingatlan bemutató videó jogtiszta zenével"
          }),
          description: "Fast-paced vertical highlight reel formatted and color-graded specifically for mobile discovery.",
          category: "Video",
          icon: "video",
          price: 160,
          original_price: 190,
          currency: "USD",
          unit: "reel",
          allow_quantity: 1,
          min_quantity: 1,
          max_quantity: 3,
          is_featured: 1,
          sort_order: 5
        },
        {
          id: "extra-rush-delivery",
          title: JSON.stringify({
            en: "Express 12-Hour Priority Delivery",
            hu: "Expressz 12 Órás Sürgősségi Átadás"
          }),
          subtitle: JSON.stringify({
            en: "Guaranteed same-day/next-morning asset delivery",
            hu: "Garantált aznapi / másnap reggeli képfeldolgozás"
          }),
          description: "Skip the queue with expedited high-priority editing and private cloud download link.",
          category: "Speed",
          icon: "zap",
          price: 75,
          original_price: null,
          currency: "USD",
          unit: "order",
          allow_quantity: 0,
          min_quantity: 1,
          max_quantity: 1,
          is_featured: 0,
          sort_order: 6
        }
      ];

      for (const e of defaultExtras) {
        await client.execute({
          sql: `INSERT INTO pricing_extra_services (
                  id, title, subtitle, description, category, icon, price, original_price,
                  currency, unit, allow_quantity, min_quantity, max_quantity, is_featured, is_enabled, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          args: [
            e.id, e.title, e.subtitle, e.description, e.category, e.icon, e.price,
            e.original_price, e.currency, e.unit, e.allow_quantity, e.min_quantity,
            e.max_quantity, e.is_featured, e.sort_order
          ]
        });
      }
    }
  } catch (e) {
    console.error("Failed to seed default extra services:", e);
  }

  // Seed default fee rules if empty
  try {
    const feesCount = await client.execute("SELECT COUNT(*) as count FROM pricing_fee_rules");
    if (Number(feesCount.rows[0]?.count || 0) === 0) {
      const defaultFees = [
        {
          id: "fee-travel-distance",
          name: JSON.stringify({
            en: "Route Travel & Mileage Fee",
            hu: "Kiszállási & Útiköltség Díjszabás"
          }),
          description: JSON.stringify({
            en: "Calculated based on driving distance from our central studio headquarters. First 15 km is free of charge.",
            hu: "A stúdió központjától mért távolság alapján számolva. Az első 15 km díjmentes."
          }),
          fee_type: "distance_tiered",
          amount: 1.25,
          currency: "USD",
          unit: "km",
          min_distance: 15,
          min_fee: 0,
          max_distance: 300,
          tiers: JSON.stringify([
            { from_km: 0, to_km: 15, rate_per_km: 0 },
            { from_km: 15, to_km: 50, rate_per_km: 1.25 },
            { from_km: 50, to_km: null, rate_per_km: 1.65 }
          ]),
          applicable_conditions: "all",
          is_default_active: 1,
          is_enabled: 1,
          sort_order: 1
        },
        {
          id: "fee-cloud-delivery",
          name: JSON.stringify({
            en: "Digital Asset Cloud Archiving & Licensing",
            hu: "Digitális Felhő Tárhely & Licencelés"
          }),
          description: JSON.stringify({
            en: "Full resolution RAW & HDR digital download link with lifetime commercial usage license.",
            hu: "Teljes felbontású digitális letöltési csomag élethosszig tartó kereskedelmi felhasználási joggal."
          }),
          fee_type: "fixed",
          amount: 0,
          currency: "USD",
          unit: "order",
          min_distance: 0,
          min_fee: 0,
          max_distance: null,
          tiers: "[]",
          applicable_conditions: "all",
          is_default_active: 1,
          is_enabled: 1,
          sort_order: 2
        }
      ];

      for (const f of defaultFees) {
        await client.execute({
          sql: `INSERT INTO pricing_fee_rules (
                  id, name, description, fee_type, amount, currency, unit,
                  min_distance, min_fee, max_distance, tiers, applicable_conditions,
                  is_default_active, is_enabled, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            f.id, f.name, f.description, f.fee_type, f.amount, f.currency, f.unit,
            f.min_distance, f.min_fee, f.max_distance, f.tiers, f.applicable_conditions,
            f.is_default_active, f.is_enabled, f.sort_order
          ]
        });
      }
    }
  } catch (e) {
    console.error("Failed to seed default fee rules:", e);
  }

  try {
    await client.execute(`
      UPDATE pricing_plans 
      SET message_template_en = 'I am interested in the {plan_name} package ({price}). Please contact me with more details.' 
      WHERE message_template_en IS NULL OR message_template_en = ''
    `);
  } catch (e) {}

  try {
    await client.execute(`
      UPDATE pricing_plans 
      SET message_template_hu = 'Érdeklődöm a(z) {plan_name} csomag ({price}) iránt. Kérem, vegyék fel velem a kapcsolatot a részletekkel kapcsolatban.' 
      WHERE message_template_hu IS NULL OR message_template_hu = ''
    `);
  } catch (e) {}

  // Seed default pricing plans if table is empty
  try {
    const pricingCount = await client.execute("SELECT COUNT(*) as count FROM pricing_plans");
    if (Number(pricingCount.rows[0]?.count || 0) === 0) {
      const defaultPlans = [
        {
          id: "plan-essential",
          type: "tier",
          title: JSON.stringify({
            en: "Essential Photography",
            hu: "Alap Fotózási Csomag",
            de: "Basis Fotografie",
            es: "Fotografía Esencial",
            fr: "Photographie Essentielle"
          }),
          subtitle: JSON.stringify({
            en: "Perfect for apartments and smaller residential listings",
            hu: "Ideális lakásokhoz és kisebb lakóingatlanokhoz",
            de: "Perfekt für Wohnungen und kleinere Wohnimmobilien",
            es: "Perfecto para apartamentos y propiedades residenciales",
            fr: "Parfait pour appartements et biens résidentiels"
          }),
          description: "Essential high-impact HDR photography package.",
          price: 199,
          original_price: null,
          currency: "USD",
          billing_type: "one_time",
          billing_period: "project",
          discount_label: "",
          features: JSON.stringify([
            "Up to 25 HDR Wide-Angle Photos",
            "24-Hour Guaranteed Turnaround",
            "Blue Sky & Lawn Enhancement",
            "Print & MLS Web-Ready Resolutions",
            "Private Client Download Portal"
          ]),
          included_items: JSON.stringify([]),
          cta_label: "Book Essential",
          cta_url: "#contact",
          is_featured: 0,
          featured_badge: "",
          is_enabled: 1,
          sort_order: 1
        },
        {
          id: "plan-pro-showcase",
          type: "tier",
          title: JSON.stringify({
            en: "Pro Showcase Tier",
            hu: "Profi Bemutató Csomag",
            de: "Profi Präsentationspaket",
            es: "Nivel Profesional",
            fr: "Pack Vitrine Pro"
          }),
          subtitle: JSON.stringify({
            en: "Complete visual marketing for premier home listings",
            hu: "Teljes vizuális marketing prémium ingatlanokhoz",
            de: "Umfassendes visuelles Marketing für Premium-Immobilien",
            es: "Marketing visual completo para propiedades destacadas",
            fr: "Marketing visuel complet pour résidences de standing"
          }),
          description: "Comprehensive photo, video, and drone showcase.",
          price: 349,
          original_price: null,
          currency: "USD",
          billing_type: "one_time",
          billing_period: "project",
          discount_label: "",
          features: JSON.stringify([
            "Up to 40 HDR High-Res Photos",
            "Cinematic 4K Walkthrough Video (60s)",
            "5 FAA-Certified Aerial Drone Shots",
            "Schematic 2D Floor Plan with Measurements",
            "Rush Next-Morning Delivery",
            "Social Media Reel / Story Cut"
          ]),
          included_items: JSON.stringify([]),
          cta_label: "Book Pro Tier",
          cta_url: "#contact",
          is_featured: 1,
          featured_badge: "Most Popular",
          is_enabled: 1,
          sort_order: 2
        },
        {
          id: "plan-luxury-estate",
          type: "tier",
          title: JSON.stringify({
            en: "Luxury Estate Tier",
            hu: "Luxus Birtok Csomag",
            de: "Luxus Anwesen Paket",
            es: "Nivel Finca de Lujo",
            fr: "Pack Propriété de Prestige"
          }),
          subtitle: JSON.stringify({
            en: "All-inclusive media production for luxury and commercial estates",
            hu: "Mindent magában foglaló médiaprodukció luxus és kereskedelmi ingatlanokhoz",
            de: "All-Inclusive-Medienproduktion für Luxus- und Gewerbeimmobilien",
            es: "Producción multimedia integral para fincas de lujo",
            fr: "Production média tout compris pour demeures de prestige"
          }),
          description: "Signature luxury estate multimedia suite.",
          price: 599,
          original_price: null,
          currency: "USD",
          billing_type: "one_time",
          billing_period: "project",
          discount_label: "",
          features: JSON.stringify([
            "Unlimited HDR Interior & Exterior Photos",
            "Cinematic 4K Video Tour + FPV Drone",
            "Dedicated Twilight / Golden Hour Shoot",
            "2D & 3D Interactive Floor Plans",
            "Virtual Staging (2 rooms included)",
            "Branded Single-Property Website",
            "VIP Dedicated Account Manager"
          ]),
          included_items: JSON.stringify([]),
          cta_label: "Book Luxury",
          cta_url: "#contact",
          is_featured: 0,
          featured_badge: "Signature",
          is_enabled: 1,
          sort_order: 3
        },
        {
          id: "bundle-complete-media",
          type: "bundle",
          title: JSON.stringify({
            en: "Complete Media Bundle",
            hu: "Teljes Média Csomagajánlat",
            de: "Komplettes Medien-Bundle",
            es: "Paquete Multimedia Completo",
            fr: "Pack Média Intégral"
          }),
          subtitle: JSON.stringify({
            en: "Save on Photography + Aerial Drone + 2D Floor Plan combined",
            hu: "Takarítson meg a Fotózás + Drón + 2D Alaprajz együttes megrendelésével",
            de: "Sparen Sie bei Fotografie + Drohne + 2D-Grundriss im Bundle",
            es: "Ahorre combinando Fotografía + Dron + Plano 2D",
            fr: "Économisez en combinant Photo + Drone + Plan 2D"
          }),
          description: "All-in-one popular services bundle at a discounted rate.",
          price: 449,
          original_price: 570,
          currency: "USD",
          billing_type: "one_time",
          billing_period: "package",
          discount_label: "Save $121 (21% OFF)",
          features: JSON.stringify([
            "Full Photo Gallery (35+ edited photos)",
            "Licensed Aerial Drone Perspectives",
            "Accurate 2D Architectural Floor Plan",
            "Next-Morning 9:00 AM Delivery Guarantee",
            "Commercial Marketing & MLS Rights Included"
          ]),
          included_items: JSON.stringify([
            "Professional Photography",
            "Drone & Aerial Views",
            "Floor Plans"
          ]),
          bundle_services: JSON.stringify([
            {
              tier_id: "plan-essential",
              item_type: "tier",
              service_title: "Essential Photography",
              quantity: 1,
              original_price: 199,
              features: [
                "Up to 25 HDR Wide-Angle Photos",
                "24-Hour Guaranteed Turnaround",
                "Blue Sky & Lawn Enhancement"
              ]
            },
            {
              service_id: "extra-aerial-pack",
              item_type: "extra",
              service_title: "Aerial Drone Stills Pack",
              quantity: 1,
              original_price: 95,
              features: [
                "5 Ultra-HD 48MP Drone Images",
                "Licensed & Certified FAA Pilot",
                "Property Boundary Perspectives"
              ]
            },
            {
              service_id: "extra-floorplan-2d3d",
              item_type: "extra",
              service_title: "2D & 3D Schematic Floor Plan",
              quantity: 1,
              original_price: 85,
              features: [
                "Accurate Architectural Measurements",
                "High-Resolution Web & Print Formats",
                "Room Dimensions & Total Area"
              ]
            }
          ]),
          cta_label: "Get Complete Bundle",
          cta_url: "#contact",
          is_featured: 1,
          featured_badge: "Best Value Bundle",
          is_enabled: 1,
          sort_order: 4
        },
        {
          id: "bundle-twilight-staging",
          type: "bundle",
          title: JSON.stringify({
            en: "Twilight & Virtual Staging Bundle",
            hu: "Alkonyati & Virtuális Berendezés Csomag",
            de: "Dämmerung & Virtuelles Staging Bundle",
            es: "Paquete Atardecer & Virtual Staging",
            fr: "Pack Crépuscule & Home Staging Virtuel"
          }),
          subtitle: JSON.stringify({
            en: "Dramatic evening atmosphere combined with 3 virtually furnished rooms",
            hu: "Drámai esti hangulat 3 virtuálisan berendezett szobával kombinálva",
            de: "Dramatische Abendstimmung kombiniert mit 3 virtuell eingerichteten Räumen",
            es: "Atmósfera nocturna combinada con 3 estancias amuebladas virtualmente",
            fr: "Atmosphère crépusculaire et 3 pièces meublées virtuellement"
          }),
          description: "Twilight photography and virtual interior design bundle.",
          price: 399,
          original_price: 490,
          currency: "USD",
          billing_type: "one_time",
          billing_period: "package",
          discount_label: "Save $91 (19% OFF)",
          features: JSON.stringify([
            "Sunset / Golden Hour On-Site Shoot",
            "3 Virtually Staged Rooms (Modern / Contemporary)",
            "Custom Fireplace & Interior Glow Effects",
            "High-Engagement Social Media Formats",
            "Unlimited Revision on Virtual Staging"
          ]),
          included_items: JSON.stringify([
            "Twilight Photography",
            "Virtual Staging (3 Rooms)",
            "Social Media Assets"
          ]),
          bundle_services: JSON.stringify([
            {
              service_id: "extra-twilight",
              item_type: "extra",
              service_title: "Golden Hour / Twilight Photoshoot",
              quantity: 1,
              original_price: 120,
              features: [
                "4-6 Sunset & Dusk Exterior Stills",
                "Warm Glow Window Lighting"
              ]
            },
            {
              service_id: "extra-virtual-staging",
              item_type: "extra",
              service_title: "Virtual Staging per Room",
              quantity: 3,
              original_price: 45,
              features: [
                "3 Fully Furnished Vacant Rooms",
                "Modern High-End Designer Styles"
              ]
            },
            {
              service_id: "extra-social-reel",
              item_type: "extra",
              service_title: "Instagram & TikTok 4K Reel (60s)",
              quantity: 1,
              original_price: 160,
              features: [
                "60s 9:16 Vertical Video with Licensed Audio",
                "Optimized for High Engagement"
              ]
            }
          ]),
          cta_label: "Get Twilight Bundle",
          cta_url: "#contact",
          is_featured: 0,
          featured_badge: "Specialty",
          is_enabled: 1,
          sort_order: 5
        }
      ];

      for (const p of defaultPlans) {
        await client.execute({
          sql: `INSERT INTO pricing_plans (
                  id, type, title, subtitle, description, price, original_price, currency,
                  billing_type, billing_period, discount_label, features, included_items, bundle_services,
                  cta_label, cta_url, is_featured, featured_badge, is_enabled, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            p.id,
            p.type,
            p.title,
            p.subtitle,
            p.description,
            p.price,
            p.original_price,
            p.currency,
            p.billing_type,
            p.billing_period,
            p.discount_label,
            p.features,
            p.included_items,
            p.bundle_services || "[]",
            p.cta_label,
            p.cta_url,
            p.is_featured,
            p.featured_badge,
            p.is_enabled,
            p.sort_order
          ]
        });
      }
    }
  } catch (e) {
    console.error("Failed to seed default pricing plans:", e);
  }

  // Ensure existing bundles have valid bundle_services populated if empty
  try {
    const completeMediaBundleServices = JSON.stringify([
      {
        tier_id: "plan-essential",
        item_type: "tier",
        service_title: "Essential Photography",
        quantity: 1,
        original_price: 199,
        features: [
          "Up to 25 HDR Wide-Angle Photos",
          "24-Hour Guaranteed Turnaround",
          "Blue Sky & Lawn Enhancement"
        ]
      },
      {
        service_id: "extra-aerial-pack",
        item_type: "extra",
        service_title: "Aerial Drone Stills Pack",
        quantity: 1,
        original_price: 95,
        features: [
          "5 Ultra-HD 48MP Drone Images",
          "Licensed & Certified FAA Pilot"
        ]
      },
      {
        service_id: "extra-floorplan-2d3d",
        item_type: "extra",
        service_title: "2D & 3D Schematic Floor Plan",
        quantity: 1,
        original_price: 85,
        features: [
          "Accurate Architectural Measurements",
          "Room Dimensions & Area Layout"
        ]
      }
    ]);

    const twilightBundleServices = JSON.stringify([
      {
        service_id: "extra-twilight",
        item_type: "extra",
        service_title: "Golden Hour / Twilight Photoshoot",
        quantity: 1,
        original_price: 120,
        features: [
          "4-6 Sunset & Dusk Exterior Stills",
          "Warm Glow Window Lighting"
        ]
      },
      {
        service_id: "extra-virtual-staging",
        item_type: "extra",
        service_title: "Virtual Staging per Room",
        quantity: 3,
        original_price: 45,
        features: [
          "3 Fully Furnished Vacant Rooms",
          "Modern High-End Designer Styles"
        ]
      },
      {
        service_id: "extra-social-reel",
        item_type: "extra",
        service_title: "Instagram & TikTok 4K Reel (60s)",
        quantity: 1,
        original_price: 160,
        features: [
          "60s 9:16 Vertical Video with Licensed Audio"
        ]
      }
    ]);

    await client.execute({
      sql: `UPDATE pricing_plans 
            SET bundle_services = ? 
            WHERE id = 'bundle-complete-media' AND (bundle_services IS NULL OR bundle_services = '' OR bundle_services = '[]')`,
      args: [completeMediaBundleServices]
    });

    await client.execute({
      sql: `UPDATE pricing_plans 
            SET bundle_services = ? 
            WHERE id = 'bundle-twilight-staging' AND (bundle_services IS NULL OR bundle_services = '' OR bundle_services = '[]')`,
      args: [twilightBundleServices]
    });
  } catch (e) {
    console.error("Failed to migrate bundle_services for default bundles:", e);
  }

  // Seed default email settings if not present
  try {
    const defaultEmailSettings = [
      ["resend_from_email", "onboarding@resend.dev"],
      ["resend_from_name", "SPS Studio"],
      ["resend_reply_to", "contact@spsstudio.com"],
      ["admin_notification_email", "spsstudiokft@gmail.com"],
      ["email_footer_text", "SPS Studio · Premium Real Estate Visual Marketing · All rights reserved."],
      ["contact_form_show_availability", "1"],
      ["contact_form_require_availability", "0"],
      ["contact_form_availability_label", "When I would like to schedule the photoshoot"],
      ["contact_form_availability_help_text", "Please specify your preferred date and time window for the photoshoot."]
    ];

    for (const [key, val] of defaultEmailSettings) {
      const existing = await client.execute({
        sql: "SELECT value FROM settings WHERE key = ?",
        args: [key]
      });
      if (existing.rows.length === 0) {
        await client.execute({
          sql: "INSERT INTO settings (key, value) VALUES (?, ?)",
          args: [key, val]
        });
      }
    }
  } catch (e) {
    console.error("Failed to seed default email settings:", e);
  }

  // Audit Logs Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_id TEXT DEFAULT NULL,
      actor_email TEXT DEFAULT NULL,
      actor_role TEXT DEFAULT 'admin',
      details TEXT DEFAULT '{}',
      ip_address TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await client.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)");
  } catch (e) {}

  // Info Bar Categories Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS info_bar_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      bg_color TEXT NOT NULL,
      text_color TEXT NOT NULL,
      dark_bg_color TEXT DEFAULT '',
      dark_text_color TEXT DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'info',
      is_enabled INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Info Bar Messages / Announcements Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS info_bar_messages (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      text TEXT NOT NULL,
      link_url TEXT DEFAULT '',
      link_label TEXT DEFAULT '',
      link_target_blank INTEGER DEFAULT 0,
      badge_text TEXT DEFAULT '',
      start_date DATETIME DEFAULT NULL,
      end_date DATETIME DEFAULT NULL,
      is_enabled INTEGER DEFAULT 1,
      is_dismissible INTEGER DEFAULT 1,
      dismiss_scope TEXT DEFAULT 'session',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES info_bar_categories(id)
    )
  `);

  try {
    await client.execute("CREATE INDEX IF NOT EXISTS idx_info_bar_msg_cat ON info_bar_messages(category_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_info_bar_msg_enabled ON info_bar_messages(is_enabled)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_info_bar_msg_order ON info_bar_messages(sort_order)");
  } catch (e) {}

  // Seed default info bar categories if empty
  try {
    const existingCats = await client.execute("SELECT COUNT(*) as count FROM info_bar_categories");
    const count = Number(existingCats.rows[0]?.count || 0);
    if (count === 0) {
      const defaultCategories = [
        {
          id: "cat_discount",
          name: "discount",
          label: "Special Offer",
          bg_color: "#059669", // emerald-600
          text_color: "#ffffff",
          dark_bg_color: "#065f46",
          dark_text_color: "#ecfdf5",
          icon: "tag",
          is_enabled: 1,
          sort_order: 1
        },
        {
          id: "cat_info",
          name: "info",
          label: "Information",
          bg_color: "#0284c7", // sky-600
          text_color: "#ffffff",
          dark_bg_color: "#0369a1",
          dark_text_color: "#f0f9ff",
          icon: "info",
          is_enabled: 1,
          sort_order: 2
        },
        {
          id: "cat_warning",
          name: "warning",
          label: "Notice",
          bg_color: "#d97706", // amber-600
          text_color: "#ffffff",
          dark_bg_color: "#b45309",
          dark_text_color: "#fffbeb",
          icon: "alert-triangle",
          is_enabled: 1,
          sort_order: 3
        },
        {
          id: "cat_alert",
          name: "alert",
          label: "Urgent Alert",
          bg_color: "#e11d48", // rose-600
          text_color: "#ffffff",
          dark_bg_color: "#be123c",
          dark_text_color: "#fff1f2",
          icon: "alert-circle",
          is_enabled: 1,
          sort_order: 4
        },
        {
          id: "cat_promo",
          name: "promotion",
          label: "Announcement",
          bg_color: "#7c3aed", // violet-600
          text_color: "#ffffff",
          dark_bg_color: "#6d28d9",
          dark_text_color: "#f5f3ff",
          icon: "sparkles",
          is_enabled: 1,
          sort_order: 5
        }
      ];

      for (const cat of defaultCategories) {
        await client.execute({
          sql: `INSERT INTO info_bar_categories (id, name, label, bg_color, text_color, dark_bg_color, dark_text_color, icon, is_enabled, sort_order, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [
            cat.id,
            cat.name,
            cat.label,
            cat.bg_color,
            cat.text_color,
            cat.dark_bg_color,
            cat.dark_text_color,
            cat.icon,
            cat.is_enabled,
            cat.sort_order
          ]
        });
      }

      // Seed initial sample announcements
      await client.execute({
        sql: `INSERT INTO info_bar_messages (id, category_id, text, link_url, link_label, link_target_blank, badge_text, is_enabled, is_dismissible, dismiss_scope, sort_order, created_at, updated_at)
              VALUES 
              (?, 'cat_discount', '✨ Spring Studio Promotion: Book any commercial photography package this month and receive 20% off drone aerial footage!', '#pricing', 'View Packages', 0, '20% OFF', 1, 1, 'session', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
              (?, 'cat_promo', '📸 We have launched our new Virtual 3D Interactive Property Walkthroughs! Inquire today to elevate your listings.', '#contact', 'Book Studio', 0, 'NEW FEATURE', 1, 1, 'session', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [crypto.randomUUID(), crypto.randomUUID()]
      });

      console.log("[DB Setup] Seeded default info bar categories and starter announcements.");
    }
  } catch (e) {
    console.error("Failed to seed default info bar categories:", e);
  }

  // Seed default info bar settings
  try {
    const defaultInfoBarSettings: Record<string, string> = {
      info_bar_enabled: "1",
      info_bar_rotation_interval: "7",
      info_bar_pause_on_hover: "1",
      info_bar_show_indicators: "1",
      info_bar_animation: "slide"
    };

    for (const [key, val] of Object.entries(defaultInfoBarSettings)) {
      const existing = await client.execute({
        sql: "SELECT value FROM settings WHERE key = ?",
        args: [key]
      });
      if (existing.rows.length === 0) {
        await client.execute({
          sql: "INSERT INTO settings (key, value) VALUES (?, ?)",
          args: [key, val]
        });
      }
    }
  } catch (e) {
    console.error("Failed to seed default info bar settings:", e);
  }

  try {
    await client.execute("ALTER TABLE users ADD COLUMN portal_access_disabled_at DATETIME DEFAULT NULL");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE users ADD COLUMN portal_access_disabled_reason TEXT DEFAULT ''");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE users ADD COLUMN portal_access_disabled_by TEXT DEFAULT ''");
  } catch (e) {}

  try {
    await client.execute("ALTER TABLE crm_records ADD COLUMN portal_access_disabled_at DATETIME DEFAULT NULL");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE crm_records ADD COLUMN portal_access_disabled_reason TEXT DEFAULT ''");
  } catch (e) {}
  try {
    await client.execute("ALTER TABLE crm_records ADD COLUMN portal_access_disabled_by TEXT DEFAULT ''");
  } catch (e) {}

  // Auto-seed translations table from built-in dictionaries if empty
  try {
    const { translationService } = await import("./server/services/translationService.js");
    const result = await translationService.importFromHardcoded(false);
    if (result.importedCount > 0) {
      console.log(`[DB Setup] Seeded ${result.importedCount} translations across ${result.locales.length} locales (${result.keysCount} unique keys).`);
    }
  } catch (e) {
    console.error("Failed to seed initial translations into database:", e);
  }

  // ==========================================
  // Budget Manager Tables
  // ==========================================
  await client.execute(`
    CREATE TABLE IF NOT EXISTS budget_entries (
      id TEXT PRIMARY KEY,
      owner_admin_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      date TEXT NOT NULL,
      category TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planned',
      description TEXT DEFAULT '',
      color_code TEXT DEFAULT '#3B82F6',
      project_id TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_admin_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS budget_admin_settings (
      id TEXT PRIMARY KEY,
      admin_id TEXT UNIQUE NOT NULL,
      default_color TEXT DEFAULT '#3B82F6',
      default_currency TEXT DEFAULT 'USD',
      monthly_target_income REAL DEFAULT 0,
      monthly_budget_cap REAL DEFAULT 0,
      period_status TEXT DEFAULT 'in_progress',
      period_notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS budget_audit_logs (
      id TEXT PRIMARY KEY,
      entry_id TEXT,
      action TEXT NOT NULL,
      performed_by_id TEXT NOT NULL,
      performed_by_name TEXT DEFAULT '',
      performed_by_email TEXT DEFAULT '',
      details TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Internal Payment Requests Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS payment_requests (
      id TEXT PRIMARY KEY,
      request_number TEXT UNIQUE NOT NULL,
      requester_id TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_email TEXT NOT NULL,
      requester_avatar TEXT DEFAULT '',
      requester_role TEXT DEFAULT 'admin',
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      category TEXT DEFAULT 'general',
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  try {
    await client.execute("CREATE INDEX IF NOT EXISTS idx_budget_entries_owner ON budget_entries(owner_admin_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_budget_entries_date ON budget_entries(date)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_budget_entries_type ON budget_entries(type)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_budget_entries_status ON budget_entries(status)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_budget_audit_entry ON budget_audit_logs(entry_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_budget_audit_user ON budget_audit_logs(performed_by_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_payment_requests_requester ON payment_requests(requester_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_payment_requests_created ON payment_requests(created_at)");
  } catch (e) {}

  // Remove legacy starter/demo data. New installations intentionally start
  // with an empty budget ledger; real entries are never auto-generated.
  try {
    const demoDescriptions = [
      "Luxury Penthouse 3D Tour & Sunset Aerial Shoot",
      "Commercial Real Estate Staging Package - Downtown",
      "Scheduled Residential Listing Photoshoot (Suburban Estate)",
      "Matterport Pro & Adobe Creative Cloud monthly licenses",
      "Gimbal Stabilizer Battery Packs & High-Speed SD Cards",
      "Highway tolls & fuel allocation for upstate estate shoot",
      "Architectural Interior Portfolio Shoot",
      "Wireless Lavalier Microphone System Kit",
    ];
    const placeholders = demoDescriptions.map(() => "?").join(",");
    const demoEntries = await client.execute({
      sql: `SELECT id FROM budget_entries
            WHERE description IN (${placeholders})
               OR id IN (
                 SELECT entry_id FROM budget_audit_logs
                 WHERE details LIKE '%Initial starter budget entry provisioned%'
               )`,
      args: demoDescriptions,
    });
    const demoIds = demoEntries.rows.map((row) => String(row.id));
    if (demoIds.length > 0) {
      const idPlaceholders = demoIds.map(() => "?").join(",");
      await client.execute({
        sql: `UPDATE payment_requests SET linked_budget_entry_id = NULL
              WHERE linked_budget_entry_id IN (${idPlaceholders})`,
        args: demoIds,
      });
      await client.execute({
        sql: `UPDATE invoices SET budget_entry_id = NULL
              WHERE budget_entry_id IN (${idPlaceholders})`,
        args: demoIds,
      });
      await client.execute({
        sql: `DELETE FROM budget_audit_logs WHERE entry_id IN (${idPlaceholders})`,
        args: demoIds,
      });
      await client.execute({
        sql: `DELETE FROM budget_entries WHERE id IN (${idPlaceholders})`,
        args: demoIds,
      });
      console.log(`[DB Setup] Removed ${demoIds.length} legacy demo budget entries.`);
    }
    await client.execute(`
      DELETE FROM budget_admin_settings
      WHERE period_notes = 'Q3 Photography & Visual Production Operations'
        AND default_currency = 'USD'
        AND monthly_target_income = 5000
        AND monthly_budget_cap = 2000
    `);
  } catch (cleanupErr) {
    console.warn("[DB Setup] Legacy budget demo cleanup note:", cleanupErr);
  }

  // =========================================================================
  // TIERED REFERRAL & INVITE SYSTEM SCHEMA (v8)
  // =========================================================================
  try {
    // 1. Add referral columns to users table
    try {
      await client.execute("ALTER TABLE users ADD COLUMN referral_code TEXT DEFAULT NULL");
    } catch (e) {}
    try {
      await client.execute("ALTER TABLE users ADD COLUMN referred_by_code TEXT DEFAULT ''");
    } catch (e) {}
    try {
      await client.execute("ALTER TABLE users ADD COLUMN referred_by_user_id TEXT DEFAULT NULL");
    } catch (e) {}
    try {
      await client.execute("ALTER TABLE users ADD COLUMN referral_tier_id TEXT DEFAULT NULL");
    } catch (e) {}
    try {
      await client.execute("ALTER TABLE users ADD COLUMN referral_credits REAL DEFAULT 0");
    } catch (e) {}

    // 2. Add referral_code to magic_links table
    try {
      await client.execute("ALTER TABLE magic_links ADD COLUMN referral_code TEXT DEFAULT ''");
    } catch (e) {}

    // 3. Referral Tiers table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS referral_tiers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        min_referrals INTEGER NOT NULL DEFAULT 0,
        min_revenue REAL NOT NULL DEFAULT 0,
        reward_type TEXT NOT NULL DEFAULT 'discount_percent',
        reward_value REAL NOT NULL DEFAULT 10,
        reward_description TEXT DEFAULT '',
        referee_reward_type TEXT DEFAULT 'discount_percent',
        referee_reward_value REAL DEFAULT 10,
        referee_reward_description TEXT DEFAULT '',
        badge_color TEXT DEFAULT '#3B82F6',
        icon TEXT DEFAULT 'award',
        perks_json TEXT DEFAULT '[]',
        is_default INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Client Referrals tracking table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS client_referrals (
        id TEXT PRIMARY KEY,
        referrer_user_id TEXT NOT NULL,
        referee_user_id TEXT DEFAULT NULL,
        referee_email TEXT NOT NULL,
        referral_code_used TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        conversion_trigger TEXT DEFAULT 'registration',
        conversion_value REAL DEFAULT 0,
        referrer_reward_granted INTEGER DEFAULT 0,
        referee_reward_granted INTEGER DEFAULT 0,
        referrer_reward_description TEXT DEFAULT '',
        referee_reward_description TEXT DEFAULT '',
        referee_ip TEXT DEFAULT '',
        rejection_reason TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        converted_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Referral Rewards & Vouchers table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS referral_rewards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        referral_id TEXT DEFAULT NULL,
        reward_tier_id TEXT DEFAULT NULL,
        recipient_role TEXT DEFAULT 'referrer',
        reward_type TEXT NOT NULL DEFAULT 'credit',
        reward_value REAL NOT NULL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        voucher_code TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'available',
        expires_at DATETIME DEFAULT NULL,
        redeemed_at DATETIME DEFAULT NULL,
        redeemed_invoice_id TEXT DEFAULT NULL,
        redeemed_notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Default Referral Tiers Seeding
    const tierCheck = await client.execute("SELECT COUNT(*) as count FROM referral_tiers");
    if (Number(tierCheck.rows[0]?.count || 0) === 0) {
      const defaultTiers = [
        {
          id: "tier-bronze",
          name: "Bronze Starter",
          slug: "bronze",
          min_referrals: 0,
          min_revenue: 0,
          reward_type: "discount_percent",
          reward_value: 5,
          reward_description: "5% personal discount on all upcoming photo shoots",
          referee_reward_type: "discount_percent",
          referee_reward_value: 10,
          referee_reward_description: "10% welcome discount on first photography booking",
          badge_color: "#94A3B8",
          icon: "award",
          perks_json: JSON.stringify([
            "5% personal discount on all bookings",
            "Access to referral tracking & share link",
            "10% welcome discount for invited friends"
          ]),
          is_default: 1,
          sort_order: 1
        },
        {
          id: "tier-silver",
          name: "Silver Ambassador",
          slug: "silver",
          min_referrals: 3,
          min_revenue: 500,
          reward_type: "credit",
          reward_value: 25,
          reward_description: "$25 studio credit per successful invite + 10% discount",
          referee_reward_type: "discount_percent",
          referee_reward_value: 10,
          referee_reward_description: "10% welcome discount on first booking",
          badge_color: "#38BDF8",
          icon: "shield",
          perks_json: JSON.stringify([
            "$25 studio credit for each successful referral",
            "10% discount across all services & addons",
            "Priority weekend shoot booking",
            "Custom branded referral invite link"
          ]),
          is_default: 0,
          sort_order: 2
        },
        {
          id: "tier-gold",
          name: "Gold VIP",
          slug: "gold",
          min_referrals: 7,
          min_revenue: 1500,
          reward_type: "credit",
          reward_value: 50,
          reward_description: "$50 studio credit per referral + 15% discount + Priority 24h Turnaround",
          referee_reward_type: "discount_percent",
          referee_reward_value: 15,
          referee_reward_description: "15% welcome discount on first booking",
          badge_color: "#F59E0B",
          icon: "star",
          perks_json: JSON.stringify([
            "$50 studio credit per successful client referral",
            "15% personal discount on all bookings",
            "Guaranteed 24-hour turnaround on standard photo packages",
            "15% discount voucher for referred colleagues",
            "Gold VIP badge & dedicated support queue"
          ]),
          is_default: 0,
          sort_order: 3
        },
        {
          id: "tier-platinum",
          name: "Platinum Elite",
          slug: "platinum",
          min_referrals: 15,
          min_revenue: 3500,
          reward_type: "credit",
          reward_value: 100,
          reward_description: "$100 studio credit + 20% discount + Free Twilight Photo Enhancement",
          referee_reward_type: "discount_percent",
          referee_reward_value: 15,
          referee_reward_description: "15% welcome discount + bonus Twilight photo",
          badge_color: "#8B5CF6",
          icon: "trophy",
          perks_json: JSON.stringify([
            "$100 studio credit per qualified referral",
            "20% discount on all media & visual production services",
            "Complimentary Twilight HDR photo enhancement per shoot",
            "Senior lead photographer priority assignment",
            "Direct phone consultation with creative director"
          ]),
          is_default: 0,
          sort_order: 4
        },
        {
          id: "tier-diamond",
          name: "Diamond Partner",
          slug: "diamond",
          min_referrals: 30,
          min_revenue: 7500,
          reward_type: "credit",
          reward_value: 200,
          reward_description: "$200 studio credit + 25% lifetime discount + Dedicated Account Coordinator",
          referee_reward_type: "discount_percent",
          referee_reward_value: 20,
          referee_reward_description: "20% welcome discount on first booking",
          badge_color: "#EC4899",
          icon: "crown",
          perks_json: JSON.stringify([
            "$200 studio credit per qualified business referral",
            "25% lifetime discount on all services",
            "Dedicated production coordinator & bespoke shoot planning",
            "1 complimentary 3D virtual tour per year",
            "Featured Partner profile in studio directory"
          ]),
          is_default: 0,
          sort_order: 5
        }
      ];

      for (const tier of defaultTiers) {
        await client.execute({
          sql: `INSERT INTO referral_tiers (
            id, name, slug, min_referrals, min_revenue, reward_type, reward_value, reward_description,
            referee_reward_type, referee_reward_value, referee_reward_description, badge_color, icon,
            perks_json, is_default, sort_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [
            tier.id,
            tier.name,
            tier.slug,
            tier.min_referrals,
            tier.min_revenue,
            tier.reward_type,
            tier.reward_value,
            tier.reward_description,
            tier.referee_reward_type,
            tier.referee_reward_value,
            tier.referee_reward_description,
            tier.badge_color,
            tier.icon,
            tier.perks_json,
            tier.is_default,
            tier.sort_order
          ]
        });
      }
      console.log(`[DB Setup] Seeded ${defaultTiers.length} default referral tiers.`);
    }

    // 7. Seed default referral program settings
    const defaultSettings = [
      { key: "referral_program_active", value: "1" },
      { key: "referral_success_criteria", value: "first_payment" }, // 'registration' | 'first_payment' | 'min_spend'
      { key: "referral_min_spend", value: "50" },
      { key: "referral_fraud_ip_check", value: "1" },
      { key: "referral_credit_currency", value: "USD" },
      { key: "referral_referee_welcome_type", value: "discount_percent" },
      { key: "referral_referee_welcome_value", value: "10" },
      { key: "referral_referee_welcome_desc", value: "10% off your first photography booking" }
    ];

    for (const st of defaultSettings) {
      await client.execute({
        sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
        args: [st.key, st.value]
      });
    }

    // 8. Generate referral codes for any existing users that don't have one
    const usersWithoutCode = await client.execute("SELECT id, email, name FROM users WHERE referral_code IS NULL OR referral_code = ''");
    for (const u of usersWithoutCode.rows) {
      const cleanEmail = String(u.email || "").split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4) || "REF";
      const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
      const code = `REF-${cleanEmail}${randomSuffix}`;

      await client.execute({
        sql: "UPDATE users SET referral_code = ?, referral_tier_id = COALESCE(referral_tier_id, 'tier-bronze') WHERE id = ?",
        args: [code, u.id]
      });
    }
  } catch (refErr) {
    console.warn("[DB Setup] Referral schema setup note:", refErr);
  }

  // A brand-new database may insert its demo portfolio records after the
  // column migration above, so finish by assigning slugs to those rows too.
  try {
    const missingSlugs = await client.execute("SELECT id, title FROM portfolio_items WHERE slug IS NULL OR TRIM(slug) = ''");
    for (const item of missingSlugs.rows as any[]) {
      await client.execute({
        sql: "UPDATE portfolio_items SET slug = ? WHERE id = ?",
        args: [createPortfolioSlug(item.title, String(item.id)), item.id],
      });
    }
    await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_slug ON portfolio_items(slug)");
  } catch (error) {
    console.warn("Final portfolio slug backfill warning", error);
  }

  // Mark schema as fully initialized for high-performance subsequent cold-starts
  try {
    await client.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('__db_initialized_v8', '1')",
      args: []
    });
    console.log("[DB Setup] Database initialization and schema verification complete (v8).");
  } catch (e) {
    // Non-critical
  }
};
