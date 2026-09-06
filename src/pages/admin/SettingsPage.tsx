import { useState, useEffect } from "react";
import { SiteSettings, Language } from "../../lib/types";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { AdminFormSkeleton } from "../../components/admin/AdminSkeleton";
import { SiteSettingsModal } from "../../components/admin/SiteSettingsModal";
import { LegalDocumentsManager } from "../../components/admin/LegalDocumentsManager";
import { CookieCatalogManager } from "../../components/admin/CookieCatalogManager";
import { RoleMenuPermissionsManager } from "../../components/admin/RoleMenuPermissionsManager";
import { PublicPushBroadcastCard } from "../../components/admin/PublicPushBroadcastCard";
import { WhatsAppSettingsCard } from "../../components/admin/WhatsAppSettingsCard";
import { OpenSourceSettingsCard } from "../../components/admin/OpenSourceSettingsCard";
import { normalizeAdminRole } from "../../lib/adminPermissions";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useApi } from "../../hooks/useApi";
import { useTheme } from "../../components/ThemeProvider";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { 
  Search, 
  FileText, 
  Sliders, 
  CheckCircle2,
  Languages,
  ArrowRight,
  Mail,
  Phone,
  Send,
  Image as ImageIcon,
  Sparkles,
  X
} from "lucide-react";

const SETTINGS_GROUPS = [
  { id: "site", label: "Weboldal és arculat", description: "Stúdióadatok, logók, nyelvek és alapvető weboldal-beállítások.", icon: Sliders },
  { id: "content", label: "Tartalom és SEO", description: "Nyilvános tartalmak, keresőoptimalizálás és a nyílt forráskódú oldal beállításai.", icon: Search },
  { id: "communication", label: "Kapcsolat és kommunikáció", description: "Kapcsolati űrlap, levélküldés és ügyfélkommunikációs integrációk.", icon: Mail },
  { id: "governance", label: "Jogi és hozzáférési beállítások", description: "Jogi dokumentumok, sütikezelés, fizetés és adminisztrátori jogosultságok.", icon: FileText },
] as const;

