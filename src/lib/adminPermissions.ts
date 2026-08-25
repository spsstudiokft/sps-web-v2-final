export type AdminRole = "superadmin" | "admin" | "editor" | "viewer";
export type ConfigurableAdminRole = Exclude<AdminRole, "superadmin">;
export const ADMIN_ROLES: AdminRole[] = ["superadmin", "admin", "editor", "viewer"];
export const MANAGER_ROLES: AdminRole[] = ["superadmin", "admin"];
export const EDITOR_ROLES: AdminRole[] = ["superadmin", "admin", "editor"];

export type AdminMenuPermission = { id: string; label: string; description: string; defaultRoles: ConfigurableAdminRole[]; matches: (pathname: string, search: string) => boolean };
const route = (path: string) => (pathname: string) => pathname === path || pathname.startsWith(`${path}/`);

export const ADMIN_MENU_PERMISSIONS: AdminMenuPermission[] = [
  { id: "dashboard", label: "Dashboard", description: "Overview and activity summary", defaultRoles: ["admin", "editor", "viewer"], matches: (path) => path === "/admin" },
  { id: "payment_requests", label: "Payment requests", description: "Internal payment requests and reimbursement workflow", defaultRoles: ["admin", "editor"], matches: (path, search) => path === "/admin/budget" && search.includes("tab=payment-requests") },
  { id: "budget", label: "Budget manager", description: "Budget entries and financial reports", defaultRoles: ["admin"], matches: (path, search) => path === "/admin/budget" && !search.includes("tab=invoices") && !search.includes("tab=payment-requests") },
  { id: "invoices", label: "Invoices & payments", description: "Invoices, payment links and receivables", defaultRoles: ["admin"], matches: (path, search) => path === "/admin/invoices" || (path === "/admin/budget" && search.includes("tab=invoices")) },
  { id: "portfolio", label: "Portfolio", description: "Published galleries and portfolio media", defaultRoles: ["admin", "editor", "viewer"], matches: route("/admin/portfolio") },
  { id: "properties", label: "Property listings", description: "Public real-estate listing catalog", defaultRoles: ["admin", "editor", "viewer"], matches: route("/admin/property-listings") },
  { id: "projects", label: "Projects", description: "Client projects and delivery workflows", defaultRoles: ["admin", "editor", "viewer"], matches: route("/admin/projects") },
  { id: "calendar", label: "Calendar", description: "Shared team schedule and internal projects", defaultRoles: ["admin", "editor", "viewer"], matches: route("/admin/calendar") },
  { id: "services", label: "Services", description: "Studio services and landing-page content", defaultRoles: ["admin", "editor", "viewer"], matches: route("/admin/services") },
  { id: "visual_ideas", label: "Visual ideas", description: "Visual-ideas board content", defaultRoles: ["admin", "editor", "viewer"], matches: route("/admin/visual-ideas") },
  { id: "pricing", label: "Pricing & packages", description: "Pricing plans, bundles and extra services", defaultRoles: ["admin", "editor", "viewer"], matches: route("/admin/pricing") },
  { id: "announcements", label: "Announcement bar", description: "Information-bar messages and categories", defaultRoles: ["admin", "editor", "viewer"], matches: (path) => route("/admin/info-bar")(path) || route("/admin/announcements")(path) },
  { id: "social_links", label: "Social links", description: "Social popup tree and public links", defaultRoles: ["admin", "editor", "viewer"], matches: route("/admin/social-links") },
  { id: "faqs", label: "FAQs", description: "Questions, answers and FAQ categories", defaultRoles: ["admin", "editor", "viewer"], matches: route("/admin/faqs") },
  { id: "team", label: "Team & invites", description: "Team members, roles and invitations", defaultRoles: ["admin"], matches: route("/admin/team") },
  { id: "referrals", label: "Referral program", description: "Referral settings and rewards", defaultRoles: ["admin"], matches: route("/admin/referrals") },
  { id: "leads", label: "Leads", description: "Lead pipeline and prospect records", defaultRoles: ["admin", "editor"], matches: route("/admin/leads") },
  { id: "customers", label: "Customers", description: "Customer records and portal invitations", defaultRoles: ["admin", "editor"], matches: route("/admin/customers") },
  { id: "clients", label: "Client portal users", description: "Client portal accounts and access", defaultRoles: ["admin", "editor"], matches: route("/admin/clients") },
  { id: "submissions", label: "Submissions", description: "Contact-form requests and notes", defaultRoles: ["admin", "editor", "viewer"], matches: route("/admin/contacts") },
  { id: "marketing_emails", label: "Marketing emails", description: "Campaign templates and sends", defaultRoles: ["admin", "editor"], matches: route("/admin/marketing-emails") },
  { id: "themes", label: "Theme & branding", description: "Theme editor and visual identity", defaultRoles: ["admin"], matches: route("/admin/themes") },
  { id: "settings", label: "Site settings", description: "Site configuration, SEO and legal documents", defaultRoles: ["admin"], matches: route("/admin/settings") },
];

export type RoleMenuPermissions = Record<ConfigurableAdminRole, string[]>;
export function defaultRoleMenuPermissions(): RoleMenuPermissions { return { admin: ADMIN_MENU_PERMISSIONS.filter((item) => item.defaultRoles.includes("admin")).map((item) => item.id), editor: ADMIN_MENU_PERMISSIONS.filter((item) => item.defaultRoles.includes("editor")).map((item) => item.id), viewer: ADMIN_MENU_PERMISSIONS.filter((item) => item.defaultRoles.includes("viewer")).map((item) => item.id) }; }
export function normalizeAdminRole(role?: string | null): AdminRole | null { const normalized = String(role || "").trim().toLowerCase().replace(/[_-]/g, ""); return ADMIN_ROLES.includes(normalized as AdminRole) ? normalized as AdminRole : null; }
export function parseRoleMenuPermissions(value?: string | null): RoleMenuPermissions { const defaults = defaultRoleMenuPermissions(); try { const parsed = JSON.parse(String(value || "")); const ids = new Set(ADMIN_MENU_PERMISSIONS.map((item) => item.id)); return { admin: Array.isArray(parsed?.admin) ? parsed.admin.filter((id: unknown) => typeof id === "string" && ids.has(id)) : defaults.admin, editor: Array.isArray(parsed?.editor) ? parsed.editor.filter((id: unknown) => typeof id === "string" && ids.has(id) && id !== "budget" && id !== "invoices") : defaults.editor, viewer: Array.isArray(parsed?.viewer) ? parsed.viewer.filter((id: unknown) => typeof id === "string" && ids.has(id)) : defaults.viewer }; } catch { return defaults; } }
export function canAccessAdminMenu(role: string | null | undefined, permissionId: string, permissions = defaultRoleMenuPermissions()): boolean { const normalized = normalizeAdminRole(role); if (normalized === "editor" && (permissionId === "budget" || permissionId === "invoices")) return false; return normalized === "superadmin" || Boolean(normalized && permissions[normalized]?.includes(permissionId)); }
export function canAccessAdminRoute(role: string | null | undefined, pathname: string, search = "", permissions = defaultRoleMenuPermissions()): boolean { const normalized = normalizeAdminRole(role); if (!normalized) return false; if (normalized === "superadmin") return true; if (normalized === "editor" && pathname === "/admin/budget") return permissions.editor.includes("payment_requests"); const rule = ADMIN_MENU_PERMISSIONS.find((item) => item.matches(pathname, search)); return rule ? canAccessAdminMenu(normalized, rule.id, permissions) : true; }
