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
import { ComingSoonSettings } from "./ComingSoonSettings";
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
  const [settingsGroup, setSettingsGroup] = useState<"site" | "content" | "communication">("site");
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
        message: err.message || tUi("admin.settings.runtime.diagnostic_failed")
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
      setSettingsGroup(["general", "branding", "translations"].includes(initialTab) ? "site" : ["contact", "email"].includes(initialTab) ? "communication" : "content");
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

  const settingsTabs = [
    { id: "general" as const, group: "site", label: tUi("admin.settings.tab_general", currentLanguage), icon: Sliders },
    { id: "branding" as const, group: "site", label: tUi("admin.settings.tab_branding", currentLanguage), icon: ImageIcon },
    { id: "translations" as const, group: "site", label: tUi("admin.settings.tab_translations", currentLanguage), icon: Languages },
    { id: "content" as const, group: "content", label: tUi("admin.settings.tab_content", currentLanguage), icon: FileText },
    { id: "seo" as const, group: "content", label: tUi("admin.settings.tab_seo_keywords", currentLanguage), icon: Search },
    { id: "contact" as const, group: "communication", label: tUi("admin.settings.tab_contact", currentLanguage), icon: Phone },
    { id: "email" as const, group: "communication", label: tUi("admin.settings.tab_email_resend", currentLanguage), icon: Mail },
  ];
  const selectSettingsGroup = (group: "site" | "content" | "communication") => {
    setSettingsGroup(group);
    const firstTab = settingsTabs.find((tab) => tab.group === group);
    if (firstTab) setActiveTab(firstTab.id);
  };

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
        setErrorMessage(tUi("admin.settings.validation_email", currentLanguage));
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

      setSuccessMessage(tUi("admin.settings.success_updated", currentLanguage));
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || tUi("admin.settings.runtime.save_failed"));
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
                {tUi("admin.settings.modal_title", currentLanguage)}
              </h2>
              <p className="text-xs text-muted-text">
                {tUi("admin.settings.modal_subtitle", currentLanguage)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-text hover:text-text hover:bg-surface rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={tUi("admin.settings.modal.close_dialog")}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Two-level navigation keeps all settings discoverable without one long tab row. */}
        <div className="px-4 sm:px-6 pt-3 border-b border-border bg-surface/20 shrink-0">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-background/60 border border-border p-1" role="tablist" aria-label={tUi("admin.settings.modal.settings_categories")}>
            {[{ id: "site" as const, label: "Site & Brand", icon: SettingsIcon }, { id: "content" as const, label: "Content & SEO", icon: Search }, { id: "communication" as const, label: "Contact & Email", icon: Mail }].map((group) => { const Icon = group.icon; const selected = settingsGroup === group.id; return <button key={group.id} type="button" role="tab" aria-selected={selected} onClick={() => selectSettingsGroup(group.id)} className={`min-w-0 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] sm:text-xs font-bold transition-colors ${selected ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-text hover:bg-surface hover:text-text"}`}><Icon className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{group.label}</span></button>; })}
          </div>
          <div className="flex items-center gap-1 pt-2 overflow-x-auto scrollbar-none">
            {settingsTabs.filter((tab) => tab.group === settingsGroup).map((tab) => { const Icon = tab.icon; const selected = activeTab === tab.id; return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${selected ? "border-primary text-primary" : "border-transparent text-muted-text hover:text-text hover:bg-surface"}`}><Icon className="w-3.5 h-3.5" /><span>{tab.label}</span></button>; })}
          </div>
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
                  <span>{tUi("admin.settings.section_studio_identity", currentLanguage)}</span>
                </div>
                <TranslatableInput
                  label={tUi("admin.settings.studio_name", currentLanguage)}
                  value={settings.studio_name}
                  onChange={(val) => handleChange("studio_name", val)}
                  siteLanguages={siteLangs}
                  placeholder={tUi("admin.settings.modal.e_g_sps_studio_premier_real_estate_media")}
                />
              </div>

              <ComingSoonSettings
                settings={settings}
                siteLanguages={siteLangs}
                onChange={handleChange}
                tr={(key, fallback) => tUi(key, currentLanguage) || fallback}
              />

              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Layers className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.modal.footer_information")}</span>
                </div>
                <div>
                  <Label htmlFor="footer-version">{tUi("admin.settings.modal.website_version_badge")}</Label>
                  <Input id="footer-version" className="mt-1.5" placeholder={tUi("admin.settings.modal.e_g_v2_0_0")} value={settings.footer_version || ""} onChange={(e) => handleChange("footer_version", e.target.value)} />
                </div>
                <TranslatableInput label="AI-generated code security notice" value={settings.footer_ai_notice || ""} onChange={(val) => handleChange("footer_ai_notice", val)} siteLanguages={siteLangs} isTextarea placeholder={tUi("footer.ai_notice")} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TranslatableInput label="Created-with prefix" value={settings.footer_created_prefix || ""} onChange={(val) => handleChange("footer_created_prefix", val)} siteLanguages={siteLangs} placeholder={tUi("footer.created_with")} />
                  <TranslatableInput label="Created-in suffix" value={settings.footer_created_suffix || ""} onChange={(val) => handleChange("footer_created_suffix", val)} siteLanguages={siteLangs} placeholder="in" />
                </div>
                <p className="text-xs text-muted-text">{tUi("admin.settings.modal.social_buttons_use_the_enabled_links_configured_in_the")}</p>
              </div>

              {/* Theme Colors */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Palette className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_theme_palette", currentLanguage)}</span>
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
                  <span>{tUi("admin.settings.section_media_storage", currentLanguage)}</span>
                </div>
                <div>
                  <Label htmlFor="media-provider-select">{tUi("admin.settings.active_storage_backend", currentLanguage)}</Label>
                  <select
                    id="media-provider-select"
                    className="mt-1.5 block w-full px-4 py-2.5 border border-border bg-background text-text rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none sm:text-sm transition-all"
                    value={settings.media_provider || "r2"}
                    onChange={(e) => handleChange("media_provider", e.target.value)}
                  >
                    <option value="r2">{tUi("admin.settings.modal.cloudflare_r2_object_storage_recommended_for_10_gb")}</option>
                    <option value="appwrite">{tUi("admin.settings.modal.appwrite_storage")}</option>
                    <option value="local">{tUi("admin.settings.modal.local_high_capacity_disk_storage")}</option>
                  </select>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <Label htmlFor="image-optimization-mode">{tUi("admin.settings.image_optimization_mode", currentLanguage)}</Label>
                  <select
                    id="image-optimization-mode"
                    className="mt-1.5 block w-full px-4 py-2.5 border border-border bg-surface text-text rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none sm:text-sm transition-all"
                    value={settings.image_optimization_mode === "appwrite" ? "appwrite" : "vercel"}
                    onChange={(e) => handleChange("image_optimization_mode", e.target.value)}
                  >
                    <option value="vercel">{tUi("admin.settings.image_optimization_vercel", currentLanguage)}</option>
                    <option value="appwrite">{tUi("admin.settings.image_optimization_appwrite", currentLanguage)}</option>
                  </select>
                  <p className="mt-2 text-xs leading-5 text-muted-text">{tUi("admin.settings.image_optimization_hint", currentLanguage)}</p>
                </div>

                {settings.media_provider === "appwrite" && (
                  <div className="mt-3 p-4 bg-background rounded-xl border border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-text flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-primary" />
                        {tUi("admin.settings.modal.appwrite_storage_configuration")}</div>
                      <button
                        type="button"
                        onClick={testAppwriteConnection}
                        disabled={isTestingAppwrite}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isTestingAppwrite ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {tUi("admin.settings.modal.testing_connection")}</>
                        ) : (
                          <>
                            <ShieldCheck className="w-3 h-3" />
                            {tUi("admin.settings.modal.test_connection_bucket")}</>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="appwrite-endpoint" className="text-xs">{tUi("admin.settings.modal.api_endpoint")}</Label>
                        <Input
                          id="appwrite-endpoint"
                          placeholder={tUi("admin.settings.modal.https_cloud_appwrite_io_v1")}
                          value={settings.appwrite_endpoint || ""}
                          onChange={(e) => handleChange("appwrite_endpoint", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="appwrite-project-id" className="text-xs">{tUi("admin.settings.modal.project_id")}</Label>
                        <Input
                          id="appwrite-project-id"
                          placeholder={tUi("admin.settings.modal.your_project_id")}
                          value={settings.appwrite_project_id || ""}
                          onChange={(e) => handleChange("appwrite_project_id", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="appwrite-bucket-id" className="text-xs">{tUi("admin.settings.modal.storage_bucket_id")}</Label>
                        <Input
                          id="appwrite-bucket-id"
                          placeholder={tUi("admin.settings.modal.default")}
                          value={settings.appwrite_bucket_id || ""}
                          onChange={(e) => handleChange("appwrite_bucket_id", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="appwrite-api-key" className="text-xs">{tUi("admin.settings.modal.api_secret_key")}</Label>
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
                            <div><strong>{tUi("admin.settings.modal.bucket")}</strong> {appwriteDiagnostic.bucket.name} {tUi("admin.settings.modal.id")}{appwriteDiagnostic.bucket.id})</div>
                            <div><strong>{tUi("admin.settings.modal.configured_max_file_size")}</strong> {appwriteDiagnostic.bucket.maximumFileSizeFormatted}</div>
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
                          {tUi("admin.settings.modal.self_hosted_10_gb_video_uploads_http_413_setup_guide")}</span>
                        <span>{show413Guide ? "▲ Hide" : "▼ Show"}</span>
                      </button>

                      {show413Guide && (
                        <div className="mt-2 p-3 bg-muted/40 rounded-lg text-xs space-y-2.5 text-muted-text border border-border">
                          <div className="font-semibold text-text">{tUi("admin.settings.modal.why_does_http_413_content_too_large_happen_despite_a_1")}</div>
                          <p>
                            {tUi("admin.settings.modal.in_self_hosted_appwrite_the_bucket_setting_is_only_a_c")}<strong>{tUi("admin.settings.modal.appwrite_container_variables")}</strong> {tUi("admin.settings.modal.and")}<strong>{tUi("admin.settings.modal.reverse_proxy_buffers")}</strong>.
                          </p>

                          <div className="space-y-1.5">
                            <div className="font-medium text-text">{tUi("admin.settings.modal.1_self_hosted_appwrite_environment_env")}</div>
                            <div className="p-2 bg-black/90 text-green-400 font-mono text-[11px] rounded overflow-x-auto select-all">
                              {tUi("admin.settings.modal.app_storage_limit_10737418240")}<br/>
                              {tUi("admin.settings.modal.app_storage_preview_limit_52428800")}</div>
                            <div className="text-[11px]">{tUi("admin.settings.modal.set")}<code>{tUi("admin.settings.modal.app_storage_limit")}</code> {tUi("admin.settings.modal.to_at_least_10_gb_in_bytes")}<code>10737418240</code>{tUi("admin.settings.modal.then_restart_with")}<code>{tUi("admin.settings.modal.docker_compose_up_d_force_recreate")}</code>.</div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="font-medium text-text">{tUi("admin.settings.modal.2_nginx_reverse_proxy_if_placed_in_front_of_appwrite")}</div>
                            <div className="p-2 bg-black/90 text-green-400 font-mono text-[11px] rounded overflow-x-auto select-all">
                              {tUi("admin.settings.modal.inside_http_or_server_block_in_nginx_conf")}<br/>
                              {tUi("admin.settings.modal.client_max_body_size_10g")}</div>
                            <div className="text-[11px]">{tUi("admin.settings.modal.if_nginx_sits_in_front_of_appwrite_set")}<code>{tUi("admin.settings.modal.client_max_body_size_10g")}</code> {tUi("admin.settings.modal.or")}<code>0</code> {tUi("admin.settings.modal.for_unlimited")}</div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="font-medium text-text">{tUi("admin.settings.modal.3_apache_reverse_proxy_if_used")}</div>
                            <div className="p-2 bg-black/90 text-green-400 font-mono text-[11px] rounded overflow-x-auto select-all">
                              {tUi("admin.settings.modal.limitrequestbody_0")}</div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="font-medium text-text">{tUi("admin.settings.modal.4_client_side_chunking")}</div>
                            <div className="text-[11px]">
                              {tUi("admin.settings.modal.our_studio_automatically_streams_large_videos_in")}<strong>{tUi("admin.settings.modal.5_mb_chunks")}</strong> {tUi("admin.settings.modal.with_live_progress_bars_to_bypass_browser_and_cloud_in")}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {settings.media_provider === "r2" && (
                  <div className="mt-3 p-4 bg-background rounded-xl border border-border space-y-3">
                    <div className="text-xs font-semibold text-text">{tUi("admin.settings.modal.cloudflare_r2_configuration_optional_if_set_in_env")}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="r2-account-id" className="text-xs">{tUi("admin.settings.modal.account_id")}</Label>
                        <Input
                          id="r2-account-id"
                          placeholder={tUi("admin.settings.modal.cloudflare_account_id")}
                          value={settings.r2_account_id || ""}
                          onChange={(e) => handleChange("r2_account_id", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="r2-bucket-name" className="text-xs">{tUi("admin.settings.modal.bucket_name")}</Label>
                        <Input
                          id="r2-bucket-name"
                          placeholder={tUi("admin.settings.modal.portfolio_media")}
                          value={settings.r2_bucket_name || ""}
                          onChange={(e) => handleChange("r2_bucket_name", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="r2-access-key" className="text-xs">{tUi("admin.settings.modal.access_key_id")}</Label>
                        <Input
                          id="r2-access-key"
                          placeholder={tUi("admin.settings.modal.access_key_id")}
                          value={settings.r2_access_key_id || ""}
                          onChange={(e) => handleChange("r2_access_key_id", e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="r2-secret-key" className="text-xs">{tUi("admin.settings.modal.secret_access_key")}</Label>
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
                        <Label htmlFor="r2-public-domain" className="text-xs">{tUi("admin.settings.modal.public_domain_custom_domain")}</Label>
                        <Input
                          id="r2-public-domain"
                          placeholder={tUi("admin.settings.modal.media_yourdomain_com_optional")}
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
                    {tUi("admin.settings.modal.local_storage_saves_uploaded_images_and_videos_directl")}<code className="text-text font-mono text-[11px]">{tUi("admin.settings.modal.uploads")}</code> {tUi("admin.settings.modal.with_support_for_large_files_up_to_10_gb")}</p>
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
                  <span>{tUi("admin.settings.section_languages_default", currentLanguage)}</span>
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
                  <span>{tUi("admin.settings.section_contact_copy", currentLanguage)}</span>
                </div>
                <TranslatableInput
                  label={tUi("admin.settings.contact_title", currentLanguage)}
                  value={settings.contact_title}
                  onChange={(val) => handleChange("contact_title", val)}
                  siteLanguages={siteLangs}
                  placeholder={tUi("admin.settings.modal.e_g_let_s_work_together")}
                />
                <TranslatableInput
                  label={tUi("admin.settings.contact_description", currentLanguage)}
                  value={settings.contact_description}
                  onChange={(val) => handleChange("contact_description", val)}
                  siteLanguages={siteLangs}
                  isTextarea
                  placeholder={tUi("admin.settings.modal.e_g_ready_to_showcase_your_property_get_in_touch_with_")}
                />
              </div>

              {/* Direct Channels & Studio Location */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_contact_details", currentLanguage)}</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_email">{tUi("admin.settings.contact_email", currentLanguage)}</Label>
                    <div className="relative mt-1.5">
                      <Mail className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="contact_email"
                        type="email"
                        className="pl-10"
                        placeholder={tUi("admin.settings.modal.contact_spsstudio_com")}
                        value={settings.contact_email || ""}
                        onChange={(e) => handleChange("contact_email", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">{tUi("admin.settings.contact_phone", currentLanguage)}</Label>
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
                    <Label htmlFor="contact_address">{tUi("admin.settings.contact_address", currentLanguage)}</Label>
                    <div className="relative mt-1.5">
                      <MapPin className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="contact_address"
                        type="text"
                        className="pl-10"
                        placeholder={tUi("admin.settings.modal.e_g_1052_budapest_vaci_utca_12")}
                        value={settings.contact_address || ""}
                        onChange={(e) => handleChange("contact_address", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contact_hours">{tUi("admin.settings.contact_hours", currentLanguage)}</Label>
                    <div className="relative mt-1.5">
                      <Clock className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="contact_hours"
                        type="text"
                        className="pl-10"
                        placeholder={tUi("admin.settings.modal.e_g_mon_fri_9_00_am_6_00_pm")}
                        value={settings.contact_hours || ""}
                        onChange={(e) => handleChange("contact_hours", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact_map_embed">{tUi("admin.settings.contact_map_embed", currentLanguage)}</Label>
                  <Input
                    id="contact_map_embed"
                    type="text"
                    className="mt-1.5 font-mono text-xs"
                    placeholder={tUi("admin.settings.modal.https_www_google_com_maps_embed_pb")}
                    value={settings.contact_map_embed || ""}
                    onChange={(e) => handleChange("contact_map_embed", e.target.value)}
                  />
                  <p className="text-2xs text-muted-text mt-1">
                    {tUi("admin.settings.contact_map_embed_hint", currentLanguage)}
                  </p>
                </div>
              </div>

              {/* Inquiry Form Fields Settings */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Sliders className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_form_fields", currentLanguage)}</span>
                </div>

                <div className="space-y-3 divide-y divide-border">
                  {/* Phone Field Toggle & Mandatory Setting */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text">{tUi("admin.settings.form_phone_field", currentLanguage)}</div>
                      <div className="text-xs text-muted-text">
                        {tUi("admin.settings.form_phone_enable", currentLanguage)}
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
                        <div className="text-xs font-semibold text-text">{tUi("admin.settings.form_phone_require", currentLanguage)}</div>
                        <div className="text-2xs text-muted-text">
                          {settings.contact_form_require_phone === "1" || settings.contact_form_require_phone === "true" 
                            ? (tUi("admin.settings.form_phone_required", currentLanguage))
                            : (tUi("admin.settings.form_phone_optional", currentLanguage))}
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
                      <div className="text-sm font-semibold text-text">{tUi("contact.property_address", currentLanguage)}</div>
                      <div className="text-xs text-muted-text">
                        {tUi("admin.settings.form_address_enable", currentLanguage)}
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
                      <div className="text-sm font-semibold text-text">{tUi("contact.availability_field", currentLanguage)}</div>
                      <div className="text-xs text-muted-text">
                        {tUi("admin.settings.form_availability_enable", currentLanguage)}
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
                          <div className="text-xs font-semibold text-text">{tUi("admin.settings.form_availability_require", currentLanguage)}</div>
                          <div className="text-2xs text-muted-text">
                            {settings.contact_form_require_availability === "1" || settings.contact_form_require_availability === "true" 
                              ? (tUi("admin.settings.form_availability_required", currentLanguage))
                              : (tUi("admin.settings.form_availability_optional", currentLanguage))}
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
                          label={tUi("admin.settings.form_availability_custom_label", currentLanguage)}
                          value={settings.contact_form_availability_label || ""}
                          onChange={(val) => handleChange("contact_form_availability_label", val)}
                          siteLanguages={siteLangs}
                          placeholder={tUi("contact.when_contacted")}
                        />
                        <TranslatableInput
                          label={tUi("admin.settings.form_availability_custom_help", currentLanguage)}
                          value={settings.contact_form_availability_help_text || ""}
                          onChange={(val) => handleChange("contact_form_availability_help_text", val)}
                          siteLanguages={siteLangs}
                          placeholder={tUi("contact.availability_help_default")}
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
                  <span>{tUi("admin.settings.section_hero_copy", currentLanguage)}</span>
                </div>
                <TranslatableInput
                  label={tUi("admin.settings.hero_headline", currentLanguage)}
                  value={settings.hero_headline}
                  onChange={(val) => handleChange("hero_headline", val)}
                  siteLanguages={siteLangs}
                  placeholder={tUi("admin.settings.modal.e_g_elevating_real_estate_presentations")}
                />
                <TranslatableInput
                  label={tUi("admin.settings.hero_subheadline", currentLanguage)}
                  value={settings.hero_subheadline}
                  onChange={(val) => handleChange("hero_subheadline", val)}
                  siteLanguages={siteLangs}
                  isTextarea
                  placeholder={tUi("admin.settings.modal.e_g_delivering_high_impact_visual_media_for_luxury_pro")}
                />
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 px-4 py-3">
                  <div>
                    <Label className="text-sm font-semibold text-text">{tUi("admin.settings.hero_production_card", currentLanguage)}</Label>
                    <p className="mt-1 text-xs text-muted-text">{tUi("admin.settings.hero_production_card_help", currentLanguage)}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.hero_production_card_enabled !== "0" && settings.hero_production_card_enabled !== "false"}
                    onClick={() => handleChange("hero_production_card_enabled", settings.hero_production_card_enabled !== "0" && settings.hero_production_card_enabled !== "false" ? "0" : "1")}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${settings.hero_production_card_enabled !== "0" && settings.hero_production_card_enabled !== "false" ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${settings.hero_production_card_enabled !== "0" && settings.hero_production_card_enabled !== "false" ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>

              {/* Vision Section */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_vision_copy", currentLanguage)}</span>
                </div>
                <p className="text-xs text-muted-text leading-relaxed">
                  {tUi("admin.settings.section_vision_description", currentLanguage)}
                </p>
                <TranslatableInput
                  label={tUi("admin.settings.vision_headline", currentLanguage)}
                  value={settings.vision_headline || ""}
                  onChange={(val) => handleChange("vision_headline", val)}
                  siteLanguages={siteLangs}
                  placeholder={tUi("admin.settings.modal.e_g_we_believe_every_space_deserves_to_be_seen_at_its_")}
                />
                <TranslatableInput
                  label={tUi("admin.settings.vision_statement", currentLanguage)}
                  value={settings.vision_statement || ""}
                  onChange={(val) => handleChange("vision_statement", val)}
                  siteLanguages={siteLangs}
                  isTextarea
                  placeholder={tUi("admin.settings.modal.describe_the_studio_s_visual_philosophy_and_the_value_")}
                />
              </div>

              {/* About Section */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{tUi("admin.settings.section_about_narrative", currentLanguage)}</span>
                </div>
                <TranslatableInput
                  label={tUi("admin.settings.about_bio_label", currentLanguage)}
                  value={settings.about_text}
                  onChange={(val) => handleChange("about_text", val)}
                  siteLanguages={siteLangs}
                  isTextarea
                  placeholder={tUi("admin.settings.modal.describe_your_studio_history_visual_expertise_and_high")}
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
                  <span>{tUi("admin.settings.section_seo_metadata", currentLanguage)}</span>
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
                <div className="flex items-center gap-2 text-text font-bold text-sm"><ExternalLink className="w-4 h-4 text-primary" /><span>{tUi("admin.settings.modal.google_review_automation")}</span></div>
                <div>
                  <Label htmlFor="google-review-url">{tUi("admin.settings.modal.google_review_destination_url")}</Label>
                  <Input id="google-review-url" type="url" className="mt-1.5 font-mono text-xs" placeholder={tUi("admin.settings.modal.https_g_page_r_review")} value={settings.google_review_url || ""} onChange={(e) => handleChange("google_review_url", e.target.value)} />
                  <p className="text-xs text-muted-text mt-1.5">{tUi("admin.settings.modal.clients_reach_this_address_through_a_tracked_link_thei")}</p>
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
            {tUi("common.cancel", currentLanguage)}
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
                  <span>{tUi("admin.settings.saving_settings", currentLanguage)}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>{tUi("admin.settings.save_all", currentLanguage)}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
