import { useState, useEffect } from "react";
import { ThemeConfig, THEME_PRESETS } from "../../lib/themeTypes";
import { ThemeEditor } from "./ThemeEditor";
import { ThemePreview } from "./ThemePreview";
import { Link } from "react-router-dom";
import { ExternalLink, Palette, Sparkles } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceHover?: string;
  text: string;
  mutedText: string;
  inverseText?: string;
  border: string;
  primary: string;
  primaryForeground?: string;
  accent: string;
  accentForeground?: string;
};

export type ThemeSettings = {
  light: ThemeColors;
  dark: ThemeColors;
};

export const defaultTheme: ThemeSettings = {
  light: {
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    mutedText: "#64748b",
    border: "#e2e8f0",
    primary: "#0f172a",
    accent: "#3b82f6"
  },
  dark: {
    background: "#0f172a",
    surface: "#1e293b",
    text: "#f8fafc",
    mutedText: "#94a3b8",
    border: "#334155",
    primary: "#f8fafc",
    accent: "#3b82f6"
  }
};

export function ThemeManager({ 
  value, 
  onChange,
  target = "public"
}: { 
  value?: string; 
  onChange: (val: string) => void;
  target?: "public" | "admin" | "both";
}) {
  const { tUi, currentLanguage } = useLanguage();
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (parsed.colors) return parsed;
        if (parsed.light && parsed.dark) {
          return {
            ...THEME_PRESETS[0],
            colors: {
              light: { ...THEME_PRESETS[0].colors.light, ...parsed.light },
              dark: { ...THEME_PRESETS[0].colors.dark, ...parsed.dark }
            }
          };
        }
      } catch (e) {}
    }
    return THEME_PRESETS[0];
  });

  const handleConfigChange = (updated: ThemeConfig) => {
    setThemeConfig(updated);
    onChange(JSON.stringify(updated));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 text-xs font-semibold text-text">
          <Palette className="w-4 h-4 text-primary" />
          <span>{tUi("themeManager.prompt_full_studio", currentLanguage) || "Need full multi-theme management and live side-by-side preview?"}</span>
        </div>
        <Link
          to="/admin/themes"
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
        >
          <span>{tUi("themeManager.open_studio", currentLanguage) || "Open Theme Studio"}</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <ThemeEditor
        theme={themeConfig}
        onChange={handleConfigChange}
        target={target}
      />
    </div>
  );
}
