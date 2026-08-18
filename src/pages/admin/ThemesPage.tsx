import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ThemeConfig, 
  THEME_PRESETS, 
  AVAILABLE_FONTS 
} from "../../lib/themeTypes";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { ThemeEditor } from "../../components/admin/ThemeEditor";
import { ThemePreview } from "../../components/admin/ThemePreview";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useApi } from "../../hooks/useApi";
import { useTheme } from "../../components/ThemeProvider";
import { useLanguage } from "../../contexts/LanguageContext";
import { 
  Palette, 
  Globe, 
  LayoutDashboard, 
  Check, 
  Save, 
  Plus, 
  Copy, 
  Trash2, 
  Download, 
  Upload, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FolderHeart,
  Image as ImageIcon,
  X
} from "lucide-react";

export default function ThemesPage() {
  const { tUi, currentLanguage } = useLanguage();
  usePageTitle(tUi("admin.themes.page_title", currentLanguage) || "Theme & Branding Studio");
  const { fetchApi } = useApi();
  const { publicTheme, adminTheme, setPublicTheme, setAdminTheme, reloadThemes, mode, setMode } = useTheme();

  const [activeTarget, setActiveTarget] = useState<"public" | "admin">("public");
  const [themesList, setThemesList] = useState<Array<{ id: string; name: string; description?: string; target: string; isPreset: boolean; config: ThemeConfig }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active working theme copies for live editing before saving
  const [currentPublicTheme, setCurrentPublicTheme] = useState<ThemeConfig>(publicTheme || THEME_PRESETS[0]);
  const [currentAdminTheme, setCurrentAdminTheme] = useState<ThemeConfig>(adminTheme || THEME_PRESETS[0]);

  // Modal for creating / duplicating custom theme
  const [isNewThemeModalOpen, setIsNewThemeModalOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeDescription, setNewThemeDescription] = useState("");
  const [newThemeTarget, setNewThemeTarget] = useState<"public" | "admin" | "both">("both");
  const [newThemeBasePreset, setNewThemeBasePreset] = useState<string>("preset-modern-minimal");

  // Fetch all themes and settings from API
  const fetchThemesAndSettings = async () => {
    try {
      setLoading(true);
      const [themesRes, settingsRes] = await Promise.all([
        fetchApi("/api/admin/themes"),
        fetchApi("/api/admin/settings")
      ]);

      let loadedThemes: any[] = [];
      if (themesRes.ok) {
        loadedThemes = await themesRes.json();
      }

      // Merge preset themes if any are missing
      const presetIds = new Set(loadedThemes.map((t) => t.id));
      THEME_PRESETS.forEach((preset) => {
        if (!presetIds.has(preset.id)) {
          loadedThemes.push({
            id: preset.id,
            name: preset.name,
            description: preset.description,
            target: preset.target,
            isPreset: true,
            config: preset
          });
        }
      });

      setThemesList(loadedThemes);

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        if (settings.theme_public_config) {
          try {
            const p = JSON.parse(settings.theme_public_config);
            setCurrentPublicTheme(p);
            setPublicTheme(p);
          } catch (e) {}
        }
        if (settings.theme_admin_config) {
          try {
            const a = JSON.parse(settings.theme_admin_config);
            setCurrentAdminTheme(a);
            setAdminTheme(a);
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemesAndSettings();
  }, []);

  // Show notification banner
  const showBanner = (text: string, type: "success" | "error" = "success") => {
    setBannerMessage({ text, type });
    setTimeout(() => setBannerMessage(null), 4000);
  };

  // Active theme being edited based on activeTarget tab
  const activeWorkingTheme = activeTarget === "public" ? currentPublicTheme : currentAdminTheme;
  const setActiveWorkingTheme = (updated: ThemeConfig) => {
    if (activeTarget === "public") {
      setCurrentPublicTheme(updated);
      setPublicTheme(updated); // Update live context for immediate dynamic styling
    } else {
      setCurrentAdminTheme(updated);
      setAdminTheme(updated); // Update live context for immediate dynamic styling
    }
  };

  // Apply & Persist active themes to database
  const handleSaveAndApply = async () => {
    try {
      setSaving(true);
      const res = await fetchApi("/api/admin/themes/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicTheme: currentPublicTheme,
          adminTheme: currentAdminTheme,
          publicThemeId: currentPublicTheme.id,
          adminThemeId: currentAdminTheme.id
        })
      });

      if (!res.ok) {
        throw new Error("Failed to save and apply themes.");
      }

      await reloadThemes();
      showBanner(tUi("themeManager.theme_saved", currentLanguage) || "Theme styling successfully saved and applied to website and dashboard!");
    } catch (err: any) {
      showBanner(err.message || "Failed to apply themes", "error");
    } finally {
      setSaving(false);
    }
  };

  // Save current theme as a custom reusable theme in DB
  const handleSaveCustomTheme = async () => {
    const themeToSave = activeWorkingTheme;
    try {
      setSaving(true);
      if (themeToSave.isPreset || !themeToSave.id.startsWith("custom-theme-")) {
        // Prompt for custom theme name
        setNewThemeName(`${themeToSave.name} (Custom Copy)`);
        setNewThemeDescription(`Customized styling based on ${themeToSave.name}`);
        setNewThemeTarget(activeTarget);
        setIsNewThemeModalOpen(true);
        setSaving(false);
        return;
      }

      // Update existing custom theme
      const res = await fetchApi(`/api/admin/themes/${themeToSave.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: themeToSave.name,
          description: themeToSave.description,
          target: themeToSave.target,
          config: themeToSave
        })
      });

      if (!res.ok) throw new Error("Failed to update custom theme");
      const msg = tUi("themeManager.theme_updated", { name: themeToSave.name }, currentLanguage);
      showBanner(msg);
      fetchThemesAndSettings();
    } catch (err: any) {
      showBanner(err.message || "Failed to update custom theme", "error");
    } finally {
      setSaving(false);
    }
  };

  // Create new custom theme handler
  const handleCreateNewThemeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThemeName.trim()) return;

    try {
      setSaving(true);
      const basePreset = THEME_PRESETS.find((p) => p.id === newThemeBasePreset) || activeWorkingTheme;
      const themeConfig = {
        ...basePreset,
        name: newThemeName.trim(),
        description: newThemeDescription.trim(),
        target: newThemeTarget
      };

      const res = await fetchApi("/api/admin/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newThemeName.trim(),
          description: newThemeDescription.trim(),
          target: newThemeTarget,
          config: themeConfig
        })
      });

      if (!res.ok) throw new Error("Failed to create new theme");
      const created = await res.json();

      setIsNewThemeModalOpen(false);
      setNewThemeName("");
      setNewThemeDescription("");

      const msg = tUi("themeManager.theme_created", { name: themeConfig.name }, currentLanguage);
      showBanner(msg);
      await fetchThemesAndSettings();

      // Set as active working theme
      if (created.theme?.config) {
        setActiveWorkingTheme(created.theme.config);
      }
    } catch (err: any) {
      showBanner(err.message || "Failed to create theme", "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete custom theme
  const handleDeleteTheme = async (themeId: string, themeName: string) => {
    const confirmPrompt = tUi("themeManager.delete_theme_confirm", { name: themeName }, currentLanguage);
    if (!confirm(confirmPrompt)) return;

    try {
      const res = await fetchApi(`/api/admin/themes/${themeId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete theme");
      const msg = tUi("themeManager.theme_deleted", { name: themeName }, currentLanguage);
      showBanner(msg);
      fetchThemesAndSettings();
    } catch (err: any) {
      showBanner(err.message || "Failed to delete theme", "error");
    }
  };

  // Export theme as JSON file
  const handleExportThemeJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeWorkingTheme, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeWorkingTheme.name.toLowerCase().replace(/\s+/g, "-")}-theme.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showBanner(tUi("themeManager.json_exported", currentLanguage));
  };

  // Import theme from JSON file
  const handleImportThemeJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.colors || !parsed.typography) {
          throw new Error("Invalid theme JSON structure");
        }
        setActiveWorkingTheme({
          ...parsed,
          id: `custom-theme-${Date.now()}`,
          isPreset: false
        });
        const msg = tUi("themeManager.json_imported", { name: parsed.name || "Custom" }, currentLanguage);
        showBanner(msg);
      } catch (err) {
        showBanner(tUi("themeManager.invalid_json", currentLanguage), "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <PageHeader
        title={tUi("themeManager.title", currentLanguage) || "Theme & Branding Studio"}
        subtitle={
          tUi("themeManager.subtitle", currentLanguage) ||
          "Design, customize, and switch themes for the public website and admin dashboard with live preview."
        }
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/admin/settings"
              className="px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-background text-text text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>{tUi("admin.branding.title", currentLanguage) || "Logos & Favicon"}</span>
            </Link>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsNewThemeModalOpen(true)}
              className="text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{tUi("themeManager.create_custom", currentLanguage) || "Create Custom Theme"}</span>
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndApply}
              disabled={saving}
              className="text-xs flex items-center gap-1.5 shadow-xs"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? (tUi("themeManager.saving", currentLanguage) || "Saving...") : (tUi("themeManager.save_apply", currentLanguage) || "Save & Apply Active Themes")}</span>
            </Button>
          </div>
        }
      />

      {/* Notification Banner */}
      {bannerMessage && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center gap-2.5 animate-in fade-in duration-150 ${
            bannerMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
          }`}
          role="status"
        >
          {bannerMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{bannerMessage.text}</span>
        </div>
      )}

      {/* Target Layout Switcher (Public Website vs Admin Dashboard) */}
      <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-background rounded-xl border border-border flex items-center">
            <button
              type="button"
              onClick={() => setActiveTarget("public")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTarget === "public"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-text hover:text-text"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{tUi("themeManager.public_theme", currentLanguage) || "Public Website Theme"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTarget("admin")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTarget === "admin"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-text hover:text-text"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{tUi("themeManager.admin_theme", currentLanguage) || "Admin Dashboard Theme"}</span>
            </button>
          </div>
        </div>

        {/* Quick Actions (Export / Import / New) */}
        <div className="flex items-center gap-2 text-xs">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleImportThemeJson}
              className="hidden"
            />
            <span className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-surface text-text font-medium flex items-center gap-1.5 transition-colors">
              <Upload className="w-3.5 h-3.5 text-muted-text" />
              <span>{tUi("themeManager.import_json", currentLanguage) || "Import JSON"}</span>
            </span>
          </label>

          <button
            type="button"
            onClick={handleExportThemeJson}
            className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-surface text-text font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-muted-text" />
            <span>{tUi("themeManager.export_json", currentLanguage) || "Export JSON"}</span>
          </button>
        </div>
      </div>

      {/* Two-Column Studio Layout: Theme Controls & Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Theme Editor Controls (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    <span>
                      {activeTarget === "public"
                        ? (tUi("themeManager.editing_public", currentLanguage) || "Editing Public Website")
                        : (tUi("themeManager.editing_admin", currentLanguage) || "Editing Admin Dashboard")}: {tUi(`themePresets.${activeWorkingTheme.id.replace("preset-", "").replace(/-/g, "_")}.name`, currentLanguage) || activeWorkingTheme.name}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {tUi("themeManager.editor_desc", currentLanguage) || "Customize colors, fonts, and shapes. Changes reflect in real-time in the live preview."}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveCustomTheme}
                    className="text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <FolderHeart className="w-3.5 h-3.5 text-primary" />
                    <span>{tUi("themeManager.save_library", currentLanguage) || "Save to Library"}</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ThemeEditor
                theme={activeWorkingTheme}
                onChange={setActiveWorkingTheme}
                target={activeTarget}
              />
            </CardContent>
          </Card>

          {/* Theme Library & Saved Themes Accordion/Grid */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>{tUi("themeManager.library_title", currentLanguage) || "Available Theme Library"} ({themesList.length})</span>
                </CardTitle>
                <span className="text-xs text-muted-text">{tUi("themeManager.library_hint", currentLanguage) || "Click any theme to apply to workspace"}</span>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {themesList.map((t) => {
                  const isCurrent = activeWorkingTheme.name === t.name;
                  const config = t.config || THEME_PRESETS[0];
                  const presetKey = t.id.replace("preset-", "").replace(/-/g, "_");
                  const displayName = tUi(`themePresets.${presetKey}.name`, currentLanguage) || t.name;
                  const displayDesc = tUi(`themePresets.${presetKey}.desc`, currentLanguage) || t.description;

                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                        isCurrent
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border bg-surface hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="cursor-pointer flex-1" onClick={() => setActiveWorkingTheme(config)}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text">{displayName}</span>
                            {t.isPreset ? (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-surface border border-border text-muted-text">
                                {tUi("themeManager.badge_preset", currentLanguage) || "Preset"}
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                {tUi("themeManager.badge_custom", currentLanguage) || "Custom"}
                              </span>
                            )}
                          </div>
                          {displayDesc && (
                            <p className="text-[11px] text-muted-text mt-1 line-clamp-1">{displayDesc}</p>
                          )}
                        </div>

                        {!t.isPreset && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTheme(t.id, t.name)}
                            className="p-1 text-muted-text hover:text-red-500 rounded-md transition-colors"
                            title="Delete custom theme"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Swatches preview */}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/60">
                        <div className="flex items-center gap-1.5">
                          <span 
                            className="w-3 h-3 rounded-full border border-black/10 shadow-2xs" 
                            style={{ backgroundColor: config.colors?.light?.primary || "#0f172a" }} 
                            title="Primary Color"
                          />
                          <span 
                            className="w-3 h-3 rounded-full border border-black/10 shadow-2xs" 
                            style={{ backgroundColor: config.colors?.light?.accent || "#3b82f6" }} 
                            title="Accent Color"
                          />
                          <span 
                            className="w-3 h-3 rounded-full border border-black/10 shadow-2xs" 
                            style={{ backgroundColor: config.colors?.light?.background || "#ffffff" }} 
                            title="Background Color"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveWorkingTheme(config)}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          {isCurrent
                            ? (tUi("themeManager.active_in_editor", currentLanguage) || "Active In Editor")
                            : (tUi("themeManager.load_theme", currentLanguage) || "Load Theme")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Interactive Sandbox Preview & WCAG Audit (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-20 space-y-6">
            <Card className="border-border shadow-xs overflow-hidden">
              <CardHeader className="pb-3 border-b border-border bg-surface/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>{tUi("themeManager.live_preview", currentLanguage) || "Live Interactive Preview"}</span>
                  </CardTitle>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                    {tUi("themeManager.realtime_badge", currentLanguage) || "Real-time"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <ThemePreview
                  theme={activeWorkingTheme}
                  previewTarget={activeTarget}
                />
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      {/* Modal Dialog for creating a custom theme */}
      {isNewThemeModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsNewThemeModalOpen(false)}
        >
          <div
            className="bg-background border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Palette className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-text">{tUi("themeManager.modal_create_title", currentLanguage) || "Create Custom Theme"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewThemeModalOpen(false)}
                className="p-1.5 text-muted-text hover:text-text rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewThemeSubmit} className="p-6 space-y-4">
              <div>
                <Label htmlFor="new-theme-name">{tUi("themeManager.modal_name_label", currentLanguage) || "Theme Name"}</Label>
                <Input
                  id="new-theme-name"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder={tUi("themeManager.modal_name_placeholder", currentLanguage) || "e.g. Nordic Twilight 2026"}
                  className="mt-1.5"
                  required
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="new-theme-description">{tUi("themeManager.modal_desc_label", currentLanguage) || "Description (Optional)"}</Label>
                <Input
                  id="new-theme-description"
                  value={newThemeDescription}
                  onChange={(e) => setNewThemeDescription(e.target.value)}
                  placeholder={tUi("themeManager.modal_desc_placeholder", currentLanguage) || "e.g. Architectural earth tones with serif headings"}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="new-theme-target">{tUi("themeManager.modal_target_label", currentLanguage) || "Designated Target"}</Label>
                <select
                  id="new-theme-target"
                  value={newThemeTarget}
                  onChange={(e) => setNewThemeTarget(e.target.value as any)}
                  className="mt-1.5 w-full px-3 py-2 text-xs border border-border rounded-xl bg-background text-text outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="both">{tUi("themeManager.modal_target_both", currentLanguage) || "Both Website & Dashboard"}</option>
                  <option value="public">{tUi("themeManager.modal_target_public", currentLanguage) || "Public Website Only"}</option>
                  <option value="admin">{tUi("themeManager.modal_target_admin", currentLanguage) || "Admin Dashboard Only"}</option>
                </select>
              </div>

              <div>
                <Label htmlFor="new-theme-base">{tUi("themeManager.modal_base_label", currentLanguage) || "Base Template / Preset"}</Label>
                <select
                  id="new-theme-base"
                  value={newThemeBasePreset}
                  onChange={(e) => setNewThemeBasePreset(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 text-xs border border-border rounded-xl bg-background text-text outline-none focus:ring-2 focus:ring-primary"
                >
                  {THEME_PRESETS.map((p) => {
                    const pKey = p.id.replace("preset-", "").replace(/-/g, "_");
                    const pName = tUi(`themePresets.${pKey}.name`, currentLanguage) || p.name;
                    return (
                      <option key={p.id} value={p.id}>{pName} ({p.typography.headingFont})</option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsNewThemeModalOpen(false)}
                >
                  {tUi("themeManager.modal_btn_cancel", currentLanguage) || "Cancel"}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (tUi("themeManager.modal_btn_creating", currentLanguage) || "Creating...") : (tUi("themeManager.modal_btn_create", currentLanguage) || "Create Theme")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
