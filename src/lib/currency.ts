const CURRENCY_LOCALES: Record<string, string> = {
  HUF: "hu-HU",
  EUR: "de-DE",
  GBP: "en-GB",
  USD: "en-US",
  CAD: "en-CA",
  AUD: "en-AU",
  CHF: "de-CH"
};

export const SUPPORTED_CURRENCIES = [
  { code: "HUF", name: "HUF (Ft) - Hungarian Forint", symbol: "Ft" },
  { code: "EUR", name: "EUR (€) - Euro", symbol: "€" },
  { code: "USD", name: "USD ($) - US Dollar", symbol: "$" },
  { code: "GBP", name: "GBP (£) - British Pound", symbol: "£" },
  { code: "CAD", name: "CAD ($) - Canadian Dollar", symbol: "$" },
  { code: "CHF", name: "CHF (Fr) - Swiss Franc", symbol: "Fr" },
  { code: "AUD", name: "AUD ($) - Australian Dollar", symbol: "$" }
];

export function normalizeCurrency(currency?: string): string {
  const normalized = String(currency || "USD").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "USD";
}

export function formatConfiguredCurrency(
  amount: number,
  currency?: string,
  options: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
  const code = normalizeCurrency(currency);
  return new Intl.NumberFormat(CURRENCY_LOCALES[code] || "en-US", {
    style: "currency",
    currency: code,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits
  }).format(Number(amount) || 0);
}

export function getCurrencySymbol(currency?: string): string {
  const code = normalizeCurrency(currency);
  return SUPPORTED_CURRENCIES.find((item) => item.code === code)?.symbol || code;
}

export function formatCurrency(amount: number, currency?: string): string {
  return formatConfiguredCurrency(amount, currency, { maximumFractionDigits: 2 });
}
