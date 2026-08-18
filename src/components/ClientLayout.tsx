import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignOutAlt, faHome, faFolderOpen, faFileInvoiceDollar, faGift } from "@fortawesome/free-solid-svg-icons";
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

  return (
    <div className="aero-workspace aero-client-shell min-h-screen bg-background flex flex-col">
      <header className="aero-workspace-header bg-surface border-b border-border py-3.5 px-4 sm:px-6 sticky top-0 z-10 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-semibold tracking-tight text-text hidden sm:block">
            {tUi("client.nav.portal_title")}
          </h1>
          <nav className="flex items-center gap-2 text-sm font-medium">
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
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-text hidden md:inline-block">{user?.email}</span>
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
