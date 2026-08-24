import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { normalizeCurrency } from "../lib/currency";

const currencies = ["HUF", "EUR", "USD", "GBP", "CHF"];
type CurrencyState = { currency: string; setCurrency: (value: string) => void; rates: Record<string, number>; updatedAt: string | null; convert: (amount: number, from?: string) => number | null; format: (amount: number, from?: string) => string };
const CurrencyContext = createContext<CurrencyState | null>(null);
export function AdminCurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState(() => localStorage.getItem("admin_display_currency") || "HUF"); const [rates, setRates] = useState<Record<string, number>>({ EUR: 1 }); const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  useEffect(() => { fetch(`/api/admin/exchange-rates?base=EUR&quotes=${currencies.join(",")}`).then(r => r.ok ? r.json() : null).then(data => { if (data) { setRates(data.rates || {}); setUpdatedAt(data.updated_at); localStorage.setItem("admin_exchange_rates_eur", JSON.stringify(data.rates || {})); } }).catch(() => {}); }, []);
  const setCurrency = (value: string) => { const next = normalizeCurrency(value); setCurrencyState(next); localStorage.setItem("admin_display_currency", next); };
  return <CurrencyContext.Provider value={useMemo(() => ({ currency, setCurrency, rates, updatedAt, convert: (amount, from = "EUR") => { const source = rates[normalizeCurrency(from)]; const target = rates[currency]; return source && target ? Number(amount || 0) / source * target : null; }, format: (amount, from = "EUR") => { const source = rates[normalizeCurrency(from)]; const target = rates[currency]; const value = source && target ? Number(amount || 0) / source * target : Number(amount || 0); return new Intl.NumberFormat("hu-HU", { style: "currency", currency, maximumFractionDigits: 2 }).format(value); } }), [currency, rates, updatedAt])}>{children}</CurrencyContext.Provider>;
}
export const useAdminCurrency = () => { const value = useContext(CurrencyContext); if (!value) throw new Error("AdminCurrencyProvider hiányzik"); return value; };
