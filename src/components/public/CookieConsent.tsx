import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cookie, FileText, Settings2, ShieldCheck, X } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { tUi } from "../../lib/i18n";
import { LegalDocumentModal } from "./LegalDocumentModal";

type CookieConsentStatus = "accepted" | "rejected" | null;
type CookiePreferences = { necessary: true; preferences: boolean; analytics: boolean; marketing: boolean };

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
    const syncConsent = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = readStoredConsent(); setStatus(next.status); setPreferences(next.preferences); setIsBannerOpen(next.status === null);
    };
    window.addEventListener("storage", syncConsent);
    return () => window.removeEventListener("storage", syncConsent);
  }, []);

  const saveConsent = useCallback((next: Exclude<CookieConsentStatus, null>, nextPreferences: CookiePreferences) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, status: next, preferences: nextPreferences, updatedAt: new Date().toISOString() }));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY); setStatus(next); setPreferences(nextPreferences);
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
      <CookieConsentBanner isOpen={isBannerOpen} onClose={() => status !== null && setIsBannerOpen(false)} />
    </CookieConsentContext.Provider>
  );
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
  const [cookieDocuments, setCookieDocuments] = useState<Record<string, { title: string; content: string; updated_at?: string }>>({});
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
                  <button type="button" onClick={() => setShowDetails((open) => !open)} className="mt-2 text-xs font-semibold text-primary hover:underline">Süti-beállítások testreszabása</button>
                  <button type="button" onClick={() => setIsPolicyOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline underline-offset-4">
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                    {tr("legal.cookie_policy")}
                  </button>
                </div>
              </div>

              {showDetails && <div className="absolute inset-x-0 bottom-0 z-20 bg-background/95 border-t border-border p-4 sm:p-5"><p className="text-sm font-semibold text-text mb-2">Engedélyek kezelése</p><div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-text">{([['necessary', 'Szükséges (mindig aktív)'], ['preferences', 'Beállítások'], ['analytics', 'Statisztika'], ['marketing', 'Marketing']] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2"><span>{label}</span><input type="checkbox" disabled={key === 'necessary'} checked={preferences[key]} onChange={(event) => savePreferences({ ...preferences, [key]: event.target.checked })} /></label>)}</div><button type="button" onClick={() => { savePreferences(preferences); setShowDetails(false); }} className="mt-3 aero-cookie-primary px-4 py-2 rounded-xl text-sm font-semibold">Beállítások mentése</button></div>}

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
