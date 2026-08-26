import React, { useState } from "react";
import { 
  ThemeConfig, 
  ThemeColorMode, 
  THEME_PRESETS, 
  AVAILABLE_FONTS, 
  getAutoContrastColor 
} from "../../lib/themeTypes";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useLanguage } from "../../contexts/LanguageContext";
import { 
  Palette, 
  Type, 
  Box, 
  Sparkles, 
  Sun, 
  Moon, 
  RotateCcw, 
  Wand2, 
  Check, 
  Download, 
  Upload, 
  Info,
  Sliders,
  Paintbrush
} from "lucide-react";

interface ThemeEditorProps {
  theme: ThemeConfig;
  onChange: (updatedTheme: ThemeConfig) => void;
  onResetPreset?: (presetId: string) => void;
  target?: "public" | "admin" | "both";
}

export function ThemeEditor({
  theme,
  onChange,
  onResetPreset,
  target = "public"
}: ThemeEditorProps) {
  const { tUi, currentLanguage } = useLanguage();
  const [activeModeTab, setActiveModeTab] = useState<"light" | "dark">("dark");
  const [activeSection, setActiveSection] = useState<"colors" | "typography" | "ui">("colors");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Helper to update a color field in light or dark mode
  const handleColorChange = (mode: "light" | "dark", key: keyof ThemeColorMode, val: string) => {
    let updatedColors = {
      ...theme.colors,
      [mode]: {
        ...theme.colors[mode],
        [key]: val
      }
    };

    // Auto-update contrast foregrounds when primary/accent change if desired
    if (key === "primary") {
      updatedColors[mode].primaryForeground = getAutoContrastColor(val);
    } else if (key === "accent") {
      updatedColors[mode].accentForeground = getAutoContrastColor(val);
    }

    onChange({
      ...theme,
      colors: updatedColors
    });
  };

  // Auto-Fix accessibility contrast
  const handleAutoFixContrast = () => {
    const mode = activeModeTab;
    const current = theme.colors[mode];
    
    // In dark mode: ensure background is deep, text is luminous
    // In light mode: ensure background is light, text is dark
    let newBg = current.background;
    let newText = current.text;
    let newSurface = current.surface;

    if (mode === "dark") {
      newBg = current.background.startsWith("#0") || current.background.startsWith("#1") ? current.background : "#0f172a";
      newText = "#f8fafc";
      newSurface = current.surface.startsWith("#1") || current.surface.startsWith("#2") ? current.surface : "#1e293b";
    } else {
      newBg = current.background.startsWith("#f") || current.background.startsWith("#e") ? current.background : "#ffffff";
      newText = "#0f172a";
      newSurface = current.surface.startsWith("#f") || current.surface.startsWith("#e") ? current.surface : "#f8fafc";
    }

    const newPrimaryFg = getAutoContrastColor(current.primary);
    const newAccentFg = getAutoContrastColor(current.accent);

    onChange({
      ...theme,
      colors: {
        ...theme.colors,
        [mode]: {
          ...current,
          background: newBg,
          surface: newSurface,
          text: newText,
          mutedText: mode === "dark" ? "#94a3b8" : "#64748b",
          primaryForeground: newPrimaryFg,
          accentForeground: newAccentFg,
        }
      }
    });
  };

  // Quick Preset Loader
  const handleSelectPreset = (preset: ThemeConfig) => {
    onChange({
      ...preset,
      id: theme.id,
      name: theme.name || preset.name,
      target: theme.target || preset.target
    });
  };

  const ColorField = ({
    colorKey,
    label,
    description
  }: {
    colorKey: keyof ThemeColorMode;
    label: string;
    description?: string;
  }) => {
    const value = theme.colors[activeModeTab][colorKey] || "#000000";
    return (
      <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface border border-border">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-text">{label}</Label>
          <span className="text-[10px] font-mono text-muted-text uppercase">{value}</span>
        </div>
        {description && <p className="text-[11px] text-muted-text">{description}</p>}
        <div className="flex items-center gap-2 mt-1">
          <div className="w-9 h-9 rounded-lg border border-border overflow-hidden shrink-0 shadow-xs relative">
            <input
              type="color"
              value={value}
              onChange={(e) => handleColorChange(activeModeTab, colorKey, e.target.value)}
              className="absolute -inset-2 w-[140%] h-[140%] p-0 border-0 cursor-pointer"
            />
          </div>
          <Input
            value={value}
            onChange={(e) => handleColorChange(activeModeTab, colorKey, e.target.value)}
            className="flex-1 font-mono text-xs uppercase"
            placeholder="#000000"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Preset Swatches Bar */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-text">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{tUi("themeEditor.preset_templates", currentLanguage) || "Preset Style Templates"}</span>
          </div>
          <span className="text-[11px] text-muted-text">Válassz egy kész vizuális rendszert, majd csak szükség esetén finomhangolj.</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {THEME_PRESETS.map((preset) => {
            const isSelected = theme.name === preset.name;
            const pKey = preset.id.replace("preset-", "").replace(/-/g, "_");
            const displayName = tUi(`themePresets.${pKey}.name`, currentLanguage) || preset.name;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all group ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                    : "border-border bg-background hover:border-primary/40 hover:bg-surface"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs shrink-0" 
                      style={{ backgroundColor: preset.colors.light.primary }}
                    />
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs shrink-0" 
                      style={{ backgroundColor: preset.colors.light.accent }}
                    />
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs shrink-0" 
                      style={{ backgroundColor: preset.colors.dark.surface }}
                    />
                  </div>
                  <span className="text-xs font-bold text-text block truncate leading-tight">
                    {displayName}
                  </span>
                </div>
                <span className="text-[10px] text-muted-text mt-1 line-clamp-1">
                  {preset.typography.headingFont}
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setShowAdvanced((value) => !value)} className="text-xs font-semibold text-primary hover:opacity-80">
          {showAdvanced ? "Részletes szerkesztő elrejtése" : "Részletes szerkesztő megnyitása"}
        </button>
      </div>

      {/* Editor Navigation Bar */}
      {showAdvanced && <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-surface rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setActiveSection("colors")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSection === "colors"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-text hover:text-text"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{tUi("themeEditor.tab_colors", currentLanguage) || "Colors & Tones"}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("typography")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSection === "typography"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-text hover:text-text"
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>{tUi("themeEditor.tab_typography", currentLanguage) || "Typography"}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("ui")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSection === "ui"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-text hover:text-text"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>{tUi("themeEditor.tab_ui", currentLanguage) || "UI & Shape Presets"}</span>
          </button>
        </div>

        {activeSection === "colors" && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-surface rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setActiveModeTab("light")}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeModeTab === "light"
                    ? "bg-background text-text shadow-xs font-bold"
                    : "text-muted-text hover:text-text"
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>{tUi("themeEditor.light_mode", currentLanguage) || "Light Mode"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModeTab("dark")}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeModeTab === "dark"
                    ? "bg-background text-text shadow-xs font-bold"
                    : "text-muted-text hover:text-text"
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>{tUi("themeEditor.dark_mode", currentLanguage) || "Dark Mode"}</span>
              </button>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handleAutoFixContrast}
              className="text-xs flex items-center gap-1.5 shadow-xs"
              title={tUi("themeEditor.autofix_contrast_title", currentLanguage) || "Automatically adjust background and foreground for optimal WCAG AA contrast"}
            >
              <Wand2 className="w-3.5 h-3.5 text-primary" />
              <span>{tUi("themeEditor.autofix_contrast", currentLanguage) || "Auto-Fix Contrast"}</span>
            </Button>
          </div>
        )}
      </div>

      {/* SECTION 1: Colors & Palettes */}
      {activeSection === "colors" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-text flex items-center gap-2">
              <span>{activeModeTab === "dark" ? (tUi("themeEditor.dark_mode", currentLanguage) || "Dark Mode") : (tUi("themeEditor.light_mode", currentLanguage) || "Light Mode")} {tUi("themeEditor.palette_properties", currentLanguage) || "Palette Properties"}</span>
            </h4>
            <span className="text-xs text-muted-text">
              {tUi("themeEditor.sync_hint", currentLanguage) || "Real-time synchronization across public & dashboard layouts."}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Primary Action & Brand Accent */}
            <ColorField
              colorKey="primary"
              label={tUi("themeEditor.color_primary", currentLanguage) || "Primary Action Color"}
              description={tUi("themeEditor.color_primary_desc", currentLanguage) || "Used for prominent CTA buttons, active state chips, and brand highlights."}
            />
            <ColorField
              colorKey="primaryForeground"
              label={tUi("themeEditor.color_primary_foreground", currentLanguage) || "Primary Action Text"}
              description={tUi("themeEditor.color_primary_foreground_desc", currentLanguage) || "Contrast label color inside primary buttons."}
            />
            <ColorField
              colorKey="accent"
              label={tUi("themeEditor.color_accent", currentLanguage) || "Accent Color"}
              description={tUi("themeEditor.color_accent_desc", currentLanguage) || "Used for secondary badges, special tags, links, and interactive focal points."}
            />
            <ColorField
              colorKey="accentForeground"
              label={tUi("themeEditor.color_accent_foreground", currentLanguage) || "Accent Action Text"}
              description={tUi("themeEditor.color_accent_foreground_desc", currentLanguage) || "Contrast text color inside accent badges."}
            />

            {/* Background & Surfaces */}
            <ColorField
              colorKey="background"
              label={tUi("themeEditor.color_background", currentLanguage) || "Canvas Background"}
              description={tUi("themeEditor.color_background_desc", currentLanguage) || "Base background layer for full-screen viewports."}
            />
            <ColorField
              colorKey="surface"
              label={tUi("themeEditor.color_surface", currentLanguage) || "Surface / Card Layer"}
              description={tUi("themeEditor.color_surface_desc", currentLanguage) || "Used for cards, header bars, and modal containers."}
            />
            <ColorField
              colorKey="surfaceHover"
              label={tUi("themeEditor.color_surface_hover", currentLanguage) || "Surface Hover State"}
              description={tUi("themeEditor.color_surface_hover_desc", currentLanguage) || "Hover background for interactive cards and list rows."}
            />

            {/* Text & Borders */}
            <ColorField
              colorKey="text"
              label={tUi("themeEditor.color_text", currentLanguage) || "Primary Text Color"}
              description={tUi("themeEditor.color_text_desc", currentLanguage) || "High-contrast body text and prominent headlines."}
            />
            <ColorField
              colorKey="mutedText"
              label={tUi("themeEditor.color_muted_text", currentLanguage) || "Muted / Secondary Text"}
              description={tUi("themeEditor.color_muted_text_desc", currentLanguage) || "Subheadlines, captions, timestamps, and metadata."}
            />
            <ColorField
              colorKey="inverseText"
              label={tUi("themeEditor.color_inverse_text", currentLanguage) || "Inverse Text Color"}
              description={tUi("themeEditor.color_inverse_text_desc", currentLanguage) || "High-contrast text on opposing dark/light fills."}
            />
            <ColorField
              colorKey="border"
              label={tUi("themeEditor.color_border", currentLanguage) || "Border & Line Separators"}
              description={tUi("themeEditor.color_border_desc", currentLanguage) || "Subtle structural borders for cards and dividers."}
            />
          </div>
        </div>
      )}

      {/* SECTION 2: Typography */}
      {activeSection === "typography" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Heading Font Family */}
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-text">{tUi("themeEditor.heading_font_family", currentLanguage) || "Heading Font Family"}</Label>
                <span className="text-xs text-muted-text">{tUi("themeEditor.heading_font_family_desc", currentLanguage) || "Applied to H1-H6 and Hero titles"}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_FONTS.headings.map((font) => {
                  const isSelected = theme.typography.headingFont === font.name;
                  return (
                    <button
                      key={font.name}
                      type="button"
                      onClick={() => onChange({
                        ...theme,
                        typography: { ...theme.typography, headingFont: font.name }
                      })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border bg-background hover:border-primary/40 hover:bg-surface"
                      }`}
                    >
                      <span className="text-xs font-bold text-text block truncate" style={{ fontFamily: font.name }}>
                        {font.name}
                      </span>
                      <span className="text-[10px] text-muted-text">{font.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Body Font Family */}
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-text">{tUi("themeEditor.body_font_family", currentLanguage) || "Body & UI Font Family"}</Label>
                <span className="text-xs text-muted-text">{tUi("themeEditor.body_font_family_desc", currentLanguage) || "Applied to paragraphs, tables, and inputs"}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_FONTS.body.map((font) => {
                  const isSelected = theme.typography.bodyFont === font.name;
                  return (
                    <button
                      key={font.name}
                      type="button"
                      onClick={() => onChange({
                        ...theme,
                        typography: { ...theme.typography, bodyFont: font.name }
                      })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border bg-background hover:border-primary/40 hover:bg-surface"
                      }`}
                    >
                      <span className="text-xs font-bold text-text block truncate" style={{ fontFamily: font.name }}>
                        {font.name}
                      </span>
                      <span className="text-[10px] text-muted-text">{font.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Typography Scale & Weight Adjustments */}
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-5">
            <h4 className="text-sm font-bold text-text">{tUi("themeEditor.scale_optical", currentLanguage) || "Scale & Optical Hierarchy"}</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Font Size Scaling */}
              <div>
                <Label className="text-xs font-semibold text-text">{tUi("themeEditor.base_scaling", currentLanguage) || "Base Scaling"}</Label>
                <select
                  value={theme.typography.fontSizeScale}
                  onChange={(e) => onChange({
                    ...theme,
                    typography: { ...theme.typography, fontSizeScale: e.target.value as any }
                  })}
                  className="mt-1.5 w-full px-3 py-2 text-xs border border-border rounded-xl bg-background text-text outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="compact">{tUi("themeEditor.scale_compact", currentLanguage) || "Compact (14px baseline)"}</option>
                  <option value="normal">{tUi("themeEditor.scale_normal", currentLanguage) || "Standard (16px baseline)"}</option>
                  <option value="comfortable">{tUi("themeEditor.scale_comfortable", currentLanguage) || "Comfortable (16px + airy)"}</option>
                  <option value="spacious">{tUi("themeEditor.scale_spacious", currentLanguage) || "Spacious (17px editorial)"}</option>
                </select>
              </div>

              {/* Heading Weight */}
              <div>
                <Label className="text-xs font-semibold text-text">{tUi("themeEditor.heading_weight", currentLanguage) || "Heading Weight"}</Label>
                <select
                  value={theme.typography.headingWeight}
                  onChange={(e) => onChange({
                    ...theme,
                    typography: { ...theme.typography, headingWeight: e.target.value as any }
                  })}
                  className="mt-1.5 w-full px-3 py-2 text-xs border border-border rounded-xl bg-background text-text outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="medium">{tUi("themeEditor.weight_medium", currentLanguage) || "Medium (500)"}</option>
                  <option value="semibold">{tUi("themeEditor.weight_semibold", currentLanguage) || "Semibold (600)"}</option>
                  <option value="bold">{tUi("themeEditor.weight_bold", currentLanguage) || "Bold (700)"}</option>
                  <option value="extrabold">{tUi("themeEditor.weight_extrabold", currentLanguage) || "Extra Bold (800)"}</option>
                </select>
              </div>

              {/* Letter Spacing */}
              <div>
                <Label className="text-xs font-semibold text-text">{tUi("themeEditor.letter_spacing", currentLanguage) || "Letter Spacing (Tracking)"}</Label>
                <select
                  value={theme.typography.letterSpacing}
                  onChange={(e) => onChange({
                    ...theme,
                    typography: { ...theme.typography, letterSpacing: e.target.value as any }
                  })}
                  className="mt-1.5 w-full px-3 py-2 text-xs border border-border rounded-xl bg-background text-text outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="tight">{tUi("themeEditor.spacing_tight", currentLanguage) || "Tight (-0.025em)"}</option>
                  <option value="normal">{tUi("themeEditor.spacing_normal", currentLanguage) || "Normal (0em)"}</option>
                  <option value="wide">{tUi("themeEditor.spacing_wide", currentLanguage) || "Wide (+0.05em Editorial)"}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: UI & Shapes */}
      {activeSection === "ui" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Border Radius */}
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
              <div>
                <Label className="text-sm font-bold text-text">{tUi("themeEditor.border_radius", currentLanguage) || "Border Radius"}</Label>
                <p className="text-xs text-muted-text mt-0.5">{tUi("themeEditor.border_radius_desc", currentLanguage) || "Controls corner roundness across cards and buttons"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "none", label: tUi("themeEditor.radius_none", currentLanguage) || "Sharp (0px)" },
                  { key: "sm", label: tUi("themeEditor.radius_sm", currentLanguage) || "Subtle (4px)" },
                  { key: "md", label: tUi("themeEditor.radius_md", currentLanguage) || "Medium (8px)" },
                  { key: "lg", label: tUi("themeEditor.radius_lg", currentLanguage) || "Modern (12px)" },
                  { key: "xl", label: tUi("themeEditor.radius_xl", currentLanguage) || "Curved (16px)" },
                  { key: "2xl", label: tUi("themeEditor.radius_2xl", currentLanguage) || "Round (24px)" }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onChange({
                      ...theme,
                      uiStyle: { ...theme.uiStyle, borderRadius: item.key as any }
                    })}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                      theme.uiStyle.borderRadius === item.key
                        ? "border-primary bg-primary/5 font-bold text-primary"
                        : "border-border bg-background hover:border-primary/40 text-text"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shadows */}
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
              <div>
                <Label className="text-sm font-bold text-text">{tUi("themeEditor.elevation_shadows", currentLanguage) || "Elevation & Shadows"}</Label>
                <p className="text-xs text-muted-text mt-0.5">{tUi("themeEditor.elevation_shadows_desc", currentLanguage) || "Depth and diffuse ambient lighting"}</p>
              </div>

              <div className="space-y-2">
                {[
                  { key: "none", label: tUi("themeEditor.shadow_none", currentLanguage) || "Flat (No Shadows)", desc: tUi("themeEditor.shadow_none_desc", currentLanguage) || "Strict clean minimalist border look" },
                  { key: "subtle", label: tUi("themeEditor.shadow_subtle", currentLanguage) || "Subtle Elevation", desc: tUi("themeEditor.shadow_subtle_desc", currentLanguage) || "Delicate soft ambient depth" },
                  { key: "medium", label: tUi("themeEditor.shadow_medium", currentLanguage) || "Balanced Elevation", desc: tUi("themeEditor.shadow_medium_desc", currentLanguage) || "Clear layering between surfaces" },
                  { key: "prominent", label: tUi("themeEditor.shadow_prominent", currentLanguage) || "High Contrast", desc: tUi("themeEditor.shadow_prominent_desc", currentLanguage) || "Pronounced floating cards" },
                  { key: "glow", label: tUi("themeEditor.shadow_glow", currentLanguage) || "Accent Glow", desc: tUi("themeEditor.shadow_glow_desc", currentLanguage) || "Luminous neon accent radiance" }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onChange({
                      ...theme,
                      uiStyle: { ...theme.uiStyle, shadows: item.key as any }
                    })}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                      theme.uiStyle.shadows === item.key
                        ? "border-primary bg-primary/5 font-bold"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <span className="text-xs font-semibold text-text block">{item.label}</span>
                    <span className="text-[10px] text-muted-text">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Spacing Presets */}
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
              <div>
                <Label className="text-sm font-bold text-text">{tUi("themeEditor.layout_density", currentLanguage) || "Layout Density"}</Label>
                <p className="text-xs text-muted-text mt-0.5">{tUi("themeEditor.layout_density_desc", currentLanguage) || "Paddings and margins between modules"}</p>
              </div>

              <div className="space-y-2">
                {[
                  { key: "compact", label: tUi("themeEditor.density_compact", currentLanguage) || "Compact Density", desc: tUi("themeEditor.density_compact_desc", currentLanguage) || "Dense information layout for heavy data workflows" },
                  { key: "normal", label: tUi("themeEditor.density_normal", currentLanguage) || "Standard Density", desc: tUi("themeEditor.density_normal_desc", currentLanguage) || "Optimal balance of padding and readability" },
                  { key: "relaxed", label: tUi("themeEditor.density_relaxed", currentLanguage) || "Relaxed & Spacious", desc: tUi("themeEditor.density_relaxed_desc", currentLanguage) || "Airy breathing room tailored for luxury galleries" }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onChange({
                      ...theme,
                      uiStyle: { ...theme.uiStyle, spacing: item.key as any }
                    })}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                      theme.uiStyle.spacing === item.key
                        ? "border-primary bg-primary/5 font-bold"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <span className="text-xs font-semibold text-text block">{item.label}</span>
                    <span className="text-[10px] text-muted-text">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
