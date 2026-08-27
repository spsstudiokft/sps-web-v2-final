import React, { useState, useEffect, useMemo } from "react";
import { PricingPlan, ExtraService, PricingFeeRule, BundleServiceItem } from "../../lib/types";
import { useLanguage } from "../../contexts/LanguageContext";
import { t, tUi } from "../../lib/i18n";
import { motion, AnimatePresence } from "motion/react";
import { 
  Check, 
  Sparkles, 
  Layers, 
  Tag, 
  ArrowRight, 
  Package, 
  ChevronRight,
  Plus,
  Car,
  MapPin,
  Calculator,
  Sliders,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import { calculateFeeRuleCost, parseJsonArray } from "../../lib/utils";

// Format currency display nicely
export function formatCurrencyPrice(price: number, currency = "USD"): string {
  const code = (currency || "USD").toUpperCase();
  if (code === "USD" || code === "$") {
    return `${price.toLocaleString()}`;
  }
  if (code === "EUR" || code === "€") {
    return `€${price.toLocaleString()}`;
  }
  if (code === "GBP" || code === "£") {
    return `£${price.toLocaleString()}`;
  }
  if (code === "HUF" || code === "FT") {
    return `${price.toLocaleString()} Ft`;
  }
  return `${price.toLocaleString()} ${currency}`;
}

export interface ResolvedBundleItem {
  id?: string;
  title: string;
  itemType: "tier" | "service" | "extra" | "custom";
  quantity: number;
  unitPrice: number;
  subtotal: number;
  features: string[];
  subtitle?: string;
}

export function Pricing({ 
  initialPlans,
  initialExtras,
  initialFeeRules,
  loadFullData = true,
  isPerformanceLite = false,
}: { 
  initialPlans?: PricingPlan[];
  initialExtras?: ExtraService[];
  initialFeeRules?: PricingFeeRule[];
  loadFullData?: boolean;
  isPerformanceLite?: boolean;
}) {
  const { currentLang, defaultLang } = useLanguage();
  const [plans, setPlans] = useState<PricingPlan[]>(initialPlans || []);
  const [extraServices, setExtraServices] = useState<ExtraService[]>(initialExtras || []);
  const [feeRules, setFeeRules] = useState<PricingFeeRule[]>(initialFeeRules || []);
  const [activeFilter, setActiveFilter] = useState<"all" | "tier" | "bundle">("all");
  const [loading, setLoading] = useState(!initialPlans || initialPlans.length === 0);

  // Interactive Travel / Distance Fee Estimator inside public pricing
  const [testDistance, setTestDistance] = useState<number>(25);

  useEffect(() => {
    if (!loadFullData && initialPlans !== undefined && initialExtras !== undefined && initialFeeRules !== undefined) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    Promise.all([
      fetch("/api/public/pricing", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/public/extra-services", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/public/fee-rules").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([pData, extraData, feeData]) => {
        if (isMounted) {
          if (Array.isArray(pData)) setPlans(pData);
          if (Array.isArray(extraData)) setExtraServices(extraData);
          if (Array.isArray(feeData)) setFeeRules(feeData);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load public pricing modules:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialPlans, initialExtras, initialFeeRules, loadFullData]);

  const getPlanCategory = (plan: PricingPlan): "tier" | "bundle" | null => {
    const type = String(plan.type || "").trim().toLowerCase();
    if (["tier", "plan", "individual"].includes(type)) return "tier";
    if (["bundle", "package", "pack"].includes(type)) return "bundle";
    return null;
  };

  // Filter plans based on active tab. Normalize legacy category values so old
  // catalog rows still appear under the intended public selector.
  const filteredPlans = useMemo(() => {
    if (activeFilter === "all") return plans;
    return plans.filter((plan) => getPlanCategory(plan) === activeFilter);
  }, [plans, activeFilter]);

  useEffect(() => {
    if (activeFilter !== "all" && !plans.some((plan) => getPlanCategory(plan) === activeFilter)) setActiveFilter("all");
  }, [plans, activeFilter]);

  const [expandedBundles, setExpandedBundles] = useState<Record<string, boolean>>({});

  const toggleBundleExpand = (planId: string) => {
    setExpandedBundles((prev) => ({ ...prev, [planId]: !prev[planId] }));
  };

  // Helper to dynamically resolve bundle items from bundle_services with fallback to included_items
  const resolveBundleItems = (plan: PricingPlan): ResolvedBundleItem[] => {
    if (plan.type !== "bundle") return [];

    let parsedRaw: any[] = [];
    try {
      if (plan.bundle_services) {
        const p = typeof plan.bundle_services === "string" ? JSON.parse(plan.bundle_services) : plan.bundle_services;
        if (Array.isArray(p) && p.length > 0) {
          parsedRaw = p;
        }
      }
    } catch {}

    if (parsedRaw.length > 0) {
      return parsedRaw.map((item: BundleServiceItem) => {
        const isTier = item.item_type === "tier" || Boolean(item.tier_id);
        const isExtra = item.item_type === "extra" || (Boolean(item.service_id) && !isTier);
        
        let title = item.service_title || item.service_name || "Component";
        let unitPrice = Number(item.original_price) || 0;
        let features = item.features || [];
        let subtitle = "";

        if (item.tier_id) {
          const foundTier = plans.find((t) => t.id === item.tier_id);
          if (foundTier) {
            title = t(foundTier.title, currentLang, defaultLang) || foundTier.title;
            if (foundTier.subtitle) {
              subtitle = t(foundTier.subtitle, currentLang, defaultLang) || foundTier.subtitle;
            }
            if (item.override_price === null || item.override_price === undefined) {
              unitPrice = Number(foundTier.price) || 0;
            }
            // A tier reference is live: always render its current complete
            // content instead of the snapshot stored when the bundle was made.
            features = [...new Set([
              ...parseJsonArray(foundTier.features),
              ...parseJsonArray(foundTier.included_items),
            ])];
          }
        } else if (isExtra && item.service_id) {
          const foundExtra = extraServices.find((e) => e.id === item.service_id);
          if (foundExtra) {
            title = t(foundExtra.title, currentLang, defaultLang) || foundExtra.title;
            if (foundExtra.subtitle) {
              subtitle = t(foundExtra.subtitle, currentLang, defaultLang) || foundExtra.subtitle;
            }
            if (item.override_price === null || item.override_price === undefined) {
              unitPrice = Number(foundExtra.price) || 0;
            }
          }
        }

        if (item.override_price !== null && item.override_price !== undefined && item.override_price !== ("" as any)) {
          unitPrice = Number(item.override_price);
        }

        const qty = Math.max(1, Number(item.quantity) || 1);
        const subtotal = unitPrice * qty;

        return {
          id: item.tier_id || item.service_id,
          title,
          itemType: (isTier ? "tier" : isExtra ? "extra" : (item.item_type || "service")) as any,
          quantity: qty,
          unitPrice,
          subtotal,
          features: Array.isArray(features) ? features : [],
          subtitle,
        };
      });
    }

    // Fallback to included_items if bundle_services was empty
    const legacyIncluded = parseJsonArray(plan.included_items);
    if (legacyIncluded.length > 0) {
      return legacyIncluded.map((nameStr) => {
        const matchedTier = plans.find((p) => {
          const tName = t(p.title, currentLang, defaultLang) || p.title;
          return tName.toLowerCase() === nameStr.toLowerCase() || nameStr.toLowerCase().includes(p.id.toLowerCase());
        });

        if (matchedTier) {
          return {
            id: matchedTier.id,
            title: t(matchedTier.title, currentLang, defaultLang) || matchedTier.title,
            itemType: "tier",
            quantity: 1,
            unitPrice: Number(matchedTier.price) || 0,
            subtotal: Number(matchedTier.price) || 0,
            features: parseJsonArray(matchedTier.features),
            subtitle: matchedTier.subtitle ? (t(matchedTier.subtitle, currentLang, defaultLang) || matchedTier.subtitle) : "",
          };
        }

        const matchedExtra = extraServices.find((e) => {
          const eName = t(e.title, currentLang, defaultLang) || e.title;
          return eName.toLowerCase() === nameStr.toLowerCase();
        });

        if (matchedExtra) {
          return {
            id: matchedExtra.id,
            title: t(matchedExtra.title, currentLang, defaultLang) || matchedExtra.title,
            itemType: "extra",
            quantity: 1,
            unitPrice: Number(matchedExtra.price) || 0,
            subtotal: Number(matchedExtra.price) || 0,
            features: [],
            subtitle: matchedExtra.subtitle ? (t(matchedExtra.subtitle, currentLang, defaultLang) || matchedExtra.subtitle) : "",
          };
        }

        return {
          title: nameStr,
          itemType: "service",
          quantity: 1,
          unitPrice: 0,
          subtotal: 0,
          features: [],
        };
      });
    }

    return [];
  };

  // Counts for tabs
  const tierCount = useMemo(() => plans.filter((plan) => getPlanCategory(plan) === "tier").length, [plans]);
  const bundleCount = useMemo(() => plans.filter((plan) => getPlanCategory(plan) === "bundle").length, [plans]);

  // If no enabled plans or extras exist, return null
  if (!loading && plans.length === 0 && extraServices.length === 0) {
    return null;
  }

  const handlePlanCtaClick = (e: React.MouseEvent, plan: PricingPlan) => {
    const url = plan.cta_url || "#contact";
    
    // Broadcast plan selection event for Contact component to catch and pre-fill
    window.dispatchEvent(
      new CustomEvent("sps_select_pricing_plan", {
        detail: {
          planId: plan.id,
          plan: plan,
        },
      })
    );

    if (!url || url.startsWith("#")) {
      e.preventDefault();
      const targetId = (url || "#contact").replace("#", "");
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleExtraServiceClick = (e: React.MouseEvent, extra: ExtraService) => {
    e.preventDefault();
    window.dispatchEvent(
      new CustomEvent("sps_select_extra_service", {
        detail: {
          serviceId: extra.id,
          service: extra,
        },
      })
    );
    const element = document.getElementById("contact");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const distanceFeeRule = feeRules.find((r) => r.fee_type === "distance" || r.fee_type === "distance_tiered");

  return (
    <section
      id="pricing"
      data-gsap-reveal
      className="scroll-mt-20 py-16 sm:py-24 md:py-32 bg-surface/30 border-t border-b border-border relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 sm:mb-12 gap-5 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              <Tag className="w-3.5 h-3.5" />
              <span>{tUi("public.pricing.tagline", currentLang, undefined, defaultLang) || "Transparent Investment"}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-text mb-4">
              {tUi("public.pricing.title", currentLang, undefined, defaultLang) || "Pricing, Packages & Bundles"}
            </h2>
            <p className="text-lg text-muted-text max-w-2xl">
              {tUi("public.pricing.subtitle", currentLang, undefined, defaultLang) ||
                "Tailored photography, cinematic video tours, and bundled media packages designed to accelerate real estate listings."}
            </p>
          </div>

          {/* Filter Tabs (All / Plans / Bundles) */}
          {tierCount > 0 && bundleCount > 0 && (
            <div className="grid w-full grid-cols-3 items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-2xs md:inline-flex md:w-auto md:self-auto">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`min-w-0 px-2 py-2 text-xs sm:px-4 sm:text-sm rounded-lg font-medium transition-all ${
                  activeFilter === "all"
                    ? "bg-primary text-background shadow-xs font-semibold"
                    : "text-muted-text hover:text-text"
                }`}
              >
                {tUi("public.pricing.tab_all", currentLang, undefined, defaultLang) || "All Offers"} ({plans.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("tier")}
                className={`min-w-0 px-2 py-2 text-xs sm:px-4 sm:text-sm rounded-lg font-medium transition-all ${
                  activeFilter === "tier"
                    ? "bg-primary text-background shadow-xs font-semibold"
                    : "text-muted-text hover:text-text"
                }`}
              >
                {tUi("public.pricing.tab_plans", currentLang, undefined, defaultLang) || "Individual Plans"} ({tierCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("bundle")}
                className={`min-w-0 px-2 py-2 text-xs sm:px-4 sm:text-sm rounded-lg font-medium transition-all ${
                  activeFilter === "bundle"
                    ? "bg-primary text-background shadow-xs font-semibold"
                    : "text-muted-text hover:text-text"
                }`}
              >
                {tUi("public.pricing.tab_bundles", currentLang, undefined, defaultLang) || "Value Bundles"} ({bundleCount})
              </button>
            </div>
          )}
        </div>

        {/* Pricing Cards Grid */}
        <div
          data-pricing-grid="true"
          className="grid grid-cols-1 gap-5 sm:gap-8 md:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="wait" initial={false}>
            {filteredPlans.map((plan) => {
              const features = parseJsonArray(plan.features);
              const isBundle = plan.type === "bundle";
              const isFeatured = Boolean(plan.is_featured);
              const planTitle = t(plan.title, currentLang, defaultLang) || plan.title;
              const planSubtitle = plan.subtitle ? (t(plan.subtitle, currentLang, defaultLang) || plan.subtitle) : "";
              const badgeText = plan.featured_badge
                ? (t(plan.featured_badge, currentLang, defaultLang) || plan.featured_badge)
                : isFeatured
                ? (tUi("public.pricing.featured_badge", currentLang, undefined, defaultLang) || "Most Popular")
                : isBundle
                ? (tUi("public.pricing.bundle_badge", currentLang, undefined, defaultLang) || "Complete Value Bundle")
                : null;

              const bundleComponents = isBundle ? resolveBundleItems(plan) : [];
              const rawBundleTotal = bundleComponents.reduce((sum, item) => sum + item.subtotal, 0);
              const isExpanded = Boolean(expandedBundles[plan.id]);

              const displayOriginalPrice = plan.original_price && plan.original_price > plan.price
                ? plan.original_price
                : isBundle && rawBundleTotal > plan.price
                ? rawBundleTotal
                : null;

              const bundleSavings = displayOriginalPrice ? Math.max(0, displayOriginalPrice - plan.price) : 0;
              const bundleSavingsPercent = displayOriginalPrice ? Math.round((bundleSavings / displayOriginalPrice) * 100) : 0;

              return (
                <motion.div
                  data-pricing-card="true"
                  key={plan.id}
                  layout={!isPerformanceLite}
                  initial={isPerformanceLite ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={isPerformanceLite ? undefined : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className={`aero-pricing-shine relative flex min-w-0 flex-col justify-between rounded-2xl p-5 sm:rounded-3xl sm:p-7 md:p-8 transition-all duration-300 ${
                    isFeatured
                      ? "bg-background border-2 border-primary shadow-xl ring-1 ring-primary/20 md:-translate-y-2"
                      : "bg-background border border-border shadow-md hover:shadow-lg hover:border-primary/40"
                  }`}
                >
                  {/* Top Badge */}
                  {badgeText && (
                    <div className="absolute -top-3.5 left-8">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                          isFeatured
                            ? "bg-primary text-background"
                            : isBundle
                            ? "bg-accent text-white"
                            : "bg-surface border border-border text-primary"
                        }`}
                      >
                        {isFeatured ? <Sparkles className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                        {badgeText}
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Header Details */}
                    <div className="mb-6 pt-2">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h3 className="text-2xl font-bold text-text tracking-tight">{planTitle}</h3>
                        {isBundle && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-accent/15 text-accent uppercase tracking-wider">
                            {tUi("public.pricing.bundle_tag", currentLang, undefined, defaultLang) || "Bundle"}
                          </span>
                        )}
                      </div>
                      {planSubtitle && (
                        <p className="text-sm text-muted-text line-clamp-2 mt-1">{planSubtitle}</p>
                      )}
                    </div>

                    {/* Price & Billing */}
                    <div className="mb-6 pb-5 border-b border-border/80">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        {plan.billing_type === "custom" && plan.price === 0 ? (
                          <span className="text-3xl md:text-4xl font-extrabold text-text tracking-tight">
                            {tUi("public.pricing.custom_quote", currentLang, undefined, defaultLang) || "Custom Quote"}
                          </span>
                        ) : (
                          <>
                            <span className="text-4xl md:text-5xl font-extrabold text-text tracking-tight">
                              {formatCurrencyPrice(plan.price, plan.currency)}
                            </span>
                            {plan.billing_period && (
                              <span className="text-sm font-medium text-muted-text">
                                / {tUi(plan.billing_period, currentLang, undefined, defaultLang) || plan.billing_period}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Original Price / Savings / Discount Tag */}
                      {(displayOriginalPrice || plan.discount_label) && (
                        <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                          {displayOriginalPrice && displayOriginalPrice > plan.price && (
                            <span className="text-sm text-muted-text line-through opacity-70">
                              {tUi("public.pricing.value_label", currentLang, undefined, defaultLang) || "Value"}: {formatCurrencyPrice(displayOriginalPrice, plan.currency)}
                            </span>
                          )}
                          {plan.discount_label ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {t(plan.discount_label, currentLang, defaultLang) || plan.discount_label}
                            </span>
                          ) : bundleSavings > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {tUi("public.pricing.save_percent", currentLang, { percent: bundleSavingsPercent, amount: formatCurrencyPrice(bundleSavings, plan.currency) }, defaultLang) ||
                                `Save ${bundleSavingsPercent}% (${formatCurrencyPrice(bundleSavings, plan.currency)})`}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* BUNDLE: Included Tiers & Components Breakdown */}
                    {isBundle && bundleComponents.length > 0 && (
                      <div className="mb-6 rounded-2xl bg-surface/70 border border-border/80 overflow-hidden shadow-2xs">
                        <div className="p-3.5 bg-surface border-b border-border/60 flex items-center justify-between">
                          <div className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-primary" />
                            <span>
                              {tUi("public.pricing.included_tiers_title", currentLang, undefined, defaultLang) || "Included Tiers & Services"} ({bundleComponents.length})
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleBundleExpand(plan.id)}
                            className="text-xs text-primary font-medium hover:underline flex items-center gap-1 focus:outline-none"
                          >
                            <span>{isExpanded ? (tUi("public.pricing.hide_specs", currentLang, undefined, defaultLang) || "Hide Specs") : (tUi("public.pricing.view_specs", currentLang, undefined, defaultLang) || "View Specs")}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="divide-y divide-border/50">
                          {bundleComponents.map((item, idx) => (
                            <div key={idx} className="p-3 hover:bg-surface/90 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                        item.itemType === "tier"
                                          ? "bg-primary/10 text-primary"
                                          : item.itemType === "extra"
                                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      }`}
                                    >
                                      {item.itemType === "tier" ? "Tier" : item.itemType === "extra" ? "Add-on" : "Service"}
                                    </span>
                                    <span className="text-xs font-bold text-text">
                                      {item.quantity > 1 ? `${item.quantity}x ` : ""}{item.title}
                                    </span>
                                  </div>
                                  {item.subtitle && (
                                    <p className="text-[11px] text-muted-text mt-0.5 line-clamp-1">{item.subtitle}</p>
                                  )}
                                </div>

                                {item.unitPrice > 0 && (
                                  <div className="text-right flex-shrink-0">
                                    <span className="text-xs font-bold text-muted-text">
                                      {formatCurrencyPrice(item.subtotal, plan.currency)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Key Features of this Tier */}
                              {item.features.length > 0 && (
                                <div className="mt-2 pl-2 border-l-2 border-primary/20 space-y-1">
                                  {(isExpanded ? item.features : item.features.slice(0, 2)).map((feat, fIdx) => (
                                    <div key={fIdx} className="flex items-center gap-1.5 text-[11px] text-muted-text">
                                      <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                      <span className={isExpanded ? "whitespace-normal break-words" : "line-clamp-1"}>{feat}</span>
                                    </div>
                                  ))}
                                  {!isExpanded && item.features.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleBundleExpand(plan.id)}
                                      className="text-[10px] text-primary/80 font-medium hover:underline pt-0.5"
                                    >
                                      +{item.features.length - 2} more deliverables
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Features / Highlights List */}
                    {features.length > 0 && (
                      <div className="space-y-3 mb-8">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-text mb-1">
                          {isBundle
                            ? (tUi("public.pricing.bundle_highlights", currentLang, undefined, defaultLang) || "Bundle Guarantees & Features:")
                            : (tUi("public.pricing.features_header", currentLang, undefined, defaultLang) || "What's Included:")}
                        </div>
                        {features.map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-2.5 text-sm text-text">
                            <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            </div>
                            <span className="leading-snug">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Call to Action Button */}
                  <div>
                    <a
                      href={plan.cta_url || "#contact"}
                      onClick={(e) => handlePlanCtaClick(e, plan)}
                      className={`w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-semibold text-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isFeatured
                          ? "bg-primary text-background hover:opacity-90 shadow-md hover:shadow-lg"
                          : "bg-surface hover:bg-surface-hover text-text border border-border hover:border-text/30"
                      }`}
                    >
                      <span>{tUi(plan.cta_label || "Get Started", currentLang, undefined, defaultLang) || (plan.cta_label || "Get Started")}</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Extra Services / Add-ons Section */}
        {extraServices.length > 0 && (
          <div className="mt-20 pt-16 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-2">
                  <Plus className="w-4 h-4" />
                  <span>{tUi("public.pricing.extra_services_tag", currentLang, undefined, defaultLang) || "A La Carte Add-Ons"}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-text">
                  {tUi("public.pricing.extra_services_title", currentLang, undefined, defaultLang) || "Additional Services & Upgrades"}
                </h3>
                <p className="text-sm text-muted-text mt-1 max-w-xl">
                  {tUi("public.pricing.extra_services_subtitle", currentLang, undefined, defaultLang) || "Combine any of our specialized add-on services with your booking or order them as standalone media sessions."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {extraServices.map((extra) => {
                const title = t(extra.title, currentLang, defaultLang) || extra.title;
                const subtitle = extra.subtitle ? (t(extra.subtitle, currentLang, defaultLang) || extra.subtitle) : "";
                const description = extra.description ? (t(extra.description, currentLang, defaultLang) || extra.description) : "";

                return (
                  <div
                    key={extra.id}
                    className="aero-pricing-shine relative overflow-hidden p-5 rounded-2xl bg-background border border-border shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-base font-bold text-text">{title}</h4>
                        {extra.category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface text-muted-text border border-border/70 uppercase tracking-wider shrink-0">
                            {extra.category}
                          </span>
                        )}
                      </div>

                      {subtitle && (
                        <p className="text-xs text-primary font-medium mb-2">{subtitle}</p>
                      )}

                      {description && (
                        <p className="text-xs text-muted-text line-clamp-2 mb-4 leading-relaxed">{description}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-text">
                            {extra.price_type === "percentage"
                              ? `+${extra.price}%`
                              : formatCurrencyPrice(extra.price, extra.currency)}
                          </span>
                          {extra.price_type === "percentage" ? (
                            <span className="text-xs text-muted-text">of plan</span>
                          ) : (
                            extra.unit && extra.unit !== "item" && (
                              <span className="text-xs text-muted-text">/ {extra.unit}</span>
                            )
                          )}
                        </div>
                        {extra.billing_type === "recurring" && (
                          <span className="text-[10px] text-accent font-semibold block">
                            Recurring / Monthly
                          </span>
                        )}
                        {extra.original_price && extra.original_price > extra.price && (
                          <span className="text-[11px] text-muted-text line-through opacity-70 block">
                            {formatCurrencyPrice(extra.original_price, extra.currency)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleExtraServiceClick(e, extra)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-primary hover:text-background text-text text-xs font-semibold border border-border hover:border-transparent transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{tUi("public.pricing.add_to_quote", currentLang, undefined, defaultLang) || "Select"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fee Rules & Travel Distance Preview */}
        {feeRules.length > 0 && (
          <div className="mt-16 p-6 md:p-8 rounded-3xl bg-surface/60 border border-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Car className="w-4 h-4" />
                  <span>{tUi("public.pricing.fees_policy_tag", currentLang, undefined, defaultLang) || "Travel & Fee Transparency"}</span>
                </div>
                <h4 className="text-xl font-bold text-text">
                  {tUi("public.pricing.fees_policy_title", currentLang, undefined, defaultLang) || "Service Area & Travel Guidelines"}
                </h4>
                <p className="text-xs sm:text-sm text-muted-text max-w-xl">
                  {tUi("public.pricing.fees_policy_desc", currentLang, undefined, defaultLang) || "We strive for complete transparency with zero hidden travel charges. Travel fees are calculated based on round-trip distance from our studio headquarters."}
                </p>
              </div>

              {/* Distance Fee Live Simulator */}
              {distanceFeeRule && (
                <div className="p-4 rounded-2xl bg-background border border-border shadow-xs max-w-xs w-full space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-text">
                    <span className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-primary" />
                      <span>{tUi("public.pricing.travel_calculator", currentLang, undefined, defaultLang) || "Travel Estimate"}</span>
                    </span>
                    <span className="text-primary font-bold">{testDistance} km</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="5"
                    value={testDistance}
                    onChange={(e) => setTestDistance(Number(e.target.value))}
                    className="w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                  />

                  {(() => {
                    const result = calculateFeeRuleCost(distanceFeeRule, testDistance);
                    return (
                      <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                        <span className="text-muted-text">{result.explanation}</span>
                        <span className="font-extrabold text-text">
                          {result.fee === 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">FREE</span>
                          ) : (
                            formatCurrencyPrice(result.fee, distanceFeeRule.currency || "USD")
                          )}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* List of active fee policies */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
              {feeRules.map((rule) => {
                const ruleName = t(rule.name, currentLang, defaultLang) || rule.name;
                const ruleDesc = rule.description ? (t(rule.description, currentLang, defaultLang) || rule.description) : "";

                return (
                  <div key={rule.id} className="p-3.5 rounded-xl bg-background/80 border border-border/80 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-text">
                      <span className="flex items-center gap-1.5">
                        {ruleName}
                        {Boolean(rule.is_mandatory) && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">
                            Mandatory
                          </span>
                        )}
                      </span>
                      <span className="text-primary font-bold">
                        {rule.fee_type === "fixed"
                          ? formatCurrencyPrice(rule.amount, rule.currency)
                          : rule.fee_type === "percentage"
                          ? `${rule.amount}% of order`
                          : `${formatCurrencyPrice(rule.amount, rule.currency)} / ${rule.unit || "km"}`}
                      </span>
                    </div>
                    {ruleDesc && <p className="text-muted-text leading-relaxed">{ruleDesc}</p>}
                    {rule.min_distance && rule.min_distance > 0 && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ First {rule.min_distance} {rule.unit || "km"} included free
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Quote Footer Note */}
        <div className="mt-16 text-center max-w-2xl mx-auto p-6 rounded-3xl bg-surface/50 border border-border">
          <h4 className="text-base font-semibold text-text mb-1">
            {tUi("public.pricing.custom_quote_title", currentLang, undefined, defaultLang) || "Need a custom enterprise package or high-volume shoot?"}
          </h4>
          <p className="text-sm text-muted-text mb-4">
            {tUi("public.pricing.custom_quote_desc", currentLang, undefined, defaultLang) || "We offer bespoke media solutions, multi-property discounts, and commercial licensing tailored to your brokerage."}
          </p>
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline cursor-pointer"
          >
            <span>{tUi("public.pricing.custom_quote_cta", currentLang, undefined, defaultLang) || "Request a Custom Quote"}</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
