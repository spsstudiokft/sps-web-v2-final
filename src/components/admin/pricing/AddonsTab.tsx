import React, { useState, useEffect, useMemo } from "react";
import { ExtraService, SiteSettings } from "../../../lib/types";
import { useApi } from "../../../hooks/useApi";
import { useLanguage } from "../../../contexts/LanguageContext";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Card, CardContent } from "../../ui/Card";
import { ExtraServiceModal } from "../ExtraServiceModal";
import { formatCurrencyPrice } from "../../public/Pricing";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  Tag,
  Layers,
  Percent,
  DollarSign,
  Clock,
  Filter,
  CheckCircle2
} from "lucide-react";

interface AddonsTabProps {
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

export function AddonsTab({ siteLanguages, showToast }: AddonsTabProps) {
  const { currentLang, tUi } = useLanguage();
  const { fetchApi } = useApi();

  const [extraServices, setExtraServices] = useState<ExtraService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Partial<ExtraService> | null>(null);
  const [deleteConfirmService, setDeleteConfirmService] = useState<ExtraService | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi("/api/admin/extra-services");
      if (res.ok) {
        const data = await res.json();
        setExtraServices(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || tUi("admin.pricing.addons.load_failed"));
      }
    } catch (error: any) {
      console.error("Failed to load extra services:", error);
      showToast(error.message || tUi("admin.pricing.addons.load_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    extraServices.forEach((s) => {
      if (s.category && s.category.trim()) set.add(s.category.trim());
    });
    return Array.from(set);
  }, [extraServices]);

  const filteredServices = useMemo(() => {
    return extraServices.filter((s) => {
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      if (statusFilter === "enabled" && !Boolean(s.is_enabled)) return false;
      if (statusFilter === "disabled" && Boolean(s.is_enabled)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = getDisplayText(s.title, currentLang).toLowerCase();
        const subtitle = getDisplayText(s.subtitle, currentLang).toLowerCase();
        const desc = (s.description || "").toLowerCase();
        const cat = (s.category || "").toLowerCase();
        return title.includes(q) || subtitle.includes(q) || desc.includes(q) || cat.includes(q);
      }
      return true;
    });
  }, [extraServices, categoryFilter, statusFilter, searchQuery, currentLang]);

  const handleToggleEnabled = async (service: ExtraService) => {
    const newStatus = service.is_enabled ? 0 : 1;
    setExtraServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, is_enabled: newStatus } : s))
    );

    try {
      const res = await fetchApi(`/api/admin/extra-services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...service, is_enabled: newStatus }),
      });
      if (!res.ok) throw new Error(tUi("admin.pricing.addons.status_failed"));
      showToast(tUi(newStatus ? "admin.pricing.addons.enabled" : "admin.pricing.addons.disabled"));
    } catch (err: any) {
      showToast(err.message || tUi("admin.pricing.addons.status_failed"), "error");
      loadData();
    }
  };

  const handleTogglePublicPage = async (service: ExtraService) => {
    const newShow = service.show_on_pricing_page ? 0 : 1;
    setExtraServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, show_on_pricing_page: newShow } : s))
    );

    try {
      const res = await fetchApi(`/api/admin/extra-services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...service, show_on_pricing_page: newShow }),
      });
      if (!res.ok) throw new Error(tUi("admin.pricing.addons.visibility_failed"));
      showToast(tUi(newShow ? "admin.pricing.addons.visible_public" : "admin.pricing.addons.hidden_public"));
    } catch (err: any) {
      showToast(err.message || tUi("admin.pricing.addons.visibility_failed"), "error");
      loadData();
    }
  };

  const handleSaveService = async (serviceData: Partial<ExtraService>) => {
    if (serviceData.id) {
      const res = await fetchApi(`/api/admin/extra-services/${serviceData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || tUi("admin.pricing.addons.update_failed"));
      }
      showToast(tUi("admin.pricing.addons.updated"));
    } else {
      const res = await fetchApi("/api/admin/extra-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || tUi("admin.pricing.addons.create_failed"));
      }
      showToast(tUi("admin.pricing.addons.created"));
    }
    await loadData();
  };

  const handleDeleteService = async () => {
    if (!deleteConfirmService) return;
    try {
      setIsDeleting(true);
      const res = await fetchApi(`/api/admin/extra-services/${deleteConfirmService.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || tUi("admin.pricing.addons.delete_failed"));
      }
      showToast(tUi("admin.pricing.addons.deleted"));
      setDeleteConfirmService(null);
      await loadData();
    } catch (error: any) {
      showToast(error.message || tUi("admin.pricing.addons.delete_failed"), "error");
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
                placeholder={tUi("admin.pricing.addons.search")}
                className="pl-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-background text-text text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="all">{tUi("admin.pricing.addons.all_categories")}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
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
                setSelectedService(null);
                setIsModalOpen(true);
              }}
              className="gap-2 h-10"
            >
              <Plus className="w-4 h-4" />
              <span>{tUi("admin.pricing.addons.create")}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 text-center text-muted-text">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
          <p>{tUi("admin.pricing.addons.loading")}</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border-2 border-dashed border-border bg-surface/30 p-8">
          <Sparkles className="w-12 h-12 text-muted-text mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-text mb-1">{tUi("admin.pricing.addons.empty_title")}</h3>
          <p className="text-sm text-muted-text max-w-md mx-auto mb-6">
            {tUi("admin.pricing.addons.empty_desc")}
          </p>
          <Button
            onClick={() => {
              setSelectedService(null);
              setIsModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{tUi("admin.pricing.addons.create_first")}</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((service) => {
            const title = getDisplayText(service.title, currentLang) || tUi("admin.pricing.addons.untitled");
            const subtitle = getDisplayText(service.subtitle, currentLang);
            const isEnabled = Boolean(service.is_enabled);
            const isPublic = service.show_on_pricing_page !== 0;

            let planRestrictions: string[] = [];
            try {
              planRestrictions = typeof service.restricted_plans === "string"
                ? JSON.parse(service.restricted_plans || "[]")
                : (service.restricted_plans || []);
            } catch {}

            return (
              <div
                key={service.id}
                className={`p-5 rounded-2xl border transition-all duration-200 bg-background flex flex-col justify-between ${
                  isEnabled ? "border-border shadow-xs hover:shadow-md" : "border-border/60 bg-surface/30 opacity-70"
                } ${Boolean(service.is_featured) ? "ring-2 ring-primary/40 border-primary" : ""}`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-primary/10 text-primary font-bold">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-text">{title}</h4>
                        {service.category && (
                          <span className="text-[10px] font-semibold text-muted-text uppercase tracking-wider">
                            {service.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(service)}
                        className={`p-1.5 rounded-lg text-xs transition-colors ${
                          isEnabled ? "text-emerald-600 hover:bg-emerald-500/10" : "text-muted-text hover:bg-surface"
                        }`}
                        title={tUi(isEnabled ? "admin.pricing.addons.enabled_title" : "admin.pricing.addons.disabled_title")}
                      >
                        {isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {subtitle && (
                    <p className="text-xs text-primary font-medium mb-2">{subtitle}</p>
                  )}

                  {service.description && (
                    <p className="text-xs text-muted-text line-clamp-2 mb-3 leading-relaxed">
                      {service.description}
                    </p>
                  )}

                  {/* Badges: Price type, Billing type, Plan restrictions */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface text-text border border-border flex items-center gap-1">
                      {service.price_type === "percentage" ? (
                        <>
                          <Percent className="w-3 h-3 text-primary" /> {tUi("admin.pricing.addons.price_percentage")}
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-3 h-3 text-primary" /> {tUi("admin.pricing.addons.price_fixed")}
                        </>
                      )}
                    </span>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface text-text border border-border flex items-center gap-1">
                      <Clock className="w-3 h-3 text-accent" />
                      {tUi(service.billing_type === "recurring" ? "admin.pricing.addons.billing_recurring" : "admin.pricing.addons.billing_one_time")}
                    </span>

                    {planRestrictions.length > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> {planRestrictions.length} {tUi("admin.pricing.addons.plans_only")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer: Price & Actions */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-text">
                        {service.price_type === "percentage"
                          ? `+${service.price}%`
                          : formatCurrencyPrice(service.price, service.currency)}
                      </span>
                      {service.price_type !== "percentage" && service.unit && (
                        <span className="text-xs text-muted-text">/ {service.unit}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedService(service);
                        setIsModalOpen(true);
                      }}
                      className="h-8 px-2.5 text-xs text-muted-text hover:text-text"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      {tUi("admin.customers.edit")}</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirmService(service)}
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

      {/* Extra Service Edit/Create Modal */}
      <ExtraServiceModal
        isOpen={isModalOpen}
        extraService={selectedService}
        siteLanguages={siteLanguages}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedService(null);
        }}
        onSave={handleSaveService}
      />

      {/* Delete Confirmation */}
      {deleteConfirmService && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-text mb-2">{tUi("admin.pricing.addons.delete_title")}</h3>
            <p className="text-sm text-muted-text mb-6">
              {tUi("admin.pricing.delete_modal_confirm_prefix")}<strong>{getDisplayText(deleteConfirmService.title, currentLang)}</strong>? {tUi("admin.pricing.addons.delete_warning")}
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirmService(null)} disabled={isDeleting}>
                {tUi("admin.clients.cancel")}</Button>
              <Button variant="destructive" onClick={handleDeleteService} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
                {isDeleting ? tUi("admin.pricing.addons.deleting") : tUi("admin.pricing.addons.delete_action")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
