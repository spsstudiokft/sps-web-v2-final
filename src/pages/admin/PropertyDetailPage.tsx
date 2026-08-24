import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, ChevronLeft, FileText, FolderKanban, Image as ImageIcon, List, Users } from "lucide-react";
import { useApi } from "../../hooks/useApi";

export default function PropertyDetailPage() {
  const { id = "" } = useParams(); const { fetchApi } = useApi(); const [data, setData] = useState<any>(null); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const loadDetail = async () => {
    const response = await fetchApi(`/api/admin/properties-core/${id}/detail`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    setData(body);
  };
  useEffect(() => { loadDetail().catch(e => setError(e.message || "Betöltési hiba")); }, [id]);
  const toggleArchive = async () => {
    if (!data) return;
    setSaving(true); setError("");
    try {
      const response = await fetchApi(`/api/admin/properties-core/${id}/archive`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: !data.property.archived_at }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      await loadDetail();
    } catch (e: any) { setError(e.message || "Az archiválási művelet sikertelen."); }
    finally { setSaving(false); }
  };
  if (error) return <div className="p-8 text-red-600">{error}</div>; if (!data) return <div className="p-8 text-muted-text">Property betöltése…</div>;
  const p = data.property; const groups = [["Ügyfelek", data.clients, Users], ["Projektek", data.projects, FolderKanban], ["Galériák és videók", data.galleries, ImageIcon], ["Listingek", data.listings, List], ["Számlák", data.invoices, FileText]];
  return <main className="mx-auto max-w-6xl p-6"><Link to="/admin/property-listings" className="inline-flex items-center gap-1 text-sm text-primary"><ChevronLeft className="h-4 w-4" />Hirdetések</Link><section className="mt-4 rounded-2xl border border-border bg-surface p-6"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><Building2 className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold text-text">{p.property_name}</h1><p className="text-muted-text">{p.address}{p.city ? ` · ${p.city}` : ""}</p>{p.archived_at && <p className="mt-1 text-sm text-amber-600">Archivált</p>}</div></div><button type="button" onClick={toggleArchive} disabled={saving} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text disabled:opacity-60">{saving ? "Mentés…" : p.archived_at ? "Visszaállítás" : "Archiválás"}</button></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><span>Típus: {p.property_type || "—"}</span><span>Alapterület: {p.floor_area_sqm || "—"} m²</span><span>Állapot: {p.condition_status || "—"}</span></div></section><div className="mt-5 grid gap-5 md:grid-cols-2">{groups.map(([title, rows, Icon]: any) => <section key={title} className="rounded-2xl border border-border bg-surface p-5"><h2 className="flex items-center gap-2 font-bold text-text"><Icon className="h-4 w-4 text-primary" />{title} ({rows.length})</h2><div className="mt-3 space-y-2 text-sm text-muted-text">{rows.length ? rows.map((row: any) => <div key={row.id} className="rounded-lg bg-background p-2">{row.name || row.title || row.invoice_number || row.email}</div>) : "Nincs kapcsolódó rekord."}</div></section>)}</div><section className="mt-5 rounded-2xl border border-border bg-surface p-5"><h2 className="font-bold text-text">Activity timeline</h2><div className="mt-3 space-y-2 text-sm">{data.activity.length ? data.activity.map((item: any) => <div key={item.id} className="rounded-lg bg-background p-2">{item.title} <span className="text-muted-text">{item.created_at}</span></div>) : <p className="text-muted-text">Még nincs esemény.</p>}</div></section></main>;
}
