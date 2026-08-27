import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Edit2, Eye, EyeOff, MessageSquareQuote, Plus, Save, Trash2, X } from "lucide-react";
import { Testimonial } from "../../lib/types";
import { useApi } from "../../hooks/useApi";
import { usePageTitle } from "../../hooks/usePageTitle";
import { PageHeader } from "../../components/admin/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";

const emptyItem = (): Partial<Testimonial> => ({ quote: "", author_name: "", author_role: "", is_published: 1, sort_order: 0 });

export default function TestimonialsPage() {
  usePageTitle("Rólunk mondták | Admin");
  const { fetchApi } = useApi();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [editing, setEditing] = useState<Partial<Testimonial> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => { setLoading(true); try { const response = await fetchApi("/api/admin/testimonials"); setItems(response.ok ? await response.json() : []); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const save = async () => {
    if (!editing?.quote?.trim() || !editing.author_name?.trim()) { setMessage("Az idézet és a név megadása kötelező."); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetchApi(editing.id ? `/api/admin/testimonials/${editing.id}` : "/api/admin/testimonials", { method: editing.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Mentési hiba");
      setEditing(null); await load();
    } catch (error: any) { setMessage(error.message || "A mentés nem sikerült."); } finally { setSaving(false); }
  };
  const remove = async (item: Testimonial) => { if (!window.confirm(`Biztosan törli ezt a visszajelzést: ${item.author_name}?`)) return; const response = await fetchApi(`/api/admin/testimonials/${item.id}`, { method: "DELETE" }); if (response.ok) await load(); else setMessage("A törlés nem sikerült."); };

  return <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
    <PageHeader title="Rólunk mondták" subtitle="Kezelje a GYIK előtt megjelenő ügyfél-visszajelzéseket.">
      <Link to="/admin/faqs"><Button variant="outline">GYIK kezelése</Button></Link>
      <Button onClick={() => { setMessage(""); setEditing({ ...emptyItem(), sort_order: items.length + 1 }); }}><Plus className="w-4 h-4 mr-2" />Új visszajelzés</Button>
    </PageHeader>
    {message && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">{message}</div>}
    {editing && <Card className="border-primary/30"><CardContent className="p-5 space-y-4"><div className="flex items-center justify-between gap-4"><div><h2 className="font-bold">{editing.id ? "Visszajelzés szerkesztése" : "Új visszajelzés"}</h2><p className="text-sm text-muted-text">A publikált elemek jelennek meg a nyilvános oldalon.</p></div><Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button></div><div><Label>Idézet</Label><textarea value={editing.quote || ""} onChange={(event) => setEditing({ ...editing, quote: event.target.value })} className="mt-1.5 min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div><div className="grid gap-4 md:grid-cols-3"><div><Label>Név</Label><Input className="mt-1.5" value={editing.author_name || ""} onChange={(event) => setEditing({ ...editing, author_name: event.target.value })} /></div><div><Label>Beosztás / cég</Label><Input className="mt-1.5" value={editing.author_role || ""} onChange={(event) => setEditing({ ...editing, author_role: event.target.value })} /></div><div><Label>Sorrend</Label><Input className="mt-1.5" type="number" value={editing.sort_order ?? 0} onChange={(event) => setEditing({ ...editing, sort_order: Number(event.target.value) })} /></div></div><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_published !== 0} onChange={(event) => setEditing({ ...editing, is_published: event.target.checked ? 1 : 0 })} />Megjelenjen a weboldalon</label><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Mégse</Button><Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? "Mentés…" : "Mentés"}</Button></div></CardContent></Card>}
    {loading ? <div className="py-16 text-center text-muted-text">Betöltés…</div> : items.length === 0 ? <Card><CardContent className="p-12 text-center"><MessageSquareQuote className="w-10 h-10 mx-auto text-primary mb-3" /><h2 className="font-bold">Még nincs visszajelzés</h2><p className="text-sm text-muted-text mt-2">Az első publikált elem után a szekció közvetlenül a GYIK elé kerül.</p></CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <Card key={item.id} className={item.is_published ? "" : "opacity-65"}><CardContent className="p-5"><div className="flex justify-between gap-4"><blockquote className="text-sm leading-relaxed text-text">“{item.quote}”</blockquote><span className="text-xs text-muted-text shrink-0">#{item.sort_order}</span></div><div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-3"><div><p className="font-semibold text-sm">{item.author_name}</p>{item.author_role && <p className="text-xs text-muted-text">{item.author_role}</p>}</div><div className="flex gap-1"><Button variant="ghost" size="sm" title={item.is_published ? "Publikálva" : "Piszkozat"} onClick={() => setEditing({ ...item, is_published: item.is_published ? 0 : 1 })}>{item.is_published ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4" />}</Button><Button variant="ghost" size="sm" onClick={() => setEditing(item)}><Edit2 className="w-4 h-4" /></Button><Button variant="ghost" size="sm" className="text-red-500" onClick={() => void remove(item)}><Trash2 className="w-4 h-4" /></Button></div></div></CardContent></Card>)}</div>}
  </div>;
}
