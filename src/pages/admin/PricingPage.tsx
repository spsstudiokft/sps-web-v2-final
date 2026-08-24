import React, { useState, useEffect, useMemo } from "react";
import { PricingPlan, SiteSettings } from "../../lib/types";
import { useApi } from "../../hooks/useApi";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useLanguage } from "../../contexts/LanguageContext";
import { PageHeader } from "../../components/admin/PageHeader";
import { PricingModal } from "../../components/admin/PricingModal";
import { AddonsTab } from "../../components/admin/pricing/AddonsTab";
import { FeesTab } from "../../components/admin/pricing/FeesTab";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card, CardContent } from "../../components/ui/Card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Search,
  GripVertical,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Tag,
  Layers,
  Star,
  Check,
  Car,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { formatCurrencyPrice } from "../../components/public/Pricing";

// Helper to safely extract display text from translatable JSON or string
function getDisplayText(val: string | undefined | null, lang: string = "en"): string {
  if (!val) return "";
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && parsed !== null) {
      return (
        parsed[lang] ||
        parsed["en"] ||
        Object.values(parsed).find((v) => typeof v === "string" && v.trim() !== "") ||
        ""
      );
    }
  } catch {
    return val;
  }
  return val;
}

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    return val.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export interface AdminResolvedBundleItem {
  key: string;
  name: string;
  quantity: number;
  unitPrice: number;
  itemType: "tier" | "extra" | "service" | "custom";
  status: "active" | "inactive" | "missing";
  features?: string[];
}

export function resolveBundleItemsForAdmin(
  plan: PricingPlan,
  allPlans: PricingPlan[],
  currentLang: string
): AdminResolvedBundleItem[] {
  if (plan.type !== "bundle") return [];

  // Parse bundle_services first (source of truth)
  let parsedRaw: any[] = [];
  if (plan.bundle_services) {
    try {
      parsedRaw = typeof plan.bundle_services === "string"
        ? JSON.parse(plan.bundle_services)
        : plan.bundle_services;
    } catch {
      parsedRaw = [];
    }
  }

  if (Array.isArray(parsedRaw) && parsedRaw.length > 0) {
    return parsedRaw.map((raw, idx) => {
      const isTier = raw.item_type === "tier" || Boolean(raw.tier_id);
      let matchedTier: PricingPlan | undefined = undefined;
      if (raw.tier_id) {
        matchedTier = allPlans.find((p) => p.id === raw.tier_id);
      } else if (raw.service_name || raw.service_title) {
        const rawName = String(raw.service_name || raw.service_title).toLowerCase();
        matchedTier = allPlans.find((p) => {
          const tName = getDisplayText(p.title, currentLang).toLowerCase();
          return tName === rawName || (p.name && p.name.toLowerCase() === rawName);
        });
      }

      const name = matchedTier
        ? getDisplayText(matchedTier.title, currentLang) || matchedTier.name || raw.service_name || raw.service_title
        : raw.service_name || raw.service_title || (isTier ? `Tier #${idx + 1}` : `Service #${idx + 1}`);

      const qty = Number(raw.quantity) || 1;
      const unitPrice = raw.override_price !== null && raw.override_price !== undefined
        ? Number(raw.override_price)
        : (matchedTier ? Number(matchedTier.price) : Number(raw.original_price) || 0);

      const features = matchedTier
        ? [...new Set([...parseJsonArray(matchedTier.features), ...parseJsonArray(matchedTier.included_items)])]
        : (Array.isArray(raw.features) ? raw.features : []);

      let status: "active" | "inactive" | "missing" = "active";
      if (isTier && raw.tier_id && !matchedTier && allPlans.length > 0) {
        status = "missing";
      } else if (raw.is_disabled || (matchedTier && !Boolean(matchedTier.is_enabled))) {
        status = "inactive";
      }

      return {
        key: `bundle-item-${raw.tier_id || raw.service_id || idx}`,
        name,
        quantity: qty,
        unitPrice,
        itemType: (raw.item_type as any) || (isTier ? "tier" : "service"),
        status,
        features,
      };
    });
  }

  // Fallback to included_items array strings
  const included = parseJsonArray(plan.included_items);
  return included.map((str, idx) => {
    const matchedTier = allPlans.find((p) => {
      const tName = getDisplayText(p.title, currentLang).toLowerCase();
      return tName === str.toLowerCase() || (p.name && p.name.toLowerCase() === str.toLowerCase());
    });

    return {
      key: `included-item-${idx}`,
      name: str,
      quantity: 1,
      unitPrice: matchedTier ? Number(matchedTier.price) : 0,
      itemType: matchedTier ? "tier" : "service",
      status: matchedTier ? (Boolean(matchedTier.is_enabled) ? "active" : "inactive") : "active",
      features: matchedTier
        ? [...new Set([...parseJsonArray(matchedTier.features), ...parseJsonArray(matchedTier.included_items)])]
        : [],
    };
  });
}

