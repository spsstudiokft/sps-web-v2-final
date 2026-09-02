import React, { useState, useEffect, useRef } from "react";
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
import { ErrorPage, ErrorStatus } from "./ErrorPage";
import { useLanguage } from "../contexts/LanguageContext";
import { getInvoiceCopy, invoiceLocale } from "../lib/invoiceTranslations";

export default function PublicInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const requestedLanguage = searchParams.get("lang");
  const { currentLang, setLang, enabledLangs } = useLanguage();
  const appliedRequestedLanguage = useRef(false);

  const [invoice, setInvoice] = useState<any>(null);
  const [studio, setStudio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<ErrorStatus>(404);

  // Intent form state
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyReference, setNotifyReference] = useState("");
  const [notifyNotes, setNotifyNotes] = useState("");
  const [notifySent, setNotifySent] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id, token]);

  useEffect(() => {
    const sessionId = searchParams.get("stripe_checkout");
    if (!id || !token || !sessionId) return;
    fetch(`/api/public/invoices/${id}/stripe-confirm?token=${encodeURIComponent(token)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId })
    }).then((res) => { if (res.ok) return fetchInvoice(); }).catch(() => undefined);
  }, [id, token, searchParams]);

  useEffect(() => {
    if (!appliedRequestedLanguage.current && requestedLanguage && enabledLangs.some((language) => language.code === requestedLanguage)) {
      appliedRequestedLanguage.current = true;
      if (requestedLanguage !== currentLang) setLang(requestedLanguage);
    }
  }, [requestedLanguage, enabledLangs, currentLang, setLang]);

  const copy = (key: string, replacements?: Record<string, string | number>) => getInvoiceCopy(currentLang, key, replacements);

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/public/invoices/${id}${token ? `?token=${token}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setErrorStatus(res.status === 401 ? 401 : res.status === 403 ? 403 : res.status === 503 ? 503 : res.status >= 500 ? 500 : 404);
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

  const handleStripeCheckout = async () => {
    if (!token) return;
    setStripeLoading(true);
    try {
      const res = await fetch(`/api/public/invoices/${id}/stripe-checkout?token=${encodeURIComponent(token)}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkout_url) throw new Error(data.error || "Stripe Checkout is unavailable");
      window.location.assign(data.checkout_url);
    } catch (err: any) {
      setError(err.message || "Stripe Checkout is unavailable");
      setErrorStatus(503);
    } finally { setStripeLoading(false); }
  };

  const formatMoney = (val: number, curr: string = "USD") => {
    return new Intl.NumberFormat(invoiceLocale[currentLang] || invoiceLocale.en, {
      style: "currency",
      currency: curr || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const date = new Date(`${value.slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(invoiceLocale[currentLang] || invoiceLocale.en, {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-text">{copy("loading")}</p>
      </div>
    );
  }

  if (error || !invoice) {
    return <ErrorPage status={errorStatus} />;
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
                  {copy("invoice")}: {invoice.invoice_number}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                  isPaid
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                }`}>
                  {isPaid ? copy("paidFull") : copy("due", { date: formatDate(invoice.due_date) })}
                </span>
              </div>
              <p className="text-xs text-muted-text mt-0.5">
                {isPaid
                  ? copy("paidThanks")
                  : copy("amountDue", { amount: formatMoney(amountDue, invoice.currency) })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <select
              aria-label="Invoice language"
              value={currentLang}
              onChange={(event) => setLang(event.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-medium text-text outline-none focus:ring-2 focus:ring-primary/40 print:hidden"
            >
              {enabledLangs.map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              {copy("print")}
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
                    {copy("payOnline")}
                  </a>
                ) : token && invoice.stripe_checkout_available ? (
                  <Button type="button" variant="primary" size="sm" onClick={handleStripeCheckout} disabled={stripeLoading} className="text-xs inline-flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    {stripeLoading ? copy("loading") : `${copy("payOnline")} · Stripe`}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setShowNotifyModal(true)}
                    className="text-xs inline-flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {copy("paymentSent")}
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
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                {studio?.logoLightUrl ? (
                  <img
                    src={studio.logoLightUrl}
                    alt={studio?.logoAltText || studio?.name || "SPS Studio"}
                    className="h-10 w-auto max-w-[170px] object-contain object-left"
                  />
                ) : (
                  <span className="font-heading font-black text-2xl tracking-tighter text-text">SPS</span>
                )}
                <span className="font-heading text-lg font-semibold tracking-tight text-text">{studio?.name || "SPS Studio"}</span>
              </div>
              <p className="text-xs text-muted-text font-medium">
                {copy("serviceDescription")}
              </p>
              <p className="text-xs text-muted-text">
                {studio?.fromEmail || "billing@spsstudio.com"}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <h1 className="text-2xl font-black font-heading tracking-tight uppercase text-text">
                {copy("invoice")}
              </h1>
              <div className="mt-1 font-mono font-bold text-sm text-primary">
                {invoice.invoice_number}
              </div>
              <div className="text-xs text-muted-text mt-1 space-y-0.5">
                <div>{copy("issued")}: <strong className="text-text">{formatDate(invoice.issue_date)}</strong></div>
                <div>{copy("dueDate")}: <strong className="text-text">{formatDate(invoice.due_date)}</strong></div>
              </div>
            </div>
          </div>

          {/* Email-template aligned invoice summary */}
          <section className="invoice-summary invoice-print-section rounded-xl border border-border p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 border-b border-border pb-4 mb-3">
              <div className="min-w-0">
                <span className="text-[11px] uppercase text-muted-text font-bold tracking-wider">
                  {copy("invoiceNumber")}
                </span>
                <div className="text-lg font-extrabold text-text font-mono mt-0.5">
                  {invoice.invoice_number}
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <span className="text-[11px] uppercase text-muted-text font-bold tracking-wider">
                  {isPaid ? copy("paymentStatus") : copy("amountDueLabel")}
                </span>
                <div className={`text-xl sm:text-2xl font-extrabold mt-0.5 ${isPaid ? "text-emerald-700" : "text-text"}`}>
                  {isPaid ? copy("fullySettled") : formatMoney(amountDue, invoice.currency)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-muted-text">{copy("issued")}:</span>
                <strong className="text-text">{formatDate(invoice.issue_date)}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-text">{copy("dueDate")}:</span>
                <strong className={isPaid ? "text-text" : "text-rose-600"}>{formatDate(invoice.due_date)}</strong>
              </div>
              {invoice.property_address && (
                <div className="col-span-2 flex items-start gap-3 pt-1">
                  <span className="text-muted-text shrink-0">{copy("property")}:</span>
                  <strong className="text-text">{invoice.property_address}</strong>
                </div>
              )}
            </div>
          </section>

          {/* Client & Property Details */}
          <section className="invoice-print-section grid grid-cols-1 sm:grid-cols-2 gap-6 bg-background/50 p-5 rounded-xl border border-border">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-text block mb-1.5">
                {copy("billedTo")}
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
                {copy("serviceLocation")}
              </span>
              {invoice.property_address ? (
                <div className="text-xs text-text font-medium flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{invoice.property_address}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-text italic">
                  {copy("serviceFallback")}
                </div>
              )}
            </div>
          </section>

          {/* Items Table */}
          <section className="invoice-line-items overflow-hidden border border-border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-muted-text font-bold uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="py-3 px-4">{copy("description")}</th>
                  <th className="py-3 px-4 text-center">{copy("quantity")}</th>
                  <th className="py-3 px-4 text-right">{copy("unitPrice")}</th>
                  <th className="py-3 px-4 text-right">{copy("amount")}</th>
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
                    {copy("paymentTerms")}:
                  </span>
                  <p className="text-xs text-muted-text">
                    {invoice.payment_terms}
                  </p>
                </div>
              )}

              {invoice.payment_method_instructions && (
                <div className="invoice-payment-instructions bg-background p-4 rounded-xl border border-border">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-1">
                    {copy("paymentInstructions")}:
                  </span>
                  <p className="text-xs text-muted-text whitespace-pre-line font-mono">
                    {invoice.payment_method_instructions}
                  </p>
                </div>
              )}

              {invoice.notes && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-text block mb-1">
                    {copy("notes")}:
                  </span>
                  <p className="text-xs text-muted-text italic">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-muted-text">
                <span>{copy("subtotal")}:</span>
                <span className="font-semibold text-text">
                  {formatMoney(invoice.subtotal, invoice.currency)}
                </span>
              </div>

              {Number(invoice.tax_rate) > 0 && (
                <div className="flex justify-between text-muted-text">
                  <span>{copy("tax")} ({invoice.tax_rate}%):</span>
                  <span className="font-semibold text-text">
                    {formatMoney(invoice.tax_amount, invoice.currency)}
                  </span>
                </div>
              )}

              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-muted-text">
                  <span>{copy("discount")}:</span>
                  <span className="font-semibold text-rose-500">
                    -{formatMoney(invoice.discount_amount, invoice.currency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2.5 border-t border-border text-sm font-bold">
                <span className="text-text font-heading">{copy("total")}:</span>
                <span className="text-base text-primary font-heading">
                  {formatMoney(invoice.total_amount, invoice.currency)}
                </span>
              </div>

              <div className="flex justify-between text-muted-text pt-1">
                <span>{copy("amountPaid")}:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(invoice.amount_paid, invoice.currency)}
                </span>
              </div>

              <div className={`flex justify-between items-center pt-2 border-t border-border font-bold text-sm ${
                amountDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
              }`}>
                <span>{copy("balanceDue")}:</span>
                <span>{formatMoney(amountDue, invoice.currency)}</span>
              </div>
            </div>
          </section>

          {/* Payment Receipts History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <section className="invoice-receipts invoice-print-section pt-4 border-t border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {copy("receipts")}
              </h4>
              <div className="overflow-hidden border border-border rounded-lg text-xs">
                <table className="w-full text-left">
                  <thead className="bg-background text-muted-text text-[11px]">
                    <tr>
                      <th className="p-2">{copy("date")}</th>
                      <th className="p-2">{copy("method")}</th>
                      <th className="p-2">{copy("reference")}</th>
                      <th className="p-2 text-right">{copy("amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoice.payments.map((p: any, i: number) => (
                      <tr key={i}>
                        <td className="p-2 text-muted-text">{formatDate(p.payment_date)}</td>
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
            <p>{copy("footer")}</p>
            <p className="mt-1 text-[11px]">
              {copy("billingContact")} {studio?.fromEmail || "billing@spsstudio.com"}.
            </p>
          </footer>
        </article>
      </div>

      {/* Payment Confirmation Notification Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-text font-heading">
              {copy("notifyTitle")}
            </h3>
            <p className="text-xs text-muted-text">
              {copy("notifyText")}
            </p>

            {notifySent ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center space-y-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <p className="text-xs font-semibold">{copy("notifySent")}</p>
              </div>
            ) : (
              <form onSubmit={handleNotifyPayment} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-text mb-1">
                    {copy("transactionReference")}
                  </label>
                  <input
                    type="text"
                    required
                    value={notifyReference}
                    onChange={(e) => setNotifyReference(e.target.value)}
                    placeholder={copy("transactionPlaceholder")}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">
                    {copy("additionalNotes")}
                  </label>
                  <textarea
                    rows={2}
                    value={notifyNotes}
                    onChange={(e) => setNotifyNotes(e.target.value)}
                    placeholder={copy("notesPlaceholder")}
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
                    {copy("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={notifyLoading}
                  >
                    {notifyLoading ? copy("sending") : copy("sendConfirmation")}
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
