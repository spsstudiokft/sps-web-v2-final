import React from "react";
import { 
  X, 
  Printer, 
  Send, 
  CreditCard, 
  Edit3, 
  Copy, 
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Layers
} from "lucide-react";
import { Invoice, InvoiceStatus } from "../../../types";
import { Button } from "../../ui/Button";

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onEdit?: (invoice: Invoice) => void;
  onSend?: (invoice: Invoice) => void;
  onSendEmail?: (invoice: Invoice) => void;
  onRecordPayment?: (invoice: Invoice) => void;
  showToast?: (message: string, type?: "success" | "error") => void;
}

export function InvoiceViewModal({
  isOpen,
  onClose,
  invoice,
  onEdit,
  onSend,
  onSendEmail,
  onRecordPayment,
  showToast
}: InvoiceViewModalProps) {
  if (!isOpen || !invoice) return null;

  const handleSend = () => {
    if (typeof onSend === "function") {
      onSend(invoice);
    } else if (typeof onSendEmail === "function") {
      onSendEmail(invoice);
    }
  };

  const formatMoney = (amount: number, curr: string = invoice.currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyPaymentLink = () => {
    const origin = window.location.origin;
    const url = `${origin}/invoice/${invoice.id}?token=${invoice.access_token}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast?.("Invoice link copied to clipboard", "success");
    }).catch(() => {
      showToast?.("Failed to copy link", "error");
    });
  };

  const amountDue = Math.max(0, Number(invoice.total_amount) - Number(invoice.amount_paid));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl my-6 print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none">
        {/* Modal Top Action Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-background/50 rounded-t-2xl print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-text bg-surface px-2.5 py-1 rounded-md border border-border">
              {invoice.invoice_number}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              invoice.status === "paid"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                : invoice.status === "overdue"
                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                : invoice.status === "sent"
                ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
                : "bg-surface text-muted-text border-border"
            }`}>
              {invoice.status.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyPaymentLink}
              className="h-8 text-xs inline-flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Link
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSend}
              className="h-8 text-xs inline-flex items-center gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
            >
              <Send className="w-3.5 h-3.5" />
              Send Email
            </Button>

            {invoice.status !== "paid" && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => onRecordPayment?.(invoice)}
                className="h-8 text-xs inline-flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Record Payment
              </Button>
            )}

            <button
              onClick={onClose}
              className="text-muted-text hover:text-text p-1.5 rounded-lg hover:bg-surface-hover transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-surface text-text print:p-0 print:overflow-visible">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-heading font-black text-2xl tracking-tighter text-text">
                  SPS<span className="text-primary font-normal text-lg ml-1">STUDIO</span>
                </span>
              </div>
              <p className="text-xs text-muted-text font-medium">
                Premium Real Estate Photography & Visual Media
              </p>
              <p className="text-xs text-muted-text">
                billing@spsstudio.com • www.spsstudio.com
              </p>
            </div>

            <div className="text-left sm:text-right">
              <h1 className="text-2xl font-black font-heading text-text tracking-tight uppercase">
                INVOICE
              </h1>
              <div className="mt-1 font-mono font-bold text-sm text-primary">
                {invoice.invoice_number}
              </div>
              <div className="text-xs text-muted-text mt-1 space-y-0.5">
                <div>Issue Date: <span className="font-semibold text-text">{invoice.issue_date}</span></div>
                <div>Due Date: <span className="font-semibold text-text">{invoice.due_date}</span></div>
                {invoice.paid_at && (
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Paid Date: {invoice.paid_at.split("T")[0]}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bill To & Property Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-background/50 p-4 rounded-xl border border-border">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-text block mb-1.5">
                Billed To:
              </span>
              <div className="font-bold text-sm text-text font-heading">
                {invoice.client_name}
              </div>
              <div className="text-xs text-muted-text mt-0.5">
                {invoice.client_email}
              </div>
              {invoice.client_phone && (
                <div className="text-xs text-muted-text">
                  {invoice.client_phone}
                </div>
              )}
              {invoice.client_address && (
                <div className="text-xs text-muted-text mt-1">
                  {invoice.client_address}
                </div>
              )}
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-text block mb-1.5">
                Listing / Property Details:
              </span>
              {invoice.property_address ? (
                <div className="text-xs text-text font-medium flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{invoice.property_address}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-text italic">
                  No property address specified
                </div>
              )}

              {invoice.linked_budget_entry && (
                <div className="mt-3 pt-2 border-t border-border flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Synchronized with Studio Cashflow</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden border border-border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-muted-text font-bold uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(invoice.items || []).map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-surface-hover/50">
                    <td className="py-3.5 px-4 font-medium text-text">
                      {item.description}
                    </td>
                    <td className="py-3.5 px-4 text-center text-muted-text">
                      {item.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right text-muted-text">
                      {formatMoney(item.unit_price, invoice.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-text">
                      {formatMoney(item.total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div className="max-w-md space-y-3">
              {invoice.payment_terms && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-text block mb-1">
                    Payment Terms:
                  </span>
                  <p className="text-xs text-muted-text">
                    {invoice.payment_terms}
                  </p>
                </div>
              )}

              {invoice.payment_method_instructions && (
                <div className="bg-background p-3 rounded-lg border border-border">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-1">
                    Bank & Transfer Instructions:
                  </span>
                  <p className="text-xs text-muted-text whitespace-pre-line font-mono">
                    {invoice.payment_method_instructions}
                  </p>
                </div>
              )}

              {invoice.notes && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-text block mb-1">
                    Notes:
                  </span>
                  <p className="text-xs text-muted-text italic">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-muted-text">
                <span>Subtotal:</span>
                <span className="font-semibold text-text">
                  {formatMoney(invoice.subtotal, invoice.currency)}
                </span>
              </div>

              {Number(invoice.tax_rate) > 0 && (
                <div className="flex justify-between text-muted-text">
                  <span>Tax ({invoice.tax_rate}%):</span>
                  <span className="font-semibold text-text">
                    {formatMoney(invoice.tax_amount, invoice.currency)}
                  </span>
                </div>
              )}

              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-muted-text">
                  <span>Discount:</span>
                  <span className="font-semibold text-rose-500">
                    -{formatMoney(invoice.discount_amount, invoice.currency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2.5 border-t border-border text-sm font-bold">
                <span className="text-text font-heading">Total:</span>
                <span className="text-base text-primary font-heading">
                  {formatMoney(invoice.total_amount, invoice.currency)}
                </span>
              </div>

              <div className="flex justify-between text-muted-text pt-1">
                <span>Amount Paid:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(invoice.amount_paid, invoice.currency)}
                </span>
              </div>

              <div className={`flex justify-between items-center pt-2 border-t border-border font-bold text-sm ${
                amountDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
              }`}>
                <span>Balance Due:</span>
                <span>{formatMoney(amountDue, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment History if exists */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="pt-4 border-t border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text mb-2 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                Payment Records ({invoice.payments.length})
              </h4>
              <div className="overflow-hidden border border-border rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-background text-muted-text text-[11px]">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Method</th>
                      <th className="p-2">Reference</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoice.payments.map((pmt, idx) => (
                      <tr key={pmt.id || idx}>
                        <td className="p-2 text-muted-text">{pmt.payment_date}</td>
                        <td className="p-2 text-text capitalize">{pmt.payment_method.replace("_", " ")}</td>
                        <td className="p-2 font-mono text-muted-text">{pmt.transaction_reference || "—"}</td>
                        <td className="p-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(pmt.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background/50 rounded-b-2xl print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(invoice)}
            className="inline-flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Invoice
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
