import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ChevronRight, CloudOff, File, Folder, HardDrive, Loader2, RefreshCw, RotateCcw, Save, UsersRound } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useApi } from "../../hooks/useApi";
import { usePageTitle } from "../../hooks/usePageTitle";
import { PageHeader } from "../../components/admin/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";

type MediaFile = { name: string; path: string; isDir: boolean; size?: number; modifiedAt?: number };
type MediaStatus = { configured: boolean; available?: boolean; roots?: string[]; role?: string; error?: string };
type EditorAccess = { id: string; email: string; name: string; roots: string[]; hasSavedAccess: boolean; updatedAt?: string | null };

const bytes = (value?: number) => {
  const amount = Number(value || 0);
  if (!amount) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(amount) / Math.log(1024)), units.length - 1);
  return `${(amount / 1024 ** index).toLocaleString("hu-HU", { maximumFractionDigits: index ? 1 : 0 })} ${units[index]}`;
};

const dateTime = (timestamp?: number) => timestamp ? new Date(timestamp * 1000).toLocaleString("hu-HU") : "—";

export default function MediaLibraryPage() {
  usePageTitle("Közös médiatár | Admin");
  const { fetchApi } = useApi();
  const { user } = useAuth();
  const [status, setStatus] = useState<MediaStatus | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [browsing, setBrowsing] = useState(false);
  const [error, setError] = useState("");
  const [editorAccesses, setEditorAccesses] = useState<EditorAccess[]>([]);
  const [editorDrafts, setEditorDrafts] = useState<Record<string, string>>({});
  const [editorError, setEditorError] = useState("");
  const [savingEditorId, setSavingEditorId] = useState<string | null>(null);
  const canManageEditorAccess = ["admin", "superadmin"].includes(String(user?.role || "").toLowerCase().replace(/[_-]/g, ""));

  const loadEditorAccesses = useCallback(async () => {
    if (!canManageEditorAccess) return;
    const response = await fetchApi("/api/admin/media-library/editor-access");
    const payload = await response.json().catch(() => ([]));
    if (!response.ok) throw new Error(payload.error || "A vágói hozzáférések nem tölthetők be.");
    const entries = Array.isArray(payload) ? payload : [];
    setEditorAccesses(entries);
    setEditorDrafts(Object.fromEntries(entries.map((entry: EditorAccess) => [entry.id, entry.roots.join("\n")])));
  }, [canManageEditorAccess, fetchApi]);

  const browse = useCallback(async (path: string) => {
    setBrowsing(true);
    setError("");
    try {
      const response = await fetchApi(`/api/admin/media-library/browse?path=${encodeURIComponent(path)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "A közös médiatár pillanatnyilag nem elérhető.");
      setCurrentPath(String(payload.path || path));
      setFiles(Array.isArray(payload.files) ? payload.files : []);
    } catch (reason: any) {
      setFiles([]);
      setError(reason?.message || "A közös médiatár pillanatnyilag nem elérhető.");
    } finally {
      setBrowsing(false);
    }
  }, [fetchApi]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchApi("/api/admin/media-library/status");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "A közös médiatár nem elérhető.");
      setStatus(payload);
      const root = Array.isArray(payload.roots) ? payload.roots[0] : "";
      if (payload.configured && root) await browse(root);
      await loadEditorAccesses();
    } catch (reason: any) {
      setStatus({ configured: false, available: false, error: reason?.message || "A közös médiatár pillanatnyilag nem elérhető." });
    } finally {
      setLoading(false);
    }
  }, [browse, fetchApi, loadEditorAccesses]);

  useEffect(() => { void load(); }, [load]);

  const roots = status?.roots || [];
  const unavailable = !loading && (!status?.configured || Boolean(error));

  const saveEditorAccess = async (editorId: string) => {
    setSavingEditorId(editorId); setEditorError("");
    try {
      const roots = String(editorDrafts[editorId] || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      const response = await fetchApi(`/api/admin/media-library/editor-access/${encodeURIComponent(editorId)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roots }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "A hozzáférés nem menthető.");
      await loadEditorAccesses();
    } catch (reason: any) { setEditorError(reason?.message || "A hozzáférés nem menthető."); }
    finally { setSavingEditorId(null); }
  };

  const clearEditorAccess = async (editorId: string) => {
    setSavingEditorId(editorId); setEditorError("");
    try {
      const response = await fetchApi(`/api/admin/media-library/editor-access/${encodeURIComponent(editorId)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "A környezeti változós beállítás nem állítható vissza.");
      await loadEditorAccesses();
    } catch (reason: any) { setEditorError(reason?.message || "A környezeti változós beállítás nem állítható vissza."); }
    finally { setSavingEditorId(null); }
  };

  return <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
    <PageHeader title="Közös médiatár" subtitle="A csapat számára engedélyezett Synology mappák biztonságos böngészése.">
      <Button variant="outline" onClick={() => void load()} disabled={loading || browsing}>
        <RefreshCw className={`mr-2 h-4 w-4 ${loading || browsing ? "animate-spin" : ""}`} />Frissítés
      </Button>
    </PageHeader>

    {loading ? <Card><CardContent className="flex min-h-64 items-center justify-center gap-3 text-muted-text"><Loader2 className="h-5 w-5 animate-spin" />Médiatár állapotának ellenőrzése…</CardContent></Card> : unavailable ? <Card className="border-amber-500/30"><CardContent className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><CloudOff className="mb-4 h-11 w-11 text-amber-500" /><h2 className="text-lg font-bold">A közös médiatár jelenleg nem elérhető</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-text">{status?.error || error || "A Synology szolgáltatás beállítása hiányzik, vagy a NAS átmenetileg nem érhető el."}</p><p className="mt-3 max-w-xl text-xs text-muted-text">Amíg ez az állapot látszik, a rendszer nem kezdeményez fájlműveletet. Ellenőrizze a Synology környezeti változókat és a NAS elérhetőségét.</p><Button className="mt-5" variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Újraellenőrzés</Button></CardContent></Card> : <>
      <Card><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><HardDrive className="h-5 w-5" /></div><div><h2 className="font-semibold">Synology közös médiatár</h2><p className="text-sm text-muted-text">Csak az Ön szerepköréhez engedélyezett mappák jelennek meg.</p></div></div><div className="flex flex-wrap gap-2">{roots.map((root) => <Button key={root} size="sm" variant={currentPath === root ? "primary" : "outline"} onClick={() => void browse(root)} disabled={browsing}>{root.split("/").filter(Boolean).pop() || root}</Button>)}</div></CardContent></Card>

      {error ? <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /><div><p className="font-medium">A mappa tartalma nem tölthető be.</p><p className="mt-1 text-muted-text">{error}</p></div></div> : <Card><CardContent className="p-0"><div className="flex min-h-14 items-center gap-2 overflow-x-auto border-b border-border px-5 text-sm"><Folder className="h-4 w-4 shrink-0 text-primary" />{currentPath.split("/").filter(Boolean).map((part, index, segments) => <span key={`${part}-${index}`} className="flex shrink-0 items-center gap-2"><ChevronRight className="h-3.5 w-3.5 text-muted-text" /><span className={index === segments.length - 1 ? "font-semibold text-text" : "text-muted-text"}>{part}</span></span>)}</div>{browsing ? <div className="flex min-h-64 items-center justify-center gap-3 text-muted-text"><Loader2 className="h-5 w-5 animate-spin" />Mappa betöltése…</div> : files.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><Folder className="mb-3 h-10 w-10 text-muted-text" /><h2 className="font-semibold">Ez a mappa üres</h2><p className="mt-1 text-sm text-muted-text">Válasszon egy másik engedélyezett mappát, vagy töltse fel a fájlokat a Synology Drive-on.</p></div> : <div className="divide-y divide-border">{files.map((item) => <button key={item.path} type="button" onClick={() => item.isDir && void browse(item.path)} disabled={!item.isDir} className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors ${item.isDir ? "hover:bg-surface cursor-pointer" : "cursor-default"}`}><div className={`rounded-lg p-2 ${item.isDir ? "bg-primary/10 text-primary" : "bg-muted text-muted-text"}`}>{item.isDir ? <Folder className="h-4 w-4" /> : <File className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="mt-0.5 text-xs text-muted-text">{item.isDir ? "Mappa" : bytes(item.size)} · Módosítva: {dateTime(item.modifiedAt)}</p></div>{item.isDir && <ChevronRight className="h-4 w-4 text-muted-text" />}</button>)}</div>}</CardContent></Card>}
      {canManageEditorAccess && <Card><CardContent className="p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><UsersRound className="h-5 w-5" /></div><div><h2 className="font-semibold">Vágói mappajogosultságok</h2><p className="mt-1 text-sm text-muted-text">Minden sorba egy abszolút Synology-mappaútvonalat írjon. A mentett szabály elsőbbséget élvez a környezeti JSON-nal szemben.</p></div></div>{editorError && <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">{editorError}</div>}<div className="mt-5 space-y-4">{editorAccesses.length === 0 ? <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-text">Jelenleg nincs vágó szerepkörű felhasználó.</p> : editorAccesses.map((editor) => <div key={editor.id} className="rounded-xl border border-border p-4"><div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{editor.name}</p><p className="text-sm text-muted-text">{editor.email}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${editor.hasSavedAccess ? "bg-primary/10 text-primary" : "bg-muted text-muted-text"}`}>{editor.hasSavedAccess ? "Adminpanelen kezelt" : "Környezeti JSON / nincs beállítás"}</span></div><textarea value={editorDrafts[editor.id] || ""} onChange={(event) => setEditorDrafts((previous) => ({ ...previous, [editor.id]: event.target.value }))} placeholder="/SPS-Media/Vagok/pelda" className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" aria-label={`${editor.name} engedélyezett mappái`} /><div className="mt-3 flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" disabled={savingEditorId === editor.id || !editor.hasSavedAccess} onClick={() => void clearEditorAccess(editor.id)}><RotateCcw className="mr-2 h-3.5 w-3.5" />Környezeti szabály visszaállítása</Button><Button size="sm" disabled={savingEditorId === editor.id} onClick={() => void saveEditorAccess(editor.id)}>{savingEditorId === editor.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}Mentés</Button></div></div>)}</div></CardContent></Card>}
    </>}
  </div>;
}
