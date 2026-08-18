import React, { useState, useEffect } from "react";
import { PricingFeeRule, DistanceTier, PricingFeeType, PricingPlan } from "../../lib/types";
import { TranslatableInput } from "./TranslatableInput";
import { useLanguage } from "../../contexts/LanguageContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Textarea } from "../ui/Textarea";
import {
  X,
  MapPin,
  Car,
  Navigation,
  DollarSign,
  Plus,
  Trash2,
  AlertCircle,
  Calculator,
  Check,
  Sparkles,
  Info,
  Percent,
  Layers,
  Filter,
  CheckSquare,
  Square,
  Sliders,
  ShieldCheck,
  Eye,
  Globe
} from "lucide-react";
import { formatCurrencyPrice } from "../public/Pricing";
import { calculateFeeRuleCost } from "../../lib/utils";

interface FeeRuleModalProps {
  isOpen: boolean;
  feeRule: Partial<PricingFeeRule> | null;
  siteLanguages: string;
  onClose: () => void;
  onSave: (feeData: Partial<PricingFeeRule>) => Promise<void>;
}

const ORDER_TYPES = [
  { id: "all", label: "All Order Types" },
  { id: "residential", label: "Residential Real Estate" },
  { id: "commercial", label: "Commercial Properties" },
  { id: "rush", label: "Rush / Expedited Turnaround" },
  { id: "weekend", label: "Weekend / Holiday Bookings" }
];

