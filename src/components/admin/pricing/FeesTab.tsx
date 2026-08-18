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
        throw new Error(err.error || "Failed to load fee rules");
      }
    } catch (error: any) {
      console.error("Failed to load fee rules:", error);
      showToast(error.message || "Failed to load fee rules", "error");
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
      if (!res.ok) throw new Error("Failed to update status");
      showToast(newStatus ? "Fee rule enabled" : "Fee rule disabled");
    } catch (err: any) {
      showToast(err.message || "Failed to update status", "error");
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
        throw new Error(err.error || "Failed to update fee rule");
      }
      showToast("Fee rule updated successfully");
    } else {
      const res = await fetchApi("/api/admin/fee-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feeData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create fee rule");
      }
      showToast("Fee rule created successfully");
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
        throw new Error(err.error || "Failed to delete fee rule");
      }
      showToast("Fee rule deleted successfully");
      setDeleteConfirmFee(null);
      await loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to delete fee rule", "error");
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
                placeholder="Search fee rules, descriptions, regions..."
                className="pl-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-background text-text text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="all">All Fee Types</option>
                <option value="fixed">Fixed Flat Fee</option>
                <option value="percentage">Percentage (%) Fee</option>
                <option value="distance">Distance Flat Rate</option>
                <option value="distance_tiered">Tiered Distance Zones</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-10 px-3 rounded-lg border border-border bg-background text-text text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="enabled">Enabled Only</option>
                <option value="disabled">Disabled Only</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="h-10 px-3 text-muted-text hover:text-text"
              title="Refresh"
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
              <span>Create Fee Rule</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 text-center text-muted-text">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
          <p>Loading fee rules...</p>
        </div>
      ) : filteredFeeRules.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border-2 border-dashed border-border bg-surface/30 p-8">
          <Car className="w-12 h-12 text-muted-text mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-text mb-1">No Fee Rules Configured</h3>
          <p className="text-sm text-muted-text max-w-md mx-auto mb-6">
            Configure delivery fees, travel surcharges, rush handling fees, or percentage service fees with automatic threshold triggers.
          </p>
          <Button
            onClick={() => {
              setSelectedFee(null);
              setIsModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Fee Rule</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFeeRules.map((rule) => {
            const name = getDisplayText(rule.name, currentLang) || "Untitled Fee Rule";
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
                          {rule.fee_type === "fixed"
                            ? "Fixed Fee"
                            : rule.fee_type === "percentage"
                            ? "Percentage Fee"
                            : rule.fee_type === "distance"
                            ? "Distance Rate"
                            : "Tiered Distance Zones"}
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
                        title={isEnabled ? "Enabled (Click to disable)" : "Disabled (Click to enable)"}
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
                      {isMandatory ? "Mandatory Fee" : "Optional / Surcharge"}
                    </span>

                    {rule.min_distance && rule.min_distance > 0 ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {rule.min_distance} {rule.unit || "km"} Free
                      </span>
                    ) : null}

                    {applicablePlans.length > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> {applicablePlans.length} Plans
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
                        ? `${rule.amount}% of order`
                        : `${formatCurrencyPrice(rule.amount, rule.currency)} / ${rule.unit || "km"}`}
                    </span>
                    {rule.min_fee && rule.min_fee > 0 ? (
                      <span className="text-[11px] text-muted-text block">
                        Min floor: {formatCurrencyPrice(rule.min_fee, rule.currency)}
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
                      Edit
                    </Button>
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

            <h3 className="text-lg font-bold text-text mb-2">Delete Fee Rule?</h3>
            <p className="text-sm text-muted-text mb-6">
              Are you sure you want to delete <strong>{getDisplayText(deleteConfirmFee.name, currentLang)}</strong>? This will stop calculating this fee on future orders and pricing checks.
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirmFee(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteFee} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
                {isDeleting ? "Deleting..." : "Delete Fee"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
