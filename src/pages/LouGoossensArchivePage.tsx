import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Film, Languages, ShieldCheck } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";

type LouData = {
  subject: { name: string; occupation: string; known_for: string; portrait_url?: string; portrait_source_url?: string };
  biography: { summary: string; career: string[]; note?: string };
  name_bitmap: { glyphs: Record<string, string[]>; text: string };
  selected_work: Array<{ year: number; title: string; medium: string; role: string }>;
  sources: string[];
};

function BitmapName({ bitmap }: { bitmap: LouData["name_bitmap"] }) {
  const rows = useMemo(() => Array.from({ length: 7 }, (_, row) => bitmap.text.split("").map((letter) => letter === " " ? "000" : bitmap.glyphs[letter]?.[row] || "00000").join("0")), [bitmap]);
  return <div className="grid w-full max-w-full gap-[clamp(1px,0.25vw,4px)] overflow-hidden rounded-2xl border border-primary/30 bg-background/60 p-2.5 shadow-[0_0_42px_rgba(69,187,255,.18)] sm:inline-grid sm:w-auto sm:p-4" aria-label={bitmap.text} role="img">
    {rows.map((row, rowIndex) => <div key={rowIndex} className="flex justify-center gap-[clamp(1px,0.25vw,4px)]">{row.split("").map((pixel, pixelIndex) => <i key={pixelIndex} className={`block h-[clamp(2px,0.9vw,12px)] w-[clamp(2px,0.9vw,12px)] shrink-0 rounded-[1px] sm:rounded-[2px] ${pixel === "1" ? "bg-primary shadow-[0_0_10px_rgba(82,194,255,.9)]" : "bg-primary/10"}`} />)}</div>)}
  </div>;
}

