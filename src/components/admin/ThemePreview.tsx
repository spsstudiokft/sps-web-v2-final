import React, { useState } from "react";
import { ThemeConfig, evaluateContrast } from "../../lib/themeTypes";
import { useLanguage } from "../../contexts/LanguageContext";
import { 
  Globe, 
  LayoutDashboard, 
  Sun, 
  Moon, 
  Sparkles, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  Sliders, 
  Layers, 
  Check, 
  Users, 
  Search,
  Eye
} from "lucide-react";

interface ThemePreviewProps {
  theme: ThemeConfig;
  previewTarget?: "public" | "admin";
  mode?: "light" | "dark";
  onModeToggle?: () => void;
}

export function ThemePreview({
  theme,
  previewTarget = "public",
  mode: controlledMode,
  onModeToggle,
}: ThemePreviewProps) {
  const { tUi, currentLanguage } = useLanguage();
  const [internalMode, setInternalMode] = useState<"light" | "dark">("dark");
  const [activeTab, setActiveTab] = useState<"public" | "admin">(previewTarget);

  const currentMode = controlledMode || internalMode;
  const toggleMode = onModeToggle || (() => setInternalMode(m => m === "dark" ? "light" : "dark"));

  const colors = theme.colors[currentMode];
  const { typography, uiStyle } = theme;

  // Derive contrast evaluations
  const textBgContrast = evaluateContrast(colors.text, colors.background);
  const textSurfaceContrast = evaluateContrast(colors.text, colors.surface);
  const primaryContrast = evaluateContrast(colors.primaryForeground, colors.primary);
  const accentContrast = evaluateContrast(colors.accentForeground, colors.accent);
  const mutedBgContrast = evaluateContrast(colors.mutedText, colors.background);

  // Border radius style helper
  const getRadiusStyle = () => {
    switch (uiStyle.borderRadius) {
      case "none": return "0px";
      case "sm": return "4px";
      case "md": return "8px";
      case "lg": return "12px";
      case "xl": return "16px";
      case "2xl": return "24px";
      case "full": return "9999px";
      default: return "12px";
    }
  };

  const radiusVal = getRadiusStyle();

  // Shadow style helper
  const getShadowStyle = () => {
    if (currentMode === "dark") {
      switch (uiStyle.shadows) {
        case "none": return "none";
        case "subtle": return "0 2px 4px rgba(0,0,0,0.4)";
        case "medium": return "0 4px 8px rgba(0,0,0,0.5)";
        case "prominent": return "0 10px 20px rgba(0,0,0,0.6)";
        case "glow": return `0 0 16px ${colors.accent}44`;
        default: return "0 2px 4px rgba(0,0,0,0.4)";
      }
    }
    switch (uiStyle.shadows) {
      case "none": return "none";
      case "subtle": return "0 2px 5px rgba(0,0,0,0.06)";
      case "medium": return "0 4px 10px rgba(0,0,0,0.1)";
      case "prominent": return "0 12px 24px rgba(0,0,0,0.12)";
      case "glow": return `0 0 16px ${colors.accent}33`;
      default: return "0 2px 5px rgba(0,0,0,0.06)";
    }
  };

  const shadowVal = getShadowStyle();

  // Heading family inline style
  const headingFontFamily = typography.headingFont.startsWith("System Serif")
    ? 'ui-serif, Georgia, Cambria, serif'
    : typography.headingFont.startsWith("System Sans")
    ? 'ui-sans-serif, system-ui, sans-serif'
    : `"${typography.headingFont}", sans-serif`;

  const bodyFontFamily = typography.bodyFont.startsWith("System Serif")
    ? 'ui-serif, Georgia, Cambria, serif'
    : typography.bodyFont.startsWith("System Sans")
    ? 'ui-sans-serif, system-ui, sans-serif'
    : `"${typography.bodyFont}", sans-serif`;

  const letterSpacingVal = typography.letterSpacing === "wide" ? "0.05em" : typography.letterSpacing === "tight" ? "-0.025em" : "0em";

  return (
    <div className="space-y-4">
      {/* Top Preview Controls Bar */}
      <div className="flex items-center justify-between gap-3 bg-surface p-2.5 rounded-xl border border-border">
        <div className="flex items-center gap-1.5 p-1 bg-background/80 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("public")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "public"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-text hover:text-text"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{tUi("themePreview.public_tab", currentLanguage) || "Public Website Preview"}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("admin")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "admin"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-text hover:text-text"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>{tUi("themePreview.admin_tab", currentLanguage) || "Admin Dashboard Preview"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMode}
            className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-surface text-xs font-medium text-text flex items-center gap-1.5 transition-colors"
            title={`Switch to ${currentMode === "dark" ? "Light" : "Dark"} mode preview`}
          >
            {currentMode === "dark" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>{tUi("themePreview.light_view", currentLanguage) || "Light View"}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>{tUi("themePreview.dark_view", currentLanguage) || "Dark View"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Sandbox Window Container */}
      <div
        className="rounded-2xl border overflow-hidden transition-all duration-300 relative select-none"
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
          color: colors.text,
          fontFamily: bodyFontFamily,
        }}
      >
        {/* Browser / Canvas Header Chrome */}
        <div 
          className="px-4 py-3 border-b flex items-center justify-between text-xs"
          style={{ 
            borderColor: colors.border,
            backgroundColor: colors.surface
          }}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span 
              className="ml-2 px-2.5 py-0.5 rounded-md text-[11px] font-mono opacity-80"
              style={{ backgroundColor: colors.background, color: colors.mutedText }}
            >
              {activeTab === "public" ? "https://spsstudio.com/preview" : "https://spsstudio.com/admin"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="opacity-75">{tUi(`themePresets.${theme.id.replace("preset-", "").replace(/-/g, "_")}.name`, currentLanguage) || theme.name}</span>
            <span 
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${colors.primary}22`, color: colors.primary }}
            >
              {currentMode === "dark" ? (tUi("themeEditor.dark_mode", currentLanguage) || "dark") : (tUi("themeEditor.light_mode", currentLanguage) || "light")}
            </span>
          </div>
        </div>

        {/* Live Canvas Body */}
        <div className="p-5 sm:p-6 space-y-6">

          {/* TAB 1: Public Website Interactive Mockup */}
          {activeTab === "public" && (
            <div className="space-y-6">
              {/* Public Header Bar */}
              <div 
                className="p-3.5 flex items-center justify-between border"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radiusVal,
                  boxShadow: shadowVal
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-7 h-7 flex items-center justify-center font-bold text-xs"
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.primaryForeground,
                      borderRadius: Math.max(4, parseInt(radiusVal) / 2) + "px"
                    }}
                  >
                    SP
                  </div>
                  <span 
                    className="font-bold text-sm"
                    style={{ 
                      fontFamily: headingFontFamily,
                      letterSpacing: letterSpacingVal 
                    }}
                  >
                    SPS STUDIO
                  </span>
                </div>

                <div className="hidden sm:flex items-center gap-4 text-xs font-medium" style={{ color: colors.mutedText }}>
                  <span style={{ color: colors.text }}>{tUi("themePreview.nav_home", currentLanguage) || "Home"}</span>
                  <span>{tUi("themePreview.nav_portfolio", currentLanguage) || "Portfolio"}</span>
                  <span>{tUi("themePreview.nav_services", currentLanguage) || "Services"}</span>
                  <span>{tUi("themePreview.nav_about", currentLanguage) || "About"}</span>
                  <span>{tUi("themePreview.nav_contact", currentLanguage) || "Contact"}</span>
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-semibold transition-transform"
                  style={{
                    backgroundColor: colors.accent,
                    color: colors.accentForeground,
                    borderRadius: radiusVal
                  }}
                >
                  {tUi("themePreview.nav_book_shoot", currentLanguage) || "Book Shoot"}
                </button>
              </div>

              {/* Public Hero Mockup */}
              <div 
                className="p-6 sm:p-8 border text-center relative overflow-hidden"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radiusVal,
                  boxShadow: shadowVal
                }}
              >
                <div 
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider mb-4 border"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.accent,
                    borderRadius: "9999px"
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{tUi("themePreview.hero_badge", currentLanguage) || "Real Estate Media Excellence"}</span>
                </div>

                <h1 
                  className="text-2xl sm:text-3xl font-extrabold max-w-xl mx-auto leading-tight"
                  style={{
                    fontFamily: headingFontFamily,
                    color: colors.text,
                    letterSpacing: letterSpacingVal
                  }}
                >
                  {tUi("themePreview.hero_title", currentLanguage) || "Showcasing Architecture in Pure Light"}
                </h1>

                <p 
                  className="text-xs sm:text-sm mt-3 max-w-md mx-auto leading-relaxed"
                  style={{ color: colors.mutedText }}
                >
                  {tUi("themePreview.hero_subtitle", currentLanguage) || "High-definition architectural photography, twilight captures, drone video tours, and floor planning for premium real estate."}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-bold transition-transform shadow-xs"
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.primaryForeground,
                      borderRadius: radiusVal
                    }}
                  >
                    {tUi("themePreview.btn_explore_portfolio", currentLanguage) || "Explore Portfolio"}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-semibold border transition-colors"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                      borderRadius: radiusVal
                    }}
                  >
                    {tUi("themePreview.btn_view_pricing", currentLanguage) || "View Pricing"}
                  </button>
                </div>
              </div>

              {/* Public Features & Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { title: tUi("themePreview.feature_photo_title", currentLanguage) || "Architectural Photography", desc: tUi("themePreview.feature_photo_desc", currentLanguage) || "Crisp angles, color-accurate post-processing, and natural lighting balance.", icon: Camera, tag: tUi("themePreview.feature_photo_tag", currentLanguage) || "4K HDR" },
                  { title: tUi("themePreview.feature_drone_title", currentLanguage) || "Drone & Aerial Mapping", desc: tUi("themePreview.feature_drone_desc", currentLanguage) || "4K ultra-wide cinematic sweeps showcasing property layout, topography, and surroundings.", icon: Layers, tag: tUi("themePreview.feature_drone_tag", currentLanguage) || "FAA Certified" },
                  { title: tUi("themePreview.feature_staging_title", currentLanguage) || "Virtual Staging & Video", desc: tUi("themePreview.feature_staging_desc", currentLanguage) || "Photorealistic digital furnishing, lighting enhancement, and walkthroughs.", icon: Sparkles, tag: tUi("themePreview.feature_staging_tag", currentLanguage) || "Next-Day Delivery" }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 border flex flex-col justify-between"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radiusVal,
                      boxShadow: shadowVal
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div 
                          className="w-8 h-8 flex items-center justify-center"
                          style={{
                            backgroundColor: `${colors.primary}18`,
                            color: colors.primary,
                            borderRadius: radiusVal
                          }}
                        >
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span 
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            color: colors.mutedText
                          }}
                        >
                          {item.tag}
                        </span>
                      </div>
                      <h4 
                        className="text-xs font-bold mb-1"
                        style={{ fontFamily: headingFontFamily, color: colors.text }}
                      >
                        {item.title}
                      </h4>
                      <p className="text-[11px] leading-relaxed" style={{ color: colors.mutedText }}>
                        {item.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t flex items-center justify-between text-[11px] font-semibold" style={{ borderColor: colors.border }}>
                      <span style={{ color: colors.accent }}>{tUi("themePreview.learn_more", currentLanguage) || "Learn more"}</span>
                      <ArrowUpRight className="w-3 h-3" style={{ color: colors.accent }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Admin Dashboard Interactive Mockup */}
          {activeTab === "admin" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Admin Mini Sidebar */}
              <div 
                className="p-3 border space-y-3 md:col-span-1"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radiusVal,
                  boxShadow: shadowVal
                }}
              >
                <div className="flex items-center gap-2 px-2 pb-2 border-b" style={{ borderColor: colors.border }}>
                  <div 
                    className="w-6 h-6 flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.primaryForeground,
                      borderRadius: "4px"
                    }}
                  >
                    SP
                  </div>
                  <span className="text-xs font-bold truncate" style={{ color: colors.text }}>{tUi("themePreview.admin_sidebar_title", currentLanguage) || "Studio Admin"}</span>
                </div>

                <div className="space-y-1 text-xs font-medium">
                  <div 
                    className="px-2.5 py-1.5 flex items-center gap-2 font-semibold"
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.primaryForeground,
                      borderRadius: radiusVal
                    }}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>{tUi("themePreview.admin_nav_dashboard", currentLanguage) || "Dashboard"}</span>
                  </div>
                  <div 
                    className="px-2.5 py-1.5 flex items-center gap-2 transition-colors opacity-80 hover:opacity-100"
                    style={{ color: colors.mutedText }}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{tUi("themePreview.admin_nav_portfolio", currentLanguage) || "Portfolio"}</span>
                  </div>
                  <div 
                    className="px-2.5 py-1.5 flex items-center gap-2 transition-colors opacity-80 hover:opacity-100"
                    style={{ color: colors.mutedText }}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{tUi("themePreview.admin_nav_clients", currentLanguage) || "Clients"}</span>
                  </div>
                  <div 
                    className="px-2.5 py-1.5 flex items-center gap-2 transition-colors opacity-80 hover:opacity-100"
                    style={{ color: colors.mutedText }}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{tUi("themePreview.admin_nav_settings", currentLanguage) || "Settings"}</span>
                  </div>
                </div>
              </div>

              {/* Admin Mini Content Area */}
              <div className="md:col-span-3 space-y-4">
                {/* Admin Header + Action */}
                <div 
                  className="p-3.5 border flex items-center justify-between"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radiusVal,
                    boxShadow: shadowVal
                  }}
                >
                  <div>
                    <h3 
                      className="text-sm font-bold"
                      style={{ fontFamily: headingFontFamily, color: colors.text }}
                    >
                      {tUi("themePreview.admin_header_title", currentLanguage) || "Project Operations"}
                    </h3>
                    <p className="text-[11px]" style={{ color: colors.mutedText }}>
                      {tUi("themePreview.admin_header_subtitle", currentLanguage) || "Overview of photography bookings and client deliveries."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    style={{
                      backgroundColor: colors.accent,
                      color: colors.accentForeground,
                      borderRadius: radiusVal
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{tUi("themePreview.admin_btn_new_booking", currentLanguage) || "New Booking"}</span>
                  </button>
                </div>

                {/* Admin Stat Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className="p-3 border"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radiusVal
                    }}
                  >
                    <span className="text-[11px] font-medium" style={{ color: colors.mutedText }}>{tUi("themePreview.stat_active_shoots", currentLanguage) || "Active Shoots"}</span>
                    <div className="text-lg font-extrabold mt-1" style={{ color: colors.text }}>18 {tUi("themePreview.stat_listings", currentLanguage) || "Listings"}</div>
                    <span className="text-[10px] font-semibold mt-1 inline-block" style={{ color: colors.accent }}>{tUi("themePreview.stat_week_growth", currentLanguage) || "+12% this week"}</span>
                  </div>

                  <div 
                    className="p-3 border"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radiusVal
                    }}
                  >
                    <span className="text-[11px] font-medium" style={{ color: colors.mutedText }}>{tUi("themePreview.stat_delivered_media", currentLanguage) || "Delivered Media"}</span>
                    <div className="text-lg font-extrabold mt-1" style={{ color: colors.text }}>142 {tUi("themePreview.stat_sets", currentLanguage) || "Sets"}</div>
                    <span className="text-[10px] font-semibold mt-1 inline-block" style={{ color: colors.primary }}>{tUi("themePreview.stat_ontime", currentLanguage) || "100% on-time"}</span>
                  </div>
                </div>

                {/* Admin Mini List / Table Item */}
                <div 
                  className="p-3 border space-y-2 text-xs"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radiusVal
                  }}
                >
                  <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: colors.border }}>
                    <span className="font-bold" style={{ color: colors.text }}>Villa Azure - Twilight Shoot</span>
                    <span 
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md"
                      style={{
                        backgroundColor: `${colors.accent}22`,
                        color: colors.accent
                      }}
                    >
                      {tUi("themePreview.status_ready", currentLanguage) || "Ready for Review"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]" style={{ color: colors.mutedText }}>
                    <span>{tUi("themePreview.client_label", currentLanguage) || "Client"}: Sotheby's Realty</span>
                    <span>{tUi("themePreview.delivered_label", currentLanguage) || "Delivered: 2 hours ago"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Color Palette Inspection Swatches */}
          <div 
            className="p-3.5 border rounded-xl"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border
            }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider mb-2 opacity-75" style={{ color: colors.text }}>
              {tUi("themePreview.palette_swatches_title", currentLanguage) || "Active Palette Swatches"} ({currentMode.toUpperCase()})
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px]">
              <div className="p-2 rounded-lg border text-center" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}>
                <span className="font-bold block truncate">{tUi("themePreview.swatch_background", currentLanguage) || "Background"}</span>
                <span className="font-mono text-[9px] opacity-75">{colors.background}</span>
              </div>
              <div className="p-2 rounded-lg border text-center" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}>
                <span className="font-bold block truncate">{tUi("themePreview.swatch_surface", currentLanguage) || "Surface"}</span>
                <span className="font-mono text-[9px] opacity-75">{colors.surface}</span>
              </div>
              <div className="p-2 rounded-lg border text-center" style={{ backgroundColor: colors.primary, borderColor: colors.border, color: colors.primaryForeground }}>
                <span className="font-bold block truncate">{tUi("themePreview.swatch_primary", currentLanguage) || "Primary"}</span>
                <span className="font-mono text-[9px] opacity-75">{colors.primary}</span>
              </div>
              <div className="p-2 rounded-lg border text-center" style={{ backgroundColor: colors.accent, borderColor: colors.border, color: colors.accentForeground }}>
                <span className="font-bold block truncate">{tUi("themePreview.swatch_accent", currentLanguage) || "Accent"}</span>
                <span className="font-mono text-[9px] opacity-75">{colors.accent}</span>
              </div>
              <div className="p-2 rounded-lg border text-center" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}>
                <span className="font-bold block truncate">{tUi("themePreview.swatch_text", currentLanguage) || "Text"}</span>
                <span className="font-mono text-[9px] opacity-75">{colors.text}</span>
              </div>
              <div className="p-2 rounded-lg border text-center" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.mutedText }}>
                <span className="font-bold block truncate">{tUi("themePreview.swatch_muted", currentLanguage) || "Muted Text"}</span>
                <span className="font-mono text-[9px] opacity-75">{colors.mutedText}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* WCAG Accessibility & Contrast Compliance Card */}
      <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-text">
            <Eye className="w-4 h-4 text-primary" />
            <span>{tUi("themePreview.wcag_audit_title", currentLanguage) || "WCAG 2.1 Contrast & Accessibility Audit"} ({currentMode === "dark" ? (tUi("themeEditor.dark_mode", currentLanguage) || "dark") : (tUi("themeEditor.light_mode", currentLanguage) || "light")})</span>
          </div>
          <span className="text-[11px] text-muted-text">
            {tUi("themePreview.wcag_standard_hint", currentLanguage) || "Standard: AA (≥ 4.5:1 text, ≥ 3.0:1 UI)"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Check 1: Text on Background */}
          <div className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
            textBgContrast.passAA ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300"
          }`}>
            <span className="text-[10px] font-medium opacity-80">{tUi("themePreview.audit_text_bg", currentLanguage) || "Text on Background"}</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-bold text-sm">{textBgContrast.ratio}:1</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-background/50 border border-current">
                {textBgContrast.score}
              </span>
            </div>
          </div>

          {/* Check 2: Text on Surface */}
          <div className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
            textSurfaceContrast.passAA ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300"
          }`}>
            <span className="text-[10px] font-medium opacity-80">{tUi("themePreview.audit_text_surface", currentLanguage) || "Text on Surface"}</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-bold text-sm">{textSurfaceContrast.ratio}:1</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-background/50 border border-current">
                {textSurfaceContrast.score}
              </span>
            </div>
          </div>

          {/* Check 3: Primary Action Button */}
          <div className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
            primaryContrast.passAA ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300"
          }`}>
            <span className="text-[10px] font-medium opacity-80">{tUi("themePreview.audit_primary_btn", currentLanguage) || "Primary Action Button"}</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-bold text-sm">{primaryContrast.ratio}:1</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-background/50 border border-current">
                {primaryContrast.score}
              </span>
            </div>
          </div>

          {/* Check 4: Muted Text */}
          <div className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
            mutedBgContrast.passAALarge ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
          }`}>
            <span className="text-[10px] font-medium opacity-80">{tUi("themePreview.audit_muted_text", currentLanguage) || "Muted Text Visibility"}</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-bold text-sm">{mutedBgContrast.ratio}:1</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-background/50 border border-current">
                {mutedBgContrast.score}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
