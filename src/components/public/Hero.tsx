import { SiteSettings } from "../../lib/types";
import { useLanguage } from "../../contexts/LanguageContext";
import { t, tUi } from "../../lib/i18n";
import { motion } from "motion/react";
import { ArrowDown, ArrowUpRight, Camera, Clapperboard, Play, ScanLine } from "lucide-react";

export function Hero({ settings }: { settings: SiteSettings }) {
  const { currentLang, defaultLang } = useLanguage();
  const showProductionCard = settings.hero_production_card_enabled !== "0" && settings.hero_production_card_enabled !== "false";
  return (
    <motion.section 
      id="home" 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="aero-hero min-h-[100svh] pt-32 pb-8 md:pt-40 md:pb-10 px-4 sm:px-6 flex items-end relative"
    >
      <div className="aero-hero-media" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[1480px] mx-auto">
        <div className="aero-hero-layout">
          <div className="aero-hero-copy">
            <div className="aero-live-pill mb-7">
              <span className="aero-live-dot" />
              <span>{tUi("hero.visual_production_studio", currentLang, undefined, defaultLang)}</span>
            </div>
            <h1 className="aero-cinematic-title text-[3.35rem] sm:text-7xl lg:text-[6.5rem] xl:text-[7.5rem] font-bold tracking-[-0.065em] mb-7 max-w-5xl leading-[0.86]">
              {t(settings.hero_headline, currentLang, defaultLang) || "Premium Real Estate Photography."}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/72 max-w-xl mb-9 leading-relaxed">
              {t(settings.hero_subheadline, currentLang, defaultLang) || "Elevating property presentations with stunning visuals."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <a href="#portfolio" className="cinematic-button cinematic-button-primary outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                {tUi("View Our Work", currentLang)}
              </a>
              <a href="#contact" className="cinematic-button cinematic-button-glass outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                {tUi("Contact Us", currentLang)}
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {showProductionCard && (
          <div className="aero-showreel-card" aria-label={tUi("hero.production_services", currentLang, undefined, defaultLang)}>
            {/* TODO: Make the production-area menu configurable in Site Settings. */}
            <div className="flex items-center justify-between mb-7">
              <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/55">{tUi("hero.production_scope", currentLang, undefined, defaultLang)}</span>
              <ScanLine className="w-4 h-4 text-cyan-300" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              <a href="#portfolio" className="aero-service-line group">
                <span className="aero-service-icon"><Camera className="w-4 h-4" /></span>
                <span className="flex-1">{tUi("hero.photography", currentLang, undefined, defaultLang)}</span>
                <span className="text-white/35 group-hover:text-cyan-300">01</span>
              </a>
              <a href="#portfolio" className="aero-service-line group">
                <span className="aero-service-icon"><Clapperboard className="w-4 h-4" /></span>
                <span className="flex-1">{tUi("hero.cinematic_film", currentLang, undefined, defaultLang)}</span>
                <span className="text-white/35 group-hover:text-cyan-300">02</span>
              </a>
              <a href="#portfolio" className="aero-service-line group">
                <span className="aero-service-icon"><ArrowUpRight className="w-4 h-4" /></span>
                <span className="flex-1">{tUi("hero.drone_aerial", currentLang, undefined, defaultLang)}</span>
                <span className="text-white/35 group-hover:text-cyan-300">03</span>
              </a>
            </div>
            <div className="mt-7 pt-5 border-t border-white/12 flex items-center justify-between">
              <span className="text-xs text-white/55">{tUi("hero.crafted_frame_by_frame", currentLang, undefined, defaultLang)}</span>
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-70"/><span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300"/></span>
            </div>
          </div>
          )}
        </div>

        <div className="aero-hero-footer">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-cyan-300">4K</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">{tUi("hero.media_mix", currentLang, undefined, defaultLang)}</span>
          </div>
          <a href="#vision" className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55 hover:text-white transition-colors">
            {tUi("hero.discover_studio", currentLang, undefined, defaultLang)} <ArrowDown className="w-4 h-4 animate-bounce" />
          </a>
        </div>
      </div>
    </motion.section>
  );
}
