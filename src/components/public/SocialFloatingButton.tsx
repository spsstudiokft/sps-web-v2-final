import React from "react";
import { Share2, X } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

interface SocialFloatingButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function SocialFloatingButton({ isOpen, onClick }: SocialFloatingButtonProps) {
  const { currentLang, defaultLang, tUi } = useLanguage();

  const tooltipText = tUi("social_popup.toggle_tooltip", currentLang, undefined, defaultLang) || "Social Channels";
  const ariaText = tUi("social_popup.toggle_aria", currentLang, undefined, defaultLang) || "Toggle Social Links Popup";

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-40 flex items-center gap-2 group">
      {/* Tooltip on Desktop hover */}
      <span className="hidden sm:inline-block px-3 py-1.5 rounded-full bg-surface/95 text-text text-xs font-semibold border border-border/80 shadow-lg backdrop-blur-md opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap">
        {tooltipText}
      </span>

      {/* Floating Toggle Button */}
      <button
        id="social-floating-toggle-btn"
        type="button"
        onClick={onClick}
        aria-label={ariaText}
        aria-expanded={isOpen}
        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl hover:shadow-2xl active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${
          isOpen
            ? "bg-surface text-text border border-border rotate-90 scale-100"
            : "bg-primary text-background hover:scale-105 hover:bg-primary/90"
        }`}
      >
        {/* Animated Pulse indicator dot when closed */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-background" />
          </span>
        )}

        {isOpen ? (
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        ) : (
          <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
        )}
      </button>
    </div>
  );
}
