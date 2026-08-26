import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cookie, FileText, Settings2, ShieldCheck, X } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { tUi } from "../../lib/i18n";
import { LegalDocumentModal } from "./LegalDocumentModal";
import { applyConsentPreferences, loadConsentScript } from "../../lib/consentStorage";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

type CookieConsentStatus = "accepted" | "rejected" | null;
type CookiePreferences = { necessary: true; preferences: boolean; analytics: boolean; marketing: boolean };
type CookieCatalogItem = { id: string; name: string; category: "necessary" | "preferences" | "analytics" | "marketing"; consent_scope?: "essential" | "necessary" | "all"; storage: string; provider: string; duration: string; purpose: string; active: boolean; required: boolean };

interface CookieConsentContextValue {
  status: CookieConsentStatus;
  hasAcceptedCookies: boolean;
  acceptCookies: () => void;
  rejectOptionalCookies: () => void;
  preferences: CookiePreferences;
  savePreferences: (preferences: CookiePreferences) => void;
  openPreferences: () => void;
}

const STORAGE_KEY = "sps_cookie_consent_v2";
const LEGACY_STORAGE_KEY = "sps_cookie_consent_v1";
const REJECTED_PREFERENCES: CookiePreferences = { necessary: true, preferences: false, analytics: false, marketing: false };
const ACCEPTED_PREFERENCES: CookiePreferences = { necessary: true, preferences: true, analytics: true, marketing: true };
const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

function readStoredConsent(): { status: CookieConsentStatus; preferences: CookiePreferences } {
  if (typeof window === "undefined") return { status: null, preferences: REJECTED_PREFERENCES };
  const stored = window.localStorage.getItem(STORAGE_KEY);
  try { const parsed = JSON.parse(stored || ""); if (parsed?.preferences) return { status: parsed.status === "accepted" ? "accepted" : "rejected", preferences: { ...REJECTED_PREFERENCES, ...parsed.preferences, necessary: true } }; } catch {}
  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  return legacy === "accepted" ? { status: "accepted", preferences: ACCEPTED_PREFERENCES } : legacy === "rejected" ? { status: "rejected", preferences: REJECTED_PREFERENCES } : { status: null, preferences: REJECTED_PREFERENCES };
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<CookieConsentStatus>(() => readStoredConsent().status);
  const [preferences, setPreferences] = useState<CookiePreferences>(() => readStoredConsent().preferences);
  const [isBannerOpen, setIsBannerOpen] = useState(() => readStoredConsent().status === null);

  useEffect(() => {
    if (!preferences.analytics) return;
    const analyticsWindow = window as typeof window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; __spsGoogleAnalyticsConfigured?: boolean };
    analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
    analyticsWindow.gtag = analyticsWindow.gtag || ((...args: unknown[]) => analyticsWindow.dataLayer?.push(args));
    if (!analyticsWindow.__spsGoogleAnalyticsConfigured) {
      analyticsWindow.gtag("js", new Date());
      analyticsWindow.gtag("config", "G-YFCQ9YBYXT");
      analyticsWindow.__spsGoogleAnalyticsConfigured = true;
    }
    loadConsentScript("sps-google-analytics", "https://www.googletagmanager.com/gtag/js?id=G-YFCQ9YBYXT", "analytics");
    loadConsentScript("sps-ahrefs-analytics", "https://analytics.ahrefs.com/analytics.js", "analytics", { "data-key": "/YeklFWRldYIGlIj6HUmKA" });
  }, [preferences.analytics]);

  useEffect(() => {
    const syncConsent = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = readStoredConsent(); setStatus(next.status); setPreferences(next.preferences); setIsBannerOpen(next.status === null);
    };
    window.addEventListener("storage", syncConsent);
    return () => window.removeEventListener("storage", syncConsent);
  }, []);

  const saveConsent = useCallback((next: Exclude<CookieConsentStatus, null>, nextPreferences: CookiePreferences) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, status: next, preferences: nextPreferences, updatedAt: new Date().toISOString() }));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY); applyConsentPreferences(nextPreferences); setStatus(next); setPreferences(nextPreferences);
    setIsBannerOpen(false);
  }, []);

  const value = useMemo<CookieConsentContextValue>(() => ({
    status,
    hasAcceptedCookies: status !== null,
    acceptCookies: () => saveConsent("accepted", ACCEPTED_PREFERENCES),
    rejectOptionalCookies: () => saveConsent("rejected", REJECTED_PREFERENCES),
    preferences,
    savePreferences: (next) => saveConsent(next.preferences || next.analytics || next.marketing ? "accepted" : "rejected", { ...next, necessary: true }),
    openPreferences: () => setIsBannerOpen(true),
  }), [status, preferences, saveConsent]);

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      <VercelObservability />
      <CookieConsentBanner isOpen={isBannerOpen} onClose={() => status !== null && setIsBannerOpen(false)} />
    </CookieConsentContext.Provider>
  );
}

