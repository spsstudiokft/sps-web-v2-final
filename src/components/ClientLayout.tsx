import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignOutAlt, faHome, faFolderOpen, faFileInvoiceDollar, faGift, faGear, faBuilding } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Button } from "./ui/Button";

export default function ClientLayout() {
  const { logout, user } = useAuth();
  const { tUi } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isHomeActive = location.pathname === "/client";
  const isProjectsActive = location.pathname === "/client/projects" || location.pathname.startsWith("/client/projects/");
  const isInvoicesActive = location.pathname === "/client/invoices" || location.pathname.startsWith("/client/invoices/");
  const isReferralsActive = location.pathname === "/client/referrals" || location.pathname.startsWith("/client/referrals/");
  const isPropertyListingsActive = location.pathname.startsWith("/client/property-listings");
  const isSettingsActive = location.pathname === "/client/settings";

  return (
    <div className="aero-workspace aero-client-shell min-h-screen bg-background flex flex-col">
      <header className="aero-workspace-header bg-surface border-b border-border py-3.5 px-4 sm:px-6 sticky top-0 z-10 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-semibold tracking-tight text-text hidden sm:block">
            {tUi("client.nav.portal_title")}
          </h1>
          <nav className="flex max-w-[calc(100vw-7rem)] items-center gap-2 overflow-x-auto text-sm font-medium sm:max-w-none">
            <Link 
              to="/client" 
              aria-current={isHomeActive ? "page" : undefined}
              className={`aero-client-nav-item px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                isHomeActive 
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                  : "text-muted-text hover:text-text hover:bg-surface"
              }`}
            >
              <FontAwesomeIcon icon={faHome} /> <span>{tUi("client.nav.dashboard")}</span>
            </Link>
            <Link 
              to="/client/projects" 
              aria-current={isProjectsActive ? "page" : undefined}
              className={`aero-client-nav-item px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                isProjectsActive 
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                  : "text-muted-text hover:text-text hover:bg-surface"
              }`}
            >
              <FontAwesomeIcon icon={faFolderOpen} /> <span>{tUi("client.nav.projects")}</span>
            </Link>
            <Link 
              to="/client/invoices" 
              aria-current={isInvoicesActive ? "page" : undefined}
              className={`aero-client-nav-item px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                isInvoicesActive 
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                  : "text-muted-text hover:text-text hover:bg-surface"
              }`}
            >
              <FontAwesomeIcon icon={faFileInvoiceDollar} /> <span>{tUi("client.nav.invoices")}</span>
            </Link>
            <Link 
              to="/client/referrals" 
              aria-current={isReferralsActive ? "page" : undefined}
              className={`aero-client-nav-item px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                isReferralsActive 
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                  : "text-muted-text hover:text-text hover:bg-surface"
              }`}
            >
              <FontAwesomeIcon icon={faGift} className="text-amber-500" /> 
              <span>{tUi("client.nav.rewards")}</span>
            </Link>
            <Link
              to="/client/property-listings"
              aria-current={isPropertyListingsActive ? "page" : undefined}
              className={`aero-client-nav-item px-3 py-1.5 rounded-lg flex shrink-0 items-center gap-2 ${isPropertyListingsActive ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "text-muted-text hover:text-text hover:bg-surface"}`}
            >
              <FontAwesomeIcon icon={faBuilding} /> <span>{tUi("client.nav.property_listings")}</span>
            </Link>
            <Link
              to="/client/settings"
              aria-current={isSettingsActive ? "page" : undefined}
              className={`aero-client-nav-item px-3 py-1.5 rounded-lg flex shrink-0 items-center gap-2 ${isSettingsActive ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "text-muted-text hover:text-text hover:bg-surface"}`}
            >
              <FontAwesomeIcon icon={faGear} /> <span>{tUi("client.nav.settings")}</span>
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-text hidden md:inline-block">{user?.name || user?.email}</span>
          <Button variant="secondary" size="sm" onClick={handleLogout} className="flex items-center gap-2">
            <FontAwesomeIcon icon={faSignOutAlt} />
            <span className="hidden sm:inline">{tUi("client.nav.logout")}</span>
          </Button>
        </div>
      </header>
      <main className="aero-workspace-content flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
