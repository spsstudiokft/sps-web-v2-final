import { SiteSettings } from "../../lib/types";
import { useLanguage } from "../../contexts/LanguageContext";
import { t, tUi } from "../../lib/i18n";

export function Vision({ settings }: { settings: SiteSettings }) {
  const { currentLang, defaultLang } = useLanguage();
  const headline = t(settings.vision_headline, currentLang, defaultLang) || tUi("vision.subtitle", currentLang, undefined, defaultLang);
  const headlineLength = Array.from(headline).length;
  const headlineSize = headlineLength > 75 ? "is-extra-long" : headlineLength > 45 ? "is-long" : "";
  return (
    <section
      id="vision" 
      data-gsap-reveal
      className="aero-vision scroll-mt-20 py-24 md:py-36 px-6 max-w-5xl mx-auto text-center relative"
    >
      <h2 className={`aero-vision-headline ${headlineSize} text-3xl md:text-5xl font-semibold tracking-tight text-text mb-8 leading-tight`}>
        {headline}
      </h2>
      <p className="text-lg md:text-xl text-muted-text leading-relaxed font-light">
        {t(settings.vision_statement, currentLang, defaultLang) || tUi("vision.title", currentLang, undefined, defaultLang)}
      </p>
    </section>
  );
}
