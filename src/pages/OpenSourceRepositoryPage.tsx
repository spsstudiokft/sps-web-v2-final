import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, FileText, GitFork, Github, History, KeyRound, LoaderCircle, Minus, Plus, RotateCcw, Star } from "lucide-react";
import { Footer } from "../components/public/Footer";
import { Header } from "../components/public/Header";
import { SiteSettings } from "../lib/types";

type Repository = { id: number; name: string; description: string; html_url: string; language: string; stargazers_count: number; forks_count: number; updated_at: string; topics: string[] };
type RepositoryDetail = { repository: Repository; readme: string; changelog: string; changelogName: string | null };

function InlineMarkdown({ value }: { value: string }) {
  const parts = value.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\s)]+\))/g);
  return <>{parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-background px-1.5 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4 hover:opacity-80">{link[1]}</a>;
    return <Fragment key={index}>{part}</Fragment>;
  })}</>;
}

type ChangelogCategory = "new" | "fixed" | "updated" | "removed";
const changelogStyles: Record<ChangelogCategory, { label: string; heading: string; icon: typeof Plus }> = {
  new: { label: "New", heading: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: Plus },
  fixed: { label: "Fixed", heading: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: KeyRound },
  updated: { label: "Updated", heading: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300", icon: RotateCcw },
  removed: { label: "Removed", heading: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300", icon: Minus },
};

function MarkdownDocument({ content, emptyMessage, changelog = false }: { content: string; emptyMessage: string; changelog?: boolean }) {
  if (!content.trim()) return <p className="text-muted-text">{emptyMessage}</p>;
  const isChangelog = changelog || /CHANGELOG|HISTORY/.test(emptyMessage);
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let index = 0;
  let currentCategory: ChangelogCategory | null = null;
  while (index < lines.length) {
    const line = lines[index];
    if (line.startsWith("```")) {
      const language = line.slice(3).trim(); const code: string[] = []; index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) { code.push(lines[index]); index += 1; }
      blocks.push(<div key={`code-${index}`} className="my-5 overflow-x-auto rounded-xl border border-border bg-slate-950 p-4 text-sm text-slate-100"><div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{language || "Code"}</div><pre className="font-mono leading-relaxed">{code.join("\n")}</pre></div>); index += 1; continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const categoryMatch = isChangelog ? heading[2].match(/^\[(new|fixed|updated|removed)\]\s*(.*)$/i) : null;
      if (categoryMatch) {
        currentCategory = categoryMatch[1].toLowerCase() as ChangelogCategory;
        const style = changelogStyles[currentCategory]; const Icon = style.icon;
        blocks.push(<div key={`category-${index}`} className={`mt-7 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-black uppercase tracking-wider ${style.heading}`}><Icon className="h-4 w-4" aria-hidden="true" />{categoryMatch[2] || style.label}</div>); index += 1; continue;
      }
      if (isChangelog && heading[1].length <= 2) currentCategory = null;
      const className = heading[1].length === 1 ? "mt-10 text-3xl font-black tracking-tight" : heading[1].length === 2 ? "mt-8 text-2xl font-bold" : "mt-6 text-xl font-bold";
      blocks.push(<h2 key={`heading-${index}`} className={className}><InlineMarkdown value={heading[2]} /></h2>); index += 1; continue;
    }
    if (/^\s*([-*+]\s+|\d+\.\s+)/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*([-*+]\s+|\d+\.\s+)/.test(lines[index])) { items.push(lines[index].replace(/^\s*([-*+]\s+|\d+\.\s+)/, "")); index += 1; }
      const category = currentCategory ? changelogStyles[currentCategory] : null;
      const Icon = category?.icon;
      blocks.push(category && Icon ? <ul key={`list-${index}`} className="my-3 space-y-2">{items.map((item, itemIndex) => <li key={itemIndex} className="flex items-start gap-3 rounded-lg px-3 py-2 text-muted-text transition-colors hover:bg-background"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-current" aria-hidden="true" /><span><InlineMarkdown value={item} /></span></li>)}</ul> : <ul key={`list-${index}`} className="my-4 list-disc space-y-2 pl-6 text-muted-text">{items.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown value={item} /></li>)}</ul>); continue;
    }
    if (line.startsWith("> ")) { blocks.push(<blockquote key={`quote-${index}`} className="my-5 border-l-2 border-primary pl-4 italic text-muted-text"><InlineMarkdown value={line.slice(2)} /></blockquote>); index += 1; continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { blocks.push(<hr key={`rule-${index}`} className="my-8 border-border" />); index += 1; continue; }
    if (!line.trim()) { index += 1; continue; }
    const paragraph: string[] = [line]; index += 1;
    while (index < lines.length && lines[index].trim() && !lines[index].startsWith("```") && !/^(#{1,3})\s+/.test(lines[index]) && !/^\s*([-*+]\s+|\d+\.\s+)/.test(lines[index])) { paragraph.push(lines[index]); index += 1; }
    blocks.push(<p key={`paragraph-${index}`} className="my-4 leading-8 text-muted-text"><InlineMarkdown value={paragraph.join(" ")} /></p>);
  }
  return <div className="markdown-document">{blocks}</div>;
}

export default function OpenSourceRepositoryPage() {
  const { repository = "" } = useParams();
  const [settings, setSettings] = useState<SiteSettings>({}); const [detail, setDetail] = useState<RepositoryDetail | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { Promise.all([fetch("/api/public/settings").then(r => r.ok ? r.json() : {}), fetch(`/api/public/open-source/${encodeURIComponent(repository)}`).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "A repó nem tölthető be."); return data; })]).then(([nextSettings, nextDetail]) => { setSettings(nextSettings || {}); setDetail(nextDetail); }).catch((reason: any) => setError(reason.message || "A repó nem tölthető be.")).finally(() => setLoading(false)); }, [repository]);

  return <div className="min-h-screen bg-background text-text"><Header settings={settings} /><main className="mx-auto max-w-5xl px-4 pb-20 pt-36 sm:px-6"><Link to="/open-source" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-text transition hover:text-primary"><ArrowLeft className="h-4 w-4" />Összes Open Source projekt</Link>{loading ? <div className="flex justify-center py-24"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div> : error || !detail ? <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-sm text-muted-text">{error || "A repó nem található."}</div> : <><section className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-10"><div className="flex flex-wrap items-start justify-between gap-6"><div><span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary"><Github className="h-4 w-4" />Open Source</span><h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{detail.repository.name}</h1><p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-text">{detail.repository.description || "Nyílt forrású SPS Studio projekt."}</p></div><a href={detail.repository.html_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10">GitHub <ExternalLink className="h-4 w-4" /></a></div><div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-muted-text">{detail.repository.language && <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{detail.repository.language}</span>}<span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4" />{detail.repository.stargazers_count} csillag</span><span className="inline-flex items-center gap-1.5"><GitFork className="h-4 w-4" />{detail.repository.forks_count} fork</span></div></section><section className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-10"><div className="flex items-center gap-3"><FileText className="h-6 w-6 text-primary" /><h2 className="text-2xl font-black">Leírás</h2></div><div className="mt-5"><MarkdownDocument content={detail.readme} emptyMessage="Ehhez a repóhoz nem található publikus README fájl." /></div></section><section className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-10"><div className="flex items-center gap-3"><History className="h-6 w-6 text-primary" /><h2 className="text-2xl font-black">Változásnapló</h2>{detail.changelogName && <span className="rounded-full bg-background px-2 py-1 text-xs text-muted-text">{detail.changelogName}</span>}</div><div className="mt-5"><MarkdownDocument content={detail.changelog} emptyMessage="Ehhez a repóhoz nem található publikus CHANGELOG vagy HISTORY fájl." /></div></section></>}</main><Footer settings={settings} /></div>;
}
