import { useEffect, useState } from "react";
import { BookOpenCheck, CheckCircle2, ChevronDown, CircleHelp, ImageOff } from "lucide-react";
import { useApi } from "../../hooks/useApi";

type HelpTopic = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  steps: string[];
};

export default function ClientHelpPage() {
  const { fetchApi } = useApi();
  const [topics, setTopics] = useState<HelpTopic[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi("/api/client/help")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "A súgó nem tölthető be.");
        setEnabled(body.enabled !== false);
        const nextTopics = Array.isArray(body.topics) ? body.topics : [];
        setTopics(nextTopics);
        setOpenTopic(nextTopics[0]?.id || null);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "A súgó nem tölthető be."))
      .finally(() => setLoading(false));
  }, [fetchApi]);

  if (loading) return <div className="flex min-h-72 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return <div className="space-y-6">
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><BookOpenCheck className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-bold text-text sm:text-2xl">Ügyfélportál súgó</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-text">Lépésről lépésre segítünk megtalálni a projekteket, galériákat, letöltéseket és a fiókodhoz tartozó fontos funkciókat.</p>
        </div>
      </div>
    </div>

    {error ? <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}

    {!error && (!enabled || topics.length === 0) ? <div className="rounded-2xl border border-border bg-surface p-10 text-center"><CircleHelp className="mx-auto mb-3 h-10 w-10 text-primary" /><h2 className="text-base font-bold text-text">A súgó hamarosan elérhető</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-text">Jelenleg még nincs közzétett súgótopik az ügyfélportálhoz.</p></div> : null}

    <div className="space-y-3">
      {topics.map((topic, topicIndex) => {
        const isOpen = openTopic === topic.id;
        return <article key={topic.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <button type="button" onClick={() => setOpenTopic(isOpen ? null : topic.id)} className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5" aria-expanded={isOpen}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{topicIndex + 1}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-text sm:text-base">{topic.title || `Súgótopik ${topicIndex + 1}`}</span><span className="mt-0.5 block truncate text-xs text-muted-text">{topic.description}</span></span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-muted-text transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
          {isOpen ? <div className="border-t border-border px-4 py-5 sm:px-5">
            {topic.description ? <p className="mb-5 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-text">{topic.description}</p> : null}
            <div className={`grid gap-5 ${topic.image_url ? "lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.8fr)]" : ""}`}>
              <div>
                {topic.steps.length ? <ol className="space-y-3">{topic.steps.map((step, stepIndex) => <li key={`${topic.id}-${stepIndex}`} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">{stepIndex + 1}</span><span className="pt-0.5 text-sm leading-6 text-text">{step}</span></li>)}</ol> : <p className="flex items-center gap-2 text-sm text-muted-text"><CheckCircle2 className="h-4 w-4 text-primary" />Nincs további lépés megadva ehhez a topikhoz.</p>}
              </div>
              {topic.image_url ? <img src={topic.image_url} alt={`${topic.title} – súgó kép`} className="max-h-[28rem] w-full rounded-xl border border-border bg-background object-contain" loading="lazy" /> : <div className="hidden items-center justify-center rounded-xl border border-dashed border-border bg-background/50 p-6 text-muted-text lg:flex"><ImageOff className="h-5 w-5" /></div>}
            </div>
          </div> : null}
        </article>;
      })}
    </div>
  </div>;
}
