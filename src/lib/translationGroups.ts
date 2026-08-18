const NESTED_GROUP_ROOTS = new Set(["admin", "auth", "client", "public"]);

const GROUP_LABELS: Record<string, string> = {
  all: "All groups",
  general: "General & shared text",
  about: "Public site · About",
  contact: "Public site · Contact",
  faq: "Public site · FAQ",
  hero: "Public site · Hero",
  nav: "Public site · Navigation",
  portfolio: "Public site · Portfolio",
  services: "Public site · Services",
  vision: "Public site · Vision",
  social_popup: "Public site · Social popup",
  status_widget: "Public site · Status widget",
  theme: "Theme · Shared",
  themeeditor: "Theme · Editor",
  thememanager: "Theme · Manager",
  themepresets: "Theme · Presets",
  themepreview: "Theme · Preview",
};

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  auth: "Authentication",
  client: "Client portal",
  public: "Public site",
  faq_categories: "FAQ categories",
  portfolio_form: "Portfolio form",
  extra_services: "Extra services",
  fee_rules: "Fee rules",
  client_login: "Client login",
  client_register: "Client registration",
  admin_login: "Admin login",
  admin_setup: "Admin setup",
};

function humanizeSegment(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  const text = segment.replace(/[_-]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Other";
}

/**
 * Returns the functional editor group for a translation key.
 * Large application areas use the first two key segments so unrelated admin,
 * authentication, client-portal and public-page strings do not end up together.
 */
export function getTranslationGroup(key: string): string {
  const cleanKey = key.trim();
  if (!cleanKey || !cleanKey.includes(".")) return "general";

  const [rootRaw, sectionRaw] = cleanKey.split(".");
  const isKeySegment = (segment: string | undefined) =>
    Boolean(segment && /^[a-z][a-z0-9_-]*$/i.test(segment.trim()));

  // Human-readable source strings may contain sentence-ending punctuation.
  // Only identifier-shaped dot segments represent a namespaced key.
  if (!isKeySegment(rootRaw) || !isKeySegment(sectionRaw)) return "general";

  const root = rootRaw.trim().toLowerCase();
  const section = sectionRaw?.trim().toLowerCase();

  if (NESTED_GROUP_ROOTS.has(root) && section) {
    return `${root}.${section}`;
  }

  return root || "general";
}

export function getTranslationGroupLabel(group: string): string {
  if (GROUP_LABELS[group]) return GROUP_LABELS[group];

  const [root, section] = group.split(".");
  if (section) {
    return `${humanizeSegment(root)} · ${humanizeSegment(section)}`;
  }

  return humanizeSegment(group);
}

export function compareTranslationGroups(a: string, b: string): number {
  const areaOrder = [
    "general",
    "nav",
    "hero",
    "about",
    "vision",
    "services",
    "portfolio",
    "faq",
    "contact",
    "social_popup",
    "status_widget",
    "public",
    "auth",
    "client",
    "admin",
    "theme",
    "themeeditor",
    "thememanager",
    "themepresets",
    "themepreview",
  ];
  const rootA = a.split(".")[0];
  const rootB = b.split(".")[0];
  const indexA = areaOrder.indexOf(rootA);
  const indexB = areaOrder.indexOf(rootB);
  const rankA = indexA === -1 ? areaOrder.length : indexA;
  const rankB = indexB === -1 ? areaOrder.length : indexB;

  return rankA - rankB || getTranslationGroupLabel(a).localeCompare(getTranslationGroupLabel(b));
}
