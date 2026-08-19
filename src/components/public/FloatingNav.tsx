import { useState, useEffect } from "react";
import { tUi } from "../../lib/i18n";
import { useLanguage } from "../../contexts/LanguageContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faInfoCircle, 
  faConciergeBell, 
  faImage, 
  faTag,
  faEnvelope, 
  faQuestionCircle, 
  faShareNodes 
} from "@fortawesome/free-solid-svg-icons";
import { SocialPopup } from "./SocialPopup";

export function FloatingNav({
  onOpenSocial,
  hasServices = true,
  hasPortfolio = true,
  hasPricing = true,
  hasFaq = true,
}: {
  onOpenSocial?: () => void;
  hasServices?: boolean;
  hasPortfolio?: boolean;
  hasPricing?: boolean;
  hasFaq?: boolean;
}) {
  const [activeSection, setActiveSection] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [localSocialOpen, setLocalSocialOpen] = useState(false);
  const { currentLang, defaultLang } = useLanguage();

  const handleOpenSocial = () => {
    if (onOpenSocial) {
      onOpenSocial();
    } else {
      setLocalSocialOpen(true);
    }
  };

  useEffect(() => {
    const sections = [
      "about",
      ...(hasServices ? ["services"] : []),
      ...(hasPortfolio ? ["portfolio"] : []),
      ...(hasPricing ? ["pricing"] : []),
      "contact",
      ...(hasFaq ? ["faq"] : []),
    ];
    
    const handleScroll = () => {
      let current = "";
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
            current = section;
          }
        }
      }
      setActiveSection(current);
      setIsVisible(window.scrollY > window.innerHeight * 0.8);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasServices, hasPortfolio, hasPricing, hasFaq]);

  const navItems = [
    { id: "about", label: "About", icon: faInfoCircle },
    ...(hasServices ? [{ id: "services", label: "Services", icon: faConciergeBell }] : []),
    ...(hasPortfolio ? [{ id: "portfolio", label: "Portfolio", icon: faImage }] : []),
    ...(hasPricing ? [{ id: "pricing", label: "Pricing", icon: faTag }] : []),
    { id: "contact", label: "Contact", icon: faEnvelope },
    ...(hasFaq ? [{ id: "faq", label: "FAQ", icon: faQuestionCircle }] : []),
  ];

  return (
    <>
      <nav className={`fixed left-2 md:left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 md:gap-3 bg-background supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-lg p-2 md:p-3 rounded-full border border-border shadow-lg transition-all duration-300 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full pointer-events-none"}`}>
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`group relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activeSection === item.id 
                ? "bg-primary text-background shadow-md scale-110" 
                : "text-muted-text hover:bg-surface hover:text-text"
            }`}
            aria-label={tUi(item.label, currentLang, undefined, defaultLang) || item.label}
          >
            <FontAwesomeIcon icon={item.icon} className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="absolute left-12 md:left-14 px-3 py-1.5 bg-primary text-background text-xs md:text-sm font-medium rounded-md opacity-0 -translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-300 whitespace-nowrap">
              {tUi(item.label, currentLang, undefined, defaultLang) || item.label}
            </span>
          </a>
        ))}

        {/* Social Popup Trigger */}
        <button
          type="button"
          onClick={handleOpenSocial}
          className="group relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary text-primary hover:bg-surface"
          title={tUi("social_popup.toggle_tooltip", currentLang, undefined, defaultLang) || "Social Channels"}
          aria-label={tUi("social_popup.toggle_aria", currentLang, undefined, defaultLang) || "Social Links"}
        >
          <FontAwesomeIcon icon={faShareNodes} className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="absolute left-12 md:left-14 px-3 py-1.5 bg-primary text-background text-xs md:text-sm font-medium rounded-md opacity-0 -translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-300 whitespace-nowrap">
            {tUi("social_popup.title", currentLang, undefined, defaultLang) || "Social Channels"}
          </span>
        </button>
      </nav>

      {!onOpenSocial && (
        <SocialPopup
          isOpen={localSocialOpen}
          onClose={() => setLocalSocialOpen(false)}
        />
      )}
    </>
  );
}
