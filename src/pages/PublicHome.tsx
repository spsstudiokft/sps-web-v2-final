import { useState, useEffect, useRef } from "react";
import { SiteSettings, PortfolioItem, Service, PricingPlan, ExtraService, PricingFeeRule, FAQItem, FAQCategory } from "../lib/types";
import { Header } from "../components/public/Header";
import { Hero } from "../components/public/Hero";
import { Vision } from "../components/public/Vision";
import { About } from "../components/public/About";
import { Services } from "../components/public/Services";
import { Portfolio } from "../components/public/Portfolio";
import { Pricing } from "../components/public/Pricing";
import { VisualIdeas } from "../components/public/VisualIdeas";
import { Contact } from "../components/public/Contact";
import { FAQ } from "../components/public/FAQ";
import { Footer } from "../components/public/Footer";
import { PublicSkeleton } from "../components/public/PublicSkeleton";
import { FloatingNav } from "../components/public/FloatingNav";
import { SocialPopup } from "../components/public/SocialPopup";
import { SocialFloatingButton } from "../components/public/SocialFloatingButton";
import { usePageTitle } from "../hooks/usePageTitle";
import { useSeo } from "../hooks/useSeo";
import { LanguageProvider, useLanguage } from "../contexts/LanguageContext";
import { t } from "../lib/i18n";
import { parseSectionMedia } from "../lib/sectionMedia";
import { getNormalizedGallery } from "../lib/mediaUtils";
import { parseVisualIdeas } from "../lib/visualIdeas";
import { MotionConfig } from "motion/react";

type PublicBootstrapData = {
  settings: SiteSettings;
  portfolio: PortfolioItem[];
  services: Service[];
  pricing: PricingPlan[];
  extraServices: ExtraService[];
  feeRules: PricingFeeRule[];
  faqs: FAQItem[];
  faqCategories: FAQCategory[];
  generatedAt?: string;
};

const PUBLIC_BOOTSTRAP_CACHE_KEY = "sps-public-bootstrap-v1";
const PUBLIC_BOOTSTRAP_CLIENT_TTL_MS = 30_000;

function readCachedBootstrap(): PublicBootstrapData | null {
  try {
    const cached = sessionStorage.getItem(PUBLIC_BOOTSTRAP_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > PUBLIC_BOOTSTRAP_CLIENT_TTL_MS) return null;
    return parsed.data as PublicBootstrapData;
  } catch {
    return null;
  }
}

