import React, { useState, useEffect, useRef, useMemo } from "react";
import { PricingPlan, BundleServiceItem, Service, ExtraService } from "../../lib/types";
import { TranslatableInput } from "./TranslatableInput";
import { useLanguage } from "../../contexts/LanguageContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Tag,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageSquare,
  Info,
  Calculator,
  Percent,
  RefreshCw,
  Search,
  AlertTriangle,
  Package,
  Sliders,
  DollarSign,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { formatCurrencyPrice } from "../public/Pricing";
import { interpolatePricingMessageTemplate, parseJsonArray } from "../../lib/utils";

interface PricingModalProps {
  isOpen: boolean;
  pricing: Partial<PricingPlan> | null;
  siteLanguages: string;
  onClose: () => void;
  onSave: (pricingData: Partial<PricingPlan>) => Promise<void>;
}

export function PricingModal({
  isOpen,
  pricing,
  siteLanguages,
  onClose,
  onSave,
}: PricingModalProps) {
  const { tUi, language } = useLanguage();

  const [formData, setFormData] = useState<Partial<PricingPlan>>({
    type: "tier",
    title: "",
    subtitle: "",
    description: "",
    price: 199,
    original_price: null,
    currency: "USD",
    billing_type: "one_time",
    billing_period: "project",
    discount_label: "",
    features: JSON.stringify([]),
    included_items: JSON.stringify([]),
    bundle_services: JSON.stringify([]),
    cta_label: "Get Started",
    cta_url: "#contact",
    is_featured: 0,
    featured_badge: "Most Popular",
    is_enabled: 1,
    sort_order: 0,
    message_template_en: "I'm interested in the {plan_name} plan. Please contact me with more details.",
    message_template_hu: "Érdeklődöm a(z) {plan_name} csomag iránt. Kérem, vegyenek fel velem a kapcsolatot a részletekkel kapcsolatban.",
  });

  const [featuresList, setFeaturesList] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState("");

  const [includedList, setIncludedList] = useState<string[]>([]);
  const [newIncludedText, setNewIncludedText] = useState("");

  // External Catalog Data for Bundling
  const [availableTiers, setAvailableTiers] = useState<PricingPlan[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [availableExtras, setAvailableExtras] = useState<ExtraService[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Bundle Builder Component Source State
  const [componentSourceType, setComponentSourceType] = useState<"tier" | "service" | "extra" | "custom">("tier");
  const [bundleSearchTerm, setBundleSearchTerm] = useState("");
  const [showDisabledTiers, setShowDisabledTiers] = useState(true);
  const [selectedItemIdToAdd, setSelectedItemIdToAdd] = useState<string>("");

  // Custom component inline input
  const [customItemTitle, setCustomItemTitle] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState<number | string>("");

  const [bundleItems, setBundleItems] = useState<BundleServiceItem[]>([]);

  const [activeTemplateField, setActiveTemplateField] = useState<"en" | "hu">("en");
  const enTextareaRef = useRef<HTMLTextAreaElement>(null);
  const huTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Helper to extract display string from a translatable JSON or plain string
  const getDisplayString = (val: string | undefined | null): string => {
    if (!val) return "";
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed[language] || parsed["en"] || Object.values(parsed)[0] || "";
      }
    } catch {}
    return String(val);
  };

  // Fetch catalog (pricing tiers, services, extra services)
  const fetchCatalogData = async () => {
    setIsLoadingCatalog(true);
    setCatalogError(null);
    try {
      const [tiersRes, servicesRes, extrasRes] = await Promise.all([
        fetch("/api/admin/pricing", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : fetch("/api/public/pricing").then((p) => (p.ok ? p.json() : []))))
          .catch(() => fetch("/api/public/pricing").then((p) => (p.ok ? p.json() : []))),
        fetch("/api/services", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : fetch("/api/public/services").then((p) => (p.ok ? p.json() : []))))
          .catch(() => fetch("/api/public/services").then((p) => (p.ok ? p.json() : []))),
        fetch("/api/admin/extra-services", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : fetch("/api/public/extra-services").then((p) => (p.ok ? p.json() : []))))
          .catch(() => fetch("/api/public/extra-services").then((p) => (p.ok ? p.json() : []))),
      ]);

      if (Array.isArray(tiersRes)) {
        setAvailableTiers(tiersRes);
      }
      if (Array.isArray(servicesRes)) {
        setAvailableServices(servicesRes);
      }
      if (Array.isArray(extrasRes)) {
        setAvailableExtras(extrasRes);
      }
    } catch (err: any) {
      console.error("Failed to load catalog data for bundle creator:", err);
      setCatalogError("Failed to load latest tiers and services. Click refresh to retry.");
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Fetch catalog data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCatalogData();
    }
  }, [isOpen]);

  // Synchronize form data when `pricing` prop changes
  useEffect(() => {
    if (pricing) {
      let parsedBundle: BundleServiceItem[] = [];
      try {
        parsedBundle = typeof pricing.bundle_services === "string" 
          ? JSON.parse(pricing.bundle_services || "[]") 
          : (pricing.bundle_services || []);
      } catch {
        parsedBundle = [];
      }

      setFormData({
        id: pricing.id,
        type: pricing.type || "tier",
        title: pricing.title || "",
        subtitle: pricing.subtitle || "",
        description: pricing.description || "",
        price: pricing.price !== undefined ? pricing.price : 199,
        original_price: pricing.original_price ?? null,
        currency: pricing.currency || "USD",
        billing_type: pricing.billing_type || "one_time",
        billing_period: pricing.billing_period || "project",
        discount_label: pricing.discount_label || "",
        features: pricing.features || "[]",
        included_items: pricing.included_items || "[]",
        bundle_services: typeof pricing.bundle_services === "string" ? pricing.bundle_services : JSON.stringify(parsedBundle),
        cta_label: pricing.cta_label || "Get Started",
        cta_url: pricing.cta_url || "#contact",
        is_featured: pricing.is_featured !== undefined ? pricing.is_featured : 0,
        featured_badge: pricing.featured_badge || "",
        is_enabled: pricing.is_enabled !== undefined ? pricing.is_enabled : 1,
        sort_order: pricing.sort_order || 0,
        message_template_en: pricing.message_template_en !== undefined ? pricing.message_template_en : "I'm interested in the {plan_name} plan. Please contact me with more details.",
        message_template_hu: pricing.message_template_hu !== undefined ? pricing.message_template_hu : "Érdeklődöm a(z) {plan_name} csomag iránt. Kérem, vegyenek fel velem a kapcsolatot a részletekkel kapcsolatban.",
      });

      try {
        const parsed = JSON.parse(pricing.features || "[]");
        setFeaturesList(Array.isArray(parsed) ? parsed : []);
      } catch {
        setFeaturesList(pricing.features ? pricing.features.split("\n").filter(Boolean) : []);
      }

      try {
        const parsedInc = JSON.parse(pricing.included_items || "[]");
        setIncludedList(Array.isArray(parsedInc) ? parsedInc : []);
      } catch {
        setIncludedList(pricing.included_items ? pricing.included_items.split("\n").filter(Boolean) : []);
      }

      setBundleItems(parsedBundle);
    } else {
      setFormData({
        type: "tier",
        title: "",
        subtitle: "",
        description: "",
        price: 199,
        original_price: null,
        currency: "USD",
        billing_type: "one_time",
        billing_period: "project",
        discount_label: "",
        features: "[]",
        included_items: "[]",
        bundle_services: "[]",
        cta_label: "Get Started",
        cta_url: "#contact",
        is_featured: 0,
        featured_badge: "Most Popular",
        is_enabled: 1,
        sort_order: 0,
        message_template_en: "I'm interested in the {plan_name} plan. Please contact me with more details.",
        message_template_hu: "Érdeklődöm a(z) {plan_name} csomag iránt. Kérem, vegyenek fel velem a kapcsolatot a részletekkel kapcsolatban.",
      });
      setFeaturesList([
        "HDR Photography",
        "24-Hour Turnaround",
        "Private Download Portal",
      ]);
      setIncludedList([]);
      setBundleItems([]);
    }
    setErrorMessage("");
    setNewFeatureText("");
    setNewIncludedText("");
    setSelectedItemIdToAdd("");
    setCustomItemTitle("");
    setCustomItemPrice("");
    setActiveTab("edit");
  }, [pricing, isOpen]);

  // Features list management
  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    const updated = [...featuresList, newFeatureText.trim()];
    setFeaturesList(updated);
    setFormData((prev) => ({ ...prev, features: JSON.stringify(updated) }));
    setNewFeatureText("");
  };

  const handleRemoveFeature = (index: number) => {
    const updated = featuresList.filter((_, i) => i !== index);
    setFeaturesList(updated);
    setFormData((prev) => ({ ...prev, features: JSON.stringify(updated) }));
  };

  const handleFeatureChange = (index: number, text: string) => {
    const updated = [...featuresList];
    updated[index] = text;
    setFeaturesList(updated);
    setFormData((prev) => ({ ...prev, features: JSON.stringify(updated) }));
  };

  // Included items list management
  const handleAddIncluded = () => {
    if (!newIncludedText.trim()) return;
    const updated = [...includedList, newIncludedText.trim()];
    setIncludedList(updated);
    setFormData((prev) => ({ ...prev, included_items: JSON.stringify(updated) }));
    setNewIncludedText("");
  };

  const handleRemoveIncluded = (index: number) => {
    const updated = includedList.filter((_, i) => i !== index);
    setIncludedList(updated);
    setFormData((prev) => ({ ...prev, included_items: JSON.stringify(updated) }));
  };

  const handleIncludedChange = (index: number, text: string) => {
    const updated = [...includedList];
    updated[index] = text;
    setIncludedList(updated);
    setFormData((prev) => ({ ...prev, included_items: JSON.stringify(updated) }));
  };

  // Filtered pricing tiers for bundle creation (excludes current bundle if editing)
  const selectableTiers = useMemo(() => {
    return availableTiers.filter((t) => {
      if (t.id === formData.id) return false; // avoid self-reference
      if (!showDisabledTiers && !Boolean(t.is_enabled)) return false;
      if (bundleSearchTerm.trim()) {
        const term = bundleSearchTerm.toLowerCase();
        const titleStr = getDisplayString(t.title).toLowerCase();
        const subtitleStr = getDisplayString(t.subtitle).toLowerCase();
        return titleStr.includes(term) || subtitleStr.includes(term);
      }
      return true;
    });
  }, [availableTiers, formData.id, showDisabledTiers, bundleSearchTerm, language]);

  // Filtered services
  const selectableServices = useMemo(() => {
    return availableServices.filter((s) => {
      if (bundleSearchTerm.trim()) {
        const term = bundleSearchTerm.toLowerCase();
        const titleStr = getDisplayString(s.title).toLowerCase();
        return titleStr.includes(term);
      }
      return true;
    });
  }, [availableServices, bundleSearchTerm, language]);

  // Filtered extra services
  const selectableExtras = useMemo(() => {
    return availableExtras.filter((e) => {
      if (!showDisabledTiers && !Boolean(e.is_enabled)) return false;
      if (bundleSearchTerm.trim()) {
        const term = bundleSearchTerm.toLowerCase();
        const titleStr = getDisplayString(e.title).toLowerCase();
        return titleStr.includes(term);
      }
      return true;
    });
  }, [availableExtras, showDisabledTiers, bundleSearchTerm, language]);

  // Add Item to Bundle
  const handleAddItemToBundle = () => {
    if (componentSourceType === "custom") {
      if (!customItemTitle.trim()) return;
      const priceNum = customItemPrice !== "" ? Number(customItemPrice) : 0;
      const newItem: BundleServiceItem = {
        item_type: "custom",
        service_title: customItemTitle.trim(),
        service_name: customItemTitle.trim(),
        quantity: 1,
        original_price: isNaN(priceNum) ? 0 : priceNum,
        override_price: null,
      };
      const updated = [...bundleItems, newItem];
      setBundleItems(updated);
      setFormData((prev) => ({ ...prev, bundle_services: JSON.stringify(updated) }));
      setCustomItemTitle("");
      setCustomItemPrice("");
      return;
    }

    if (!selectedItemIdToAdd) return;

    if (componentSourceType === "tier") {
      const foundTier = availableTiers.find((t) => t.id === selectedItemIdToAdd);
      if (!foundTier) return;

      const tierFeatures = parseJsonArray(foundTier.features);
      const existingIndex = bundleItems.findIndex((b) => b.tier_id === foundTier.id);
      if (existingIndex >= 0) {
        const updated = [...bundleItems];
        updated[existingIndex].quantity = (updated[existingIndex].quantity || 1) + 1;
        if (!updated[existingIndex].features || updated[existingIndex].features?.length === 0) {
          updated[existingIndex].features = tierFeatures;
        }
        setBundleItems(updated);
        setFormData((prev) => ({ ...prev, bundle_services: JSON.stringify(updated) }));
      } else {
        const tierTitle = getDisplayString(foundTier.title) || tUi("admin.pricing.item_tier");
        const newItem: BundleServiceItem = {
          tier_id: foundTier.id,
          item_type: "tier",
          service_title: tierTitle,
          service_name: tierTitle,
          quantity: 1,
          original_price: Number(foundTier.price) || 0,
          override_price: null,
          features: tierFeatures,
          is_disabled: !Boolean(foundTier.is_enabled),
          is_missing: false,
        };
        const updated = [...bundleItems, newItem];
        setBundleItems(updated);
        setFormData((prev) => ({ ...prev, bundle_services: JSON.stringify(updated) }));
      }
    } else if (componentSourceType === "service") {
      const foundService = availableServices.find((s) => s.id === selectedItemIdToAdd);
      if (!foundService) return;

      const existingIndex = bundleItems.findIndex((b) => b.service_id === foundService.id && b.item_type === "service");
      if (existingIndex >= 0) {
        const updated = [...bundleItems];
        updated[existingIndex].quantity = (updated[existingIndex].quantity || 1) + 1;
        setBundleItems(updated);
        setFormData((prev) => ({ ...prev, bundle_services: JSON.stringify(updated) }));
      } else {
        const serviceTitle = getDisplayString(foundService.title) || tUi("admin.pricing.item_service");
        const newItem: BundleServiceItem = {
          service_id: foundService.id,
          item_type: "service",
          service_title: serviceTitle,
          service_name: serviceTitle,
          quantity: 1,
          original_price: foundService.price ? Number(foundService.price) : 100,
          override_price: null,
          features: [],
          is_missing: false,
        };
        const updated = [...bundleItems, newItem];
        setBundleItems(updated);
        setFormData((prev) => ({ ...prev, bundle_services: JSON.stringify(updated) }));
      }
    } else if (componentSourceType === "extra") {
      const foundExtra = availableExtras.find((e) => e.id === selectedItemIdToAdd);
      if (!foundExtra) return;

      const extraSubtitle = getDisplayString(foundExtra.subtitle);
      const existingIndex = bundleItems.findIndex((b) => b.service_id === foundExtra.id && b.item_type === "extra");
      if (existingIndex >= 0) {
        const updated = [...bundleItems];
        updated[existingIndex].quantity = (updated[existingIndex].quantity || 1) + 1;
        setBundleItems(updated);
        setFormData((prev) => ({ ...prev, bundle_services: JSON.stringify(updated) }));
      } else {
        const extraTitle = getDisplayString(foundExtra.title) || tUi("admin.pricing.item_addon");
        const newItem: BundleServiceItem = {
          service_id: foundExtra.id,
          item_type: "extra",
          service_title: extraTitle,
          service_name: extraTitle,
          quantity: 1,
          original_price: Number(foundExtra.price) || 0,
          override_price: null,
          features: extraSubtitle ? [extraSubtitle] : [],
          is_disabled: !Boolean(foundExtra.is_enabled),
          is_missing: false,
        };
        const updated = [...bundleItems, newItem];
        setBundleItems(updated);
        setFormData((prev) => ({ ...prev, bundle_services: JSON.stringify(updated) }));
      }
    }

    setSelectedItemIdToAdd("");
  };

  const handleUpdateBundleItem = (index: number, updates: Partial<BundleServiceItem>) => {
    const updated = [...bundleItems];
    updated[index] = { ...updated[index], ...updates };
    setBundleItems(updated);
    setFormData((prev) => ({ ...prev, bundle_services: JSON.stringify(updated) }));
  };

  const handleRemoveBundleItem = (index: number) => {
    const updated = bundleItems.filter((_, i) => i !== index);
    setBundleItems(updated);
    setFormData((prev) => ({ ...prev, bundle_services: JSON.stringify(updated) }));
  };

  // Bundle calculations
  const rawStandardComponentPrice = bundleItems.reduce((acc, item) => {
    const unitPrice = item.override_price !== null && item.override_price !== undefined ? Number(item.override_price) : (Number(item.original_price) || 0);
    return acc + unitPrice * (item.quantity || 1);
  }, 0);

  const bundlePackagePrice = Number(formData.price) || 0;
  const calculatedSavings = Math.max(0, rawStandardComponentPrice - bundlePackagePrice);
  const calculatedSavingsPercent = rawStandardComponentPrice > 0 ? Math.round((calculatedSavings / rawStandardComponentPrice) * 100) : 0;

  const handleApplyCalculatedDiscount = () => {
    if (calculatedSavings > 0) {
      setFormData((prev) => ({
        ...prev,
        original_price: rawStandardComponentPrice,
        discount_label: `Save ${calculatedSavingsPercent}% (${formatCurrencyPrice(calculatedSavings, formData.currency || "USD")})`,
      }));
    }
  };

  const handleAutoSyncIncludedFromBundle = () => {
    const autoList = bundleItems.map((item) => {
      const name = item.service_title || item.service_name || tUi("admin.pricing.item_service");
      const qtyStr = (item.quantity || 1) > 1 ? `${item.quantity}x ` : "";
      return `${qtyStr}${name}`;
    });
    setIncludedList(autoList);
    setFormData((prev) => ({
      ...prev,
      included_items: JSON.stringify(autoList),
    }));
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    const isEn = activeTemplateField === "en";
    const currentVal = (isEn ? formData.message_template_en : formData.message_template_hu) || "";
    const targetRef = isEn ? enTextareaRef : huTextareaRef;

    if (targetRef.current) {
      const start = targetRef.current.selectionStart || currentVal.length;
      const end = targetRef.current.selectionEnd || currentVal.length;
      const newVal = currentVal.substring(0, start) + placeholder + currentVal.substring(end);

      if (isEn) {
        setFormData((prev) => ({ ...prev, message_template_en: newVal }));
      } else {
        setFormData((prev) => ({ ...prev, message_template_hu: newVal }));
      }

      setTimeout(() => {
        if (targetRef.current) {
          targetRef.current.focus();
          targetRef.current.selectionStart = start + placeholder.length;
          targetRef.current.selectionEnd = start + placeholder.length;
        }
      }, 0);
    } else {
      const newVal = currentVal ? `${currentVal} ${placeholder}` : placeholder;
      if (isEn) {
        setFormData((prev) => ({ ...prev, message_template_en: newVal }));
      } else {
        setFormData((prev) => ({ ...prev, message_template_hu: newVal }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.title || (typeof formData.title === "string" && formData.title.trim() === "")) {
      setErrorMessage(tUi("admin.pricing.err_title_required"));
      return;
    }

    if (formData.price === undefined || formData.price === null || isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      setErrorMessage(tUi("admin.pricing.err_invalid_price"));
      return;
    }

    if (formData.original_price !== null && formData.original_price !== undefined && formData.original_price !== ("" as any) && (isNaN(Number(formData.original_price)) || Number(formData.original_price) < 0)) {
      setErrorMessage(tUi("admin.pricing.err_invalid_original_price"));
      return;
    }

    const templateEn = formData.message_template_en?.trim() || "";
    const templateHu = formData.message_template_hu?.trim() || "";
    if (!templateEn && !templateHu) {
      setErrorMessage(tUi("admin.pricing.err_template_required"));
      return;
    }

    const cleanFeatures = featuresList.map((f) => f.trim()).filter(Boolean);
    const cleanIncluded = includedList.map((i) => i.trim()).filter(Boolean);
    const synchronizedBundleItems = bundleItems.map((item) => {
      if (!item.tier_id) return item;
      const currentTier = availableTiers.find((tier) => tier.id === item.tier_id);
      if (!currentTier) return item;
      const currentTitle = getDisplayString(currentTier.title) || item.service_title || item.service_name || tUi("admin.pricing.item_tier");
      return {
        ...item,
        item_type: "tier" as const,
        service_title: currentTitle,
        service_name: currentTitle,
        original_price: Number(currentTier.price) || 0,
        features: [...new Set([
          ...parseJsonArray(currentTier.features),
          ...parseJsonArray(currentTier.included_items),
        ])],
        is_disabled: !Boolean(currentTier.is_enabled),
        is_missing: false,
      };
    });

    try {
      setIsSubmitting(true);
      await onSave({
        ...formData,
        features: JSON.stringify(cleanFeatures),
        included_items: JSON.stringify(cleanIncluded),
        bundle_services: JSON.stringify(synchronizedBundleItems),
        price: Number(formData.price) || 0,
        original_price: formData.original_price !== null && formData.original_price !== undefined && formData.original_price !== ("" as any) ? Number(formData.original_price) : null,
        message_template_en: templateEn,
        message_template_hu: templateHu,
      });
      onClose();
    } catch (error: any) {
      console.error("Save pricing error:", error);
      setErrorMessage(error.message || tUi("admin.pricing.err_save_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewPlanTitle = getDisplayString(formData.title) || tUi("admin.pricing.untitled");
  const previewFormattedPrice = formatCurrencyPrice(Number(formData.price) || 0, formData.currency || "USD");
  const previewBillingPeriod = formData.billing_period || "project";

  const interpolatedEnPreview = interpolatePricingMessageTemplate(
    formData.message_template_en || formData.message_template_hu || "I'm interested in the {plan_name} plan. Please contact me with more details.",
    {
      plan_name: previewPlanTitle,
      price: previewFormattedPrice,
      billing_period: previewBillingPeriod,
      customer_name: "Jane Doe",
    }
  );

  const interpolatedHuPreview = interpolatePricingMessageTemplate(
    formData.message_template_hu || formData.message_template_en || "Érdeklődöm a(z) {plan_name} csomag iránt. Kérem, vegyenek fel velem a kapcsolatot a részletekkel kapcsolatban.",
    {
      plan_name: previewPlanTitle,
      price: previewFormattedPrice,
      billing_period: previewBillingPeriod,
      customer_name: "Kovács János",
    }
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              {formData.type === "bundle" ? <Layers className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">
                {pricing?.id
                  ? (formData.type === "bundle" ? "Edit Pricing Bundle" : "Edit Pricing Tier")
                  : (formData.type === "bundle" ? "Create Pricing Bundle" : "Create Pricing Tier")}
              </h2>
              <p className="text-xs text-muted-text">
                {formData.type === "bundle"
                  ? "Build a service package by bundling created tiers, services, and add-on components."
                  : "Configure standard pricing tier rates, billing scopes, deliverables, and features."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-surface border border-border rounded-lg p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === "edit" ? "bg-primary text-background font-semibold" : "text-muted-text hover:text-text"
                }`}
              >
                {tUi("admin.pricing.tab_form")}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                  activeTab === "preview" ? "bg-primary text-background font-semibold" : "text-muted-text hover:text-text"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{tUi("admin.pricing.tab_preview")}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted-text hover:text-text hover:bg-surface rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === "preview" ? (
            /* Live Card Preview */
            <div className="max-w-md mx-auto space-y-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-text mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>{tUi("admin.pricing.live_card_preview")}</span>
                </div>

                <div
                  className={`rounded-2xl border p-6 bg-background relative flex flex-col justify-between transition-all ${
                    formData.is_featured
                      ? "border-primary ring-2 ring-primary/20 shadow-lg"
                      : "border-border shadow-xs"
                  }`}
                >
                  {Boolean(formData.is_featured) && formData.featured_badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-primary text-background shadow-xs">
                      {formData.featured_badge}
                    </div>
                  )}

                  <div>
                    <div className="mb-4 pt-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-2xl font-bold text-text">
                          {getDisplayString(formData.title) || tUi("admin.pricing.untitled")}
                        </h3>
                        {formData.type === "bundle" && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-accent/10 text-accent uppercase tracking-wider">
                            {tUi("admin.pricing.tag_bundle")}</span>
                        )}
                      </div>
                      {formData.subtitle && (
                        <p className="text-sm text-muted-text mt-1">
                          {getDisplayString(formData.subtitle)}
                        </p>
                      )}
                    </div>

                    <div className="mb-6 pb-4 border-b border-border">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-text">
                          {formatCurrencyPrice(Number(formData.price) || 0, formData.currency || "USD")}
                        </span>
                        {formData.billing_period && (
                          <span className="text-sm font-medium text-muted-text">
                            / {formData.billing_period}
                          </span>
                        )}
                      </div>
                      {(formData.original_price || formData.discount_label) && (
                        <div className="flex items-center gap-2 mt-2">
                          {formData.original_price && (
                            <span className="text-sm text-muted-text line-through opacity-70">
                              {formatCurrencyPrice(Number(formData.original_price), formData.currency || "USD")}
                            </span>
                          )}
                          {formData.discount_label && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {getDisplayString(formData.discount_label)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {formData.type === "bundle" && includedList.length > 0 && (
                      <div className="mb-4 p-3 rounded-xl bg-surface/70 border border-border/60">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-text mb-2 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-primary" />
                          <span>{tUi("admin.pricing.field_included_services")}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {includedList.map((item, idx) => (
                            <span
                              key={idx}
                              className="text-xs font-medium px-2 py-0.5 rounded bg-background border border-border text-text"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5 mb-6">
                      {featuresList.map((feature, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2.5 text-sm text-text">
                          <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-colors ${
                      Boolean(formData.is_featured)
                        ? "bg-primary text-background"
                        : "bg-surface text-text border border-border"
                    }`}
                  >
                    {formData.cta_label || "Get Started"}
                  </button>
                </div>
              </div>

              {/* Inquiry Message Template Live Preview */}
              <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-text uppercase tracking-wider">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span>{tUi("admin.pricing.live_template_preview")}</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                    {tUi("admin.pricing.modal.auto_interpolated")}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-muted-text flex items-center gap-1 mb-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                      {tUi("admin.pricing.modal.english_en")}</span>
                    <div className="p-2.5 rounded-lg bg-background border border-border/80 text-text font-mono text-[11px] whitespace-pre-wrap">
                      {interpolatedEnPreview}
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-muted-text flex items-center gap-1 mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      {tUi("admin.pricing.modal.hungarian_hu")}</span>
                    <div className="p-2.5 rounded-lg bg-background border border-border/80 text-text font-mono text-[11px] whitespace-pre-wrap">
                      {interpolatedHuPreview}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Main Form */
            <form id="pricing-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Type Selection (Tier vs Bundle) */}
              <div className="grid grid-cols-2 gap-3 p-1 rounded-xl bg-surface border border-border">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, type: "tier" }))}
                  className={`py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    formData.type === "tier"
                      ? "bg-background text-primary shadow-xs border border-border"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span>{tUi("admin.pricing.type_standard")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, type: "bundle" }))}
                  className={`py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    formData.type === "bundle"
                      ? "bg-background text-primary shadow-xs border border-border"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>{tUi("admin.pricing.type_bundle")}</span>
                </button>
              </div>

              {/* Title, Subtitle & Description */}
              <div className="space-y-4">
                <TranslatableInput
                  label={tUi("admin.pricing.field_title")}
                  value={formData.title}
                  onChange={(val) => setFormData((prev) => ({ ...prev, title: val }))}
                  siteLanguages={siteLanguages}
                />

                <TranslatableInput
                  label={tUi("admin.pricing.field_subtitle")}
                  value={formData.subtitle || ""}
                  onChange={(val) => setFormData((prev) => ({ ...prev, subtitle: val }))}
                  siteLanguages={siteLanguages}
                />

                <TranslatableInput
                  label={tUi("admin.pricing.field_description")}
                  value={formData.description || ""}
                  onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
                  siteLanguages={siteLanguages}
                  isTextarea={true}
                />
              </div>

              {/* ======================================================== */}
              {/* BUNDLE CREATOR & TIER SELECTION (When Type === 'bundle') */}
              {/* ======================================================== */}
              {formData.type === "bundle" && (
                <div className="p-5 rounded-2xl bg-surface/70 border border-primary/20 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text">
                          {tUi("admin.pricing.modal.bundle_components_tiers_builder")}</h4>
                        <p className="text-xs text-muted-text">
                          {tUi("admin.pricing.modal.select_created_pricing_tiers_studio_services_or_add_on")}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fetchCatalogData}
                        disabled={isLoadingCatalog}
                        className="text-xs gap-1.5 h-8 px-2.5"
                        title={tUi("admin.pricing.modal.reload_latest_pricing_tiers_and_services")}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCatalog ? "animate-spin text-primary" : ""}`} />
                        <span>{tUi("admin.pricing.modal.refresh_tiers")}</span>
                      </Button>

                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
                        {bundleItems.length} {tUi("admin.pricing.modal.components")}</span>
                    </div>
                  </div>

                  {catalogError && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{catalogError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={fetchCatalogData}
                        className="underline font-semibold ml-2"
                      >
                        {tUi("client.common.retry")}</button>
                    </div>
                  )}

                  {/* Component Source Selector Tabs */}
                  <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-background border border-border text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setComponentSourceType("tier");
                        setSelectedItemIdToAdd("");
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        componentSourceType === "tier"
                          ? "bg-primary text-background font-semibold"
                          : "text-muted-text hover:text-text"
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>{tUi("admin.pricing.modal.pricing_tiers")}{availableTiers.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setComponentSourceType("service");
                        setSelectedItemIdToAdd("");
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        componentSourceType === "service"
                          ? "bg-primary text-background font-semibold"
                          : "text-muted-text hover:text-text"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{tUi("admin.pricing.modal.studio_services")}{availableServices.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setComponentSourceType("extra");
                        setSelectedItemIdToAdd("");
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        componentSourceType === "extra"
                          ? "bg-primary text-background font-semibold"
                          : "text-muted-text hover:text-text"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{tUi("admin.pricing.modal.add_ons_extras")}{availableExtras.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setComponentSourceType("custom");
                        setSelectedItemIdToAdd("");
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        componentSourceType === "custom"
                          ? "bg-primary text-background font-semibold"
                          : "text-muted-text hover:text-text"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{tUi("admin.pricing.custom_component")}</span>
                    </button>
                  </div>

                  {/* Search & Filter Bar */}
                  {componentSourceType !== "custom" && (
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
                        <input
                          type="text"
                          value={bundleSearchTerm}
                          onChange={(e) => setBundleSearchTerm(e.target.value)}
                          placeholder={`Search ${componentSourceType === "tier" ? "pricing tiers" : componentSourceType === "service" ? "services" : "add-ons"}...`}
                          className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {bundleSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setBundleSearchTerm("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-text hover:text-text"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {componentSourceType === "tier" && (
                        <label className="flex items-center gap-1.5 text-xs text-muted-text select-none cursor-pointer flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={showDisabledTiers}
                            onChange={(e) => setShowDisabledTiers(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                          />
                          <span>{tUi("admin.pricing.modal.show_inactive_disabled")}</span>
                        </label>
                      )}
                    </div>
                  )}

                  {/* Add Component Action Row */}
                  {componentSourceType === "custom" ? (
                    <div className="flex flex-col sm:flex-row gap-2 bg-background p-3 rounded-xl border border-border">
                      <Input
                        type="text"
                        placeholder={tUi("admin.pricing.modal.component_name_e_g_10_aerial_4k_video_clips")}
                        value={customItemTitle}
                        onChange={(e) => setCustomItemTitle(e.target.value)}
                        className="flex-1 text-xs h-9"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={tUi("admin.pricing.modal.standard_price")}
                        value={customItemPrice}
                        onChange={(e) => setCustomItemPrice(e.target.value)}
                        className="w-32 text-xs h-9"
                      />
                      <Button
                        type="button"
                        onClick={handleAddItemToBundle}
                        disabled={!customItemTitle.trim()}
                        className="gap-1.5 flex-shrink-0 text-xs h-9"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{tUi("admin.pricing.modal.add_custom_component")}</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <select
                          value={selectedItemIdToAdd}
                          onChange={(e) => setSelectedItemIdToAdd(e.target.value)}
                          className="w-full h-10 px-3 pr-8 rounded-xl border border-border bg-background text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">
                            {isLoadingCatalog
                              ? "Loading catalog..."
                              : `-- ${tUi("admin.pricing.modal.add_to_bundle")}: ${componentSourceType === "tier" ? tUi("admin.pricing.item_tier") : componentSourceType === "service" ? tUi("admin.pricing.item_service") : tUi("admin.pricing.item_addon")} --`}
                          </option>

                          {componentSourceType === "tier" &&
                            selectableTiers.map((tier) => {
                              const tTitle = getDisplayString(tier.title) || tUi("admin.pricing.item_tier");
                              const isDisabled = !Boolean(tier.is_enabled);
                              return (
                                <option key={tier.id} value={tier.id}>
                                  {tTitle} ({formatCurrencyPrice(Number(tier.price || 0), formData.currency || "USD")}) {isDisabled ? "— [Disabled / Inactive]" : ""}
                                </option>
                              );
                            })}

                          {componentSourceType === "service" &&
                            selectableServices.map((service) => {
                              const sTitle = getDisplayString(service.title) || tUi("admin.pricing.item_service");
                              return (
                                <option key={service.id} value={service.id}>
                                  {sTitle} ({formatCurrencyPrice(Number(service.price || 0), formData.currency || "USD")})
                                </option>
                              );
                            })}

                          {componentSourceType === "extra" &&
                            selectableExtras.map((extra) => {
                              const eTitle = getDisplayString(extra.title) || tUi("admin.pricing.item_addon");
                              const isDisabled = !Boolean(extra.is_enabled);
                              return (
                                <option key={extra.id} value={extra.id}>
                                  {eTitle} ({formatCurrencyPrice(Number(extra.price || 0), formData.currency || "USD")}) {isDisabled ? "— [Disabled]" : ""}
                                </option>
                              );
                            })}
                        </select>
                      </div>

                      <Button
                        type="button"
                        onClick={handleAddItemToBundle}
                        disabled={!selectedItemIdToAdd}
                        className="gap-1.5 flex-shrink-0 text-xs h-10"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{tUi("admin.pricing.modal.add_to_bundle")}</span>
                      </Button>
                    </div>
                  )}

                  {/* Empty state notice for catalog items */}
                  {componentSourceType === "tier" && selectableTiers.length === 0 && !isLoadingCatalog && (
                    <div className="text-center py-3 bg-background/50 border border-dashed border-border rounded-xl">
                      <p className="text-xs text-muted-text">
                        {tUi("admin.pricing.modal.no_pricing_tiers_match_your_search_or_filter_create_st")}</p>
                    </div>
                  )}

                  {/* Bundle Items List Table */}
                  {bundleItems.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-text flex items-center justify-between">
                        <span>{tUi("admin.pricing.modal.bundle_components_included_tiers")}{bundleItems.length})</span>
                        <span className="text-[11px] font-normal">{tUi("admin.pricing.modal.custom_unit_overrides_quantities")}</span>
                      </div>

                      {bundleItems.map((item, idx) => {
                        const lineUnitPrice = item.override_price !== null && item.override_price !== undefined ? Number(item.override_price) : (Number(item.original_price) || 0);
                        const lineSubtotal = lineUnitPrice * (item.quantity || 1);
                        const isTier = item.item_type === "tier" || Boolean(item.tier_id);
                        
                        const matchedTier = item.tier_id ? availableTiers.find((t) => t.id === item.tier_id) : null;
                        const matchedExtra = item.item_type === "extra" && item.service_id ? availableExtras.find((e) => e.id === item.service_id) : null;
                        
                        const isMissing = Boolean(item.tier_id && !matchedTier && !isLoadingCatalog && availableTiers.length > 0);
                        const isInactive = Boolean(
                          item.is_disabled || 
                          (matchedTier && !Boolean(matchedTier.is_enabled)) ||
                          (matchedExtra && !Boolean(matchedExtra.is_enabled))
                        );

                        const itemFeatures = matchedTier
                          ? [...new Set([...parseJsonArray(matchedTier.features), ...parseJsonArray(matchedTier.included_items)])]
                          : (item.features || []);
                        const displayItemTitle = matchedTier
                          ? (getDisplayString(matchedTier.title) || item.service_title || item.service_name || tUi("admin.pricing.item_tier"))
                          : (item.service_title || item.service_name || tUi("admin.pricing.item_service"));

                        return (
                          <div
                            key={idx}
                            className={`flex flex-col gap-2.5 p-4 rounded-xl border transition-all ${
                              isMissing
                                ? "bg-rose-500/5 border-rose-500/30"
                                : isInactive
                                ? "bg-amber-500/5 border-amber-500/30"
                                : "bg-background border-border shadow-2xs"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider ${
                                    isTier
                                      ? "bg-primary/10 text-primary"
                                      : item.item_type === "extra"
                                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                      : item.item_type === "custom"
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  }`}>
                                    {isTier ? tUi("admin.pricing.item_tier") : item.item_type === "extra" ? tUi("admin.pricing.item_addon") : tUi("admin.pricing.item_service")}
                                  </span>

                                  <span className="text-sm font-bold text-text truncate">
                                    {displayItemTitle}
                                  </span>

                                  {/* Status Badges */}
                                  {isMissing ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold">
                                      <AlertCircle className="w-3 h-3" />
                                      {tUi("admin.pricing.modal.archived_not_in_catalog")}</span>
                                  ) : isInactive ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                                      <AlertTriangle className="w-3 h-3" />
                                      {tUi("admin.pricing.modal.inactive_in_catalog")}</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {tUi("admin.clients.status_active")}</span>
                                  )}
                                </div>

                                <div className="text-xs text-muted-text mt-1 flex items-center gap-2">
                                  <span>{tUi("admin.pricing.modal.catalog_standard")}{formatCurrencyPrice(item.original_price || 0, formData.currency || "USD")}</span>
                                  {item.override_price !== null && item.override_price !== undefined && (
                                    <span className="text-primary font-medium">{tUi("admin.pricing.modal.overridden_to")}{formatCurrencyPrice(Number(item.override_price), formData.currency || "USD")})</span>
                                  )}
                                </div>
                              </div>

                              {/* Controls (Qty + Unit Price + Subtotal + Delete) */}
                              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                                {/* Quantity Stepper */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-text">{tUi("admin.pricing.modal.qty")}</span>
                                  <div className="flex items-center border border-border rounded-lg overflow-hidden bg-surface">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateBundleItem(idx, { quantity: Math.max(1, (item.quantity || 1) - 1) })}
                                      className="px-2 py-1 text-xs hover:bg-background transition-colors text-text"
                                    >
                                      -
                                    </button>
                                    <span className="px-2.5 py-1 text-xs font-bold text-text bg-background min-w-[28px] text-center">
                                      {item.quantity || 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateBundleItem(idx, { quantity: (item.quantity || 1) + 1 })}
                                      className="px-2 py-1 text-xs hover:bg-background transition-colors text-text"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* Custom Price Override */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-text">{tUi("admin.pricing.modal.unit")}</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder={String(item.original_price || "")}
                                    value={item.override_price !== null && item.override_price !== undefined ? item.override_price : ""}
                                    onChange={(e) =>
                                      handleUpdateBundleItem(idx, {
                                        override_price: e.target.value === "" ? null : Number(e.target.value),
                                      })
                                    }
                                    className="w-20 h-8 text-xs text-right"
                                  />
                                </div>

                                {/* Subtotal & Delete */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-primary min-w-[55px] text-right">
                                    {formatCurrencyPrice(lineSubtotal, formData.currency || "USD")}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBundleItem(idx)}
                                    className="p-1.5 text-muted-text hover:text-rose-500 hover:bg-surface rounded-lg transition-colors"
                                    title={tUi("admin.pricing.modal.remove_component_from_bundle")}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Features / Deliverables of this included Tier */}
                            {itemFeatures.length > 0 && (
                              <div className="pt-2 border-t border-border/50 flex flex-wrap gap-1.5 items-center">
                                <span className="text-[10px] uppercase font-bold text-muted-text mr-1">{tUi("admin.pricing.modal.deliverables")}</span>
                                {itemFeatures.map((feat, fIdx) => (
                                  <span
                                    key={fIdx}
                                    className="text-[11px] px-2 py-0.5 rounded-md bg-surface border border-border text-muted-text"
                                  >
                                    {feat}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Bundle Economics Bar */}
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2.5 mt-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-text flex items-center gap-1.5">
                              <Calculator className="w-3.5 h-3.5 text-primary" />
                              <span>{tUi("admin.pricing.modal.bundle_value_vs_package_price")}</span>
                            </span>
                            <div className="flex items-baseline gap-3 text-xs">
                              <span className="text-muted-text">
                                {tUi("admin.pricing.modal.standard_sum")}<span className="line-through">{formatCurrencyPrice(rawStandardComponentPrice, formData.currency || "USD")}</span>
                              </span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {tUi("admin.pricing.modal.bundle_price")}{formatCurrencyPrice(bundlePackagePrice, formData.currency || "USD")}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {calculatedSavings > 0 && (
                              <button
                                type="button"
                                onClick={handleApplyCalculatedDiscount}
                                className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-500/20 transition-colors"
                              >
                                {tUi("admin.pricing.modal.set_discount_tag")}{calculatedSavingsPercent}{tUi("admin.pricing.modal.off")}</button>
                            )}

                            <button
                              type="button"
                              onClick={handleAutoSyncIncludedFromBundle}
                              className="px-2.5 py-1 text-xs rounded-lg bg-surface border border-border text-text hover:bg-surface-hover transition-colors flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3 text-primary" />
                              <span>{tUi("admin.pricing.modal.auto_sync_included_list")}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-surface/50 border border-dashed border-border rounded-xl">
                      <p className="text-xs text-muted-text">
                        {tUi("admin.pricing.modal.no_components_added_yet_select_a_pricing_tier_service_")}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* PRICING, CURRENCY, BILLING TYPE & PERIOD */}
              {/* ======================================================== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>{tUi("admin.pricing.field_price")}</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.price !== undefined ? formData.price : ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder={tUi("admin.pricing.modal.e_g_299")}
                  />
                </div>

                <div>
                  <Label>{tUi("admin.pricing.field_currency")}</Label>
                  <select
                    value={formData.currency || "USD"}
                    onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="HUF">HUF (Ft)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="CHF">CHF (CHF)</option>
                  </select>
                </div>

                <div>
                  <Label>{tUi("admin.pricing.modal.billing_type_model")}</Label>
                  <select
                    value={formData.billing_type || "one_time"}
                    onChange={(e) => setFormData((prev) => ({ ...prev, billing_type: e.target.value as any }))}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="one_time">{tUi("admin.pricing.modal.one_time_per_project")}</option>
                    <option value="monthly">{tUi("admin.pricing.modal.monthly_subscription")}</option>
                    <option value="yearly">{tUi("admin.pricing.modal.yearly_retainer")}</option>
                    <option value="per_sqft">{tUi("admin.pricing.modal.per_square_foot_area")}</option>
                    <option value="per_photo">{tUi("admin.pricing.modal.per_photo_asset")}</option>
                    <option value="custom">{tUi("admin.pricing.modal.custom_quote")}</option>
                  </select>
                </div>

                <div>
                  <Label>{tUi("admin.pricing.field_billing_period")}</Label>
                  <Input
                    type="text"
                    value={formData.billing_period || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, billing_period: e.target.value }))}
                    placeholder={tUi("admin.pricing.field_billing_period_ph")}
                  />
                </div>
              </div>

              {/* Original Price & Discount Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-surface/50 border border-border">
                <div>
                  <Label className="flex items-center gap-1.5">
                    <span>{tUi("admin.pricing.field_original_price")}</span>
                    <span className="text-xs text-muted-text font-normal">{tUi("admin.pricing.optional")}</span>
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.original_price !== null && formData.original_price !== undefined ? formData.original_price : ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        original_price: e.target.value !== "" ? parseFloat(e.target.value) : null,
                      }))
                    }
                    placeholder={tUi("admin.pricing.field_original_price_ph")}
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1.5">
                    <span>{tUi("admin.pricing.field_discount_label")}</span>
                    <span className="text-xs text-muted-text font-normal">{tUi("admin.pricing.optional")}</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.discount_label || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, discount_label: e.target.value }))}
                    placeholder={tUi("admin.pricing.field_discount_label_ph")}
                  />
                </div>
              </div>

              {/* Included Services (For Bundles) */}
              {formData.type === "bundle" && (
                <div className="space-y-3 p-4 rounded-xl bg-accent/5 border border-accent/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-accent font-semibold flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      <span>{tUi("admin.pricing.field_included_services")}</span>
                    </Label>
                    <span className="text-xs text-muted-text">{includedList.length} {tUi("common.items")}</span>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newIncludedText}
                      onChange={(e) => setNewIncludedText(e.target.value)}
                      placeholder={tUi("admin.pricing.field_included_services_ph")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddIncluded();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddIncluded} variant="secondary" className="gap-1.5 flex-shrink-0">
                      <Plus className="w-4 h-4" />
                      <span>{tUi("admin.pricing.btn_add")}</span>
                    </Button>
                  </div>

                  {includedList.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {includedList.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={item}
                            onChange={(e) => handleIncludedChange(index, e.target.value)}
                            className="text-sm py-1.5"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveIncluded(index)}
                            className="p-2 text-muted-text hover:text-red-500 hover:bg-surface rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Feature Bullet Points List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>{tUi("admin.pricing.field_features")}</span>
                  </Label>
                  <span className="text-xs text-muted-text">{featuresList.length} {tUi("admin.pricing.modal.features")}</span>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    placeholder={tUi("admin.pricing.field_features_ph")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddFeature} variant="secondary" className="gap-1.5 flex-shrink-0">
                    <Plus className="w-4 h-4" />
                    <span>{tUi("admin.pricing.btn_add")}</span>
                  </Button>
                </div>

                {featuresList.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {featuresList.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={feature}
                          onChange={(e) => handleFeatureChange(index, e.target.value)}
                          className="text-sm py-1.5"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(index)}
                          className="p-2 text-muted-text hover:text-red-500 hover:bg-surface rounded-lg transition-colors"
                          title={tUi("admin.pricing.modal.remove_feature")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-text italic">
                    {tUi("admin.pricing.features_empty")}
                  </p>
                )}
              </div>

              {/* CTA Label & Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{tUi("admin.pricing.field_cta_label")}</Label>
                  <Input
                    type="text"
                    value={formData.cta_label || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cta_label: e.target.value }))}
                    placeholder={tUi("admin.pricing.field_cta_label_ph")}
                  />
                </div>

                <div>
                  <Label>{tUi("admin.pricing.field_cta_url")}</Label>
                  <Input
                    type="text"
                    value={formData.cta_url || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cta_url: e.target.value }))}
                    placeholder={tUi("admin.pricing.field_cta_url_ph")}
                  />
                </div>
              </div>

              {/* Message Templates Configuration Section */}
              <div className="p-5 rounded-2xl bg-surface/80 border border-border space-y-4 shadow-2xs">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text">
                        {tUi("admin.pricing.section_message_templates")}
                      </h4>
                      <p className="text-xs text-muted-text mt-0.5">
                        {tUi("admin.pricing.section_message_templates_desc")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Variable Placeholder Helper Buttons */}
                <div className="space-y-1.5 bg-background/60 p-3 rounded-xl border border-border/70">
                  <div className="text-xs font-semibold text-text flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span>{tUi("admin.pricing.placeholders_guide")}</span>
                    </span>
                    <span className="text-[11px] text-muted-text font-normal">
                      {tUi("admin.pricing.modal.target")}<span className="font-semibold text-primary uppercase">{activeTemplateField}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { key: "{plan_name}", label: tUi("admin.pricing.placeholder_plan_name") },
                      { key: "{price}", label: tUi("admin.pricing.placeholder_price") },
                      { key: "{billing_period}", label: tUi("admin.pricing.placeholder_billing_period") },
                      { key: "{customer_name}", label: tUi("admin.pricing.placeholder_customer_name") },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleInsertPlaceholder(item.key)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-surface border border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center gap-1 cursor-pointer"
                        title={`Insert ${item.key} into the active template`}
                      >
                        <Plus className="w-3 h-3 opacity-70" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* English Template Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                      <span>{tUi("admin.pricing.template_en")}</span>
                    </Label>
                    <span className="text-[11px] text-muted-text">
                      {formData.message_template_en?.length || 0} {tUi("admin.pricing.modal.chars")}</span>
                  </div>
                  <textarea
                    ref={enTextareaRef}
                    value={formData.message_template_en || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message_template_en: e.target.value }))}
                    onFocus={() => setActiveTemplateField("en")}
                    rows={3}
                    placeholder={tUi("admin.pricing.template_en_ph")}
                    className="w-full text-xs font-sans p-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-y text-text placeholder:text-muted-text/60"
                  />
                  {!formData.message_template_en?.trim() && formData.message_template_hu?.trim() && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>{tUi("admin.pricing.warn_missing_en")}</span>
                    </div>
                  )}
                </div>

                {/* Hungarian Template Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      <span>{tUi("admin.pricing.template_hu")}</span>
                    </Label>
                    <span className="text-[11px] text-muted-text">
                      {formData.message_template_hu?.length || 0} {tUi("admin.pricing.modal.chars")}</span>
                  </div>
                  <textarea
                    ref={huTextareaRef}
                    value={formData.message_template_hu || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message_template_hu: e.target.value }))}
                    onFocus={() => setActiveTemplateField("hu")}
                    rows={3}
                    placeholder={tUi("admin.pricing.template_hu_ph")}
                    className="w-full text-xs font-sans p-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-y text-text placeholder:text-muted-text/60"
                  />
                  {!formData.message_template_hu?.trim() && formData.message_template_en?.trim() && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>{tUi("admin.pricing.warn_missing_hu")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Toggles & Options */}
              <div className="p-4 rounded-xl bg-surface border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-semibold cursor-pointer" htmlFor="featured-toggle">
                      {tUi("admin.pricing.field_is_featured")}
                    </Label>
                    <p className="text-xs text-muted-text">
                      {tUi("admin.pricing.field_is_featured_desc")}
                    </p>
                  </div>
                  <input
                    id="featured-toggle"
                    type="checkbox"
                    checked={Boolean(formData.is_featured)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_featured: e.target.checked ? 1 : 0 }))}
                    className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                {Boolean(formData.is_featured) && (
                  <div className="pt-2 border-t border-border">
                    <Label>{tUi("admin.pricing.field_featured_badge")}</Label>
                    <Input
                      type="text"
                      value={formData.featured_badge || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, featured_badge: e.target.value }))}
                      placeholder={tUi("admin.pricing.field_featured_badge_ph")}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <Label className="font-semibold cursor-pointer" htmlFor="enabled-toggle">
                      {tUi("admin.pricing.field_is_enabled")}
                    </Label>
                    <p className="text-xs text-muted-text">
                      {tUi("admin.pricing.field_is_enabled_desc")}
                    </p>
                  </div>
                  <input
                    id="enabled-toggle"
                    type="checkbox"
                    checked={Boolean(formData.is_enabled)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_enabled: e.target.checked ? 1 : 0 }))}
                    className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-surface/40 flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {tUi("Cancel")}
          </Button>
          <Button
            type="submit"
            form="pricing-form"
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <span>{tUi("admin.pricing.btn_saving")}</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>
                  {pricing?.id
                    ? (formData.type === "bundle" ? "Update Bundle" : "Update Tier")
                    : (formData.type === "bundle" ? "Create Bundle" : "Create Tier")}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
