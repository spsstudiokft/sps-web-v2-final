import React, { useState } from "react";
import { 
  X, 
  Send, 
  Mail, 
  FileText, 
  Link as LinkIcon, 
  Check, 
  AlertCircle,
  Clock,
  User
} from "lucide-react";
import { Invoice } from "../../../types";
import { Button } from "../../ui/Button";
import { formatConfiguredCurrency } from "../../../lib/currency";

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSend: (customMessage: string, paymentLinkOverride?: string) => Promise<void>;
  showToast: (message: string, type?: "success" | "error") => void;
}

export function SendInvoiceModal({
  isOpen,
  onClose,
  invoice,
  onSend,
  showToast
}: SendInvoiceModalProps) {
  if (!isOpen || !invoice) return null;

  const [customMessage, setCustomMessage] = useState(invoice.notes || "");
  const [paymentLinkOverride, setPaymentLinkOverride] = useState(invoice.payment_link || "");
  const [loading, setLoading] = useState(false);

  const amountDue = Math.max(0, Number(invoice.total_amount) - Number(invoice.amount_paid));

  const formatMoney = (val: number) => formatConfiguredCurrency(val, invoice.currency || "USD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSend(customMessage.trim(), paymentLinkOverride.trim() || undefined);
      showToast(`Payment request email dispatched to ${invoice.client_email}`, "success");
      onClose();
    } catch (err: any) {
      console.error("Send invoice error:", err);
      showToast(err.message || "Failed to send invoice email", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text font-heading">
                Send Payment Request Email
              </h3>
              <p className="text-xs text-muted-text">
                Dispatch branded transactional invoice email with one-click payment link.
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

        {/* Body */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          {/* Recipient summary card */}
          <div className="bg-background/80 border border-border rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-text">Recipient:</span>
              <span className="font-semibold text-text">{invoice.client_name} &lt;{invoice.client_email}&gt;</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-text">Invoice Number:</span>
              <span className="font-mono font-bold text-text">{invoice.invoice_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-text">Amount Due:</span>
              <span className="font-bold text-primary text-sm">{formatMoney(amountDue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-text">Due Date:</span>
              <span className="font-medium text-text">{invoice.due_date}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Payment Link / Portal URL (Included in Email Action Button)
            </label>
            <div className="relative">
              <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
              <input
                type="text"
                value={paymentLinkOverride}
                onChange={(e) => setPaymentLinkOverride(e.target.value)}
                placeholder="Leave blank to use default secure public invoice portal URL"
                className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <span className="text-[10px] text-muted-text mt-1 block">
              Clients can view full line-item details, pay online, or download PDF via this link.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Personalized Message / Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Hi there, please find attached the invoice for our recent property photoshoot. Let us know if you have any questions!"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-[11px] text-muted-text flex items-start gap-2">
            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>
              This email will automatically adopt the studio branding, typography, color palette, and layout configured in your Email Template manager.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={loading}
              className="inline-flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              {loading ? "Sending Email..." : "Send Payment Request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
