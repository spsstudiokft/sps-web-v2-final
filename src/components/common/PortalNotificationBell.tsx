import { Archive, ArchiveRestore, Bell, CheckCheck, LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { confirmAction, notifyAction } from "./AppFeedbackProvider";

type Notification = { id: string; title: string; body: string; link?: string | null; read_at?: string | null; created_at: string };
type PopoverPosition = { top?: number; bottom?: number; left: number; width: number; maxHeight: number };
type NotificationView = "active" | "archived";
const urlBase64ToUint8Array = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4)), character => character.charCodeAt(0));

export function PortalNotificationBell({ portal, compact = false, openUp = true }: { portal: "admin" | "client"; compact?: boolean; openUp?: boolean }) {
  const { fetchApi } = useApi();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<NotificationView>("active");
  const [popover, setPopover] = useState<PopoverPosition>({ left: 12, width: 352, maxHeight: 320 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const prefix = portal === "admin" ? "/api/admin" : "/api/client";
  const unread = items.filter(item => !item.read_at).length;

  const enableOfflinePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || Notification.permission === "denied") return;
    try {
      // Must run during the original click activation. Requesting permission after
      // an awaited request is rejected or silently ignored by several browsers.
      const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (permission !== "granted") return;
      const keyResponse = await fetchApi(`${prefix}/push/public-key`); if (!keyResponse.ok) return;
      const { publicKey } = await keyResponse.json(); if (!publicKey) return;
      const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      await fetchApi(`${prefix}/push/subscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: subscription.toJSON() }) });
    } catch (error) { console.warn("Offline push enrollment failed", error); }
  };
  useEffect(() => { if (Notification.permission === "granted") void enableOfflinePush(); }, [prefix]);

  const load = async (targetView = view) => {
    try { const response = await fetchApi(`${prefix}/notifications?archived=${targetView === "archived" ? "1" : "0"}`); if (response.ok) setItems(await response.json()); }
    finally { setLoading(false); }
  };
  useEffect(() => { setLoading(true); void load(); const timer = window.setInterval(() => void load(), 15000); return () => window.clearInterval(timer); }, [fetchApi, prefix, view]);
  useEffect(() => {
    if (!open) return;
    const position = () => {
      const rect = triggerRef.current?.getBoundingClientRect(); if (!rect) return;
      const gutter = 12, width = Math.min(352, window.innerWidth - gutter * 2), left = Math.min(Math.max(gutter, rect.left), window.innerWidth - width - gutter), above = Math.max(0, rect.top - gutter), below = Math.max(0, window.innerHeight - rect.bottom - gutter), placeUp = above === below ? openUp : above > below;
      setPopover(placeUp ? { left, width, bottom: Math.max(gutter, window.innerHeight - rect.top + 8), maxHeight: Math.max(140, above - 8) } : { left, width, top: Math.max(gutter, rect.bottom + 8), maxHeight: Math.max(140, below - 8) });
    };
    position(); window.addEventListener("resize", position); window.addEventListener("scroll", position, true);
    return () => { window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); };
  }, [open, openUp]);
  const mark = async (id?: string) => { await fetchApi(`${prefix}/notifications${id ? `/${id}/read` : "/read-all"}`, { method: "PATCH" }); await load(); };
  const openItem = async (item: Notification) => {
    if (!item.read_at) await mark(item.id);
    setOpen(false);
    if (!item.link?.startsWith("/")) return;
    // Feedback notifications created before the workspace rollout only point to
    // the retired page. Keep them useful by opening the newest client chat.
    navigate(portal === "admin" && item.link === "/admin/client-feedback" ? "/admin?workspaceChat=latest" : item.link);
  };
  const archive = async (id: string) => {
    const response = await fetchApi(`${prefix}/notifications/${id}/archive`, { method: "PATCH" });
    if (!response.ok) return notifyAction("Az értesítés archiválása nem sikerült.", "error");
    setItems(current => current.filter(item => item.id !== id));
    notifyAction("Értesítés archiválva.", "success");
  };
  const restore = async (id: string) => {
    const response = await fetchApi(`${prefix}/notifications/${id}/unarchive`, { method: "PATCH" });
    if (!response.ok) return notifyAction("Az értesítés visszaállítása nem sikerült.", "error");
    setItems(current => current.filter(item => item.id !== id));
    notifyAction("Értesítés visszaállítva.", "success");
  };
  const remove = async (id: string) => {
    // A confirmation modal is a separate, exclusive interaction. Close the
    // notification popover first so it cannot remain visually active beneath it.
    setOpen(false);
    if (!await confirmAction("Az értesítés végleg törlődik, és nem állítható vissza.", { title: "Értesítés törlése", confirmLabel: "Törlés", tone: "danger" })) return;
    const response = await fetchApi(`${prefix}/notifications/${id}`, { method: "DELETE" });
    if (!response.ok) return notifyAction("Az értesítés törlése nem sikerült.", "error");
    setItems(current => current.filter(item => item.id !== id));
    notifyAction("Értesítés törölve.", "success");
  };
  const panel = open && typeof document !== "undefined" ? createPortal(<div style={popover} role="dialog" aria-label="Értesítések" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} className="fixed z-[9999] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"><div className="border-b border-border px-4 py-3"><div className="flex items-center justify-between gap-3"><b className="text-sm">Értesítések</b>{view === "active" && unread > 0 && <button type="button" onClick={() => void mark()} className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"><CheckCheck className="h-3.5 w-3.5" />Mind olvasott</button>}</div><div className="mt-3 grid grid-cols-2 rounded-lg bg-surface p-1 text-xs font-semibold"><button type="button" onClick={() => setView("active")} className={`rounded-md px-2 py-1.5 transition-colors ${view === "active" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-text hover:text-text"}`}>Aktív{unread > 0 ? ` (${unread})` : ""}</button><button type="button" onClick={() => setView("archived")} className={`rounded-md px-2 py-1.5 transition-colors ${view === "archived" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-text hover:text-text"}`}>Archivált</button></div></div><div style={{ maxHeight: `calc(${popover.maxHeight}px - 6.75rem)` }} className="overflow-y-auto">{loading ? <div className="flex justify-center p-6"><LoaderCircle className="h-5 w-5 animate-spin text-primary" /></div> : !items.length ? <p className="p-5 text-center text-sm text-muted-text">{view === "archived" ? "Nincs archivált értesítésed." : "Nincs új értesítésed."}</p> : items.map(item => <div key={item.id} className={`group flex border-b border-border last:border-0 ${item.read_at ? "opacity-65" : "bg-primary/5"}`}><button type="button" onClick={() => void openItem(item)} className="min-w-0 flex-1 px-4 py-3 text-left hover:bg-surface"><span className="block text-sm font-semibold text-text">{item.title}</span><span className="mt-0.5 block text-xs text-muted-text">{item.body}</span><span className="mt-1 block text-[10px] text-muted-text">{new Date(item.created_at).toLocaleString("hu-HU")}</span></button><div className="flex shrink-0 items-center gap-0.5 pr-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">{view === "archived" ? <button type="button" onClick={event => { event.stopPropagation(); void restore(item.id); }} className="rounded-lg p-2 text-muted-text hover:bg-surface hover:text-primary" aria-label="Értesítés visszaállítása" title="Visszaállítás"><ArchiveRestore className="h-4 w-4" /></button> : <button type="button" onClick={event => { event.stopPropagation(); void archive(item.id); }} className="rounded-lg p-2 text-muted-text hover:bg-surface hover:text-primary" aria-label="Értesítés archiválása" title="Archiválás"><Archive className="h-4 w-4" /></button>}<button type="button" onClick={event => { event.stopPropagation(); void remove(item.id); }} className="rounded-lg p-2 text-muted-text hover:bg-rose-500/10 hover:text-rose-500" aria-label="Értesítés törlése" title="Végleges törlés"><Trash2 className="h-4 w-4" /></button></div></div>)}</div></div>, document.body) : null;
  return <><button ref={triggerRef} type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); void enableOfflinePush(); setOpen(value => !value); }} className={`relative inline-flex items-center justify-center rounded-xl border border-border bg-surface text-muted-text hover:text-text ${compact ? "h-10 w-10" : "h-10 gap-2 px-3"}`} aria-label={`Értesítések${unread ? `, ${unread} olvasatlan` : ""}`} aria-expanded={open}><Bell className="h-4 w-4" />{!compact && <span className="text-xs font-semibold">Értesítések</span>}{unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-5 text-primary-foreground">{unread > 99 ? "99+" : unread}</span>}</button>{panel}</>;
}
