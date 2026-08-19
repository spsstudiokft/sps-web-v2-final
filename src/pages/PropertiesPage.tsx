import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, BadgeCheck, Bath, BedDouble, Building2, CalendarDays, Check,
  ChevronLeft, ChevronRight, ExternalLink, FileImage, Flame, GalleryHorizontal,
  Home, Image as ImageIcon, Mail, MapPin, Maximize2, Snowflake, Sparkles, Trees,
} from "lucide-react";
import { PropertyListing, SiteSettings } from "../lib/types";
import { useLanguage } from "../contexts/LanguageContext";
import { PropertySiteShell } from "../components/property/PropertySiteShell";
import { usePageTitle } from "../hooks/usePageTitle";
import { t } from "../lib/i18n";

const statusLabels: Record<string, string> = { active: "Aktív", reserved: "Lefoglalt", sold: "Elkelt" };
const orientationLabels: Record<string, string> = { north: "Észak", northeast: "Északkelet", east: "Kelet", southeast: "Délkelet", south: "Dél", southwest: "Délnyugat", west: "Nyugat", northwest: "Északnyugat" };
const viewLabels: Record<string, string> = { street: "Utcai", courtyard: "Udvari", garden: "Kerti", panoramic: "Panorámás", roof: "Tetőtéri", nature: "Természeti" };
const bathroomLabels: Record<string, string> = { separate: "Külön fürdő és WC", combined: "Fürdő és WC egyben", none: "Nincs megadva" };

const featureDefinitions = [
  ["central_heating", "Központi fűtés", Flame],
  ["garden_access", "Kertkapcsolat", Trees],
  ["floor_plan_available", "Alaprajz kérhető", FileImage],
  ["balcony", "Erkély", GalleryHorizontal],
  ["full_comfort", "Összkomfortos", BadgeCheck],
  ["air_conditioned", "Légkondicionált", Snowflake],
  ["new_construction", "Új építésű", Sparkles],
] as const;

function price(item: PropertyListing) {
  return item.price_text?.trim() || `${Number(item.price_huf || 0).toLocaleString("hu-HU")} Ft`;
}

function imageUrl(item: PropertyListing, index = 0, thumbnail = false) {
  const image = item.image_urls[index];
  if (!image) return "";
  return thumbnail
    ? image.thumbnailUrl || image.compressedUrl || image.url
    : image.compressedUrl || image.url || image.thumbnailUrl || "";
}

export default function PropertiesPage() {
  const { id } = useParams();
  const [settings, setSettings] = useState<SiteSettings>({});
  const [items, setItems] = useState<PropertyListing[]>([]);
  const [item, setItem] = useState<PropertyListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      fetch("/api/public/settings").then(response => response.ok ? response.json() : {}),
      fetch(id ? `/api/public/properties/${encodeURIComponent(id)}` : "/api/public/properties", { cache: "no-store", headers: { "Cache-Control": "no-cache" } }).then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Az ingatlanhirdetések nem tölthetők be.");
        return body;
      }),
    ]).then(([siteSettings, data]) => {
      setSettings(siteSettings || {});
      if (id) setItem(data);
      else setItems(Array.isArray(data) ? data : []);
    }).catch(error => setError(error instanceof Error ? error.message : "Betöltési hiba.")).finally(() => setLoading(false));
  }, [id]);

  return <PropertySiteShell settings={settings}><PropertiesContent settings={settings} items={items} item={item} loading={loading} error={error} detail={Boolean(id)} /></PropertySiteShell>;
}

function PropertiesContent({ settings, items, item, loading, error, detail }: { settings: SiteSettings; items: PropertyListing[]; item: PropertyListing | null; loading: boolean; error: string; detail: boolean }) {
  const { currentLang, defaultLang } = useLanguage();
  const studioName = t(settings.studio_name, currentLang, defaultLang) || "SPS Studio";
  usePageTitle(item?.title || "Ingatlanok", studioName);

  return <main className="mx-auto min-h-[78vh] max-w-7xl px-4 pb-20 pt-28 sm:px-6 md:pt-36 lg:px-8">
      {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : detail && item ? <PropertyDetail item={item} /> : <PropertyCatalog items={items} />}
    </main>;
}

