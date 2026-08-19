import { useRef, useState } from "react";
import { CalendarClock, Eye, EyeOff, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { SiteSettings } from "../../lib/types";
import { uploadMediaFile } from "../../lib/uploadHelper";
import { TranslatableInput } from "./TranslatableInput";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";

const enabled = (value?: string, fallback = false) => value == null ? fallback : value !== "0" && value !== "false";

export function ComingSoonSettings({ settings, siteLanguages, onChange, tr }: {
  settings: Partial<SiteSettings>;
  siteLanguages: string;
  onChange: (key: keyof SiteSettings, value: string) => void;
  tr: (key: string, fallback: string) => string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const mediaType = settings.coming_soon_media_type || "image";

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError(tr("admin.coming_soon.media_invalid", "Choose an image or video file."));
      return;
    }
    setUploading(true); setProgress(0); setError("");
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const type = file.type.startsWith("video/") ? "video" : "image";
      const result = await uploadMediaFile(file, {
        token,
        useStructuredName: true,
        projectName: "website",
        categoryName: "coming-soon",
        itemType: type,
        itemNumber: 1,
        onProgress: setProgress,
      });
      onChange("coming_soon_media_type", type);
      onChange("coming_soon_media_url", type === "image" ? (result.compressedUrl || result.url) : result.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : tr("admin.coming_soon.media_failed", "Background upload failed."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[.04] p-5 space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarClock className="h-5 w-5" /></div>
          <div><h3 className="font-bold text-text">{tr("admin.coming_soon.title", "Coming soon mode")}</h3><p className="mt-1 text-xs leading-relaxed text-muted-text">{tr("admin.coming_soon.description", "Temporarily replace public website pages with a branded countdown screen.")}</p></div>
        </div>
        <button type="button" role="switch" aria-checked={enabled(settings.coming_soon_enabled)} onClick={() => onChange("coming_soon_enabled", enabled(settings.coming_soon_enabled) ? "0" : "1")} className={`inline-flex min-w-36 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-black transition ${enabled(settings.coming_soon_enabled) ? "bg-amber-500 text-slate-950" : "bg-surface border border-border text-text"}`}>
          {enabled(settings.coming_soon_enabled) ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
          {enabled(settings.coming_soon_enabled) ? tr("admin.coming_soon.enabled", "Mode enabled") : tr("admin.coming_soon.disabled", "Mode disabled")}
        </button>
      </div>

      {enabled(settings.coming_soon_enabled) && <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-text">{tr("admin.coming_soon.access_note", "The homepage, portfolio galleries and public property pages will show the countdown. Admin, client, advertiser and public invoice routes remain available.")}</div>}

      <div className="grid gap-5">
        <TranslatableInput label={tr("admin.coming_soon.field_title", "Page title")} value={settings.coming_soon_title} onChange={value => onChange("coming_soon_title", value)} siteLanguages={siteLanguages} />
        <TranslatableInput label={tr("admin.coming_soon.field_description", "Description")} value={settings.coming_soon_description} onChange={value => onChange("coming_soon_description", value)} siteLanguages={siteLanguages} isTextarea />
        <div><Label htmlFor="coming-soon-target">{tr("admin.coming_soon.target", "Countdown target")}</Label><Input id="coming-soon-target" type="datetime-local" className="mt-1.5" value={settings.coming_soon_target_at || ""} onChange={event => onChange("coming_soon_target_at", event.target.value)} /></div>
      </div>

      <div className="space-y-3">
        <Label>{tr("admin.coming_soon.background", "Blurred background image or video")}</Label>
        {settings.coming_soon_media_url && <div className="relative aspect-[16/7] overflow-hidden rounded-2xl border border-border bg-slate-950">
          {mediaType === "video" ? <video src={settings.coming_soon_media_url} className="h-full w-full object-cover" muted playsInline controls preload="metadata" /> : <img src={settings.coming_soon_media_url} alt="" className="h-full w-full object-cover" />}
          <button type="button" onClick={() => onChange("coming_soon_media_url", "")} className="absolute right-3 top-3 rounded-lg bg-slate-950/75 p-2 text-white backdrop-blur"><Trash2 className="h-4 w-4" /></button>
        </div>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={settings.coming_soon_media_url || ""} onChange={event => onChange("coming_soon_media_url", event.target.value)} placeholder="https://…" />
          <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-primary-foreground disabled:opacity-60">
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : settings.coming_soon_media_url ? <ImagePlus className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}{uploading ? `${Math.round(progress)}%` : tr("admin.coming_soon.upload", "Upload media")}
          </button>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) upload(file); event.target.value = ""; }} />
        </div>
        {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div><Label htmlFor="coming-soon-blur">{tr("admin.coming_soon.blur", "Background blur")}: {settings.coming_soon_blur || "10"} px</Label><Input id="coming-soon-blur" type="range" min="0" max="30" step="1" className="mt-2" value={settings.coming_soon_blur || "10"} onChange={event => onChange("coming_soon_blur", event.target.value)} /></div>
        <div><Label htmlFor="coming-soon-overlay">{tr("admin.coming_soon.overlay", "Dark overlay")}: {Math.round(Number(settings.coming_soon_overlay || ".55") * 100)}%</Label><Input id="coming-soon-overlay" type="range" min="0" max="0.9" step="0.05" className="mt-2" value={settings.coming_soon_overlay || ".55"} onChange={event => onChange("coming_soon_overlay", event.target.value)} /></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[["coming_soon_show_socials", "admin.coming_soon.socials", "Show social media links"], ["coming_soon_show_footer", "admin.coming_soon.footer", "Show website footer"]].map(([rawKey, labelKey, fallback]) => {
          const key = rawKey as keyof SiteSettings;
          return <label key={key} className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-background p-4 text-sm font-semibold text-text"><span>{tr(labelKey, fallback)}</span><input type="checkbox" checked={enabled(settings[key], true)} onChange={event => onChange(key, event.target.checked ? "1" : "0")} className="h-4 w-4 accent-primary" /></label>;
        })}
      </div>
    </div>
  );
}
