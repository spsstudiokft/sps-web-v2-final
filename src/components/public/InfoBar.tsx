import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, X, ArrowRight, ExternalLink, Pause, Play } from "lucide-react";
import { InfoBarMessage, InfoBarSettings } from "../../lib/types";
import { CategoryIcon } from "../common/CategoryIcon";
import { useLanguage } from "../../contexts/LanguageContext";
import { t } from "../../lib/i18n";

const SESSION_DISMISSED_KEY = "sps_dismissed_infobar_session";
const PERMANENT_DISMISSED_KEY = "sps_dismissed_infobar_permanent";

interface InfoBarProps {
  className?: string;
}

export function InfoBar({ className = "" }: InfoBarProps) {
  const [messages, setMessages] = useState<InfoBarMessage[]>([]);
  const [settings, setSettings] = useState<InfoBarSettings>({
    info_bar_enabled: true,
    info_bar_rotation_interval: 7,
    info_bar_pause_on_hover: true,
    info_bar_show_indicators: true,
    info_bar_animation: "slide"
  });
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentLang, defaultLang } = useLanguage();

  // Load dismissed IDs from storage on mount
  useEffect(() => {
    try {
      const sessionDismissed: string[] = JSON.parse(sessionStorage.getItem(SESSION_DISMISSED_KEY) || "[]");
      const permDismissed: string[] = JSON.parse(localStorage.getItem(PERMANENT_DISMISSED_KEY) || "[]");
      setDismissedIds(Array.from(new Set([...sessionDismissed, ...permDismissed])));
    } catch {
      setDismissedIds([]);
    }
  }, []);

  // Fetch info bar data from server
  useEffect(() => {
    let isMounted = true;
    fetch("/api/public/info-bar")
      .then(res => res.ok ? res.json() : { settings: { info_bar_enabled: false }, messages: [] })
      .then(data => {
        if (!isMounted) return;
        if (data.settings) {
          setSettings(data.settings);
        }
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load info bar:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter out dismissed messages
  const activeMessages = useMemo(() => {
    return messages.filter(m => !dismissedIds.includes(m.id));
  }, [messages, dismissedIds]);

  // Handle safe index bounds if messages change
  useEffect(() => {
    if (currentIndex >= activeMessages.length) {
      setCurrentIndex(Math.max(0, activeMessages.length - 1));
    }
  }, [activeMessages.length, currentIndex]);

  // Next / Previous Navigation
  const goToNext = useCallback(() => {
    if (activeMessages.length <= 1) return;
    setDirection(1);
    setCurrentIndex(prev => (prev + 1) % activeMessages.length);
  }, [activeMessages.length]);

  const goToPrev = useCallback(() => {
    if (activeMessages.length <= 1) return;
    setDirection(-1);
    setCurrentIndex(prev => (prev - 1 + activeMessages.length) % activeMessages.length);
  }, [activeMessages.length]);

  // Automatic Rotation Timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      !settings.info_bar_enabled ||
      activeMessages.length <= 1 ||
      isPaused ||
      loading
    ) {
      return;
    }

    const intervalMs = Math.max(3, settings.info_bar_rotation_interval || 7) * 1000;
    timerRef.current = setInterval(() => {
      goToNext();
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [settings.info_bar_enabled, settings.info_bar_rotation_interval, activeMessages.length, isPaused, loading, goToNext]);

  // The public bar is a single rotating surface, not a stack: dismissing it hides every active announcement.
  const handleDismiss = () => {
    try {
      const sessionIds = activeMessages.filter((message) => (message.dismiss_scope || "session") !== "permanent").map((message) => message.id);
      const permanentIds = activeMessages.filter((message) => message.dismiss_scope === "permanent").map((message) => message.id);
      const existingSession: string[] = JSON.parse(sessionStorage.getItem(SESSION_DISMISSED_KEY) || "[]");
      const existingPermanent: string[] = JSON.parse(localStorage.getItem(PERMANENT_DISMISSED_KEY) || "[]");
      if (sessionIds.length) sessionStorage.setItem(SESSION_DISMISSED_KEY, JSON.stringify(Array.from(new Set([...existingSession, ...sessionIds]))));
      if (permanentIds.length) localStorage.setItem(PERMANENT_DISMISSED_KEY, JSON.stringify(Array.from(new Set([...existingPermanent, ...permanentIds]))));
    } catch {
      // The in-memory dismissal below still hides the bar when storage is unavailable.
    }

    setDismissedIds((previous) => Array.from(new Set([...previous, ...activeMessages.map((message) => message.id)])));
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      goToNext();
    } else if (e.key === "ArrowLeft") {
      goToPrev();
    }
  };

  // Do not render anything if loading, disabled, or no active messages
  if (loading || !settings.info_bar_enabled || activeMessages.length === 0) {
    return null;
  }

  const currentMessage = activeMessages[currentIndex];
  if (!currentMessage) return null;

  const bgColor = currentMessage.category_bg_color || "#0284c7";
  const textColor = currentMessage.category_text_color || "#ffffff";
  const categoryLabel = currentMessage.category_label || currentMessage.category_name || "Announcement";
  const badgeText = currentMessage.badge_text || "";
  const icon = currentMessage.category_icon || "info";

  // Localized text or direct text
  const messageText = t(currentMessage.text, currentLang, defaultLang) || currentMessage.text;
  const linkLabel = currentMessage.link_label ? (t(currentMessage.link_label, currentLang, defaultLang) || currentMessage.link_label) : "Learn More";

  // Animation variants
  const isFade = settings.info_bar_animation === "fade";
  const slideVariants = {
    initial: (dir: number) => ({
      opacity: 0,
      x: isFade ? 0 : dir > 0 ? 30 : -30,
      scale: isFade ? 0.98 : 1
    }),
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1]
      }
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: isFade ? 0 : dir > 0 ? -30 : 30,
      scale: isFade ? 0.98 : 1,
      transition: {
        duration: 0.25,
        ease: "easeInOut"
      }
    })
  };

  return (
    <div
      ref={containerRef}
      id="public-info-bar"
      role="region"
      aria-label="Announcements and Promotions"
      onKeyDown={handleKeyDown}
      onMouseEnter={() => {
        if (settings.info_bar_pause_on_hover) setIsPaused(true);
      }}
      onMouseLeave={() => {
        if (settings.info_bar_pause_on_hover) setIsPaused(false);
      }}
      onFocus={() => {
        if (settings.info_bar_pause_on_hover) setIsPaused(true);
      }}
      onBlur={() => {
        if (settings.info_bar_pause_on_hover) setIsPaused(false);
      }}
      style={{
        "--infobar-accent": bgColor,
        "--infobar-category-text": textColor
      } as React.CSSProperties}
      className={`cinematic-infobar relative w-full overflow-hidden transition-colors duration-500 rounded-2xl md:rounded-full pointer-events-auto mt-2 md:mt-2.5 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2.5 min-h-[44px]">
        {/* Navigation Previous Button (if multiple messages) */}
        {activeMessages.length > 1 && (
          <button
            onClick={goToPrev}
            aria-label="Previous announcement"
            className="cinematic-infobar-control shrink-0 w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center active:scale-95 transition-all text-current opacity-85 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Message Content Area with Animated Transition */}
        <div className="flex-1 min-w-0 flex items-center justify-center overflow-hidden py-0.5" aria-live="polite">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentMessage.id}
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ color: textColor }}
              className="flex flex-wrap items-center justify-center text-center gap-x-2.5 gap-y-1.5 text-xs sm:text-sm font-medium w-full"
            >
              {/* Category Icon & Badge */}
              <div className="inline-flex items-center gap-1.5 shrink-0">
                <span className="cinematic-infobar-icon p-1 rounded-md backdrop-blur-xs flex items-center justify-center shadow-xs">
                  <CategoryIcon icon={icon} className="w-3.5 h-3.5" />
                </span>

                {badgeText ? (
                  <span className="cinematic-infobar-badge px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-xs">
                    {badgeText}
                  </span>
                ) : (
                  <span className="cinematic-infobar-badge px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide">
                    {categoryLabel}
                  </span>
                )}
              </div>

              {/* Text Message */}
              <span className="leading-snug tracking-tight font-medium max-w-2xl break-words">
                {messageText}
              </span>

              {/* Call to Action Link */}
              {currentMessage.link_url && (
                <a
                  href={currentMessage.link_url}
                  target={currentMessage.link_target_blank ? "_blank" : undefined}
                  rel={currentMessage.link_target_blank ? "noopener noreferrer" : undefined}
                  className="cinematic-infobar-cta inline-flex items-center gap-1 font-bold text-xs sm:text-xs uppercase tracking-wider py-0.5 px-2.5 rounded-full active:scale-95 transition-all shadow-xs shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <span>{linkLabel}</span>
                  {currentMessage.link_target_blank ? (
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  ) : (
                    <ArrowRight className="w-3 h-3 ml-0.5" />
                  )}
                </a>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Controls: Pause/Play, Indicator counter/dots, Navigation Next, and Dismiss (X) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Multi-message indicator & play/pause toggle */}
          {activeMessages.length > 1 && settings.info_bar_show_indicators && (
            <div className="cinematic-infobar-control hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-tight">
              <span>
                {currentIndex + 1}/{activeMessages.length}
              </span>
              <button
                onClick={() => setIsPaused(prev => !prev)}
                title={isPaused ? "Play rotation" : "Pause rotation"}
                aria-label={isPaused ? "Play auto rotation" : "Pause auto rotation"}
                className="hover:opacity-100 opacity-75 transition-opacity focus-visible:outline-none"
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              </button>
            </div>
          )}

          {/* Navigation Next Button (if multiple messages) */}
          {activeMessages.length > 1 && (
            <button
              onClick={goToNext}
              aria-label="Next announcement"
              className="cinematic-infobar-control shrink-0 w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center active:scale-95 transition-all text-current opacity-85 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Dismiss Button */}
          {Boolean(currentMessage.is_dismissible) && (
            <button
              onClick={handleDismiss}
              title="Dismiss notice"
              aria-label="Dismiss this announcement"
              className="cinematic-infobar-control shrink-0 w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center active:scale-95 transition-all text-current opacity-80 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ml-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
