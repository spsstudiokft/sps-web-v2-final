import fs from "node:fs";

const source = fs.readFileSync("src/components/admin/PricingModal.tsx", "utf8");
const keys = [...new Set(source.match(/admin\.pricing\.modal\.[a-z0-9_]+/g) || [])].sort();
const exact: Record<string, string> = {
  "admin.pricing.modal.no_components_added_yet_select_a_pricing_tier_service_": "No components added yet. Select a pricing tier, service, or add-on above to construct this bundle.",
  "admin.pricing.modal.no_pricing_tiers_match_your_search_or_filter_create_st": "No pricing tiers match your search or filter. Create standard tiers first or check Show Inactive.",
  "admin.pricing.modal.select_created_pricing_tiers_studio_services_or_add_on": "Select created pricing tiers, studio services, or add-ons to build this package.",
  "admin.pricing.modal.off": "% OFF",
  "admin.pricing.modal.e_g_299": "e.g. 299",
  "admin.pricing.modal.english_en": "English (en):",
  "admin.pricing.modal.hungarian_hu": "Hungarian (hu):",
  "admin.pricing.modal.overridden_to": "Overridden to",
  "admin.pricing.modal.qty": "Qty:", "admin.pricing.modal.unit": "Unit:", "admin.pricing.modal.target": "Target:", "admin.pricing.modal.chars": "chars"
};
const english = (key: string) => exact[key] || key.split(".").at(-1)!.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
async function translate(value: string, target: string) {
  const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(value)}&langpair=en|${target}`);
  const body = await response.json() as any;
  const translated = String(body.responseData?.translatedText || "");
  if (!response.ok || !translated || /QUERY LENGTH LIMIT|MYMEMORY WARNING/i.test(translated)) throw new Error(`Translation unavailable for ${target}: ${value}`);
  return translated.replaceAll("&quot;", '"').replaceAll("&#39;", "'");
}
async function main() {
  const locales: Record<string, Record<string, string>> = { en: {}, hu: {}, de: {}, es: {}, fr: {} };
  for (const key of keys) locales.en[key] = english(key);
  const tasks = keys.flatMap((key) => ["hu", "de", "es", "fr"].map((locale) => async () => { locales[locale][key] = await translate(locales.en[key], locale); }));
  for (let index = 0; index < tasks.length; index += 10) await Promise.all(tasks.slice(index, index + 10).map((task) => task()));
  fs.writeFileSync("src/lib/adminPricingModalTranslations.ts", `export const adminPricingModalTranslations: Record<string, Record<string, string>> = ${JSON.stringify(locales, null, 2)};\n`);
  console.log(`Rebuilt ${keys.length} Pricing modal keys in five locales.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