export function FeeRuleModal({
  isOpen,
  feeRule,
  siteLanguages,
  onClose,
  onSave
}: FeeRuleModalProps) {
  const { tUi, language } = useLanguage();

  const [formData, setFormData] = useState<Partial<PricingFeeRule>>({
    name: "",
    description: "",
    fee_type: "fixed",
    amount: 25,
    currency: "USD",
    unit: "flat",
    min_distance: 0,
    min_fee: 0,
    max_distance: null,
    tiers: JSON.stringify([]),
    applicable_conditions: "all",
    applicable_plans: JSON.stringify([]),
    applicable_regions: "",
    applicable_order_types: "all",
    min_order_amount: null,
    max_order_amount: null,
    is_mandatory: 1,
    is_default_active: 1,
    is_enabled: 1,
    show_on_pricing_page: 1,
    sort_order: 0
  });

  const [availablePlans, setAvailablePlans] = useState<PricingPlan[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [restrictPlansToggle, setRestrictPlansToggle] = useState(false);

  const [tiersList, setTiersList] = useState<DistanceTier[]>([]);
  
  // Interactive Simulator State
  const [testDistance, setTestDistance] = useState<number>(35);
  const [testOrderAmount, setTestOrderAmount] = useState<number>(350);

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
    if (feeRule) {
      let parsedTiers: DistanceTier[] = [];
      try {
        parsedTiers = typeof feeRule.tiers === "string" ? JSON.parse(feeRule.tiers || "[]") : (feeRule.tiers || []);
      } catch {
        parsedTiers = [];
      }

      let parsedPlans: string[] = [];
      try {
        parsedPlans = typeof feeRule.applicable_plans === "string"
          ? JSON.parse(feeRule.applicable_plans || "[]")
          : (feeRule.applicable_plans || []);
      } catch {
        parsedPlans = [];
      }

      setFormData({
        id: feeRule.id,
        name: feeRule.name || "",
        description: feeRule.description || "",
        fee_type: feeRule.fee_type || "fixed",
        amount: feeRule.amount !== undefined ? feeRule.amount : 25,
        currency: feeRule.currency || "USD",
        unit: feeRule.unit || (feeRule.fee_type === "percentage" ? "%" : feeRule.fee_type === "distance" || feeRule.fee_type === "distance_tiered" ? "km" : "flat"),
        min_distance: feeRule.min_distance !== undefined ? feeRule.min_distance : 0,
        min_fee: feeRule.min_fee !== undefined ? feeRule.min_fee : 0,
        max_distance: feeRule.max_distance ?? null,
        tiers: typeof feeRule.tiers === "string" ? feeRule.tiers : JSON.stringify(parsedTiers),
        applicable_conditions: feeRule.applicable_conditions || "all",
        applicable_plans: JSON.stringify(parsedPlans),
        applicable_regions: feeRule.applicable_regions || "",
        applicable_order_types: feeRule.applicable_order_types || "all",
        min_order_amount: feeRule.min_order_amount ?? null,
        max_order_amount: feeRule.max_order_amount ?? null,
        is_mandatory: feeRule.is_mandatory !== undefined ? feeRule.is_mandatory : 1,
        is_default_active: feeRule.is_default_active !== undefined ? feeRule.is_default_active : 1,
        is_enabled: feeRule.is_enabled !== undefined ? feeRule.is_enabled : 1,
        show_on_pricing_page: feeRule.show_on_pricing_page !== undefined ? feeRule.show_on_pricing_page : 1,
        sort_order: feeRule.sort_order || 0
      });

      setTiersList(parsedTiers);
      setSelectedPlans(parsedPlans);
      setRestrictPlansToggle(parsedPlans.length > 0);
    } else {
      const defaultTiers: DistanceTier[] = [
        { from_km: 0, to_km: 15, rate_per_km: 0 },
        { from_km: 15, to_km: 50, rate_per_km: 1.25 },
        { from_km: 50, to_km: null, rate_per_km: 1.65 }
      ];

      setFormData({
        name: "",
        description: "",
        fee_type: "fixed",
        amount: 25,
        currency: "USD",
        unit: "flat",
        min_distance: 0,
        min_fee: 0,
        max_distance: null,
        tiers: JSON.stringify(defaultTiers),
        applicable_conditions: "all",
        applicable_plans: JSON.stringify([]),
        applicable_regions: "",
        applicable_order_types: "all",
        min_order_amount: null,
        max_order_amount: null,
        is_mandatory: 1,
        is_default_active: 1,
        is_enabled: 1,
        show_on_pricing_page: 1,
        sort_order: 0
      });

      setTiersList(defaultTiers);
      setSelectedPlans([]);
      setRestrictPlansToggle(false);
    }
    setErrorMessage("");
  }, [feeRule, isOpen]);

  if (!isOpen) return null;

  const handleTogglePlan = (planId: string) => {
    setSelectedPlans((prev) => {
      const exists = prev.includes(planId);
      const updated = exists ? prev.filter((id) => id !== planId) : [...prev, planId];
      setFormData((f) => ({ ...f, applicable_plans: JSON.stringify(updated) }));
      return updated;
    });
  };

  const handleAddTier = () => {
    const lastTier = tiersList[tiersList.length - 1];
    const newFrom = lastTier ? (lastTier.to_km !== null ? lastTier.to_km : lastTier.from_km + 20) : 0;
    const newTier: DistanceTier = {
      from_km: newFrom,
      to_km: newFrom + 30,
      rate_per_km: 1.5
    };
    const updated = [...tiersList, newTier];
    setTiersList(updated);
    setFormData((f) => ({ ...f, tiers: JSON.stringify(updated) }));
  };

  const handleRemoveTier = (index: number) => {
    const updated = tiersList.filter((_, i) => i !== index);
    setTiersList(updated);
    setFormData((f) => ({ ...f, tiers: JSON.stringify(updated) }));
  };

  const handleUpdateTier = (index: number, field: keyof DistanceTier, value: any) => {
    const updated = tiersList.map((tier, i) => {
      if (i === index) {
        return {
          ...tier,
          [field]: field === "to_km" && value === "" ? null : Number(value)
        };
      }
      return tier;
    });
    setTiersList(updated);
    setFormData((f) => ({ ...f, tiers: JSON.stringify(updated) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.name || (typeof formData.name === "string" && !formData.name.trim())) {
      setErrorMessage(tUi("admin.fee_rules.error_name") || "Fee rule name is required");
      return;
    }

    if (formData.amount === undefined || formData.amount === null || isNaN(Number(formData.amount)) || Number(formData.amount) < 0) {
      setErrorMessage(tUi("admin.fee_rules.error_amount") || "Amount must be a valid positive number");
      return;
    }

    const finalPlans = restrictPlansToggle ? selectedPlans : [];

    try {
      setIsSubmitting(true);
      await onSave({
        ...formData,
        amount: Number(formData.amount),
        min_distance: formData.min_distance !== undefined && formData.min_distance !== null ? Number(formData.min_distance) : 0,
        min_fee: formData.min_fee !== undefined && formData.min_fee !== null ? Number(formData.min_fee) : 0,
        max_distance: formData.max_distance !== undefined && formData.max_distance !== null && formData.max_distance !== "" ? Number(formData.max_distance) : null,
        min_order_amount: formData.min_order_amount !== undefined && formData.min_order_amount !== null && formData.min_order_amount !== "" ? Number(formData.min_order_amount) : null,
        max_order_amount: formData.max_order_amount !== undefined && formData.max_order_amount !== null && formData.max_order_amount !== "" ? Number(formData.max_order_amount) : null,
        tiers: JSON.stringify(tiersList),
        applicable_plans: JSON.stringify(finalPlans)
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save fee rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run calculation simulation
  const simulationResult = calculateFeeRuleCost(
    {
      fee_type: formData.fee_type || "fixed",
      amount: Number(formData.amount || 0),
      min_distance: formData.min_distance,
      min_fee: formData.min_fee,
      max_distance: formData.max_distance,
      min_order_amount: formData.min_order_amount,
      max_order_amount: formData.max_order_amount,
      tiers: JSON.stringify(tiersList)
    },
    testDistance,
    testOrderAmount
  );

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
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">
                {formData.id
                  ? tUi("admin.fee_rules.edit_title") || "Edit Fee Rule"
                  : tUi("admin.fee_rules.create_title") || "Create Fee / Surcharge Rule"}
              </h2>
              <p className="text-xs text-muted-text">
                {tUi("admin.fee_rules.modal_subtitle") || "Configure fixed, percentage, or distance-based fees with conditional triggers"}
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
          {/* Fee Rule Name */}
          <TranslatableInput
            label={tUi("admin.fee_rules.field_name") || "Fee Rule Name"}
            value={formData.name}
            onChange={(val) => setFormData((prev) => ({ ...prev, name: val }))}
            siteLanguages={siteLanguages}
          />

          {/* Description */}
          <div>
            <Label className="mb-1.5 block">{tUi("admin.fee_rules.field_description") || "Description / Fee Terms"}</Label>
            <Textarea
              value={formData.description || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="e.g. Standard travel fee outside metro area or rush surcharge..."
            />
          </div>

          {/* Fee Type Selection */}
          <div className="p-4 rounded-2xl bg-surface/40 border border-border/70 space-y-3">
            <Label className="text-xs font-semibold text-text uppercase tracking-wider block">
              {tUi("admin.fee_rules.fee_type_label") || "Fee Calculation Type"}
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, fee_type: "fixed", unit: "flat" }))}
                className={`p-3 rounded-xl border text-center transition-all ${
                  formData.fee_type === "fixed"
                    ? "bg-primary text-background border-primary shadow-xs font-medium"
                    : "bg-background text-muted-text border-border hover:text-text"
                }`}
              >
                <DollarSign className="w-4 h-4 mx-auto mb-1" />
                <span className="text-xs block font-semibold">Fixed Fee</span>
                <span className="text-[10px] opacity-80 block">Flat surcharge</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, fee_type: "percentage", unit: "%" }))}
                className={`p-3 rounded-xl border text-center transition-all ${
                  formData.fee_type === "percentage"
                    ? "bg-primary text-background border-primary shadow-xs font-medium"
                    : "bg-background text-muted-text border-border hover:text-text"
                }`}
              >
                <Percent className="w-4 h-4 mx-auto mb-1" />
                <span className="text-xs block font-semibold">Percentage</span>
                <span className="text-[10px] opacity-80 block">% of subtotal</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, fee_type: "distance", unit: "km" }))}
                className={`p-3 rounded-xl border text-center transition-all ${
                  formData.fee_type === "distance"
                    ? "bg-primary text-background border-primary shadow-xs font-medium"
                    : "bg-background text-muted-text border-border hover:text-text"
                }`}
              >
                <Navigation className="w-4 h-4 mx-auto mb-1" />
                <span className="text-xs block font-semibold">Flat Distance</span>
                <span className="text-[10px] opacity-80 block">Fixed rate / km</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, fee_type: "distance_tiered", unit: "km" }))}
                className={`p-3 rounded-xl border text-center transition-all ${
                  formData.fee_type === "distance_tiered"
                    ? "bg-primary text-background border-primary shadow-xs font-medium"
                    : "bg-background text-muted-text border-border hover:text-text"
                }`}
              >
                <Sliders className="w-4 h-4 mx-auto mb-1" />
                <span className="text-xs block font-semibold">Tiered Distance</span>
                <span className="text-[10px] opacity-80 block">Zone-based rates</span>
              </button>
            </div>
          </div>

          {/* Amount / Rate & Currency Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-surface/40 border border-border/70">
            <div>
              <Label className="mb-1.5 block text-xs">
                {formData.fee_type === "percentage"
                  ? "Percentage Rate (%)"
                  : formData.fee_type === "distance" || formData.fee_type === "distance_tiered"
                  ? "Default Rate per km"
                  : "Fixed Fee Amount"}
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.amount ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value === "" ? 0 : Number(e.target.value) }))}
                  required
                />
                <div className="absolute right-3 top-2.5 text-xs text-muted-text font-medium pointer-events-none">
                  {formData.fee_type === "percentage" ? "%" : formData.currency}
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">Minimum Fee Floor (Optional)</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={formData.min_fee ?? ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, min_fee: e.target.value === "" ? 0 : Number(e.target.value) }))}
                placeholder="0 = No minimum"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">Currency</Label>
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

          {/* Distance-specific Tiers Editor (When Distance or Tiered selected) */}
          {(formData.fee_type === "distance" || formData.fee_type === "distance_tiered") && (
            <div className="p-4 rounded-2xl bg-surface/40 border border-border/70 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Distance Zones & Allowances
                  </h3>
                  <p className="text-xs text-muted-text">
                    Configure free distance radius and tiered rate brackets
                  </p>
                </div>
                {formData.fee_type === "distance_tiered" && (
                  <Button type="button" size="sm" variant="outline" onClick={handleAddTier} className="gap-1 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Add Zone Tier
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-text mb-1 block">Free Travel Radius (km)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.min_distance ?? 0}
                    onChange={(e) => setFormData((p) => ({ ...p, min_distance: Number(e.target.value) }))}
                    placeholder="e.g. 15 km free"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-text mb-1 block">Max Travel Limit (km)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.max_distance ?? ""}
                    onChange={(e) => setFormData((p) => ({ ...p, max_distance: e.target.value === "" ? null : Number(e.target.value) }))}
                    placeholder="Optional max distance cap"
                  />
                </div>
              </div>

              {formData.fee_type === "distance_tiered" && (
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-text px-1">
                    <span className="col-span-4">From (km)</span>
                    <span className="col-span-4">To (km)</span>
                    <span className="col-span-3">Rate / km</span>
                    <span className="col-span-1"></span>
                  </div>

                  {tiersList.map((tier, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <Input
                          type="number"
                          min="0"
                          value={tier.from_km}
                          onChange={(e) => handleUpdateTier(idx, "from_km", e.target.value)}
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          type="number"
                          min="0"
                          placeholder="∞ (Any)"
                          value={tier.to_km !== null && tier.to_km !== undefined ? tier.to_km : ""}
                          onChange={(e) => handleUpdateTier(idx, "to_km", e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.rate_per_km}
                          onChange={(e) => handleUpdateTier(idx, "rate_per_km", e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveTier(idx)}
                          className="p-1.5 text-muted-text hover:text-rose-500 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conditional Triggers & Scope */}
          <div className="p-4 rounded-2xl bg-surface/40 border border-border/70 space-y-4">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Application Conditions & Thresholds
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-text mb-1 block">Applicable Order Type</Label>
                <select
                  value={formData.applicable_order_types || "all"}
                  onChange={(e) => setFormData((p) => ({ ...p, applicable_order_types: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {ORDER_TYPES.map((ot) => (
                    <option key={ot.id} value={ot.id}>
                      {ot.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs text-muted-text mb-1 block">Geographic Region Filter</Label>
                <Input
                  value={formData.applicable_regions || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, applicable_regions: e.target.value }))}
                  placeholder="e.g. All Regions or Budapest / Pest County"
                />
              </div>
            </div>

            {/* Min / Max order amount thresholds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
              <div>
                <Label className="text-xs text-muted-text mb-1 block">Min Order Amount Threshold</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.min_order_amount ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, min_order_amount: e.target.value === "" ? null : Number(e.target.value) }))}
                  placeholder="Applies when order total ≥ amount"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-text mb-1 block">Max Order Amount Threshold</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.max_order_amount ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, max_order_amount: e.target.value === "" ? null : Number(e.target.value) }))}
                  placeholder="Applies when order total ≤ amount"
                />
              </div>
            </div>

            {/* Plan restriction toggle */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restrictPlansToggle}
                  onChange={(e) => {
                    setRestrictPlansToggle(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedPlans([]);
                      setFormData((p) => ({ ...p, applicable_plans: JSON.stringify([]) }));
                    }
                  }}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs font-medium text-text">
                  Restrict fee to specific Pricing Plans / Bundles
                </span>
              </label>

              {restrictPlansToggle && (
                <div className="p-3 rounded-xl bg-background border border-border/80 space-y-2 max-h-40 overflow-y-auto">
                  <p className="text-xs text-muted-text">
                    Select plans this fee rule applies to:
                  </p>
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
                </div>
              )}
            </div>
          </div>

          {/* Interactive Fee Simulator */}
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Live Fee Calculation Simulator
              </h3>
              <span className="text-xs font-bold text-primary">
                Calculated: {formatCurrencyPrice(simulationResult.fee, formData.currency || "USD")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(formData.fee_type === "distance" || formData.fee_type === "distance_tiered") && (
                <div>
                  <Label className="text-xs text-muted-text mb-1 block">Test Distance (km)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={testDistance}
                    onChange={(e) => setTestDistance(Number(e.target.value))}
                  />
                </div>
              )}
              {formData.fee_type === "percentage" && (
                <div>
                  <Label className="text-xs text-muted-text mb-1 block">Test Order Subtotal</Label>
                  <Input
                    type="number"
                    min="0"
                    value={testOrderAmount}
                    onChange={(e) => setTestOrderAmount(Number(e.target.value))}
                  />
                </div>
              )}
            </div>

            <p className="text-xs text-muted-text bg-background/80 p-2.5 rounded-xl border border-border">
              <span className="font-semibold text-text">Formula Result: </span>
              {simulationResult.explanation}
            </p>
          </div>

          {/* Mandatory, Enabled & Show on Site Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-surface/40 border border-border/70">
            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(formData.is_mandatory)}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_mandatory: e.target.checked ? 1 : 0 }))}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-semibold text-text block">
                  Mandatory Fee
                </span>
                <span className="text-[11px] text-muted-text">
                  {formData.is_mandatory ? "Auto-applied on quote" : "Optional surcharge"}
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
                  Active / Enabled
                </span>
                <span className="text-[11px] text-muted-text">
                  Enforces calculation
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
                  Public Transparency
                </span>
                <span className="text-[11px] text-muted-text">
                  Show on pricing page
                </span>
              </div>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {tUi("common.cancel") || "Cancel"}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? tUi("common.saving") || "Saving..."
                : formData.id
                ? tUi("common.save_changes") || "Save Changes"
                : tUi("admin.fee_rules.create_btn") || "Create Fee Rule"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
