import { useLanguage } from "../../contexts/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { currentLang, setLang, enabledLangs } = useLanguage();

  // If only one language is enabled (or zero), do not render the selector at all
  if (!enabledLangs || enabledLangs.length <= 1) {
    return null;
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface/80 hover:bg-surface border border-border text-text transition-colors shadow-2xs">
        <Globe className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
        <select
          className="appearance-none bg-transparent text-xs font-semibold text-text hover:text-primary focus:outline-none cursor-pointer pr-3"
          value={currentLang}
          onChange={(e) => setLang(e.target.value)}
          aria-label="Select Language"
        >
          {enabledLangs.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-background text-text">
              {lang.name || lang.code.toUpperCase()}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2 flex items-center text-muted-text">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
