import React, { useState, useEffect, useMemo, useRef } from "react";
import { SiteSettings, PricingPlan, ExtraService, PricingFeeRule } from "../../lib/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faEnvelope, 
  faPhone, 
  faArrowRight, 
  faLocationDot, 
  faClock, 
  faMapLocationDot,
  faCalendarDays
} from "@fortawesome/free-solid-svg-icons";
import { useLanguage } from "../../contexts/LanguageContext";
import { t, tUi } from "../../lib/i18n";
import { motion, AnimatePresence } from "motion/react";
import { 
  Tag, 
  X, 
  Plus, 
  Minus, 
  Check, 
  Calculator, 
  Sparkles, 
  RotateCcw,
  Car,
  ChevronDown,
  ChevronUp,
  Receipt,
  ShieldCheck
} from "lucide-react";
import { formatCurrencyPrice } from "./Pricing";
import { calculateFeeRuleCost, interpolatePricingMessageTemplate } from "../../lib/utils";
import { useCookieConsent } from "./CookieConsent";
import { 
  staggerContainer, 
  fadeInLeft, 
  fadeInRight, 
  fadeInUp, 
  buttonMotionProps, 
  VIEWPORT_CONFIG 
} from "../../lib/animations";

interface SelectedExtraItem {
  service: ExtraService;
  quantity: number;
}