function QuickSettingsTile({ title, description, icon: Icon, onClick }: { title: string; description: string; icon: React.ElementType; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="group flex min-h-32 flex-col items-start rounded-2xl border border-border bg-surface/70 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/[0.035] hover:shadow-lg hover:shadow-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="h-4.5 w-4.5" /></span><span className="mt-3 text-sm font-bold text-text">{title}</span><span className="mt-1 text-xs leading-5 text-muted-text">{description}</span><span className="mt-auto pt-3 text-[10px] font-bold uppercase tracking-wider text-primary">Beállítások megnyitása →</span></button>;
}

function SettingsSubcategory({ children }: { children: React.ReactNode; title: string; description: string; onOpen?: () => void }) { return <section>{children}</section>; }

export default function SettingsPage() {
  const { tUi, currentLanguage } = useLanguage();
  usePageTitle(tUi("admin.settings.title", currentLanguage));
  const { fetchApi } = useApi();
  const { setThemeColors } = useTheme();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"general" | "branding" | "translations" | "contact" | "content" | "seo" | "email">("general");
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [activeSettingsGroup, setActiveSettingsGroup] = useState<"site" | "content" | "communication" | "governance">("site");
  const [activeUtilityModal, setActiveUtilityModal] = useState<string | null>(null);
  const [stripeConfig, setStripeConfig] = useState<{ enabled: boolean; test_key_configured: boolean } | null>(null);
  const [stripeSaving, setStripeSaving] = useState(false);

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

  useEffect(() => {
    if (normalizeAdminRole(user?.role) !== "superadmin") return;
    fetchApi("/api/admin/invoices/stripe-settings").then(async (res) => res.ok ? setStripeConfig(await res.json()) : undefined).catch(() => undefined);
  }, [user?.role]);

  const setStripeEnabled = async (enabled: boolean) => {
    setStripeSaving(true);
    try {
      const res = await fetchApi("/api/admin/invoices/stripe-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to update Stripe");
      setStripeConfig((current) => ({ ...(current || { test_key_configured: false }), enabled: data.enabled }));
      setSaveBanner(enabled ? "Stripe tesztfizetés bekapcsolva." : "Stripe fizetés kikapcsolva.");
    } catch (error: any) { setSaveBanner(error.message || "A Stripe beállítás nem menthető."); }
    finally { setStripeSaving(false); }
  };

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
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
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

      <div className="rounded-2xl border border-border bg-surface/70 p-2 shadow-sm backdrop-blur-xl" role="tablist" aria-label="Settings categories">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-4">
        {SETTINGS_GROUPS.map((group) => {
          const Icon = group.icon;
          const active = activeSettingsGroup === group.id;
          return <button key={group.id} type="button" role="tab" aria-selected={active} onClick={() => setActiveSettingsGroup(group.id)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition-colors ${active ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-text hover:bg-background hover:text-text"}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/15" : "bg-background"}`}><Icon className="h-4 w-4" aria-hidden="true" /></span><span>{group.label}</span>
          </button>;
        })}
        </div>
      </div>

      {(() => {
        const group = SETTINGS_GROUPS.find((item) => item.id === activeSettingsGroup)!;
        const Icon = group.icon;
        return <section className="flex flex-col gap-3 rounded-2xl border border-border bg-gradient-to-r from-surface to-primary/[0.035] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" aria-live="polite"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div><h2 className="text-sm font-bold text-text">{group.label}</h2><p className="mt-0.5 max-w-3xl text-xs leading-5 text-muted-text">{group.description}</p></div></div><span className="w-fit rounded-full border border-border bg-background/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-text">Beállítási csoport</span></section>;
      })()}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { group: "site", title: "Általános", description: "Stúdiónév és alap működési beállítások.", icon: Sliders, open: () => handleOpenModal("general") },
          { group: "site", title: "Arculat", description: "Logók, favicon és márkaelemek.", icon: ImageIcon, open: () => handleOpenModal("branding") },
          { group: "site", title: "Nyelvek és fordítások", description: "Nyelvek, alapértelmezések és UI-szövegek.", icon: Languages, open: () => handleOpenModal("translations") },
          { group: "content", title: "Vision tartalom", description: "A nyilvános küldetés és márkaüzenet.", icon: FileText, open: () => handleOpenModal("content") },
          { group: "content", title: "SEO és metaadatok", description: "Keresőmegjelenés és oldalszintű címkék.", icon: Search, open: () => handleOpenModal("seo") },
          { group: "content", title: "Open Source", description: "A publikus GitHub-repozitóriumok oldala.", icon: Sparkles, open: () => setActiveUtilityModal("open-source"), superadmin: true },
          { group: "communication", title: "Kapcsolati űrlap", description: "Elérhetőségek, térkép és űrlapmezők.", icon: Phone, open: () => handleOpenModal("contact") },
          { group: "communication", title: "E-mail küldés", description: "Resend feladó, értesítési cím és tesztlevél.", icon: Mail, open: () => handleOpenModal("email") },
          { group: "communication", title: "WhatsApp chat", description: "Kapcsolható publikus chat-buborék.", icon: Send, open: () => setActiveUtilityModal("whatsapp"), superadmin: true },
          { group: "governance", title: "Jogi dokumentumok", description: "Adatkezelés, feltételek és jogi nyilatkozatok.", icon: FileText, open: () => setActiveUtilityModal("legal") },
          { group: "governance", title: "Sütikezelés", description: "Cookie-katalógus és hozzájárulási adatok.", icon: CheckCircle2, open: () => setActiveUtilityModal("cookies") },
          { group: "governance", title: "Jogosultságok", description: "Admin szerepkörök és elérhető menüpontok.", icon: Sliders, open: () => setActiveUtilityModal("roles"), superadmin: true },
          { group: "governance", title: "Stripe tesztfizetés", description: "Sandbox számlafizetés be- és kikapcsolása.", icon: Sparkles, open: () => setActiveUtilityModal("stripe"), superadmin: true },
          { group: "governance", title: "Nyilvános értesítés", description: "Karbantartási és incidens push üzenetek.", icon: Send, open: () => setActiveUtilityModal("push"), superadmin: true },
        ].filter(item => item.group === activeSettingsGroup && (!item.superadmin || normalizeAdminRole(user?.role) === "superadmin")).map(item => <QuickSettingsTile key={item.title} title={item.title} description={item.description} icon={item.icon} onClick={item.open} />)}
      </div>

      {/* Main Settings Overview Bento Grid */}
      <div className="hidden grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
        
        {/* Card: Site Identity & Branding (NEW) */}
        <Card className={`${activeSettingsGroup === "site" ? "" : "!hidden"} border-border transition-colors hover:border-primary/40 md:col-span-2 xl:col-span-6`}>
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
          <CardContent className="pt-0"><SettingsSubcategory title="Arculati eszközök" description="Fejléc-, sötét módú és böngészőikon-beállítások. A módosítás külön szerkesztőmodalban nyílik meg." onOpen={() => handleOpenModal("branding")}>
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
          </SettingsSubcategory></CardContent>
        </Card>

        {/* Card 1: General & Studio Identity */}
        <Card className={`${activeSettingsGroup === "site" ? "" : "!hidden"} border-border transition-colors hover:border-primary/40 xl:col-span-3`}>
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
          <CardContent className="pt-0"><SettingsSubcategory title="Stúdióprofil és infrastruktúra" description="A nyilvános stúdiónév és a jelenleg használt médiatároló áttekintése." onOpen={() => handleOpenModal("general")}>
            <div className="rounded-xl border border-border bg-surface/70 p-3 shadow-sm transition-colors hover:border-primary/25 space-y-2">
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
          </SettingsSubcategory></CardContent>
        </Card>

        {/* Card 2: Languages & Translations */}
        <Card className={`${activeSettingsGroup === "site" ? "" : "!hidden"} border-border transition-colors hover:border-primary/40 xl:col-span-3`}>
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
          <CardContent className="pt-0"><SettingsSubcategory title="Nyelvi működés" description="Aktív nyelvek, alapértelmezett tartalmi nyelv és fordítási beállítások." onOpen={() => handleOpenModal("translations")}>
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

            <div className="rounded-xl border border-border bg-surface/70 p-3 shadow-sm transition-colors hover:border-primary/25 space-y-1">
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
          </SettingsSubcategory></CardContent>
        </Card>

        {/* Card 3: Contact & Inquiries */}
        <Card className={`${activeSettingsGroup === "communication" ? "" : "!hidden"} border-border transition-colors hover:border-primary/40 xl:col-span-4`}>
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
          <CardContent className="pt-0"><SettingsSubcategory title="Kapcsolati adatok és űrlap" description="Az ügyfélkapcsolati csatornák és az ajánlatkérő űrlap mezőinek kezelése." onOpen={() => handleOpenModal("contact")}>
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
          </SettingsSubcategory></CardContent>
        </Card>

        {/* Card 4: SEO & Metadata */}
        <Card className={`${activeSettingsGroup === "content" ? "" : "!hidden"} border-border transition-colors hover:border-primary/40 xl:col-span-6`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface border border-border text-muted-text">
                {tUi("admin.settings.tab_content", currentLanguage) || "Content"}
              </span>
            </div>
            <CardTitle className="text-lg mt-3">{tUi("admin.settings.card_vision_title", currentLanguage) || "Our Vision"}</CardTitle>
            <CardDescription className="line-clamp-2">
              {tUi("admin.settings.card_vision_desc", currentLanguage) || "Edit the public vision headline and supporting studio statement in every enabled language."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0"><SettingsSubcategory title="Küldetés és márkaüzenet" description="A nyilvános Vision-szekció többnyelvű fő üzenete és kiegészítő szövegei." onOpen={() => handleOpenModal("content")}>
            <div className="rounded-xl border border-border bg-surface/70 p-3 shadow-sm transition-colors hover:border-primary/25 space-y-1.5">
              <div className="text-xs text-muted-text">{tUi("admin.settings.vision_headline", currentLanguage) || "Vision Headline"}</div>
              <div className="font-semibold text-text text-sm line-clamp-2">
                {settings.vision_headline ? (tUi("admin.settings.multilingual_content_configured", currentLanguage) || "Multilingual content configured") : (tUi("admin.settings.using_default_copy", currentLanguage) || "Using default website copy")}
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full text-xs font-medium justify-between group"
              onClick={() => handleOpenModal("content")}
            >
              <span>{tUi("admin.settings.edit_vision", currentLanguage) || "Edit Vision Section"}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </SettingsSubcategory></CardContent>
        </Card>

        {/* Card 4: SEO & Metadata */}
        <Card className={`${activeSettingsGroup === "content" ? "" : "!hidden"} border-border transition-colors hover:border-primary/40 xl:col-span-6`}>
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
          <CardContent className="pt-0"><SettingsSubcategory title="Keresőmegjelenés" description="Globális metaadatok, oldalszintű SEO-címkék és keresőoptimalizálási beállítások." onOpen={() => handleOpenModal("seo")}>
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
          </SettingsSubcategory></CardContent>
        </Card>

        {/* Card 5: Resend Email Integration & Deliverability */}
        <Card className={`${activeSettingsGroup === "communication" ? "" : "!hidden"} border-border transition-colors hover:border-primary/40 md:col-span-2 xl:col-span-8`}>
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
          <CardContent className="pt-0"><SettingsSubcategory title="Küldőidentitás és értesítések" description="Resend feladó, admin értesítési cím és tesztelhető levélkézbesítési beállítások." onOpen={() => handleOpenModal("email")}>
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
          </SettingsSubcategory></CardContent>
        </Card>

      </div>

      {false && <div>
      <Card className={`${activeSettingsGroup === "governance" ? "" : "!hidden"} border-border overflow-hidden`}>
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

      <Card className={`${activeSettingsGroup === "governance" ? "" : "!hidden"} border-border overflow-hidden`}>
        <CardContent className="p-5 sm:p-6"><CookieCatalogManager /></CardContent>
      </Card>

      {normalizeAdminRole(user?.role) === "superadmin" && <Card className={`${activeSettingsGroup === "governance" ? "" : "!hidden"} border-border overflow-hidden`}>
        <CardHeader className="border-b border-border bg-surface/60"><CardTitle className="text-lg">Szerepkörök és adminpanel-jogosultságok</CardTitle><CardDescription className="mt-1">Válassza ki, hogy az egyes szerepkörök mely adminpanel-menüket és oldalakat érhetik el.</CardDescription></CardHeader>
        <CardContent className="p-5 sm:p-6"><RoleMenuPermissionsManager /></CardContent>
      </Card>}

      {normalizeAdminRole(user?.role) === "superadmin" && <Card className={`${activeSettingsGroup === "governance" ? "" : "!hidden"} border-border overflow-hidden`}>
        <CardHeader className="border-b border-border bg-surface/60"><CardTitle className="text-lg">Stripe számlafizetés</CardTitle><CardDescription className="mt-1">Kizárólag Stripe tesztüzem. A titkos API-kulcs a környezeti beállításban marad.</CardDescription></CardHeader>
        <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div><p className={`text-sm font-semibold ${stripeConfig?.enabled ? "text-emerald-600" : "text-muted-text"}`}>{stripeConfig?.enabled ? "Tesztfizetés aktív" : "Tesztfizetés kikapcsolva"}</p><p className="text-xs text-muted-text mt-1">{stripeConfig?.test_key_configured ? "STRIPE_SECRET_KEY tesztkulcs beállítva." : "Előbb add meg a STRIPE_SECRET_KEY=sk_test_... értéket a környezeti változók között."}</p></div>
          <Button type="button" variant={stripeConfig?.enabled ? "secondary" : "primary"} disabled={stripeSaving || (!stripeConfig?.test_key_configured && !stripeConfig?.enabled)} onClick={() => setStripeEnabled(!stripeConfig?.enabled)}>{stripeSaving ? "Mentés…" : stripeConfig?.enabled ? "Stripe kikapcsolása" : "Stripe tesztfizetés bekapcsolása"}</Button>
        </CardContent>
      </Card>}

      {normalizeAdminRole(user?.role) === "superadmin" && <div className={activeSettingsGroup === "governance" ? "" : "!hidden"}><PublicPushBroadcastCard /></div>}

      {normalizeAdminRole(user?.role) === "superadmin" && <div className={activeSettingsGroup === "communication" ? "" : "!hidden"}><WhatsAppSettingsCard /></div>}

      {normalizeAdminRole(user?.role) === "superadmin" && <div className={activeSettingsGroup === "content" ? "" : "!hidden"}><OpenSourceSettingsCard /></div>}
      </div>}

      {activeUtilityModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" onMouseDown={event => event.target === event.currentTarget && setActiveUtilityModal(null)}><div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"><div className="flex items-center justify-between border-b border-border bg-surface/70 px-5 py-4"><div><h2 className="text-base font-bold text-text">{({ "open-source": "Open Source", whatsapp: "WhatsApp chat", legal: "Jogi dokumentumok", cookies: "Sütikezelés", roles: "Jogosultságok", stripe: "Stripe tesztfizetés", push: "Nyilvános értesítés" } as Record<string, string>)[activeUtilityModal]}</h2><p className="mt-0.5 text-xs text-muted-text">A beállításokat itt szerkesztheted és mentheted.</p></div><button type="button" onClick={() => setActiveUtilityModal(null)} className="rounded-lg p-2 text-muted-text hover:bg-background hover:text-text" aria-label="Modal bezárása"><X className="h-5 w-5" /></button></div><div className="min-h-0 overflow-y-auto p-4 sm:p-5">{activeUtilityModal === "open-source" && <OpenSourceSettingsCard />}{activeUtilityModal === "whatsapp" && <WhatsAppSettingsCard />}{activeUtilityModal === "legal" && <LegalDocumentsManager languages={parsedLanguages} defaultLanguage={settings.default_language || "en"} />}{activeUtilityModal === "cookies" && <CookieCatalogManager />}{activeUtilityModal === "roles" && normalizeAdminRole(user?.role) === "superadmin" && <RoleMenuPermissionsManager />}{activeUtilityModal === "push" && normalizeAdminRole(user?.role) === "superadmin" && <PublicPushBroadcastCard />}{activeUtilityModal === "stripe" && normalizeAdminRole(user?.role) === "superadmin" && <div className="rounded-xl border border-border bg-surface/60 p-5"><p className={`text-sm font-semibold ${stripeConfig?.enabled ? "text-emerald-600" : "text-muted-text"}`}>{stripeConfig?.enabled ? "Tesztfizetés aktív" : "Tesztfizetés kikapcsolva"}</p><p className="mt-1 text-xs text-muted-text">{stripeConfig?.test_key_configured ? "STRIPE_SECRET_KEY tesztkulcs beállítva." : "Előbb add meg a STRIPE_SECRET_KEY=sk_test_... értéket a környezeti változók között."}</p><Button type="button" className="mt-4" variant={stripeConfig?.enabled ? "secondary" : "primary"} disabled={stripeSaving || (!stripeConfig?.test_key_configured && !stripeConfig?.enabled)} onClick={() => setStripeEnabled(!stripeConfig?.enabled)}>{stripeSaving ? "Mentés…" : stripeConfig?.enabled ? "Stripe kikapcsolása" : "Stripe tesztfizetés bekapcsolása"}</Button></div>}</div></div></div>}

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
