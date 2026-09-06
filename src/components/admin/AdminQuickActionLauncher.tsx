import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, FolderKanban, Image as ImageIcon, Send, Users, X } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { useAdminCurrency } from "../../contexts/AdminCurrencyContext";
import { useAppFeedback } from "../common/AppFeedbackProvider";
import { ProjectModal } from "./ProjectModal";
import { PortfolioModal } from "./PortfolioModal";
import { PaymentRequestModal } from "./payment-requests/PaymentRequestModal";
import { Category, PortfolioItem, Project } from "../../lib/types";

export type QuickAction = "client" | "project" | "portfolio" | "calendar" | "payment";
export const QUICK_ACTION_EVENT = "sps-admin-quick-action";

function ModalShell({ title, icon: Icon, onClose, children }: { title: string; icon: typeof Users; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={event => event.currentTarget === event.target && onClose()}><section role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"><header className="flex items-center justify-between border-b border-border bg-surface px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Icon size={18}/></span><h2 className="font-bold text-text">{title}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-text hover:bg-background hover:text-text" aria-label="Bezárás"><X size={18}/></button></header>{children}</section></div>;
}

export function AdminQuickActionLauncher() {
  const { fetchApi } = useApi();
  const { token, user } = useAuth();
  const { currency } = useAdminCurrency();
  const { notify } = useAppFeedback();
  const [action, setAction] = useState<QuickAction | null>(null);
  const [clients, setClients] = useState<{ id: string; email: string }[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [siteLanguages, setSiteLanguages] = useState("");
  const [paymentCategories, setPaymentCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [clientForm, setClientForm] = useState({ email: "", password: "" });
  const [calendarForm, setCalendarForm] = useState(() => ({ title: "", description: "", start_at: new Date().toISOString().slice(0, 16), end_at: new Date(Date.now() + 3600000).toISOString().slice(0, 16) }));

  useEffect(() => {
    const open = (event: Event) => setAction((event as CustomEvent<QuickAction>).detail);
    window.addEventListener(QUICK_ACTION_EVENT, open);
    return () => window.removeEventListener(QUICK_ACTION_EVENT, open);
  }, []);

  useEffect(() => {
    if (action !== "project" && action !== "portfolio" && action !== "payment") return;
    void Promise.all([
      action === "project" ? fetchApi("/api/admin/clients").then(r => r.ok ? r.json() : []) : Promise.resolve([]),
      action === "project" ? fetchApi("/api/admin/portfolio").then(r => r.ok ? r.json() : []) : Promise.resolve([]),
      action === "portfolio" ? fetchApi("/api/admin/categories").then(r => r.ok ? r.json() : []) : Promise.resolve([]),
      action === "portfolio" ? fetchApi("/api/admin/settings").then(r => r.ok ? r.json() : {}) : Promise.resolve({}),
      action === "payment" ? fetchApi("/api/admin/payment-requests/categories").then(r => r.ok ? r.json() : []) : Promise.resolve([]),
    ]).then(([nextClients, nextPortfolios, nextCategories, settings, nextPaymentCategories]) => {
      setClients(Array.isArray(nextClients) ? nextClients : []); setPortfolios(Array.isArray(nextPortfolios) ? nextPortfolios : []); setCategories(Array.isArray(nextCategories) ? nextCategories : []); setSiteLanguages(String(settings?.site_languages || "")); setPaymentCategories(Array.isArray(nextPaymentCategories) ? nextPaymentCategories : []);
    });
  }, [action, fetchApi]);

  const close = () => { setAction(null); setSaving(false); };
  const createClient = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { const response = await fetchApi("/api/admin/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: clientForm.email.trim(), password: clientForm.password || undefined, is_active: 1, property_address: "", advertisement_link: "", properties: [], links: [] }) }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "Az ügyfélfiók létrehozása sikertelen."); notify("Ügyfélfiók létrehozva.", "success"); setClientForm({ email: "", password: "" }); close(); } catch (error: any) { notify(error.message || "Az ügyfélfiók létrehozása sikertelen.", "error"); } finally { setSaving(false); }
  };
  const createCalendarEvent = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { const response = await fetchApi("/api/admin/calendar-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...calendarForm, start_at: new Date(calendarForm.start_at).toISOString(), end_at: new Date(calendarForm.end_at).toISOString(), color: "#3b82f6", event_type: "event", recurrence_rule: "none", is_all_day: false, assignee_ids: [] }) }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "Az esemény létrehozása sikertelen."); notify("Naptárbejegyzés létrehozva.", "success"); close(); } catch (error: any) { notify(error.message || "Az esemény létrehozása sikertelen.", "error"); } finally { setSaving(false); }
  };
  const saveProject = async (data: Partial<Project> & { portfolio_ids?: string[] }) => { const response = await fetchApi("/api/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, status: data.status || "active" }) }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "A projekt létrehozása sikertelen."); notify("Projekt létrehozva.", "success"); close(); };
  const savePortfolio = async (data: any) => { let imageUrls = data.image_urls; if (typeof imageUrls === "string") { try { imageUrls = JSON.parse(imageUrls); } catch { imageUrls = []; } } const response = await fetchApi("/api/admin/portfolio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, image_urls: imageUrls }) }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "A portfólióelem létrehozása sikertelen."); notify("Portfólióelem létrehozva.", "success"); close(); };

  return <>
    {action === "client" && <ModalShell title="Új ügyfélfiók" icon={Users} onClose={close}><form onSubmit={createClient} className="space-y-4 overflow-y-auto p-5"><label className="block text-sm font-medium text-text">E-mail cím<input required type="email" value={clientForm.email} onChange={event => setClientForm(value => ({ ...value, email: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:border-primary" /></label><label className="block text-sm font-medium text-text">Ideiglenes jelszó <span className="font-normal text-muted-text">(opcionális)</span><input type="password" value={clientForm.password} onChange={event => setClientForm(value => ({ ...value, password: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:border-primary" /></label><footer className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={close} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Mégse</button><button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving ? "Mentés…" : "Ügyfél létrehozása"}</button></footer></form></ModalShell>}
    {action === "calendar" && <ModalShell title="Új naptárbejegyzés" icon={CalendarDays} onClose={close}><form onSubmit={createCalendarEvent} className="space-y-4 overflow-y-auto p-5"><label className="block text-sm font-medium text-text">Esemény neve<input required value={calendarForm.title} onChange={event => setCalendarForm(value => ({ ...value, title: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:border-primary" /></label><label className="block text-sm font-medium text-text">Leírás<textarea value={calendarForm.description} onChange={event => setCalendarForm(value => ({ ...value, description: event.target.value }))} className="mt-1.5 min-h-20 w-full rounded-xl border border-border bg-surface p-3 outline-none focus:border-primary" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-text">Kezdés<input required type="datetime-local" value={calendarForm.start_at} onChange={event => setCalendarForm(value => ({ ...value, start_at: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5" /></label><label className="text-sm font-medium text-text">Befejezés<input required type="datetime-local" value={calendarForm.end_at} onChange={event => setCalendarForm(value => ({ ...value, end_at: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5" /></label></div><footer className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={close} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Mégse</button><button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving ? "Mentés…" : "Esemény létrehozása"}</button></footer></form></ModalShell>}
    <ProjectModal isOpen={action === "project"} project={action === "project" ? null : null} clients={clients} portfolios={portfolios} onClose={close} onSave={saveProject} />
    <PortfolioModal isOpen={action === "portfolio"} item={action === "portfolio" ? null : null} categories={categories} siteLanguages={siteLanguages} onClose={close} onSave={savePortfolio} />
    <PaymentRequestModal isOpen={action === "payment"} onClose={close} currentUserId={user?.id || ""} currentUserName={user?.name || user?.email || "Admin"} currentUserEmail={user?.email || ""} defaultCurrency={currency} token={token} categories={paymentCategories} showToast={notify} onSuccess={(message) => { notify(message, "success"); close(); }} />
  </>;
}
