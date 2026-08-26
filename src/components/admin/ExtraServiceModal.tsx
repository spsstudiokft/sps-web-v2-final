import React, { useState, useEffect } from "react";
import { ExtraService, PricingPlan } from "../../lib/types";
import { TranslatableInput } from "./TranslatableInput";
import { useLanguage } from "../../contexts/LanguageContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Textarea } from "../ui/Textarea";
import {
  X,
  Sparkles,
  Camera,
  Video,
  Moon,
  Plane,
  Ruler,
  Armchair,
  Zap,
  Tag,
  Check,
  AlertCircle,
  Eye,
  Layers,
  Percent,
  DollarSign,
  Clock,
  Shield,
  Filter,
  CheckSquare,
  Square,
  Globe
} from "lucide-react";

interface ExtraServiceModalProps {
  isOpen: boolean;
  extraService: Partial<ExtraService> | null;
  siteLanguages: string;
  onClose: () => void;
  onSave: (serviceData: Partial<ExtraService>) => Promise<void>;
}

const AVAILABLE_ICONS = [
  { id: "sparkles", labelKey: "admin.pricing.extra_modal.icon.sparkles", icon: Sparkles },
  { id: "camera", labelKey: "admin.pricing.extra_modal.icon.camera", icon: Camera },
  { id: "video", labelKey: "admin.pricing.extra_modal.icon.video", icon: Video },
  { id: "moon", labelKey: "admin.pricing.extra_modal.icon.twilight", icon: Moon },
  { id: "plane", labelKey: "admin.pricing.extra_modal.icon.aerial", icon: Plane },
  { id: "ruler", labelKey: "admin.pricing.extra_modal.icon.floor_plan", icon: Ruler },
  { id: "armchair", labelKey: "admin.pricing.extra_modal.icon.staging", icon: Armchair },
  { id: "zap", labelKey: "admin.pricing.extra_modal.icon.express", icon: Zap },
  { id: "tag", labelKey: "admin.pricing.extra_modal.icon.promo", icon: Tag },
  { id: "layers", labelKey: "admin.pricing.extra_modal.icon.package", icon: Layers }
];

const PRESET_CATEGORIES = [
  { value: "Photography", labelKey: "admin.pricing.extra_modal.category.photography" },
  { value: "Video", labelKey: "admin.pricing.extra_modal.category.video" },
  { value: "Aerial & Drone", labelKey: "admin.pricing.extra_modal.category.aerial" },
  { value: "Digital & 3D", labelKey: "admin.pricing.extra_modal.category.digital" },
  { value: "Planning & Floorplans", labelKey: "admin.pricing.extra_modal.category.floorplans" },
  { value: "Expedited Delivery", labelKey: "admin.pricing.extra_modal.category.expedited" },
  { value: "General Add-on", labelKey: "admin.pricing.extra_modal.category.general" }
];

const PRESET_UNITS = [
  { id: "item", labelKey: "admin.pricing.extra_modal.unit.item" },
  { id: "photo", labelKey: "admin.pricing.extra_modal.unit.photo" },
  { id: "shoot", labelKey: "admin.pricing.extra_modal.unit.shoot" },
  { id: "room", labelKey: "admin.pricing.extra_modal.unit.room" },
  { id: "floor", labelKey: "admin.pricing.extra_modal.unit.floor" },
  { id: "pack", labelKey: "admin.pricing.extra_modal.unit.pack" },
  { id: "reel", labelKey: "admin.pricing.extra_modal.unit.reel" },
  { id: "minute", labelKey: "admin.pricing.extra_modal.unit.minute" },
  { id: "property", labelKey: "admin.pricing.extra_modal.unit.property" },
  { id: "month", labelKey: "admin.pricing.extra_modal.unit.month" }
];

