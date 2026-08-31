import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Language, SiteSettings } from "../lib/types";
import { 
  t as translateDynamic, 
  tUi as translateUi, 
  setCustomTranslations as syncGlobalCustomTranslations,
  loadTranslationsFromDatabase,
  invalidateClientTranslationCache
} from "../lib/i18n";
import { defaultLocales } from "../lib/translations";
import { updateDocumentFavicon } from "../lib/favicon";
import { hasConsent } from "../lib/consentStorage";

export type LanguageContextType = {
  currentLang: string;
  currentLanguage: string; // Alias for convenience
  setLang: (lang: string) => void;
  setLanguage: (lang: string) => void; // Alias for convenience
  supportedLangs: Language[];
  enabledLangs: Language[]; // Only languages where enabled !== false
  isLanguageEnabled: (code: string) => boolean;
  defaultLang: string;
  defaultLanguage: string; // Alias for convenience
  t: (
    value: string | object | undefined | null,
    arg1?: string | Record<string, any>,
    arg2?: string | Record<string, any>,
    arg3?: string
  ) => string;
  tUi: (
    key: string,
    arg1?: string | Record<string, any>,
    arg2?: string | Record<string, any>,
    arg3?: string
  ) => string;
  customTranslations: Record<string, Record<string, string>>;
  setCustomTranslationsMap: (translations: Record<string, Record<string, string>>) => void;
  reloadSettings: () => Promise<void>;
  reloadTranslations: () => Promise<void>;
  translationsReady: boolean;
};

const defaultSupportedLangs: Language[] = [
  { code: "en", name: "English", enabled: true },
  { code: "hu", name: "Magyar", enabled: true },
  { code: "de", name: "Deutsch", enabled: true },
  { code: "es", name: "Español", enabled: true },
  { code: "fr", name: "Français", enabled: true },
];

const normalizeLanguageCode = (value: unknown): string => String(value ?? "").trim().toLowerCase();

const LanguageContext = createContext<LanguageContextType>({
  currentLang: "en",
  currentLanguage: "en",
  setLang: () => {},
  setLanguage: () => {},
  supportedLangs: defaultSupportedLangs,
  enabledLangs: defaultSupportedLangs,
  isLanguageEnabled: () => true,
  defaultLang: "en",
  defaultLanguage: "en",
  t: (val) => (typeof val === "string" ? val : ""),
  tUi: (key) => key,
  customTranslations: {},
  setCustomTranslationsMap: () => {},
  reloadSettings: async () => {},
  reloadTranslations: async () => {},
  translationsReady: true,
});

