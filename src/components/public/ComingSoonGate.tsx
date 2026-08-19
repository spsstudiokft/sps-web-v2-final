import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { SiteSettings } from "../../lib/types";
import { ComingSoonPage } from "./ComingSoonPage";

export function ComingSoonGate() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/public/coming-soon-config", { cache: "no-store", headers: { "Cache-Control": "no-cache" } })
      .then(response => response.ok ? response.json() : {})
      .then(data => { if (active) setSettings(data || {}); })
      .catch(() => { if (active) setSettings({}); });
    return () => { active = false; };
  }, []);

  if (settings === null) return <div className="min-h-screen bg-background" aria-busy="true" />;
  const enabled = settings.coming_soon_enabled === "1" || settings.coming_soon_enabled === "true";
  return enabled ? <ComingSoonPage settings={settings} /> : <Outlet />;
}
