import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { 
  FileText, 
  Printer, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MapPin, 
  Download,
  ExternalLink,
  ShieldCheck,
  Send,
  Building,
  Mail,
  Phone
} from "lucide-react";
import { Button } from "../components/ui/Button";

export default function PublicInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [invoice, setInvoice] = useState<any>(null);
  const [studio, setStudio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Intent form state
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyReference, setNotifyReference] = useState("");
  const [notifyNotes, setNotifyNotes] = useState("");
  const [notifySent, setNotifySent] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id, token]);

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/public/invoices/${id}${token ? `?token=${token}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Invoice not found or access expired");
      }
      const data = await res.json();
      setInvoice(data.invoice);
      setStudio(data.studio);
    } catch (err: any) {
      console.error("Failed to load invoice:", err);
      setError(err.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifyLoading(true);
    try {
      const res = await fetch(`/api/public/invoices/${id}/notify-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: notifyReference,
          notes: notifyNotes,
          payer_name: invoice?.client_name
        })
      });
      if (res.ok) {
        setNotifySent(true);
        setTimeout(() => {
          setShowNotifyModal(false);
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to submit payment notice:", err);
    } finally {
      setNotifyLoading(false);
    }
  };

  const formatMoney = (val: number, curr: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-text">Loading invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-text mb-2 font-heading">Invoice Unavailable</h2>
        <p className="text-sm text-muted-text max-w-sm mb-6">
          {error || "The requested invoice could not be located or access is restricted."}
        </p>
        <Link to="/" className="text-xs text-primary font-semibold hover:underline">
          Return to SPS Studio Homepage
        </Link>
      </div>
    );
  }

  const amountDue = Math.max(0, Number(invoice.total_amount) - Number(invoice.amount_paid));
  const isPaid = invoice.status === "paid" || amountDue <= 0;

  return (
    <div className="min-h-screen bg-background text-text py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Floating Status / Action Card (Hidden on Print) */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isPaid
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}>
              {isPaid ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text font-heading">
                  Invoice {invoice.invoice_number}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                  isPaid
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                }`}>
                  {isPaid ? "Paid in Full" : `Due: ${invoice.due_date}`}
                </span>
              </div>
              <p className="text-xs text-muted-text mt-0.5">
                {isPaid
                  ? "Thank you! This invoice has been settled in full."
                  : `Total amount due: ${formatMoney(amountDue, invoice.currency)}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </Button>

            {!isPaid && (
              <>
                {invoice.payment_link ? (
                  <a
                    href={invoice.payment_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs shadow-xs hover:opacity-90 transition-opacity"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay Now Online
                  </a>
                ) : (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => setShowNotifyModal(true)}
                    className="text-xs inline-flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    I Have Sent Payment
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main Printable Invoice Paper */}
        <article className="invoice-document bg-surface border border-border rounded-2xl p-8 sm:p-10 shadow-xl space-y-8 print:border-none print:shadow-none print:p-0 print:rounded-none">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-border pb-8">
            <div>
              <div className="font-heading font-black text-2xl tracking-tighter text-text mb-1">
                SPS<span className="text-primary font-normal text-lg ml-1">STUDIO</span>
              </div>
              <p className="text-xs text-muted-text font-medium">
                {studio?.name || "SPS Studio"} · Premium Visual Media
              </p>
              <p className="text-xs text-muted-text">
                {studio?.fromEmail || "billing@spsstudio.com"}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <h1 className="text-2xl font-black font-heading tracking-tight uppercase text-text">
                INVOICE
              </h1>
              <div className="mt-1 font-mono font-bold text-sm text-primary">
                {invoice.invoice_number}
              </div>
              <div className="text-xs text-muted-text mt-1 space-y-0.5">
                <div>Issue Date: <strong className="text-text">{invoice.issue_date}</strong></div>
                <div>Due Date: <strong className="text-text">{invoice.due_date}</strong></div>
              </div>
            </div>
          </div>

          {/* Email-template aligned invoice summary */}
          <section className="invoice-summary invoice-print-section rounded-xl border border-border p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 border-b border-border pb-4 mb-3">
              <div className="min-w-0">
                <span className="text-[11px] uppercase text-muted-text font-bold tracking-wider">
                  Invoice Number
                </span>
                <div className="text-lg font-extrabold text-text font-mono mt-0.5">
                  {invoice.invoice_number}
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <span className="text-[11px] uppercase text-muted-text font-bold tracking-wider">
                  {isPaid ? "Payment Status" : "Amount Due"}
                </span>
                <div className={`text-xl sm:text-2xl font-extrabold mt-0.5 ${isPaid ? "text-emerald-700" : "text-text"}`}>
                  {isPaid ? "PAID IN FULL" : formatMoney(amountDue, invoice.currency)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-muted-text">Issue Date:</span>
                <strong className="text-text">{invoice.issue_date}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-text">Due Date:</span>
                <strong className={isPaid ? "text-text" : "text-rose-600"}>{invoice.due_date}</strong>
              </div>
              {invoice.property_address && (
                <div className="col-span-2 flex items-start gap-3 pt-1">
                  <span className="text-muted-text shrink-0">Property Ref:</span>
                  <strong className="text-text">{invoice.property_address}</strong>
                </div>
              )}
            </div>
          </section>

          {/* Client & Property Details */}
          <section className="invoice-print-section grid grid-cols-1 sm:grid-cols-2 gap-6 bg-background/50 p-5 rounded-xl border border-border">
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
                Service / Property Location:
              </span>
              {invoice.property_address ? (
                <div className="text-xs text-text font-medium flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{invoice.property_address}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-text italic">
                  Photography & Digital Production Services
                </div>
              )}
            </div>
          </section>

          {/* Items Table */}
          <section className="invoice-line-items overflow-hidden border border-border rounded-xl">
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
                {(invoice.items || []).map((item: any, idx: number) => (
                  <tr key={item.id || idx}>
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
          </section>

          {/* Total Breakdown & Payment Notes */}
          <section className="invoice-totals flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div className="max-w-md space-y-3">
              {invoice.payment_terms && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-text block mb-1">
                    Terms & Conditions:
                  </span>
                  <p className="text-xs text-muted-text">
                    {invoice.payment_terms}
                  </p>
                </div>
              )}

              {invoice.payment_method_instructions && (
                <div className="invoice-payment-instructions bg-background p-4 rounded-xl border border-border">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-1">
                    Bank Transfer / Payment Instructions:
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
          </section>

          {/* Payment Receipts History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <section className="invoice-receipts invoice-print-section pt-4 border-t border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Confirmed Payment Receipts
              </h4>
              <div className="overflow-hidden border border-border rounded-lg text-xs">
                <table className="w-full text-left">
                  <thead className="bg-background text-muted-text text-[11px]">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Method</th>
                      <th className="p-2">Reference</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoice.payments.map((p: any, i: number) => (
                      <tr key={i}>
                        <td className="p-2 text-muted-text">{p.payment_date}</td>
                        <td className="p-2 text-text capitalize">{p.payment_method?.replace("_", " ")}</td>
                        <td className="p-2 font-mono text-muted-text">{p.transaction_reference || "—"}</td>
                        <td className="p-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(p.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Footer note */}
          <footer className="invoice-footer text-center pt-8 border-t border-border text-xs text-muted-text">
            <p>Thank you for choosing SPS Studio for your real estate media needs.</p>
            <p className="mt-1 text-[11px]">
              For billing inquiries, please contact us at {studio?.fromEmail || "billing@spsstudio.com"}.
            </p>
          </footer>
        </article>
      </div>

      {/* Payment Confirmation Notification Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-text font-heading">
              Notify SPS Studio of Payment
            </h3>
            <p className="text-xs text-muted-text">
              If you have sent payment via bank wire, ACH, or check, let us know your transfer details below so our accounting team can verify and mark this invoice as paid.
            </p>

            {notifySent ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center space-y-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <p className="text-xs font-semibold">Payment Notification Sent!</p>
              </div>
            ) : (
              <form onSubmit={handleNotifyPayment} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-text mb-1">
                    Bank Reference / Transaction ID
                  </label>
                  <input
                    type="text"
                    required
                    value={notifyReference}
                    onChange={(e) => setNotifyReference(e.target.value)}
                    placeholder="e.g. Wire confirmation #, Chase transfer ref"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notifyNotes}
                    onChange={(e) => setNotifyNotes(e.target.value)}
                    placeholder="Sent from Account ending in 4102..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNotifyModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    disabled={notifyLoading}
                  >
                    {notifyLoading ? "Submitting..." : "Send Confirmation"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
