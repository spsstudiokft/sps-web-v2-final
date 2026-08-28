import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";

type FeatureEntry = { id: string; version: string; title: string; summary: string; content: string; entry_type: string; feature_display: "banner" | "modal"; updated_at?: string };

export function FeatureAnnouncement() {
  const [entry, setEntry] = useState<FeatureEntry | null>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { fetch("/api/public/changelog/featured").then(r => r.ok ? r.json() : null).then((item) => {
    if (item && !localStorage.getItem(`sps_feature_seen_${item.id}_${item.updated_at || "new"}`)) setEntry(item);
  }).catch(() => {}); }, []);
  if (!entry || dismissed) return null;
  const dismiss = () => { localStorage.setItem(`sps_feature_seen_${entry.id}_${entry.updated_at || "new"}`, "1"); setDismissed(true); };
  const body = <><span className="inline-flex shrink-0 rounded-xl bg-primary/15 p-2 text-primary"><Sparkles className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="text-[11px] font-bold uppercase tracking-[.16em] text-primary">Újdonság · {entry.version}</span><span className="mt-1 block text-base font-bold text-text">{entry.title}</span><span className="mt-1 block text-sm leading-relaxed text-muted-text">{entry.summary}</span><Link onClick={dismiss} to="/changelog" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Részletek a változásnaplóban →</Link></span></>;
  if (entry.feature_display === "banner") return <div className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-2xl rounded-2xl border border-primary/30 bg-background/95 p-4 shadow-2xl backdrop-blur-xl"><div className="flex gap-3">{body}<button type="button" aria-label="Értesítés bezárása" onClick={dismiss} className="shrink-0 text-muted-text hover:text-text"><X className="h-5 w-5" /></button></div></div>;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Új funkció"><div className="relative w-full max-w-lg rounded-3xl border border-primary/25 bg-background p-6 shadow-2xl"><button type="button" aria-label="Értesítés bezárása" onClick={dismiss} className="absolute right-4 top-4 text-muted-text hover:text-text"><X className="h-5 w-5" /></button><div className="flex gap-4 pr-5">{body}</div><button type="button" onClick={dismiss} className="mt-6 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-background">Rendben</button></div></div>;
}
