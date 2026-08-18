import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Eye, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Printer, 
  ExternalLink,
  MapPin,
  Calendar
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Invoice } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ClientInvoicesPage() {
  const { tUi, currentLanguage } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClientInvoices();
  }, []);

  const fetchClientInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("client_token") || localStorage.getItem("token");
      const res = await fetch("/api/client/invoices", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        throw new Error("Failed to load invoices");
      }
      const data = await res.json();
      setInvoices(data);
    } catch (err: any) {
      console.error("Error fetching client invoices:", err);
      setError(err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat(currentLanguage, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-muted-text">{tUi("client.invoices.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text font-heading">
          {tUi("client.invoices.title")}
        </h1>
        <p className="text-xs text-muted-text mt-0.5">
          {tUi("client.invoices.subtitle")}
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-text mb-1">{tUi("client.invoices.empty_title")}</h3>
          <p className="text-xs text-muted-text max-w-sm mx-auto">
            {tUi("client.invoices.empty_desc")}
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-muted-text font-semibold uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="py-3 px-4">{tUi("client.invoices.number")}</th>
                  <th className="py-3 px-4">{tUi("client.invoices.property")}</th>
                  <th className="py-3 px-4">{tUi("client.invoices.dates")}</th>
                  <th className="py-3 px-4">{tUi("client.invoices.status")}</th>
                  <th className="py-3 px-4 text-right">{tUi("client.invoices.total")}</th>
                  <th className="py-3 px-4 text-right">{tUi("client.invoices.amount_due")}</th>
                  <th className="py-3 px-4 text-right">{tUi("client.invoices.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => {
                  const amountDue = Math.max(0, Number(inv.total_amount) - Number(inv.amount_paid));
                  const isPaid = inv.status === "paid" || amountDue <= 0;

                  return (
                    <tr key={inv.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-text">
                        {inv.invoice_number}
                      </td>

                      <td className="py-3.5 px-4 text-text">
                        {inv.property_address ? (
                          <div className="flex items-center gap-1 text-xs">
                            <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                            <span className="truncate max-w-[200px]">{inv.property_address}</span>
                          </div>
                        ) : (
                          <span className="text-muted-text italic">{tUi("client.invoices.media_production")}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-text">{inv.issue_date}</div>
                        <div className="text-[11px] text-muted-text">{tUi("client.invoices.due", { date: inv.due_date })}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isPaid
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : inv.status === "overdue"
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        }`}>
                          {isPaid ? tUi("client.invoices.paid") : tUi(`client.invoice_status.${inv.status}`, undefined, inv.status.toUpperCase())}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-text whitespace-nowrap">
                        {formatMoney(inv.total_amount, inv.currency)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold whitespace-nowrap">
                        <span className={amountDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                          {formatMoney(amountDue, inv.currency)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <a
                          href={`/invoice/${inv.id}?token=${inv.access_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {tUi("client.invoices.view_pay")}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
