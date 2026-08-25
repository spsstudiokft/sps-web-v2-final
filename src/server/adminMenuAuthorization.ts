import { db } from "../db.js";

const SETTINGS_KEY = "admin_role_menu_permissions";
const CONFIGURABLE_ROLES = new Set(["admin", "editor", "viewer"]);
const MENU_IDS = new Set([
  "dashboard", "payment_requests", "budget", "invoices", "portfolio", "properties", "projects", "calendar", "services", "visual_ideas", "pricing", "announcements", "social_links", "faqs", "team", "referrals", "leads", "customers", "clients", "submissions", "marketing_emails", "themes", "settings",
]);

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: [...MENU_IDS],
  editor: ["dashboard", "payment_requests", "portfolio", "properties", "projects", "calendar", "services", "visual_ideas", "pricing", "announcements", "social_links", "faqs", "leads", "customers", "clients", "submissions", "marketing_emails"],
  viewer: ["dashboard", "portfolio", "properties", "projects", "calendar", "services", "visual_ideas", "pricing", "announcements", "social_links", "faqs", "submissions"],
};

type Permission = string | string[] | null;

async function permissionForAdminEndpoint(req: any): Promise<Permission> {
  const path = String(req.path || "");
  if (/^\/(verify|role-menu-permissions)(?:\/|$)/.test(path)) return null;
  if (/^\/settings(?:\/|$)/.test(path)) return req.method === "GET" ? [...MENU_IDS] : "settings";
  if (/^\/(legal-documents|themes|translations|branding)(?:\/|$)/.test(path)) return "settings";
  if (/^\/(media|storage)(?:\/|$)/.test(path)) return ["portfolio", "projects", "properties"];
  if (/^\/(categories|portfolio)(?:\/|$)/.test(path)) return "portfolio";
  if (/^\/property-listings(?:\/|$)/.test(path)) return "properties";
  if (/^\/projects(?:\/|$)/.test(path)) return "projects";
  if (/^\/calendar-(?:events|team-members)(?:\/|$)/.test(path)) return "calendar";
  if (/^\/(services|visual-ideas)(?:\/|$)/.test(path)) return path.startsWith("/visual-ideas") ? "visual_ideas" : "services";
  if (/^\/(pricing|extra-services|fee-rules)(?:\/|$)/.test(path)) return "pricing";
  if (/^\/(faq-categories|faqs)(?:\/|$)/.test(path)) return "faqs";
  if (/^\/contacts(?:\/|$)/.test(path)) return "submissions";
  if (/^\/clients(?:\/|$)/.test(path)) return "clients";
  if (/^\/projects(?:\/|$)/.test(path)) return "projects";
  if (/^\/social-links(?:\/|$)/.test(path)) return "social_links";
  if (/^\/(info-bar|announcements)(?:\/|$)/.test(path)) return "announcements";
  if (/^\/(team|teams|invitations)(?:\/|$)/.test(path)) return "team";
  if (/^\/email\/(templates\/marketing|logs)(?:\/|$)/.test(path)) return "marketing_emails";
  if (/^\/email(?:\/|$)/.test(path)) return ["marketing_emails", "settings"];
  if (/^\/crm\/(check-email|check-portal)(?:\/|$)/.test(path)) return ["leads", "customers"];
  if (/^\/crm\/customers(?:\/|$)/.test(path)) return "customers";
  if (/^\/crm\/(lead|customer)(?:\/|$)/.test(path)) return path.startsWith("/crm/lead") ? "leads" : "customers";
  if (path === "/crm") return String(req.query?.type || req.body?.type || "").toLowerCase() === "customer" ? "customers" : "leads";
  if (/^\/crm\/[^/]+(?:\/|$)/.test(path)) {
    const recordId = path.split("/")[2];
    const record = await db.execute({ sql: "SELECT type FROM crm_records WHERE id = ? LIMIT 1", args: [recordId] });
    return String(record.rows[0]?.type || "").toLowerCase() === "customer" ? "customers" : "leads";
  }
  if (/^\/audit-logs(?:\/|$)/.test(path)) return "customers";
  return "__unknown__";
}

async function rolePermissions(role: string): Promise<string[]> {
  const result = await db.execute({ sql: "SELECT value FROM settings WHERE key = ? LIMIT 1", args: [SETTINGS_KEY] });
  const value = result.rows[0]?.value;
  if (!value) return DEFAULT_PERMISSIONS[role] || [];
  try {
    const parsed = JSON.parse(String(value));
    const permissions = parsed?.[role];
    return Array.isArray(permissions) ? permissions.filter((id: unknown) => typeof id === "string" && MENU_IDS.has(id) && !(role === "editor" && (id === "budget" || id === "invoices"))) : DEFAULT_PERMISSIONS[role] || [];
  } catch {
    return [];
  }
}

export function requireAdminMenuPermission(fixedPermission?: string) {
  return async (req: any, res: any, next: any) => {
    const role = String(req.user?.role || "").trim().toLowerCase().replace(/[_-]/g, "");
    if (role === "superadmin" || !CONFIGURABLE_ROLES.has(role)) return next();
    const permission = fixedPermission || await permissionForAdminEndpoint(req);
    if (!permission) return next();
    try {
      if (role === "editor" && (permission === "budget" || permission === "invoices")) {
        return res.status(403).json({ error: "Az editor szerepkör csak a fizetési kérelmeket érheti el." });
      }
      const granted = new Set(await rolePermissions(role));
      const allowed = Array.isArray(permission) ? permission.some((item) => granted.has(item)) : granted.has(permission);
      if (allowed) return next();
      return res.status(403).json({ error: "Nincs jogosultsága ehhez az admin funkcióhoz." });
    } catch (error) {
      console.error("Failed to authorize admin menu permission", error);
      return res.status(503).json({ error: "A jogosultságok ellenőrzése átmenetileg nem érhető el." });
    }
  };
}
