import React, { useState, useEffect, useMemo } from "react";
import { PricingFeeRule } from "../../../lib/types";
import { useApi } from "../../../hooks/useApi";
import { useLanguage } from "../../../contexts/LanguageContext";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Card, CardContent } from "../../ui/Card";
import { FeeRuleModal } from "../FeeRuleModal";
import { formatCurrencyPrice } from "../../public/Pricing";
import { calculateFeeRuleCost } from "../../../lib/utils";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Car,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  Percent,
  DollarSign,
  Navigation,
  Sliders,
  Filter,
  CheckCircle2,
  Calculator,
  ShieldCheck
} from "lucide-react";

interface FeesTabProps {
  siteLanguages: string;
  showToast: (text: string, type?: "success" | "error") => void;
}

function getDisplayText(val: string | undefined | null, lang = "en"): string {
  if (!val) return "";
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed[lang] || parsed["en"] || Object.values(parsed)[0] || "";
    }
  } catch {}
  return String(val);
}

export function FeesTab({ siteLanguages, showToast }: FeesTabProps) {
  const { currentLang, tUi } = useLanguage();
  const { fetchApi } = useApi();

  const [feeRules, setFeeRules] = useState<PricingFeeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Partial<PricingFeeRule> | null>(null);
  const [deleteConfirmFee, setDeleteConfirmFee] = useState<PricingFeeRule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi("/api/admin/fee-rules");
      if (res.ok) {
        const data = await res.json();
        setFeeRules(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || tUi("admin.pricing.fees.load_failed"));
      }
    } catch (error: any) {
      console.error("Failed to load fee rules:", error);
      showToast(error.message || tUi("admin.pricing.fees.load_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredFeeRules = useMemo(() => {
    return feeRules.filter((f) => {
      if (typeFilter !== "all" && f.fee_type !== typeFilter) return false;
      if (statusFilter === "enabled" && !Boolean(f.is_enabled)) return false;
      if (statusFilter === "disabled" && Boolean(f.is_enabled)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = getDisplayText(f.name, currentLang).toLowerCase();
        const desc = (f.description || "").toLowerCase();
        const region = (f.applicable_regions || "").toLowerCase();
        return name.includes(q) || desc.includes(q) || region.includes(q);
      }
      return true;
    });
  }, [feeRules, typeFilter, statusFilter, searchQuery, currentLang]);

  const handleToggleEnabled = async (rule: PricingFeeRule) => {
    const newStatus = rule.is_enabled ? 0 : 1;
    setFeeRules((prev) =>
      prev.map((f) => (f.id === rule.id ? { ...f, is_enabled: newStatus } : f))
    );

    try {
      const res = await fetchApi(`/api/admin/fee-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, is_enabled: newStatus }),
      });
      if (!res.ok) throw new Error(tUi("admin.pricing.fees.status_failed"));
      showToast(tUi(newStatus ? "admin.pricing.fees.enabled" : "admin.pricing.fees.disabled"));
    } catch (err: any) {
      showToast(err.message || tUi("admin.pricing.fees.status_failed"), "error");
      loadData();
    }
  };

  const handleSaveFee = async (feeData: Partial<PricingFeeRule>) => {
    if (feeData.id) {
      const res = await fetchApi(`/api/admin/fee-rules/${feeData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feeData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || tUi("admin.pricing.fees.update_failed"));
      }
      showToast(tUi("admin.pricing.fees.updated"));
    } else {
      const res = await fetchApi("/api/admin/fee-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feeData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || tUi("admin.pricing.fees.create_failed"));
      }
      showToast(tUi("admin.pricing.fees.created"));
    }
    await loadData();
  };

  const handleDeleteFee = async () => {
    if (!deleteConfirmFee) return;
    try {
      setIsDeleting(true);
      const res = await fetchApi(`/api/admin/fee-rules/${deleteConfirmFee.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || tUi("admin.pricing.fees.delete_failed"));
      }
      showToast(tUi("admin.pricing.fees.deleted"));
      setDeleteConfirmFee(null);
      await loadData();
    } catch (error: any) {
      showToast(error.message || tUi("admin.pricing.fees.delete_failed"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Action Bar */}
      <Card className="border-border">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tUi("admin.pricing.fees.search")}
                className="pl-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-background text-text text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="all">{tUi("admin.pricing.fees.all_types")}</option>
                <option value="fixed">{tUi("admin.pricing.fees.fixed")}</option>
                <option value="percentage">{tUi("admin.pricing.fees.percentage")}</option>
                <option value="distance">{tUi("admin.pricing.fees.distance")}</option>
                <option value="distance_tiered">{tUi("admin.pricing.fees.distance_tiered")}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-10 px-3 rounded-lg border border-border bg-background text-text text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="all">{tUi("admin.pricing.all_statuses")}</option>
                <option value="enabled">{tUi("admin.pricing.enabled_only")}</option>
                <option value="disabled">{tUi("admin.pricing.disabled_only")}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="h-10 px-3 text-muted-text hover:text-text"
              title={tUi("admin.pricing.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            <Button
              onClick={() => {
                setSelectedFee(null);
                setIsModalOpen(true);
              }}
              className="gap-2 h-10"
            >
              <Plus className="w-4 h-4" />
              <span>{tUi("admin.pricing.fees.create")}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 text-center text-muted-text">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
          <p>{tUi("admin.pricing.fees.loading")}</p>
        </div>
      ) : filteredFeeRules.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border-2 border-dashed border-border bg-surface/30 p-8">
          <Car className="w-12 h-12 text-muted-text mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-text mb-1">{tUi("admin.pricing.fees.empty_title")}</h3>
          <p className="text-sm text-muted-text max-w-md mx-auto mb-6">
            {tUi("admin.pricing.fees.empty_desc")}
          </p>
          <Button
            onClick={() => {
              setSelectedFee(null);
              setIsModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{tUi("admin.pricing.fees.create_first")}</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFeeRules.map((rule) => {
            const name = getDisplayText(rule.name, currentLang) || tUi("admin.pricing.fees.untitled");
            const isEnabled = Boolean(rule.is_enabled);
            const isMandatory = Boolean(rule.is_mandatory);

            let applicablePlans: string[] = [];
            try {
              applicablePlans = typeof rule.applicable_plans === "string"
                ? JSON.parse(rule.applicable_plans || "[]")
                : (rule.applicable_plans || []);
            } catch {}

            return (
              <div
                key={rule.id}
                className={`p-5 rounded-2xl border transition-all duration-200 bg-background flex flex-col justify-between ${
                  isEnabled ? "border-border shadow-xs hover:shadow-md" : "border-border/60 bg-surface/30 opacity-70"
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-primary/10 text-primary font-bold">
                        {rule.fee_type === "percentage" ? (
                          <Percent className="w-4 h-4" />
                        ) : rule.fee_type === "distance" || rule.fee_type === "distance_tiered" ? (
                          <Car className="w-4 h-4" />
                        ) : (
                          <DollarSign className="w-4 h-4" />
                        )}
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-text">{name}</h4>
                        <span className="text-[10px] font-semibold text-muted-text uppercase tracking-wider">
                          {tUi(rule.fee_type === "fixed" ? "admin.pricing.fees.type_fixed" : rule.fee_type === "percentage" ? "admin.pricing.fees.type_percentage" : rule.fee_type === "distance" ? "admin.pricing.fees.type_distance" : "admin.pricing.fees.type_distance_tiered")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(rule)}
                        className={`p-1.5 rounded-lg text-xs transition-colors ${
                          isEnabled ? "text-emerald-600 hover:bg-emerald-500/10" : "text-muted-text hover:bg-surface"
                        }`}
                        title={tUi(isEnabled ? "admin.pricing.fees.enabled_title" : "admin.pricing.fees.disabled_title")}
                      >
                        {isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {rule.description && (
                    <p className="text-xs text-muted-text line-clamp-2 mb-3 leading-relaxed">
                      {rule.description}
                    </p>
                  )}

                  {/* Badges: Mandatory, Conditions, Free Allowance */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                        isMandatory
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          : "bg-surface text-muted-text border-border"
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {tUi(isMandatory ? "admin.pricing.fees.mandatory" : "admin.pricing.fees.optional_surcharge")}
                    </span>

                    {rule.min_distance && rule.min_distance > 0 ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {rule.min_distance} {rule.unit || "km"} {tUi("admin.pricing.fees.free")}
                      </span>
                    ) : null}

                    {applicablePlans.length > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> {applicablePlans.length} {tUi("admin.pricing.fees.plans")}
                      </span>
                    )}

                    {rule.applicable_regions && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface text-text border border-border">
                        {rule.applicable_regions}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer: Amount & Actions */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-lg font-bold text-text">
                      {rule.fee_type === "fixed"
                        ? formatCurrencyPrice(rule.amount, rule.currency)
                        : rule.fee_type === "percentage"
                        ? `${rule.amount}% ${tUi("admin.pricing.fees.of_order")}`
                        : `${formatCurrencyPrice(rule.amount, rule.currency)} / ${rule.unit || "km"}`}
                    </span>
                    {rule.min_fee && rule.min_fee > 0 ? (
                      <span className="text-[11px] text-muted-text block">
                        {tUi("admin.pricing.fees.min_floor")} {formatCurrencyPrice(rule.min_fee, rule.currency)}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedFee(rule);
                        setIsModalOpen(true);
                      }}
                      className="h-8 px-2.5 text-xs text-muted-text hover:text-text"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      {tUi("admin.customers.edit")}</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirmFee(rule)}
                      className="h-8 w-8 p-0 text-muted-text hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fee Rule Edit/Create Modal */}
      <FeeRuleModal
        isOpen={isModalOpen}
        feeRule={selectedFee}
        siteLanguages={siteLanguages}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFee(null);
        }}
        onSave={handleSaveFee}
      />

      {/* Delete Confirmation */}
      {deleteConfirmFee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-text mb-2">{tUi("admin.pricing.fees.delete_title")}</h3>
            <p className="text-sm text-muted-text mb-6">
              {tUi("admin.pricing.delete_modal_confirm_prefix")}<strong>{getDisplayText(deleteConfirmFee.name, currentLang)}</strong>? {tUi("admin.pricing.fees.delete_warning")}
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirmFee(null)} disabled={isDeleting}>
                {tUi("admin.clients.cancel")}</Button>
              <Button variant="destructive" onClick={handleDeleteFee} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
                {isDeleting ? tUi("admin.pricing.fees.deleting") : tUi("admin.pricing.fees.delete_action")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
