import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { SiteSettings } from "../../lib/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark, faHouse, faUser } from "@fortawesome/free-solid-svg-icons";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeToggle } from "../common/ThemeToggle";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../ThemeProvider";
import { tUi, t } from "../../lib/i18n";
import { InfoBar } from "./InfoBar";

function UserDropdown({ token, logout, currentLang }: { token: string | null, logout: () => void, currentLang: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center text-muted-text hover:bg-surface hover:text-text rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none transition-colors"
        aria-expanded={open}
        aria-label="User account menu"
      >
        <FontAwesomeIcon icon={faUser} className="w-5 h-5 md:w-4 md:h-4" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-xl shadow-xl py-2 z-50 overflow-hidden origin-top-right">
          {token ? (
            <>
              {user?.role === "client" ? (
                <Link to="/client" className="block px-4 py-2.5 text-sm text-text hover:bg-surface hover:text-primary outline-none focus-visible:bg-surface transition-colors" onClick={() => setOpen(false)}>{tUi("Client Portal", currentLang) || "Client Portal"}</Link>
              ) : (
                <Link to="/admin" className="block px-4 py-2.5 text-sm text-text hover:bg-surface hover:text-primary outline-none focus-visible:bg-surface transition-colors" onClick={() => setOpen(false)}>{tUi("Admin Panel", currentLang) || "Admin Panel"}</Link>
              )}
              <button onClick={() => { logout(); setOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-text hover:bg-surface hover:text-primary outline-none focus-visible:bg-surface transition-colors">{tUi("Sign Out", currentLang) || "Sign Out"}</button>
            </>
          ) : (
            <>
              <Link
                to="/client/login"
                className="block px-4 py-2.5 text-sm text-text hover:bg-surface hover:text-primary outline-none focus-visible:bg-surface transition-colors"
                onClick={() => setOpen(false)}
              >
                {tUi("auth.client_login.title", currentLang) || "Client Login"}
              </Link>
              <div className="mx-3 border-t border-border/70" />
              <Link
                to="/admin/login"
                className="block px-4 py-2.5 text-sm text-text hover:bg-surface hover:text-primary outline-none focus-visible:bg-surface transition-colors"
                onClick={() => setOpen(false)}
              >
                {tUi("auth.admin_login.title", currentLang) || "Admin Login"}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Header({ settings, hasServices = true, hasPortfolio = true, hasPricing = true, hasFaq = true }: { settings: SiteSettings; hasServices?: boolean; hasPortfolio?: boolean; hasPricing?: boolean; hasFaq?: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [activeSection, setActiveSection] = useState("");
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const { currentLang, defaultLang } = useLanguage();
  const { token, logout } = useAuth();
  const { mode } = useTheme();
  const location = useLocation();
  const lastScrollY = useRef(0);
  const isHeroInViewRef = useRef(true);

  // Determine active logo based on light/dark mode with graceful fallbacks
  const activeLogo = mode === "dark"
    ? (settings.logo_header_dark || settings.logo_header_light)
    : (settings.logo_header_light || settings.logo_header_dark);

  const studioNameText = t(settings.studio_name, currentLang, defaultLang) || "SPS Studio";
  const altText = settings.logo_alt_text || studioNameText;
  const brandDisplay = settings.header_brand_display || "logo_only";
  const showLogo = brandDisplay !== "name_only" && Boolean(activeLogo) && !logoLoadFailed;
  const showStudioName = brandDisplay === "name_only" || brandDisplay === "logo_and_name" || !showLogo;
  const showProperties = settings.property_menu_enabled !== "0" && settings.property_menu_enabled !== "false";
  const isStandalonePage = location.pathname !== "/";
  const sectionHref = (section: string) => isStandalonePage ? `/#${section}` : `#${section}`;

  // Reset logo load failure if logo URL changes
  useEffect(() => {
    setLogoLoadFailed(false);
  }, [activeLogo]);

  useEffect(() => {
    let ticking = false;

    const checkVisibility = () => {
      const currentScrollY = Math.max(0, window.scrollY);
      const isDesktopViewport = window.matchMedia("(min-width: 768px)").matches;
      const heroElement = document.getElementById("home");
      
      let isHeroInView = false;
      if (heroElement) {
        const rect = heroElement.getBoundingClientRect();
        // Hero is considered in view if its bottom edge is still comfortably visible, or near page top
        isHeroInView = rect.bottom > 80 || currentScrollY <= 50;
      } else {
        isHeroInView = currentScrollY < window.innerHeight * 0.6;
      }

      isHeroInViewRef.current = isHeroInView;

      if (!isDesktopViewport) {
        // Mobile navigation must remain reliably accessible regardless of
        // scroll direction. Desktop keeps the existing auto-hide behaviour.
        setIsVisible(true);
      } else if (isHeroInView) {
        // Always show the navbar when viewing the hero section (at or near top)
        setIsVisible(true);
      } else {
        // Scrolled past the hero section:
        // Apply scroll-direction awareness with a threshold to prevent micro-jitter/flicker
        const scrollDelta = currentScrollY - lastScrollY.current;
        const SCROLL_THRESHOLD = 6;

        if (scrollDelta > SCROLL_THRESHOLD) {
          // Scrolling down past hero -> Hide navbar
          setIsVisible(false);
          setMobileMenuOpen(false);
        } else if (scrollDelta < -SCROLL_THRESHOLD) {
          // Scrolling up in non-hero sections -> Show navbar
          setIsVisible(true);
        }
      }

      // Scroll-spy active section tracking
      const sections = [
        "about",
        ...(hasServices ? ["services"] : []),
        ...(hasPortfolio ? ["portfolio"] : []),
        ...(hasPricing ? ["pricing"] : []),
        "contact",
        ...(hasFaq ? ["faq"] : []),
      ];
      let currentSec = "";
      for (const sec of sections) {
        const el = document.getElementById(sec);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
            currentSec = sec;
          }
        }
      }
      setActiveSection(currentSec);

      lastScrollY.current = currentScrollY;
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(checkVisibility);
        ticking = true;
      }
    };

    // Run initial check
    checkVisibility();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [hasServices, hasPortfolio, hasPricing, hasFaq]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className={`aero-header fixed w-full top-0 px-4 pt-4 md:pt-6 z-50 transition-transform duration-300 ${isVisible ? "translate-y-0" : "-translate-y-full"} pointer-events-none`}>
      <div className="aero-nav max-w-7xl mx-auto pointer-events-auto h-16 md:h-20 px-4 md:px-6 flex items-center justify-between">
        <Link
          to="/"
          onClick={(event) => { if (!isStandalonePage) { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); } }}
          className="flex items-center gap-2.5 hover:opacity-85 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg py-1 px-1 cursor-pointer"
          aria-label={studioNameText}
        >
          {showLogo && (
            <img 
              src={activeLogo} 
              alt={altText}
              className="h-8 md:h-10 max-w-[180px] md:max-w-[240px] w-auto object-contain transition-all duration-200"
              onError={() => setLogoLoadFailed(true)}
            />
          )}
          {showStudioName && (
            <span className="font-bold tracking-tight text-base sm:text-xl text-text whitespace-nowrap">{studioNameText}</span>
          )}
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-6 lg:gap-8 text-sm font-medium items-center">
          <a 
            href={sectionHref("about")}
            className={`transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-sm outline-none px-1 py-0.5 ${
              activeSection === "about" ? "text-primary font-bold" : "text-text/90 hover:text-text"
            }`}
          >
            {tUi("About", currentLang, undefined, defaultLang) || "About"}
          </a>
          {hasServices && <a 
            href={sectionHref("services")}
            className={`transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-sm outline-none px-1 py-0.5 ${
              activeSection === "services" ? "text-primary font-bold" : "text-text/90 hover:text-text"
            }`}
          >
            {tUi("Services", currentLang, undefined, defaultLang) || "Services"}
          </a>}
          {hasPortfolio && <a 
            href={sectionHref("portfolio")}
            className={`transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-sm outline-none px-1 py-0.5 ${
              activeSection === "portfolio" ? "text-primary font-bold" : "text-text/90 hover:text-text"
            }`}
          >
            {tUi("Portfolio", currentLang, undefined, defaultLang) || "Portfolio"}
          </a>}
          {hasPricing && <a 
            href={sectionHref("pricing")}
            className={`transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-sm outline-none px-1 py-0.5 ${
              activeSection === "pricing" ? "text-primary font-bold" : "text-text/90 hover:text-text"
            }`}
          >
            {tUi("Pricing", currentLang, undefined, defaultLang) || "Pricing"}
          </a>}
          <a 
            href={sectionHref("contact")}
            className={`transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-sm outline-none px-1 py-0.5 ${
              activeSection === "contact" ? "text-primary font-bold" : "text-text/90 hover:text-text"
            }`}
          >
            {tUi("Contact", currentLang, undefined, defaultLang) || "Contact"}
          </a>
          {hasFaq && <a 
            href={sectionHref("faq")}
            className={`transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-sm outline-none px-1 py-0.5 ${
              activeSection === "faq" ? "text-primary font-bold" : "text-text/90 hover:text-text"
            }`}
          >
            {tUi("FAQ", currentLang, undefined, defaultLang) || "FAQ"}
          </a>}

          {showProperties && <Link to="/properties" className="flex items-center gap-2 text-text/90 hover:text-primary transition-colors px-1 py-0.5">
            <FontAwesomeIcon icon={faHouse} aria-hidden="true" />
            <span>{tUi("Properties", currentLang, undefined, defaultLang) || "Properties"}</span>
          </Link>}
          
          <LanguageSelector />
          
          <ThemeToggle id="navbar-theme-toggle-desktop" />

          <UserDropdown token={token} logout={logout} currentLang={currentLang} />
          
          <a href={sectionHref("contact")} className="bg-primary text-background px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none font-semibold shadow-sm flex items-center gap-2">
            {tUi("Make an Inquiry", currentLang, undefined, defaultLang) || "Book Studio"}
          </a>
        </nav>

        {/* Mobile menu button & selector */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle id="navbar-theme-toggle-mobile" size="md" />

          <LanguageSelector />
          
          <UserDropdown token={token} logout={logout} currentLang={currentLang} />

          <button 
            className="w-10 h-10 flex items-center justify-center text-muted-text hover:bg-surface rounded-full focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <FontAwesomeIcon icon={mobileMenuOpen ? faXmark : faBars} className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Multi-Category Configurable Announcement Info Bar */}
      <div className="max-w-7xl mx-auto w-full">
        <InfoBar />
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-[calc(100%+0.5rem)] left-4 right-4 bg-background supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-lg border border-border shadow-xl rounded-2xl py-4 px-6 flex flex-col gap-4 pointer-events-auto">
          <div className="flex flex-col gap-4">
            <a 
              href={sectionHref("about")}
              onClick={closeMenu} 
              className={`text-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-sm outline-none w-fit ${
                activeSection === "about" ? "text-primary font-semibold" : "text-text hover:opacity-80"
              }`}
            >
              {tUi("About", currentLang, undefined, defaultLang) || "About"}
            </a>
            {hasServices && <a 
              href={sectionHref("services")}
              onClick={closeMenu} 
              className={`text-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-sm outline-none w-fit ${
                activeSection === "services" ? "text-primary font-semibold" : "text-text hover:opacity-80"
              }`}
            >
              {tUi("Services", currentLang, undefined, defaultLang) || "Services"}
            </a>}
            {hasPortfolio && <a 
              href={sectionHref("portfolio")}
              onClick={closeMenu} 
              className={`text-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-sm outline-none w-fit ${
                activeSection === "portfolio" ? "text-primary font-semibold" : "text-text hover:opacity-80"
              }`}
            >
              {tUi("Portfolio", currentLang, undefined, defaultLang) || "Portfolio"}
            </a>}
            {hasPricing && <a 
              href={sectionHref("pricing")}
              onClick={closeMenu} 
              className={`text-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-sm outline-none w-fit ${
                activeSection === "pricing" ? "text-primary font-semibold" : "text-text hover:opacity-80"
              }`}
            >
              {tUi("Pricing", currentLang, undefined, defaultLang) || "Pricing"}
            </a>}
            <a 
              href={sectionHref("contact")}
              onClick={closeMenu} 
              className={`text-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-sm outline-none w-fit ${
                activeSection === "contact" ? "text-primary font-semibold" : "text-text hover:opacity-80"
              }`}
            >
              {tUi("Contact", currentLang, undefined, defaultLang) || "Contact"}
            </a>
            {hasFaq && <a 
              href={sectionHref("faq")}
              onClick={closeMenu} 
              className={`text-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-sm outline-none w-fit ${
                activeSection === "faq" ? "text-primary font-semibold" : "text-text hover:opacity-80"
              }`}
            >
              {tUi("FAQ", currentLang, undefined, defaultLang) || "FAQ"}
            </a>}

            <div className="pt-4 mt-2 border-t border-border flex flex-col gap-3">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-muted-text">
                  {tUi("admin.settings.section_theme_palette", currentLang, undefined, defaultLang) || "Theme"}
                </span>
                <ThemeToggle id="mobile-drawer-theme-toggle" size="md" />
              </div>

              {showProperties && <Link to="/properties" onClick={closeMenu} className="flex items-center gap-3 text-lg font-medium text-text hover:text-primary w-fit">
                <FontAwesomeIcon icon={faHouse} aria-hidden="true" className="w-5 h-5" />
                <span>{tUi("Properties", currentLang, undefined, defaultLang) || "Properties"}</span>
              </Link>}
              <a href={sectionHref("contact")} onClick={closeMenu} className="bg-primary text-background px-5 py-3 rounded-full hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none font-semibold shadow-sm flex items-center justify-center gap-2 mt-2">
                {tUi("Make an Inquiry", currentLang, undefined, defaultLang) || "Make an Inquiry"}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
