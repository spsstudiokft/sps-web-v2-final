import { useState, useEffect } from "react";
import { SiteSettings, PortfolioItem, Service } from "../lib/types";
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

export default function PublicHome() {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/public/settings").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch("/api/public/portfolio").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/public/services").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([s, p, serviceItems]) => {
        setSettings(s);
        setPortfolio(Array.isArray(p) ? p : []);
        setServices(Array.isArray(serviceItems) ? serviceItems : []);
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
      <PublicHomeContent settings={settings} portfolio={portfolio} services={services} loading={loading} />
    </LanguageProvider>
  );
}

function PublicHomeContent({ settings, portfolio, services, loading }: { settings: SiteSettings, portfolio: PortfolioItem[], services: Service[], loading: boolean }) {
  const [activeSection, setActiveSection] = useState("Home");
  const [isSocialPopupOpen, setIsSocialPopupOpen] = useState(false);
  const { currentLang, defaultLang } = useLanguage();

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

  return (
    <CookieConsentProvider>
      <div
        className="aero-site font-sans antialiased bg-background text-text transition-colors duration-300 relative overflow-hidden"
        data-ambient={activeSectionKey}
      >
      <div className="aero-ambient-blur" aria-hidden="true">
        <span className="aero-blur-spot aero-blur-left-top" />
        <span className="aero-blur-spot aero-blur-left-bottom" />
        <span className="aero-blur-spot aero-blur-right-top" />
        <span className="aero-blur-spot aero-blur-right-bottom" />
      </div>

      <div className="relative z-10">
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
        <Portfolio items={portfolio} />
        <Pricing />
        <Contact settings={settings} />
        <FAQ settings={settings} />
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
    </CookieConsentProvider>
  );
}
