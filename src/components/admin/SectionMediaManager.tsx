import { Image as ImageIcon, RotateCcw, Trash2 } from "lucide-react";
import { SiteSettings } from "../../lib/types";
import { ImageUploadCard } from "./BrandingManager";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { parseSectionMedia, SectionMediaItem } from "../../lib/sectionMedia";
import { useLanguage } from "../../contexts/LanguageContext";
import { tUi } from "../../lib/i18n";

const SECTIONS = [
  ["home", "admin.section_media.section.home"],
  ["vision", "admin.section_media.section.vision"],
  ["about", "admin.section_media.section.about"],
  ["services", "admin.section_media.section.services"],
  ["portfolio", "admin.section_media.section.portfolio"],
  ["visual-ideas", "admin.section_media.section.visual_ideas"],
  ["pricing", "admin.section_media.section.pricing"],
  ["contact", "admin.section_media.section.contact"],
  ["faq", "admin.section_media.section.faq"],
] as const;

const DEFAULT_SECTION_BACKGROUNDS: Partial<Record<(typeof SECTIONS)[number][0], string>> = {
  home: "/images/sps-cinematic-hero.png",
  about: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=82&w=2000",
  services: "/images/sps-services-studio.png",
  portfolio: "/images/sps-portfolio-aerial.png",
  contact: "/images/sps-contact-studio.png",
  faq: "/images/sps-contact-studio.png",
};

const DEFAULT_ABOUT_CONTENT_IMAGE =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1000";

// Keep hero uploads aligned with the high-resolution portfolio workflow. The
// direct media pipeline keeps the source safely in storage and generates the
// preferred, browser-facing optimized image below 10 MB.
const HERO_MAX_IMAGE_SIZE_BYTES = 1024 * 1024 * 1024;