function cacheBootstrap(data: PublicBootstrapData) {
  try {
    sessionStorage.setItem(PUBLIC_BOOTSTRAP_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Storage can be unavailable or full; HTTP caching still applies.
  }
}

function preconnectMediaOrigins(data: PublicBootstrapData) {
  if (typeof document === "undefined") return;
  const origins = new Set<string>();
  for (const item of data.portfolio.slice(0, 12)) {
    const first = getNormalizedGallery(item.image_urls)[0];
    const candidate = first?.thumbnail_url || first?.compressed_url || item.thumbnail_url;
    if (!candidate) continue;
    try {
      const origin = new URL(candidate, window.location.origin).origin;
      if (origin !== window.location.origin) origins.add(origin);
    } catch {}
  }

  for (const origin of Array.from(origins).slice(0, 3)) {
    if (document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }
}

function preloadCriticalMedia(data: PublicBootstrapData) {
  const urls = new Set<string>();
  const sectionMedia = parseSectionMedia(data.settings.section_media);
  const heroBackground = sectionMedia.home?.backgroundUrl;
  if (heroBackground) urls.add(heroBackground);

  // Portfolio media is intentionally not preloaded. The interactive showcase
  // lazy-loads it near the viewport; eager decoding caused main-thread jank.
  urls.forEach((url) => {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
  });
}

function shouldUseLitePerformanceMode() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches;
  const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  const lowCpu = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4;
  const constrainedNetwork = Boolean(nav.connection?.saveData) || ["slow-2g", "2g"].includes(nav.connection?.effectiveType || "");
  const mobileViewport = coarsePointer && window.innerWidth <= 767;
  const narrowLowCoreMobile = coarsePointer && window.innerWidth <= 480 && typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 6;
  return Boolean(reducedMotion || lowMemory || lowCpu || constrainedNetwork || mobileViewport || narrowLowCoreMobile);
}

export default function PublicHome() {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bootstrap, setBootstrap] = useState<PublicBootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const portfolioLoaded = useRef(false);

  useEffect(() => {
    const cached = readCachedBootstrap();
    if (cached) {
      setSettings(cached.settings || {});
      setPortfolio(Array.isArray(cached.portfolio) ? cached.portfolio : []);
      setServices(Array.isArray(cached.services) ? cached.services : []);
      setBootstrap(cached);
      preconnectMediaOrigins(cached);
      preloadCriticalMedia(cached);
      setLoading(false);
      return;
    }

    fetch("/api/public/bootstrap")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Public bootstrap failed (${response.status})`);
        return response.json();
      })
      .then((data: PublicBootstrapData) => {
        setSettings(data.settings || {});
        setPortfolio(Array.isArray(data.portfolio) ? data.portfolio : []);
        setServices(Array.isArray(data.services) ? data.services : []);
        setBootstrap(data);
        cacheBootstrap(data);
        preconnectMediaOrigins(data);
        preloadCriticalMedia(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loading || portfolioLoaded.current) return;
    const target = document.getElementById("portfolio");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting || portfolioLoaded.current) return; portfolioLoaded.current = true; fetch("/api/public/portfolio").then(r => r.ok ? r.json() : null).then(data => { if (Array.isArray(data)) setPortfolio(data); }).catch(() => {}); observer.disconnect(); }, { rootMargin: "600px" });
    observer.observe(target); return () => observer.disconnect();
  }, [loading]);

  if (loading) return <PublicSkeleton />;

  return (
    <LanguageProvider settings={settings}>
      <PublicHomeContent settings={settings} portfolio={portfolio} services={services} bootstrap={bootstrap} loading={loading} />
    </LanguageProvider>
  );
}

function PublicHomeContent({ settings, portfolio, services, bootstrap, loading }: { settings: SiteSettings, portfolio: PortfolioItem[], services: Service[], bootstrap: PublicBootstrapData | null, loading: boolean }) {
  const [activeSection, setActiveSection] = useState("Home");
  const [isSocialPopupOpen, setIsSocialPopupOpen] = useState(false);
  const [loadFullPricing, setLoadFullPricing] = useState(false);
  const [loadFullFaqs, setLoadFullFaqs] = useState(false);
  const pricingLoaded = useRef(false);
  const faqsLoaded = useRef(false);
  const { currentLang, defaultLang } = useLanguage();
  const [litePerformanceMode, setLitePerformanceMode] = useState(shouldUseLitePerformanceMode);
  const visibleServices = services.filter((service) => service.is_published !== 0);
  const visiblePortfolio = portfolio.filter((item) => {
    if (item.is_published === 0) return false;
    return Boolean(
      item.media_url
      || item.thumbnail_url
      || getNormalizedGallery(item.image_urls).length > 0
    );
  });
  const visiblePlans = (bootstrap?.pricing || []).filter((plan) => plan.is_enabled !== 0);
  const visibleExtras = (bootstrap?.extraServices || []).filter((extra) => extra.is_enabled !== 0 && extra.show_on_pricing_page !== 0);
  const visibleFaqs = (bootstrap?.faqs || []).filter((faq) => faq.is_published !== 0);
  const visibleVisualIdeas = parseVisualIdeas(settings.visual_ideas_items).filter((item) => item.is_visible !== false);
  const hasPricing = visiblePlans.length > 0 || visibleExtras.length > 0;
  const hasFaq = visibleFaqs.length > 0;
  const hasVisualIdeas = settings.visual_ideas_enabled !== "0" && settings.visual_ideas_enabled !== "false" && visibleVisualIdeas.length > 0;
  useEffect(() => {
    if (pricingLoaded.current) return;
    const target = document.getElementById("pricing");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || pricingLoaded.current) return;
      pricingLoaded.current = true;
      setLoadFullPricing(true);
      observer.disconnect();
    }, { rootMargin: "600px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (faqsLoaded.current) return;
    const target = document.getElementById("faq");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || faqsLoaded.current) return;
      faqsLoaded.current = true;
      setLoadFullFaqs(true);
      observer.disconnect();
    }, { rootMargin: "600px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  const sectionMedia = parseSectionMedia(settings.section_media);
  const sectionBackgroundCss = Object.entries(sectionMedia)
    .filter(([id, media]) => Boolean(media.backgroundUrl) || id === "home")
    .map(([id, media]) => {
      const safeId = id.replace(/[^a-z0-9_-]/gi, "");
      const isHero = safeId === "home";
      const safeUrl = encodeURI(String(media.backgroundUrl || ""))
        .replace(/["'()\\]/g, (character) => encodeURIComponent(character));
      const position = ["center", "top", "bottom", "left", "right"].includes(media.backgroundPosition || "")
        ? media.backgroundPosition
        : "center";
      const opacity = Math.min(0.9, Math.max(0, Number(media.overlayOpacity ?? 0.45)));
      if (isHero) {
        const blur = Math.min(24, Math.max(0, Number(media.imageBlur ?? 0)));
        const customImage = safeUrl
          ? `--hero-image-url:url("${safeUrl}");--hero-image-position:${position};`
          : "";
        return `#${safeId}{--hero-image-overlay:${opacity};--hero-image-blur:${blur}px;${customImage}}`;
      }
      return `#${safeId}{background-image:linear-gradient(rgba(0,0,0,${opacity}),rgba(0,0,0,${opacity})),url("${safeUrl}")!important;background-size:cover!important;background-position:${position}!important;background-repeat:no-repeat!important}`;
    })
    .join("\n");

  const activeSectionKey = activeSection.toLowerCase().replace(/\s+/g, "");
  const pageKeyMap: Record<string, string> = {
    home: "home",
    about: "about",
    services: "services",
    portfolio: "portfolio",
    pricing: "pricing",
    contact: "contact",
    faq: "faq"
  };

  useSeo({
    settings,
    pageKey: pageKeyMap[activeSectionKey] || "home"
  });

  usePageTitle(activeSection === "Home" ? "" : activeSection, t(settings.studio_name, currentLang, defaultLang) || "SPS Studio");

  useEffect(() => {
    if (loading) return;
    
    const sections = document.querySelectorAll("section[id]:not([data-nav-section='false'])");
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!mostVisible) return;
        const id = mostVisible.target.id;
        const name = id.charAt(0).toUpperCase() + id.slice(1);
        setActiveSection(id === "faq" ? "FAQ" : name);
      },
      { rootMargin: "-22% 0px -38% 0px", threshold: [0.05, 0.2, 0.4, 0.6] }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMode = () => setLitePerformanceMode(shouldUseLitePerformanceMode());
    mediaQuery.addEventListener?.("change", updateMode);
    window.addEventListener("resize", updateMode, { passive: true });
    return () => {
      mediaQuery.removeEventListener?.("change", updateMode);
      window.removeEventListener("resize", updateMode);
    };
  }, []);

  return (
    <MotionConfig reducedMotion={litePerformanceMode ? "always" : "never"}>
      <div
        className="aero-site font-sans antialiased bg-background text-text transition-colors duration-300 relative overflow-hidden"
        data-ambient={activeSectionKey}
        data-performance={litePerformanceMode ? "lite" : "full"}
      >
      <div className="aero-ambient-blur" aria-hidden="true">
        <span className="aero-blur-spot aero-blur-left-top" />
        <span className="aero-blur-spot aero-blur-left-bottom" />
        <span className="aero-blur-spot aero-blur-right-top" />
        <span className="aero-blur-spot aero-blur-right-bottom" />
      </div>

      <div className="relative z-10">
        {sectionBackgroundCss && <style>{sectionBackgroundCss}</style>}
        <Header settings={settings} hasServices={visibleServices.length > 0} hasPortfolio={visiblePortfolio.length > 0} hasPricing={hasPricing} hasFaq={hasFaq} />
        <FloatingNav
          hasServices={visibleServices.length > 0}
          hasPortfolio={visiblePortfolio.length > 0}
          hasPricing={hasPricing}
          hasFaq={hasFaq}
          onOpenSocial={() => setIsSocialPopupOpen(true)}
        />
        <Hero settings={settings} />
        <Vision settings={settings} />
        <About settings={settings} />
        {visibleServices.length > 0 && <Services settings={settings} initialServices={visibleServices} />}
        {visiblePortfolio.length > 0 && <Portfolio items={visiblePortfolio} isPerformanceLite={litePerformanceMode} />}
        {hasVisualIdeas && <VisualIdeas settings={settings} isPerformanceLite={litePerformanceMode} />}
        {hasPricing && <Pricing initialPlans={visiblePlans} initialExtras={visibleExtras} initialFeeRules={bootstrap?.feeRules || []} loadFullData={loadFullPricing} isPerformanceLite={litePerformanceMode} />}
        <Contact settings={settings} initialPlans={bootstrap?.pricing} initialExtras={bootstrap?.extraServices} initialFeeRules={bootstrap?.feeRules} />
        {hasFaq && <FAQ settings={settings} initialFaqs={visibleFaqs} initialCategories={bootstrap?.faqCategories || []} loadFullData={loadFullFaqs} />}
        <Footer settings={settings} />

        {/* Manual Fixed Floating Button in Bottom-Right Corner */}
        <SocialFloatingButton
          isOpen={isSocialPopupOpen}
          onClick={() => setIsSocialPopupOpen((prev) => !prev)}
        />

        {/* High Z-Index Modal with Tree-Rendered Social Links & Auto-Open */}
        <SocialPopup
          isOpen={isSocialPopupOpen}
          onClose={() => setIsSocialPopupOpen(false)}
        />
      </div>
      </div>
      </MotionConfig>
  );
}
