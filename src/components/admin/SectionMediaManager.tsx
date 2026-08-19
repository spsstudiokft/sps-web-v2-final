import { Image as ImageIcon, RotateCcw } from "lucide-react";
import { SiteSettings } from "../../lib/types";
import { ImageUploadCard } from "./BrandingManager";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { parseSectionMedia, SectionMediaItem } from "../../lib/sectionMedia";

const SECTIONS = [
  ["home", "Hero / Kezdőlap"],
  ["vision", "Vízió"],
  ["about", "Rólunk"],
  ["services", "Szolgáltatások"],
  ["portfolio", "Portfólió"],
  ["visual-ideas", "Ingatlanvizuál ötletek"],
  ["pricing", "Árak és csomagok"],
  ["contact", "Kapcsolat"],
  ["faq", "GYIK"],
] as const;

export function SectionMediaManager({
  settings,
  onChange,
}: {
  settings: Partial<SiteSettings>;
  onChange: (key: keyof SiteSettings, value: string) => void;
}) {
  const media = parseSectionMedia(settings.section_media);

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
          Szekcióképek és hátterek
        </div>
        <p className="text-xs text-muted-text mt-1.5 leading-relaxed">
          Minden publikus szekcióhoz külön háttér tölthető fel. Az üres mező megtartja a beépített dizájnt.
        </p>
      </div>

      {SECTIONS.map(([id, label]) => {
        const item = media[id] || {};
        return (
          <div key={id} className="p-5 rounded-2xl bg-surface border border-border space-y-4">
            <ImageUploadCard
              id={`section-background-${id}`}
              title={`${label} háttere`}
              description="Teljes szélességű szekcióháttér. JPG, PNG, WebP vagy AVIF használható."
              value={item.backgroundUrl}
              recommendedSize="1920 × 1080 px vagy nagyobb"
              acceptedFormats=".jpg,.jpeg,.png,.webp,.avif"
              maxSizeBytes={15 * 1024 * 1024}
              previewBg="dark"
              isOptional
              onUpload={(url) => updateSection(id, { backgroundUrl: url })}
              onClear={() => updateSection(id, { backgroundUrl: "" })}
              tUi={(key) => key}
              currentLang="hu"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`section-position-${id}`}>Kép pozíciója</Label>
                <select
                  id={`section-position-${id}`}
                  value={item.backgroundPosition || "center"}
                  onChange={(e) => updateSection(id, { backgroundPosition: e.target.value })}
                  className="mt-1.5 w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-text"
                >
                  <option value="center">Középen</option>
                  <option value="top">Felül</option>
                  <option value="bottom">Alul</option>
                  <option value="left">Balra</option>
                  <option value="right">Jobbra</option>
                </select>
              </div>
              <div>
                <Label htmlFor={`section-overlay-${id}`}>Sötétítő réteg: {Math.round((item.overlayOpacity ?? 0.45) * 100)}%</Label>
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
                title="Rólunk szekció fő képe"
                description="A szöveg mellett megjelenő kiemelt kép."
                value={item.contentImageUrl}
                recommendedSize="1200 × 1200 px"
                acceptedFormats=".jpg,.jpeg,.png,.webp,.avif"
                maxSizeBytes={15 * 1024 * 1024}
                previewBg="checker"
                isOptional
                onUpload={(url) => updateSection(id, { contentImageUrl: url })}
                onClear={() => updateSection(id, { contentImageUrl: "" })}
                tUi={(key) => key}
                currentLang="hu"
              />
            )}

            {(item.backgroundUrl || item.contentImageUrl) && (
              <button
                type="button"
                onClick={() => updateSection(id, { backgroundUrl: "", contentImageUrl: "", backgroundPosition: "center", overlayOpacity: 0.45 })}
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-text hover:text-text"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Alapértelmezett média visszaállítása
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
