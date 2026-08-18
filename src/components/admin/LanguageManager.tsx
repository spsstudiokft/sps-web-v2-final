import { useState, useEffect, useMemo } from "react";
import { Language } from "../../lib/types";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useLanguage } from "../../contexts/LanguageContext";
import { 
  Globe, 
  Plus, 
  Trash2, 
  Check, 
  Star, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Sparkles,
  Info,
  Layers,
  HelpCircle
} from "lucide-react";

// Standard preset options for easy one-click addition
const PRESET_LANGUAGES: Array<{ code: string; name: string; flag: string }> = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "hu", name: "Magyar", flag: "🇭🇺" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
];

export function LanguageManager({
  siteLanguages,
  defaultLanguage,
  onChange,
}: {
  siteLanguages: string;
  defaultLanguage: string;
  onChange: (langs: string, defLang: string) => void;
}) {
  const { currentLanguage, tUi } = useLanguage();
  const [langs, setLangs] = useState<Language[]>([
    { code: "en", name: "English", enabled: true },
    { code: "hu", name: "Magyar", enabled: true },
  ]);
  const [def, setDef] = useState("en");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      let parsedDef = defaultLanguage || "en";
      setDef(parsedDef);

      if (siteLanguages) {
        const parsed = JSON.parse(siteLanguages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized: Language[] = parsed.map((l: any) => ({
            code: String(l.code || "").trim().toLowerCase(),
            name: String(l.name || l.code || "").trim(),
            // Default language is ALWAYS enabled; for others, default to true if missing
            enabled: l.code === parsedDef ? true : (l.enabled !== false),
            flag: l.flag,
          })).filter(l => Boolean(l.code));

          if (normalized.length > 0) {
            setLangs(normalized);
          }
        }
      }
    } catch (e) {
      console.error("LanguageManager parse error:", e);
    }
  }, [siteLanguages, defaultLanguage]);

  const save = (newLangs: Language[], newDef: string) => {
    // Ensure default language is always enabled
    const sanitizedLangs = newLangs.map((l) => ({
      ...l,
      enabled: l.code === newDef ? true : (l.enabled !== false),
    }));

    setLangs(sanitizedLangs);
    setDef(newDef);
    onChange(JSON.stringify(sanitizedLangs), newDef);
  };

  // Add custom empty language
  const addLang = () => {
    const newLangs = [...langs, { code: "", name: "", enabled: true }];
    save(newLangs, def);
  };

  // Add from preset
  const addPresetLang = (preset: { code: string; name: string }) => {
    if (langs.some((l) => l.code === preset.code)) {
      setWarningMessage(`Language "${preset.name}" (${preset.code}) is already added.`);
      setTimeout(() => setWarningMessage(null), 3000);
      return;
    }
    const newLangs = [...langs, { code: preset.code, name: preset.name, enabled: true }];
    save(newLangs, def);
  };

  // Remove language
  const removeLang = (index: number) => {
    if (langs.length <= 1) return;
    const toRemove = langs[index];
    if (toRemove.code === def) {
      setWarningMessage("Cannot remove the default language. Change the default language first.");
      setTimeout(() => setWarningMessage(null), 3500);
      return;
    }

    const newLangs = langs.filter((_, i) => i !== index);
    const newDef = newLangs.find(l => l.code === def) ? def : (newLangs[0]?.code || "en");
    save(newLangs, newDef);
  };

  // Update language fields (code, name)
  const updateLang = (index: number, field: keyof Language, value: any) => {
    const newLangs = [...langs];
    newLangs[index] = { ...newLangs[index], [field]: value };
    save(newLangs, def);
  };

  // Toggle enabled/disabled state
  const toggleLanguageEnabled = (index: number) => {
    const lang = langs[index];
    const isCurrentlyEnabled = lang.enabled !== false;

    // Check if this is the default language
    if (lang.code === def && isCurrentlyEnabled) {
      setWarningMessage("The default language cannot be disabled. Set another language as default before disabling this one.");
      setTimeout(() => setWarningMessage(null), 4000);
      return;
    }

    // Check if this is the last enabled language
    const currentlyEnabledCount = langs.filter((l) => l.enabled !== false).length;
    if (isCurrentlyEnabled && currentlyEnabledCount <= 1) {
      setWarningMessage("At least one language must remain enabled.");
      setTimeout(() => setWarningMessage(null), 3500);
      return;
    }

    const newLangs = [...langs];
    newLangs[index] = { ...newLangs[index], enabled: !isCurrentlyEnabled };
    save(newLangs, def);
  };

  // Set default language
  const setDefaultLanguage = (code: string) => {
    if (!code) return;
    const newLangs = langs.map((l) => ({
      ...l,
      // If language is chosen as default, automatically enable it
      enabled: l.code === code ? true : l.enabled,
    }));
    save(newLangs, code);
  };

  // Enable all languages
  const enableAllLanguages = () => {
    const newLangs = langs.map((l) => ({ ...l, enabled: true }));
    save(newLangs, def);
  };

  // Stats computation
  const totalCount = langs.length;
  const enabledCount = langs.filter((l) => l.enabled !== false).length;
  const disabledCount = totalCount - enabledCount;

  // Presets available to add (not yet in list)
  const availablePresets = useMemo(() => {
    return PRESET_LANGUAGES.filter((p) => !langs.some((l) => l.code.toLowerCase() === p.code.toLowerCase()));
  }, [langs]);

  return (
    <div className="space-y-5">
      {/* Overview & Quick Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-background border border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Globe className="w-4.5 h-4.5" aria-hidden="true" />
          </div>
          <div>
            <div className="text-sm font-bold text-text flex items-center gap-2">
              <span>{tUi("admin.languages.configured_locales", currentLanguage) || "Configured Languages"}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-primary/10 text-primary border border-primary/20">
                {enabledCount} / {totalCount} {tUi("admin.languages.active", currentLanguage) || "Active"}
              </span>
            </div>
            <p className="text-xs text-muted-text">
              {enabledCount > 1 
                ? (tUi("admin.languages.selector_visible_hint", currentLanguage) || "Language selector will be shown to visitors with these enabled options.")
                : (tUi("admin.languages.selector_hidden_hint", currentLanguage) || "Frontend language selector is automatically hidden because only 1 language is active.")}
            </p>
          </div>
        </div>

        {disabledCount > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={enableAllLanguages}
            className="text-xs font-semibold shrink-0"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5 text-primary" />
            {tUi("admin.languages.enable_all", currentLanguage) || "Enable All Languages"}
          </Button>
        )}
      </div>

      {/* Warning / Notification Banner */}
      {warningMessage && (
        <div 
          className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-150"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{warningMessage}</span>
        </div>
      )}

      {/* Language List Table / Cards */}
      <div className="space-y-3">
        {langs.map((l, i) => {
          const isEnabled = l.enabled !== false;
          const isDefault = def === l.code && l.code !== "";

          return (
            <div
              key={i}
              className={`p-4 rounded-xl border transition-all ${
                isEnabled
                  ? "bg-surface border-border hover:border-primary/40 shadow-2xs"
                  : "bg-surface/40 border-border/60 opacity-80"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Language identification & Inputs */}
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                  {/* Code input */}
                  <div className="w-24">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-text font-bold mb-1 block">
                      {tUi("admin.languages.code", currentLanguage) || "Code"}
                    </Label>
                    <Input
                      placeholder="e.g. en"
                      value={l.code}
                      onChange={(e) => updateLang(i, "code", e.target.value.toLowerCase().trim())}
                      className="text-xs font-mono font-bold uppercase bg-background"
                      maxLength={8}
                    />
                  </div>

                  {/* Name input */}
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-text font-bold mb-1 block">
                      {tUi("admin.languages.display_name", currentLanguage) || "Display Name"}
                    </Label>
                    <Input
                      placeholder="e.g. English"
                      value={l.name}
                      onChange={(e) => updateLang(i, "name", e.target.value)}
                      className="text-xs font-medium bg-background"
                    />
                  </div>
                </div>

                {/* Controls: Enabled Toggle, Default Selector, Remove */}
                <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
                  
                  {/* Enable / Disable Toggle Button */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      onClick={() => toggleLanguageEnabled(i)}
                      disabled={isDefault}
                      title={
                        isDefault 
                          ? "Default language cannot be disabled" 
                          : isEnabled 
                            ? "Click to disable language (hides from visitor selector)" 
                            : "Click to enable language (shows in visitor selector)"
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isDefault
                          ? "bg-emerald-500/80 cursor-not-allowed opacity-90"
                          : isEnabled
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : "bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    
                    <span 
                      onClick={() => !isDefault && toggleLanguageEnabled(i)}
                      className={`text-xs font-semibold cursor-pointer select-none px-2 py-0.5 rounded-md ${
                        isEnabled
                          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                          : "text-muted-text bg-surface border border-border"
                      }`}
                    >
                      {isEnabled 
                        ? (tUi("admin.languages.enabled", currentLanguage) || "Enabled") 
                        : (tUi("admin.languages.disabled", currentLanguage) || "Disabled")}
                    </span>
                  </div>

                  {/* Default Language Selector Button */}
                  <button
                    type="button"
                    onClick={() => setDefaultLanguage(l.code)}
                    disabled={isDefault || !l.code}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isDefault
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold"
                        : "bg-background hover:bg-surface border border-border text-muted-text hover:text-text cursor-pointer"
                    }`}
                    title={isDefault ? "Current default fallback language" : "Set as primary default language"}
                  >
                    <Star className={`w-3.5 h-3.5 ${isDefault ? "fill-amber-500 text-amber-500" : "text-muted-text"}`} />
                    <span>{isDefault ? (tUi("admin.languages.default", currentLanguage) || "Default") : (tUi("admin.languages.set_default", currentLanguage) || "Set Default")}</span>
                  </button>

                  {/* Remove Button */}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeLang(i)}
                    disabled={langs.length <= 1 || isDefault}
                    title={isDefault ? "Cannot remove default language" : "Remove language"}
                    className="text-xs text-muted-text hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 border-transparent hover:border-red-500/20 p-2 h-8"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom / Presets Footer */}
      <div className="p-4 rounded-xl bg-background border border-border space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-text flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>{tUi("admin.languages.quick_presets", currentLanguage) || "Quick Add Supported Presets:"}</span>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addLang}
            className="text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
            <span>{tUi("admin.languages.add_custom", currentLanguage) || "Add Custom Locale"}</span>
          </Button>
        </div>

        {availablePresets.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {availablePresets.map((preset) => (
              <button
                key={preset.code}
                type="button"
                onClick={() => addPresetLang(preset)}
                className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-primary/10 border border-border hover:border-primary/30 text-xs font-medium text-text flex items-center gap-1.5 transition-colors group cursor-pointer"
              >
                <span>{preset.flag}</span>
                <span>{preset.name}</span>
                <span className="text-[10px] font-mono text-muted-text group-hover:text-primary uppercase">({preset.code})</span>
                <Plus className="w-3 h-3 text-muted-text group-hover:text-primary ml-0.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Informative Guidance Note */}
      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 text-muted-text text-xs space-y-1">
        <div className="font-semibold text-text flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{tUi("admin.languages.info_title", currentLanguage) || "Language Behavior & Fallback Details"}</span>
        </div>
        <p className="leading-relaxed">
          {tUi("admin.languages.info_description", currentLanguage) || 
            "Disabled languages will not appear in the frontend language switcher, but all their translations in the database remain completely intact. You can continue editing or updating their translations in the tab below at any time."}
        </p>
      </div>
    </div>
  );
}
