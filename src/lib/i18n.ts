import { defaultLocales, TranslationDictionary } from "./translations";

// In-memory cache for translations loaded from database
let databaseTranslationsCache: Record<string, TranslationDictionary> = {};
let customTranslationsCache: Record<string, TranslationDictionary> = {};

// Track pending loader promise to prevent redundant parallel network requests
let activeFetchPromise: Promise<Record<string, TranslationDictionary>> | null = null;

const CACHE_STORAGE_PREFIX = "sps_db_translations_v3_";
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes client cache

function normalizeTranslationDictionaries(value: unknown): Record<string, TranslationDictionary> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const dictionaries: Record<string, TranslationDictionary> = {};
  for (const [rawLocale, rawDictionary] of Object.entries(value)) {
    const locale = rawLocale.trim().toLowerCase();
    if (!locale || !rawDictionary || typeof rawDictionary !== "object" || Array.isArray(rawDictionary)) continue;

    const dictionary: TranslationDictionary = {};
    for (const [rawKey, rawValue] of Object.entries(rawDictionary)) {
      const key = rawKey.trim();
      if (key) dictionary[key] = String(rawValue ?? "");
    }
    dictionaries[locale] = { ...(dictionaries[locale] || {}), ...dictionary };
  }
  return dictionaries;
}

/**
 * Initializes and syncs database translations cache
 */
export function setDatabaseTranslations(translations: Record<string, TranslationDictionary>) {
  const normalized = normalizeTranslationDictionaries(translations);
  if (Object.keys(normalized).length > 0) {
    databaseTranslationsCache = {
      ...databaseTranslationsCache,
      ...normalized,
    };
  }
}

export function getDatabaseTranslations(): Record<string, TranslationDictionary> {
  return databaseTranslationsCache;
}

export function setCustomTranslations(translations: Record<string, TranslationDictionary>) {
  customTranslationsCache = translations || {};
}

export function getCustomTranslations(): Record<string, TranslationDictionary> {
  return customTranslationsCache;
}

/**
 * Loads translations from local cache if valid, otherwise fetches from database API.
 */
