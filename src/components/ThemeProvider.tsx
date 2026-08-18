import React, { useEffect, useState, createContext, useContext, useCallback } from "react";
import { ThemeConfig, THEME_PRESETS, AVAILABLE_FONTS, getAutoContrastColor } from "../lib/themeTypes";
import { updateDocumentFavicon } from "../lib/favicon";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  publicTheme: ThemeConfig;
  adminTheme: ThemeConfig;
  setPublicTheme: (theme: ThemeConfig) => void;
  setAdminTheme: (theme: ThemeConfig) => void;
  reloadThemes: () => Promise<void>;
  // Backward compatibility
  themeColors: any;
  setThemeColors: (colors: any) => void;
}

const defaultPublicPreset = THEME_PRESETS[0]; // Modern Minimal
const defaultAdminPreset = THEME_PRESETS[0];

const STORAGE_KEY_THEME = "theme";
const STORAGE_KEY_LEGACY = "admin-theme-mode";

/**
 * Safely get stored theme or derive from system preference or default
 */
export function getSavedThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME) || localStorage.getItem(STORAGE_KEY_LEGACY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch (e) {
    // LocalStorage might be restricted (e.g. private browsing)
  }

  // Check system preference if no stored user preference
  try {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch (e) {}

  return "dark";
}

/**
 * Safely store theme preference to localStorage
 */
export function saveThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, mode);
    localStorage.setItem(STORAGE_KEY_LEGACY, mode);
  } catch (e) {
    // In-memory fallback if storage is unavailable
  }
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  setMode: () => {},
  toggleTheme: () => {},
  publicTheme: defaultPublicPreset,
  adminTheme: defaultAdminPreset,
  setPublicTheme: () => {},
  setAdminTheme: () => {},
  reloadThemes: async () => {},
  themeColors: null,
  setThemeColors: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function getContrastColor(hexColor: string | undefined): string {
  if (!hexColor) return "#ffffff";
  return getAutoContrastColor(hexColor);
}

