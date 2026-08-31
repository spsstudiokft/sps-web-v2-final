import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { tUi } from "../lib/i18n";
import { useSeo } from "../hooks/useSeo";

type Entry = { id: string; version: string; title: string; summary: string; content: string; entry_type: string; published_at?: string; created_at: string };
export default function ChangelogPage() {
  const { currentLang, defaultLang } = useLanguage();
  const tr = (key: string, fallback: string) => tUi(key, currentLang, undefined, defaultLang) || fallback;
  const title = tr("public.changelog.title", "Changelog");
  const description = tr("public.changelog.description", "Follow the latest features, improvements and fixes across the website, client portal and admin area.");
  const [entries, setEntries] = useState<Entry[]>([]); const [loading, setLoading] = useState(true);
  useSeo({ title, description, keywords: "SPS Studio, changelog, updates, features", pageKey: "changelog" });
  useEffect(() => { fetch("/api/public/changelog").then(r => r.ok ? r.json() : []).then(setEntries).catch(() => setEntries([])).finally(() => setLoading(false)); }, []);
  const entryType = (type: string) => type === "fix" ? tr("public.changelog.fix", "Fix") : type === "improvement" ? tr("public.changelog.improvement", "Improvement") : tr("public.changelog.feature", "New feature");
  return <main className="min-h-screen bg-background px-4 py-12 text-text sm:px-6"><div className="mx-auto max-w-4xl"><Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" />{tr("public.changelog.back", "Back to home")}</Link><header className="mt-10 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-background to-sky-500/10 p-8 sm:p-12"><span className="inline-flex rounded-2xl bg-primary/15 p-3 text-primary"><Sparkles className="h-7 w-7" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-primary">SPS Studio</p><h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1><p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-text">{description}</p></header>{loading ? <p className="py-14 text-center text-muted-text">{tr("public.changelog.loading", "Loading…")}</p> : entries.length === 0 ? <p className="py-14 text-center text-muted-text">{tr("public.changelog.empty", "There are no published entries yet.")}</p> : <section className="mt-10 space-y-5">{entries.map((entry) => <article key={entry.id} className="rounded-2xl border border-border bg-surface/70 p-6 shadow-sm"><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-bold text-primary">{entry.version}</span><span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-text">{entryType(entry.entry_type)}</span><span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-text"><CalendarDays className="h-3.5 w-3.5" />{new Intl.DateTimeFormat(currentLang, { dateStyle: "long" }).format(new Date(entry.published_at || entry.created_at))}</span></div><h2 className="mt-4 text-xl font-bold">{entry.title}</h2>{entry.summary && <p className="mt-2 text-sm leading-relaxed text-muted-text">{entry.summary}</p>}{entry.content && <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm leading-7 text-text">{entry.content}</p>}</article>)}</section>}</div></main>;
}
