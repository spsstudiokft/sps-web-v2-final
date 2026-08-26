import { useLanguage } from "../../../contexts/LanguageContext";
import React, { useState } from "react";
import { 
  X, 
  CreditCard, 
  Calendar, 
  FileText, 
  Send, 
  Check, 
  DollarSign,
  AlertCircle
} from "lucide-react";
import { Invoice } from "../../../types";
import { Button } from "../../ui/Button";
import { formatConfiguredCurrency } from "../../../lib/currency";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onRecord: (paymentData: any) => Promise<void>;
  showToast: (message: string, type?: "success" | "error") => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoice,
  onRecord,
  showToast
}: RecordPaymentModalProps) {
  const { tUi } = useLanguage();
  if (!isOpen || !invoice) return null;

  const remainingDue = Math.max(0, Number(invoice.total_amount) - Number(invoice.amount_paid));

  const [amount, setAmount] = useState<number>(remainingDue);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");
  const [sendReceipt, setSendReceipt] = useState(true);
  const [loading, setLoading] = useState(false);

  const formatMoney = (val: number) => formatConfiguredCurrency(val, invoice.currency || "USD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      showToast("Please enter a valid payment amount", "error");
      return;
    }

    setLoading(true);
    try {
      await onRecord({
        amount: Number(amount),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        transaction_reference: transactionReference.trim(),
        notes: notes.trim(),
        send_receipt: sendReceipt
      });
      showToast("Payment recorded successfully", "success");
      onClose();
    } catch (err: any) {
      console.error("Payment recording error:", err);
      showToast(err.message || "Failed to record payment", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text font-heading">
                Record Payment
              </h3>
              <p className="text-xs text-muted-text">
                Invoice {invoice.invoice_number} · {invoice.client_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-text hover:text-text p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Outstanding Summary */}
          <div className="bg-background/80 border border-border rounded-xl p-3.5 flex justify-between items-center text-xs">
            <div>
              <span className="text-muted-text block">Total Invoiced:</span>
              <span className="font-bold text-text">{formatMoney(invoice.total_amount)}</span>
            </div>
            <div>
              <span className="text-muted-text block">Already Paid:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(invoice.amount_paid)}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-text block">Remaining Due:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{formatMoney(remainingDue)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Payment Amount ({invoice.currency}) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-semibold text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setAmount(remainingDue)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded hover:bg-primary/20 transition-colors"
              >
                Pay Full Balance
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="bank_transfer">Bank Transfer (ACH / Wire)</option>
                <option value="credit_card">Credit Card (Stripe / POS)</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Transaction / Check Reference
            </label>
            <input
              type="text"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              placeholder="e.g. TXN-98421 or Check #1042"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Internal Note (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received via Chase wire transfer"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-text">
            <input
              type="checkbox"
              checked={sendReceipt}
              onChange={(e) => setSendReceipt(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary w-4 h-4"
            />
            <span>Send automated payment confirmation receipt email to client ({invoice.client_email})</span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              {tUi("admin.clients.cancel")}</Button>

            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={loading}
              className="inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {loading ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