export default function LouGoossensArchivePage() {
  usePageTitle("Lou Goossens");
  const [data, setData] = useState<LouData | null>(null);
  const [error, setError] = useState(false);
  const [developerNoteOpen, setDeveloperNoteOpen] = useState(true);
  const [language, setLanguage] = useState<"hu" | "en">("hu");

  useEffect(() => {
    fetch("/api/health/lou", { headers: { Accept: "application/json" } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("unavailable")))
      .then((value: LouData) => setData(value))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    const previous = document.querySelector('meta[name="robots"]')?.getAttribute("content") || null;
    let tag = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!tag) { tag = document.createElement("meta"); tag.name = "robots"; document.head.appendChild(tag); }
    tag.content = "noindex, nofollow";
    return () => { if (tag) { if (previous === null) tag.remove(); else tag.content = previous; } };
  }, []);

  if (error) return <main className="grid min-h-screen place-items-center bg-background p-6 text-muted-text">Az archív bejegyzés jelenleg nem érhető el.</main>;
  if (!data) return <main className="grid min-h-screen place-items-center bg-background"><span className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-label="Betöltés" /></main>;

  const hu = language === "hu";
  const copy = hu ? {
    occupation: "színész",
    summary: "Lou Goossens belga színész, akinek filmes pályája az Alleen Ik című holland nyelvű rövidfilmmel indult. Szélesebb ismertséget Elias Montero megformálásával szerzett Anthony Schatteman Young Hearts című felnövéstörténetében.",
    career: [
      "Goossens 2022-ben debütált a vásznon Flor szerepében Jasper De Maeseneer Alleen Ik című rövidfilmjében.",
      "2023-ban Dennis szerepében szerepelt a Boomer című televíziós sorozatban.",
      "2024-ben Elias Montero szerepét játszotta a Young Hearts című játékfilmben; ez volt az első főszerepe egész estés alkotásban. A film a 74. Berlini Nemzetközi Filmfesztivál Generation Kplus szekciójában mutatkozott be.",
      "2024-es televíziós munkái közé tartozik a fiatal Ben Schotz szerepe a Moresnetben.",
      "2025-ben ismét Jasper De Maeseneerrel dolgozott a Shutterspeed című rövidfilmben, Cas szerepében."
    ],
    note: "Ez a bejegyzés kizárólag nyilvánosan dokumentált szakmai krediteket és produkciós kontextust tartalmaz.",
    archive: "Húsvéti tojás",
    noteTitle: "Üzenet a fejlesztőtől | ONLY LOU, FOREVER! ❤️",
    developerNote: "A fejlesztő nagyon örül, hogy megtaláltad ezt az oldalt. Ha magadtól bukkantál rá, gratulálunk! A fejlesztő személyesen ismeri Lou Goossenst, és ezzel az oldallal tiszteleg a munkássága előtt.",
    biography: "Életrajzi áttekintés",
    selectedWork: "Válogatott munkák",
    sources: "Források",
    portraitSource: "Portré forrása",
    media: { "short film": "rövidfilm", "television series": "televíziós sorozat", "feature film": "játékfilm" } as Record<string, string>
  } : {
    occupation: data.subject.occupation,
    summary: data.biography.summary,
    career: data.biography.career,
    note: data.biography.note || "",
    archive: "Easter Egg",
    noteTitle: "A note from the developer | ONLY LOU, FOREVER! ❤️",
    developerNote: "The developer is very happy that you found this page. If you discovered it on your own, congratulations! The developer knows Lou Goossens personally, and this page pays tribute to his work.",
    biography: "Biography",
    selectedWork: "Selected work",
    sources: "Sources",
    portraitSource: "Portrait source",
    media: {} as Record<string, string>
  };

  return <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_20%_12%,rgba(50,174,255,.22),transparent_28%),radial-gradient(circle_at_90%_88%,rgba(63,117,255,.15),transparent_31%)] bg-background px-5 py-10 text-text sm:px-8 sm:py-16">
    <section className="mx-auto max-w-5xl">
      <div className="mb-9 flex items-center justify-between gap-3"><div className="min-w-0 truncate text-xs font-bold uppercase tracking-[.16em] text-primary sm:tracking-[.22em]"><ShieldCheck className="mr-2 inline-block" size={16}/>{copy.archive}</div><div className="flex shrink-0 items-center rounded-xl border border-primary/25 bg-background/55 p-1 text-xs font-bold"><Languages size={15} className="mx-2 text-primary"/><button type="button" onClick={() => setLanguage("hu")} className={`rounded-lg px-2.5 py-1.5 transition-colors ${hu ? "bg-primary text-primary-foreground" : "text-muted-text hover:text-text"}`}>HU</button><button type="button" onClick={() => setLanguage("en")} className={`rounded-lg px-2.5 py-1.5 transition-colors ${!hu ? "bg-primary text-primary-foreground" : "text-muted-text hover:text-text"}`}>EN</button></div></div>
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_260px]">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.22em] text-muted-text">{copy.occupation}</p>
          <BitmapName bitmap={data.name_bitmap} />
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-text">{copy.summary}</p>
        </div>
      </div>
      <aside className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 shadow-[0_0_36px_rgba(69,187,255,.10)] backdrop-blur-xl">
        <button type="button" onClick={() => setDeveloperNoteOpen(open => !open)} aria-expanded={developerNoteOpen} className="flex w-full items-center justify-between gap-3 p-5 text-left sm:gap-4 sm:p-7">
          <span className="min-w-0 text-sm font-bold uppercase tracking-[.1em] text-primary sm:tracking-[.16em]">{copy.noteTitle}</span>
          <ChevronDown size={20} className={`shrink-0 text-primary transition-transform ${developerNoteOpen ? "rotate-180" : ""}`} />
        </button>
        {developerNoteOpen && <div className="px-6 pb-6 sm:px-7 sm:pb-7"><p lang={language} className="text-base leading-7 text-text">{copy.developerNote}</p></div>}
      </aside>
      <div className="mt-12 grid gap-7 lg:grid-cols-[1.15fr_.85fr]">
        <article className="rounded-2xl border border-border bg-surface/75 p-6 shadow-xl backdrop-blur-xl sm:p-8"><h2 className="text-xl font-bold">{copy.biography}</h2><div className="mt-5 grid items-start gap-7 sm:grid-cols-[1fr_170px]"><div className="space-y-4 text-sm leading-7 text-muted-text">{copy.career.map(item => <p key={item}>{item}</p>)}{copy.note && <p className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted-text">{copy.note}</p>}</div>{data.subject.portrait_url && <figure className="mx-auto w-[170px] max-w-full"><img src={data.subject.portrait_url} alt={`Portrait of ${data.subject.name}`} loading="eager" fetchPriority="high" width={170} height={255} className="block h-[255px] w-[170px] max-w-full rounded-2xl border border-primary/30 object-cover shadow-[0_0_34px_rgba(69,187,255,.20)]"/>{data.subject.portrait_source_url && <figcaption className="mt-2 text-center text-[11px] text-muted-text"><a className="inline-flex items-center gap-1 hover:text-primary" href={data.subject.portrait_source_url} target="_blank" rel="noreferrer">{copy.portraitSource} <ExternalLink size={11}/></a></figcaption>}</figure>}</div></article>
        <aside className="rounded-2xl border border-border bg-background/65 p-6 shadow-xl backdrop-blur-xl sm:p-8"><div className="flex items-center gap-2"><Film className="text-primary" size={19}/><h2 className="font-bold">{copy.selectedWork}</h2></div><ol className="mt-5 space-y-4">{data.selected_work.map(work => <li key={`${work.year}-${work.title}`} className="border-l-2 border-primary/40 pl-4"><p className="text-xs font-bold text-primary">{work.year} · {copy.media[work.medium] || work.medium}</p><p className="mt-1 font-semibold text-text">{work.title}</p><p className="text-sm text-muted-text">{work.role}</p></li>)}</ol></aside>
      </div>
      <footer className="mt-7 rounded-2xl border border-border bg-background/50 p-5 text-sm text-muted-text"><h2 className="font-semibold text-text">{copy.sources}</h2><ul className="mt-3 space-y-2">{data.sources.map((source, index) => <li key={source}><a className="inline-flex items-center gap-2 text-primary hover:underline" href={source} target="_blank" rel="noreferrer"><ExternalLink size={14}/>{index + 1}. {new URL(source).hostname.replace(/^www\./, "")}</a></li>)}</ul></footer>
    </section>
  </main>;
}
