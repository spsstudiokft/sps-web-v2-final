import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";

type Notification = { id: string; title: string; body: string; link?: string | null; read_at?: string | null; created_at: string };

export function PortalNotificationBell({ portal, compact = false, openUp = true }: { portal: "admin" | "client"; compact?: boolean; openUp?: boolean }) {
  const { fetchApi } = useApi();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [popover, setPopover] = useState<{ top?: number; bottom?: number; right: number; maxHeight: number }>({ right: 12, maxHeight: 320 });
  const rootRef = useRef<HTMLDivElement>(null);
  const prefix = portal === "admin" ? "/api/admin" : "/api/client";
  const load = async () => {
    try { const response = await fetchApi(`${prefix}/notifications`); if (response.ok) setItems(await response.json()); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 15000); return () => window.clearInterval(timer); }, [fetchApi, prefix]);
  useEffect(() => {
    if (!open) return;
    const position = () => {
      const rect = rootRef.current?.getBoundingClientRect(); if (!rect) return;
      const gutter = 12; const above = Math.max(0, rect.top - gutter); const below = Math.max(0, window.innerHeight - rect.bottom - gutter);
      const placeUp = above === below ? openUp : above > below;
      setPopover(placeUp
        ? { right: Math.max(gutter, window.innerWidth - rect.right), bottom: Math.max(gutter, window.innerHeight - rect.top + 8), maxHeight: Math.max(140, above - 8) }
        : { right: Math.max(gutter, window.innerWidth - rect.right), top: Math.max(gutter, rect.bottom + 8), maxHeight: Math.max(140, below - 8) });
    };
    position(); window.addEventListener("resize", position); return () => window.removeEventListener("resize", position);
  }, [open, openUp]);
  const unread = items.filter((item) => !item.read_at).length;
  const mark = async (id?: string) => { await fetchApi(`${prefix}/notifications${id ? `/${id}/read` : "/read-all"}`, { method: "PATCH" }); await load(); };
  const openItem = async (item: Notification) => { if (!item.read_at) await mark(item.id); setOpen(false); if (item.link?.startsWith("/")) navigate(item.link); };
  return <div ref={rootRef} className="relative"><button type="button" onClick={() => setOpen((value) => !value)} className={`relative inline-flex items-center justify-center rounded-xl border border-border bg-surface text-muted-text hover:text-text ${compact ? "h-10 w-10" : "h-10 gap-2 px-3"}`} aria-label={`Értesítések${unread ? `, ${unread} olvasatlan` : ""}`} aria-expanded={open}><Bell className="h-4 w-4" />{!compact && <span className="text-xs font-semibold">Értesítések</span>}{unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-5 text-primary-foreground">{unread > 99 ? "99+" : unread}</span>}</button>{open && <div style={popover} className="fixed z-[70] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"><div className="flex items-center justify-between border-b border-border px-4 py-3"><b className="text-sm">Értesítések</b>{unread > 0 && <button onClick={() => void mark()} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><CheckCheck className="h-3.5 w-3.5" />Mind olvasott</button>}</div><div style={{ maxHeight: `calc(${popover.maxHeight}px - 3.25rem)` }} className="overflow-y-auto">{loading ? <div className="flex justify-center p-6"><LoaderCircle className="h-5 w-5 animate-spin text-primary" /></div> : !items.length ? <p className="p-5 text-center text-sm text-muted-text">Nincs új értesítésed.</p> : items.map((item) => <button key={item.id} type="button" onClick={() => void openItem(item)} className={`w-full border-b border-border px-4 py-3 text-left last:border-0 hover:bg-surface ${item.read_at ? "opacity-65" : "bg-primary/5"}`}><span className="block text-sm font-semibold text-text">{item.title}</span><span className="mt-0.5 block text-xs text-muted-text">{item.body}</span><span className="mt-1 block text-[10px] text-muted-text">{new Date(item.created_at).toLocaleString("hu-HU")}</span></button>)}</div></div>}</div>;
}