const AVAILABLE_ROLES = [
  { id: "all", labelKey: "admin.pricing.extra_modal.role.all" },
  { id: "client", labelKey: "admin.pricing.extra_modal.role.client" },
  { id: "agent", labelKey: "admin.pricing.extra_modal.role.agent" },
  { id: "broker", labelKey: "admin.pricing.extra_modal.role.broker" },
  { id: "commercial", labelKey: "admin.pricing.extra_modal.role.commercial" }
];

export function ExtraServiceModal({
  isOpen,
  extraService,
  siteLanguages,
  onClose,
  onSave
}: ExtraServiceModalProps) {
  const { tUi, language } = useLanguage();

  const [formData, setFormData] = useState<Partial<ExtraService>>({
    title: "",
    subtitle: "",
    description: "",
    category: "Photography",
    icon: "sparkles",
    price: 45,
    price_type: "fixed",
    billing_type: "one_time",
    original_price: null,
    currency: "USD",
    unit: "item",
    allow_quantity: 1,
    min_quantity: 1,
    max_quantity: 10,
    is_featured: 0,
    is_enabled: 1,
    show_on_pricing_page: 1,
    restricted_plans: JSON.stringify([]),
    restricted_roles: JSON.stringify(["all"]),
    sort_order: 0
  });

  const [availablePlans, setAvailablePlans] = useState<PricingPlan[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["all"]);
  const [restrictPlansToggle, setRestrictPlansToggle] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch available pricing plans for restriction selection
  useEffect(() => {
    if (isOpen) {
      fetch("/api/admin/pricing")
        .then((r) => (r.ok ? r.json() : fetch("/api/public/pricing").then((p) => (p.ok ? p.json() : []))))
        .catch(() => fetch("/api/public/pricing").then((p) => (p.ok ? p.json() : [])))
        .then((data) => {
          if (Array.isArray(data)) {
            setAvailablePlans(data);
          }
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (extraService) {
      let parsedPlans: string[] = [];
      try {
        parsedPlans = typeof extraService.restricted_plans === "string"
          ? JSON.parse(extraService.restricted_plans || "[]")
          : (extraService.restricted_plans || []);
      } catch {
        parsedPlans = [];
      }

      let parsedRoles: string[] = ["all"];
      try {
        parsedRoles = typeof extraService.restricted_roles === "string"
          ? JSON.parse(extraService.restricted_roles || "[]")
          : (extraService.restricted_roles || ["all"]);
        if (parsedRoles.length === 0) parsedRoles = ["all"];
      } catch {
        parsedRoles = ["all"];
      }

      setFormData({
        id: extraService.id,
        title: extraService.title || "",
        subtitle: extraService.subtitle || "",
        description: extraService.description || "",
        category: extraService.category || "Photography",
        icon: extraService.icon || "sparkles",
        price: extraService.price !== undefined ? extraService.price : 45,
        price_type: extraService.price_type || "fixed",
        billing_type: extraService.billing_type || "one_time",
        original_price: extraService.original_price ?? null,
        currency: extraService.currency || "USD",
        unit: extraService.unit || "item",
        allow_quantity: extraService.allow_quantity !== undefined ? extraService.allow_quantity : 1,
        min_quantity: extraService.min_quantity || 1,
        max_quantity: extraService.max_quantity || 10,
        is_featured: extraService.is_featured ? 1 : 0,
        is_enabled: extraService.is_enabled !== undefined ? extraService.is_enabled : 1,
        show_on_pricing_page: extraService.show_on_pricing_page !== undefined ? extraService.show_on_pricing_page : 1,
        restricted_plans: JSON.stringify(parsedPlans),
        restricted_roles: JSON.stringify(parsedRoles),
        sort_order: extraService.sort_order || 0
      });

      setSelectedPlans(parsedPlans);
      setSelectedRoles(parsedRoles);
      setRestrictPlansToggle(parsedPlans.length > 0);
    } else {
      setFormData({
        title: "",
        subtitle: "",
        description: "",
        category: "Photography",
        icon: "sparkles",
        price: 45,
        price_type: "fixed",
        billing_type: "one_time",
        original_price: null,
        currency: "USD",
        unit: "item",
        allow_quantity: 1,
        min_quantity: 1,
        max_quantity: 10,
        is_featured: 0,
        is_enabled: 1,
        show_on_pricing_page: 1,
        restricted_plans: JSON.stringify([]),
        restricted_roles: JSON.stringify(["all"]),
        sort_order: 0
      });
      setSelectedPlans([]);
      setSelectedRoles(["all"]);
      setRestrictPlansToggle(false);
    }
    setErrorMessage("");
  }, [extraService, isOpen]);

  if (!isOpen) return null;

  const handleTogglePlan = (planId: string) => {
    setSelectedPlans((prev) => {
      const exists = prev.includes(planId);
      const updated = exists ? prev.filter((id) => id !== planId) : [...prev, planId];
      setFormData((f) => ({ ...f, restricted_plans: JSON.stringify(updated) }));
      return updated;
    });
  };

  const handleToggleRole = (roleId: string) => {
    setSelectedRoles((prev) => {
      let updated: string[];
      if (roleId === "all") {
        updated = ["all"];
      } else {
        const withoutAll = prev.filter((r) => r !== "all");
        if (withoutAll.includes(roleId)) {
          updated = withoutAll.filter((r) => r !== roleId);
          if (updated.length === 0) updated = ["all"];
        } else {
          updated = [...withoutAll, roleId];
        }
      }
      setFormData((f) => ({ ...f, restricted_roles: JSON.stringify(updated) }));
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.title || (typeof formData.title === "string" && !formData.title.trim())) {
      setErrorMessage(tUi("admin.extra_services.error_title"));
      return;
    }

    if (formData.price === undefined || formData.price === null || isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      setErrorMessage(tUi("admin.extra_services.error_price"));
      return;
    }

    const finalPlans = restrictPlansToggle ? selectedPlans : [];

    try {
      setIsSubmitting(true);
      await onSave({
        ...formData,
        price: Number(formData.price),
        original_price: formData.original_price ? Number(formData.original_price) : null,
        min_quantity: formData.min_quantity ? Math.max(1, Number(formData.min_quantity)) : 1,
        max_quantity: formData.max_quantity ? Math.max(1, Number(formData.max_quantity)) : 99,
        restricted_plans: JSON.stringify(finalPlans),
        restricted_roles: JSON.stringify(selectedRoles)
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || tUi("admin.pricing.extra_modal.error_save"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseDisplayString = (str: string | undefined | null) => {
    if (!str) return "";
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed[language] || parsed["en"] || Object.values(parsed)[0] || "";
      }
    } catch {}
    return String(str);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-background rounded-3xl border border-border shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-surface/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">
                {formData.id
                  ? tUi("admin.extra_services.edit_title")
                  : tUi("admin.extra_services.create_title")}
              </h2>
              <p className="text-xs text-muted-text">
                {tUi("admin.extra_services.modal_subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-text hover:text-text hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Translatable Title */}
          <TranslatableInput
            label={tUi("admin.extra_services.field_title")}
            value={formData.title}
            onChange={(val) => setFormData((prev) => ({ ...prev, title: val }))}
            siteLanguages={siteLanguages}
          />

          {/* Translatable Subtitle */}
          <TranslatableInput
            label={tUi("admin.extra_services.field_subtitle")}
            value={formData.subtitle || ""}
            onChange={(val) => setFormData((prev) => ({ ...prev, subtitle: val }))}
            siteLanguages={siteLanguages}
          />

          {/* Category & Icon */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">{tUi("admin.extra_services.field_category")}</Label>
              <div className="space-y-2">
                <Input
                  value={formData.category || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder={tUi("admin.pricing.extra_modal.category_placeholder")}
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, category: cat.value }))}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                        formData.category === cat.value
                          ? "bg-primary text-background border-primary"
                          : "bg-surface text-muted-text border-border hover:text-text"
                      }`}
                    >
                      {tUi(cat.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">{tUi("admin.extra_services.field_icon")}</Label>
              <div className="grid grid-cols-5 gap-1.5 p-2 rounded-xl bg-surface/50 border border-border">
                {AVAILABLE_ICONS.map(({ id, labelKey, icon: IconComp }) => (
                  <button
                    key={id}
                    type="button"
                    title={tUi(labelKey)}
                    onClick={() => setFormData((prev) => ({ ...prev, icon: id }))}
                    className={`flex items-center justify-center p-2 rounded-lg transition-all ${
                      formData.icon === id
                        ? "bg-primary text-background shadow-xs ring-1 ring-primary"
                        : "text-muted-text hover:text-text hover:bg-surface"
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Model, Price Type, Billing Type */}
          <div className="p-4 rounded-2xl bg-surface/40 border border-border/70 space-y-4">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              {tUi("admin.extra_services.pricing_header")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Price Type Selector */}
              <div>
                <Label className="text-xs text-muted-text mb-1.5 block">
                  {tUi("admin.extra_services.price_type")}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, price_type: "fixed" }))}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      formData.price_type !== "percentage"
                        ? "bg-primary text-background border-primary shadow-xs"
                        : "bg-background text-muted-text border-border hover:text-text"
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    {tUi("admin.pricing.extra_modal.fixed_amount")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, price_type: "percentage" }))}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      formData.price_type === "percentage"
                        ? "bg-primary text-background border-primary shadow-xs"
                        : "bg-background text-muted-text border-border hover:text-text"
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    {tUi("admin.pricing.extra_modal.percentage_of_plan")}
                  </button>
                </div>
              </div>

              {/* Billing Frequency Selector */}
              <div>
                <Label className="text-xs text-muted-text mb-1.5 block">
                  {tUi("admin.extra_services.billing_type")}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, billing_type: "one_time" }))}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      formData.billing_type !== "recurring"
                        ? "bg-primary text-background border-primary shadow-xs"
                        : "bg-background text-muted-text border-border hover:text-text"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {tUi("admin.pricing.addons.billing_one_time")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, billing_type: "recurring" }))}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      formData.billing_type === "recurring"
                        ? "bg-primary text-background border-primary shadow-xs"
                        : "bg-background text-muted-text border-border hover:text-text"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {tUi("admin.pricing.extra_modal.recurring")}
                  </button>
                </div>
              </div>
            </div>

            {/* Price values & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
              <div>
                <Label className="mb-1.5 block text-xs">
                  {formData.price_type === "percentage"
                    ? tUi("admin.pricing.extra_modal.percentage_rate")
                    : tUi("admin.extra_services.field_price")}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.price ?? ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value === "" ? 0 : Number(e.target.value) }))}
                    required
                  />
                  <div className="absolute right-3 top-2.5 text-xs text-muted-text font-medium pointer-events-none">
                    {formData.price_type === "percentage" ? "%" : formData.currency}
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs">
                  {tUi("admin.extra_services.field_original_price")}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.original_price ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, original_price: e.target.value === "" ? null : Number(e.target.value) }))}
                  placeholder={tUi("admin.pricing.extra_modal.original_price_placeholder")}
                />
              </div>

              <div>
                <Label className="mb-1.5 block text-xs">{tUi("admin.extra_services.field_currency")}</Label>
                <select
                  value={formData.currency || "USD"}
                  onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="HUF">HUF (Ft)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="CHF">CHF (Fr)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Unit & Quantity Configuration */}
          <div className="p-4 rounded-2xl bg-surface/40 border border-border/70 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">{tUi("admin.extra_services.field_unit")}</Label>
                <select
                  value={formData.unit || "item"}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {PRESET_UNITS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {tUi(u.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="mb-1.5 block">{tUi("admin.extra_services.field_quantity_allowed")}</Label>
                <div className="flex items-center gap-3 pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.allow_quantity)}
                      onChange={(e) => setFormData((prev) => ({ ...prev, allow_quantity: e.target.checked ? 1 : 0 }))}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-text">
                      {tUi("admin.extra_services.allow_quantity_label")}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {Boolean(formData.allow_quantity) && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
                <div>
                  <Label className="text-xs text-muted-text mb-1 block">
                    {tUi("admin.extra_services.min_qty")}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.min_quantity || 1}
                    onChange={(e) => setFormData((prev) => ({ ...prev, min_quantity: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-text mb-1 block">
                    {tUi("admin.extra_services.max_qty")}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.max_quantity || 10}
                    onChange={(e) => setFormData((prev) => ({ ...prev, max_quantity: Number(e.target.value) }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Plan & Role Restrictions */}
          <div className="p-4 rounded-2xl bg-surface/40 border border-border/70 space-y-3">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              {tUi("admin.extra_services.restrictions_header")}
            </h3>

            {/* Plan restriction toggle */}
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restrictPlansToggle}
                  onChange={(e) => {
                    setRestrictPlansToggle(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedPlans([]);
                      setFormData((p) => ({ ...p, restricted_plans: JSON.stringify([]) }));
                    }
                  }}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-text">
                  {tUi("admin.pricing.extra_modal.restrict_plans")}
                </span>
              </label>

              {restrictPlansToggle && (
                <div className="p-3 rounded-xl bg-background border border-border/80 space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-xs text-muted-text">
                    {tUi("admin.pricing.extra_modal.select_packages")}
                  </p>
                  {availablePlans.length === 0 ? (
                    <p className="text-xs text-muted-text italic">{tUi("admin.pricing.extra_modal.no_plans")}</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availablePlans.map((plan) => {
                        const isChecked = selectedPlans.includes(plan.id);
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => handleTogglePlan(plan.id)}
                            className={`p-2 rounded-lg border text-left text-xs flex items-center gap-2 transition-all ${
                              isChecked
                                ? "bg-primary/10 border-primary text-text font-medium"
                                : "bg-surface/30 border-border text-muted-text hover:text-text"
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className="truncate">{parseDisplayString(plan.title)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User role restrictions */}
            <div className="pt-2 border-t border-border/40">
              <Label className="text-xs text-muted-text mb-1.5 block">
                {tUi("admin.pricing.extra_modal.role_access")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ROLES.map((role) => {
                  const isSelected = selectedRoles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleToggleRole(role.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-primary text-background border-primary font-medium shadow-xs"
                          : "bg-background text-muted-text border-border hover:text-text"
                      }`}
                    >
                      {tUi(role.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="mb-1.5 block">{tUi("admin.extra_services.field_description")}</Label>
            <Textarea
              value={formData.description || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder={tUi("admin.pricing.extra_modal.description_placeholder")}
            />
          </div>

          {/* Toggles: Featured, Enabled & Show on Pricing Page */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-surface/40 border border-border/70">
            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(formData.is_featured)}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_featured: e.target.checked ? 1 : 0 }))}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-semibold text-text block">
                  {tUi("admin.extra_services.featured_toggle")}
                </span>
                <span className="text-[11px] text-muted-text">
                  {tUi("admin.pricing.extra_modal.featured_hint")}
                </span>
              </div>
            </label>

            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(formData.is_enabled)}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_enabled: e.target.checked ? 1 : 0 }))}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-semibold text-text block">
                  {tUi("admin.extra_services.enabled_toggle")}
                </span>
                <span className="text-[11px] text-muted-text">
                  {tUi("admin.pricing.extra_modal.enabled_hint")}
                </span>
              </div>
            </label>

            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(formData.show_on_pricing_page)}
                onChange={(e) => setFormData((prev) => ({ ...prev, show_on_pricing_page: e.target.checked ? 1 : 0 }))}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-semibold text-text block">
                  {tUi("admin.pricing.extra_modal.show_website")}
                </span>
                <span className="text-[11px] text-muted-text">
                  {tUi("admin.pricing.extra_modal.public_pricing_hint")}
                </span>
              </div>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {tUi("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? tUi("common.saving")
                : formData.id
                ? tUi("common.save_changes")
                : tUi("admin.extra_services.create_btn")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
