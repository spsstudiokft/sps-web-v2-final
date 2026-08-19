import { SiteSettings } from "../../lib/types";
import { useLanguage } from "../../contexts/LanguageContext";
import { t } from "../../lib/i18n";
import {
  DEFAULT_VISUAL_IDEAS_DESCRIPTION,
  DEFAULT_VISUAL_IDEAS_TITLE,
  parseVisualIdeas,
} from "../../lib/visualIdeas";

export function VisualIdeas({ settings, isPerformanceLite = false }: { settings: SiteSettings; isPerformanceLite?: boolean }) {
  const { currentLang, defaultLang } = useLanguage();
  if (settings.visual_ideas_enabled === "0" || settings.visual_ideas_enabled === "false") return null;

  const items = parseVisualIdeas(settings.visual_ideas_items).filter((item) => item.is_visible !== false);
  if (items.length === 0) return null;
  const titleSource = settings.visual_ideas_title || DEFAULT_VISUAL_IDEAS_TITLE;
  const descriptionSource = settings.visual_ideas_description || DEFAULT_VISUAL_IDEAS_DESCRIPTION;
  const title = t(titleSource, currentLang, defaultLang) || titleSource;
  const description = t(descriptionSource, currentLang, defaultLang) || descriptionSource;

  return (
    <section
      id="visual-ideas"
      data-nav-section="false"
      data-performance-lite={isPerformanceLite ? "true" : "false"}
      className="aero-section aero-visual-ideas scroll-mt-20 px-6 py-16 md:py-28"
      aria-labelledby="visual-ideas-title"
    >
      <div className="mx-auto max-w-7xl">
        <header className="aero-section-heading mx-auto mb-12 max-w-4xl text-center md:mb-14">
          <span className="mb-4 inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            SPS Studio
          </span>
          <h2 id="visual-ideas-title" className="text-3xl font-black tracking-tight text-text sm:text-4xl md:text-5xl">
            {title}
          </h2>
          {description && <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-muted-text md:text-lg">{description}</p>}
        </header>

        <div className="visual-ideas-grid grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-5">
          {items.map((item, index) => {
            const cardTitle = t(item.title, currentLang, defaultLang) || item.title;
            const cardDescription = t(item.description, currentLang, defaultLang) || item.description;
            return (
              <article
                key={item.id || index}
                className="aero-card visual-idea-card group relative min-h-44 overflow-hidden rounded-2xl border border-border/80 p-5 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg"
              >
                <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                <p className="mb-3 text-[10px] font-bold tabular-nums tracking-[0.16em] text-primary/70">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="text-base font-bold leading-snug text-text">{cardTitle}</h3>
                {cardDescription && <p className="mt-2 text-sm leading-6 text-muted-text">{cardDescription}</p>}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
