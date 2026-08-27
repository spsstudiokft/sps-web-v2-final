import { PortfolioItem } from "../../lib/types";
import { cn, getParsedImages, getFirstImageUrl } from "../../lib/utils";
import { useLanguage } from "../../contexts/LanguageContext";
import { t } from "../../lib/i18n";

export function FeaturedWork({ featured }: { featured: PortfolioItem[] }) {
  const { currentLang, defaultLang } = useLanguage();

  if (featured.length === 0) return null;

  return (
    <section
      id="featured" 
      data-gsap-reveal
      className="scroll-mt-20 px-6 max-w-7xl mx-auto mb-32"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {featured.slice(0, 2).map((item, i) => {
          const firstImgUrl = getFirstImageUrl(item.image_urls);
          return (
            <div key={item.id} className={cn("group cursor-pointer", i === 1 ? "md:mt-16" : "")}>
              <div className="overflow-hidden rounded-2xl aspect-[4/3] bg-surface mb-6 relative">
                {firstImgUrl && (
                  <img
                    src={firstImgUrl}
                    alt={t(item.title, currentLang, defaultLang)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                )}
              </div>
              <h3 className="text-2xl font-semibold mb-2">{t(item.title, currentLang, defaultLang)}</h3>
              <p className="text-muted-text">{t(item.category_name, currentLang, defaultLang) || "Featured Property"}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
