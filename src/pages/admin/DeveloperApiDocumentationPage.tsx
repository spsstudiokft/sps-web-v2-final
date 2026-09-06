import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Check, ChevronDown, Clipboard, Code2, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import { apiAccessExplanation, apiDocumentation, type ApiMethod, type ApiOperation } from "../../lib/apiDocumentation";
import { generatedApiRoutes } from "../../lib/apiRoutes.generated";

const methodClass: Record<ApiMethod, string> = {
  GET: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  POST: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  PUT: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  PATCH: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  DELETE: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

function MethodBadge({ method }: { method: string }) {
  const firstMethod = method.split("|")[0] as ApiMethod;
  return <span className={`inline-flex min-w-14 justify-center rounded-md border px-2 py-1 font-mono text-[11px] font-black tracking-wide ${methodClass[firstMethod] || "border-border bg-surface text-text"}`}>{method}</span>;
}

function matchesOperation(operation: ApiOperation, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [operation.method, operation.path, operation.summary, operation.access].some((value) => value.toLowerCase().includes(query));
}

export default function DeveloperApiDocumentationPage() {
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => Object.fromEntries(apiDocumentation.map((section) => [section.id, true])));
  const [copiedPath, setCopiedPath] = useState("");

  useEffect(() => {
    document.title = "API Documentation | SPS Studio";
    const robots = document.querySelector('meta[name="robots"]') || document.head.appendChild(Object.assign(document.createElement("meta"), { name: "robots" }));
    const previous = robots.getAttribute("content");
    robots.setAttribute("content", "noindex, nofollow, noarchive");
    return () => {
      if (previous) robots.setAttribute("content", previous);
      else robots.remove();
    };
  }, []);

  const filteredSections = useMemo(() => apiDocumentation.map((section) => ({ ...section, operations: section.operations.filter((operation) => matchesOperation(operation, query)) })).filter((section) => section.operations.length > 0), [query]);
  const operationCount = filteredSections.reduce((sum, section) => sum + section.operations.length, 0);
  const exactRoutes = useMemo(() => generatedApiRoutes.filter((operation) => matchesOperation(operation, query)), [query]);

  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      window.setTimeout(() => setCopiedPath((value) => value === path ? "" : value), 1800);
    } catch {
      setCopiedPath("");
    }
  };

  return <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
    <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_80%_0%,rgba(56,189,248,.18),transparent_32%),linear-gradient(135deg,rgba(8,27,48,.96),rgba(7,17,31,.98))] p-6 shadow-[0_18px_60px_rgba(2,8,23,.28)] sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.16em] text-primary"><LockKeyhole className="h-3.5 w-3.5" />Internal developer reference</span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">SPS Studio API dokumentáció</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-300">Műveleti referencia a rendszer publikus, adminisztrátori és ügyfélportál API-felületeihez. A dokumentáció nem tartalmaz hitelesítő adatot vagy érzékeny konfigurációt.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-72">
          <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4"><span className="block text-2xl font-black text-white">{apiDocumentation.length}</span><span className="text-xs font-bold uppercase tracking-wider text-slate-400">API-terület</span></div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4"><span className="block text-2xl font-black text-white">{generatedApiRoutes.length}</span><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pontos útvonal</span></div>
        </div>
      </div>
    </section>

    <section className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block max-w-xl flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Keresés útvonal, metódus, funkció vagy jogosultság alapján…" className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-text"><ShieldCheck className="h-4 w-4 text-primary" />{operationCount} releváns műveleti család</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{Object.entries(methodClass).map(([method, className]) => <span key={method} className={`rounded-md border px-2 py-1 font-mono text-[10px] font-black ${className}`}>{method}</span>)}<span className="ml-1 inline-flex items-center text-xs text-muted-text">A több metódust jelölő sorok azonos erőforrás-családhoz tartoznak.</span></div>
    </section>

    <div className="mt-6 space-y-4">{filteredSections.map((section) => {
      const isOpen = openSections[section.id] ?? true;
      return <section key={section.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
        <button type="button" onClick={() => setOpenSections((current) => ({ ...current, [section.id]: !isOpen }))} className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-primary/[.035]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><BookOpenText className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block font-black text-text">{section.title}</span><span className="mt-1 block text-sm text-muted-text">{section.description}</span></span>
          <span className="hidden rounded-full bg-background px-2.5 py-1 text-xs font-bold text-muted-text sm:block">{section.operations.length} útvonal</span><ChevronDown className={`h-5 w-5 shrink-0 text-muted-text transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && <div className="border-t border-border/80 p-3 sm:p-4"><div className="overflow-x-auto"><table className="w-full min-w-[720px] border-separate border-spacing-0"><thead><tr className="text-left text-[11px] font-black uppercase tracking-wider text-muted-text"><th className="px-3 py-2">Metódus</th><th className="px-3 py-2">Útvonal</th><th className="px-3 py-2">Funkció</th><th className="px-3 py-2">Hozzáférés</th></tr></thead><tbody>{section.operations.map((operation) => <tr key={`${operation.method}-${operation.path}`} className="group align-top"><td className="border-t border-border/70 px-3 py-3"><MethodBadge method={operation.method} /></td><td className="border-t border-border/70 px-3 py-3"><button type="button" onClick={() => copyPath(operation.path)} className="inline-flex max-w-[260px] items-center gap-1.5 rounded-lg font-mono text-xs text-primary transition hover:bg-primary/10 hover:text-text"><Code2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{operation.path}</span>{copiedPath === operation.path ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> : <Clipboard className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />}</button></td><td className="border-t border-border/70 px-3 py-3 text-sm leading-6 text-muted-text">{operation.summary}</td><td className="border-t border-border/70 px-3 py-3"><span title={apiAccessExplanation[operation.access]} className="inline-flex cursor-help rounded-full border border-border bg-background px-2.5 py-1 text-xs font-bold text-text">{operation.access}</span></td></tr>)}</tbody></table></div></div>}
      </section>;
    })}</div>
    {!filteredSections.length && <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-muted-text">Nincs a keresésnek megfelelő API-művelet.</div>}
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface"><button type="button" onClick={() => setOpenSections((current) => ({ ...current, exactRoutes: !current.exactRoutes }))} className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-primary/[.035]"><span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Code2 className="h-5 w-5" /></span><span className="flex-1"><span className="block font-black text-text">Teljes generált útvonalindex</span><span className="mt-1 block text-sm text-muted-text">A szerver route-definícióiból buildkor előállított, külön kereshető lista.</span></span><span className="rounded-full bg-background px-2.5 py-1 text-xs font-bold text-muted-text">{exactRoutes.length}</span><ChevronDown className={`h-5 w-5 text-muted-text transition-transform ${openSections.exactRoutes ? "rotate-180" : ""}`} /></button>{openSections.exactRoutes && <div className="max-h-[680px] overflow-auto border-t border-border p-3 sm:p-4"><table className="w-full min-w-[700px]"><tbody>{exactRoutes.map((operation) => <tr key={`${operation.method}-${operation.path}`}><td className="border-b border-border/70 px-3 py-2"><MethodBadge method={operation.method} /></td><td className="border-b border-border/70 px-3 py-2 font-mono text-xs text-primary">{operation.path}</td><td className="border-b border-border/70 px-3 py-2 text-sm text-muted-text">{operation.summary}</td><td className="border-b border-border/70 px-3 py-2 text-xs text-muted-text">{operation.access}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