export async function loadTranslationsFromDatabase(
  targetLocale?: string
): Promise<Record<string, TranslationDictionary>> {
  // 1. Try to populate from localStorage cache immediately
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const cachedStr = localStorage.getItem(`${CACHE_STORAGE_PREFIX}all`);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached && cached.data && Date.now() - (cached.timestamp || 0) < CACHE_EXPIRY_MS) {
          const normalized = normalizeTranslationDictionaries(cached.data);
          if (Object.keys(normalized).length > 0) databaseTranslationsCache = normalized;
        }
      }
    } catch {
      // Ignore cache parse error
    }
  }

  // If already fetching, return existing promise
  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      const url = targetLocale 
        ? `/api/public/translations?locale=${encodeURIComponent(targetLocale)}` 
        : `/api/public/translations`;

      // The local cache makes the first render fast, but the database remains
      // authoritative. Bypass the browser/edge HTTP cache so a translation
      // edited in the admin panel is applied during the same page load.
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch translations`);
      }

      const data = await response.json();
      
      if (targetLocale && typeof data === "object" && data !== null && !Array.isArray(data)) {
        const locale = targetLocale.trim().toLowerCase();
        const normalized = normalizeTranslationDictionaries({ [locale]: data });
        if (!normalized[locale]) throw new Error("Invalid locale translation payload");
        databaseTranslationsCache[locale] = normalized[locale];
      } else {
        const normalized = normalizeTranslationDictionaries(data);
        if (Object.keys(normalized).length === 0) throw new Error("Invalid translation dictionary payload");
        databaseTranslationsCache = normalized;
      }

      // Persist to client localStorage for fast subsequent boots
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          localStorage.setItem(
            `${CACHE_STORAGE_PREFIX}all`,
            JSON.stringify({
              timestamp: Date.now(),
              data: databaseTranslationsCache,
            })
          );
        } catch {
          // localStorage might be full or disabled
        }
      }

      return databaseTranslationsCache;
    } catch (err) {
      console.warn("[i18n] Failed to load translations from DB API, using fallback:", err);
      // Fallback gracefully to hardcoded defaultLocales
      if (Object.keys(databaseTranslationsCache).length === 0) {
        databaseTranslationsCache = defaultLocales;
      }
      return databaseTranslationsCache;
    } finally {
      activeFetchPromise = null;
    }
  })();

  return activeFetchPromise;
}

/**
 * Invalidate client-side cache
 */
export function invalidateClientTranslationCache() {
  databaseTranslationsCache = {};
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.removeItem(`${CACHE_STORAGE_PREFIX}all`);
    } catch {}
  }
}

/**
 * Interpolates variables in a template string, supporting both single `{var}`
 * and double `{{var}}` placeholders with whitespace flexibility and regex safety.
 *
 * Example:
 *   interpolate("Welcome, {name}!", { name: "John" }) -> "Welcome, John!"
 *   interpolate("Count: {{ count }}", { count: 5 }) -> "Count: 5"
 */
export function interpolate(
  template: string,
  params?: Record<string, string | number | boolean | null | undefined>
): string {
  if (!template || !params || typeof params !== "object") {
    return template || "";
  }

  let result = template;

  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue === undefined || rawValue === null) {
      continue;
    }
    const valStr = String(rawValue);
    // Escape regex special characters in the variable name
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match {{ key }}, {{key}}, { key }, or {key}
    const pattern = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}|\\{\\s*${escapedKey}\\s*\\}`, "g");
    // Use a replacer function to avoid Javascript $ backreference expansion (e.g., $100)
    result = result.replace(pattern, () => valStr);
  }

  return result;
}

/**
 * Translates dynamic multilingual fields stored as JSON strings or objects
 * e.g., '{"en": "Modern Villa", "hu": "Modern Villa"}'
 */
export function t(
  value: string | object | undefined | null,
  arg1?: string | Record<string, any>,
  arg2?: string | Record<string, any>,
  arg3: string = "en"
): string {
  if (!value) return "";

  let lang = "en";
  let params: Record<string, any> | undefined;
  let defaultLang = arg3 || "en";

  if (typeof arg1 === "string") {
    lang = arg1 || "en";
    if (typeof arg2 === "object" && arg2 !== null) {
      params = arg2;
    } else if (typeof arg2 === "string") {
      defaultLang = arg2;
    }
  } else if (typeof arg1 === "object" && arg1 !== null) {
    params = arg1;
    if (typeof arg2 === "string") {
      lang = arg2 || "en";
    }
  }
  
  let rawText = "";

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, string>;
    rawText = obj[lang] || obj[defaultLang] || obj[Object.keys(obj)[0]] || "";
  } else {
    try {
      const parsed = JSON.parse(String(value));
      if (typeof parsed === "object" && parsed !== null) {
        rawText = (
          parsed[lang] ||
          parsed[defaultLang] ||
          parsed[Object.keys(parsed)[0]] ||
          ""
        );
      } else {
        rawText = String(value || "");
      }
    } catch {
      rawText = String(value || "");
    }
  }
  
  return interpolate(rawText, params);
}

/**
 * Legacy translation fallback table for flat string keys
 */
