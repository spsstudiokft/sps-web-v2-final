import { Image as ImageIcon, RotateCcw } from "lucide-react";
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
        const label = tr(labelKey, id);
        return (
          <div key={id} className="p-5 rounded-2xl bg-surface border border-border space-y-4">
            <ImageUploadCard
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
            />

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
            </div>

            {id === "about" && (
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
            )}

            {(item.backgroundUrl || item.contentImageUrl) && (
              <button
                type="button"
                onClick={() => updateSection(id, { backgroundUrl: "", contentImageUrl: "", backgroundPosition: "center", overlayOpacity: 0.45 })}
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
