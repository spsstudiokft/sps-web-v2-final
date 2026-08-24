import React from "react";
import { 
  BarChart2, 
  TrendingUp, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  FileText,
  Percent,
  Download
} from "lucide-react";
import { InvoiceSummary, Invoice } from "../../../types";
import { Button } from "../../ui/Button";
import { formatConfiguredCurrency } from "../../../lib/currency";

interface InvoiceReportingSectionProps {
  summary: InvoiceSummary | null;
  invoices: Invoice[];
  currency?: string;
}

export function InvoiceReportingSection({
  summary,
  invoices,
  currency = "USD"
}: InvoiceReportingSectionProps) {
  const formatMoney = (amount: number) => formatConfiguredCurrency(amount, currency || "USD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleExportCSV = () => {
    if (!invoices || invoices.length === 0) return;

    const headers = [
      "Invoice Number",
      "Client Name",
      "Client Email",
      "Property Address",
      "Issue Date",
      "Due Date",
      "Status",
      "Currency",
      "Subtotal",
      "Tax Amount",
      "Discount",
      "Total Amount",
      "Amount Paid",
      "Amount Due"
    ];

    const rows = invoices.map((inv) => {
      const due = Math.max(0, Number(inv.total_amount) - Number(inv.amount_paid));
      return [
        `"${inv.invoice_number}"`,
        `"${(inv.client_name || '').replace(/"/g, '""')}"`,
        `"${(inv.client_email || '').replace(/"/g, '""')}"`,
        `"${(inv.property_address || '').replace(/"/g, '""')}"`,
        inv.issue_date,
        inv.due_date,
        inv.status,
        inv.currency,
        inv.subtotal,
        inv.tax_amount,
        inv.discount_amount,
        inv.total_amount,
        inv.amount_paid,
        due
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invoices_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clientBreakdown = summary?.clientBreakdown || [];

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
        <div>
          <h3 className="text-sm font-bold text-text font-heading flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            Invoicing & Receivables Intelligence
          </h3>
          <p className="text-xs text-muted-text mt-0.5">
            Audit billing volume, collection realization rates, and client account balances.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="h-8 text-xs inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export Invoices CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Client Receivables Ranking */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text mb-4 flex items-center justify-between">
            <span>Client Billing & Realization Breakdown</span>
            <span className="text-[11px] font-normal text-muted-text">
              {clientBreakdown.length} active client accounts
            </span>
          </h4>

          {clientBreakdown.length === 0 ? (
            <p className="text-xs text-muted-text italic py-6 text-center">
              No client billing data available yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-muted-text text-[11px] uppercase font-semibold">
                  <tr>
                    <th className="pb-2.5">Client</th>
                    <th className="pb-2.5 text-center">Invoices</th>
                    <th className="pb-2.5 text-right">Invoiced</th>
                    <th className="pb-2.5 text-right">Paid</th>
                    <th className="pb-2.5 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clientBreakdown.slice(0, 10).map((c, i) => (
                    <tr key={i} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-2.5 font-medium text-text">
                        <div className="font-semibold">{c.client_name}</div>
                        <div className="text-[11px] text-muted-text">{c.client_email}</div>
                      </td>
                      <td className="py-2.5 text-center text-muted-text font-mono">
                        {c.invoice_count}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-text">
                        {formatMoney(c.total_invoiced)}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(c.total_paid)}
                      </td>
                      <td className="py-2.5 text-right font-bold">
                        <span className={c.total_due > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-text"}>
                          {formatMoney(c.total_due)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Status Distribution & Realization Rate */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text">
            Status Breakdown
          </h4>

          <div className="space-y-3">
            {[
              { label: "Drafts", count: summary?.draftCount || 0, color: "bg-amber-500", icon: Clock },
              { label: "Sent / In Transit", count: summary?.sentCount || 0, color: "bg-sky-500", icon: FileText },
              { label: "Viewed by Client", count: summary?.viewedCount || 0, color: "bg-indigo-500", icon: FileText },
              { label: "Fully Paid", count: summary?.paidCount || 0, color: "bg-emerald-500", icon: CheckCircle2 },
              { label: "Overdue", count: summary?.overdueCount || 0, color: "bg-rose-500", icon: AlertCircle },
              { label: "Cancelled", count: summary?.cancelledCount || 0, color: "bg-gray-400", icon: AlertCircle },
            ].map((st, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                  <span className="text-text">{st.label}</span>
                </div>
                <span className="font-mono font-semibold text-text">{st.count}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-medium text-text">Overall Collection Rate</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {summary?.collectionRate || 0}%
              </span>
            </div>
            <div className="w-full bg-border rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, summary?.collectionRate || 0))}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-text mt-2">
              {formatMoney(summary?.totalPaid || 0)} collected out of {formatMoney(summary?.totalInvoiced || 0)} invoiced.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