export function LanguageProvider({ 
  children, 
  settings: initialSettings 
}: { 
  children: React.ReactNode; 
  settings?: SiteSettings;
}) {
  const [supportedLangs, setSupportedLangs] = useState<Language[]>(defaultSupportedLangs);
  const [defaultLang, setDefaultLang] = useState<string>("en");
  const [translationsReady, setTranslationsReady] = useState<boolean>(false);
  const [currentLang, setCurrentLang] = useState<string>(() => {
    try {
      return hasConsent("preferences") ? normalizeLanguageCode(localStorage.getItem("site_lang")) || "en" : "en";
    } catch {
      return "en";
    }
  });
  const [customTranslations, setCustomTranslationsState] = useState<Record<string, Record<string, string>>>({});
  const [, setRenderTrigger] = useState(0);

  // Helper to parse settings payload
  const parseSettingsPayload = useCallback((settings: SiteSettings | undefined) => {
    if (!settings) return;

    let targetDefLang = defaultLang;
    if (settings.default_language) {
      targetDefLang = normalizeLanguageCode(settings.default_language) || "en";
      setDefaultLang(targetDefLang);
    }

    // Supported languages
    if (settings.site_languages) {
      try {
        const parsed = JSON.parse(settings.site_languages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized: Language[] = parsed.map((l: any) => {
            const code = normalizeLanguageCode(l.code);
            return {
            code,
            name: String(l.name || l.code || "").trim(),
            // Default language is ALWAYS enabled; for other languages, default to true if undefined
            enabled: code === targetDefLang ? true : (l.enabled !== false),
            flag: l.flag,
            nativeName: l.nativeName,
          }; }).filter(l => Boolean(l.code));

          if (normalized.length > 0) {
            setSupportedLangs(normalized);
          }
        }
      } catch (e) {
        console.error("Failed to parse site_languages:", e);
      }
    }

    // Favicon update
    if (settings.favicon_url !== undefined) {
      updateDocumentFavicon(settings.favicon_url);
    }

    // Custom translations override from settings table
    if (settings.custom_translations) {
      try {
        const parsedTranslations = typeof settings.custom_translations === "string"
          ? JSON.parse(settings.custom_translations)
          : settings.custom_translations;
        
        if (typeof parsedTranslations === "object" && parsedTranslations !== null) {
          setCustomTranslationsState(parsedTranslations);
          syncGlobalCustomTranslations(parsedTranslations);
        }
      } catch (e) {
        console.error("Failed to parse custom_translations:", e);
      }
    }
  }, [defaultLang]);

  const reloadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/public/settings");
      if (res.ok) {
        const data = await res.json();
        parseSettingsPayload(data);
      }
    } catch (err) {
      console.error("Failed to fetch public settings in LanguageProvider", err);
    }
  }, [parseSettingsPayload]);

  const reloadTranslations = useCallback(async () => {
    try {
      invalidateClientTranslationCache();
      await loadTranslationsFromDatabase();
      setTranslationsReady(true);
      setRenderTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to reload translations from database", err);
    }
  }, []);

  // Initial load: fetch settings and database translations
  useEffect(() => {
    if (initialSettings) {
      parseSettingsPayload(initialSettings);
    } else {
      reloadSettings();
    }

    // Load database translations asynchronously
    loadTranslationsFromDatabase()
      .then(() => {
        setTranslationsReady(true);
        setRenderTrigger((prev) => prev + 1);
      })
      .catch((err) => {
        console.warn("Using fallback translation dictionary:", err);
        setTranslationsReady(true);
      });
  }, [initialSettings, parseSettingsPayload, reloadSettings]);

  // Compute enabled languages list
  const enabledLangs = supportedLangs.filter((l) => l.enabled !== false);

  const isLanguageEnabled = useCallback((code: string): boolean => {
    const found = supportedLangs.find((l) => l.code === code);
    return found ? (found.enabled !== false) : false;
  }, [supportedLangs]);

  // Sync active language selection with localStorage and HTML attribute,
  // falling back gracefully if current language is disabled or not supported
  useEffect(() => {
    const saved = hasConsent("preferences") ? normalizeLanguageCode(localStorage.getItem("site_lang")) : null;
    const activeEnabled = supportedLangs.filter((l) => l.enabled !== false);
    
    // Check if the saved language is currently enabled
    if (saved && activeEnabled.some((l) => l.code === saved)) {
      if (currentLang !== saved) setCurrentLang(saved);
      document.documentElement.lang = saved;
    } 
    // Otherwise fallback to default language if enabled
    else if (defaultLang && activeEnabled.some((l) => l.code === defaultLang)) {
      if (currentLang !== defaultLang) setCurrentLang(defaultLang);
      document.documentElement.lang = defaultLang;
      try {
        if (hasConsent("preferences")) localStorage.setItem("site_lang", defaultLang);
      } catch {}
    } 
    // Otherwise fallback to the first enabled language
    else if (activeEnabled.length > 0) {
      const firstEnabled = activeEnabled[0].code;
      if (currentLang !== firstEnabled) setCurrentLang(firstEnabled);
      document.documentElement.lang = firstEnabled;
      try {
        if (hasConsent("preferences")) localStorage.setItem("site_lang", firstEnabled);
      } catch {}
    }
    // As last resort, defaultLang or "en"
    else {
      const fallback = defaultLang || "en";
      if (currentLang !== fallback) setCurrentLang(fallback);
      document.documentElement.lang = fallback;
    }
  }, [supportedLangs, defaultLang, currentLang]);

  const setLang = useCallback((lang: string) => {
    const normalized = normalizeLanguageCode(lang) || "en";
    setCurrentLang(normalized);
    try {
      if (hasConsent("preferences")) localStorage.setItem("site_lang", normalized);
    } catch {}
    document.documentElement.lang = normalized;
  }, []);

  const setCustomTranslationsMap = useCallback((translations: Record<string, Record<string, string>>) => {
    setCustomTranslationsState(translations);
    syncGlobalCustomTranslations(translations);
    setRenderTrigger((prev) => prev + 1);
  }, []);

  // Bound translation helpers
  const t = useCallback(
    (
      value: string | object | undefined | null,
      arg1?: string | Record<string, any>,
      arg2?: string | Record<string, any>,
      arg3?: string
    ) => {
      let activeLang = currentLang;
      let params: Record<string, any> | undefined;
      let fallbackLang = defaultLang;

      if (typeof arg1 === "string") {
        activeLang = arg1 || currentLang;
        if (typeof arg2 === "object" && arg2 !== null) {
          params = arg2;
        } else if (typeof arg2 === "string") {
          fallbackLang = arg2;
        }
        if (typeof arg3 === "string") {
          fallbackLang = arg3;
        }
      } else if (typeof arg1 === "object" && arg1 !== null) {
        params = arg1;
        if (typeof arg2 === "string") {
          activeLang = arg2 || currentLang;
        }
        if (typeof arg3 === "string") {
          fallbackLang = arg3;
        }
      }

      return translateDynamic(value, activeLang, params, fallbackLang);
    },
    [currentLang, defaultLang]
  );

  const tUi = useCallback(
    (
      key: string,
      arg1?: string | Record<string, any>,
      arg2?: string | Record<string, any>,
      arg3?: string
    ) => {
      let activeLang = currentLang;
      let params: Record<string, any> | undefined;
      let fallbackLang = defaultLang;

      if (typeof arg1 === "string") {
        activeLang = arg1 || currentLang;
        if (typeof arg2 === "object" && arg2 !== null) {
          params = arg2;
        } else if (typeof arg2 === "string") {
          fallbackLang = arg2;
        }
        if (typeof arg3 === "string") {
          fallbackLang = arg3;
        }
      } else if (typeof arg1 === "object" && arg1 !== null) {
        params = arg1;
        if (typeof arg2 === "string") {
          activeLang = arg2 || currentLang;
        }
        if (typeof arg3 === "string") {
          fallbackLang = arg3;
        }
      }

      return translateUi(key, activeLang, params, fallbackLang);
    },
    [currentLang, defaultLang]
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        currentLanguage: currentLang,
        setLang,
        setLanguage: setLang,
        supportedLangs,
        enabledLangs,
        isLanguageEnabled,
        defaultLang,
        defaultLanguage: defaultLang,
        t,
        tUi,
        customTranslations,
        setCustomTranslationsMap,
        reloadSettings,
        reloadTranslations,
        translationsReady,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
