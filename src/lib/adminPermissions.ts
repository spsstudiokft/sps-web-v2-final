export type AdminRole = "superadmin" | "admin" | "editor" | "viewer";

export const ADMIN_ROLES: AdminRole[] = ["superadmin", "admin", "editor", "viewer"];
export const MANAGER_ROLES: AdminRole[] = ["superadmin", "admin"];
export const EDITOR_ROLES: AdminRole[] = ["superadmin", "admin", "editor"];

export function normalizeAdminRole(role?: string | null): AdminRole | null {
  const normalized = String(role || "").trim().toLowerCase().replace(/[_-]/g, "");
  return ADMIN_ROLES.includes(normalized as AdminRole) ? normalized as AdminRole : null;
}

const routeRoles: Array<{ match: (pathname: string, search: string) => boolean; roles: AdminRole[] }> = [
  { match: (path) => path === "/admin", roles: ADMIN_ROLES },
  { match: (path) => path === "/admin/invoices", roles: MANAGER_ROLES },
  { match: (path, search) => path === "/admin/budget" && search.includes("tab=invoices"), roles: MANAGER_ROLES },
  { match: (path) => path === "/admin/budget", roles: EDITOR_ROLES },
  { match: (path) => ["/admin/team", "/admin/referrals", "/admin/themes", "/admin/settings"].some((prefix) => path === prefix || path.startsWith(`${prefix}/`)), roles: MANAGER_ROLES },
  { match: (path) => ["/admin/portfolio", "/admin/property-listings", "/admin/projects", "/admin/services", "/admin/visual-ideas", "/admin/pricing", "/admin/info-bar", "/admin/announcements", "/admin/social-links", "/admin/faqs", "/admin/contacts"].some((prefix) => path === prefix || path.startsWith(`${prefix}/`)), roles: ADMIN_ROLES },
  { match: (path) => ["/admin/leads", "/admin/customers", "/admin/clients", "/admin/marketing-emails"].some((prefix) => path === prefix || path.startsWith(`${prefix}/`)), roles: EDITOR_ROLES },
];

export function canAccessAdminRoute(role: string | null | undefined, pathname: string, search = ""): boolean {
  const normalizedRole = normalizeAdminRole(role);
  if (!normalizedRole) return false;
  const rule = routeRoles.find(({ match }) => match(pathname, search));
  // Unknown admin paths are left to React Router's nested 404 handler.
  return rule ? rule.roles.includes(normalizedRole) : true;
}
