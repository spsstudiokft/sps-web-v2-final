import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Bath, Building2, Check, Eye, EyeOff, ExternalLink, Home, ImagePlus, Loader2, MapPin, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { PropertyListing, PropertyListingImage } from "../../lib/types";
import { uploadMediaFile } from "../../lib/uploadHelper";
import { AdminPagination, AdminPaginationMeta } from "../../components/admin/AdminPagination";

const heatingOptions = ["Központi", "Gázkonvektor", "Gázkazán", "Cirkó", "Elektromos", "Hőszivattyú", "Padlófűtés", "Kandalló", "Távfűtés"];
const booleanFields = [
  ["central_heating", "Központi fűtés"], ["garden_access", "Kertkapcsolat"],
  ["floor_plan_available", "Alaprajz kérhető"], ["balcony", "Erkély"],
  ["full_comfort", "Összkomfortos"], ["air_conditioned", "Légkondicionált"],
  ["new_construction", "Új építésű"],
] as const;

type ListingDraft = Omit<PropertyListing, "id" | "created_at" | "updated_at">;
const emptyDraft = (): ListingDraft => ({
  property_id: null, title: "", location: "", price_huf: 0, price_text: "", floor_area_sqm: 0, rooms: 0, bathrooms: 0,
  description: "", listing_status: "active", listing_type: "sale", construction_year: null, floor_count: null,
  central_heating: 0, garden_access: 0, floor_plan_available: 0, balcony: 0, full_comfort: 0,
  air_conditioned: 0, new_construction: 0, orientation: "", view_type: "", bathroom_toilet: "",
  heating_types: [], image_urls: [], is_enabled: 0,
});

