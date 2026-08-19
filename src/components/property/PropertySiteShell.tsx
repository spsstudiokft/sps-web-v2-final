import { ReactNode, useEffect, useState } from "react";
import { SiteSettings } from "../../lib/types";
import { LanguageProvider } from "../../contexts/LanguageContext";
import { Header } from "../public/Header";
import { Footer } from "../public/Footer";

export function PropertySiteShell({ children, settings: suppliedSettings }: { children: ReactNode; settings?: SiteSettings }) {
  const [loadedSettings, setLoadedSettings] = useState<SiteSettings>(suppliedSettings || {});
  const [loading, setLoading] = useState(!suppliedSettings);

  useEffect(() => {
    if (suppliedSettings) {
      setLoadedSettings(suppliedSettings);
      setLoading(false);
      return;
    }
    fetch("/api/public/settings", { headers: { Accept: "application/json" } })
      .then(response => response.ok ? response.json() : {})
      .then(settings => setLoadedSettings(settings || {}))
      .catch(() => setLoadedSettings({}))
      .finally(() => setLoading(false));
  }, [suppliedSettings]);

  if (loading) return <div className="min-h-screen bg-background"><div className="fixed inset-x-4 top-4 mx-auto h-16 max-w-7xl animate-pulse rounded-2xl border border-border bg-surface md:top-6 md:h-20" /></div>;

  return <LanguageProvider settings={loadedSettings}>
    <div className="aero-site min-h-screen overflow-hidden bg-background font-sans text-text transition-colors duration-300">
      <div className="aero-ambient-blur" aria-hidden="true"><span className="aero-blur-spot aero-blur-left-top" /><span className="aero-blur-spot aero-blur-left-bottom" /><span className="aero-blur-spot aero-blur-right-top" /><span className="aero-blur-spot aero-blur-right-bottom" /></div>
      <div className="relative z-10">
        <Header settings={loadedSettings} hasServices hasPortfolio hasPricing hasFaq />
        {children}
        <Footer settings={loadedSettings} />
      </div>
    </div>
  </LanguageProvider>;
}
