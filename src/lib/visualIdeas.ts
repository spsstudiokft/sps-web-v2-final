export type VisualIdeaItem = {
  id: string;
  title: string;
  description: string;
  is_visible?: boolean;
};

export const MAX_VISUAL_IDEAS = 15;

export const DEFAULT_VISUAL_IDEAS_TITLE = JSON.stringify({
  hu: "Miről lehet jó ingatlan vizuált készíteni?",
  en: "What properties make great real estate visuals?",
  de: "Welche Immobilien eignen sich für starke visuelle Inhalte?",
  es: "¿Qué propiedades son ideales para contenido visual inmobiliario?",
  fr: "Quels biens se prêtent à de beaux visuels immobiliers ?",
});

export const DEFAULT_VISUAL_IDEAS_DESCRIPTION = JSON.stringify({
  hu: "Minden térben van egy történet. Megmutatjuk, milyen ingatlanokból készülhet igazán meggyőző vizuális bemutató.",
  en: "Every space has a story. Discover the property types that can become compelling visual showcases.",
  de: "Jeder Raum erzählt eine Geschichte. Entdecken Sie Immobilien, die sich visuell überzeugend präsentieren lassen.",
  es: "Cada espacio tiene una historia. Descubre qué inmuebles pueden convertirse en presentaciones visuales impactantes.",
  fr: "Chaque espace raconte une histoire. Découvrez les biens qui peuvent devenir des présentations visuelles convaincantes.",
});

export const DEFAULT_VISUAL_IDEAS: VisualIdeaItem[] = [
  { id: "visual-idea-apartment", title: JSON.stringify({ hu: "Lakások", en: "Apartments" }), description: JSON.stringify({ hu: "Világos, jól komponált képek az elrendezés és a térérzet bemutatására.", en: "Bright, carefully composed visuals that reveal layout and sense of space." }) },
  { id: "visual-idea-house", title: JSON.stringify({ hu: "Családi házak", en: "Family homes" }), description: JSON.stringify({ hu: "Külső és belső részletek, amelyek egységes történetté állnak össze.", en: "Exterior and interior details brought together as one coherent story." }) },
  { id: "visual-idea-new-build", title: JSON.stringify({ hu: "Újépítésű projektek", en: "New developments" }), description: JSON.stringify({ hu: "Modern terek, anyaghasználat és építészeti megoldások látványos bemutatása.", en: "A striking presentation of modern spaces, materials and architecture." }) },
  { id: "visual-idea-holiday", title: JSON.stringify({ hu: "Apartmanok és szálláshelyek", en: "Holiday rentals" }), description: JSON.stringify({ hu: "Hangulatos vizuálok, amelyek már foglalás előtt élményt közvetítenek.", en: "Atmospheric visuals that communicate the experience before booking." }) },
  { id: "visual-idea-office", title: JSON.stringify({ hu: "Irodák", en: "Offices" }), description: JSON.stringify({ hu: "Funkcionális, inspiráló munkaterek professzionális megjelenítése.", en: "Professional visuals of functional and inspiring work environments." }) },
  { id: "visual-idea-retail", title: JSON.stringify({ hu: "Üzlethelyiségek", en: "Retail spaces" }), description: JSON.stringify({ hu: "A lokáció, az enteriőr és az ügyfélélmény együttes hangsúlyozása.", en: "Highlighting location, interior character and customer experience." }) },
  { id: "visual-idea-hospitality", title: JSON.stringify({ hu: "Éttermek és vendéglátóhelyek", en: "Hospitality venues" }), description: JSON.stringify({ hu: "Ételek, részletek és atmoszféra egy egységes vizuális világban.", en: "Food, details and atmosphere presented as one visual identity." }) },
  { id: "visual-idea-industrial", title: JSON.stringify({ hu: "Ipari ingatlanok", en: "Industrial properties" }), description: JSON.stringify({ hu: "Méretarányok, megközelíthetőség és műszaki adottságok átláthatóan.", en: "Clear presentation of scale, access and technical capabilities." }) },
  { id: "visual-idea-land", title: JSON.stringify({ hu: "Építési telkek", en: "Development land" }), description: JSON.stringify({ hu: "Drónfelvételekkel a környezet, a telekhatár és a lehetőségek is láthatóvá válnak.", en: "Aerial visuals reveal surroundings, boundaries and development potential." }) },
  { id: "visual-idea-premium", title: JSON.stringify({ hu: "Prémium ingatlanok", en: "Premium properties" }), description: JSON.stringify({ hu: "Részletgazdag fotó, film és légi felvétel exkluzív megjelenéssel.", en: "Detailed photography, film and aerial content with a premium finish." }) },
];

export function parseVisualIdeas(raw?: string): VisualIdeaItem[] {
  if (!raw) return DEFAULT_VISUAL_IDEAS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_VISUAL_IDEAS;
    return parsed.slice(0, MAX_VISUAL_IDEAS).map((item, index) => ({
      id: String(item?.id || `visual-idea-${index + 1}`),
      title: String(item?.title || ""),
      description: String(item?.description || ""),
      is_visible: item?.is_visible !== false && item?.is_visible !== 0,
    }));
  } catch {
    return DEFAULT_VISUAL_IDEAS;
  }
}