const legacyUiDict: Record<string, Record<string, string>> = {
  "About": { en: "About", hu: "Rólunk", de: "Über uns", es: "Sobre Nosotros", fr: "À propos" },
  "Services": { en: "Services", hu: "Szolgáltatások", de: "Leistungen", es: "Servicios", fr: "Services" },
  "Our Services": { en: "Our Services", hu: "Szolgáltatásaink", de: "Unsere Leistungen", es: "Nuestros Servicios", fr: "Nos Services" },
  "Portfolio": { en: "Portfolio", hu: "Portfólió", de: "Portfolio", es: "Portafolio", fr: "Portfolio" },
  "FAQ": { en: "FAQ", hu: "GYIK", de: "FAQ", es: "Preguntas Frecuentes", fr: "FAQ" },
  "Contact": { en: "Contact", hu: "Kapcsolat", de: "Kontakt", es: "Contacto", fr: "Contact" },
  "View Our Work": { en: "View Our Work", hu: "Nézze meg munkáinkat", de: "Unsere Arbeiten ansehen", es: "Ver Nuestros Trabajos", fr: "Découvrir nos réalisations" },
  "Contact Us": { en: "Contact Us", hu: "Lépjen kapcsolatba velünk", de: "Kontaktieren Sie uns", es: "Contáctanos", fr: "Contactez-nous" },
  "Send Message": { en: "Send Message", hu: "Üzenet küldése", de: "Nachricht senden", es: "Enviar Mensaje", fr: "Envoyer le message" },
  "Sending...": { en: "Sending...", hu: "Küldés...", de: "Wird gesendet...", es: "Enviando...", fr: "Envoi en cours..." },
  "Message sent successfully!": { en: "Message sent successfully!", hu: "Üzenet sikeresen elküldve!", de: "Nachricht erfolgreich gesendet!", es: "¡Mensaje enviado con éxito!", fr: "Message envoyé avec succès !" },
  "Failed to send message.": { en: "Failed to send message.", hu: "Hiba történt az üzenet küldésekor.", de: "Nachricht konnte nicht gesendet werden.", es: "Error al enviar el mensaje.", fr: "Échec de l'envoi du message." },
  "Name": { en: "Name", hu: "Név", de: "Name", es: "Nombre", fr: "Nom" },
  "Email": { en: "Email", hu: "E-mail", de: "E-Mail", es: "Correo", fr: "E-mail" },
  "Message": { en: "Message", hu: "Üzenet", de: "Nachricht", es: "Mensaje", fr: "Message" },
  "Read More": { en: "Read More", hu: "Bővebben", de: "Mehr lesen", es: "Leer más", fr: "Lire la suite" },
  "photos": { en: "photos", hu: "fotó", de: "Fotos", es: "fotos", fr: "photos" },
  "Get in Touch": { en: "Get in Touch", hu: "Lépjen kapcsolatba velünk", de: "Kontakt aufnehmen", es: "Contáctanos", fr: "Nous contacter" },
  "Let's work together.": { en: "Let's work together.", hu: "Dolgozzunk együtt.", de: "Lassen Sie uns zusammenarbeiten.", es: "Trabajemos juntos.", fr: "Travaillons ensemble." },
  "Submit Inquiry": { en: "Submit Inquiry", hu: "Érdeklődés elküldése", de: "Anfrage absenden", es: "Enviar Consulta", fr: "Envoyer la demande" },
  "All rights reserved.": { en: "All rights reserved.", hu: "Minden jog fenntartva.", de: "Alle Rechte vorbehalten.", es: "Todos los derechos reservados.", fr: "Tous droits réservés." },
  "Admin Panel": { en: "Admin Panel", hu: "Adminisztrációs Panel", de: "Admin-Bereich", es: "Panel de Administración", fr: "Administration" },
  "Sign In": { en: "Sign In", hu: "Bejelentkezés", de: "Anmelden", es: "Iniciar Sesión", fr: "Connexion" },
  "Sign Out": { en: "Sign Out", hu: "Kijelentkezés", de: "Abmelden", es: "Cerrar Sesión", fr: "Déconnexion" },
  "Socials": { en: "Socials", hu: "Közösségi Média", de: "Social Media", es: "Redes Sociales", fr: "Réseaux Sociaux" },
  "Social Links": { en: "Social Links", hu: "Közösségi Linkek", de: "Social Links", es: "Enlaces Sociales", fr: "Liens Sociaux" },
  "Connect with SPS Studio": { en: "Connect with SPS Studio", hu: "Kapcsolatfelvétel az SPS Studióval", de: "Verbinden Sie sich mit SPS Studio", es: "Conecta con SPS Studio", fr: "Contactez SPS Studio" },
  "Close": { en: "Close", hu: "Bezárás", de: "Schließen", es: "Cerrar", fr: "Fermer" },
};