function PropertyCatalog({ items }: { items: PropertyListing[] }) {
  return <>
    <section className="mb-10 overflow-hidden rounded-3xl border border-border bg-surface px-5 py-10 sm:px-8 md:px-12 md:py-14">
      <div className="max-w-3xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Building2 className="h-4 w-4" />Ingatlanok</div><h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">Találja meg következő otthonát.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted-text sm:text-lg">Eladó és kiadó ingatlanok részletes adatokkal, optimalizált képgalériával és közvetlen hirdetői kapcsolatfelvétellel.</p></div>
    </section>
    {items.length === 0 ? <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-20 text-center"><Home className="mx-auto h-12 w-12 text-muted-text/50" /><h2 className="mt-4 text-xl font-bold">Jelenleg nincs aktív hirdetés</h2><p className="mt-2 text-sm text-muted-text">Kérjük, látogasson vissza később.</p></div> : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{items.map(item => <PropertyCard key={item.id} item={item} />)}</div>}
  </>;
}

function PropertyCard({ item }: { key?: string; item: PropertyListing }) {
  return <Link to={`/properties/${item.id}`} className="group overflow-hidden rounded-3xl border border-border bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
    <div className="relative aspect-[16/10] overflow-hidden bg-background">
      {imageUrl(item, 0, true) ? <img src={imageUrl(item, 0, true)} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" decoding="async" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-12 w-12 text-muted-text/35" /></div>}
      <div className="absolute left-3 top-3 flex gap-2"><span className="rounded-full bg-slate-950/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white backdrop-blur">{item.listing_type === "sale" ? "Eladó" : "Kiadó"}</span><span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-black text-slate-900 backdrop-blur">{statusLabels[item.listing_status] || item.listing_status}</span></div>
      <FeatureBadges item={item} compact />
    </div>
    <div className="p-5 sm:p-6"><h2 className="line-clamp-2 text-xl font-black tracking-tight text-text">{item.title}</h2><div className="mt-3 text-xl font-black text-primary">{price(item)}</div><p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-muted-text">{item.description || "A hirdetés részletes adataiért nyissa meg az ingatlant."}</p><div className="mt-5 flex items-center justify-end border-t border-border pt-4 text-sm font-bold text-text group-hover:text-primary">Részletek <ExternalLink className="ml-2 h-4 w-4" /></div></div>
  </Link>;
}

function PropertyDetail({ item }: { item: PropertyListing }) {
  const [activeImage, setActiveImage] = useState(0);
  const images = item.image_urls || [];
  const facts = useMemo(() => [
    ["Helyszín", item.location, MapPin], ["Alapterület", `${item.floor_area_sqm} m²`, Maximize2], ["Szobák", String(item.rooms), BedDouble], ["Fürdőszobák", String(item.bathrooms), Bath],
  ] as const, [item]);
  const detailRows = [
    ["Építés éve", item.construction_year], ["Emeletek száma", item.floor_count], ["Tájolás", item.orientation ? orientationLabels[item.orientation] || item.orientation : null], ["Kilátás", item.view_type ? viewLabels[item.view_type] || item.view_type : null], ["Fürdő és WC", item.bathroom_toilet ? bathroomLabels[item.bathroom_toilet] || item.bathroom_toilet : null], ["Fűtés típusa", item.heating_types?.join(", ")],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
  const subject = encodeURIComponent(`Érdeklődés: ${item.title}`);
  const body = encodeURIComponent(`Üdvözlöm!\n\nÉrdeklődni szeretnék az alábbi ingatlannal kapcsolatban:\n${item.title}\n${window.location.href}\n`);

  return <>
    <Link to="/properties" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-muted-text hover:text-primary"><ArrowLeft className="h-4 w-4" />Vissza az ingatlanokhoz</Link>
    <article>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,.75fr)]">
        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface aspect-[16/10]">
            {images.length ? <img src={imageUrl(item, activeImage)} alt={`${item.title} – ${activeImage + 1}. kép`} className="h-full w-full object-cover" decoding="async" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-16 w-16 text-muted-text/30" /></div>}
            <div className="absolute left-4 top-4 flex gap-2"><span className="rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-black uppercase text-white">{item.listing_type === "sale" ? "Eladó" : "Kiadó"}</span><span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-slate-900">{statusLabels[item.listing_status] || item.listing_status}</span></div>
            <FeatureBadges item={item} />
            {images.length > 1 && <><button onClick={() => setActiveImage(value => (value - 1 + images.length) % images.length)} aria-label="Előző kép" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/65 p-3 text-white backdrop-blur hover:bg-slate-950"><ChevronLeft className="h-5 w-5" /></button><button onClick={() => setActiveImage(value => (value + 1) % images.length)} aria-label="Következő kép" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/65 p-3 text-white backdrop-blur hover:bg-slate-950"><ChevronRight className="h-5 w-5" /></button></>}
          </div>
          {images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto pb-2">{images.map((_, index) => <button key={index} onClick={() => setActiveImage(index)} className={`h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 ${activeImage === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}><img src={imageUrl(item, index, true)} alt="" className="h-full w-full object-cover" loading="lazy" /></button>)}</div>}
        </div>
        <aside className="h-fit rounded-3xl border border-border bg-surface p-6 shadow-sm lg:sticky lg:top-32">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-text"><MapPin className="h-4 w-4 text-primary" />{item.location}</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{item.title}</h1><div className="mt-5 text-3xl font-black text-primary">{price(item)}</div>
          <div className="mt-6 grid grid-cols-2 gap-3">{facts.slice(1).map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-border bg-background p-3"><Icon className="h-4 w-4 text-primary" /><div className="mt-2 text-lg font-black">{value}</div><div className="text-[11px] text-muted-text">{label}</div></div>)}</div>
          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4"><div className="text-xs font-bold uppercase tracking-wider text-muted-text">Hirdető</div><div className="mt-1 font-black">{item.contact_name || "SPS Studio"}</div>{item.contact_email && <a href={`mailto:${item.contact_email}?subject=${subject}&body=${body}`} className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-black text-background hover:opacity-90"><Mail className="mr-2 h-4 w-4" />Kapcsolatfelvétel</a>}</div>
        </aside>
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8"><h2 className="text-2xl font-black">Az ingatlanról</h2><p className="mt-5 whitespace-pre-line text-base leading-8 text-muted-text">{item.description || "Ehhez a hirdetéshez még nem tartozik részletes leírás."}</p></section>
        <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8"><h2 className="text-2xl font-black">Részletes adatok</h2><dl className="mt-5 divide-y divide-border">{detailRows.map(([label, value]) => <div key={String(label)} className="flex items-start justify-between gap-4 py-3 text-sm"><dt className="text-muted-text">{label}</dt><dd className="text-right font-bold text-text">{String(value)}</dd></div>)}</dl></section>
      </div>
      <section className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-8"><h2 className="text-2xl font-black">Felszereltség és jellemzők</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{featureDefinitions.map(([key, label, Icon]) => <div key={key} className={`flex items-center gap-3 rounded-xl border p-4 ${item[key] ? "border-emerald-500/25 bg-emerald-500/10 text-text" : "border-border bg-background text-muted-text opacity-55"}`}><Icon className="h-5 w-5 shrink-0" /><span className="text-sm font-bold">{label}</span><Check className={`ml-auto h-4 w-4 ${item[key] ? "text-emerald-500" : "invisible"}`} /></div>)}</div></section>
    </article>
  </>;
}

function FeatureBadges({ item, compact = false }: { item: PropertyListing; compact?: boolean }) {
  const enabled = featureDefinitions.filter(([key]) => Boolean(item[key]));
  if (!enabled.length) return null;
  return <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">{enabled.slice(0, compact ? 5 : enabled.length).map(([key, label, Icon]) => <span key={key} title={label} aria-label={label} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/70 px-2.5 text-white shadow backdrop-blur"><Icon className="h-4 w-4" /><span className={compact ? "sr-only" : "hidden text-[11px] font-bold sm:inline"}>{label}</span></span>)}</div>;
}

function LoadingState() { return <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="overflow-hidden rounded-3xl border border-border bg-surface"><div className="aspect-[16/10] animate-pulse bg-border/50" /><div className="space-y-4 p-6"><div className="h-6 w-3/4 animate-pulse rounded bg-border/50" /><div className="h-6 w-1/3 animate-pulse rounded bg-border/50" /><div className="h-16 animate-pulse rounded bg-border/40" /></div></div>)}</div>; }
function ErrorState({ message }: { message: string }) { return <div className="rounded-3xl border border-red-500/25 bg-red-500/10 px-6 py-16 text-center"><Building2 className="mx-auto h-12 w-12 text-red-500" /><h1 className="mt-4 text-2xl font-black">Az oldal nem tölthető be</h1><p className="mt-2 text-muted-text">{message}</p><Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-bold text-background">Vissza a főoldalra</Link></div>; }