function VercelObservability() {
  const { preferences } = useCookieConsent();
  if (!preferences.analytics) return null;
  return <><Analytics /><SpeedInsights /></>;
}

export function useCookieConsent() {
  const value = useContext(CookieConsentContext);
  if (!value) throw new Error("useCookieConsent must be used within CookieConsentProvider");
  return value;
}

function CookieConsentBanner({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currentLang, defaultLang } = useLanguage();
  const { status, preferences, savePreferences, acceptCookies, rejectOptionalCookies, openPreferences } = useCookieConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [draftPreferences, setDraftPreferences] = useState<CookiePreferences>(preferences);
  const [cookieDocuments, setCookieDocuments] = useState<Record<string, { title: string; content: string; updated_at?: string }>>({});
  const [cookieCatalog, setCookieCatalog] = useState<CookieCatalogItem[]>([]);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const tr = (key: string) => tUi(key, currentLang, undefined, defaultLang);
  const bannerBlurStyle: React.CSSProperties = {
    backdropFilter: "blur(26px) saturate(165%)",
    WebkitBackdropFilter: "blur(26px) saturate(165%)",
  };

  useEffect(() => {
    fetch("/api/public/legal-documents")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data?.cookies && setCookieDocuments(data.cookies))
      .catch(() => {});
    fetch("/api/public/cookie-catalog")
      .then((response) => response.ok ? response.json() : [])
      .then((data) => Array.isArray(data) && setCookieCatalog(data))
      .catch(() => {});
  }, []);

  const cookiePolicy = cookieDocuments[currentLang]
    || cookieDocuments[defaultLang]
    || cookieDocuments.en
    || Object.values(cookieDocuments)[0];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            role="dialog"
            aria-modal="false"
            aria-labelledby="cookie-consent-title"
            initial={{ opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="aero-cookie-banner fixed z-[95] left-4 right-4 bottom-4 sm:left-6 sm:right-6 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-[min(920px,calc(100vw-3rem))] rounded-3xl overflow-hidden"
            style={bannerBlurStyle}
          >
            <div className="aero-cookie-shine" aria-hidden="true" />
            <div className="relative z-10 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5">
              <div className="flex gap-4 min-w-0 flex-1">
                <div className="aero-cookie-icon w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center">
                  <Cookie className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 pr-8">
                    <h2 id="cookie-consent-title" className="text-base sm:text-lg font-bold text-text">{tr("cookie_banner.title")}</h2>
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-muted-text leading-relaxed mt-1.5">{tr("cookie_banner.description")}</p>
                  <p className="text-xs text-muted-text/80 mt-2">{tr("cookie_banner.necessary_note")}</p>
                  <button type="button" onClick={() => { setDraftPreferences(preferences); setShowDetails(true); }} className="mt-2 text-xs font-semibold text-primary hover:underline">Süti-beállítások testreszabása</button>
                  <button type="button" onClick={() => setIsPolicyOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline underline-offset-4">
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                    {tr("legal.cookie_policy")}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2.5 shrink-0">
                <button type="button" onClick={rejectOptionalCookies} className="aero-cookie-secondary px-4 py-2.5 rounded-xl text-sm font-semibold">
                  {tr("cookie_banner.necessary_only")}
                </button>
                <button type="button" onClick={acceptCookies} className="aero-cookie-primary px-5 py-2.5 rounded-xl text-sm font-bold">
                  {tr("cookie_banner.accept_all")}
                </button>
              </div>

              {status !== null && (
                <button type="button" onClick={onClose} className="absolute top-3 right-3 p-2 rounded-xl text-muted-text hover:text-text" aria-label={tr("cookie_banner.close")}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetails && <motion.div role="dialog" aria-modal="true" aria-labelledby="cookie-preferences-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-950/55 p-4" onClick={() => setShowDetails(false)}>
          <motion.div initial={{ opacity: 0, y: 22, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .98 }} className="aero-cookie-preferences-modal w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl p-5 sm:p-6 shadow-2xl" style={bannerBlurStyle} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><h2 id="cookie-preferences-title" className="text-lg font-bold text-text">Süti-beállítások</h2><p className="mt-1 text-sm text-muted-text">Válaszd ki, mely opcionális tárolást engedélyezed.</p></div><button type="button" onClick={() => setShowDetails(false)} className="p-2 rounded-xl text-muted-text hover:bg-surface hover:text-text" aria-label="Bezárás"><X className="w-5 h-5" /></button></div>
            <div className="mt-5 grid sm:grid-cols-2 gap-2 text-sm text-muted-text">{([['necessary', 'Szükséges (mindig aktív)'], ['preferences', 'Beállítások'], ['analytics', 'Statisztika'], ['marketing', 'Marketing']] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-xl bg-surface px-3 py-3"><span>{label}</span><input type="checkbox" disabled={key === "necessary"} checked={draftPreferences[key]} onChange={(event) => setDraftPreferences((current) => ({ ...current, [key]: event.target.checked }))} /></label>)}</div>
            <div className="mt-5 space-y-2"><p className="text-sm font-semibold text-text">Használt sütik és böngészőtárhelyek</p>{cookieCatalog.length ? cookieCatalog.map((item) => <div key={item.id} className="rounded-xl border border-border bg-surface p-3 text-xs text-muted-text"><div className="flex flex-wrap items-center gap-2"><strong className="text-text">{item.name}</strong><span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{item.storage}</span><span className="rounded-full bg-surface-hover px-2 py-0.5">{item.consent_scope === "essential" ? "Nélkülözhetetlen" : item.consent_scope === "necessary" ? "Csak szükséges" : "Teljes elfogadás"}</span></div><p className="mt-1">{item.purpose}</p><p className="mt-1 opacity-80">{item.provider} · {item.duration} · {item.required ? "szükséges" : "választható"}</p></div>) : <p className="text-xs text-muted-text">A süti-nyilvántartás hamarosan betöltődik.</p>}</div>
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowDetails(false)} className="aero-cookie-secondary px-4 py-2.5 rounded-xl text-sm font-semibold">Mégse</button><button type="button" onClick={() => { savePreferences(draftPreferences); setShowDetails(false); }} className="aero-cookie-primary px-4 py-2.5 rounded-xl text-sm font-semibold">Beállítások mentése</button></div>
          </motion.div>
        </motion.div>}
      </AnimatePresence>

      {!isOpen && (
        <button type="button" onClick={openPreferences} style={bannerBlurStyle} className="aero-cookie-settings fixed z-[80] left-4 bottom-4 sm:left-6 sm:bottom-6 w-11 h-11 rounded-2xl flex items-center justify-center" aria-label={tr("cookie_banner.settings")} title={tr("cookie_banner.settings")}>
          <Settings2 className="w-4.5 h-4.5" />
        </button>
      )}
      <LegalDocumentModal
        open={isPolicyOpen}
        title={cookiePolicy?.title || tr("legal.cookie_policy")}
        content={cookiePolicy?.content || ""}
        updatedAt={cookiePolicy?.updated_at}
        language={currentLang}
        defaultLanguage={defaultLang}
        onClose={() => setIsPolicyOpen(false)}
      />
    </>
  );
}
