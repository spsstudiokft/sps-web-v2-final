import { ChangeEvent, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Image as ImageIcon, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { uploadMediaFile } from "../../lib/uploadHelper";

type HelpTopic = { id: string; title: string; description: string; image_url: string; steps: string[]; is_visible: boolean };

function parseTopics(raw: unknown): HelpTopic[] {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((topic, index) => ({ id: String(topic?.id || `client-help-${index + 1}`), title: String(topic?.title || ""), description: String(topic?.description || ""), image_url: String(topic?.image_url || ""), steps: Array.isArray(topic?.steps) ? topic.steps.map((step: unknown) => String(step || "")) : [], is_visible: topic?.is_visible !== false }));
  } catch { return []; }
}

export default function ClientHelpAdminPage() {
  const { fetchApi } = useApi();
  const { token } = useAuth();
  const [topics, setTopics] = useState<HelpTopic[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingTopic, setUploadingTopic] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchApi("/api/admin/settings").then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "A súgó beállításai nem tölthetők be.");
      setTopics(parseTopics(body.client_help_topics));
      setEnabled(body.client_help_enabled !== "0" && body.client_help_enabled !== "false");
    }).catch((error) => setMessage(error instanceof Error ? error.message : "A súgó beállításai nem tölthetők be.")).finally(() => setLoading(false));
  }, [fetchApi]);

  const updateTopic = (index: number, patch: Partial<HelpTopic>) => setTopics((current) => current.map((topic, currentIndex) => currentIndex === index ? { ...topic, ...patch } : topic));
  const moveTopic = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= topics.length) return;
    setTopics((current) => { const next = [...current]; [next[index], next[destination]] = [next[destination], next[index]]; return next; });
  };
  const updateStep = (topicIndex: number, stepIndex: number, value: string) => updateTopic(topicIndex, { steps: topics[topicIndex].steps.map((step, currentIndex) => currentIndex === stepIndex ? value : step) });
  const uploadImage = async (topicIndex: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingTopic(topics[topicIndex].id); setMessage("");
    try {
      const result = await uploadMediaFile(file, { token, projectName: "client-help", categoryName: "help", itemType: "image", useStructuredName: true });
      updateTopic(topicIndex, { image_url: result.url });
    } catch (error) { setMessage(error instanceof Error ? error.message : "A kép feltöltése nem sikerült."); }
    finally { setUploadingTopic(null); }
  };
  const save = async () => {
    setSaving(true); setMessage("");
    try {
      const response = await fetchApi("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_help_enabled: enabled ? "1" : "0", client_help_topics: JSON.stringify(topics) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "A súgó nem menthető.");
      setMessage("A kliensportál súgója elmentve.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "A súgó nem menthető."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  return <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
    <PageHeader title="Ügyfélportál súgó" description="Szerkeszthető, képes lépésről lépésre útmutatók a kliensportál felhasználóinak." action={<Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Mentés..." : "Változtatások mentése"}</Button>} />
    {message ? <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-text">{message}</div> : null}
    <Card><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-text">Súgó megjelenítése az ügyfélportálon</h2><p className="mt-1 text-sm text-muted-text">Kikapcsolva a Súgó menüpont megmarad, de az ügyfeleknek egy átmenetileg nem elérhető állapot jelenik meg.</p></div><button type="button" onClick={() => setEnabled((current) => !current)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${enabled ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-border bg-surface text-muted-text"}`}>{enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}{enabled ? "Bekapcsolva" : "Kikapcsolva"}</button></CardContent></Card>
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-text">Súgótopikok</h2><p className="text-sm text-muted-text">A lista sorrendje a kliensportálon is megmarad.</p></div><Button variant="secondary" onClick={() => setTopics((current) => [...current, { id: `client-help-${Date.now()}`, title: "", description: "", image_url: "", steps: [""], is_visible: true }])} disabled={topics.length >= 30}><Plus className="mr-2 h-4 w-4" />Új topik</Button></div>
    <div className="space-y-5">{topics.map((topic, topicIndex) => <Card key={topic.id}><CardContent className="space-y-5 p-5"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{topicIndex + 1}</span><button type="button" onClick={() => updateTopic(topicIndex, { is_visible: !topic.is_visible })} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${topic.is_visible ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-border bg-surface text-muted-text"}`}>{topic.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{topic.is_visible ? "Látható" : "Rejtett"}</button></div><div className="flex items-center gap-1"><button type="button" onClick={() => moveTopic(topicIndex, -1)} disabled={topicIndex === 0} className="rounded-lg p-2 text-muted-text hover:bg-background disabled:opacity-30" aria-label="Fel"><ChevronUp className="h-4 w-4" /></button><button type="button" onClick={() => moveTopic(topicIndex, 1)} disabled={topicIndex === topics.length - 1} className="rounded-lg p-2 text-muted-text hover:bg-background disabled:opacity-30" aria-label="Le"><ChevronDown className="h-4 w-4" /></button><button type="button" onClick={() => setTopics((current) => current.filter((_, index) => index !== topicIndex))} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10" aria-label="Törlés"><Trash2 className="h-4 w-4" /></button></div></div>
      <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-semibold text-text">Topik címe<input value={topic.title} onChange={(event) => updateTopic(topicIndex, { title: event.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Például: Projektek és galériák megnyitása" /></label><label className="block text-sm font-semibold text-text">Rövid leírás<textarea value={topic.description} onChange={(event) => updateTopic(topicIndex, { description: event.target.value })} className="mt-1.5 min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Röviden írd le, miben segít ez az útmutató." /></label></div>
      <div className="rounded-xl border border-border bg-background/40 p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold text-text">Lépések</h3><p className="text-xs text-muted-text">Az ügyfél ezeket számozott sorrendben látja.</p></div><Button variant="secondary" size="sm" onClick={() => updateTopic(topicIndex, { steps: [...topic.steps, ""] })} disabled={topic.steps.length >= 20}><Plus className="mr-1 h-3.5 w-3.5" />Lépés</Button></div><div className="space-y-2">{topic.steps.map((step, stepIndex) => <div key={`${topic.id}-${stepIndex}`} className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{stepIndex + 1}</span><input value={step} onChange={(event) => updateStep(topicIndex, stepIndex, event.target.value)} className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Írd le ezt a lépést..." /><button type="button" onClick={() => updateTopic(topicIndex, { steps: topic.steps.filter((_, index) => index !== stepIndex) })} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10" aria-label="Lépés törlése"><Trash2 className="h-4 w-4" /></button></div>)}</div></div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_13rem]"><label className="block text-sm font-semibold text-text">Segédkép URL-je<input value={topic.image_url} onChange={(event) => updateTopic(topicIndex, { image_url: event.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="https://..." /></label><label className="flex cursor-pointer items-end"><span className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-text hover:border-primary/40">{uploadingTopic === topic.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{uploadingTopic === topic.id ? "Feltöltés..." : "Kép feltöltése"}</span><input type="file" accept="image/*" className="sr-only" onChange={(event) => void uploadImage(topicIndex, event)} disabled={uploadingTopic !== null} /></label></div>
      {topic.image_url ? <div className="overflow-hidden rounded-xl border border-border bg-background"><div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-semibold text-muted-text"><ImageIcon className="h-3.5 w-3.5" />Előnézet</div><img src={topic.image_url} alt="Súgó kép előnézete" className="max-h-72 w-full object-contain" /></div> : null}
    </CardContent></Card>)}</div>
    {!topics.length ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-text">Még nincs súgótopik. Kezdd egy új topik létrehozásával.</div> : null}
  </div>;
}