export default function PropertyListingsPage() {
  const { fetchApi } = useApi();
  const [items, setItems] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<AdminPaginationMeta>({ page: 1, page_size: 24, total: 0, total_pages: 1 });
  const [editing, setEditing] = useState<PropertyListing | null | "new">(null);
  const [message, setMessage] = useState("");
  const [menuEnabled, setMenuEnabled] = useState(true);
  const [savingMenu, setSavingMenu] = useState(false);
  usePageTitle("Ingatlanhirdetések", "Admin");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: query, page: String(page), page_size: "24" });
      const response = await fetchApi(`/api/admin/property-listings?${params}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "A hirdetések nem tölthetők be.");
      setItems(body.items || []);
      setPagination(body.pagination);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Betöltési hiba."); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const timer = setTimeout(load, 250);
    fetchApi("/api/admin/settings").then(response => response.ok ? response.json() : {}).then(settings => setMenuEnabled(settings.property_menu_enabled !== "0" && settings.property_menu_enabled !== "false")).catch(() => {});
    return () => clearTimeout(timer);
  }, [query, page]);
  useEffect(() => { setPage(1); }, [query]);

  const togglePublicMenu = async () => {
    const next = !menuEnabled;
    setSavingMenu(true);
    try {
      const response = await fetchApi("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ property_menu_enabled: next ? "1" : "0" }) });
      if (!response.ok) throw new Error("A publikus menüpont beállítása nem menthető.");
      setMenuEnabled(next);
      setMessage(next ? "Az Ingatlanok menüpont megjelent a főoldalon." : "Az Ingatlanok menüpont el lett rejtve a főoldalról. A /properties cím továbbra is elérhető.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Mentési hiba."); }
    finally { setSavingMenu(false); }
  };

  const filtered = items;
  const toggleVisibility = async (item: PropertyListing) => {
    const response = await fetchApi(`/api/admin/property-listings/${item.id}/visibility`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_enabled: !item.is_enabled }) });
    const body = await response.json();
    if (response.ok) setItems(current => current.map(entry => entry.id === item.id ? body : entry));
    else setMessage(body.error || "A láthatóság módosítása sikertelen.");
  };
  const remove = async (item: PropertyListing) => {
    if (!confirm(`Biztosan törlöd ezt a hirdetést és minden feltöltött képét?\n\n${item.title}`)) return;
    const response = await fetchApi(`/api/admin/property-listings/${item.id}`, { method: "DELETE" });
    const body = await response.json();
    if (response.ok) setItems(current => current.filter(entry => entry.id !== item.id));
    else setMessage(body.error || "A törlés sikertelen.");
  };

  return <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
    <PageHeader title="Ingatlanhirdetések" description="A publikus ingatlanoldal hirdetéseinek létrehozása, médiakezelése és publikálása." action={<button type="button" onClick={() => setEditing("new")} className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background hover:opacity-90"><Plus className="mr-2 h-4 w-4" />Új ingatlan</button>} />
    <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><div className="font-bold text-text">Ingatlanok menüpont a főoldalon</div><p className="mt-1 text-xs text-muted-text">A kapcsoló csak a főmenüs elérést szabályozza; a /properties oldal közvetlen címe mindig működik.</p></div>
      <div className="flex items-center gap-3"><a href="/properties" target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-text hover:border-primary"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Publikus oldal</a><button type="button" role="switch" aria-checked={menuEnabled} disabled={savingMenu} onClick={togglePublicMenu} className={`relative h-7 w-12 rounded-full transition disabled:opacity-60 ${menuEnabled ? "bg-emerald-500" : "bg-muted-text/30"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${menuEnabled ? "left-6" : "left-1"}`} /></button></div>
    </div>
    {message && <div className="mb-5 flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-text"><span>{message}</span><button onClick={() => setMessage("")}><X className="h-4 w-4" /></button></div>}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Keresés cím vagy helyszín alapján…" className="pl-10" /></div>
      <div className="text-sm text-muted-text">{items.length} hirdetés · {items.filter(item => item.is_enabled).length} bekapcsolva</div>
    </div>
    {loading ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : filtered.length === 0 ?
      <Card><CardContent className="flex min-h-60 flex-col items-center justify-center text-center"><Building2 className="mb-4 h-10 w-10 text-muted-text" /><h2 className="font-bold text-text">Nincs megjeleníthető ingatlan</h2><p className="mt-1 text-sm text-muted-text">Hozd létre az első ingatlanhirdetést.</p></CardContent></Card> :
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map(item => <PropertyCard key={item.id} item={item} onEdit={() => setEditing(item)} onDelete={() => remove(item)} onToggle={() => toggleVisibility(item)} />)}</div>}
    <AdminPagination meta={pagination} onPageChange={setPage} />
    {editing && <PropertyListingModal initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={saved => { setItems(current => current.some(item => item.id === saved.id) ? current.map(item => item.id === saved.id ? saved : item) : [saved, ...current]); setEditing(null); }} />}
  </div>;
}

function PropertyCard({ item, onEdit, onDelete, onToggle }: { key?: string; item: PropertyListing; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  const preview = item.image_urls[0]?.thumbnailUrl || item.image_urls[0]?.compressedUrl || item.image_urls[0]?.url;
  const status = item.listing_status === "active" ? "Aktív" : item.listing_status === "reserved" ? "Lefoglalt" : "Elkelt";
  return <Card className="overflow-hidden">
    <div className="relative aspect-[16/10] bg-background">{preview ? <img src={preview} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center"><Home className="h-12 w-12 text-muted-text/40" /></div>}
      <div className="absolute left-3 top-3 flex gap-2"><span className="rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-bold text-white">{item.listing_type === "sale" ? "Eladó" : "Kiadó"}</span><span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-900">{status}</span></div>
      <button onClick={onToggle} className={`absolute right-3 top-3 rounded-full p-2 shadow ${item.is_enabled ? "bg-emerald-500 text-white" : "bg-slate-950/75 text-white"}`} title={item.is_enabled ? "Hirdetés bekapcsolva" : "Hirdetés kikapcsolva"}>{item.is_enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
    </div>
    <CardContent className="space-y-4 p-5"><div><h2 className="line-clamp-1 text-lg font-bold text-text">{item.title}</h2><p className="mt-1 flex items-center gap-1 text-sm text-muted-text"><MapPin className="h-3.5 w-3.5" />{item.location}</p></div>
      <div className={`rounded-lg border px-3 py-2 text-xs ${item.owner_account_id ? "border-blue-500/20 bg-blue-500/10" : "border-border bg-surface"}`}>
        <div className="font-bold text-text">{item.owner_account_id ? `Tulajdonos: ${item.owner_name || item.owner_email || "Kapcsolt hirdetői fiók"}` : "Tulajdonos: SPS Studio / Admin"}</div>
        <div className="mt-0.5 text-muted-text">Létrehozta: {item.created_by_role === "client" ? (item.creator_name || item.creator_email || "Ügyfélkapus felhasználó") : (item.creator_name || item.creator_email || "Adminisztrátor")}</div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-text"><span>{item.floor_area_sqm} m²</span><span>{item.rooms} szoba</span><span>{item.bathrooms} fürdő</span><span>{item.image_urls.length} kép</span></div>
      <div className="font-bold text-primary">{item.price_text || `${Number(item.price_huf || 0).toLocaleString("hu-HU")} Ft`}</div>
      <div className="flex items-center justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onEdit} className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-text hover:bg-surface"><Pencil className="mr-1.5 h-3.5 w-3.5" />Szerkesztés</button><button type="button" onClick={onDelete} className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/10"><Trash2 className="mr-1.5 h-3.5 w-3.5" />Törlés</button></div>
    </CardContent>
  </Card>;
}

export function PropertyListingModal({ initial, onClose, onSaved, apiBase = "/api/admin/property-listings", authToken, fetcher }: { initial: PropertyListing | null; onClose: () => void; onSaved: (item: PropertyListing) => void; apiBase?: string; authToken?: string | null; fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> }) {
  const { fetchApi: contextFetchApi } = useApi(); const { token: contextToken } = useAuth();
  const fetchApi = fetcher || contextFetchApi; const token = authToken || contextToken;
  const [draft, setDraft] = useState<ListingDraft>(() => initial ? { ...initial, heating_types: [...initial.heating_types], image_urls: [...initial.image_urls] } : emptyDraft());
  const [properties, setProperties] = useState<Array<{ id: string; property_name: string; address: string; archived_at?: string | null }>>([]);
  const [files, setFiles] = useState<File[]>([]); const [saving, setSaving] = useState(false); const [progress, setProgress] = useState(0); const [error, setError] = useState("");
  const patch = <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => setDraft(current => ({ ...current, [key]: value }));
  useEffect(() => {
    if (apiBase !== "/api/admin/property-listings") return;
    fetchApi("/api/admin/properties-core").then(response => response.ok ? response.json() : []).then(data => setProperties(Array.isArray(data) ? data.filter(item => !item.archived_at) : [])).catch(() => {});
  }, [apiBase]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const uploaded: PropertyListingImage[] = [];
      for (let index = 0; index < files.length; index++) {
        const result = await uploadMediaFile(files[index], { token, useStructuredName: true, projectName: draft.title, categoryName: "property-listings", itemType: "image", itemNumber: draft.image_urls.length + index + 1, onProgress: percent => setProgress(Math.round(((index + percent / 100) / Math.max(files.length, 1)) * 100)) });
        uploaded.push({ url: result.url, compressedUrl: result.compressedUrl, thumbnailUrl: result.thumbnailUrl, originalName: result.originalFilename || result.originalName || files[index].name });
      }
      const response = await fetchApi(initial ? `${apiBase}/${initial.id}` : apiBase, { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, image_urls: [...draft.image_urls, ...uploaded] }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "A hirdetés mentése sikertelen."); onSaved(body);
    } catch (error) { setError(error instanceof Error ? error.message : "Mentési hiba."); } finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-md sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <div className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="text-xl font-bold text-text">{initial ? "Ingatlan szerkesztése" : "Új ingatlan létrehozása"}</h2><p className="text-xs text-muted-text">A bekapcsolt hirdetés megjelenik a publikus /properties oldalon.</p></div><button onClick={onClose} disabled={saving} className="rounded-lg p-2 text-muted-text hover:bg-surface hover:text-text"><X className="h-5 w-5" /></button></div>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col"><div className="flex-1 space-y-8 overflow-y-auto p-5 sm:p-6">
        {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
        <FormSection title="Alapadatok" icon={<Home className="h-5 w-5" />}><div className="grid gap-4 sm:grid-cols-2">
          {apiBase === "/api/admin/property-listings" && <Field label="Központi ingatlan" className="sm:col-span-2"><select value={draft.property_id || ""} onChange={e => patch("property_id", e.target.value || null)} className="block w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text outline-none focus:border-primary"><option value="">Új önálló ingatlan létrehozása a cím és helyszín alapján</option>{properties.map(property => <option key={property.id} value={property.id}>{property.property_name} — {property.address}</option>)}</select><p className="mt-1 text-xs text-muted-text">Egy ingatlanhoz több, külön aktiválható hirdetés kapcsolható.</p></Field>}
          <Field label="Cím *" className="sm:col-span-2"><Input required value={draft.title} onChange={e => patch("title", e.target.value)} maxLength={180} /></Field>
          <Field label="Helyszín *" className="sm:col-span-2"><Input required value={draft.location} onChange={e => patch("location", e.target.value)} maxLength={220} /></Field>
          <NumberField label="Ár (Ft)" value={draft.price_huf} onChange={value => patch("price_huf", value)} step="1" />
          <Field label="Ár szövegesen"><Input value={draft.price_text || ""} onChange={e => patch("price_text", e.target.value)} placeholder="pl. 89,9 millió Ft" /></Field>
          <NumberField label="Alapterület (m²)" value={draft.floor_area_sqm} onChange={value => patch("floor_area_sqm", value)} step="0.1" />
          <NumberField label="Szobák száma" value={draft.rooms} onChange={value => patch("rooms", value)} step="0.5" />
          <NumberField label="Fürdőszobák száma" value={draft.bathrooms} onChange={value => patch("bathrooms", value)} step="1" />
          <SelectField label="Hirdetés státusza" value={draft.listing_status} onChange={value => patch("listing_status", value as ListingDraft["listing_status"])} options={[["active", "Aktív"], ["reserved", "Lefoglalt"], ["sold", "Elkelt"]]} />
          <SelectField label="Hirdetés típusa" value={draft.listing_type} onChange={value => patch("listing_type", value as ListingDraft["listing_type"])} options={[["sale", "Eladó"], ["rent", "Kiadó"]]} />
          <Field label="Leírás" className="sm:col-span-2"><textarea value={draft.description || ""} onChange={e => patch("description", e.target.value)} rows={6} className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-primary" /></Field>
        </div></FormSection>
        <FormSection title="Részletes adatok" icon={<Building2 className="h-5 w-5" />}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField label="Építés éve" value={draft.construction_year ?? ""} onChange={value => patch("construction_year", value || null)} step="1" />
          <NumberField label="Emeletek száma" value={draft.floor_count ?? ""} onChange={value => patch("floor_count", value || null)} step="1" />
          <SelectField label="Tájolás" value={draft.orientation || ""} onChange={value => patch("orientation", value)} options={[["", "Nincs megadva"], ["north", "Észak"], ["northeast", "Északkelet"], ["east", "Kelet"], ["southeast", "Délkelet"], ["south", "Dél"], ["southwest", "Délnyugat"], ["west", "Nyugat"], ["northwest", "Északnyugat"]]} />
          <SelectField label="Kilátás" value={draft.view_type || ""} onChange={value => patch("view_type", value)} options={[["", "Nincs megadva"], ["street", "Utcai"], ["courtyard", "Udvari"], ["garden", "Kerti"], ["panoramic", "Panorámás"], ["roof", "Tetőtéri"], ["nature", "Természeti"]]} />
          <SelectField label="Fürdő és WC" value={draft.bathroom_toilet || ""} onChange={value => patch("bathroom_toilet", value)} options={[["", "Nincs megadva"], ["separate", "Külön"], ["combined", "Egy helyiségben"], ["none", "Nincs"]]} />
        </div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{booleanFields.map(([key, label]) => <BooleanToggle key={key} label={label} checked={Boolean(draft[key])} onChange={value => patch(key, value ? 1 : 0)} />)}</div>
          <div className="mt-6"><Label>Fűtés típusa (több is jelölhető)</Label><div className="mt-2 flex flex-wrap gap-2">{heatingOptions.map(option => { const selected = draft.heating_types.includes(option); return <button key={option} type="button" onClick={() => patch("heating_types", selected ? draft.heating_types.filter(value => value !== option) : [...draft.heating_types, option])} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-text"}`}>{selected && <Check className="h-3.5 w-3.5" />}{option}</button>; })}</div></div>
        </FormSection>
        <FormSection title="Képek" icon={<ImagePlus className="h-5 w-5" />}><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{draft.image_urls.map((image, index) => <div key={`${image.url}-${index}`} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface"><img src={image.thumbnailUrl || image.compressedUrl || image.url} className="h-full w-full object-cover" alt="" /><button type="button" onClick={() => patch("image_urls", draft.image_urls.filter((_, imageIndex) => imageIndex !== index))} className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white opacity-100 shadow sm:opacity-0 sm:group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>{index === 0 && <span className="absolute bottom-2 left-2 rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-bold text-white">Borítókép</span>}</div>)}
          {files.map((file, index) => <div key={`${file.name}-${index}`} className="relative flex aspect-[4/3] flex-col items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-center"><Upload className="mb-2 h-5 w-5 text-primary" /><span className="line-clamp-2 text-xs font-medium text-text">{file.name}</span><button type="button" onClick={() => setFiles(current => current.filter((_, fileIndex) => fileIndex !== index))} className="absolute right-2 top-2 rounded-full bg-background p-1 text-red-500"><X className="h-3.5 w-3.5" /></button></div>)}
          <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface text-center transition hover:border-primary"><ImagePlus className="mb-2 h-6 w-6 text-primary" /><span className="text-xs font-bold text-text">Képek hozzáadása</span><span className="mt-1 text-[10px] text-muted-text">JPG, PNG, WebP</span><input type="file" accept="image/*" multiple className="hidden" onChange={e => setFiles(current => [...current, ...Array.from(e.target.files || [])].slice(0, Math.max(0, 60 - draft.image_urls.length)))} /></label></div></FormSection>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4"><div><div className="font-bold text-text">Hirdetés bekapcsolása</div><p className="text-xs text-muted-text">Csak a bekapcsolt hirdetések jelennek meg a publikus /properties oldalon.</p></div><button type="button" role="switch" aria-checked={Boolean(draft.is_enabled)} onClick={() => patch("is_enabled", draft.is_enabled ? 0 : 1)} className={`relative h-7 w-12 rounded-full transition ${draft.is_enabled ? "bg-emerald-500" : "bg-muted-text/30"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${draft.is_enabled ? "left-6" : "left-1"}`} /></button></div>
      </div><div className="border-t border-border bg-background px-5 py-4">{saving && files.length > 0 && <div className="mb-3"><div className="mb-1 flex justify-between text-xs text-muted-text"><span>Képek optimalizálása és feltöltése…</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-surface"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div></div>}<div className="flex justify-end gap-3"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text disabled:opacity-60">Mégse</button><button type="submit" disabled={saving} className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background disabled:opacity-60">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{saving ? "Mentés…" : "Hirdetés mentése"}</button></div></div></form>
    </div>
  </div>;
}

function FormSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) { return <section><div className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-lg font-bold text-text"><span className="text-primary">{icon}</span>{title}</div>{children}</section>; }
function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) { return <div className={`space-y-1.5 ${className}`}><Label>{label}</Label>{children}</div>; }
function NumberField({ label, value, onChange, step }: { label: string; value: number | string; onChange: (value: number) => void; step: string }) { return <Field label={label}><Input type="number" min="0" step={step} value={value} onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value))} /></Field>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <Field label={label}><select value={value} onChange={e => onChange(e.target.value)} className="block w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text outline-none focus:border-primary">{options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}</select></Field>; }
function BooleanToggle({ label, checked, onChange }: { key?: string; label: string; checked: boolean; onChange: (value: boolean) => void }) { return <button type="button" onClick={() => onChange(!checked)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-medium ${checked ? "border-emerald-500/30 bg-emerald-500/10 text-text" : "border-border bg-surface text-muted-text"}`}><span>{label}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${checked ? "bg-emerald-500 text-white" : "bg-background"}`}>{checked ? "IGEN" : "NEM"}</span></button>; }
