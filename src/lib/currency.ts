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
  // The selected admin currency is presentation-only. Stored amounts and the
  // original record currency remain untouched for accounting and exports.
  let displayCode = code;
  let displayAmount = Number(amount) || 0;
  if (typeof window !== "undefined") {
    try {
      const selected = normalizeCurrency(localStorage.getItem("admin_display_currency") || code);
      const rates = JSON.parse(localStorage.getItem("admin_exchange_rates_eur") || "{}") as Record<string, number>;
      const sourceRate = Number(rates[code] || (code === "EUR" ? 1 : 0));
      const targetRate = Number(rates[selected] || (selected === "EUR" ? 1 : 0));
      if (sourceRate > 0 && targetRate > 0) { displayAmount = displayAmount / sourceRate * targetRate; displayCode = selected; }
    } catch {}
  }
  return new Intl.NumberFormat(CURRENCY_LOCALES[displayCode] || "en-US", {
    style: "currency",
    currency: displayCode,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits
  }).format(displayAmount);
}

export function getCurrencySymbol(currency?: string): string {
  const code = normalizeCurrency(currency);
  return SUPPORTED_CURRENCIES.find((item) => item.code === code)?.symbol || code;
}

export function formatCurrency(amount: number, currency?: string): string {
  return formatConfiguredCurrency(amount, currency, { maximumFractionDigits: 2 });
}
