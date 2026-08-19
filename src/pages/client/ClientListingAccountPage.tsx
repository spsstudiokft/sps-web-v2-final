import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Database, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import { usePageTitle } from "../../hooks/usePageTitle";

export default function ClientListingAccountPage() {
  const { fetchApi } = useApi();
  const [state, setState] = useState<any>(null); const [loading, setLoading] = useState(true); const [migrating, setMigrating] = useState(false); const [error, setError] = useState("");
  usePageTitle("Ingatlanhirdetési fiók");
  useEffect(() => { fetchApi("/api/client/property-listing-account").then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); setState(body); }).catch(error => setError(error.message || "A fiókállapot nem tölthető be.")).finally(() => setLoading(false)); }, [fetchApi]);
  const migrate = async () => {
    if (!confirm("A rendszer egyszeri, kapcsolt ingatlanhirdetési fiókot hoz létre az ügyfélkapus neveddel és email-címeddel. Folytatod?")) return;
    setMigrating(true); setError("");
    try { const response = await fetchApi("/api/client/property-listing-account/migrate", { method: "POST" }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setState(body); }
    catch (error) { setError(error instanceof Error ? error.message : "Az adatmigráció sikertelen."); } finally { setMigrating(false); }
  };
  if (loading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-2xl font-bold text-text">Ingatlanhirdetési fiók</h1><p className="mt-1 text-sm text-muted-text">Külön, az ügyfélkapuhoz biztonságosan kapcsolt felület saját ingatlanhirdetéseid kezelésére.</p></div>
    {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
    <Card><CardContent className="p-6 sm:p-8">{state?.migrated ? <div className="space-y-6 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500"><CheckCircle2 className="h-8 w-8" /></div><div><h2 className="text-xl font-bold text-text">A hirdetői fiók elkészült</h2><p className="mt-2 text-sm text-muted-text">{state.account?.name || "Ügyfél"} · {state.account?.email}</p></div><div className="rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-muted-text">A hirdetéskezelőbe ezentúl a külön ingatlanos bejelentkezési oldalon léphetsz be az ügyfélkapus email-címeddel és jelszavaddal. Az ügyfélkapuból nincs közvetlen fiókváltás.</div></div> : <div className="space-y-6"><div className="flex items-start gap-4"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Database className="h-6 w-6" /></div><div><h2 className="text-lg font-bold text-text">Egyszeri adatmigráció</h2><p className="mt-1 text-sm leading-6 text-muted-text">Az ügyfélkapus nevedből és regisztrált email-címedből külön hirdetői fiók készül egy másik adatbázistáblában. A két fiók végig összekapcsolva marad.</p></div></div><div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-text"><div className="mb-2 flex items-center gap-2 font-bold text-text"><ShieldCheck className="h-4 w-4 text-primary" />Fontos</div>A migráció csak egyszer végezhető el. A hirdetéskezelő közvetlen email–jelszó belépést használ, ezért magic-linkes fióknál előbb állíts be jelszót a Fiókbeállítások oldalon.</div><button onClick={migrate} disabled={migrating} className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">{migrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}Hirdetői fiók létrehozása adatmigrációval</button></div>}</CardContent></Card>
  </div>;
}
