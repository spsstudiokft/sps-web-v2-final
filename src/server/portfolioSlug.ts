function resolvePortfolioTitle(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw.startsWith("{")) return raw;
  try {
    const localized = JSON.parse(raw);
    return String(localized.hu || localized.en || Object.values(localized)[0] || raw);
  } catch {
    return raw;
  }
}

export function createPortfolioSlug(title: unknown, id: string): string {
  const base = resolvePortfolioTitle(title)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "portfolio";
  const suffix = String(id).replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  return `${base}-${suffix}`;
}