/**
 * Translates application UI keys with prioritized Database Resolution:
 * 1. Database translations for current language
 * 2. Custom settings overrides for current language
 * 3. Hardcoded built-in dictionary for current language (file fallback)
 * 4. Database translations for default language
 * 5. Custom settings overrides for default language
 * 6. Hardcoded built-in dictionary for default language
 * 7. Database translations for 'en'
 * 8. Hardcoded built-in dictionary for 'en'
 * 9. Legacy dictionary fallback
 * 10. Raw key fallback
 *
 * Supports polymorphic arguments:
 *   tUi("key")
 *   tUi("key", { count: 5 })
 *   tUi("key", "hu")
 *   tUi("key", "hu", { count: 5 })
 *   tUi("key", { count: 5 }, "hu")
 *   tUi("key", "hu", { count: 5 }, "en")
 */
export function tUi(
  key: string,
  arg1?: string | Record<string, any>,
  arg2?: string | Record<string, any>,
  arg3: string = "en"
): string {
  if (!key) return "";

  let lang = "en";
  let params: Record<string, any> | undefined;
  let defaultLang = arg3 || "en";

  if (typeof arg1 === "string") {
    lang = arg1 || "en";
    if (typeof arg2 === "object" && arg2 !== null) {
      params = arg2;
    } else if (typeof arg2 === "string") {
      defaultLang = arg2;
    }
  } else if (typeof arg1 === "object" && arg1 !== null) {
    params = arg1;
    if (typeof arg2 === "string") {
      lang = arg2 || "en";
    }
  }

  let translated: string | undefined;

  // 1. Database translations in requested language
  if (databaseTranslationsCache[lang]?.[key]) {
    translated = databaseTranslationsCache[lang][key];
  }

  // 2. Custom overrides in requested language
  if (!translated && customTranslationsCache[lang]?.[key]) {
    translated = customTranslationsCache[lang][key];
  }

  // 3. Built-in file locale dictionary in requested language (file fallback)
  if (!translated && defaultLocales[lang]?.[key]) {
    translated = defaultLocales[lang][key];
  }

  // 4. Database translations in default language
  if (!translated && databaseTranslationsCache[defaultLang]?.[key]) {
    translated = databaseTranslationsCache[defaultLang][key];
  }

  // 5. Custom overrides in default language
  if (!translated && customTranslationsCache[defaultLang]?.[key]) {
    translated = customTranslationsCache[defaultLang][key];
  }

  // 6. Built-in file locale in default language
  if (!translated && defaultLocales[defaultLang]?.[key]) {
    translated = defaultLocales[defaultLang][key];
  }

  // 7. Database translations in English
  if (!translated && databaseTranslationsCache["en"]?.[key]) {
    translated = databaseTranslationsCache["en"][key];
  }

  // 8. Built-in English file locale
  if (!translated && defaultLocales["en"]?.[key]) {
    translated = defaultLocales["en"][key];
  }

  // 9. Legacy flat dictionary
  if (!translated && legacyUiDict[key]?.[lang]) {
    translated = legacyUiDict[key][lang];
  }
  if (!translated && legacyUiDict[key]?.[defaultLang]) {
    translated = legacyUiDict[key][defaultLang];
  }
  if (!translated && legacyUiDict[key]?.["en"]) {
    translated = legacyUiDict[key]["en"];
  }

  // 10. If still not found, return key
  const template = translated !== undefined ? translated : key;

  return interpolate(template, params);
}
