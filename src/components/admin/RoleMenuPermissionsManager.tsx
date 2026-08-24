import { useEffect, useState } from "react";
import { Check, ShieldCheck, Save } from "lucide-react";
import { ADMIN_MENU_PERMISSIONS, ConfigurableAdminRole, defaultRoleMenuPermissions, parseRoleMenuPermissions, RoleMenuPermissions } from "../../lib/adminPermissions";
import { useApi } from "../../hooks/useApi";
import { Button } from "../ui/Button";

const ROLES: Array<{ id: ConfigurableAdminRole; label: string; description: string }> = [
  { id: "admin", label: "Admin", description: "Full operational access by default" },
  { id: "editor", label: "Editor", description: "Content and CRM access by default" },
  { id: "viewer", label: "Viewer", description: "Read-oriented menu access by default" },
];

export function RoleMenuPermissionsManager() {
  const { fetchApi } = useApi();
  const [permissions, setPermissions] = useState<RoleMenuPermissions>(defaultRoleMenuPermissions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => { void (async () => { try { const response = await fetchApi("/api/admin/role-menu-permissions"); if (!response.ok) throw new Error(); setPermissions(parseRoleMenuPermissions((await response.json()).value)); } catch { setFeedback("A jogosultságok betöltése sikertelen."); } finally { setLoading(false); } })(); }, [fetchApi]);
  const toggle = (role: ConfigurableAdminRole, permission: string) => setPermissions((current) => ({ ...current, [role]: current[role].includes(permission) ? current[role].filter((item) => item !== permission) : [...current[role], permission] }));
  const save = async () => { setSaving(true); setFeedback(""); try { const response = await fetchApi("/api/admin/role-menu-permissions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ permissions }) }); if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Mentési hiba"); setFeedback("A szerepkörjogosultságok sikeresen frissültek."); window.dispatchEvent(new Event("admin-menu-permissions-updated")); } catch (error: any) { setFeedback(error.message || "A jogosultságok mentése sikertelen."); } finally { setSaving(false); } };

  return <div className="space-y-5">
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex gap-3"><ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><p className="text-sm font-semibold text-text">Superadmin szerepkörjogosultságok</p><p className="text-xs text-muted-text mt-1 leading-relaxed">A Superadmin mindig minden menühöz hozzáfér. Az alábbi jelölők az Admin, Editor és Viewer adminpanel-menüit és közvetlen oldal-hozzáférését szabályozzák.</p></div></div>
    {loading ? <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">{ROLES.map((role) => <section key={role.id} className="rounded-2xl border border-border bg-surface/50 overflow-hidden"><header className="px-4 py-3 border-b border-border bg-background/70"><h3 className="font-bold text-sm text-text">{role.label}</h3><p className="text-[11px] text-muted-text mt-0.5">{role.description}</p></header><div className="p-2 space-y-1">{ADMIN_MENU_PERMISSIONS.map((item) => { const enabled = permissions[role.id].includes(item.id); return <label key={item.id} className="flex gap-2.5 rounded-xl p-2.5 hover:bg-background cursor-pointer transition-colors"><input type="checkbox" checked={enabled} onChange={() => toggle(role.id, item.id)} className="mt-0.5 h-4 w-4 accent-primary" /><span className="min-w-0"><span className="block text-xs font-semibold text-text">{item.label}</span><span className="block text-[10px] leading-4 text-muted-text">{item.description}</span></span></label>; })}</div></section>)}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3"><p className={`text-xs font-medium ${feedback.includes("sikeresen") ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{feedback}</p><Button type="button" onClick={save} disabled={loading || saving} className="gap-2"><Save className="w-4 h-4" />{saving ? "Mentés..." : "Jogosultságok mentése"}</Button></div>
  </div>;
}
