import { useLanguage } from "../../contexts/LanguageContext";
import React, { useState, useEffect } from "react";
import { Service } from "../../lib/types";
import { TranslatableInput } from "./TranslatableInput";
import { ServiceIcon, AVAILABLE_SERVICE_ICONS, ServiceIconOption } from "../common/ServiceIcon";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Card } from "../ui/Card";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { uploadMediaFile } from "../../lib/uploadHelper";
import { 
  X, 
  Upload, 
  Search, 
  Sparkles, 
  Link as LinkIcon, 
  Eye, 
  AlertCircle, 
  Check, 
  Image as ImageIcon 
} from "lucide-react";

interface ServiceModalProps {
  isOpen: boolean;
  service: Partial<Service> | null;
  siteLanguages: string;
  onClose: () => void;
  onSave: (serviceData: Partial<Service>) => Promise<void>;
}

export function ServiceModal({
  isOpen,
  service,
  siteLanguages,
  onClose,
  onSave,
}: ServiceModalProps) {
  const { tUi } = useLanguage();
  const { fetchApi } = useApi();
  const [formData, setFormData] = useState<Partial<Service>>({
    title: "",
    description: "",
    icon: "camera",
    image_url: "",
    link_url: "",
    link_text: "",
    is_published: 1,
    sort_order: 0,
  });

  const [iconSearch, setIconSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"preset" | "image">("preset");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (service) {
      setFormData({
        id: service.id,
        title: service.title || "",
        description: service.description || "",
        icon: service.icon || "camera",
        image_url: service.image_url || "",
        link_url: service.link_url || "",
        link_text: service.link_text || "",
        is_published: service.is_published !== undefined ? service.is_published : 1,
        sort_order: service.sort_order || 0,
      });
      if (service.image_url) {
        setActiveTab("image");
      } else {
        setActiveTab("preset");
      }
    } else {
      setFormData({
        title: "",
        description: "",
        icon: "camera",
        image_url: "",
        link_url: "",
        link_text: "",
        is_published: 1,
        sort_order: 0,
      });
      setActiveTab("preset");
    }
    setErrorMessage("");
  }, [service, isOpen]);

  const { token } = useAuth();

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorMessage("");

      const uploadResult = await uploadMediaFile(file, { token });

      setFormData((prev) => ({
        ...prev,
        image_url: uploadResult.url,
      }));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const parseTitleText = (val: string | undefined): string => {
    if (!val) return "";
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === "object" && parsed !== null) {
        return Object.values(parsed).find((v) => typeof v === "string" && v.trim() !== "") as string || "";
      }
    } catch {
      return val.trim();
    }
    return val.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const titleText = parseTitleText(formData.title);
    if (!titleText) {
      setErrorMessage("Please enter a service title.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredIcons = AVAILABLE_SERVICE_ICONS.filter((item) =>
    item.name.toLowerCase().includes(iconSearch.toLowerCase()) ||
    item.id.toLowerCase().includes(iconSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(iconSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-background border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-surface/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">
                {formData.id ? "Edit Service" : "Create New Service"}
              </h2>
              <p className="text-xs text-muted-text">
                {tUi("admin.services.modal_subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-text hover:text-text hover:bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form id="service-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Title & Description */}
          <div className="space-y-4">
            <TranslatableInput
              label="Service Title *"
              value={formData.title}
              onChange={(val) => setFormData((prev) => ({ ...prev, title: val }))}
              siteLanguages={siteLanguages}
            />

            <TranslatableInput
              label="Description"
              value={formData.description || ""}
              onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
              siteLanguages={siteLanguages}
              isTextarea={true}
            />
          </div>

          {/* Icon & Visual Representation */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-text">{tUi("admin.services.label_visual")}</Label>
              <div className="flex items-center p-1 bg-surface rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("preset")}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    activeTab === "preset"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  {tUi("admin.services.tab_preset")}</button>
                <button
                  type="button"
                  onClick={() => setActiveTab("image")}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    activeTab === "image"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  {tUi("admin.services.tab_image")}</button>
              </div>
            </div>

            {activeTab === "preset" ? (
              <div className="space-y-3 border border-border rounded-xl p-4 bg-surface/30">
                {/* Search Preset Icons */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
                  <Input
                    placeholder={tUi("admin.services.search_icons_placeholder")}
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>

                {/* Grid of icons */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredIcons.map((item) => {
                    const isSelected = formData.icon === item.id && !formData.image_url;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            icon: item.id,
                            image_url: "",
                          }));
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary"
                            : "bg-surface border-border text-muted-text hover:text-text hover:border-primary/40 hover:bg-surface/80"
                        }`}
                      >
                        <ServiceIcon icon={item.id} className="w-5 h-5 mb-1.5" />
                        <span className="text-[11px] font-medium leading-tight truncate w-full">
                          {item.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3 border border-border rounded-xl p-4 bg-surface/30">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-text mb-1 block">{tUi("admin.services.label_image_url")}</Label>
                    <Input
                      placeholder={tUi("admin.services.image_url_placeholder")}
                      value={formData.image_url || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, image_url: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-surface hover:bg-surface/80 border border-border rounded-lg text-sm font-medium text-text transition-colors">
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? "Uploading..." : "Upload File"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {formData.image_url && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-12 h-12 rounded-lg border border-border overflow-hidden bg-background shrink-0">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs text-muted-text truncate flex-1">
                      {formData.image_url}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData((prev) => ({ ...prev, image_url: "" }))}
                      className="text-red-500 hover:text-red-600"
                    >
                      {tUi("admin.services.remove_image")}</Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Optional Call to Action Link */}
          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium text-text">{tUi("admin.services.section_cta")}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-text mb-1 block">{tUi("admin.services.label_target_url")}</Label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
                  <Input
                    placeholder={tUi("admin.services.target_url_placeholder")}
                    value={formData.link_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, link_url: e.target.value }))
                    }
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-text mb-1 block">{tUi("admin.services.label_btn_text")}</Label>
                <Input
                  placeholder={tUi("admin.services.btn_text_placeholder")}
                  value={formData.link_text || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, link_text: e.target.value }))
                  }
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Status & Sort Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <Label className="text-sm font-medium text-text mb-2 block">{tUi("admin.services.label_card_visibility")}</Label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface/50 cursor-pointer hover:bg-surface transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_published === 1}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_published: e.target.checked ? 1 : 0,
                    }))
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <div>
                  <div className="text-sm font-medium text-text">{tUi("admin.services.published_on_site")}</div>
                  <div className="text-xs text-muted-text">
                    {tUi("admin.services.published_hint")}</div>
                </div>
              </label>
            </div>

            <div>
              <Label className="text-sm font-medium text-text mb-2 block">{tUi("admin.services.label_sort_order")}</Label>
              <Input
                type="number"
                value={formData.sort_order ?? 0}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sort_order: parseInt(e.target.value) || 0,
                  }))
                }
                className="text-sm"
                min={0}
              />
              <p className="text-xs text-muted-text mt-1">
                {tUi("admin.services.sort_order_hint")}</p>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="pt-2">
            <Label className="text-xs uppercase tracking-wider text-muted-text mb-2 block font-semibold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {tUi("admin.services.live_card_preview")}</Label>
            <div className="p-6 rounded-2xl bg-surface border border-border transition-colors">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                <ServiceIcon
                  icon={formData.icon}
                  imageUrl={formData.image_url}
                  className="w-6 h-6"
                />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">
                {parseTitleText(formData.title) || "Service Title Preview"}
              </h3>
              <p className="text-sm text-muted-text leading-relaxed mb-4">
                {parseTitleText(formData.description) ||
                  "A concise description of the visual solution and value offered to prospective clients."}
              </p>
              {formData.link_url && (
                <span className="inline-flex items-center text-xs font-semibold text-primary">
                  {formData.link_text || "Learn More"} →
                </span>
              )}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface/50">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {tUi("admin.clients.cancel")}</Button>
          <Button
            type="submit"
            form="service-form"
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>{tUi("admin.pricing.btn_saving")}</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{formData.id ? "Save Changes" : "Create Service"}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
