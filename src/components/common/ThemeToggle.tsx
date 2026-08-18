import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../ThemeProvider";
import { useLanguage } from "../../contexts/LanguageContext";
import { tUi } from "../../lib/i18n";
import { motion, AnimatePresence } from "motion/react";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  id?: string;
}

export function ThemeToggle({
  className = "",
  showLabel = false,
  size = "md",
  id = "navbar-theme-toggle"
}: ThemeToggleProps) {
  const { mode, toggleTheme } = useTheme();
  const { currentLang, defaultLang } = useLanguage();

  const isDark = mode === "dark";
  const nextModeLabel = isDark
    ? (tUi("theme.switch_to_light", currentLang, undefined, defaultLang) || "Switch to light mode")
    : (tUi("theme.switch_to_dark", currentLang, undefined, defaultLang) || "Switch to dark mode");

  const currentModeLabel = isDark
    ? (tUi("admin.nav.dark_mode", currentLang, undefined, defaultLang) || "Dark Mode")
    : (tUi("admin.nav.light_mode", currentLang, undefined, defaultLang) || "Light Mode");

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10 md:w-8 md:h-8",
    lg: "w-10 h-10"
  }[size];

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4 md:w-4 md:h-4",
    lg: "w-5 h-5"
  }[size];

  return (
    <button
      id={id}
      type="button"
      onClick={toggleTheme}
      className={`relative flex items-center justify-center ${showLabel ? "px-3 py-2 w-full justify-start gap-3 rounded-xl" : `${sizeClasses} rounded-full`} text-muted-text hover:bg-surface hover:text-text focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none transition-all duration-200 group ${className}`}
      title={nextModeLabel}
      aria-label={nextModeLabel}
      aria-pressed={isDark}
    >
      <div className="relative flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="sun"
              initial={{ rotate: -90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center text-amber-400 group-hover:text-amber-300"
            >
              <Sun className={`${iconSizes} transition-transform group-hover:rotate-45`} aria-hidden="true" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: 90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:text-primary"
            >
              <Moon className={`${iconSizes} transition-transform group-hover:-rotate-12`} aria-hidden="true" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showLabel && (
        <span className="text-sm font-medium text-text select-none">
          {currentModeLabel}
        </span>
      )}
    </button>
  );
}