export function SectionMediaManager({
  settings,
  onChange,
}: {
  settings: Partial<SiteSettings>;
  onChange: (key: keyof SiteSettings, value: string) => void;
}) {
  const { currentLang } = useLanguage();
  const media = parseSectionMedia(settings.section_media);
  const tr = (key: string, fallback: string) => tUi(key, currentLang, fallback);

  const updateSection = (sectionId: string, update: Partial<SectionMediaItem>) => {
    const next = {
      ...media,
      [sectionId]: { ...media[sectionId], ...update },
    };
    onChange("section_media", JSON.stringify(next));
  };

  const updateHeroGallery = (index: number, url: string) => {
    const current = Array.isArray(media.home?.heroGallery) && media.home.heroGallery.length ? media.home.heroGallery : (media.home?.backgroundUrl ? [media.home.backgroundUrl] : []);
    const next = [...current];
    next[index] = url;
    const gallery = next.filter(Boolean);
    updateSection("home", { heroGallery: gallery, backgroundUrl: gallery[0] || "" });
  };

  const removeHeroGalleryImage = (index: number) => {
    const current = Array.isArray(media.home?.heroGallery) && media.home.heroGallery.length ? media.home.heroGallery : (media.home?.backgroundUrl ? [media.home.backgroundUrl] : []);
    const gallery = current.filter((_, itemIndex) => itemIndex !== index);
    updateSection("home", { heroGallery: gallery, backgroundUrl: gallery[0] || "" });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 font-bold text-sm text-text">
          <ImageIcon className="w-4 h-4 text-primary" />
          {tr("admin.section_media.title", "Section images and backgrounds")}
        </div>
        <p className="text-xs text-muted-text mt-1.5 leading-relaxed">
          {tr("admin.section_media.description", "Upload a separate background for each public section. Empty fields keep the built-in design.")}
        </p>
      </div>

      {SECTIONS.map(([id, labelKey]) => {
        const item = media[id] || {};
        const isHero = id === "home";
        const label = tr(labelKey, id);
        return (
          <div key={id} className="p-5 rounded-2xl bg-surface border border-border space-y-4">
            {!isHero && <ImageUploadCard
              id={`section-background-${id}`}
              title={`${label} — ${tr("admin.section_media.background", "background")}`}
              description={tr("admin.section_media.background_description", "Full-width section background. JPG, PNG, WebP or AVIF can be used.")}
              value={item.backgroundUrl}
              recommendedSize={tr("admin.section_media.background_size", "1920 × 1080 px or larger")}
              acceptedFormats=".jpg,.jpeg,.png,.webp,.avif"
              maxSizeBytes={15 * 1024 * 1024}
              previewBg="dark"
              isOptional
              onUpload={(url) => updateSection(id, { backgroundUrl: url })}
              onClear={() => updateSection(id, { backgroundUrl: "" })}
              tUi={(key) => tUi(key, currentLang, key)}
              currentLang={currentLang}
              useMediaPipeline
              fallbackPreviewUrl={DEFAULT_SECTION_BACKGROUNDS[id]}
            />}

            {isHero && (() => {
              const gallery = Array.isArray(item.heroGallery) && item.heroGallery.length ? item.heroGallery : (item.backgroundUrl ? [item.backgroundUrl] : []);
              return <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div><Label className="text-sm font-semibold text-text">Hero galéria</Label><p className="mt-1 text-xs leading-relaxed text-muted-text">A képek 2–3 másodpercenként finoman váltanak. Képenként legfeljebb 1 GB tölthető fel; a rendszer automatikusan elkészíti a főoldalon használt, 10 MB alatti optimalizált változatot.</p></div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {gallery.map((url, index) => <div key={`${url}-${index}`} className="relative"><ImageUploadCard id={`hero-gallery-${index}`} title={`Hero kép ${index + 1}`} description="JPG, PNG, WebP vagy AVIF. Legfeljebb 1 GB; a megjelenítéshez automatikusan 10 MB alatti változat készül." value={url} recommendedSize="1920 × 1080 px vagy nagyobb" acceptedFormats=".jpg,.jpeg,.png,.webp,.avif" maxSizeBytes={HERO_MAX_IMAGE_SIZE_BYTES} previewBg="dark" isOptional onUpload={(nextUrl) => updateHeroGallery(index, nextUrl)} onClear={() => removeHeroGalleryImage(index)} tUi={(key) => tUi(key, currentLang, key)} currentLang={currentLang} useMediaPipeline fallbackPreviewUrl={index === 0 ? DEFAULT_SECTION_BACKGROUNDS.home : undefined} /><button type="button" onClick={() => removeHeroGalleryImage(index)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" />Eltávolítás a galériából</button></div>)}
                  {gallery.length < 6 && <ImageUploadCard id={`hero-gallery-${gallery.length}`} title="Új hero kép" description="Adjon hozzá további képet a váltakozó hero-galériához. Legfeljebb 1 GB; a főoldalhoz automatikusan 10 MB alatti változat készül." value="" recommendedSize="1920 × 1080 px vagy nagyobb" acceptedFormats=".jpg,.jpeg,.png,.webp,.avif" maxSizeBytes={HERO_MAX_IMAGE_SIZE_BYTES} previewBg="dark" isOptional onUpload={(url) => updateHeroGallery(gallery.length, url)} onClear={() => {}} tUi={(key) => tUi(key, currentLang, key)} currentLang={currentLang} useMediaPipeline />}
                </div>
                <div><Label htmlFor="hero-gallery-interval">Váltás ideje</Label><select id="hero-gallery-interval" value={item.heroSlideIntervalMs || 2500} onChange={(event) => updateSection("home", { heroSlideIntervalMs: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-text"><option value={2000}>2 másodperc</option><option value={2500}>2,5 másodperc</option><option value={3000}>3 másodperc</option></select></div>
              </div>;
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`section-position-${id}`}>{tr("admin.section_media.position", "Image position")}</Label>
                <select
                  id={`section-position-${id}`}
                  value={item.backgroundPosition || "center"}
                  onChange={(e) => updateSection(id, { backgroundPosition: e.target.value })}
                  className="mt-1.5 w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-text"
                >
                  <option value="center">{tr("admin.section_media.position.center", "Center")}</option>
                  <option value="top">{tr("admin.section_media.position.top", "Top")}</option>
                  <option value="bottom">{tr("admin.section_media.position.bottom", "Bottom")}</option>
                  <option value="left">{tr("admin.section_media.position.left", "Left")}</option>
                  <option value="right">{tr("admin.section_media.position.right", "Right")}</option>
                </select>
              </div>
              {isHero ? (
                <div className="sm:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Label htmlFor={`section-overlay-${id}`}>{tr("admin.section_media.hero_overlay_title", "Hero image readability")}: {Math.round((item.overlayOpacity ?? 0.45) * 100)}%</Label>
                      <p className="mt-1 text-xs leading-relaxed text-muted-text">
                        {tr("admin.section_media.hero_overlay_description", "Add a dark layer over the hero image so the heading stays easy to read on bright photos.")}
                      </p>
                    </div>
                    <span className="rounded-full border border-primary/20 bg-background px-2.5 py-1 text-xs font-bold text-primary">
                      {Math.round((item.overlayOpacity ?? 0.45) * 100)}%
                    </span>
                  </div>
                  <Input
                    id={`section-overlay-${id}`}
                    type="range"
                    min="0"
                    max="0.9"
                    step="0.05"
                    value={item.overlayOpacity ?? 0.45}
                    onChange={(e) => updateSection(id, { overlayOpacity: Number(e.target.value) })}
                    className="mt-3"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-muted-text">
                    <span>{tr("admin.section_media.hero_overlay_low", "Lighter image")}</span>
                    <span>{tr("admin.section_media.hero_overlay_high", "Stronger contrast")}</span>
                  </div>
                  <div className="mt-4 border-t border-primary/15 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Label htmlFor={`section-blur-${id}`}>{tr("admin.section_media.hero_blur_title", "Hero image blur")}: {item.imageBlur ?? 0} px</Label>
                        <p className="mt-1 text-xs leading-relaxed text-muted-text">
                          {tr("admin.section_media.hero_blur_description", "Softens the background image only; the text and controls remain sharp.")}
                        </p>
                      </div>
                      <span className="rounded-full border border-primary/20 bg-background px-2.5 py-1 text-xs font-bold text-primary">
                        {item.imageBlur ?? 0} px
                      </span>
                    </div>
                    <Input
                      id={`section-blur-${id}`}
                      type="range"
                      min="0"
                      max="24"
                      step="1"
                      value={item.imageBlur ?? 0}
                      onChange={(e) => updateSection(id, { imageBlur: Number(e.target.value) })}
                      className="mt-3"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor={`section-overlay-${id}`}>{tr("admin.section_media.overlay", "Dark overlay")}: {Math.round((item.overlayOpacity ?? 0.45) * 100)}%</Label>
                  <Input
                    id={`section-overlay-${id}`}
                    type="range"
                    min="0"
                    max="0.9"
                    step="0.05"
                    value={item.overlayOpacity ?? 0.45}
                    onChange={(e) => updateSection(id, { overlayOpacity: Number(e.target.value) })}
                    className="mt-1.5"
                  />
                </div>
              )}
            </div>

            {id === "about" && (
              <div className="grid gap-4 xl:grid-cols-2">
                <ImageUploadCard
                  id="about-content-image"
                  title={tr("admin.section_media.about_content_title", "About section main image")}
                  description={tr("admin.section_media.about_content_description", "Featured image displayed next to the text.")}
                  value={item.contentImageUrl}
                  recommendedSize={tr("admin.section_media.about_content_size", "1200 × 1200 px")}
                  acceptedFormats=".jpg,.jpeg,.png,.webp,.avif"
                  maxSizeBytes={15 * 1024 * 1024}
                  previewBg="checker"
                  isOptional
                  onUpload={(url) => updateSection(id, { contentImageUrl: url })}
                  onClear={() => updateSection(id, { contentImageUrl: "" })}
                  tUi={(key) => tUi(key, currentLang, key)}
                  currentLang={currentLang}
                  useMediaPipeline
                  fallbackPreviewUrl={DEFAULT_ABOUT_CONTENT_IMAGE}
                />
                <div className="space-y-3">
                  <ImageUploadCard
                    id="about-content-video"
                    title="Rólunk szekció videója"
                    description="Opcionális videó a kép helyett. Álló 9:16-hoz vagy fekvő 16:9-hez igazítható; a lekerekített keret és hover animáció megmarad."
                    value={item.contentVideoUrl}
                    recommendedSize="9:16 álló vagy 16:9 fekvő"
                    acceptedFormats=".mp4,.webm,.mov"
                    maxSizeBytes={1024 * 1024 * 1024}
                    previewBg="dark"
                    isOptional
                    mediaKind="video"
                    onUpload={(url) => updateSection(id, { contentVideoUrl: url })}
                    onClear={() => updateSection(id, { contentVideoUrl: "" })}
                    tUi={(key) => tUi(key, currentLang, key)}
                    currentLang={currentLang}
                    useMediaPipeline
                  />
                  {item.contentVideoUrl && <div>
                    <Label htmlFor="about-content-video-aspect">Videó képaránya</Label>
                    <select id="about-content-video-aspect" value={item.contentVideoAspect || "portrait"} onChange={(event) => updateSection(id, { contentVideoAspect: event.target.value as "portrait" | "landscape" })} className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-text">
                      <option value="portrait">9:16 – álló</option>
                      <option value="landscape">16:9 – fekvő</option>
                    </select>
                  </div>}
                </div>
              </div>
            )}

            {(item.backgroundUrl || item.contentImageUrl || item.contentVideoUrl) && (
              <button
                type="button"
                onClick={() => updateSection(id, { backgroundUrl: "", heroGallery: [], heroSlideIntervalMs: 2500, contentImageUrl: "", contentVideoUrl: "", contentVideoAspect: "portrait", backgroundPosition: "center", overlayOpacity: 0.45, imageBlur: 0 })}
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-text hover:text-text"
              >
                <RotateCcw className="w-3.5 h-3.5" /> {tr("admin.section_media.reset", "Restore default media")}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
