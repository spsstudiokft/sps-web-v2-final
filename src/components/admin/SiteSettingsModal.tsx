import React, { useState, useEffect } from "react";
import { SiteSettings, Language } from "../../lib/types";
import { TranslatableInput } from "./TranslatableInput";
import { LanguageManager } from "./LanguageManager";
import { ThemeManager } from "./ThemeManager";
import { BrandingManager } from "./BrandingManager";
import { SeoSettingsManager } from "./SeoSettingsManager";
import { TranslationsManager } from "./TranslationsManager";
import { EmailSettingsManager } from "./EmailSettingsManager";
import { SectionMediaManager } from "./SectionMediaManager";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { useTheme } from "../ThemeProvider";
import { useLanguage } from "../../contexts/LanguageContext";
import { updateDocumentFavicon } from "../../lib/favicon";
import { 
  X, 
  Settings as SettingsIcon, 
  Search, 
  FileText, 
  Palette, 
  Globe, 
  Check, 
  AlertCircle, 
  Loader2, 
  Database,
  Mail,
  Phone,
  Layers,
  Sparkles,
  Sliders,
  Languages,
  MapPin,
  Clock,
  CheckSquare,
  Square,
  Image as ImageIcon,
  CheckCircle2,
  HelpCircle,
  Server,
  HardDrive,
  Terminal,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

interface SiteSettingsModalProps {
  isOpen: boolean;
  initialSettings: SiteSettings;
  initialTab?: "general" | "branding" | "translations" | "contact" | "content" | "seo" | "email";
  onClose: () => void;
  onSave: (updatedSettings: SiteSettings) => Promise<void>;
}

export function SiteSettingsModal({
  isOpen,
  initialSettings,
  initialTab = "general",
  onClose,
  onSave,
}: SiteSettingsModalProps) {
  const { setThemeColors } = useTheme();
  const { setCustomTranslationsMap, reloadSettings, tUi, currentLanguage } = useLanguage();
  const [settings, setSettings] = useState<SiteSettings>(initialSettings || {});
  const [activeTab, setActiveTab] = useState<"general" | "branding" | "translations" | "contact" | "content" | "seo" | "email">(initialTab);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isTestingAppwrite, setIsTestingAppwrite] = useState(false);
  const [appwriteDiagnostic, setAppwriteDiagnostic] = useState<any | null>(null);
  const [show413Guide, setShow413Guide] = useState(false);

  const testAppwriteConnection = async () => {
    setIsTestingAppwrite(true);
    setAppwriteDiagnostic(null);
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/storage/diagnose-appwrite", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setAppwriteDiagnostic(data);
    } catch (err: any) {
      setAppwriteDiagnostic({
        success: false,
        message: err.message || "Failed to contact diagnostic service"
      });
    } finally {
      setIsTestingAppwrite(false);
    }
  };

  // Sync settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings || {});
      setActiveTab(initialTab);
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [isOpen, initialSettings, initialTab]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (key: keyof SiteSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const siteLangs = settings.site_languages || '[{"code":"en","name":"English"}]';

  // Parse supported languages array
  let parsedLanguages: Language[] = [{ code: "en", name: "English", enabled: true }];
  try {
    if (settings.site_languages) {
      const parsed = JSON.parse(settings.site_languages);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsedLanguages = parsed.map((l: any) => ({
          code: String(l.code || "").trim(),
          name: String(l.name || l.code || "").trim(),
          enabled: l.code === (settings.default_language || "en") ? true : (l.enabled !== false),
          flag: l.flag,
          nativeName: l.nativeName,
        }));
      }
    }
  } catch (e) {}

  // Validation
  const validateForm = (): boolean => {
    if (settings.contact_email && settings.contact_email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settings.contact_email.trim())) {
        setErrorMessage(tUi("admin.settings.validation_email", currentLanguage) || "Please enter a valid contact email address.");
        setActiveTab("content");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      await onSave(settings);

      // Apply theme immediately to active session
      if (settings.theme_colors) {
        try {
          setThemeColors(JSON.parse(settings.theme_colors));
        } catch (e) {
          console.error("Failed to parse theme colors on save", e);
        }
      }

      // Apply custom translations to active session
      if (settings.custom_translations) {
        try {
          const parsed = typeof settings.custom_translations === "string" 
            ? JSON.parse(settings.custom_translations)
            : settings.custom_translations;
          setCustomTranslationsMap(parsed);
        } catch (e) {}
      }

      // Apply favicon update immediately
      if (settings.favicon_url !== undefined) {
        updateDocumentFavicon(settings.favicon_url);
      }

      await reloadSettings();

      setSuccessMessage(tUi("admin.settings.success_updated", currentLanguage) || "Site settings have been successfully updated!");
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="site-settings-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="site-settings-modal-title"
    >
      <div
        id="site-settings-modal-dialog"
        className="bg-background border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border bg-surface/50 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <SettingsIcon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="site-settings-modal-title" className="text-lg font-bold text-text tracking-tight leading-snug">
                {tUi("admin.settings.modal_title", currentLanguage) || "Site & System Settings"}
              </h2>
              <p className="text-xs text-muted-text">
                {tUi("admin.settings.modal_subtitle", currentLanguage) || "Manage global studio branding, multiline content, themes, localization, and SEO."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-text hover:text-text hover:bg-surface rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tabbed Navigation Bar */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-border bg-surface/20 shrink-0 overflow-x-auto">
          <button
            type="button"
            id="tab-btn-general"
            onClick={() => setActiveTab("general")}
            className={`pb-2.5 px-3.5 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "general"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <Sliders className="w-4 h-4" aria-hidden="true" />
            <span>{tUi("admin.settings.tab_general", currentLanguage) || "General"}</span>
          </button>

          <button
            type="button"
            id="tab-btn-branding"
            onClick={() => setActiveTab("branding")}
            className={`pb-2.5 px-3.5 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "branding"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <ImageIcon className="w-4 h-4" aria-hidden="true" />
            <span>{tUi("admin.settings.tab_branding", currentLanguage) || "Branding & Logos"}</span>
          </button>

          <button
            type="button"
            id="tab-btn-translations"
            onClick={() => setActiveTab("translations")}
            className={`pb-2.5 px-3.5 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "translations"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <Languages className="w-4 h-4" aria-hidden="true" />
            <span>{tUi("admin.settings.tab_translations", currentLanguage) || "Languages & Translations"}</span>
          </button>

          <button
            type="button"
            id="tab-btn-contact"
            onClick={() => setActiveTab("contact")}
            className={`pb-2.5 px-3.5 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "contact"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            <span>{tUi("admin.settings.tab_contact", currentLanguage) || "Contact & Inquiries"}</span>
          </button>

          <button
            type="button"
            id="tab-btn-content"
            onClick={() => setActiveTab("content")}
            className={`pb-2.5 px-3.5 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "content"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            <span>{tUi("admin.settings.tab_content", currentLanguage) || "Hero & About"}</span>
          </button>

          <button
            type="button"
            id="tab-btn-seo"
            onClick={() => setActiveTab("seo")}
            className={`pb-2.5 px-3.5 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "seo"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <span>{tUi("admin.settings.tab_seo_keywords", currentLanguage) || "SEO & Keywords"}</span>
          </button>

          <button
            type="button"
            id="tab-btn-email"
            onClick={() => setActiveTab("email")}
            className={`pb-2.5 px-3.5 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "email"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            <span>{tUi("admin.settings.tab_email_resend", currentLanguage) || "Email & Resend"}</span>
          </button>
        </div>

        {/* Modal Form & Scrolling Content Body */}
        <div
          id="site-settings-form"
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {errorMessage && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm animate-in fade-in duration-150"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div
              className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm animate-in fade-in duration-150"
              role="status"
            >
              <Check className="w-5 h-5 shrink-0" aria-hidden="true" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* TAB 1: General & Branding */}
          {activeTab === "general" && (
            <div className="space-y-6">
              {/* Studio Name & Identity */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_studio_identity", currentLanguage) || "Studio Identity & Title"}</span>
                </div>
                <TranslatableInput
                  label={tUi("admin.settings.studio_name", currentLanguage) || "Studio Name"}
                  value={settings.studio_name}
                  onChange={(val) => handleChange("studio_name", val)}
                  siteLanguages={siteLangs}
                  placeholder="e.g. SPS Studio | Premier Real Estate Media"
                />
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Layers className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>Footer information</span>
                </div>
                <div>
                  <Label htmlFor="footer-version">Website version badge</Label>
                  <Input id="footer-version" className="mt-1.5" placeholder="e.g. v2.0.0" value={settings.footer_version || ""} onChange={(e) => handleChange("footer_version", e.target.value)} />
                </div>
                <TranslatableInput label="AI-generated code security notice" value={settings.footer_ai_notice || ""} onChange={(val) => handleChange("footer_ai_notice", val)} siteLanguages={siteLangs} isTextarea placeholder="This website's complete structure runs on AI-generated code and is operated securely." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TranslatableInput label="Created-with prefix" value={settings.footer_created_prefix || ""} onChange={(val) => handleChange("footer_created_prefix", val)} siteLanguages={siteLangs} placeholder="Created with" />
                  <TranslatableInput label="Created-in suffix" value={settings.footer_created_suffix || ""} onChange={(val) => handleChange("footer_created_suffix", val)} siteLanguages={siteLangs} placeholder="in" />
                </div>
                <p className="text-xs text-muted-text">Social buttons use the enabled links configured in the Social Links Tree Manager.</p>
              </div>

              {/* Theme Colors */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Palette className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_theme_palette", currentLanguage) || "Theme & Color Palette"}</span>
                </div>
                <ThemeManager
                  value={settings.theme_colors}
                  onChange={(val) => handleChange("theme_colors", val)}
                />
              </div>

              {/* Storage & Media Provider */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Database className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_media_storage", currentLanguage) || "Media Storage Provider"}</span>
                </div>
                <div>
                  <Label htmlFor="media-provider-select">{tUi("admin.settings.active_storage_backend", currentLanguage) || "Active Storage Backend"}</Label>
                  <select
                    id="media-provider-select"
                    className="mt-1.5 block w-full px-4 py-2.5 border border-border bg-background text-text rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none sm:text-sm transition-all"
                    value={settings.media_provider || "r2"}
                    onChange={(e) => handleChange("media_provider", e.target.value)}
                  >
                    <option value="r2">Cloudflare R2 Object Storage (Recommended for 10 GB+)</option>
                    <option value="appwrite">Appwrite Storage</option>
                    <option value="local">Local High-Capacity Disk Storage</option>
                  </select>
                </div>

                {settings.media_provider === "appwrite" && (
                  <div className="mt-3 p-4 bg-background rounded-xl border border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-text flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-primary" />
                        Appwrite Storage Configuration
                      </div>
                      <button
                        type="button"
                        onClick={testAppwriteConnection}
                        disabled={isTestingAppwrite}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isTestingAppwrite ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Testing Connection...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3 h-3" />
                            Test Connection & Bucket
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="appwrite-endpoint" className="text-xs">API Endpoint</Label>
                        <Input
                          id="appwrite-endpoint"
                          placeholder="https://cloud.appwrite.io/v1"
                          value={settings.appwrite_endpoint || ""}
                          onChange={(e) => handleChange("appwrite_endpoint", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="appwrite-project-id" className="text-xs">Project ID</Label>
                        <Input
                          id="appwrite-project-id"
                          placeholder="your-project-id"
                          value={settings.appwrite_project_id || ""}
                          onChange={(e) => handleChange("appwrite_project_id", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="appwrite-bucket-id" className="text-xs">Storage Bucket ID</Label>
                        <Input
                          id="appwrite-bucket-id"
                          placeholder="default"
                          value={settings.appwrite_bucket_id || ""}
                          onChange={(e) => handleChange("appwrite_bucket_id", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="appwrite-api-key" className="text-xs">API Secret Key</Label>
                        <Input
                          id="appwrite-api-key"
                          type="password"
                          placeholder="••••••••••••••••"
                          value={settings.appwrite_api_key || ""}
                          onChange={(e) => handleChange("appwrite_api_key", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                    </div>

                    {/* Appwrite Diagnostic Feedback */}
                    {appwriteDiagnostic && (
                      <div className={`p-3 rounded-lg border text-xs ${appwriteDiagnostic.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'}`}>
                        <div className="flex items-center gap-2 font-medium">
                          {appwriteDiagnostic.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                          {appwriteDiagnostic.message}
                        </div>
                        {appwriteDiagnostic.bucket && (
                          <div className="mt-2 space-y-1 text-[11px] opacity-90">
                            <div><strong>Bucket:</strong> {appwriteDiagnostic.bucket.name} (ID: {appwriteDiagnostic.bucket.id})</div>
                            <div><strong>Configured Max File Size:</strong> {appwriteDiagnostic.bucket.maximumFileSizeFormatted}</div>
                          </div>
                        )}
                        {appwriteDiagnostic.advice && (
                          <div className="mt-1.5 text-[11px] font-medium">{appwriteDiagnostic.advice}</div>
                        )}
                      </div>
                    )}

                    {/* 10 GB Appwrite & 413 Troubleshooting Guide */}
                    <div className="pt-2 border-t border-border/50">
                      <button
                        type="button"
                        onClick={() => setShow413Guide(!show413Guide)}
                        className="flex items-center justify-between w-full text-xs font-semibold text-primary hover:underline"
                      >
                        <span className="flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" />
                          Self-Hosted 10 GB Video Uploads & HTTP 413 Setup Guide
                        </span>
                        <span>{show413Guide ? "▲ Hide" : "▼ Show"}</span>
                      </button>

                      {show413Guide && (
                        <div className="mt-2 p-3 bg-muted/40 rounded-lg text-xs space-y-2.5 text-muted-text border border-border">
                          <div className="font-semibold text-text">Why does HTTP 413 (Content Too Large) happen despite a 10 GB bucket limit?</div>
                          <p>
                            In self-hosted Appwrite, the bucket setting is only a client filter. The actual upload capacity is governed by <strong>Appwrite container variables</strong> and <strong>reverse proxy buffers</strong>.
                          </p>

                          <div className="space-y-1.5">
                            <div className="font-medium text-text">1. Self-Hosted Appwrite Environment (.env):</div>
                            <div className="p-2 bg-black/90 text-green-400 font-mono text-[11px] rounded overflow-x-auto select-all">
                              _APP_STORAGE_LIMIT=10737418240<br/>
                              _APP_STORAGE_PREVIEW_LIMIT=52428800
                            </div>
                            <div className="text-[11px]">Set <code>_APP_STORAGE_LIMIT</code> to at least 10 GB in bytes (<code>10737418240</code>). Then restart with <code>docker compose up -d --force-recreate</code>.</div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="font-medium text-text">2. Nginx Reverse Proxy (if placed in front of Appwrite):</div>
                            <div className="p-2 bg-black/90 text-green-400 font-mono text-[11px] rounded overflow-x-auto select-all">
                              # Inside http or server block in nginx.conf:<br/>
                              client_max_body_size 10G;
                            </div>
                            <div className="text-[11px]">If Nginx sits in front of Appwrite, set <code>client_max_body_size 10G;</code> (or <code>0</code> for unlimited).</div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="font-medium text-text">3. Apache Reverse Proxy (if used):</div>
                            <div className="p-2 bg-black/90 text-green-400 font-mono text-[11px] rounded overflow-x-auto select-all">
                              LimitRequestBody 0
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="font-medium text-text">4. Client-Side Chunking:</div>
                            <div className="text-[11px]">
                              Our studio automatically streams large videos in <strong>5 MB chunks</strong> with live progress bars to bypass browser and cloud ingress payload constraints.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {settings.media_provider === "r2" && (
                  <div className="mt-3 p-4 bg-background rounded-xl border border-border space-y-3">
                    <div className="text-xs font-semibold text-text">Cloudflare R2 Configuration (Optional if set in .env)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="r2-account-id" className="text-xs">Account ID</Label>
                        <Input
                          id="r2-account-id"
                          placeholder="Cloudflare Account ID"
                          value={settings.r2_account_id || ""}
                          onChange={(e) => handleChange("r2_account_id", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="r2-bucket-name" className="text-xs">Bucket Name</Label>
                        <Input
                          id="r2-bucket-name"
                          placeholder="portfolio-media"
                          value={settings.r2_bucket_name || ""}
                          onChange={(e) => handleChange("r2_bucket_name", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="r2-access-key" className="text-xs">Access Key ID</Label>
                        <Input
                          id="r2-access-key"
                          placeholder="Access Key ID"
                          value={settings.r2_access_key_id || ""}
                          onChange={(e) => handleChange("r2_access_key_id", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="r2-secret-key" className="text-xs">Secret Access Key</Label>
                        <Input
                          id="r2-secret-key"
                          type="password"
                          placeholder="••••••••••••••••"
                          value={settings.r2_secret_access_key || ""}
                          onChange={(e) => handleChange("r2_secret_access_key", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="r2-public-domain" className="text-xs">Public Domain / Custom Domain</Label>
                        <Input
                          id="r2-public-domain"
                          placeholder="media.yourdomain.com (optional)"
                          value={settings.r2_public_domain || ""}
                          onChange={(e) => handleChange("r2_public_domain", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {settings.media_provider === "local" && (
                  <p className="text-xs text-muted-text">
                    Local storage saves uploaded images and videos directly to the server filesystem under <code className="text-text font-mono text-[11px]">/uploads</code> with support for large files up to 10 GB.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB: Branding & Logos */}
          {activeTab === "branding" && (
            <BrandingManager
              settings={settings}
              onChange={handleChange}
              token={localStorage.getItem("admin_token") || localStorage.getItem("token")}
            />
          )}

          {/* TAB 2: Languages & Translations */}
          {activeTab === "translations" && (
            <div className="space-y-6">
              {/* Language Manager */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Globe className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_languages_default", currentLanguage) || "Supported Languages & Default Locale"}</span>
                </div>
                <LanguageManager
                  siteLanguages={settings.site_languages || ""}
                  defaultLanguage={settings.default_language || "en"}
                  onChange={(langs, defLang) => {
                    setSettings((s) => ({ ...s, site_languages: langs, default_language: defLang }));
                  }}
                />
              </div>

              {/* Translations Dictionary Editor */}
              <TranslationsManager
                supportedLanguages={parsedLanguages}
                defaultLanguage={settings.default_language || "en"}
                customTranslations={settings.custom_translations}
                onChange={(translationsJson) => {
                  handleChange("custom_translations", translationsJson);
                }}
              />
            </div>
          )}

          {/* TAB 3: Contact & Inquiries */}
          {activeTab === "contact" && (
            <div className="space-y-6">
              {/* Contact Section Copy */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Mail className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_contact_copy", currentLanguage) || "Contact Section Header & Narrative"}</span>
                </div>
                <TranslatableInput
                  label={tUi("admin.settings.contact_title", currentLanguage) || "Contact Section Title"}
                  value={settings.contact_title}
                  onChange={(val) => handleChange("contact_title", val)}
                  siteLanguages={siteLangs}
                  placeholder="e.g. Let's work together."
                />
                <TranslatableInput
                  label={tUi("admin.settings.contact_description", currentLanguage) || "Contact Section Description"}
                  value={settings.contact_description}
                  onChange={(val) => handleChange("contact_description", val)}
                  siteLanguages={siteLangs}
                  isTextarea
                  placeholder="e.g. Ready to showcase your property? Get in touch with us to schedule a photoshoot."
                />
              </div>

              {/* Direct Channels & Studio Location */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_contact_details", currentLanguage) || "Contact Details & Office Location"}</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_email">{tUi("admin.settings.contact_email", currentLanguage) || "Public Contact Email"}</Label>
                    <div className="relative mt-1.5">
                      <Mail className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="contact_email"
                        type="email"
                        className="pl-10"
                        placeholder="contact@spsstudio.com"
                        value={settings.contact_email || ""}
                        onChange={(e) => handleChange("contact_email", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">{tUi("admin.settings.contact_phone", currentLanguage) || "Direct Phone / Hotline"}</Label>
                    <div className="relative mt-1.5">
                      <Phone className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="contact_phone"
                        type="tel"
                        className="pl-10"
                        placeholder="+1 (555) 234-5678"
                        value={settings.contact_phone || ""}
                        onChange={(e) => handleChange("contact_phone", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_address">{tUi("admin.settings.contact_address", currentLanguage) || "Studio Physical Address"}</Label>
                    <div className="relative mt-1.5">
                      <MapPin className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="contact_address"
                        type="text"
                        className="pl-10"
                        placeholder="e.g. 1052 Budapest, Váci utca 12."
                        value={settings.contact_address || ""}
                        onChange={(e) => handleChange("contact_address", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contact_hours">{tUi("admin.settings.contact_hours", currentLanguage) || "Business / Office Hours"}</Label>
                    <div className="relative mt-1.5">
                      <Clock className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="contact_hours"
                        type="text"
                        className="pl-10"
                        placeholder="e.g. Mon - Fri: 9:00 AM - 6:00 PM"
                        value={settings.contact_hours || ""}
                        onChange={(e) => handleChange("contact_hours", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact_map_embed">{tUi("admin.settings.contact_map_embed", currentLanguage) || "Google Maps Embed URL or iframe"}</Label>
                  <Input
                    id="contact_map_embed"
                    type="text"
                    className="mt-1.5 font-mono text-xs"
                    placeholder="https://www.google.com/maps/embed?pb=..."
                    value={settings.contact_map_embed || ""}
                    onChange={(e) => handleChange("contact_map_embed", e.target.value)}
                  />
                  <p className="text-2xs text-muted-text mt-1">
                    {tUi("admin.settings.contact_map_embed_hint", currentLanguage) || "Paste a Google Maps embed URL (https://www.google.com/maps/embed?...) or standard embed code."}
                  </p>
                </div>
              </div>

              {/* Inquiry Form Fields Settings */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Sliders className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_form_fields", currentLanguage) || "Inquiry Form Configuration"}</span>
                </div>

                <div className="space-y-3 divide-y divide-border">
                  {/* Phone Field Toggle & Mandatory Setting */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text">{tUi("admin.settings.form_phone_field", currentLanguage) || "Phone Number Field"}</div>
                      <div className="text-xs text-muted-text">
                        {tUi("admin.settings.form_phone_enable", currentLanguage) || "Show Phone Number field on Inquiry Form"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.contact_form_show_phone !== "0" && settings.contact_form_show_phone !== "false"}
                          onChange={(e) => handleChange("contact_form_show_phone", e.target.checked ? "1" : "0")}
                        />
                        <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>

                  {/* Require Phone Toggle */}
                  {(settings.contact_form_show_phone !== "0" && settings.contact_form_show_phone !== "false") && (
                    <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-4 border-l-2 border-primary/30">
                      <div>
                        <div className="text-xs font-semibold text-text">{tUi("admin.settings.form_phone_require", currentLanguage) || "Require Phone Number (Mandatory Field)"}</div>
                        <div className="text-2xs text-muted-text">
                          {settings.contact_form_require_phone === "1" || settings.contact_form_require_phone === "true" 
                            ? (tUi("admin.settings.form_phone_required", currentLanguage) || "Required")
                            : (tUi("admin.settings.form_phone_optional", currentLanguage) || "Optional")}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.contact_form_require_phone === "1" || settings.contact_form_require_phone === "true"}
                          onChange={(e) => handleChange("contact_form_require_phone", e.target.checked ? "1" : "0")}
                        />
                        <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  )}

                  {/* Property Address Toggle */}
                  <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text">{tUi("contact.property_address", currentLanguage) || "Property Address Field"}</div>
                      <div className="text-xs text-muted-text">
                        {tUi("admin.settings.form_address_enable", currentLanguage) || "Show 'Property Address' field"}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.contact_form_show_address === "1" || settings.contact_form_show_address === "true"}
                        onChange={(e) => handleChange("contact_form_show_address", e.target.checked ? "1" : "0")}
                      />
                      <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Availability Date-Time Range Field Toggle & Configuration */}
                  <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text">{tUi("contact.availability_field", currentLanguage) || "Availability Date–Time Range Field"}</div>
                      <div className="text-xs text-muted-text">
                        {tUi("admin.settings.form_availability_enable", currentLanguage) || "Show the preferred photoshoot date and time range picker"}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.contact_form_show_availability !== "0" && settings.contact_form_show_availability !== "false"}
                        onChange={(e) => handleChange("contact_form_show_availability", e.target.checked ? "1" : "0")}
                      />
                      <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Availability Sub-settings (Required toggle, Custom Label, Custom Help text) */}
                  {(settings.contact_form_show_availability !== "0" && settings.contact_form_show_availability !== "false") && (
                    <div className="pt-3 pl-4 border-l-2 border-primary/30 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-text">{tUi("admin.settings.form_availability_require", currentLanguage) || "Require Availability (Mandatory Field)"}</div>
                          <div className="text-2xs text-muted-text">
                            {settings.contact_form_require_availability === "1" || settings.contact_form_require_availability === "true" 
                              ? (tUi("admin.settings.form_availability_required", currentLanguage) || "Required")
                              : (tUi("admin.settings.form_availability_optional", currentLanguage) || "Optional")}
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.contact_form_require_availability === "1" || settings.contact_form_require_availability === "true"}
                            onChange={(e) => handleChange("contact_form_require_availability", e.target.checked ? "1" : "0")}
                          />
                          <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      <div className="space-y-3 pt-1">
                        <TranslatableInput
                          label={tUi("admin.settings.form_availability_custom_label", currentLanguage) || "Custom Field Label"}
                          value={settings.contact_form_availability_label || ""}
                          onChange={(val) => handleChange("contact_form_availability_label", val)}
                          siteLanguages={siteLangs}
                          placeholder="When I would like to schedule the photoshoot"
                        />
                        <TranslatableInput
                          label={tUi("admin.settings.form_availability_custom_help", currentLanguage) || "Custom Help Text"}
                          value={settings.contact_form_availability_help_text || ""}
                          onChange={(val) => handleChange("contact_form_availability_help_text", val)}
                          siteLanguages={siteLangs}
                          placeholder="Please specify your preferred date and time window for the photoshoot."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Content & Copywriting */}
          {activeTab === "content" && (
            <div className="space-y-6">
              <SectionMediaManager settings={settings} onChange={handleChange} />

              {/* Hero Section */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_hero_copy", currentLanguage) || "Hero Section Copy"}</span>
                </div>
                <TranslatableInput
                  label={tUi("admin.settings.hero_headline", currentLanguage) || "Hero Headline"}
                  value={settings.hero_headline}
                  onChange={(val) => handleChange("hero_headline", val)}
                  siteLanguages={siteLangs}
                  placeholder="e.g. Elevating Real Estate Presentations"
                />
                <TranslatableInput
                  label={tUi("admin.settings.hero_subheadline", currentLanguage) || "Hero Subheadline"}
                  value={settings.hero_subheadline}
                  onChange={(val) => handleChange("hero_subheadline", val)}
                  siteLanguages={siteLangs}
                  isTextarea
                  placeholder="e.g. Delivering high-impact visual media for luxury properties."
                />
              </div>

              {/* Vision Section */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_vision_copy", currentLanguage) || "Our Vision Section"}</span>
                </div>
                <p className="text-xs text-muted-text leading-relaxed">
                  {tUi("admin.settings.section_vision_description", currentLanguage) || "Edit the centered headline and supporting statement displayed between the hero and the studio introduction."}
                </p>
                <TranslatableInput
                  label={tUi("admin.settings.vision_headline", currentLanguage) || "Vision Headline"}
                  value={settings.vision_headline || ""}
                  onChange={(val) => handleChange("vision_headline", val)}
                  siteLanguages={siteLangs}
                  placeholder="e.g. We believe every space deserves to be seen at its best."
                />
                <TranslatableInput
                  label={tUi("admin.settings.vision_statement", currentLanguage) || "Vision Statement"}
                  value={settings.vision_statement || ""}
                  onChange={(val) => handleChange("vision_statement", val)}
                  siteLanguages={siteLangs}
                  isTextarea
                  placeholder="Describe the studio's visual philosophy and the value it creates for clients."
                />
              </div>

              {/* About Section */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_about_narrative", currentLanguage) || "About Studio Narrative"}</span>
                </div>
                <TranslatableInput
                  label={tUi("admin.settings.about_bio_label", currentLanguage) || "About Us Bio / Overview"}
                  value={settings.about_text}
                  onChange={(val) => handleChange("about_text", val)}
                  siteLanguages={siteLangs}
                  isTextarea
                  placeholder="Describe your studio history, visual expertise, and high-standard photography gear..."
                />
              </div>
            </div>
          )}

          {/* TAB 4: SEO & Social Metadata */}
          {activeTab === "seo" && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Search className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_seo_metadata", currentLanguage) || "Search Engine Optimization & Metadata"}</span>
                </div>
                <SeoSettingsManager
                  settings={settings}
                  onChange={(key, val) => handleChange(key, val)}
                  siteLanguages={siteLangs}
                />
              </div>
            </div>
          )}

          {/* TAB 5: Email Service & Resend Integration */}
          {activeTab === "email" && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
                <div className="flex items-center gap-2 text-text font-bold text-sm"><ExternalLink className="w-4 h-4 text-primary" /><span>Google review automation</span></div>
                <div>
                  <Label htmlFor="google-review-url">Google review destination URL</Label>
                  <Input id="google-review-url" type="url" className="mt-1.5 font-mono text-xs" placeholder="https://g.page/r/.../review" value={settings.google_review_url || ""} onChange={(e) => handleChange("google_review_url", e.target.value)} />
                  <p className="text-xs text-muted-text mt-1.5">Clients reach this address through a tracked link. Their first click automatically stops all remaining review reminders.</p>
                </div>
              </div>
              <EmailSettingsManager settings={settings} onChange={(key, val) => handleChange(key, val)} />
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-border bg-surface/50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {tUi("common.cancel", currentLanguage) || "Cancel"}
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              id="save-site-settings-btn"
              onClick={handleSubmit}
              disabled={saving}
              className="w-full sm:w-auto shadow-xs flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>{tUi("admin.settings.saving_settings", currentLanguage) || "Saving Settings..."}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>{tUi("admin.settings.save_all", currentLanguage) || "Save All Settings"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
