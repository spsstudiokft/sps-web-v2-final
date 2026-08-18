import { SiteSettings } from "../../lib/types";
import { useLanguage } from "../../contexts/LanguageContext";
import { t, tUi } from "../../lib/i18n";
import { motion } from "motion/react";

export function Vision({ settings }: { settings: SiteSettings }) {
  const { currentLang, defaultLang } = useLanguage();
  return (
    <motion.section 
      id="vision" 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="aero-vision scroll-mt-20 py-24 md:py-36 px-6 max-w-5xl mx-auto text-center relative"
    >
      <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-text mb-8 leading-tight">
        {t(settings.vision_headline, currentLang, defaultLang) || tUi("vision.subtitle", currentLang, undefined, defaultLang)}
      </h2>
      <p className="text-lg md:text-xl text-muted-text leading-relaxed font-light">
        {t(settings.vision_statement, currentLang, defaultLang) || tUi("vision.title", currentLang, undefined, defaultLang)}
      </p>
    </motion.section>
  );
}
