import { Outlet, Link, useLocation } from "react-router-dom";
import { Sidebar } from "./admin/Sidebar";
import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";
import { useLanguage } from "../contexts/LanguageContext";
import { Menu, Globe } from "lucide-react";

export default function AdminLayout() {
  const { tUi } = useLanguage();
  const { fetchApi } = useApi();
  const location = useLocation();
  const [verifying, setVerifying] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    fetchApi("/api/admin/verify")
      .then(() => setVerifying(false))
      .catch(() => setVerifying(false));
  }, [fetchApi]);

  // Close mobile drawer whenever location changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  if (verifying) {
    return (
      <div className="flex bg-background h-[100dvh] items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="aero-workspace aero-admin-shell flex flex-col md:flex-row bg-background h-[100dvh] overflow-hidden">
      {/* Mobile Top App Bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-background border-b border-border shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="p-2 -ml-1 rounded-xl text-text hover:bg-surface border border-border/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Open Navigation Menu"
            aria-expanded={isMobileOpen}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs">
              SP
            </div>
            <span className="font-bold text-sm text-text">{tUi("admin.nav.studio_admin")}</span>
          </Link>
        </div>

        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-xl text-muted-text hover:text-text hover:bg-surface border border-border/80 transition-colors text-xs flex items-center gap-1.5"
          title={tUi("admin.nav.view_site")}
        >
          <Globe className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="hidden xs:inline text-xs font-medium">{tUi("admin.nav.live_site")}</span>
        </Link>
      </header>

      {/* Sidebar Component with responsive desktop and mobile drawer support */}
      <Sidebar 
        isMobileOpen={isMobileOpen} 
        onMobileClose={() => setIsMobileOpen(false)} 
      />

      {/* Main App Content Viewport */}
      <main className="aero-workspace-main flex-1 overflow-auto text-text">
        <Outlet />
      </main>
    </div>
  );
}
