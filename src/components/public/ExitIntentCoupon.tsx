import { Check, Copy, Gift, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

type Coupon = { code: string; discount_percent: number; expires_at: string };
const usedKey = "sps_exit_intent_coupon_shown";
const cookie = (name: string) => document.cookie.split("; ").find(item => item.startsWith(`${name}=`))?.split("=").slice(1).join("=") || "";
const setCookie = (name: string, value: string, days = 365) => { document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${days * 86400}; SameSite=Lax`; };
const baseVisitorId = () => { let id = cookie("sps_exit_coupon_visitor"); if (!id) { id = crypto.randomUUID().replace(/-/g, ""); setCookie("sps_exit_coupon_visitor", id); } return id; };

export function ExitIntentCoupon() {
  const { pathname } = useLocation(); const [config, setConfig] = useState<{ enabled: boolean; repeatDays: number; repeatVisits: number } | null>(null); const [coupon, setCoupon] = useState<Coupon | null>(null); const [copied, setCopied] = useState(false); const requesting = useRef(false);
  const excluded = /^\/(admin|client|property-manager|property-listings|invoice)/.test(pathname);
  useEffect(() => { if (!excluded) fetch("/api/public/exit-coupons/config").then(r => r.ok ? r.json() : null).then(data => setConfig(data)).catch(() => {}); }, [excluded]);
  useEffect(() => {
    if (excluded || !config?.enabled || sessionStorage.getItem(usedKey)) return;
    if (!sessionStorage.getItem("sps_exit_coupon_visit_recorded")) { setCookie("sps_exit_coupon_visits", String(Number(cookie("sps_exit_coupon_visits") || 0) + 1)); sessionStorage.setItem("sps_exit_coupon_visit_recorded", "1"); }
    const seenAt = Number(cookie("sps_exit_coupon_seen_at") || 0); const visits = Number(cookie("sps_exit_coupon_visits") || 0); const eligible = !seenAt || Date.now() - seenAt >= config.repeatDays * 86_400_000 || visits >= config.repeatVisits;
    if (!eligible) return;
    const onExitIntent = (event: MouseEvent) => {
      if (event.clientY > 0 || requesting.current || coupon) return;
      requesting.current = true;
      const cycle = Number(cookie("sps_exit_coupon_cycle") || 1);
      fetch("/api/public/exit-coupons/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitor_id: `${baseVisitorId()}-${cycle}`, page_path: pathname }) })
        .then(async response => response.ok ? response.json() : Promise.reject())
        .then(data => { setCookie("sps_exit_coupon_seen_at", String(Date.now())); setCookie("sps_exit_coupon_visits", "0"); setCookie("sps_exit_coupon_cycle", String(cycle + 1)); sessionStorage.setItem(usedKey, "1"); setCoupon(data); })
        .catch(() => { requesting.current = false; });
    };
    document.addEventListener("mouseout", onExitIntent);
    return () => document.removeEventListener("mouseout", onExitIntent);
  }, [coupon, config, excluded, pathname]);
  if (!coupon) return null;
  const copy = async () => { try { await navigator.clipboard.writeText(coupon.code); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch {} };
  return <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm [font-family:var(--theme-font-body)]" role="dialog" aria-modal="true" aria-label="Exkluzív kedvezmény"><section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/35 bg-background p-7 text-center shadow-2xl"><div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-primary/15 blur-2xl" /><button type="button" onClick={() => setCoupon(null)} className="absolute right-4 top-4 rounded-lg p-2 text-muted-text hover:bg-surface hover:text-text" aria-label="Bezárás"><X className="h-5 w-5" /></button><div className="relative"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Gift className="h-7 w-7" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-primary">Mielőtt elmész</p><h2 className="mt-2 text-3xl font-black text-text [font-family:var(--theme-font-heading)]">{coupon.discount_percent}% kedvezmény a tiéd</h2><p className="mt-3 text-sm leading-relaxed text-muted-text">Köszönjük, hogy benéztél. Használd fel ezt az egyszeri kuponkódot ajánlatkéréskor.</p><button type="button" onClick={() => void copy()} className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-dashed border-primary/60 bg-primary/5 px-4 py-4 text-xl font-black tracking-wider text-text hover:bg-primary/10"><span>{copied ? "MÁSOLVA" : coupon.code}</span>{copied ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5 text-primary" />}</button><p className="mt-3 text-xs text-muted-text">Egyszer használható · Érvényes: {new Date(`${coupon.expires_at}Z`).toLocaleDateString("hu-HU")}</p><a href="/#contact" onClick={() => setCoupon(null)} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:brightness-110">Ajánlatot kérek</a></div></section></div>;
}
