import { SiteSettings } from "../../lib/types";
import { useLanguage } from "../../contexts/LanguageContext";
import { t, tUi } from "../../lib/i18n";
import { motion } from "motion/react";

export function About({ settings }: { settings: SiteSettings }) {
  const { currentLang, defaultLang } = useLanguage();
  return (
    <motion.section 
      id="about" 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="aero-section aero-about scroll-mt-20 py-24 md:py-32"
    >
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div className="aero-copy-card">
          <h2 className="text-4xl font-bold tracking-tight mb-6">{tUi("about.title", currentLang, undefined, defaultLang)}</h2>
          <p className="text-lg text-muted-text leading-relaxed mb-8">
            {t(settings.about_text, currentLang, defaultLang) || tUi("about.subtitle", currentLang, undefined, defaultLang)}
          </p>
        </div>
        <div className="aero-media-frame aspect-[4/5] md:aspect-square overflow-hidden relative">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1000"
            alt={tUi("about.title", currentLang, undefined, defaultLang)}
            className="w-full h-full object-cover object-center transition-[filter] duration-500 hover:brightness-105"
          />
        </div>
      </div>
    </motion.section>
  );
}
