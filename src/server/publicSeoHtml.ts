type PublicSeoData = {
  settings?: Record<string, unknown>;
  services?: Array<Record<string, unknown>>;
  portfolio?: Array<Record<string, unknown>>;
  pricing?: Array<Record<string, unknown>>;
  extraServices?: Array<Record<string, unknown>>;
  faqs?: Array<Record<string, unknown>>;
  testimonials?: Array<Record<string, unknown>>;
};

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const plainText = (value: unknown) => String(value ?? "")
  .replace(/<[^>]*>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

/** Resolves the Hungarian text stored either as a plain string or as a locale JSON object. */
const text = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const translations = parsed as Record<string, unknown>;
      return plainText(translations.hu || translations.HU || translations.en || Object.values(translations)[0] || fallback);
    }
  } catch {
    // Plain text is the normal case.
  }
  return plainText(trimmed) || fallback;
};

const jsonForScript = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

const parseVisualIdeas = (value: unknown): Array<Record<string, unknown>> => {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object" && item.is_visible !== false) : [];
  } catch {
    return [];
  }
};

/**
 * Produces a semantic, data-backed snapshot of the one-page public site.
 * It intentionally contains the same public content that the React UI renders.
 */
export function renderPublicSeoHome(data: PublicSeoData, origin: string) {
  const settings = data.settings || {};
  const studioName = text(settings.studio_name, "SPS Studio");
  const headline = text(settings.hero_headline, "Prémium ingatlanfotózás és videózás");
  const subheadline = text(settings.hero_subheadline, "Professzionális vizuális tartalom ingatlanokhoz.");
  const defaultDescription = `${studioName} – ingatlanfotózás, ingatlanvideó és drónfelvételek Hódmezővásárhelyen, Szegeden és országosan.`;
  const description = text(settings.seo_default_description, defaultDescription);
  const servicesHeading = text(settings.services_headline, "Szolgáltatásaink");
  const servicesDescription = text(settings.services_description, "Vizuális megoldások, amelyek kiemelik az ingatlan értékeit.");
  const faqHeading = text(settings.faq_headline, "Gyakran ismételt kérdések");
  const faqDescription = text(settings.faq_description, "Válaszok szolgáltatásainkról és a közös munkáról.");
  const portfolioHeading = text(settings.portfolio_headline, "Munkáink");
  const pricingHeading = text(settings.pricing_headline, "Áraink");
  const contactHeading = text(settings.contact_headline, "Kapcsolat");
  const contactDescription = text(settings.contact_description, "Kérjen személyre szabott ajánlatot.");
  const contactEmail = text(settings.contact_email, "hello@spsstudio.hu");
  const contactPhone = text(settings.contact_phone || settings.phone, "+36 30 703 0242");
  const visionHeadline = text(settings.vision_headline, "Több érdeklődő. Kevesebb ráfordítás. Gyorsabb értékesítés.");
  const visionStatement = text(settings.vision_statement, "Professzionális vizuális tartalom az ingatlan értékesítéséhez.");
  const aboutHeading = "Rólunk";
  const aboutDescription = text(settings.about_text, "Professzionális ingatlanfotózással és vizuális tartalommal segítjük ügyfeleinket.");
  const visualIdeasTitle = text(settings.visual_ideas_title, "Vizuális ötletek");
  const visualIdeasDescription = text(settings.visual_ideas_description, "Inspirációk az ingatlanok eredményes bemutatásához.");

  const services = (data.services || []).map((service) => ({
    title: text(service.title, "Ingatlanvizualizáció"),
    description: text(service.description),
  })).filter((service) => service.title || service.description);
  const portfolio = (data.portfolio || []).map((item) => ({
    title: text(item.title, "SPS Studio projekt"),
    description: text(item.description),
  }));
  const pricing = [...(data.pricing || []), ...(data.extraServices || [])].map((item) => ({
    title: text(item.name || item.title, "Szolgáltatás"),
    description: text(item.description),
    price: Number(item.price || 0),
    currency: text(item.currency, "HUF"),
  }));
  const faqs = (data.faqs || []).map((faq) => ({
    question: text(faq.question),
    answer: text(faq.answer),
  })).filter((faq) => faq.question && faq.answer);
  const visualIdeas = parseVisualIdeas(settings.visual_ideas_items).map((item) => ({
    title: text(item.title),
    description: text(item.description),
  })).filter((item) => item.title || item.description);
  const testimonials = (data.testimonials || []).map((item) => ({
    quote: text(item.quote),
    author: text(item.author_name),
    role: text(item.author_role),
  })).filter((item) => item.quote && item.author);

  const faqSchema = faqs.length ? {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  } : null;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        name: studioName,
        url: origin,
        description,
        email: contactEmail,
        telephone: contactPhone,
        areaServed: ["Hódmezővásárhely", "Szeged", "Csongrád-Csanád", "Magyarország"],
      },
      ...(faqSchema ? [faqSchema] : []),
    ],
  };

  const serviceMarkup = services.length ? `<section id="services"><h2>${escapeHtml(servicesHeading)}</h2><p>${escapeHtml(servicesDescription)}</p>${services.map((service) => `<article><h3>${escapeHtml(service.title)}</h3>${service.description ? `<p>${escapeHtml(service.description)}</p>` : ""}</article>`).join("")}</section>` : "";
  const portfolioMarkup = portfolio.length ? `<section id="portfolio"><h2>${escapeHtml(portfolioHeading)}</h2>${portfolio.map((item) => `<article><h3>${escapeHtml(item.title)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</article>`).join("")}</section>` : "";
  const pricingMarkup = pricing.length ? `<section id="pricing"><h2>${escapeHtml(pricingHeading)}</h2><p>Minden feltüntetett ár nettó, a végszámlán 27% ÁFA kerül felszámításra.</p>${pricing.map((item) => `<article><h3>${escapeHtml(item.title)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}${item.price > 0 ? `<p>Nettó ár: ${escapeHtml(new Intl.NumberFormat("hu-HU").format(item.price))} ${escapeHtml(item.currency)}</p>` : ""}</article>`).join("")}</section>` : "";
  const faqMarkup = faqs.length ? `<section id="faq"><h2>${escapeHtml(faqHeading)}</h2><p>${escapeHtml(faqDescription)}</p><dl>${faqs.map((faq) => `<div><dt>${escapeHtml(faq.question)}</dt><dd>${escapeHtml(faq.answer)}</dd></div>`).join("")}</dl></section>` : "";
  const visualIdeasMarkup = visualIdeas.length && settings.visual_ideas_enabled !== "0" && settings.visual_ideas_enabled !== "false"
    ? `<section id="visual-ideas"><h2>${escapeHtml(visualIdeasTitle)}</h2><p>${escapeHtml(visualIdeasDescription)}</p>${visualIdeas.map((item) => `<article><h3>${escapeHtml(item.title)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</article>`).join("")}</section>`
    : "";
  const testimonialsMarkup = testimonials.length
    ? `<section id="testimonials"><h2>Rólunk mondták</h2><p>Partnereink tapasztalatai közös munkáinkról.</p>${testimonials.map((item) => `<article><blockquote>${escapeHtml(item.quote)}</blockquote><p>${escapeHtml(item.author)}${item.role ? ` – ${escapeHtml(item.role)}` : ""}</p></article>`).join("")}</section>`
    : "";

  return `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(`${headline} | ${studioName}`)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${escapeHtml(origin)}"><script type="application/ld+json">${jsonForScript(structuredData)}</script></head>
<body><header><p>${escapeHtml(studioName)}</p><nav><a href="#home">Kezdőlap</a><a href="#vision">Küldetésünk</a><a href="#about">Rólunk</a><a href="#services">Szolgáltatások</a><a href="#portfolio">Portfólió</a><a href="#visual-ideas">Vizuális ötletek</a><a href="#pricing">Árak</a><a href="#testimonials">Vélemények</a><a href="#faq">GYIK</a><a href="#contact">Kapcsolat</a></nav></header><main><section id="home"><h1>${escapeHtml(headline)}</h1><p>${escapeHtml(subheadline)}</p></section><section id="vision"><h2>${escapeHtml(visionHeadline)}</h2><p>${escapeHtml(visionStatement)}</p></section><section id="about"><h2>${escapeHtml(aboutHeading)}</h2><p>${escapeHtml(aboutDescription)}</p></section>${serviceMarkup}${portfolioMarkup}${visualIdeasMarkup}${pricingMarkup}${testimonialsMarkup}${faqMarkup}<section id="contact"><h2>${escapeHtml(contactHeading)}</h2><p>${escapeHtml(contactDescription)}</p><p><a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a> · <a href="tel:${escapeHtml(contactPhone.replace(/\s+/g, ""))}">${escapeHtml(contactPhone)}</a></p></section></main></body></html>`;
}
