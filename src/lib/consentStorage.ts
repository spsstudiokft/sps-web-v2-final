export type ConsentCategory = "necessary" | "preferences" | "analytics" | "marketing";
export type ConsentPreferences = Record<ConsentCategory, boolean> & { necessary: true };

const CONSENT_KEY = "sps_cookie_consent_v2";
const OPTIONAL_STORAGE: Record<Exclude<ConsentCategory, "necessary">, string[]> = {
  preferences: ["site_lang", "public-theme-mode", "theme"],
  analytics: ["_ga", "_gid", "_gat", "_hjSession", "clarity", "ahrefs"],
  marketing: ["_fbp", "_gcl_au", "_pin_unauth"],
};

export function getConsentPreferences(): ConsentPreferences {
  if (typeof window === "undefined") return { necessary: true, preferences: false, analytics: false, marketing: false };
  try {
    const value = JSON.parse(window.localStorage.getItem(CONSENT_KEY) || "{}");
    return { necessary: true, preferences: Boolean(value?.preferences?.preferences), analytics: Boolean(value?.preferences?.analytics), marketing: Boolean(value?.preferences?.marketing) };
  } catch { return { necessary: true, preferences: false, analytics: false, marketing: false }; }
}

export function hasConsent(category: ConsentCategory) { return category === "necessary" || getConsentPreferences()[category]; }

function expireCookie(name: string) { document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; path=/; SameSite=Lax`; }

export function applyConsentPreferences(preferences: ConsentPreferences) {
  if (typeof window === "undefined") return;
  (Object.keys(OPTIONAL_STORAGE) as Array<Exclude<ConsentCategory, "necessary">>).forEach((category) => {
    if (preferences[category]) return;
    OPTIONAL_STORAGE[category].forEach((name) => { try { window.localStorage.removeItem(name); window.sessionStorage.removeItem(name); expireCookie(name); } catch {} });
    [window.localStorage, window.sessionStorage].forEach((storage) => {
      for (let index = storage.length - 1; index >= 0; index--) { const key = storage.key(index) || ""; if (OPTIONAL_STORAGE[category].some((name) => key === name || key.startsWith(`${name}_`))) storage.removeItem(key); }
    });
    document.querySelectorAll(`[data-consent-category="${category}"]`).forEach((element) => element.remove());
  });
  window.dispatchEvent(new CustomEvent("sps-consent-changed", { detail: preferences }));
}

/** Load a non-essential integration only after its category has been approved. */
export function loadConsentScript(id: string, source: string, category: Exclude<ConsentCategory, "necessary">, attributes: Record<string, string> = {}) {
  if (typeof document === "undefined" || !hasConsent(category) || document.getElementById(id)) return false;
  const script = document.createElement("script"); script.id = id; script.src = source; script.async = true; script.dataset.consentCategory = category;
  Object.entries(attributes).forEach(([name, value]) => script.setAttribute(name, value)); document.head.appendChild(script); return true;
}
