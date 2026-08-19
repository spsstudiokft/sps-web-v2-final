import React, { useState, useEffect } from "react";
import { SocialTreeNode, SocialNodeType } from "../../lib/types";
import { 
  SOCIAL_PLATFORMS, 
  GROUP_ICON_OPTIONS, 
  BRAND_COLOR_PRESETS, 
  getPlatformPreset, 
  SocialIconRenderer 
} from "../../lib/socialPresets";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Card } from "../ui/Card";
import { TranslatableInput } from "./TranslatableInput";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  X,
  FolderTree,
  Link as LinkIcon,
  Sparkles,
  ExternalLink,
  Check,
  AlertCircle,
  Eye,
  Layers,
  Palette,
  Hash,
  ChevronRight
} from "lucide-react";

interface SocialNodeModalProps {
  isOpen: boolean;
  node: Partial<SocialTreeNode> | null;
  allGroups: SocialTreeNode[];
  defaultParentId?: string | null;
  defaultType?: SocialNodeType;
  siteLanguages?: string;
  onClose: () => void;
  onSave: (nodeData: Partial<SocialTreeNode>) => Promise<void>;
}

export function SocialNodeModal({
  isOpen,
  node,
  allGroups,
  defaultParentId = null,
  defaultType = "link",
  siteLanguages = "en",
  onClose,
  onSave,
}: SocialNodeModalProps) {
  const { currentLanguage, tUi } = useLanguage();
  
  const [formData, setFormData] = useState<Partial<SocialTreeNode>>({
    type: defaultType,
    parent_id: defaultParentId,
    title: "",
    subtitle: "",
    platform: "instagram",
    url: "",
    icon: "instagram",
    badge: "",
    color: "#E4405F",
    is_enabled: 1,
    is_expanded_default: 1,
    sort_order: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (node) {
      setFormData({
        id: node.id,
        type: node.type || "link",
        parent_id: node.parent_id !== undefined ? node.parent_id : null,
        title: node.title || "",
        subtitle: node.subtitle || "",
        platform: node.platform || (node.type === "group" ? "custom" : "instagram"),
        url: node.url || "",
        icon: node.icon || (node.type === "group" ? "share-2" : "instagram"),
        badge: node.badge || "",
        color: node.color || (node.type === "group" ? "#3B82F6" : "#E4405F"),
        is_enabled: node.is_enabled !== undefined ? node.is_enabled : 1,
        is_expanded_default: node.is_expanded_default !== undefined ? node.is_expanded_default : 1,
        sort_order: node.sort_order || 0,
      });
    } else {
      const initPlatform = defaultType === "group" ? "custom" : "instagram";
      const preset = getPlatformPreset(initPlatform);
      setFormData({
        type: defaultType,
        parent_id: defaultParentId,
        title: "",
        subtitle: "",
        platform: initPlatform,
        url: "",
        icon: defaultType === "group" ? "share-2" : preset.icon,
        badge: defaultType === "group" ? "" : (preset.defaultBadge || ""),
        color: defaultType === "group" ? "#3B82F6" : preset.color,
        is_enabled: 1,
        is_expanded_default: 1,
        sort_order: 0,
      });
    }
    setErrorMessage("");
  }, [node, defaultParentId, defaultType, isOpen]);

  if (!isOpen) return null;

  const handlePlatformSelect = (platId: string) => {
    const preset = getPlatformPreset(platId);
    setFormData(prev => ({
      ...prev,
      platform: platId,
      icon: preset.icon,
      color: preset.color,
      badge: prev.badge ? prev.badge : (preset.defaultBadge || ""),
      title: prev.title || preset.name,
      url: prev.url ? prev.url : (platId === "custom" ? "" : preset.urlPlaceholder)
    }));
  };

  const handleTypeChange = (newType: SocialNodeType) => {
    if (newType === "group") {
      setFormData(prev => ({
        ...prev,
        type: "group",
        platform: "custom",
        icon: prev.icon && GROUP_ICON_OPTIONS.some(g => g.id === prev.icon) ? prev.icon : "share-2",
        color: prev.color || "#3B82F6",
        url: ""
      }));
    } else {
      const preset = getPlatformPreset(formData.platform === "custom" ? "instagram" : formData.platform);
      setFormData(prev => ({
        ...prev,
        type: "link",
        platform: preset.id,
        icon: preset.icon,
        color: preset.color,
        badge: prev.badge || preset.defaultBadge || ""
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = typeof formData.title === "string" ? formData.title.trim() : "";
    if (!trimmedTitle) {
      setErrorMessage(tUi("admin.social.error_enter_title", currentLanguage) || "Please enter a title.");
      return;
    }

    let finalUrl = typeof formData.url === "string" ? formData.url.trim() : "";
    if (formData.type === "link") {
      if (!finalUrl) {
        setErrorMessage(tUi("admin.social.error_enter_url", currentLanguage) || "Please enter a destination URL for this social link.");
        return;
      }
      const isSpecialScheme = /^(mailto:|tel:|wa\.me|t\.me|https?:\/\/|\/\/)/i.test(finalUrl);
      if (!isSpecialScheme && !finalUrl.includes(".")) {
        setErrorMessage(tUi("admin.social.error_invalid_url", currentLanguage) || "Please enter a valid URL (e.g. https://... or mailto:)");
        return;
      }
      // If user typed e.g. "instagram.com/username", auto-prefix https://
      if (!isSpecialScheme && (finalUrl.startsWith("www.") || finalUrl.includes("."))) {
        finalUrl = `https://${finalUrl}`;
      }
    } else {
      finalUrl = "";
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await onSave({
        ...formData,
        title: trimmedTitle,
        subtitle: typeof formData.subtitle === "string" ? formData.subtitle.trim() : "",
        url: finalUrl,
        badge: typeof formData.badge === "string" ? formData.badge.trim() : "",
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || tUi("admin.social.error_save_failed", currentLanguage) || "Failed to save node. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(formData.id);
  const availableParentGroups = allGroups.filter(g => g.id !== formData.id);

  return (
    <div 
      className="fixed inset-0 z-50 flex h-[100dvh] items-center justify-center overflow-hidden bg-black/60 p-2 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl">
        
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/50 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: formData.color || "#3B82F6" }}
            >
              <SocialIconRenderer 
                platform={formData.platform} 
                icon={formData.icon} 
                type={formData.type} 
                className="w-5 h-5 text-white" 
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-text sm:text-lg">
                {isEditing
                  ? (formData.type === "group" ? tUi("admin.social.modal_edit_group", currentLanguage) : tUi("admin.social.modal_edit_link", currentLanguage))
                  : (formData.type === "group" ? tUi("admin.social.modal_create_group", currentLanguage) : tUi("admin.social.modal_create_link", currentLanguage))}
              </h2>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-text sm:text-xs">
                {formData.type === "group" 
                  ? tUi("admin.social.modal_group_subtitle", currentLanguage)
                  : tUi("admin.social.modal_link_subtitle", currentLanguage)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 text-muted-text hover:text-text rounded-xl hover:bg-surface transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:space-y-6 sm:p-5">
          {errorMessage && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Node Type Selector (Group vs Link) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-text">
              {tUi("admin.social.node_type", currentLanguage)}
            </Label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange("link")}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  formData.type === "link"
                    ? "border-primary bg-primary/5 text-text font-semibold shadow-xs"
                    : "border-border bg-surface/50 text-muted-text hover:text-text hover:bg-surface"
                }`}
              >
                <div className={`p-2 rounded-xl ${formData.type === "link" ? "bg-primary text-background" : "bg-surface text-muted-text"}`}>
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-sm leading-none">{tUi("admin.social.type_link", currentLanguage)}</div>
                  <div className="text-xs text-muted-text font-normal mt-1">{tUi("admin.social.type_link_desc", currentLanguage)}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange("group")}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  formData.type === "group"
                    ? "border-primary bg-primary/5 text-text font-semibold shadow-xs"
                    : "border-border bg-surface/50 text-muted-text hover:text-text hover:bg-surface"
                }`}
              >
                <div className={`p-2 rounded-xl ${formData.type === "group" ? "bg-primary text-background" : "bg-surface text-muted-text"}`}>
                  <FolderTree className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-sm leading-none">{tUi("admin.social.type_group", currentLanguage)}</div>
                  <div className="text-xs text-muted-text font-normal mt-1">{tUi("admin.social.type_group_desc", currentLanguage)}</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Parent Group Selector */}
          <div className="space-y-2">
            <Label htmlFor="parent_id" className="text-xs font-semibold uppercase tracking-wider text-muted-text">
              {tUi("admin.social.parent_group", currentLanguage)}
            </Label>
            <select
              id="parent_id"
              value={formData.parent_id || ""}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
              className="w-full h-11 px-3.5 rounded-2xl border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="">{tUi("admin.social.root_level", currentLanguage)}</option>
              {availableParentGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  📁 {g.title}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Platform Presets (For Links) */}
          {formData.type === "link" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-text">
                {tUi("admin.social.platform_preset", currentLanguage)}
              </Label>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface/40 p-2 sm:max-h-36">
                {SOCIAL_PLATFORMS.map((plat) => {
                  const isSelected = formData.platform === plat.id;
                  return (
                    <button
                      key={plat.id}
                      type="button"
                      onClick={() => handlePlatformSelect(plat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-background shadow-xs font-semibold"
                          : "border-border bg-background text-muted-text hover:text-text hover:bg-surface"
                      }`}
                    >
                      <SocialIconRenderer platform={plat.id} className="w-3.5 h-3.5" color={isSelected ? "currentColor" : plat.color} />
                      <span>{plat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Group Icon Options (For Groups) */}
          {formData.type === "group" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-text">
                {tUi("admin.social.group_icon", currentLanguage)}
              </Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GROUP_ICON_OPTIONS.map((opt) => {
                  const isSelected = formData.icon === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: opt.id })}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-xs transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border bg-background text-muted-text hover:text-text hover:bg-surface"
                      }`}
                    >
                      <SocialIconRenderer type="group" icon={opt.id} className="w-4 h-4" />
                      <span className="truncate w-full text-center">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Title & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-text">
                {formData.type === "group" ? tUi("admin.social.group_title", currentLanguage) : tUi("admin.social.link_title", currentLanguage)} *
              </Label>
              <Input
                id="title"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={formData.type === "group" ? "e.g. Main Socials" : "e.g. Instagram"}
                required
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle" className="text-xs font-semibold uppercase tracking-wider text-muted-text">
                {tUi("admin.social.subtitle_label", currentLanguage)}
              </Label>
              <Input
                id="subtitle"
                value={formData.subtitle || ""}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder={formData.type === "group" ? "e.g. Official channels" : "e.g. @spsstudio"}
                className="h-11 rounded-2xl"
              />
            </div>
          </div>

          {/* 6. Target URL (For Links) */}
          {formData.type === "link" && (
            <div className="space-y-2">
              <Label htmlFor="url" className="text-xs font-semibold uppercase tracking-wider text-muted-text">
                {tUi("admin.social.target_url", currentLanguage)} *
              </Label>
              <div className="relative">
                <Input
                  id="url"
                  value={formData.url || ""}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://instagram.com/spsstudio or wa.me/..."
                  className="h-11 rounded-2xl pl-10"
                />
                <ExternalLink className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* 7. Brand Color & Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-text">
                {tUi("admin.social.brand_color", currentLanguage)}
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color || "#3B82F6"}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 rounded-xl border border-border cursor-pointer bg-transparent p-0.5"
                />
                <Input
                  value={formData.color || ""}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#E4405F"
                  className="h-10 rounded-xl font-mono text-xs uppercase"
                />
              </div>
              {/* Quick Swatches */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {BRAND_COLOR_PRESETS.slice(0, 8).map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    title={preset.name}
                    onClick={() => setFormData({ ...formData, color: preset.color })}
                    className="w-5 h-5 rounded-full border border-border/60 hover:scale-110 transition-transform"
                    style={{ backgroundColor: preset.color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge" className="text-xs font-semibold uppercase tracking-wider text-muted-text">
                {tUi("admin.social.badge_label", currentLanguage)}
              </Label>
              <Input
                id="badge"
                value={formData.badge || ""}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                placeholder="e.g. Daily, 4K Video, Fast Reply"
                className="h-10 rounded-2xl"
              />
              <p className="text-[11px] text-muted-text">
                {tUi("admin.social.badge_hint", currentLanguage)}
              </p>
            </div>
          </div>

          {/* 8. Status Switches & Options */}
          <div className="p-4 bg-surface/50 border border-border rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_enabled"
                checked={Boolean(formData.is_enabled)}
                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked ? 1 : 0 })}
                className="w-5 h-5 rounded-lg border-border text-primary focus:ring-primary accent-primary cursor-pointer"
              />
              <label htmlFor="is_enabled" className="text-sm font-medium text-text cursor-pointer">
                {tUi("admin.social.is_enabled_label", currentLanguage)}
                <span className="block text-xs text-muted-text font-normal">
                  {tUi("admin.social.is_enabled_hint", currentLanguage)}
                </span>
              </label>
            </div>

            {formData.type === "group" && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_expanded_default"
                  checked={Boolean(formData.is_expanded_default)}
                  onChange={(e) => setFormData({ ...formData, is_expanded_default: e.target.checked ? 1 : 0 })}
                  className="w-5 h-5 rounded-lg border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <label htmlFor="is_expanded_default" className="text-sm font-medium text-text cursor-pointer">
                  {tUi("admin.social.is_expanded_label", currentLanguage)}
                </label>
              </div>
            )}
          </div>

          {/* 9. Live Preview Card */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-text flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {tUi("admin.social.live_preview_card", currentLanguage)}
            </Label>
            
            {formData.type === "group" ? (
              <div className="p-4 rounded-2xl border border-border bg-surface/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: formData.color || "#3B82F6" }}
                  >
                    <SocialIconRenderer type="group" icon={formData.icon} className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-text">{formData.title || "Group Title"}</div>
                    {formData.subtitle && <div className="text-xs text-muted-text">{formData.subtitle}</div>}
                  </div>
                </div>
                {formData.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    {formData.badge}
                  </span>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl border border-border bg-surface/80 hover:bg-surface flex items-center justify-between transition-all group">
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm shrink-0 shadow-xs"
                    style={{ backgroundColor: formData.color || "#E4405F" }}
                  >
                    <SocialIconRenderer platform={formData.platform} icon={formData.icon} className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text truncate flex items-center gap-2">
                      <span>{formData.title || "Social Platform"}</span>
                      {formData.badge && (
                        <span className="px-2 py-0.2 text-[10px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                          {formData.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-text truncate">{formData.subtitle || formData.url || "https://..."}</div>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center text-muted-text group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
          </div>

          </div>

          {/* Modal Actions */}
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-background/95 p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:p-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full rounded-2xl sm:w-auto"
            >
              {tUi("common.cancel", currentLanguage)}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl sm:w-auto sm:min-w-28"
            >
              {isSubmitting 
                ? tUi("common.saving", currentLanguage)
                : (isEditing ? tUi("common.save_changes", currentLanguage) : tUi("admin.social.create_btn", currentLanguage))}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