export function Contact({ settings }: { settings: SiteSettings }) {
  const { currentLang, defaultLang } = useLanguage();
  const { hasAcceptedCookies, acceptCookies, openPreferences } = useCookieConsent();

  const [contactForm, setContactForm] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    property_address: "",
    property_city: "",
    availability_start: "",
    availability_end: "",
    message: "" 
  });

  const [phoneError, setPhoneError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [contactStatus, setContactStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Pricing, Extras & Fees state
  const [allPlans, setAllPlans] = useState<PricingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [availableExtras, setAvailableExtras] = useState<ExtraService[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [feeRules, setFeeRules] = useState<PricingFeeRule[]>([]);
  const [travelDistance, setTravelDistance] = useState<number>(0);
  const [travelEstimate, setTravelEstimate] = useState<{ oneWayKm: number; roundTripKm: number; destination: string } | null>(null);
  const [travelEstimateStatus, setTravelEstimateStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [travelEstimateError, setTravelEstimateError] = useState("");
  const [showPricingDetails, setShowPricingDetails] = useState<boolean>(true);

  // Track whether message was manually customized by user
  const [isMessageCustomized, setIsMessageCustomized] = useState(false);

  // Load public pricing, extra services, and fee rules
  useEffect(() => {
    Promise.all([
      fetch("/api/public/pricing").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/public/extra-services").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/public/fee-rules").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([pData, extraData, feeData]) => {
      if (Array.isArray(pData)) setAllPlans(pData);
      if (Array.isArray(extraData)) setAvailableExtras(extraData);
      if (Array.isArray(feeData)) setFeeRules(feeData);
    });
  }, []);

  useEffect(() => {
    const city = contactForm.property_city.trim();
    if (city.length < 2) { setTravelEstimate(null); setTravelDistance(0); setTravelEstimateStatus("idle"); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setTravelEstimateStatus("loading"); setTravelEstimateError("");
      try {
        const response = await fetch(`/api/public/travel-distance?city=${encodeURIComponent(city)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Distance calculation failed.");
        setTravelEstimate(data); setTravelDistance(Number(data.roundTripKm) || 0); setTravelEstimateStatus("success");
      } catch (error: any) {
        if (error.name === "AbortError") return;
        setTravelEstimate(null); setTravelDistance(0); setTravelEstimateStatus("error"); setTravelEstimateError(error.message || "Distance calculation failed.");
      }
    }, 750);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [contactForm.property_city]);

  // Helper to extract translated title of a plan
  const getPlanTitle = (p: PricingPlan): string => {
    return t(p.title, currentLang, defaultLang) || p.title;
  };

  // Helper to get formatted message template for a plan
  const getPlanMessageTemplate = (p: PricingPlan, customerName = ""): string => {
    const isHu = currentLang === "hu";
    let rawTemplate = isHu
      ? (p.message_template_hu || p.message_template_en || "Érdeklődöm a(z) {plan_name} csomag iránt. Kérem, vegyenek fel velem a kapcsolatot a részletekkel kapcsolatban.")
      : (p.message_template_en || p.message_template_hu || "I'm interested in the {plan_name} plan. Please contact me with more details.");

    const planTitle = getPlanTitle(p);
    const formattedPrice = formatCurrencyPrice(p.price, p.currency);
    const billingPeriod = p.billing_period ? (tUi(p.billing_period, currentLang, undefined, defaultLang) || p.billing_period) : "";

    return interpolatePricingMessageTemplate(rawTemplate, {
      plan_name: planTitle,
      price: formattedPrice,
      billing_period: billingPeriod,
      customer_name: customerName.trim()
    });
  };

  // Listen to custom window events for plan and extra service selections
  useEffect(() => {
    const handlePlanSelect = (e: Event) => {
      const customEvent = e as CustomEvent<{ planId: string; plan?: PricingPlan }>;
      if (customEvent.detail) {
        let plan = customEvent.detail.plan;
        if (!plan && allPlans.length > 0) {
          plan = allPlans.find((p) => p.id === customEvent.detail.planId);
        }
        if (plan) {
          setSelectedPlan(plan);
          setShowPricingDetails(true);
          // Pre-fill message
          const generatedMsg = getPlanMessageTemplate(plan, contactForm.name);
          setContactForm((prev) => ({ ...prev, message: generatedMsg }));
          setIsMessageCustomized(false);
        }
      }
    };

    const handleExtraSelect = (e: Event) => {
      const customEvent = e as CustomEvent<{ serviceId: string; service?: ExtraService }>;
      if (customEvent.detail) {
        const id = customEvent.detail.serviceId;
        setSelectedPlan((currentPlan) => {
          if (!currentPlan && allPlans.length > 0) {
            const firstPlan = allPlans[0];
            const generatedMsg = getPlanMessageTemplate(firstPlan, contactForm.name);
            setContactForm((prev) => ({ ...prev, message: generatedMsg }));
            setIsMessageCustomized(false);
            return firstPlan;
          }
          return currentPlan;
        });
        setSelectedExtras((prev) => ({
          ...prev,
          [id]: (prev[id] || 0) + 1,
        }));
        setShowPricingDetails(true);
      }
    };

    window.addEventListener("sps_select_pricing_plan", handlePlanSelect);
    window.addEventListener("sps_select_extra_service", handleExtraSelect);

    return () => {
      window.removeEventListener("sps_select_pricing_plan", handlePlanSelect);
      window.removeEventListener("sps_select_extra_service", handleExtraSelect);
    };
  }, [allPlans, contactForm.name, currentLang, defaultLang]);

  // Update pre-filled message when customer name changes (if user hasn't manually customized message)
  const handleNameChange = (val: string) => {
    setContactForm((prev) => {
      const next = { ...prev, name: val };
      if (selectedPlan && !isMessageCustomized) {
        next.message = getPlanMessageTemplate(selectedPlan, val);
      }
      return next;
    });
  };

  const handleSelectPlan = (planId: string) => {
    if (!planId) {
      setSelectedPlan(null);
      setSelectedExtras({});
      setTravelDistance(0);
      return;
    }
    const found = allPlans.find((p) => p.id === planId);
    if (found) {
      setSelectedPlan(found);
      const generatedMsg = getPlanMessageTemplate(found, contactForm.name);
      setContactForm((prev) => ({ ...prev, message: generatedMsg }));
      setIsMessageCustomized(false);
    }
  };

  const handleClearPlan = () => {
    setSelectedPlan(null);
    setSelectedExtras({});
    setTravelDistance(0);
  };

  const handleResetTemplate = () => {
    if (selectedPlan) {
      const generated = getPlanMessageTemplate(selectedPlan, contactForm.name);
      setContactForm((prev) => ({ ...prev, message: generated }));
      setIsMessageCustomized(false);
    }
  };

  // Toggle extra service quantity
  const handleUpdateExtraQuantity = (serviceId: string, delta: number) => {
    setSelectedExtras((prev) => {
      const current = prev[serviceId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[serviceId];
        return copy;
      }
      return { ...prev, [serviceId]: next };
    });
  };

  // Calculate live fees & total breakdown
  const currency = selectedPlan?.currency || availableExtras[0]?.currency || "USD";

  const selectedExtrasList = useMemo(() => {
    const list: Array<{ service: ExtraService; quantity: number; subtotal: number }> = [];
    for (const [id, qty] of Object.entries(selectedExtras)) {
      if (qty > 0) {
        const extra = availableExtras.find((e) => e.id === id);
        if (extra) {
          list.push({
            service: extra,
            quantity: qty,
            subtotal: Number(extra.price) * qty,
          });
        }
      }
    }
    return list;
  }, [selectedExtras, availableExtras]);

  const extrasSubtotal = useMemo(() => {
    return selectedExtrasList.reduce((acc, item) => acc + item.subtotal, 0);
  }, [selectedExtrasList]);

  const calculatedFees = useMemo(() => {
    return feeRules.map((rule) => {
      const isDistance = rule.fee_type === "distance" || rule.fee_type === "distance_tiered";
      const costInfo = calculateFeeRuleCost(rule, isDistance ? travelDistance : 0);
      return {
        rule,
        cost: costInfo.fee,
        explanation: costInfo.explanation,
      };
    });
  }, [feeRules, travelDistance]);

  const feesTotal = useMemo(() => {
    return calculatedFees.reduce((acc, f) => acc + f.cost, 0);
  }, [calculatedFees]);

  const estimatedTotal = useMemo(() => {
    const basePlanPrice = selectedPlan ? Number(selectedPlan.price) : 0;
    return basePlanPrice + extrasSubtotal + feesTotal;
  }, [selectedPlan, extrasSubtotal, feesTotal]);

  // Settings evaluation
  const showPhone = settings.contact_form_show_phone !== "0" && settings.contact_form_show_phone !== "false";
  const requirePhone = settings.contact_form_require_phone === "1" || settings.contact_form_require_phone === "true";
  const hasPropertyCity = contactForm.property_city.trim().length >= 2;
  
  const showAvailability = settings.contact_form_show_availability !== "0" && settings.contact_form_show_availability !== "false";
  const requireAvailability = settings.contact_form_require_availability === "1" || settings.contact_form_require_availability === "true";
  const availabilityLabel = t(settings.contact_form_availability_label, currentLang, defaultLang) || tUi("contact.when_contacted", currentLang, undefined, defaultLang) || "When I would like to schedule the photoshoot";
  const availabilityHelp = t(settings.contact_form_availability_help_text, currentLang, defaultLang) || tUi("contact.availability_help_default", currentLang, undefined, defaultLang) || "Please specify your preferred date and time window for the photoshoot.";

  // Validate phone format helper
  const validatePhone = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      if (requirePhone) return tUi("contact.phone_required", currentLang, undefined, defaultLang) || "Phone number is required.";
      return "";
    }
    const digitsCount = (trimmed.match(/\d/g) || []).length;
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{4,20}$/;
    if (digitsCount < 6 || !phoneRegex.test(trimmed)) {
      return tUi("contact.phone_invalid", currentLang, undefined, defaultLang) || "Please enter a valid phone number.";
    }
    return "";
  };

  // Validate availability range helper
  const validateAvailability = (start: string, end: string) => {
    if (requireAvailability && (!start || !end)) {
      return tUi("contact.availability_required", currentLang, undefined, defaultLang) || "Please select both a start and end date and time.";
    }
    if ((start && !end) || (!start && end)) {
      return tUi("contact.availability_both_required", currentLang, undefined, defaultLang) || "Please provide both start and end date and time for your availability window.";
    }
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        return tUi("contact.availability_invalid", currentLang, undefined, defaultLang) || "Please enter valid date and time values.";
      }
      const nowWithGrace = new Date(Date.now() - 5 * 60 * 1000);
      if (s < nowWithGrace) {
        return tUi("contact.availability_past", currentLang, undefined, defaultLang) || "Start date and time cannot be in the past.";
      }
      if (e <= s) {
        return tUi("contact.availability_order", currentLang, undefined, defaultLang) || "End date and time must be after the start date and time.";
      }
    }
    return "";
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setContactForm({ ...contactForm, phone: val });
    if (phoneError) {
      setPhoneError(validatePhone(val));
    }
  };

  const handleAvailabilityStartChange = (val: string) => {
    const nextForm = { ...contactForm, availability_start: val };
    setContactForm(nextForm);
    if (availabilityError) {
      setAvailabilityError(validateAvailability(val, nextForm.availability_end));
    }
  };

  const handleAvailabilityEndChange = (val: string) => {
    const nextForm = { ...contactForm, availability_end: val };
    setContactForm(nextForm);
    if (availabilityError) {
      setAvailabilityError(validateAvailability(nextForm.availability_start, val));
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!hasAcceptedCookies) {
      setContactStatus("error");
      setErrorMessage(tUi("contact.cookie_consent_required", currentLang, undefined, defaultLang));
      openPreferences();
      return;
    }

    if (showPhone) {
      const err = validatePhone(contactForm.phone);
      if (err) {
        setPhoneError(err);
        return;
      }
    }

    if (showAvailability) {
      const availErr = validateAvailability(contactForm.availability_start, contactForm.availability_end);
      if (availErr) {
        setAvailabilityError(availErr);
        return;
      }
    }

    // Format extra services payload
    const formattedExtrasPayload = selectedPlan
      ? selectedExtrasList.map((item) => ({
          id: item.service.id,
          title: t(item.service.title, currentLang, defaultLang) || item.service.title,
          quantity: item.quantity,
          price: item.service.price,
          subtotal: item.subtotal,
        }))
      : [];

    // Format fees payload
    const formattedFeesPayload = selectedPlan
      ? calculatedFees.map((f) => ({
          id: f.rule.id,
          name: t(f.rule.name, currentLang, defaultLang) || f.rule.name,
          amount: f.cost,
          explanation: f.explanation,
          ...(f.rule.fee_type === "distance" || f.rule.fee_type === "distance_tiered"
            ? {
                origin_city: "Hódmezővásárhely",
                destination_city: contactForm.property_city.trim(),
                one_way_km: travelEstimate?.oneWayKm,
                round_trip_km: travelEstimate?.roundTripKm,
              }
            : {}),
        }))
      : [];

    setContactStatus("submitting");
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          phone: contactForm.phone,
          property_address: [contactForm.property_city.trim(), contactForm.property_address.trim()].filter(Boolean).join(", "),
          property_city: contactForm.property_city,
          travel_distance_one_way_km: travelEstimate?.oneWayKm,
          travel_distance_round_trip_km: travelEstimate?.roundTripKm,
          availability_start: showAvailability ? contactForm.availability_start : undefined,
          availability_end: showAvailability ? contactForm.availability_end : undefined,
          message: contactForm.message,
          plan_id: selectedPlan ? selectedPlan.id : undefined,
          plan_name: selectedPlan ? getPlanTitle(selectedPlan) : undefined,
          extra_services: selectedPlan && formattedExtrasPayload.length > 0 ? JSON.stringify(formattedExtrasPayload) : undefined,
          fee_details: selectedPlan && formattedFeesPayload.length > 0 ? JSON.stringify(formattedFeesPayload) : undefined,
          estimated_total: selectedPlan && estimatedTotal > 0 ? estimatedTotal : undefined,
          currency: currency,
          cookie_consent: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setContactStatus("success");
        setContactForm({ 
          name: "", 
          email: "", 
          phone: "", 
          property_address: "", 
          property_city: "",
          availability_start: "",
          availability_end: "",
          message: "" 
        });
        setSelectedPlan(null);
        setSelectedExtras({});
        setPhoneError("");
        setAvailabilityError("");
        setIsMessageCustomized(false);
      } else {
        setContactStatus("error");
        setErrorMessage(data.error || tUi("Failed to send message. Please try again.", currentLang, undefined, defaultLang));
      }
    } catch {
      setContactStatus("error");
      setErrorMessage(tUi("Failed to send message. Please try again.", currentLang, undefined, defaultLang));
    }
  };

  const contactTitle = t(settings.contact_title, currentLang, defaultLang) || tUi("Let's work together.", currentLang, undefined, defaultLang) || "Let's work together.";
  const contactDesc = t(settings.contact_description, currentLang, defaultLang) || tUi("Ready to showcase your property? Get in touch with us to schedule a photoshoot.", currentLang, undefined, defaultLang) || "Ready to showcase your property? Get in touch with us to schedule a photoshoot.";

  // Calculate local ISO string for datetime min
  const now = new Date();
  const pad = (n: number) => n < 10 ? `0${n}` : n;
  const currentLocalDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    <motion.section 
      id="contact" 
      variants={staggerContainer(0.12, 0.05)}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT_CONFIG}
      className="aero-contact scroll-mt-20 bg-primary text-background py-20 md:py-28 overflow-hidden"
    >
      <div className="aero-contact-layout max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Column: Details & Info */}
        <motion.div variants={fadeInLeft} className="aero-contact-info lg:col-span-5 flex flex-col justify-between h-full min-w-0">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-5 leading-tight">{contactTitle}</h2>
            <p className="text-background/80 text-base sm:text-lg mb-10 max-w-lg leading-relaxed">
              {contactDesc}
            </p>

            <div className="grid gap-3.5">
              {settings.contact_email && (
                <a 
                  href={`mailto:${settings.contact_email}`}
                  className="aero-contact-detail flex items-center gap-4 text-background/90 hover:text-background transition-all group"
                >
                  <div className="aero-contact-detail-icon w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FontAwesomeIcon icon={faEnvelope} className="w-5 h-5 text-background" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-xs uppercase font-semibold tracking-wider text-background/60">{tUi("Email Address", currentLang, undefined, defaultLang) || "Email Address"}</div>
                    <span className="text-base font-medium break-all">{settings.contact_email}</span>
                  </div>
                </a>
              )}

              {settings.contact_phone && (
                <a 
                  href={`tel:${settings.contact_phone.replace(/\s+/g, '')}`}
                  className="aero-contact-detail flex items-center gap-4 text-background/90 hover:text-background transition-all group"
                >
                  <div className="aero-contact-detail-icon w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FontAwesomeIcon icon={faPhone} className="w-5 h-5 text-background" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-xs uppercase font-semibold tracking-wider text-background/60">{tUi("Phone", currentLang, undefined, defaultLang) || "Phone"}</div>
                    <span className="text-base font-medium">{settings.contact_phone}</span>
                  </div>
                </a>
              )}

              {settings.contact_address && (
                <div className="aero-contact-detail group flex items-start gap-4 text-background/90">
                  <div className="aero-contact-detail-icon w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <FontAwesomeIcon icon={faLocationDot} className="w-5 h-5 text-background" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-xs uppercase font-semibold tracking-wider text-background/60">{tUi("contact.address", currentLang, undefined, defaultLang) || "Studio Location"}</div>
                    <span className="text-base font-medium leading-snug">{t(settings.contact_address, currentLang, defaultLang) || settings.contact_address}</span>
                  </div>
                </div>
              )}

              {settings.contact_hours && (
                <div className="aero-contact-detail group flex items-start gap-4 text-background/90">
                  <div className="aero-contact-detail-icon w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <FontAwesomeIcon icon={faClock} className="w-5 h-5 text-background" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-xs uppercase font-semibold tracking-wider text-background/60">{tUi("contact.hours", currentLang, undefined, defaultLang) || "Opening Hours"}</div>
                    <span className="text-base font-medium leading-snug">{t(settings.contact_hours, currentLang, defaultLang) || settings.contact_hours}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Map Embed if configured */}
          {settings.contact_map_embed && (
            <div className="mt-8 rounded-2xl overflow-hidden border border-background/20 shadow-lg bg-background/10 aspect-video w-full max-h-56 relative group">
              {settings.contact_map_embed.startsWith("http") ? (
                <iframe
                  title="Studio Location"
                  src={settings.contact_map_embed}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div 
                  className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                  dangerToInnerHTML={{ __html: settings.contact_map_embed }}
                />
              )}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="px-2.5 py-1 bg-background/90 text-text text-xs rounded-md shadow-xs flex items-center gap-1.5 font-medium">
                  <FontAwesomeIcon icon={faMapLocationDot} className="w-3 h-3 text-primary" />
                  {tUi("contact.map", currentLang, undefined, defaultLang) || "Map"}
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Right Column: Inquiry Form Card */}
        <motion.div variants={fadeInRight} className="aero-contact-form-card lg:col-span-7 min-w-0 bg-background rounded-3xl p-7 sm:p-10 text-text shadow-2xl border border-border">
          <div className="mb-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-text">{tUi("Send an Inquiry", currentLang, undefined, defaultLang) || "Send an Inquiry"}</h3>
            <p className="text-sm text-muted-text mt-1">
              {tUi("Fill out the details below and we will get back to you with custom estimates and availability.", currentLang, undefined, defaultLang) || "Fill out the details below and we will get back to you with custom estimates and availability."}
            </p>
          </div>

          {contactStatus === "success" ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 p-8 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center py-12"
            >
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/60 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
                <FontAwesomeIcon icon={faEnvelope} className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold mb-2">{tUi("Thank you for your message!", currentLang, undefined, defaultLang) || "Thank you for your message!"}</h4>
              <p className="text-emerald-700 dark:text-emerald-300 max-w-md mx-auto text-sm sm:text-base">
                {tUi("We've received your request and our team will get back to you shortly.", currentLang, undefined, defaultLang) || "We've received your request and our team will get back to you shortly."}
              </p>
              <button
                type="button"
                onClick={() => setContactStatus("idle")}
                className="mt-6 px-6 py-2.5 bg-primary text-background font-medium rounded-xl hover:opacity-90 transition-opacity text-sm"
              >
                {tUi("Send Another Message", currentLang, undefined, defaultLang) || "Send Another Message"}
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleContactSubmit} className="aero-contact-form relative space-y-5" aria-disabled={!hasAcceptedCookies}>
              {!hasAcceptedCookies && (
                <div className="aero-contact-consent-lock relative z-20 rounded-2xl p-5 sm:p-6 text-center mb-5">
                  <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="text-base font-bold text-text">
                    {tUi("contact.cookie_lock_title", currentLang, undefined, defaultLang)}
                  </h3>
                  <p className="text-sm text-muted-text mt-1.5 max-w-md mx-auto leading-relaxed">
                    {tUi("contact.cookie_lock_description", currentLang, undefined, defaultLang)}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 mt-4">
                    <button type="button" onClick={acceptCookies} className="aero-cookie-primary px-5 py-2.5 rounded-xl text-sm font-bold">
                      {tUi("contact.accept_and_enable", currentLang, undefined, defaultLang)}
                    </button>
                    <button type="button" onClick={openPreferences} className="aero-cookie-secondary px-4 py-2.5 rounded-xl text-sm font-semibold">
                      {tUi("cookie_banner.settings", currentLang, undefined, defaultLang)}
                    </button>
                  </div>
                </div>
              )}
              <fieldset
                disabled={!hasAcceptedCookies}
                className={`flex flex-col gap-6 ${!hasAcceptedCookies ? "opacity-45 blur-[1px] select-none pointer-events-none" : ""}`}
              >
              <div className="order-5 space-y-6">
              {!hasPropertyCity && (
                <div className="rounded-2xl border border-primary/25 bg-primary/8 px-4 py-3.5 flex items-start gap-3 text-sm text-text">
                  <FontAwesomeIcon icon={faMapLocationDot} className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="leading-relaxed">
                    {tUi("contact.city_required_before_calculator", currentLang, undefined, defaultLang) || "Enter the property's city above before selecting a package or additional services. This is required to calculate the travel fee and the correct estimated total."}
                  </p>
                </div>
              )}
              <div className={`space-y-6 transition-opacity ${!hasPropertyCity ? "pointer-events-none opacity-45 select-none" : ""}`} aria-disabled={!hasPropertyCity}>
              {/* Selected Plan Banner / Selector */}
              {allPlans.length > 0 && (
                <div className="p-5 sm:p-6 rounded-2xl bg-surface/80 border border-border space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-primary" />
                      <span>{tUi("contact.selected_package", currentLang, undefined, defaultLang) || "Selected Package / Plan:"}</span>
                    </span>

                    {selectedPlan && (
                      <button
                        type="button"
                        onClick={handleClearPlan}
                        className="text-xs text-muted-text hover:text-red-500 transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{tUi("contact.clear_plan", currentLang, undefined, defaultLang) || "Clear"}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <select
                      value={selectedPlan?.id || ""}
                      onChange={(e) => handleSelectPlan(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-background border border-border rounded-xl text-text text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="">-- {tUi("contact.select_plan_optional", currentLang, undefined, defaultLang) || "None (Custom Request)"} --</option>
                      {allPlans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {getPlanTitle(p)} ({formatCurrencyPrice(p.price, p.currency)}
                          {p.billing_period ? ` / ${p.billing_period}` : ""})
                          {p.type === "bundle" ? " [Bundle]" : ""}
                        </option>
                      ))}
                    </select>

                    {selectedPlan && (
                      <div className="flex items-center justify-between sm:justify-end gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <span className="text-xs font-bold uppercase">
                          {selectedPlan.type === "bundle" ? "Bundle:" : "Plan:"}
                        </span>
                        <span className="text-sm font-extrabold">
                          {formatCurrencyPrice(selectedPlan.price, selectedPlan.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Extra Services Accordion / Selector - Only visible when a plan or bundle is selected */}
              <AnimatePresence>
                {selectedPlan && availableExtras.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 sm:p-6 rounded-2xl bg-surface/50 border border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          <span>{tUi("contact.add_on_services", currentLang, undefined, defaultLang) || "Add-On Services (Optional):"}</span>
                        </span>
                        <span className="text-xs text-muted-text">
                          {selectedExtrasList.length > 0 ? `${selectedExtrasList.length} selected` : ""}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {availableExtras.map((extra) => {
                          const isSelected = (selectedExtras[extra.id] || 0) > 0;
                          const qty = selectedExtras[extra.id] || 0;
                          const title = t(extra.title, currentLang, defaultLang) || extra.title;

                          return (
                            <div
                              key={extra.id}
                              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                                isSelected
                                  ? "bg-primary/5 border-primary shadow-xs"
                                  : "bg-background border-border hover:border-border/80"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-text block truncate">{title}</span>
                                <span className="text-[11px] text-muted-text">
                                  +{formatCurrencyPrice(extra.price, extra.currency)}
                                  {extra.unit && extra.unit !== "item" ? `/${extra.unit}` : ""}
                                </span>
                              </div>

                              {extra.allow_quantity ? (
                                <div className="flex items-center border border-border rounded-lg overflow-hidden bg-surface">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateExtraQuantity(extra.id, -1)}
                                    className="px-2 py-1 text-xs hover:bg-background transition-colors text-text"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 py-1 text-xs font-bold text-text bg-background min-w-[24px] text-center">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateExtraQuantity(extra.id, 1)}
                                    className="px-2 py-1 text-xs hover:bg-background transition-colors text-text"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateExtraQuantity(extra.id, isSelected ? -1 : 1)}
                                  className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                    isSelected
                                      ? "bg-primary text-background border-primary"
                                      : "bg-surface text-muted-text border-border hover:text-text"
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Travel Distance & Live Fee Breakdown (Estimated Cost Calculator) - Only visible when a plan or bundle is selected */}
              <AnimatePresence>
                {selectedPlan && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 sm:p-6 rounded-2xl bg-surface/70 border border-border space-y-4">
                      <div 
                        className="flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setShowPricingDetails(!showPricingDetails)}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text">
                          <Calculator className="w-3.5 h-3.5 text-primary" />
                          <span>{tUi("contact.estimated_cost_title", currentLang, undefined, defaultLang) || "Estimated Investment Summary"}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-extrabold text-primary">
                            {formatCurrencyPrice(estimatedTotal, currency)}
                          </span>
                          {showPricingDetails ? <ChevronUp className="w-4 h-4 text-muted-text" /> : <ChevronDown className="w-4 h-4 text-muted-text" />}
                        </div>
                      </div>

                      {showPricingDetails && (
                        <div className="pt-3 border-t border-border/80 space-y-3 text-xs">
                          {/* Automatically calculated travel distance (if a distance fee rule exists) */}
                          {feeRules.some((r) => r.fee_type === "distance" || r.fee_type === "distance_tiered") && (
                            <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Car className="w-4 h-4 text-primary" />
                                <div>
                                  <span className="font-semibold text-text block">
                                    {tUi("contact.travel_auto_label", currentLang, undefined, defaultLang) || "Calculated travel distance"}
                                  </span>
                                  <span className="text-[11px] text-muted-text">
                                    {tUi("contact.travel_auto_desc", currentLang, undefined, defaultLang) || "Round trip from Hódmezővásárhely"}
                                  </span>
                                </div>
                              </div>
                              <div className="min-w-24 text-right">
                                <div className="font-bold text-text">
                                  {travelEstimateStatus === "loading"
                                    ? (tUi("contact.travel_calculating", currentLang, undefined, defaultLang) || "Calculating…")
                                    : travelEstimate
                                      ? `${travelEstimate.roundTripKm} km`
                                      : "—"}
                                </div>
                                {travelEstimate && (
                                  <div className="text-[10px] text-muted-text">
                                    {tUi("contact.round_trip", currentLang, undefined, defaultLang) || "round trip"}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Itemized summary lines */}
                          <div className="space-y-1.5 pt-1">
                            {selectedPlan && (
                              <div className="flex items-center justify-between text-muted-text">
                                <span>{getPlanTitle(selectedPlan)} ({selectedPlan.type === "bundle" ? "Bundle" : "Base Plan"})</span>
                                <span className="font-semibold text-text">{formatCurrencyPrice(selectedPlan.price, selectedPlan.currency)}</span>
                              </div>
                            )}

                            {selectedExtrasList.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-muted-text">
                                <span>{item.quantity > 1 ? `${item.quantity}x ` : ""}{t(item.service.title, currentLang, defaultLang) || item.service.title}</span>
                                <span className="font-semibold text-text">+{formatCurrencyPrice(item.subtotal, item.service.currency)}</span>
                              </div>
                            ))}

                            {calculatedFees.map((f, idx) => (
                              <div key={idx} className="flex items-center justify-between text-muted-text">
                                <div>
                                  <span>{t(f.rule.name, currentLang, defaultLang) || f.rule.name}</span>
                                  {f.explanation && (
                                    <span className="text-[10px] text-muted-text/80 block">{f.explanation}</span>
                                  )}
                                </div>
                                <span className="font-semibold text-text">
                                  {f.cost === 0 ? "FREE" : `+${formatCurrencyPrice(f.cost, f.rule.currency)}`}
                                </span>
                              </div>
                            ))}

                            <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-bold text-text">
                              <span>{tUi("contact.estimated_total", currentLang, undefined, defaultLang) || "Estimated Total:"}</span>
                              <span className="text-primary text-base font-extrabold">{formatCurrencyPrice(estimatedTotal, currency)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
              </div>

              {/* Name & Email Fields */}
              <div className="order-1 grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-text mb-1.5">
                    {tUi("Name", currentLang, undefined, defaultLang) || "Name"} <span className="text-primary">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder={tUi("contact.name_placeholder", currentLang, undefined, defaultLang) || "Your full name"}
                    className="aero-input w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none text-text placeholder:text-muted-text/60 text-sm"
                    value={contactForm.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-text mb-1.5">
                    {tUi("Email Address", currentLang, undefined, defaultLang) || "Email Address"} <span className="text-primary">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    placeholder={tUi("contact.email_placeholder", currentLang, undefined, defaultLang) || "you@example.com"}
                    className="aero-input w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none text-text placeholder:text-muted-text/60 text-sm"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Conditional Phone Field */}
              {showPhone && (
                <div className="order-2 space-y-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-text">
                      {requirePhone 
                        ? (tUi("contact.phone_required", currentLang, undefined, defaultLang) || "Phone Number *") 
                        : (tUi("contact.phone_optional", currentLang, undefined, defaultLang) || "Phone Number (Optional)")}
                    </label>
                    <span className="text-xs text-muted-text">
                      {requirePhone ? tUi("Required", currentLang, undefined, defaultLang) || "Required" : tUi("Optional", currentLang, undefined, defaultLang) || "Optional"}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      required={requirePhone}
                      type="tel"
                      placeholder={tUi("contact.phone_placeholder", currentLang, undefined, defaultLang) || "+1 (555) 000-0000"}
                      className={`aero-input w-full px-4 py-3 bg-surface border rounded-xl focus:outline-none text-text placeholder:text-muted-text/60 text-sm ${
                        phoneError ? "border-red-500 focus:ring-red-500" : "border-border"
                      }`}
                      value={contactForm.phone}
                      onChange={handlePhoneChange}
                      onBlur={() => setPhoneError(validatePhone(contactForm.phone))}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-text/70">
                      <FontAwesomeIcon icon={faPhone} className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  {phoneError ? (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{phoneError}</p>
                  ) : (
                    <p className="text-2xs text-muted-text mt-1">
                      {tUi("contact.phone_field_helper", currentLang, undefined, defaultLang) || "Used to coordinate shoot logistics and schedule updates."}
                    </p>
                  )}
                </div>
              )}

              {/* Property city is also needed when an automatic distance fee is active. */}
              <div className="order-3 p-5 sm:p-6 rounded-2xl bg-surface/55 border border-border space-y-5">
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                      <label className="block text-sm font-semibold text-text">
                        {tUi("contact.property_city", currentLang, undefined, defaultLang) || "Property city"} <span className="text-primary">*</span>
                      </label>
                      <span className="text-xs text-primary font-semibold">
                        {tUi("contact.city_calculator_required", currentLang, undefined, defaultLang) || "Required for package and travel calculation"}
                      </span>
                    </div>
                    <div className="relative">
                      <input required type="text" autoComplete="address-level2" placeholder={tUi("contact.property_city_placeholder", currentLang, undefined, defaultLang) || "e.g. Szeged"} className="aero-input w-full px-4 py-3 pr-10 bg-background border border-border rounded-xl focus:outline-none text-text placeholder:text-muted-text/60 text-sm" value={contactForm.property_city} onChange={(e) => setContactForm({ ...contactForm, property_city: e.target.value })}/>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-text">{travelEstimateStatus === "loading" ? <span className="block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/> : <FontAwesomeIcon icon={faMapLocationDot} className="w-4 h-4"/>}</div>
                    </div>
                    {travelEstimateStatus === "success" && travelEstimate && <p className="text-xs text-emerald-600 mt-1.5 font-medium">{tUi("contact.travel_route_found", { oneWay: travelEstimate.oneWayKm, roundTrip: travelEstimate.roundTripKm })}</p>}
                    {travelEstimateStatus === "error" && <p className="text-xs text-red-500 mt-1.5">{travelEstimateError}</p>}
                  </div>
                  <div className="space-y-2">
                      <label className="block text-sm font-semibold text-text mb-1.5">
                        {tUi("contact.property_address", currentLang, undefined, defaultLang) || "Property Address (Optional)"}
                      </label>
                      <input
                        type="text"
                        placeholder={tUi("contact.property_address_placeholder", currentLang, undefined, defaultLang) || "e.g. 124 Ocean Drive, Miami, FL"}
                        className="aero-input w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none text-text placeholder:text-muted-text/60 text-sm"
                        value={contactForm.property_address}
                        onChange={(e) => setContactForm({ ...contactForm, property_address: e.target.value })}
                      />
                  </div>
              </div>

              {/* Availability Date-Time Range Field */}
              {showAvailability && (
                <div className="order-4 p-5 sm:p-6 rounded-2xl bg-surface/80 border border-border space-y-5">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-text flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendarDays} className="text-primary w-3.5 h-3.5" />
                      <span>{availabilityLabel}</span>
                      {requireAvailability && <span className="text-primary">*</span>}
                    </label>
                    <span className="text-xs text-muted-text">
                      {requireAvailability ? tUi("Required", currentLang, undefined, defaultLang) || "Required" : tUi("Optional", currentLang, undefined, defaultLang) || "Optional"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="block text-xs text-muted-text font-medium mb-1">
                        {tUi("contact.availability_from", currentLang, undefined, defaultLang) || "Earliest / From"}
                      </span>
                      <input
                        required={requireAvailability}
                        type="datetime-local"
                        min={currentLocalDateTime}
                        value={contactForm.availability_start}
                        onChange={(e) => handleAvailabilityStartChange(e.target.value)}
                        onBlur={() => setAvailabilityError(validateAvailability(contactForm.availability_start, contactForm.availability_end))}
                        className={`w-full px-3.5 py-2.5 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all text-text text-xs sm:text-sm ${
                          availabilityError ? "border-red-500 focus:ring-red-500" : "border-border"
                        }`}
                      />
                    </div>
                    <div>
                      <span className="block text-xs text-muted-text font-medium mb-1">
                        {tUi("contact.availability_to", currentLang, undefined, defaultLang) || "Latest / To"}
                      </span>
                      <input
                        required={requireAvailability}
                        type="datetime-local"
                        min={contactForm.availability_start || currentLocalDateTime}
                        value={contactForm.availability_end}
                        onChange={(e) => handleAvailabilityEndChange(e.target.value)}
                        onBlur={() => setAvailabilityError(validateAvailability(contactForm.availability_start, contactForm.availability_end))}
                        className={`w-full px-3.5 py-2.5 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all text-text text-xs sm:text-sm ${
                          availabilityError ? "border-red-500 focus:ring-red-500" : "border-border"
                        }`}
                      />
                    </div>
                  </div>

                  {availabilityError ? (
                    <p className="text-xs text-red-500 font-medium">{availabilityError}</p>
                  ) : (
                    <p className="text-2xs text-muted-text">
                      {availabilityHelp}
                    </p>
                  )}
                </div>
              )}

              {/* Message Textarea (Pre-filled, editable) */}
              <div className="order-6 space-y-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-text">
                    {tUi("contact.message", currentLang, undefined, defaultLang) || "Project Details & Message"} <span className="text-primary">*</span>
                  </label>
                  {selectedPlan && isMessageCustomized && (
                    <button
                      type="button"
                      onClick={handleResetTemplate}
                      className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      title="Reset message to plan's default template"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{tUi("contact.reset_template", currentLang, undefined, defaultLang) || "Reset to plan template"}</span>
                    </button>
                  )}
                </div>
                <textarea
                  required
                  rows={4}
                  placeholder={tUi("contact.message_placeholder", currentLang, undefined, defaultLang) || "Tell us about your property, preferred dates, and requested services..."}
                  className="aero-input w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none resize-none text-text placeholder:text-muted-text/60 text-sm"
                  value={contactForm.message}
                  onChange={(e) => {
                    setContactForm({ ...contactForm, message: e.target.value });
                    setIsMessageCustomized(true);
                  }}
                />
              </div>

              {contactStatus === "error" && (
                <div className="order-7 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
                  {errorMessage || tUi("Failed to send message. Please try again.", currentLang, undefined, defaultLang)}
                </div>
              )}

              <button
                disabled={contactStatus === "submitting"}
                type="submit"
                className="order-8 aero-submit-button w-full py-4 bg-primary text-background rounded-xl font-semibold disabled:opacity-70 flex justify-center items-center gap-2 shadow-md cursor-pointer mt-1"
              >
                {contactStatus === "submitting" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    <span>{tUi("Sending...", currentLang, undefined, defaultLang) || "Sending..."}</span>
                  </>
                ) : (
                  <>
                    <span>{tUi("Submit Inquiry", currentLang, undefined, defaultLang) || "Submit Inquiry"}</span>
                    <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
              </fieldset>
            </form>
          )}
        </motion.div>
      </div>
    </motion.section>
  );
}
