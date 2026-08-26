import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Language, TranslationItem, TranslationStats } from "../../lib/types";
import { defaultLocales, enTranslations } from "../../lib/translations";
import {
  compareTranslationGroups,
  getTranslationGroup,
  getTranslationGroupLabel,
} from "../../lib/translationGroups";
import { useLanguage } from "../../contexts/LanguageContext";
import { useApi } from "../../hooks/useApi";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { 
  Globe, 
  Search, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  RefreshCw,
  Languages,
  Database,
  Save,
  Loader2,
  Sparkles,
  Info,
  CheckCircle2,
  Filter,
  Eye,
  EyeOff,
  Copy,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal
} from "lucide-react";

interface TranslationsManagerProps {
  supportedLanguages: Language[];
  defaultLanguage: string;
  customTranslations?: string | Record<string, Record<string, string>>;
  onChange?: (translationsJson: string) => void;
}

export function TranslationsManager({
  supportedLanguages,
  defaultLanguage,
  onChange,
}: TranslationsManagerProps) {
  const { currentLang, tUi, reloadTranslations } = useLanguage();
  const { fetchApi } = useApi();

  const [selectedLang, setSelectedLang] = useState<string>(() => {
    return supportedLanguages[0]?.code || "en";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<"all" | "missing" | "modified">("all");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // New key inputs
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Database translations state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [stats, setStats] = useState<TranslationStats | null>(null);
  const [missingReport, setMissingReport] = useState<{
    totalCodebaseKeys: number;
    totalDbKeys: number;
    missingInDb: string[];
    missingByLocale: Record<string, string[]>;
  } | null>(null);
  
  // Local working copy of all translations: Record<locale, Record<key, string>>
  const [dbDictionaries, setDbDictionaries] = useState<Record<string, Record<string, string>>>({});
  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set()); // compound `${locale}:${key}`

  // Fetch initial translations & statistics from API
  const fetchAllTranslations = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch full translations dictionary
      const transRes = await fetch("/api/public/translations");
      if (transRes.ok) {
        const dicts = await transRes.json();
        setDbDictionaries(dicts || {});
      }

      // Fetch statistics
      const statsRes = await fetchApi("/api/admin/translations/stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch missing report
      const missingRes = await fetchApi("/api/admin/translations/missing");
      if (missingRes.ok) {
        const rep = await missingRes.json();
        setMissingReport(rep);
      }

      setModifiedKeys(new Set());
    } catch (err) {
      console.error("Failed to load translations in manager:", err);
      setDbDictionaries(defaultLocales);
    } finally {
      setLoading(false);
    }
  }, [fetchApi]);

  useEffect(() => {
    fetchAllTranslations();
  }, [fetchAllTranslations]);

  // Combine all known keys across dictionaries and hardcoded sources
  const allKeys = useMemo(() => {
    const keysSet = new Set<string>(Object.keys(enTranslations));
    Object.values(dbDictionaries).forEach((langDict) => {
      if (typeof langDict === "object" && langDict !== null) {
        Object.keys(langDict).forEach((k) => keysSet.add(k));
      }
    });
    return Array.from(keysSet).sort();
  }, [dbDictionaries]);

  // Extract unique group categories
  const categories = useMemo(() => {
    const groupsSet = new Set<string>();
    allKeys.forEach((key) => groupsSet.add(getTranslationGroup(key)));

    const list = Array.from(groupsSet).sort(compareTranslationGroups);
    return [
      { id: "all", label: getTranslationGroupLabel("all"), count: allKeys.length },
      ...list.map((g) => ({
        id: g,
        label: getTranslationGroupLabel(g),
        count: allKeys.filter((key) => getTranslationGroup(key) === g).length,
      })),
    ];
  }, [allKeys]);

  // Count missing and modified keys for currently selected language
  const { missingCount, modifiedCount } = useMemo(() => {
    let missing = 0;
    let modified = 0;
    const currentDict = dbDictionaries[selectedLang] || {};

    allKeys.forEach((k) => {
      const val = currentDict[k];
      if (!val || val.trim() === "") {
        missing++;
      }
      if (modifiedKeys.has(`${selectedLang}:${k}`)) {
        modified++;
      }
    });

    return { missingCount: missing, modifiedCount: modified };
  }, [allKeys, dbDictionaries, selectedLang, modifiedKeys]);

  // Filtered keys based on search, group, and filter mode
  const filteredKeys = useMemo(() => {
    return allKeys.filter((key) => {
      const group = getTranslationGroup(key);

      const matchesCategory = selectedCategory === "all" || selectedCategory === group;
      if (!matchesCategory) return false;

      const englishVal = dbDictionaries["en"]?.[key] || enTranslations[key] || "";
      const currentVal = dbDictionaries[selectedLang]?.[key] ?? "";
      const isMissing = !currentVal || currentVal.trim() === "";
      const isModified = modifiedKeys.has(`${selectedLang}:${key}`);

      if (filterMode === "missing" && !isMissing) return false;
      if (filterMode === "modified" && !isModified) return false;

      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      return (
        key.toLowerCase().includes(query) ||
        englishVal.toLowerCase().includes(query) ||
        currentVal.toLowerCase().includes(query)
      );
    });
  }, [allKeys, selectedCategory, searchQuery, selectedLang, dbDictionaries, filterMode, modifiedKeys]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, selectedLang, filterMode]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredKeys.length / pageSize));
  const paginatedKeys = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredKeys.slice(start, start + pageSize);
  }, [filteredKeys, page, pageSize]);

  // Handle inline value edit
  const handleValueChange = (key: string, value: string) => {
    setDbDictionaries((prev) => ({
      ...prev,
      [selectedLang]: {
        ...(prev[selectedLang] || {}),
        [key]: value,
      },
    }));

    setModifiedKeys((prev) => {
      const next = new Set(prev);
      next.add(`${selectedLang}:${key}`);
      return next;
    });
  };

  // Copy English reference to target field
  const handleCopyEnglish = (key: string) => {
    const enVal = dbDictionaries["en"]?.[key] || enTranslations[key] || "";
    if (enVal) {
      handleValueChange(key, enVal);
    }
  };

  // Save all modified keys to database
  const handleSaveToDatabase = async () => {
    if (modifiedKeys.size === 0) return;

    try {
      setSaving(true);
      const itemsToSave: Array<{ locale: string; key: string; value: string; group_name?: string }> = [];

      modifiedKeys.forEach((compoundKey) => {
        const [locale, ...keyParts] = compoundKey.split(":");
        const key = keyParts.join(":");
        const value = dbDictionaries[locale]?.[key] ?? "";
        const group_name = getTranslationGroup(key);

        itemsToSave.push({
          locale,
          key,
          value,
          group_name,
        });
      });

      const response = await fetchApi("/api/admin/translations/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToSave }),
      });

      if (!response.ok) {
        throw new Error(tUi("admin.translation_editor.save_failed", currentLang));
      }

      await reloadTranslations();
      setModifiedKeys(new Set());
      setStatusMessage({
        type: "success",
        text: tUi("admin.translation_editor.saved", currentLang, { count: itemsToSave.length }),
      });
      setTimeout(() => setStatusMessage(null), 4000);

      // Refresh stats & missing report
      const [statsRes, missingRes] = await Promise.all([
        fetchApi("/api/admin/translations/stats"),
        fetchApi("/api/admin/translations/missing"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (missingRes.ok) setMissingReport(await missingRes.json());
    } catch (err: any) {
      console.error("Save error:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to save translations.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Add new translation key
  const handleAddCustomKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = newKey.trim();
    if (!cleanKey) return;

    try {
      const group = newGroup.trim() || getTranslationGroup(cleanKey);
      
      const res = await fetchApi("/api/admin/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: selectedLang,
          key: cleanKey,
          value: newValue,
          group_name: group,
        }),
      });

      if (!res.ok) throw new Error(tUi("admin.translation_editor.add_failed", currentLang));

      // Update local state
      setDbDictionaries((prev) => ({
        ...prev,
        [selectedLang]: {
          ...(prev[selectedLang] || {}),
          [cleanKey]: newValue,
        },
      }));

      await reloadTranslations();
      setNewKey("");
      setNewValue("");
      setNewGroup("");
      setStatusMessage({
        type: "success",
        text: tUi("admin.translation_editor.added", currentLang, { key: cleanKey, locale: selectedLang.toUpperCase() }),
      });
      setTimeout(() => setStatusMessage(null), 3500);

      const statsRes = await fetchApi("/api/admin/translations/stats");
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to add translation key.",
      });
    }
  };

  // Scan codebase and import missing keys
  const handleScanAndImportCodebase = async () => {
    try {
      setScanning(true);
      setStatusMessage({
        type: "info",
        text: tUi("admin.translation_editor.scanning", currentLang),
      });

      const res = await fetchApi("/api/admin/translations/scan-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });

      if (!res.ok) throw new Error(tUi("admin.translation_editor.scan_failed", currentLang));
      const result = await res.json();

      await reloadTranslations();
      await fetchAllTranslations();

      setStatusMessage({
        type: "success",
        text: tUi("admin.translation_editor.scan_complete", currentLang, { count: result.importedCount || 0 }),
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error("Scan error:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to scan and import translation keys.",
      });
    } finally {
      setScanning(false);
    }
  };

  // Re-sync all translations from hardcoded files to DB
  const handleMigrateFromFiles = async () => {
    const confirm = window.confirm(tUi("admin.translation_editor.sync_confirm", currentLang));
    if (!confirm) return;

    try {
      setMigrating(true);
      const res = await fetchApi("/api/admin/translations/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });

      if (!res.ok) throw new Error(tUi("admin.translation_editor.sync_failed", currentLang));
      const result = await res.json();

      await reloadTranslations();
      await fetchAllTranslations();

      setStatusMessage({
        type: "success",
        text: tUi("admin.translation_editor.sync_complete", currentLang, { count: result.importedCount, locales: result.locales?.length || 0 }),
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to execute translation migration.",
      });
    } finally {
      setMigrating(false);
    }
  };

  // Delete key for current locale
  const handleDeleteKeyLocale = async (key: string) => {
    if (!window.confirm(tUi("admin.translation_editor.delete_confirm", currentLang, { key, locale: selectedLang.toUpperCase() }))) return;

    try {
      const res = await fetchApi(`/api/admin/translations/${encodeURIComponent(selectedLang)}/${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(tUi("admin.translation_editor.delete_failed", currentLang));

      setDbDictionaries((prev) => {
        const nextLang = { ...(prev[selectedLang] || {}) };
        delete nextLang[key];
        return { ...prev, [selectedLang]: nextLang };
      });

      await reloadTranslations();
      setStatusMessage({
        type: "success",
        text: tUi("admin.translation_editor.deleted", currentLang, { key, locale: selectedLang.toUpperCase() }),
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to delete translation.",
      });
    }
  };

  // Export JSON file
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbDictionaries, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `database-translations-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON file
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (typeof parsed === "object" && parsed !== null) {
            const items: Array<{ locale: string; key: string; value: string; group_name?: string }> = [];
            for (const [loc, dict] of Object.entries(parsed)) {
              if (typeof dict === "object" && dict !== null) {
                for (const [k, v] of Object.entries(dict as Record<string, string>)) {
                  items.push({
                    locale: loc,
                    key: k,
                    value: String(v),
                    group_name: getTranslationGroup(k),
                  });
                }
              }
            }

            if (items.length > 0) {
              const res = await fetchApi("/api/admin/translations/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items }),
              });

              if (!res.ok) throw new Error(tUi("admin.translation_editor.import_failed", currentLang));
              await fetchAllTranslations();
              await reloadTranslations();
              setStatusMessage({
                type: "success",
                text: tUi("admin.translation_editor.imported", currentLang, { count: items.length }),
              });
              setTimeout(() => setStatusMessage(null), 4000);
            }
          }
        } catch (err: any) {
          alert("Invalid JSON format in uploaded file: " + err.message);
        }
      };
    }
  };

  const currentLangObj = supportedLanguages.find((l) => l.code === selectedLang) || { code: selectedLang, name: selectedLang };
  const unsavedCount = modifiedKeys.size;

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats & Automated Tools */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-semibold text-text flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <span>{tUi("admin.translation_editor.title", currentLang)}</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Active & Synced
              </span>
            </div>
            <p className="text-xs text-muted-text max-w-3xl">
              Manage all user-facing interface copy and public content across multiple locales. Keys are resolved hierarchically with automatic database fallback and instant cache invalidation.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {unsavedCount > 0 && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSaveToDatabase}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs animate-pulse cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Changes ({unsavedCount})</span>
              </Button>
            )}

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleScanAndImportCodebase}
              disabled={scanning || loading}
              title={tUi("admin.translation_editor.scan_help", currentLang)}
              className="flex items-center gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            >
              {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{tUi("admin.translation_editor.scan", currentLang)}</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleMigrateFromFiles}
              disabled={migrating}
              title={tUi("admin.translation_editor.sync_help", currentLang)}
              className="flex items-center gap-1.5 text-xs cursor-pointer"
            >
              {migrating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>{tUi("admin.translation_editor.sync", currentLang)}</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{tUi("admin.translation_editor.export", currentLang)}</span>
            </Button>

            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface hover:bg-surface/80 border border-border rounded-lg text-text transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>{tUi("admin.translation_editor.import", currentLang)}</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>
        </div>

        {/* Live Translation Health Summary Bar */}
        {stats && (
          <div className="pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-background/60 border border-border/50">
              <span className="text-[11px] text-muted-text block">{tUi("admin.translation_editor.total_keys", currentLang)}</span>
              <strong className="text-sm font-semibold text-text font-mono">{stats.totalKeys.toLocaleString()}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-background/60 border border-border/50">
              <span className="text-[11px] text-muted-text block">{tUi("admin.translation_editor.total_records", currentLang)}</span>
              <strong className="text-sm font-semibold text-text font-mono">{stats.totalTranslations.toLocaleString()}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-background/60 border border-border/50">
              <span className="text-[11px] text-muted-text block">Target ({selectedLang.toUpperCase()}) Status</span>
              <strong className={`text-sm font-semibold ${missingCount > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                {missingCount === 0 ? "100% Complete" : `${missingCount} Missing`}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-background/60 border border-border/50">
              <span className="text-[11px] text-muted-text block">{tUi("admin.translation_editor.locales", currentLang)}</span>
              <strong className="text-sm font-semibold text-text">{Object.keys(stats.locales).join(", ").toUpperCase()}</strong>
            </div>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
          statusMessage.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            : statusMessage.type === "info"
            ? "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400"
            : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
        }`}>
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : statusMessage.type === "info" ? (
            <Info className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Language Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
        <span className="text-xs font-semibold text-muted-text uppercase tracking-wider pr-2 shrink-0">
          Target Language:
        </span>
        {supportedLanguages.map((lang) => {
          const isSelected = selectedLang === lang.code;
          const isDefault = defaultLanguage === lang.code;
          const isEnabled = lang.enabled !== false;
          const localeCount = Object.keys(dbDictionaries[lang.code] || {}).length;

          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setSelectedLang(lang.code)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface text-muted-text hover:text-text border border-border"
              }`}
            >
              <span>{lang.name || lang.code}</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${isSelected ? "bg-black/20 text-white" : "bg-muted-text/10"}`}>
                {lang.code} ({localeCount})
              </span>
              {isDefault ? (
                <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 rounded font-bold">
                  {tUi("admin.languages.default")}</span>
              ) : !isEnabled ? (
                <span className={`text-[10px] px-1 rounded font-semibold ${isSelected ? "bg-black/30 text-white/90" : "bg-slate-500/10 text-slate-500"}`}>
                  {tUi("admin.clients.status_disabled")}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Disabled Language Status Banner */}
      {(() => {
        const activeLangObj = supportedLanguages.find((l) => l.code === selectedLang);
        if (activeLangObj && activeLangObj.enabled === false) {
          return (
            <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-400 text-xs flex items-center gap-2">
              <EyeOff className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {tUi("admin.translation_editor.disabled_notice", currentLang, { language: activeLangObj.name || activeLangObj.code })}
              </span>
            </div>
          );
        }
        return null;
      })()}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder={tUi("admin.translation_editor.search", currentLang)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Filter Toggles */}
          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterMode === "all" ? "bg-background text-text font-semibold shadow-xs" : "text-muted-text hover:text-text"
              }`}
            >
              All ({allKeys.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("missing")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                filterMode === "missing" ? "bg-background text-red-500 font-semibold shadow-xs" : "text-muted-text hover:text-text"
              }`}
            >
              <span>{tUi("admin.translation_editor.missing", currentLang)}</span>
              {missingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/10 text-red-500 font-mono">
                  {missingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("modified")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                filterMode === "modified" ? "bg-background text-amber-500 font-semibold shadow-xs" : "text-muted-text hover:text-text"
              }`}
            >
              <span>{tUi("admin.translation_editor.modified", currentLang)}</span>
              {modifiedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/10 text-amber-500 font-mono">
                  {modifiedCount}
                </span>
              )}
            </button>
          </div>

          {/* Group Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Add New Key Form */}
      <div className="p-3.5 bg-surface/50 border border-dashed border-border rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-text flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-primary" />
            <span>{tUi("admin.translation_editor.create_key", currentLang)}</span>
          </Label>
          <span className="text-[11px] text-muted-text">Inserts directly to DB for {currentLangObj.name}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-4">
            <Input
              placeholder={tUi("admin.translation_editor.key_placeholder", currentLang)}
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="text-xs"
            />
          </div>
          <div className="sm:col-span-6">
            <Input
              placeholder={`Translation text in ${currentLangObj.name}`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomKey();
                }
              }}
              className="text-xs"
            />
          </div>
          <div className="sm:col-span-2">
            <Button 
              type="button" 
              size="sm" 
              variant="secondary" 
              onClick={handleAddCustomKey}
              className="w-full text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tUi("admin.translation_editor.add_key", currentLang)}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Translation Keys Table */}
      <div className="border border-border rounded-2xl overflow-hidden bg-background shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-muted-text flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs">{tUi("admin.translation_editor.loading", currentLang)}</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paginatedKeys.length === 0 ? (
              <div className="p-10 text-center text-muted-text text-sm flex flex-col items-center gap-2">
                <Info className="w-6 h-6 text-muted-text/50" />
                <span>{tUi("admin.translation_editor.empty", currentLang)}</span>
                {filterMode !== "all" && (
                  <button
                    type="button"
                    onClick={() => setFilterMode("all")}
                    className="text-xs text-primary hover:underline cursor-pointer pt-1"
                  >
                    Clear filter mode
                  </button>
                )}
              </div>
            ) : (
              paginatedKeys.map((key) => {
                const defaultEnglish = dbDictionaries["en"]?.[key] || enTranslations[key] || "";
                const displayValue = dbDictionaries[selectedLang]?.[key] ?? "";
                const isModified = modifiedKeys.has(`${selectedLang}:${key}`);
                const hasValue = displayValue.trim() !== "";
                const groupName = getTranslationGroup(key);

                return (
                  <div key={key} className="p-3.5 hover:bg-surface/50 transition-colors grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-xs">
                    {/* Key and Reference */}
                    <div className="lg:col-span-4 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface border border-border text-muted-text">
                          {getTranslationGroupLabel(groupName)}
                        </span>
                        <span className="font-mono text-text font-semibold truncate select-all" title={key}>
                          {key}
                        </span>
                        {isModified && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            unsaved
                          </span>
                        )}
                        {!hasValue && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                            missing
                          </span>
                        )}
                      </div>
                      {defaultEnglish && (
                        <div className="text-muted-text text-[11px] truncate flex items-center gap-1" title={defaultEnglish}>
                          <span className="font-medium text-muted-text/70 shrink-0">EN:</span>
                          <span className="truncate">{defaultEnglish}</span>
                        </div>
                      )}
                    </div>

                    {/* Translation Input */}
                    <div className="lg:col-span-7 flex items-center gap-1.5">
                      <Input
                        value={displayValue}
                        placeholder={defaultEnglish ? `Fallback (EN): ${defaultEnglish}` : "Enter translation..."}
                        onChange={(e) => handleValueChange(key, e.target.value)}
                        className={`text-xs py-1.5 h-8 flex-1 ${
                          isModified 
                            ? "border-amber-500/50 bg-amber-500/5" 
                            : !hasValue 
                            ? "border-red-500/40 bg-red-500/5" 
                            : ""
                        }`}
                      />
                      {selectedLang !== "en" && defaultEnglish && (
                        <button
                          type="button"
                          onClick={() => handleCopyEnglish(key)}
                          title={tUi("admin.translation_editor.copy_english", currentLang)}
                          className="p-1.5 rounded-lg border border-border hover:bg-surface text-muted-text hover:text-text transition-colors cursor-pointer shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="lg:col-span-1 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteKeyLocale(key)}
                        className="p-1.5 rounded-lg text-muted-text hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title={tUi("admin.translation_editor.delete_locale", currentLang)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer info bar & Pagination Controls */}
        <div className="px-4 py-3 bg-surface border-t border-border flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-text gap-3">
          <div className="flex items-center gap-3">
            <span>
              {tUi("admin.translation_editor.showing", currentLang, { start: filteredKeys.length === 0 ? 0 : (page - 1) * pageSize + 1, end: Math.min(page * pageSize, filteredKeys.length), total: filteredKeys.length })}
            </span>
            {unsavedCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                <span>{unsavedCount} unsaved change(s)</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[11px]">{tUi("admin.translation_editor.rows", currentLang)}:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-7 px-2 text-xs bg-background border border-border rounded text-text cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-border bg-background hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title={tUi("admin.translation_editor.previous", currentLang)}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 py-0.5 font-mono text-text text-xs">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-border bg-background hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title={tUi("admin.translation_editor.next", currentLang)}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
