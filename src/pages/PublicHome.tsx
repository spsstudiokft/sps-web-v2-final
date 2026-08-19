import { useState, useEffect } from "react";
import { SiteSettings, PortfolioItem, Service, PricingPlan, ExtraService, PricingFeeRule, FAQItem, FAQCategory } from "../lib/types";
import { Header } from "../components/public/Header";
import { Hero } from "../components/public/Hero";
import { Vision } from "../components/public/Vision";
import { About } from "../components/public/About";
import { Services } from "../components/public/Services";
import { Portfolio } from "../components/public/Portfolio";
import { Pricing } from "../components/public/Pricing";
import { Contact } from "../components/public/Contact";
import { FAQ } from "../components/public/FAQ";
import { Footer } from "../components/public/Footer";
import { PublicSkeleton } from "../components/public/PublicSkeleton";
import { FloatingNav } from "../components/public/FloatingNav";
import { SocialPopup } from "../components/public/SocialPopup";
import { SocialFloatingButton } from "../components/public/SocialFloatingButton";
import { CookieConsentProvider } from "../components/public/CookieConsent";
import { usePageTitle } from "../hooks/usePageTitle";
import { useSeo } from "../hooks/useSeo";
import { LanguageProvider, useLanguage } from "../contexts/LanguageContext";
import { t } from "../lib/i18n";
import { parseSectionMedia } from "../lib/sectionMedia";
import { getNormalizedGallery } from "../lib/mediaUtils";
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

function preloadCriticalMedia(data: PublicBootstrapData) {
  const urls = new Set<string>();
  const sectionMedia = parseSectionMedia(data.settings.section_media);
  const heroBackground = sectionMedia.home?.backgroundUrl;
  if (heroBackground) urls.add(heroBackground);

  // Avoid competing with the hero/LCP request on constrained devices. Their
  // portfolio images remain lazy-loaded as the section approaches the screen.
  if (!shouldUseLitePerformanceMode()) {
    for (const item of data.portfolio.slice(0, 4)) {
      const first = getNormalizedGallery(item.image_urls)[0];
      const url = first?.compressed_url || first?.thumbnail_url || item.thumbnail_url;
      if (url) urls.add(url);
    }
  }
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
  const narrowLowCoreMobile = coarsePointer && window.innerWidth <= 480 && typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 6;
  return Boolean(reducedMotion || lowMemory || lowCpu || constrainedNetwork || narrowLowCoreMobile);
}

export default function PublicHome() {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bootstrap, setBootstrap] = useState<PublicBootstrapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = readCachedBootstrap();
    if (cached) {
      setSettings(cached.settings || {});
      setPortfolio(Array.isArray(cached.portfolio) ? cached.portfolio : []);
      setServices(Array.isArray(cached.services) ? cached.services : []);
      setBootstrap(cached);
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
        preloadCriticalMedia(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

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
  const { currentLang, defaultLang } = useLanguage();
  const [litePerformanceMode, setLitePerformanceMode] = useState(shouldUseLitePerformanceMode);
  const sectionMedia = parseSectionMedia(settings.section_media);
  const sectionBackgroundCss = Object.entries(sectionMedia)
    .filter(([, media]) => Boolean(media.backgroundUrl))
    .map(([id, media]) => {
      const safeId = id.replace(/[^a-z0-9_-]/gi, "");
      const safeUrl = encodeURI(String(media.backgroundUrl || ""))
        .replace(/["'()\\]/g, (character) => encodeURIComponent(character));
      const position = ["center", "top", "bottom", "left", "right"].includes(media.backgroundPosition || "")
        ? media.backgroundPosition
        : "center";
      const opacity = Math.min(0.9, Math.max(0, Number(media.overlayOpacity ?? 0.45)));
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
    
    const sections = document.querySelectorAll("section[id]");
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
    <CookieConsentProvider>
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
        <Header settings={settings} hasServices={services.length > 0} hasPortfolio={portfolio.length > 0} />
        <FloatingNav
          hasServices={services.length > 0}
          hasPortfolio={portfolio.length > 0}
          onOpenSocial={() => setIsSocialPopupOpen(true)}
        />
        <Hero settings={settings} />
        <Vision settings={settings} />
        <About settings={settings} />
        <Services settings={settings} initialServices={services} />
        <Portfolio items={portfolio} isPerformanceLite={litePerformanceMode} />
        <Pricing initialPlans={bootstrap?.pricing} initialExtras={bootstrap?.extraServices} initialFeeRules={bootstrap?.feeRules} />
        <Contact settings={settings} initialPlans={bootstrap?.pricing} initialExtras={bootstrap?.extraServices} initialFeeRules={bootstrap?.feeRules} />
        <FAQ settings={settings} initialFaqs={bootstrap?.faqs} initialCategories={bootstrap?.faqCategories} />
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
    </CookieConsentProvider>
  );
}
