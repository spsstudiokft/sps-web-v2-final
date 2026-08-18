import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteSettings, Language } from "../../lib/types";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { AdminFormSkeleton } from "../../components/admin/AdminSkeleton";
import { SiteSettingsModal } from "../../components/admin/SiteSettingsModal";
import { LegalDocumentsManager } from "../../components/admin/LegalDocumentsManager";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useApi } from "../../hooks/useApi";
import { useTheme } from "../../components/ThemeProvider";
import { useLanguage } from "../../contexts/LanguageContext";
import { 
  Search, 
  FileText, 
  Sliders, 
  CheckCircle2,
  Languages,
  Palette,
  ArrowRight,
  Mail,
  Send,
  Image as ImageIcon,
  Sparkles
} from "lucide-react";

export default function SettingsPage() {
  const { tUi, currentLanguage } = useLanguage();
  usePageTitle(tUi("admin.settings.title", currentLanguage));
  const { fetchApi } = useApi();
  const { setThemeColors } = useTheme();
  
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"general" | "branding" | "translations" | "contact" | "content" | "seo" | "email">("general");
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetchApi("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleOpenModal = (tab: "general" | "branding" | "translations" | "contact" | "content" | "seo" | "email" = "general") => {
    setModalTab(tab);
    setIsModalOpen(true);
  };

  const handleSaveSettings = async (updatedSettings: SiteSettings) => {
    const response = await fetchApi("/api/admin/settings", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedSettings)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save settings to server.");
    }

    setSettings(updatedSettings);
    setSaveBanner(tUi("admin.settings.success_banner", currentLanguage));
    setTimeout(() => setSaveBanner(null), 4000);
  };

  if (loading) {
    return <AdminFormSkeleton title={tUi("admin.settings.title", currentLanguage)} fields={7} />;
  }

  // Parse languages
  let parsedLanguages: Language[] = [{ code: "en", name: "English" }];
  try {
    if (settings.site_languages) {
      const parsed = JSON.parse(settings.site_languages);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsedLanguages = parsed;
      }
    }
  } catch (e) {}

  // Parse studio name helper
  const getStudioNameDisplay = () => {
    if (!settings.studio_name) return "SPS Studio";
    try {
      const p = JSON.parse(settings.studio_name);
      return p[currentLanguage] || p.en || Object.values(p)[0] || "SPS Studio";
    } catch {
      return settings.studio_name;
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Page Header with Action Modal Trigger */}
      <PageHeader 
        title={tUi("admin.settings.title", currentLanguage)} 
        subtitle={tUi("admin.settings.subtitle", currentLanguage)}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              onClick={() => handleOpenModal("branding")}
              className="shadow-xs flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>{tUi("admin.settings.tab_branding", currentLanguage) || "Branding & Logos"}</span>
            </Button>
            <Link
              to="/admin/themes"
              className="px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-background text-text text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Palette className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>{tUi("admin.nav.themes", currentLanguage) || "Theme & Colors"}</span>
            </Link>
            <Button 
              id="open-site-settings-btn"
              onClick={() => handleOpenModal("general")}
              className="shadow-xs flex items-center gap-2"
            >
              <Sliders className="w-4 h-4" aria-hidden="true" />
              <span>{tUi("admin.settings.edit_settings", currentLanguage)}</span>
            </Button>
          </div>
        }
      />

      {saveBanner && (
        <div 
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-2 animate-in fade-in duration-200"
          role="status"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{saveBanner}</span>
        </div>
      )}

      {/* Main Settings Overview Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card: Site Identity & Branding (NEW) */}
        <Card className="border-border hover:border-primary/40 transition-colors flex flex-col justify-between md:col-span-2 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ImageIcon className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                Identity
              </span>
            </div>
            <CardTitle className="text-lg mt-3">{tUi("admin.settings.card_branding_title", currentLanguage) || "Site Identity & Logos"}</CardTitle>
            <CardDescription className="line-clamp-2">
              {tUi("admin.settings.card_branding_desc", currentLanguage) || "Header logos, footer marks, and browser tab favicon for light and dark modes."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Light Logo status */}
              <div className="p-3 bg-white text-slate-900 rounded-xl border border-border/80 space-y-1.5 flex flex-col justify-between min-h-[85px]">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Header • Light</div>
                {settings.logo_header_light ? (
                  <div className="flex items-center justify-center h-8">
                    <img src={settings.logo_header_light} alt="Light Logo" className="max-h-7 max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">Default brand icon</div>
                )}
                <div className="text-[10px] text-slate-400">
                  {settings.logo_header_light ? "Custom logo active" : "Using camera mark"}
                </div>
              </div>

              {/* Dark Logo status */}
              <div className="p-3 bg-[#0b0f19] text-white rounded-xl border border-slate-800 space-y-1.5 flex flex-col justify-between min-h-[85px]">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Header • Dark</div>
                {settings.logo_header_dark ? (
                  <div className="flex items-center justify-center h-8">
                    <img src={settings.logo_header_dark} alt="Dark Logo" className="max-h-7 max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">Inherits Light / Default</div>
                )}
                <div className="text-[10px] text-slate-500">
                  {settings.logo_header_dark ? "Custom dark logo active" : "Using light/default fallback"}
                </div>
              </div>

              {/* Favicon status */}
              <div className="p-3 bg-surface rounded-xl border border-border space-y-1.5 flex flex-col justify-between min-h-[85px]">
                <div className="text-[11px] font-semibold text-muted-text uppercase tracking-wider">Tab Favicon</div>
                <div className="flex items-center gap-2 h-8">
                  {settings.favicon_url ? (
                    <img src={settings.favicon_url} alt="Favicon" className="w-6 h-6 object-contain" />
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <span className="text-xs font-medium text-text truncate">
                    {settings.favicon_url ? "Custom Icon" : "Default Icon"}
                  </span>
                </div>
                <div className="text-[10px] text-muted-text truncate">
                  {settings.favicon_url ? "Synced to browser tabs" : "Built-in SVG icon"}
                </div>
              </div>
            </div>

            <Button 
              variant="secondary" 
              className="w-full text-xs font-medium justify-between group"
              onClick={() => handleOpenModal("branding")}
            >
              <span>{tUi("admin.branding.title", currentLanguage) || "Manage Logos & Favicon"}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        {/* Card 1: General & Studio Identity */}
        <Card className="border-border hover:border-primary/40 transition-colors flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Sliders className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface border border-border text-muted-text">
                {tUi("admin.settings.badge_general", currentLanguage)}
              </span>
            </div>
            <CardTitle className="text-lg mt-3">{tUi("admin.settings.card_general_title", currentLanguage)}</CardTitle>
            <CardDescription className="line-clamp-2">
              {tUi("admin.settings.card_general_desc", currentLanguage)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="p-3 bg-surface rounded-xl border border-border space-y-2">
              <div className="text-xs text-muted-text">{tUi("admin.settings.studio_name", currentLanguage)}</div>
              <div className="font-semibold text-text text-sm truncate">{getStudioNameDisplay()}</div>
            </div>

            <div className="p-3 bg-surface rounded-xl border border-border space-y-2">
              <div className="text-xs text-muted-text">{tUi("admin.settings.active_storage_provider", currentLanguage)}</div>
              <div className="font-semibold text-text text-sm capitalize">{settings.media_provider || "r2 (Cloudflare)"}</div>
            </div>

            <Button 
              variant="secondary" 
              className="w-full text-xs font-medium justify-between group"
              onClick={() => handleOpenModal("general")}
            >
              <span>{tUi("admin.settings.configure_identity", currentLanguage)}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Languages & Translations */}
        <Card className="border-border hover:border-primary/40 transition-colors flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Languages className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface border border-border text-muted-text">
                {tUi("admin.settings.badge_i18n", currentLanguage)}
              </span>
            </div>
            <CardTitle className="text-lg mt-3">{tUi("admin.settings.card_translations_title", currentLanguage)}</CardTitle>
            <CardDescription className="line-clamp-2">
              {tUi("admin.settings.card_translations_desc", currentLanguage)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {(() => {
              const defLang = settings.default_language || "en";
              const enabledList = parsedLanguages.filter((l) => (l.code === defLang ? true : l.enabled !== false));
              const disabledList = parsedLanguages.filter((l) => (l.code !== defLang && l.enabled === false));

              return (
                <div className="p-3 bg-surface rounded-xl border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-text">
                      {tUi("admin.settings.supported_locales_count", currentLanguage, { count: parsedLanguages.length })}
                    </div>
                    <span className="text-[11px] font-semibold text-primary">
                      {enabledList.length} active / {parsedLanguages.length} total
                    </span>
                  </div>

                  {/* Language Badges with Enabled/Disabled styling */}
                  <div className="flex flex-wrap gap-1.5">
                    {parsedLanguages.map((l) => {
                      const isDefault = l.code === defLang;
                      const isEnabled = isDefault || l.enabled !== false;

                      return (
                        <span 
                          key={l.code} 
                          className={`text-xs px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1 ${
                            isDefault
                              ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                              : isEnabled
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-surface text-muted-text/60 border border-border line-through opacity-75"
                          }`}
                          title={isDefault ? "Default Language (Always Active)" : isEnabled ? "Active on Public Site" : "Disabled (Hidden from visitors)"}
                        >
                          <span>{l.name || l.code}</span>
                          <span className="text-[10px] font-mono opacity-80 uppercase">({l.code})</span>
                          {isDefault && <span className="text-[9px] bg-black/20 text-white px-1 rounded ml-0.5">Def</span>}
                        </span>
                      );
                    })}
                  </div>

                  {/* Selector visibility indicator */}
                  <div className="text-[11px] pt-1 text-muted-text border-t border-border/60 flex items-center justify-between">
                    <span>Frontend Switcher:</span>
                    <span className={`font-semibold ${enabledList.length > 1 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {enabledList.length > 1 ? `Visible (${enabledList.length} langs)` : "Hidden (Single lang)"}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="p-3 bg-surface rounded-xl border border-border space-y-1">
              <div className="text-xs text-muted-text">{tUi("admin.settings.default_fallback_locale", currentLanguage)}</div>
              <div className="font-semibold text-text text-sm uppercase flex items-center gap-2">
                <span>{settings.default_language || "en"}</span>
                <span className="text-[10px] font-normal text-muted-text lowercase">(default fallback for missing keys)</span>
              </div>
            </div>

            <Button 
              variant="secondary" 
              className="w-full text-xs font-medium justify-between group"
              onClick={() => handleOpenModal("translations")}
            >
              <span>{tUi("admin.settings.manage_translations", currentLanguage)}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Contact & Inquiries */}
        <Card className="border-border hover:border-primary/40 transition-colors flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface border border-border text-muted-text">
                {tUi("admin.settings.tab_contact", currentLanguage) || "Contact"}
              </span>
            </div>
            <CardTitle className="text-lg mt-3">{tUi("admin.settings.card_contact_title", currentLanguage) || "Contact & Inquiries"}</CardTitle>
            <CardDescription className="line-clamp-2">
              {tUi("admin.settings.card_contact_desc", currentLanguage) || "Configure studio address, phone inquiry fields, and map."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="p-3 bg-surface rounded-xl border border-border space-y-2">
              <div className="text-xs text-muted-text">{tUi("admin.settings.contact_email_phone", currentLanguage)}</div>
              <div className="text-xs font-medium text-text truncate">{settings.contact_email || "contact@spsstudio.com"}</div>
              <div className="text-xs text-muted-text truncate">{settings.contact_phone || "+1 234 567 890"}</div>
            </div>

            <div className="p-3 bg-surface rounded-xl border border-border space-y-1">
              <div className="text-xs text-muted-text">{tUi("admin.settings.form_phone_field", currentLanguage) || "Phone Number Field"}</div>
              <div className="text-xs font-medium text-text flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>
                  {settings.contact_form_show_phone === "0" || settings.contact_form_show_phone === "false" 
                    ? "Hidden" 
                    : (settings.contact_form_require_phone === "1" || settings.contact_form_require_phone === "true" ? "Required" : "Optional")}
                </span>
              </div>
            </div>

            <Button 
              variant="secondary" 
              className="w-full text-xs font-medium justify-between group"
              onClick={() => handleOpenModal("contact")}
            >
              <span>{tUi("admin.settings.edit_settings", currentLanguage) || "Configure Contact"}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        {/* Card 4: SEO & Metadata */}
        <Card className="border-border hover:border-primary/40 transition-colors flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Search className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface border border-border text-muted-text">
                {tUi("admin.settings.badge_seo", currentLanguage)}
              </span>
            </div>
            <CardTitle className="text-lg mt-3">{tUi("admin.settings.card_seo_title", currentLanguage)}</CardTitle>
            <CardDescription className="line-clamp-2">
              {tUi("admin.settings.card_seo_desc", currentLanguage)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="p-3 bg-surface rounded-xl border border-border space-y-2">
              <div className="text-xs text-muted-text">{tUi("admin.settings.global_meta_title", currentLanguage)}</div>
              <div className="font-semibold text-text text-sm truncate">
                {settings.meta_title || `${getStudioNameDisplay()} | Real Estate Photography`}
              </div>
            </div>

            <div className="p-3 bg-surface rounded-xl border border-border space-y-1">
              <div className="text-xs text-muted-text">{tUi("admin.settings.multipage_seo_tags", currentLanguage)}</div>
              <div className="text-xs text-muted-text">{tUi("admin.settings.multipage_seo_desc", currentLanguage)}</div>
            </div>

            <Button 
              variant="secondary" 
              className="w-full text-xs font-medium justify-between group"
              onClick={() => handleOpenModal("seo")}
            >
              <span>{tUi("admin.settings.manage_seo_tags", currentLanguage)}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        {/* Card 5: Resend Email Integration & Deliverability */}
        <Card className="border-border hover:border-primary/40 transition-colors flex flex-col justify-between md:col-span-2 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Mail className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface border border-border text-muted-text">
                {tUi("admin.settings.badge_email", currentLanguage) || "Resend Integration"}
              </span>
            </div>
            <CardTitle className="text-lg mt-3">
              {tUi("admin.settings.card_email_title", currentLanguage) || "Email Service & Delivery (Resend)"}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {tUi("admin.settings.card_email_desc", currentLanguage) || "Configure default sender identity, send diagnostic test emails, and preview branded transactional templates."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-surface rounded-xl border border-border space-y-1">
                <div className="text-xs text-muted-text">Configured Sender</div>
                <div className="text-xs font-medium text-text truncate">
                  {settings.resend_from_name || "SPS Studio"} &lt;{settings.resend_from_email || "onboarding@resend.dev"}&gt;
                </div>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border space-y-1">
                <div className="text-xs text-muted-text">Admin Inquiries Alert</div>
                <div className="text-xs font-medium text-text truncate font-mono">
                  {settings.admin_notification_email || "spsstudiokft@gmail.com"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button 
                variant="secondary" 
                className="flex-1 text-xs font-medium justify-between group"
                onClick={() => handleOpenModal("email")}
              >
                <span>{tUi("admin.settings.manage_email", currentLanguage) || "Configure Email & Sender"}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <Button
                type="button"
                className="text-xs font-medium flex items-center gap-1.5 shadow-xs"
                onClick={() => handleOpenModal("email")}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Test Email</span>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      <Card className="border-border overflow-hidden">
        <CardHeader className="border-b border-border bg-surface/60">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
            <div><CardTitle className="text-lg">Legal Documents & Policies</CardTitle><CardDescription className="mt-1">Create and publish fully formatted privacy, terms, cookie and legal-notice content for every enabled site language.</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <LegalDocumentsManager languages={parsedLanguages} defaultLanguage={settings.default_language || "en"} />
        </CardContent>
      </Card>

      {/* Modal Dialog */}
      <SiteSettingsModal 
        isOpen={isModalOpen}
        initialSettings={settings}
        initialTab={modalTab}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
