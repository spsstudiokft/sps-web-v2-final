import { Quote } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Testimonial } from "../../lib/types";
import { t } from "../../lib/i18n";

function text(value: string | null | undefined, language: string, fallback: string) {
  if (!value) return fallback;
  return t(value, language) || value;
}

export function Testimonials({ items }: { items: Testimonial[] }) {
  const { currentLanguage, defaultLanguage } = useLanguage();
  if (!items.length) return null;

  return (
    <section id="testimonials" className="py-20 md:py-28 px-5 sm:px-6" aria-labelledby="testimonials-title">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">VISSZAJELZÉSEK</span>
          <h2 id="testimonials-title" className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text">{text('{"hu":"Rólunk mondták","en":"What our clients say","de":"Das sagen unsere Kunden","es":"Lo que dicen nuestros clientes","fr":"Ce que disent nos clients"}', currentLanguage || defaultLanguage, "Rólunk mondták")}</h2>
          <p className="mt-4 text-muted-text leading-relaxed">{text('{"hu":"Partnereink tapasztalatai közös munkáinkról.","en":"Experiences from our partners about working with us.","de":"Erfahrungen unserer Partner aus der Zusammenarbeit.","es":"Experiencias de nuestros socios al trabajar con nosotros.","fr":"Les expériences de nos partenaires lors de notre collaboration."}', currentLanguage || defaultLanguage, "Partnereink tapasztalatai közös munkáinkról.")}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => <article key={item.id} className="rounded-2xl border border-border bg-surface/80 p-6 shadow-sm flex flex-col">
            <Quote className="w-8 h-8 text-primary/70 mb-4" aria-hidden="true" />
            <blockquote className="text-text leading-relaxed flex-1">“{text(item.quote, currentLanguage || defaultLanguage, item.quote)}”</blockquote>
            <footer className="mt-6 pt-4 border-t border-border">
              <p className="font-semibold text-text">{text(item.author_name, currentLanguage || defaultLanguage, item.author_name)}</p>
              {item.author_role && <p className="text-sm text-muted-text mt-0.5">{text(item.author_role, currentLanguage || defaultLanguage, item.author_role)}</p>}
            </footer>
          </article>)}
        </div>
      </div>
    </section>
  );
}
