import React, { useState, useRef, useEffect } from "react";
import { SiteSettings } from "../../lib/types";
import { useLanguage } from "../../contexts/LanguageContext";
import { updateDocumentFavicon } from "../../lib/favicon";
import { 
  Upload, 
  Trash2, 
  RefreshCw, 
  Image as ImageIcon, 
  Sun, 
  Moon, 
  Globe, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  Info,
  ExternalLink,
  Camera,
  X
} from "lucide-react";

interface BrandingManagerProps {
  settings: Partial<SiteSettings>;
  onChange: (key: string, value: string) => void;
  token?: string | null;
}

export interface ImageUploadCardProps {
  id: string;
  title: string;
  description: string;
  value?: string;
  badge?: string;
  isOptional?: boolean;
  recommendedSize: string;
  acceptedFormats: string;
  maxSizeBytes: number;
  previewBg: "light" | "dark" | "checker";
  isFavicon?: boolean;
  onUpload: (url: string) => void;
  onClear: () => void;
  tUi: (key: string, ...args: any[]) => string;
  currentLang: string;
}

export function ImageUploadCard({
  id,
  title,
  description,
  value,
  badge,
  isOptional,
  recommendedSize,
  acceptedFormats,
  maxSizeBytes,
  previewBg,
  isFavicon = false,
  onUpload,
  onClear,
  tUi,
  currentLang,
}: ImageUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // Inspect image dimensions when value is present
  useEffect(() => {
    if (!value) {
      setDimensions(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      setDimensions(null);
    };
    img.src = value;
  }, [value]);

  const handleFile = async (file: File) => {
    setErrorMessage(null);

    // Validate size
    if (file.size > maxSizeBytes) {
      const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
      setErrorMessage(`File exceeds maximum size limit of ${maxMb}MB`);
      return;
    }

    // Validate format
    const validExtensions = acceptedFormats.split(",").map(ext => ext.trim().toLowerCase());
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
    const isMimeValid = file.type.startsWith("image/") || fileExt === ".ico";

    if (!isMimeValid && !validExtensions.includes(fileExt)) {
      setErrorMessage(`Invalid format. Allowed: ${acceptedFormats}`);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("admin_token") || localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("/api/admin/branding/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      if (data.url) {
        onUpload(data.url);
      } else {
        throw new Error("No URL returned from server");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleManualUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualUrl.trim()) {
      onUpload(manualUrl.trim());
      setIsUrlModalOpen(false);
      setManualUrl("");
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between transition-all hover:border-border/80">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-text text-base">{title}</h4>
              {badge && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {badge}
                </span>
              )}
              {isOptional && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted-text/10 text-muted-text">
                  Optional
                </span>
              )}
            </div>
            <p className="text-xs text-muted-text mt-1 leading-relaxed">{description}</p>
          </div>

          {/* Status Indicator */}
          {value ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{tUi("admin.branding.status_configured") || "Configured"}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-text font-medium shrink-0 bg-surface-hover px-2.5 py-1 rounded-full border border-border">
              <Info className="w-3.5 h-3.5" />
              <span>{isOptional ? (tUi("admin.branding.status_inherited") || "Inherited") : (tUi("admin.branding.status_default") || "Default")}</span>
            </div>
          )}
        </div>

        {/* Preview Frame */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative mt-4 mb-3 rounded-lg border-2 border-dashed transition-all flex items-center justify-center p-4 min-h-[120px] ${
            isDragging 
              ? "border-primary bg-primary/5" 
              : value 
                ? "border-border/60" 
                : "border-border hover:border-primary/50"
          } ${
            previewBg === "dark" 
              ? "bg-[#0b0f19] text-white" 
              : previewBg === "light" 
                ? "bg-white text-slate-900" 
                : "bg-surface text-text"
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-4 text-primary">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs font-medium">{tUi("admin.branding.uploading") || "Uploading asset..."}</span>
            </div>
          ) : value ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="relative group max-w-full flex items-center justify-center">
                {isFavicon ? (
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs flex items-center justify-center">
                    <img 
                      src={value} 
                      alt={title} 
                      className="w-10 h-10 object-contain shadow-xs"
                      onError={() => setErrorMessage("Failed to load image preview from URL")}
                    />
                  </div>
                ) : (
                  <img 
                    src={value} 
                    alt={title} 
                    className="max-h-16 max-w-full object-contain drop-shadow-xs transition-transform group-hover:scale-105"
                    onError={() => setErrorMessage("Failed to load image preview from URL")}
                  />
                )}
              </div>
              {dimensions && (
                <div className={`text-[11px] font-mono px-2 py-0.5 rounded-sm ${
                  previewBg === "dark" ? "text-slate-400 bg-slate-800/80" : "text-slate-500 bg-slate-100"
                }`}>
                  {dimensions.width} × {dimensions.height} px
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 text-center py-3 w-full cursor-pointer focus:outline-none"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center transition-transform hover:scale-110">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-text">
                {tUi("admin.branding.upload_or_drop") || "Click to browse or drop an image here"}
              </span>
              <span className="text-[11px] text-muted-text">
                {recommendedSize}
              </span>
            </button>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
                e.target.value = "";
              }
            }}
          />
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-2.5 mb-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{errorMessage}</span>
            <button 
              type="button" 
              onClick={() => setErrorMessage(null)} 
              className="ml-auto text-destructive hover:opacity-75"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border mt-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{value ? (tUi("admin.branding.replace") || "Replace") : (tUi("Upload") || "Upload")}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsUrlModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text bg-surface-hover hover:bg-border transition-colors border border-border"
            title={tUi("admin.branding.direct_url") || "Direct Image URL"}
          >
            <LinkIcon className="w-3.5 h-3.5 text-muted-text" />
            <span>URL</span>
          </button>
        </div>

        {value && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            title={isFavicon ? (tUi("admin.branding.clear_favicon") || "Clear Favicon") : (tUi("admin.branding.clear_logo") || "Clear Logo")}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{tUi("Clear") || "Clear"}</span>
          </button>
        )}
      </div>

      {/* Direct URL Input Modal */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-background border border-border rounded-xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold text-text text-sm flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-primary" />
                {tUi("admin.branding.direct_url") || "Set Image URL Directly"}
              </h5>
              <button 
                type="button" 
                onClick={() => setIsUrlModalOpen(false)}
                className="text-muted-text hover:text-text p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-text mb-4 leading-relaxed">
              {tUi("admin.branding.enter_url") || "Paste an image URL from an external CDN, Cloudflare R2, AWS S3, or public asset directory."}
            </p>
            <form onSubmit={handleManualUrlSubmit} className="space-y-3">
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://example.com/logo.svg"
                className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                required
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-text hover:text-text hover:bg-surface transition-colors"
                >
                  {tUi("Cancel") || "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-xs"
                >
                  {tUi("Apply URL") || "Apply URL"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function BrandingManager({ settings, onChange, token }: BrandingManagerProps) {
  const { currentLang, tUi } = useLanguage();
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");

  const headerLogoLight = settings.logo_header_light || "";
  const headerLogoDark = settings.logo_header_dark || "";
  const footerLogoLight = settings.logo_footer_light || "";
  const footerLogoDark = settings.logo_footer_dark || "";
  const faviconUrl = settings.favicon_url || "";
  const logoAltText = settings.logo_alt_text || "";
  const studioName = settings.studio_name || "SPS Studio";
  const headerBrandDisplay = settings.header_brand_display || "logo_only";
  const footerBrandDisplay = settings.footer_brand_display || "logo_only";

  // Active logo computed for preview
  const activePreviewHeaderLogo = previewTheme === "dark" 
    ? (headerLogoDark || headerLogoLight) 
    : (headerLogoLight || headerLogoDark);

  const activePreviewFooterLogo = previewTheme === "dark" 
    ? (footerLogoDark || headerLogoDark || footerLogoLight || headerLogoLight) 
    : (footerLogoLight || headerLogoLight || footerLogoDark || headerLogoDark);

  const handleFaviconChange = (url: string) => {
    onChange("favicon_url", url);
    updateDocumentFavicon(url);
  };

  const handleFaviconClear = () => {
    onChange("favicon_url", "");
    updateDocumentFavicon("");
  };

  return (
    <div className="space-y-8">
      {/* Header Introduction */}
      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text tracking-tight">
                {tUi("admin.branding.title") || "Site Identity & Branding"}
              </h3>
              <p className="text-xs text-muted-text mt-0.5 max-w-2xl leading-relaxed">
                {tUi("admin.branding.subtitle") || "Upload high-resolution logos for light and dark themes, configure footer branding, and customize browser tab favicons."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-surface border border-border p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setPreviewTheme("light")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                previewTheme === "light" 
                  ? "bg-primary text-primary-foreground shadow-xs" 
                  : "text-muted-text hover:text-text"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{tUi("admin.branding.preview_light") || "Light Preview"}</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewTheme("dark")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                previewTheme === "dark" 
                  ? "bg-primary text-primary-foreground shadow-xs" 
                  : "text-muted-text hover:text-text"
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{tUi("admin.branding.preview_dark") || "Dark Preview"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Live Studio Preview Stage */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-text uppercase tracking-wider">
              {tUi("admin.branding.preview_studio") || "Interactive Live Preview"}
            </h4>
          </div>
          <span className="text-xs text-muted-text">
            Mode: <strong className="text-text capitalize">{previewTheme}</strong>
          </span>
        </div>

        <div className={`border border-border rounded-2xl overflow-hidden shadow-sm transition-colors ${
          previewTheme === "dark" ? "bg-[#0b0f19] text-white" : "bg-slate-50 text-slate-900"
        }`}>
          {/* Browser Tab Bar Mockup */}
          <div className={`px-4 py-2.5 border-b flex items-center gap-3 ${
            previewTheme === "dark" ? "bg-[#141b2d] border-slate-800" : "bg-slate-200/80 border-slate-300"
          }`}>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
            </div>

            {/* Active Tab */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs max-w-xs truncate shadow-xs ${
              previewTheme === "dark" ? "bg-[#0b0f19] text-slate-200 border-t border-x border-slate-700/50" : "bg-white text-slate-800 border-t border-x border-slate-300"
            }`}>
              {faviconUrl ? (
                <img src={faviconUrl} alt="Favicon" className="w-4 h-4 object-contain shrink-0" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
              <span className="font-medium truncate">{studioName} | Real Estate Photography</span>
              <span className="text-[10px] text-muted-text ml-1 opacity-60">×</span>
            </div>

            {/* URL Search bar mockup */}
            <div className={`hidden sm:flex items-center gap-2 flex-1 max-w-sm px-3 py-1 rounded-full text-[11px] mx-auto truncate opacity-75 ${
              previewTheme === "dark" ? "bg-[#0b0f19]/70 text-slate-400 border border-slate-700/40" : "bg-white/80 text-slate-500 border border-slate-300"
            }`}>
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">https://spsstudio.com</span>
            </div>
          </div>

          {/* Mock Header Navigation */}
          <div className="p-4 md:p-6">
            <div className={`max-w-4xl mx-auto rounded-full px-5 py-3 border shadow-sm flex items-center justify-between ${
              previewTheme === "dark" ? "bg-[#141b2d]/90 border-slate-800 text-white" : "bg-white/90 border-slate-200 text-slate-900"
            }`}>
              {/* Brand Logo in Header */}
              <div className="flex items-center gap-2.5">
                {headerBrandDisplay !== "name_only" && activePreviewHeaderLogo ? (
                  <img 
                    src={activePreviewHeaderLogo} 
                    alt={logoAltText || studioName} 
                    className="h-8 max-w-[160px] object-contain"
                  />
                ) : null}
                {(headerBrandDisplay === "name_only" || headerBrandDisplay === "logo_and_name" || !activePreviewHeaderLogo) && (
                  <span className="font-bold tracking-tight text-base">{studioName}</span>
                )}
              </div>

              {/* Mock Nav links */}
              <div className="hidden md:flex items-center gap-5 text-xs font-medium opacity-80">
                <span>About</span>
                <span>Services</span>
                <span>Portfolio</span>
                <span>Contact</span>
              </div>

              <div className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground shadow-xs">
                Inquiry
              </div>
            </div>

            {/* Mock Page Content Body */}
            <div className="py-8 text-center max-w-md mx-auto space-y-2">
              <div className={`h-4 w-40 mx-auto rounded-full ${previewTheme === "dark" ? "bg-slate-800" : "bg-slate-200"}`} />
              <div className={`h-3 w-64 mx-auto rounded-full ${previewTheme === "dark" ? "bg-slate-800/60" : "bg-slate-200/60"}`} />
            </div>

            {/* Mock Footer */}
            <div className={`max-w-4xl mx-auto rounded-xl p-5 border text-center space-y-2.5 ${
              previewTheme === "dark" ? "bg-[#141b2d]/50 border-slate-800/60" : "bg-slate-100 border-slate-200"
            }`}>
              <div className="flex items-center justify-center gap-2.5">
              {footerBrandDisplay !== "name_only" && activePreviewFooterLogo ? (
                <img 
                  src={activePreviewFooterLogo} 
                  alt="Footer Logo" 
                  className="h-6 max-w-[140px] object-contain mx-auto"
                />
              ) : null}
              {(footerBrandDisplay === "name_only" || footerBrandDisplay === "logo_and_name" || !activePreviewFooterLogo) && (
                <span className="font-bold tracking-tight text-sm">{studioName}</span>
              )}
              </div>
              <p className="text-[11px] opacity-70">
                &copy; {new Date().getFullYear()} {studioName}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Upload & Management Grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-border bg-surface/60 p-4 md:p-5">
          {([
            ["header_brand_display", headerBrandDisplay, tUi("admin.branding.header_display") || "Header brand display"],
            ["footer_brand_display", footerBrandDisplay, tUi("admin.branding.footer_display") || "Footer brand display"],
          ] as const).map(([key, value, label]) => (
            <label key={key} className="space-y-2 text-sm font-semibold text-text">
              <span>{label}</span>
              <select
                value={value}
                onChange={(event) => onChange(key, event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="logo_only">{tUi("admin.branding.display_logo_only") || "Logo only"}</option>
                <option value="logo_and_name">{tUi("admin.branding.display_logo_and_name") || "Logo and studio name"}</option>
                <option value="name_only">{tUi("admin.branding.display_name_only") || "Studio name only"}</option>
              </select>
            </label>
          ))}
        </div>

        <h4 className="text-sm font-bold text-text uppercase tracking-wider">
          Brand Assets & Logos
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Header Logo (Light Mode) */}
          <ImageUploadCard
            id="logo_header_light"
            title={tUi("admin.branding.header_logo_light") || "Header Logo (Light Mode)"}
            description={tUi("admin.branding.header_logo_light_desc") || "Displayed in the header against light backgrounds when the site is in Light Mode."}
            value={headerLogoLight}
            badge="Header • Light"
            recommendedSize="Recommended: PNG/SVG (transparent), ~200×40 px, max 5 MB"
            acceptedFormats=".png,.svg,.jpg,.jpeg,.webp"
            maxSizeBytes={5 * 1024 * 1024}
            previewBg="light"
            onUpload={(url) => onChange("logo_header_light", url)}
            onClear={() => onChange("logo_header_light", "")}
            tUi={tUi}
            currentLang={currentLang}
          />

          {/* 2. Header Logo (Dark Mode) */}
          <ImageUploadCard
            id="logo_header_dark"
            title={tUi("admin.branding.header_logo_dark") || "Header Logo (Dark Mode)"}
            description={tUi("admin.branding.header_logo_dark_desc") || "Displayed in the header against dark backgrounds when the site is in Dark Mode."}
            value={headerLogoDark}
            badge="Header • Dark"
            recommendedSize="Recommended: PNG/SVG (transparent/white), ~200×40 px, max 5 MB"
            acceptedFormats=".png,.svg,.jpg,.jpeg,.webp"
            maxSizeBytes={5 * 1024 * 1024}
            previewBg="dark"
            onUpload={(url) => onChange("logo_header_dark", url)}
            onClear={() => onChange("logo_header_dark", "")}
            tUi={tUi}
            currentLang={currentLang}
          />

          {/* 3. Footer Logo (Light Mode) */}
          <ImageUploadCard
            id="logo_footer_light"
            title={tUi("admin.branding.footer_logo_light") || "Footer Logo (Light Mode)"}
            description={tUi("admin.branding.footer_logo_light_desc") || "Optional footer mark for Light Mode. If left blank, inherits from Header Light logo."}
            value={footerLogoLight}
            badge="Footer • Light"
            isOptional={true}
            recommendedSize="Recommended: PNG/SVG (transparent), ~180×36 px, max 5 MB"
            acceptedFormats=".png,.svg,.jpg,.jpeg,.webp"
            maxSizeBytes={5 * 1024 * 1024}
            previewBg="light"
            onUpload={(url) => onChange("logo_footer_light", url)}
            onClear={() => onChange("logo_footer_light", "")}
            tUi={tUi}
            currentLang={currentLang}
          />

          {/* 4. Footer Logo (Dark Mode) */}
          <ImageUploadCard
            id="logo_footer_dark"
            title={tUi("admin.branding.footer_logo_dark") || "Footer Logo (Dark Mode)"}
            description={tUi("admin.branding.footer_logo_dark_desc") || "Optional footer mark for Dark Mode. If left blank, inherits from Header Dark logo."}
            value={footerLogoDark}
            badge="Footer • Dark"
            isOptional={true}
            recommendedSize="Recommended: PNG/SVG (transparent/white), ~180×36 px, max 5 MB"
            acceptedFormats=".png,.svg,.jpg,.jpeg,.webp"
            maxSizeBytes={5 * 1024 * 1024}
            previewBg="dark"
            onUpload={(url) => onChange("logo_footer_dark", url)}
            onClear={() => onChange("logo_footer_dark", "")}
            tUi={tUi}
            currentLang={currentLang}
          />

          {/* 5. Favicon (Browser Tab Icon) */}
          <div className="md:col-span-2">
            <ImageUploadCard
              id="favicon_url"
              title={tUi("admin.branding.favicon") || "Favicon (Browser Tab Icon)"}
              description={tUi("admin.branding.favicon_desc") || "Displayed in browser tabs, bookmarks, and mobile home screen shortcuts."}
              value={faviconUrl}
              badge="Browser Icon"
              recommendedSize="Recommended: PNG, ICO, or SVG, square 32×32, 64×64, or 128×128 px, max 2 MB"
              acceptedFormats=".png,.ico,.svg,.webp"
              maxSizeBytes={2 * 1024 * 1024}
              previewBg="checker"
              isFavicon={true}
              onUpload={handleFaviconChange}
              onClear={handleFaviconClear}
              tUi={tUi}
              currentLang={currentLang}
            />
          </div>
        </div>
      </div>

      {/* Brand Alt Text & SEO Field */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
        <label className="block text-sm font-semibold text-text mb-1">
          {tUi("admin.branding.alt_text") || "Brand Logo Alt Text (Accessibility & SEO)"}
        </label>
        <p className="text-xs text-muted-text mb-3 leading-relaxed">
          {tUi("admin.branding.alt_text_desc") || "Screen reader and search engine label for all brand logo images. If left blank, defaults to the Studio Name."}
        </p>
        <input
          type="text"
          value={logoAltText}
          onChange={(e) => onChange("logo_alt_text", e.target.value)}
          placeholder={studioName || "SPS Studio"}
          className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
        />
      </div>
    </div>
  );
}