// Dynamically load Google Font families into document <head>
function loadGoogleFonts(fonts: string[]) {
  if (typeof document === "undefined") return;
  const uniqueFamilies = new Set<string>();

  fonts.forEach((fontName) => {
    if (!fontName || fontName.startsWith("System")) return;
    const match = [...AVAILABLE_FONTS.headings, ...AVAILABLE_FONTS.body].find(
      (f) => f.name.toLowerCase() === fontName.toLowerCase()
    );
    if (match?.googleFamily) {
      uniqueFamilies.add(match.googleFamily);
    }
  });

  if (uniqueFamilies.size === 0) return;

  const fontQuery = Array.from(uniqueFamilies).join("&family=");
  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontQuery}&display=swap`;

  let linkEl = document.getElementById("dynamic-google-fonts") as HTMLLinkElement;
  if (!linkEl) {
    linkEl = document.createElement("link");
    linkEl.id = "dynamic-google-fonts";
    linkEl.rel = "stylesheet";
    document.head.appendChild(linkEl);
  }
  if (linkEl.href !== fontUrl) {
    linkEl.href = fontUrl;
  }
}

// Convert border-radius preset to CSS px string
function getRadiusPx(radius?: string): string {
  switch (radius) {
    case "none": return "0px";
    case "sm": return "4px";
    case "md": return "8px";
    case "lg": return "12px";
    case "xl": return "16px";
    case "2xl": return "24px";
    case "full": return "9999px";
    default: return "12px";
  }
}

// Convert shadow preset to CSS box-shadow string
function getShadowCss(shadow?: string, isDark: boolean = false): string {
  if (isDark) {
    switch (shadow) {
      case "none": return "none";
      case "subtle": return "0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)";
      case "medium": return "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)";
      case "prominent": return "0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.6)";
      case "glow": return "0 0 20px -2px rgba(168, 85, 247, 0.25)";
      default: return "0 1px 3px 0 rgba(0, 0, 0, 0.4)";
    }
  }
  switch (shadow) {
    case "none": return "none";
    case "subtle": return "0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px -1px rgba(0, 0, 0, 0.05)";
    case "medium": return "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.08)";
    case "prominent": return "0 10px 15px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -4px rgba(0, 0, 0, 0.08)";
    case "glow": return "0 0 20px -2px rgba(59, 130, 246, 0.2)";
    default: return "0 1px 3px 0 rgba(0, 0, 0, 0.07)";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [publicTheme, setPublicThemeState] = useState<ThemeConfig>(defaultPublicPreset);
  const [adminTheme, setAdminThemeState] = useState<ThemeConfig>(defaultAdminPreset);
  const [mode, setModeState] = useState<ThemeMode>(() => getSavedThemeMode());

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    saveThemeMode(newMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      saveThemeMode(next);
      return next;
    });
  }, []);

  // Listen for storage changes across browser tabs & system theme changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_THEME || e.key === STORAGE_KEY_LEGACY) {
        if (e.newValue === "light" || e.newValue === "dark") {
          setModeState(e.newValue);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // If no explicit local storage preference exists, listen to OS dark/light mode changes
    const mediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const handleMediaChange = (e: MediaQueryListEvent) => {
      try {
        const hasStored = localStorage.getItem(STORAGE_KEY_THEME) || localStorage.getItem(STORAGE_KEY_LEGACY);
        if (!hasStored) {
          setModeState(e.matches ? "dark" : "light");
        }
      } catch {}
    };

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaChange);
    }

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      }
    };
  }, []);

  const loadSettingsAndThemes = useCallback(async () => {
    try {
      const res = await fetch("/api/public/settings");
      if (!res.ok) return;
      const data = await res.json();

      if (data.favicon_url !== undefined) {
        updateDocumentFavicon(data.favicon_url);
      }

      if (data.theme_public_config) {
        try {
          const parsed = typeof data.theme_public_config === "string" 
            ? JSON.parse(data.theme_public_config) 
            : data.theme_public_config;
          if (parsed && parsed.colors) {
            setPublicThemeState(parsed);
          }
        } catch (e) {}
      } else if (data.theme_colors) {
        // Fallback to legacy theme_colors
        try {
          const colors = JSON.parse(data.theme_colors);
          setPublicThemeState(prev => ({
            ...prev,
            colors: {
              light: { ...prev.colors.light, ...colors.light },
              dark: { ...prev.colors.dark, ...colors.dark }
            }
          }));
        } catch (e) {}
      }

      if (data.theme_admin_config) {
        try {
          const parsed = typeof data.theme_admin_config === "string" 
            ? JSON.parse(data.theme_admin_config) 
            : data.theme_admin_config;
          if (parsed && parsed.colors) {
            setAdminThemeState(parsed);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error("Failed to load theme settings", e);
    }
  }, []);

  useEffect(() => {
    loadSettingsAndThemes();
  }, [loadSettingsAndThemes]);

  const setPublicTheme = (theme: ThemeConfig) => {
    setPublicThemeState(theme);
  };

  const setAdminTheme = (theme: ThemeConfig) => {
    setAdminThemeState(theme);
  };

  // Backward compatibility setter
  const setThemeColors = (colors: any) => {
    if (!colors) return;
    setPublicThemeState(prev => ({
      ...prev,
      colors: {
        light: { ...prev.colors.light, ...(colors.light || {}) },
        dark: { ...prev.colors.dark, ...(colors.dark || {}) }
      }
    }));
  };

  // Apply CSS variables, classes, and data-theme to Document Root
  useEffect(() => {
    if (typeof window === "undefined") return;

    const pathname = window.location.pathname;
    const isAdminRoute = pathname.startsWith("/admin");
    const activeThemeConfig = isAdminRoute ? adminTheme : publicTheme;

    const root = document.documentElement;
    root.style.setProperty("color-scheme", mode);
    root.classList.remove("light", "dark");
    root.classList.add(mode);
    root.setAttribute("data-theme", mode);

    // Collect fonts to load
    const fontsToLoad = [
      publicTheme.typography?.headingFont,
      publicTheme.typography?.bodyFont,
      adminTheme.typography?.headingFont,
      adminTheme.typography?.bodyFont
    ].filter(Boolean) as string[];
    loadGoogleFonts(fontsToLoad);

    const colors = activeThemeConfig.colors || defaultPublicPreset.colors;
    const light = colors.light || defaultPublicPreset.colors.light;
    const dark = colors.dark || defaultPublicPreset.colors.dark;
    const activeColors = mode === "dark" ? dark : light;

    const activePrimaryFg = activeColors.primaryForeground || getContrastColor(activeColors.primary);
    const activeAccentFg = activeColors.accentForeground || getContrastColor(activeColors.accent);
    const activeInverseText = activeColors.inverseText || (mode === "dark" ? "#0f172a" : "#ffffff");

    // Color CSS Variables
    root.style.setProperty("--theme-bg", activeColors.background);
    root.style.setProperty("--theme-surface", activeColors.surface);
    root.style.setProperty("--theme-surface-hover", activeColors.surfaceHover || (mode === "dark" ? "#1e293b" : "#f1f5f9"));
    root.style.setProperty("--theme-text", activeColors.text);
    root.style.setProperty("--theme-muted-text", activeColors.mutedText);
    root.style.setProperty("--theme-inverse-text", activeInverseText);
    root.style.setProperty("--theme-border", activeColors.border);
    root.style.setProperty("--theme-primary", activeColors.primary);
    root.style.setProperty("--theme-primary-foreground", activePrimaryFg);
    root.style.setProperty("--theme-accent", activeColors.accent);
    root.style.setProperty("--theme-accent-foreground", activeAccentFg);

    // Typography CSS Variables
    const headingFont = activeThemeConfig.typography?.headingFont || "Plus Jakarta Sans";
    const bodyFont = activeThemeConfig.typography?.bodyFont || "Plus Jakarta Sans";
    
    const headingFamily = headingFont.startsWith("System Serif")
      ? 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
      : headingFont.startsWith("System Sans")
      ? 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : `"${headingFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    const bodyFamily = bodyFont.startsWith("System Serif")
      ? 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
      : bodyFont.startsWith("System Sans")
      ? 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : `"${bodyFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    root.style.setProperty("--theme-font-heading", headingFamily);
    root.style.setProperty("--theme-font-body", bodyFamily);

    // Font Scaling
    const scale = activeThemeConfig.typography?.fontSizeScale || "normal";
    let baseFontSize = "16px";
    if (scale === "compact") baseFontSize = "14px";
    else if (scale === "comfortable") baseFontSize = "16px";
    else if (scale === "spacious") baseFontSize = "17px";
    root.style.setProperty("--theme-base-font-size", baseFontSize);

    // UI Styles
    const radiusPx = getRadiusPx(activeThemeConfig.uiStyle?.borderRadius);
    root.style.setProperty("--theme-radius", radiusPx);

    const shadowCss = getShadowCss(activeThemeConfig.uiStyle?.shadows, mode === "dark");
    root.style.setProperty("--theme-shadow", shadowCss);

  }, [publicTheme, adminTheme, mode]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        toggleTheme,
        publicTheme,
        adminTheme,
        setPublicTheme,
        setAdminTheme,
        reloadThemes: loadSettingsAndThemes,
        themeColors: publicTheme.colors,
        setThemeColors
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
