const sharedKeys = {
  en: ["Section images and backgrounds", "Upload a separate background for each public section. Empty fields keep the built-in design.", "Background", "Full-width section background. JPG, PNG, WebP or AVIF can be used.", "1920 × 1080 px or larger", "Image position", "Center", "Top", "Bottom", "Left", "Right", "Dark overlay", "About section main image", "Featured image displayed next to the text.", "Restore default media", "Built-in default image", "Hero / Home", "Vision", "About", "Services", "Portfolio", "Property visual ideas", "Pricing and packages", "Contact", "FAQ", "1200 × 1200 px"],
  hu: ["Szekcióképek és hátterek", "Minden publikus szekcióhoz külön háttér tölthető fel. Az üres mező megtartja a beépített dizájnt.", "Háttér", "Teljes szélességű szekcióháttér. JPG, PNG, WebP vagy AVIF használható.", "1920 × 1080 px vagy nagyobb", "Kép pozíciója", "Középen", "Felül", "Alul", "Balra", "Jobbra", "Sötétítő réteg", "Rólunk szekció fő képe", "A szöveg mellett megjelenő kiemelt kép.", "Alapértelmezett média visszaállítása", "Beépített alapértelmezett kép", "Hero / Kezdőlap", "Vízió", "Rólunk", "Szolgáltatások", "Portfólió", "Ingatlanvizuál ötletek", "Árak és csomagok", "Kapcsolat", "GYIK", "1200 × 1200 px"],
  de: ["Bereichsbilder und Hintergründe", "Laden Sie für jeden öffentlichen Bereich einen eigenen Hintergrund hoch. Leere Felder behalten das integrierte Design.", "Hintergrund", "Vollflächiger Bereichshintergrund. JPG, PNG, WebP oder AVIF möglich.", "1920 × 1080 px oder größer", "Bildposition", "Mitte", "Oben", "Unten", "Links", "Rechts", "Dunkle Überlagerung", "Hauptbild des Über-uns-Bereichs", "Hervorgehobenes Bild neben dem Text.", "Standardmedien wiederherstellen", "Integriertes Standardbild", "Hero / Startseite", "Vision", "Über uns", "Leistungen", "Portfolio", "Ideen für Immobilienvisualisierung", "Preise und Pakete", "Kontakt", "FAQ", "1200 × 1200 px"],
  es: ["Imágenes y fondos de secciones", "Suba un fondo independiente para cada sección pública. Los campos vacíos conservan el diseño integrado.", "Fondo", "Fondo de sección a ancho completo. Se admite JPG, PNG, WebP o AVIF.", "1920 × 1080 px o más", "Posición de la imagen", "Centro", "Arriba", "Abajo", "Izquierda", "Derecha", "Capa oscura", "Imagen principal de Sobre nosotros", "Imagen destacada junto al texto.", "Restaurar medios predeterminados", "Imagen predeterminada integrada", "Hero / Inicio", "Visión", "Sobre nosotros", "Servicios", "Portafolio", "Ideas visuales inmobiliarias", "Precios y paquetes", "Contacto", "Preguntas frecuentes", "1200 × 1200 px"],
  fr: ["Images et arrière-plans des sections", "Téléversez un arrière-plan distinct pour chaque section publique. Les champs vides conservent le design intégré.", "Arrière-plan", "Arrière-plan de section pleine largeur. JPG, PNG, WebP ou AVIF accepté.", "1920 × 1080 px ou plus", "Position de l’image", "Centre", "Haut", "Bas", "Gauche", "Droite", "Superposition sombre", "Image principale de la section À propos", "Image mise en avant à côté du texte.", "Restaurer les médias par défaut", "Image par défaut intégrée", "Hero / Accueil", "Vision", "À propos", "Services", "Portfolio", "Idées visuelles immobilières", "Tarifs et forfaits", "Contact", "FAQ", "1200 × 1200 px"],
} as const;

const keys = [
  "admin.section_media.title", "admin.section_media.description", "admin.section_media.background",
  "admin.section_media.background_description", "admin.section_media.background_size", "admin.section_media.position",
  "admin.section_media.position.center", "admin.section_media.position.top", "admin.section_media.position.bottom",
  "admin.section_media.position.left", "admin.section_media.position.right", "admin.section_media.overlay",
  "admin.section_media.about_content_title", "admin.section_media.about_content_description", "admin.section_media.reset",
  "admin.section_media.built_in_preview", "admin.section_media.section.home", "admin.section_media.section.vision",
  "admin.section_media.section.about", "admin.section_media.section.services", "admin.section_media.section.portfolio",
  "admin.section_media.section.visual_ideas", "admin.section_media.section.pricing", "admin.section_media.section.contact",
  "admin.section_media.section.faq",
  "admin.section_media.about_content_size",
] as const;

export const sectionMediaTranslations = Object.fromEntries(
  Object.entries(sharedKeys).map(([locale, values]) => [locale, Object.fromEntries(keys.map((key, index) => [key, values[index]]))]),
) as Record<string, Record<string, string>>;