// Sortable Card Item for Grid View
function SortablePricingCard({
  plan,
  allPlans = [],
  onEdit,
  onDelete,
  onToggleEnabled,
  onToggleFeatured,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  currentLang,
  tUi,
}: {
  plan: PricingPlan;
  allPlans?: PricingPlan[];
  onEdit: (plan: PricingPlan) => void;
  onDelete: (plan: PricingPlan) => void;
  onToggleEnabled: (plan: PricingPlan) => void;
  onToggleFeatured: (plan: PricingPlan) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  currentLang: string;
  tUi: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: plan.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const title = getDisplayText(plan.title, currentLang) || tUi("admin.pricing.untitled") || "Untitled Listing";
  const subtitle = getDisplayText(plan.subtitle, currentLang);
  const isBundle = plan.type === "bundle";
  const features = parseJsonArray(plan.features);
  const bundleComponents = isBundle ? resolveBundleItemsForAdmin(plan, allPlans, currentLang) : [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-2xl border transition-all duration-200 bg-background flex flex-col justify-between ${
        Boolean(plan.is_enabled)
          ? "border-border shadow-xs hover:shadow-md"
          : "border-border/60 bg-surface/30 opacity-75"
      } ${Boolean(plan.is_featured) ? "ring-2 ring-primary/40 border-primary" : ""}`}
    >
      <div className="p-5">
        {/* Header bar with Grip & Status Badges */}
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-surface transition-colors"
              title={tUi("admin.pricing.drag_to_reorder") || "Drag to reorder"}
            >
              <GripVertical className="w-4 h-4" />
            </button>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${
                isBundle ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
              }`}
            >
              {isBundle ? <Layers className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
              {isBundle 
                ? (tUi("admin.pricing.tag_bundle") || "Bundle") 
                : (tUi("admin.pricing.tag_tier") || "Tier Plan")}
            </span>

            {Boolean(plan.is_featured) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Star className="w-3 h-3 fill-current" />
                <span>{tUi("admin.pricing.tag_featured") || "Featured"}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Quick Move Up/Down */}
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-1 text-muted-text hover:text-text disabled:opacity-30 rounded hover:bg-surface transition-colors"
              title={tUi("admin.pricing.move_up") || "Move Up"}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              className="p-1 text-muted-text hover:text-text disabled:opacity-30 rounded hover:bg-surface transition-colors"
              title={tUi("admin.pricing.move_down") || "Move Down"}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title, Subtitle & Price */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-text mb-1 leading-snug line-clamp-1">{title}</h3>
          {subtitle && <p className="text-xs text-muted-text line-clamp-2 mb-3">{subtitle}</p>}

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-text">
              {formatCurrencyPrice(plan.price, plan.currency)}
            </span>
            {plan.billing_period && (
              <span className="text-xs font-medium text-muted-text">/ {plan.billing_period}</span>
            )}
            {plan.original_price && (
              <span className="text-xs text-muted-text line-through opacity-70">
                {formatCurrencyPrice(plan.original_price, plan.currency)}
              </span>
            )}
          </div>
          {plan.discount_label && (
            <div className="mt-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {getDisplayText(plan.discount_label, currentLang)}
              </span>
            </div>
          )}
        </div>

        {/* Bundle Components Breakdown */}
        {isBundle && bundleComponents.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-surface/80 border border-border/80 space-y-2">
            <div className="text-[11px] font-bold text-text uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Components & Tiers ({bundleComponents.length})</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {bundleComponents.map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-1.5 text-xs bg-background/60 p-1.5 rounded-lg border border-border/50">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      item.itemType === "tier" 
                        ? "bg-primary/10 text-primary" 
                        : item.itemType === "extra"
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}>
                      {item.itemType === "tier" ? "Tier" : item.itemType === "extra" ? "Add-on" : "Item"}
                    </span>
                    <span className="truncate text-text font-medium">
                      {item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}
                    </span>
                    {item.status === "missing" ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold inline-flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" />
                        Missing
                      </span>
                    ) : item.status === "inactive" ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold">
                        Inactive
                      </span>
                    ) : null}
                  </div>
                  {item.unitPrice > 0 && (
                    <span className="text-muted-text font-semibold flex-shrink-0 text-[11px]">
                      {formatCurrencyPrice(item.unitPrice * item.quantity, plan.currency)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features Preview */}
        <div className="space-y-1.5 mb-2">
          <div className="text-[11px] font-semibold text-muted-text uppercase tracking-wider mb-1">
            {tUi("admin.pricing.features_count", { count: features.length }) || `Features (${features.length}):`}
          </div>
          {features.slice(0, 4).map((f, fIdx) => (
            <div key={fIdx} className="flex items-center gap-2 text-xs text-muted-text">
              <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className="truncate">{f}</span>
            </div>
          ))}
          {features.length > 4 && (
            <div className="text-[11px] text-muted-text italic pl-5">
              +{features.length - 4} {tUi("admin.pricing.more_features") || "more features..."}
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="px-5 py-3 border-t border-border bg-surface/40 rounded-b-2xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Enable / Disable toggle button */}
          <button
            type="button"
            onClick={() => onToggleEnabled(plan)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              Boolean(plan.is_enabled)
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                : "bg-surface border border-border text-muted-text hover:text-text"
            }`}
            title={Boolean(plan.is_enabled) ? (tUi("admin.pricing.status_enabled") || "Enabled") : (tUi("admin.pricing.status_disabled") || "Disabled")}
          >
            {Boolean(plan.is_enabled) ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{Boolean(plan.is_enabled) ? (tUi("admin.pricing.status_enabled") || "Enabled") : (tUi("admin.pricing.status_disabled") || "Disabled")}</span>
          </button>

          {/* Featured toggle button */}
          <button
            type="button"
            onClick={() => onToggleFeatured(plan)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              Boolean(plan.is_featured)
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "text-muted-text hover:text-text hover:bg-surface"
            }`}
            title={Boolean(plan.is_featured) ? (tUi("admin.pricing.unmark_featured") || "Unmark as featured") : (tUi("admin.pricing.mark_featured") || "Mark as featured")}
          >
            <Star className={`w-3.5 h-3.5 ${Boolean(plan.is_featured) ? "fill-current" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(plan)}
            className="h-8 w-8 p-0 text-muted-text hover:text-text"
            title={tUi("admin.pricing.action_edit") || "Edit Plan"}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(plan)}
            className="h-8 w-8 p-0 text-muted-text hover:text-red-500"
            title={tUi("admin.pricing.action_delete") || "Delete Plan"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Sortable Row for List/Table View
function SortablePricingRow({
  plan,
  allPlans = [],
  onEdit,
  onDelete,
  onToggleEnabled,
  onToggleFeatured,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  currentLang,
  tUi,
}: {
  plan: PricingPlan;
  allPlans?: PricingPlan[];
  onEdit: (plan: PricingPlan) => void;
  onDelete: (plan: PricingPlan) => void;
  onToggleEnabled: (plan: PricingPlan) => void;
  onToggleFeatured: (plan: PricingPlan) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  currentLang: string;
  tUi: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: plan.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const title = getDisplayText(plan.title, currentLang) || tUi("admin.pricing.untitled") || "Untitled Listing";
  const subtitle = getDisplayText(plan.subtitle, currentLang);
  const isBundle = plan.type === "bundle";
  const features = parseJsonArray(plan.features);
  const bundleComponents = isBundle ? resolveBundleItemsForAdmin(plan, allPlans, currentLang) : [];

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-border/80 hover:bg-surface/50 transition-colors ${
        !Boolean(plan.is_enabled) ? "opacity-60 bg-surface/20" : ""
      }`}
    >
      <td className="p-3 w-10">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-text hover:text-text rounded hover:bg-surface transition-colors"
          title={tUi("admin.pricing.drag_to_reorder") || "Drag to reorder"}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>

      <td className="p-3 w-20">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 text-muted-text hover:text-text disabled:opacity-20 rounded"
            title={tUi("admin.pricing.move_up") || "Move Up"}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 text-muted-text hover:text-text disabled:opacity-20 rounded"
            title={tUi("admin.pricing.move_down") || "Move Down"}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>

      <td className="p-3">
        <div className="flex items-start gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${
              isBundle ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
            }`}
          >
            {isBundle 
              ? (tUi("admin.pricing.tag_bundle") || "Bundle") 
              : (tUi("admin.pricing.tag_tier") || "Tier")}
          </span>
          <div>
            <div className="font-bold text-text flex items-center gap-1.5">
              <span>{title}</span>
              {Boolean(plan.is_featured) && (
                <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-text line-clamp-1">{subtitle}</p>}
            
            {/* Bundle components pill preview */}
            {isBundle && bundleComponents.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap mt-1.5">
                {bundleComponents.map((item) => (
                  <span
                    key={item.key}
                    className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                      item.status === "missing"
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-600"
                        : item.status === "inactive"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                        : "bg-surface border-border text-muted-text"
                    }`}
                  >
                    <span className="font-semibold">{item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}</span>
                    {item.status === "missing" && <AlertCircle className="w-2.5 h-2.5" />}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>

      <td className="p-3">
        <div className="font-bold text-text">
          {formatCurrencyPrice(plan.price, plan.currency)}
        </div>
        {plan.billing_period && (
          <div className="text-[11px] text-muted-text">/ {plan.billing_period}</div>
        )}
      </td>

      <td className="p-3">
        <span className="text-xs text-muted-text">
          {features.length} {tUi("admin.pricing.bullet_points") || "bullet points"}
        </span>
      </td>

      <td className="p-3">
        <button
          type="button"
          onClick={() => onToggleEnabled(plan)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            Boolean(plan.is_enabled)
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              : "bg-surface border border-border text-muted-text hover:text-text"
          }`}
        >
          {Boolean(plan.is_enabled) ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{Boolean(plan.is_enabled) ? (tUi("admin.pricing.status_enabled") || "Enabled") : (tUi("admin.pricing.status_disabled") || "Disabled")}</span>
        </button>
      </td>

      <td className="p-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onToggleFeatured(plan)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              Boolean(plan.is_featured)
                ? "text-amber-500 bg-amber-500/10"
                : "text-muted-text hover:text-text"
            }`}
            title={Boolean(plan.is_featured) ? (tUi("admin.pricing.unmark_featured") || "Unmark as featured") : (tUi("admin.pricing.mark_featured") || "Mark as featured")}
          >
            <Star className={`w-4 h-4 ${Boolean(plan.is_featured) ? "fill-current" : ""}`} />
          </button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(plan)}
            className="h-8 w-8 p-0 text-muted-text hover:text-text"
            title={tUi("admin.pricing.action_edit") || "Edit"}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(plan)}
            className="h-8 w-8 p-0 text-muted-text hover:text-red-500"
            title={tUi("admin.pricing.action_delete") || "Delete"}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function PricingPage() {
  const { currentLang, tUi } = useLanguage();
  usePageTitle(tUi("admin.pricing.title") || "Pricing & Packages", "Admin");
  const { fetchApi } = useApi();

  const [pricingTab, setPricingTab] = useState<"plans" | "addons" | "fees">("plans");
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "tier" | "bundle">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Partial<PricingPlan> | null>(null);

  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<PricingPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [pricingRes, settingsRes] = await Promise.all([
        fetchApi("/api/admin/pricing"),
        fetchApi("/api/public/settings"),
      ]);

      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        setPlans(Array.isArray(pricingData) ? pricingData : []);
      } else {
        const err = await pricingRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load pricing packages");
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData || {});
      }
    } catch (error: any) {
      console.error("Failed to load pricing admin data:", error);
      showToast(error.message || tUi("admin.pricing.err_load_failed") || "Failed to load pricing packages.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      // Type filter
      if (typeFilter !== "all" && p.type !== typeFilter) return false;

      // Status filter
      if (statusFilter === "enabled" && !Boolean(p.is_enabled)) return false;
      if (statusFilter === "disabled" && Boolean(p.is_enabled)) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const title = getDisplayText(p.title, currentLang).toLowerCase();
        const subtitle = getDisplayText(p.subtitle, currentLang).toLowerCase();
        const features = (p.features || "").toLowerCase();
        const included = (p.included_items || "").toLowerCase();
        return (
          title.includes(query) ||
          subtitle.includes(query) ||
          features.includes(query) ||
          included.includes(query)
        );
      }

      return true;
    });
  }, [plans, typeFilter, statusFilter, searchQuery, currentLang]);

  // Counts for statistics
  const stats = useMemo(() => {
    const total = plans.length;
    const tiers = plans.filter((p) => p.type === "tier").length;
    const bundles = plans.filter((p) => p.type === "bundle").length;
    const enabled = plans.filter((p) => Boolean(p.is_enabled)).length;
    const featured = plans.filter((p) => Boolean(p.is_featured)).length;
    return { total, tiers, bundles, enabled, featured };
  }, [plans]);

  // Handle Drag and Drop Reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = plans.findIndex((p) => p.id === active.id);
    const newIndex = plans.findIndex((p) => p.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(plans, oldIndex, newIndex);
      setPlans(reordered);

      try {
        const payload = reordered.map((item, idx) => ({
          id: item.id,
          sort_order: idx + 1,
        }));
        const res = await fetchApi("/api/admin/pricing/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: payload }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to save reorder changes");
        }
        showToast(tUi("admin.pricing.msg_reorder_success") || "Pricing order updated successfully.");
      } catch (error: any) {
        console.error("Failed to persist pricing order:", error);
        showToast(error.message || tUi("admin.pricing.msg_reorder_failed") || "Failed to save reorder changes.", "error");
        loadData();
      }
    }
  };

  // Move single item up or down
  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= plans.length) return;

    const reordered = arrayMove(plans, index, targetIndex);
    setPlans(reordered);

    try {
      const payload = reordered.map((item, idx) => ({
        id: item.id,
        sort_order: idx + 1,
      }));
      const res = await fetchApi("/api/admin/pricing/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update order");
      }
      showToast(tUi("admin.pricing.msg_order_updated") || "Order updated.");
    } catch (error: any) {
      console.error("Failed to move item:", error);
      showToast(error.message || tUi("admin.pricing.msg_reorder_failed") || "Failed to update order.", "error");
      loadData();
    }
  };

  // Toggle Enabled Status
  const handleToggleEnabled = async (plan: PricingPlan) => {
    const newStatus = plan.is_enabled ? 0 : 1;
    setPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...p, is_enabled: newStatus } : p))
    );

    try {
      const res = await fetchApi(`/api/admin/pricing/${plan.id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
      }
      showToast(
        newStatus 
          ? (tUi("admin.pricing.msg_plan_enabled") || "Plan enabled and visible on site.") 
          : (tUi("admin.pricing.msg_plan_disabled") || "Plan disabled.")
      );
    } catch (error: any) {
      console.error("Failed to toggle status:", error);
      showToast(error.message || tUi("admin.pricing.err_status_failed") || "Failed to update status.", "error");
      loadData();
    }
  };

  // Toggle Featured Status
  const handleToggleFeatured = async (plan: PricingPlan) => {
    const newFeatured = plan.is_featured ? 0 : 1;
    setPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...p, is_featured: newFeatured } : p))
    );

    try {
      const res = await fetchApi(`/api/admin/pricing/${plan.id}/feature`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: newFeatured }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update featured flag");
      }
      showToast(
        newFeatured 
          ? (tUi("admin.pricing.msg_plan_featured") || "Marked as featured listing.") 
          : (tUi("admin.pricing.msg_plan_unfeatured") || "Unmarked as featured.")
      );
    } catch (error: any) {
      console.error("Failed to toggle featured:", error);
      showToast(error.message || tUi("admin.pricing.err_featured_failed") || "Failed to update featured flag.", "error");
      loadData();
    }
  };

  // Save Plan / Bundle
  const handleSavePlan = async (data: Partial<PricingPlan>) => {
    if (data.id) {
      // Update
      const res = await fetchApi(`/api/admin/pricing/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update pricing plan");
      }
      showToast(tUi("admin.pricing.msg_save_success") || "Pricing package updated successfully.");
    } else {
      // Create
      const res = await fetchApi("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create pricing plan");
      }
      showToast(tUi("admin.pricing.msg_create_success") || "Pricing package created successfully.");
    }
    await loadData();
  };

  // Delete Plan
  const handleDeletePlan = async () => {
    if (!deleteConfirmPlan) return;
    try {
      setIsDeleting(true);
      const res = await fetchApi(`/api/admin/pricing/${deleteConfirmPlan.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete pricing plan");
      }
      showToast(tUi("admin.pricing.msg_delete_success") || "Pricing package deleted.");
      setDeleteConfirmPlan(null);
      await loadData();
    } catch (error: any) {
      console.error("Failed to delete pricing plan:", error);
      showToast(error.message || tUi("admin.pricing.err_delete_failed") || "Failed to delete pricing package.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-8 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-sm font-medium animate-in fade-in slide-from-bottom-5 duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title={tUi("admin.pricing.title") || "Pricing & Packages"}
        description={tUi("admin.pricing.description") || "Manage pricing tiers, service packages, bundled offers, and client rates displayed on the homepage."}
        action={
          pricingTab === "plans" ? (
            <div className="flex items-center gap-2.5">
              <Button
                onClick={() => {
                  setSelectedPlan({ type: "bundle" });
                  setIsModalOpen(true);
                }}
                variant="secondary"
                className="gap-2"
              >
                <Layers className="w-4 h-4 text-accent" />
                <span>{tUi("admin.pricing.btn_add_bundle") || "Add Bundle"}</span>
              </Button>

              <Button
                onClick={() => {
                  setSelectedPlan({ type: "tier" });
                  setIsModalOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{tUi("admin.pricing.btn_add_plan") || "Add Pricing Plan"}</span>
              </Button>
            </div>
          ) : null
        }
      />

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setPricingTab("plans")}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            pricingTab === "plans"
              ? "bg-primary text-background shadow-xs font-bold"
              : "bg-surface/50 text-muted-text hover:text-text hover:bg-surface"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Plans & Bundles</span>
          <span className={`text-xs px-1.5 py-0.2 rounded-md ${pricingTab === "plans" ? "bg-background/20 text-background" : "bg-border text-muted-text"}`}>
            {stats.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPricingTab("addons")}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            pricingTab === "addons"
              ? "bg-primary text-background shadow-xs font-bold"
              : "bg-surface/50 text-muted-text hover:text-text hover:bg-surface"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Add-on Services (Extras)</span>
        </button>

        <button
          type="button"
          onClick={() => setPricingTab("fees")}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            pricingTab === "fees"
              ? "bg-primary text-background shadow-xs font-bold"
              : "bg-surface/50 text-muted-text hover:text-text hover:bg-surface"
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Fees & Surcharges</span>
        </button>
      </div>

      {/* Tab 1: Plans & Bundles */}
      {pricingTab === "plans" && (
        <>
          {/* Overview Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-surface/50 border-border">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-1">
                  {tUi("admin.pricing.stat_total") || "Total Packages"}
                </div>
                <div className="text-2xl font-black text-text">{stats.total}</div>
              </CardContent>
            </Card>

            <Card className="bg-surface/50 border-border">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-primary" />
                  <span>{tUi("admin.pricing.stat_tiers") || "Standard Tiers"}</span>
                </div>
                <div className="text-2xl font-black text-text">{stats.tiers}</div>
              </CardContent>
            </Card>

            <Card className="bg-surface/50 border-border">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-accent" />
                  <span>{tUi("admin.pricing.stat_bundles") || "Service Bundles"}</span>
                </div>
                <div className="text-2xl font-black text-text">{stats.bundles}</div>
              </CardContent>
            </Card>

            <Card className="bg-surface/50 border-border">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-emerald-500" />
                  <span>{tUi("admin.pricing.stat_active") || "Active on Site"}</span>
                </div>
                <div className="text-2xl font-black text-text">{stats.enabled}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter and Search Bar */}
          <Card className="border-border">
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={tUi("admin.pricing.search_placeholder") || "Search plans, features, bundles..."}
                    className="pl-9 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="h-10 px-3 rounded-lg border border-border bg-background text-text text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="all">{tUi("admin.pricing.filter_all_types") || "All Types"}</option>
                    <option value="tier">{tUi("admin.pricing.filter_standard_plans", { count: stats.tiers }) || `Standard Plans (${stats.tiers})`}</option>
                    <option value="bundle">{tUi("admin.pricing.filter_bundles", { count: stats.bundles }) || `Bundles (${stats.bundles})`}</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="h-10 px-3 rounded-lg border border-border bg-background text-text text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="all">{tUi("admin.pricing.filter_all_statuses") || "All Statuses"}</option>
                    <option value="enabled">{tUi("admin.pricing.filter_enabled_only", { count: stats.enabled }) || `Enabled Only (${stats.enabled})`}</option>
                    <option value="disabled">{tUi("admin.pricing.filter_disabled_only", { count: stats.total - stats.enabled }) || `Disabled Only (${stats.total - stats.enabled})`}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadData}
                  className="h-9 px-3 text-muted-text hover:text-text"
                  title={tUi("admin.pricing.btn_refresh") || "Refresh"}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </Button>

                <div className="flex bg-surface border border-border rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === "grid" ? "bg-primary text-background" : "text-muted-text hover:text-text"
                    }`}
                    title={tUi("admin.pricing.view_grid") || "Grid view"}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === "list" ? "bg-primary text-background" : "text-muted-text hover:text-text"
                    }`}
                    title={tUi("admin.pricing.view_list") || "List view"}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Area */}
          {loading ? (
            <div className="py-20 text-center text-muted-text">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
              <p>{tUi("admin.pricing.loading") || "Loading pricing listings..."}</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border-2 border-dashed border-border bg-surface/30 p-8">
              <Tag className="w-12 h-12 text-muted-text mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-bold text-text mb-1">
                {tUi("admin.pricing.empty_title") || "No Pricing Packages Found"}
              </h3>
              <p className="text-sm text-muted-text max-w-md mx-auto mb-6">
                {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                  ? (tUi("admin.pricing.empty_search_desc") || "No packages match your search filters. Try adjusting your search query.")
                  : (tUi("admin.pricing.empty_desc") || "Get started by adding your first pricing tier or service bundle to showcase your offers.")}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={() => {
                    setSelectedPlan({ type: "tier" });
                    setIsModalOpen(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{tUi("admin.pricing.btn_create_first") || "Create First Plan"}</span>
                </Button>
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              {viewMode === "grid" ? (
                <SortableContext items={filteredPlans.map((p) => p.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPlans.map((plan, index) => (
                      <SortablePricingCard
                        key={plan.id}
                        plan={plan}
                        allPlans={plans}
                        onEdit={(p) => {
                          setSelectedPlan(p);
                          setIsModalOpen(true);
                        }}
                        onDelete={(p) => setDeleteConfirmPlan(p)}
                        onToggleEnabled={handleToggleEnabled}
                        onToggleFeatured={handleToggleFeatured}
                        onMoveUp={() => handleMove(index, "up")}
                        onMoveDown={() => handleMove(index, "down")}
                        isFirst={index === 0}
                        isLast={index === filteredPlans.length - 1}
                        currentLang={currentLang}
                        tUi={tUi}
                      />
                    ))}
                  </div>
                </SortableContext>
              ) : (
                /* List / Table View */
                <Card className="border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface/80 text-xs font-semibold text-muted-text uppercase tracking-wider border-b border-border">
                        <tr>
                          <th className="p-3 w-10"></th>
                          <th className="p-3 w-20">{tUi("admin.pricing.th_order") || "Order"}</th>
                          <th className="p-3">{tUi("admin.pricing.th_plan") || "Plan / Bundle"}</th>
                          <th className="p-3">{tUi("admin.pricing.th_price") || "Price"}</th>
                          <th className="p-3">{tUi("admin.pricing.th_features") || "Features"}</th>
                          <th className="p-3">{tUi("admin.pricing.th_visibility") || "Visibility"}</th>
                          <th className="p-3 text-right">{tUi("admin.pricing.th_actions") || "Actions"}</th>
                        </tr>
                      </thead>
                      <SortableContext items={filteredPlans.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                        <tbody>
                          {filteredPlans.map((plan, index) => (
                            <SortablePricingRow
                              key={plan.id}
                              plan={plan}
                              allPlans={plans}
                              onEdit={(p) => {
                                setSelectedPlan(p);
                                setIsModalOpen(true);
                              }}
                              onDelete={(p) => setDeleteConfirmPlan(p)}
                              onToggleEnabled={handleToggleEnabled}
                              onToggleFeatured={handleToggleFeatured}
                              onMoveUp={() => handleMove(index, "up")}
                              onMoveDown={() => handleMove(index, "down")}
                              isFirst={index === 0}
                              isLast={index === filteredPlans.length - 1}
                              currentLang={currentLang}
                              tUi={tUi}
                            />
                          ))}
                        </tbody>
                      </SortableContext>
                    </table>
                  </div>
                </Card>
              )}
            </DndContext>
          )}
        </>
      )}

      {/* Tab 2: Add-on Services */}
      {pricingTab === "addons" && (
        <AddonsTab
          siteLanguages={settings.site_languages || ""}
          showToast={showToast}
        />
      )}

      {/* Tab 3: Fees & Surcharges */}
      {pricingTab === "fees" && (
        <FeesTab
          siteLanguages={settings.site_languages || ""}
          showToast={showToast}
        />
      )}

      {/* Pricing Modal for Create / Edit */}
      <PricingModal
        isOpen={isModalOpen}
        pricing={selectedPlan}
        siteLanguages={settings.site_languages || ""}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPlan(null);
        }}
        onSave={handleSavePlan}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-text mb-2">
              {tUi("admin.pricing.delete_modal_title") || "Delete Pricing Package?"}
            </h3>
            <p className="text-sm text-muted-text mb-6">
              {tUi("admin.pricing.delete_modal_confirm_prefix") || "Are you sure you want to delete "}
              <strong className="text-text">{getDisplayText(deleteConfirmPlan.title, currentLang)}</strong>?{" "}
              {tUi("admin.pricing.delete_modal_warning") || "This action cannot be undone. If you just want to temporarily hide it, you can disable it instead."}
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirmPlan(null)}
                disabled={isDeleting}
              >
                {tUi("Cancel") || "Cancel"}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePlan}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting 
                  ? (tUi("admin.pricing.btn_deleting") || "Deleting...") 
                  : (tUi("admin.pricing.btn_delete_confirm") || "Delete Package")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
