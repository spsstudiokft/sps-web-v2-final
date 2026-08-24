import React, { useState } from "react";
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  DollarSign, 
  Calendar, 
  User, 
  Paperclip, 
  Building2, 
  Link as LinkIcon,
  AlertCircle
} from "lucide-react";
import { PaymentRequest } from "../../../types";
import { formatConfiguredCurrency } from "../../../lib/currency";

interface PaymentRequestReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PaymentRequest | null;
  currency: string;
  token: string | null;
  onSuccess: (message: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export function PaymentRequestReviewModal({
  isOpen,
  onClose,
  request,
  currency,
  token,
  onSuccess,
  showToast
}: PaymentRequestReviewModalProps) {
  if (!isOpen || !request) return null;

  const [action, setAction] = useState<"approve" | "deny" | "on_hold">("approve");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [createBudgetOutcome, setCreateBudgetOutcome] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatMoney = (amount: number, curr: string = request.currency || currency) => formatConfiguredCurrency(amount, curr || "USD", { maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "–";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (action === "deny" && (!reviewNotes || !reviewNotes.trim())) {
      setErrorMsg("A comment/reason is strictly required when denying a payment request so the coworker understands why.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/payment-requests/${request.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          review_notes: reviewNotes.trim(),
          create_budget_outcome: createBudgetOutcome
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      const actionText =
        action === "approve"
          ? "approved and logged in the budget system"
          : action === "deny"
          ? "denied with feedback sent to the requester"
          : "placed on hold";

      onSuccess(`Payment request ${request.request_number} has been ${actionText}`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
          <div>
            <h2 className="text-base font-bold text-text flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>Review Payment Request: {request.request_number}</span>
            </h2>
            <p className="text-xs text-muted-text mt-0.5">
              Superadmin review & authorization decision for coworker expenditure.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Request Overview Card */}
          <div className="p-4 bg-surface-hover/40 border border-border rounded-xl space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold text-muted-text uppercase tracking-wider">
                  Requested Amount
                </div>
                <div className="text-2xl font-bold font-mono text-text mt-0.5">
                  {formatMoney(request.amount, request.currency)}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-surface border border-border text-text capitalize">
                  {request.category?.replace(/_/g, " ") || "General"}
                </span>
                <div className="text-[11px] text-muted-text mt-1">
                  Created {formatDate(request.created_at)}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-text" />
                <span className="text-muted-text">Requester:</span>
                <span className="font-medium text-text">{request.requester_name}</span>
                <span className="text-muted-text">({request.requester_email})</span>
              </div>

              <div className="text-text font-medium">
                <span className="text-muted-text font-normal">Title: </span>
                {request.title}
              </div>

              {request.description && (
                <div className="text-muted-text italic bg-background/50 p-2 rounded-lg border border-border/40 text-[11px]">
                  "{request.description}"
                </div>
              )}

              {/* Beneficiary */}
              {(request.beneficiary_name || request.beneficiary_account) && (
                <div className="pt-1 flex items-center gap-2 text-[11px] text-muted-text">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Payee: </span>
                  <span className="font-medium text-text font-mono">
                    {request.beneficiary_name} {request.beneficiary_account ? `(${request.beneficiary_account})` : ""}
                  </span>
                </div>
              )}

              {/* Linked items */}
              {request.linked_budget_entry && (
                <div className="flex items-center gap-1.5 text-[11px] text-primary bg-primary/10 px-2 py-1 rounded">
                  <LinkIcon className="w-3 h-3" />
                  <span>Linked Budget Entry: {request.linked_budget_entry.description} ({request.linked_budget_entry.amount} {request.linked_budget_entry.currency})</span>
                </div>
              )}

              {request.linked_invoice && (
                <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                  <FileText className="w-3 h-3" />
                  <span>Linked Invoice: {request.linked_invoice.invoice_number} – {request.linked_invoice.client_name}</span>
                </div>
              )}

              {/* Attachments */}
              {request.attachments && request.attachments.length > 0 && (
                <div className="pt-1">
                  <div className="text-[10px] font-semibold text-muted-text uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    <span>Receipts & Attached Documents ({request.attachments.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {request.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-[11px] text-primary hover:bg-primary/5 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        <span className="truncate max-w-[140px]">{att.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Decision Selector */}
          <div>
            <label className="block text-xs font-semibold text-text mb-2">
              Select Review Decision <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Approve */}
              <button
                type="button"
                onClick={() => setAction("approve")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center ${
                  action === "approve"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "bg-surface border-border text-muted-text hover:text-text hover:bg-surface-hover"
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-xs font-bold">Approve</span>
              </button>

              {/* Deny */}
              <button
                type="button"
                onClick={() => setAction("deny")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center ${
                  action === "deny"
                    ? "bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm"
                    : "bg-surface border-border text-muted-text hover:text-text hover:bg-surface-hover"
                }`}
              >
                <XCircle className="w-5 h-5" />
                <span className="text-xs font-bold">Deny</span>
              </button>

              {/* On Hold */}
              <button
                type="button"
                onClick={() => setAction("on_hold")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center ${
                  action === "on_hold"
                    ? "bg-purple-500/15 border-purple-500 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "bg-surface border-border text-muted-text hover:text-text hover:bg-surface-hover"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
                <span className="text-xs font-bold">Put On Hold</span>
              </button>
            </div>
          </div>

          {/* Comments / Denial Reason */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Reviewer Comments & Feedback {action === "deny" ? <span className="text-rose-500 font-bold">* (Required for denial)</span> : "(Optional)"}
            </label>
            <textarea
              rows={3}
              required={action === "deny"}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                action === "deny"
                  ? "Explain why this payment request was denied (e.g., missing receipt, incorrect amount, please resubmit with project code)..."
                  : action === "on_hold"
                  ? "Specify what is needed before approving (e.g., awaiting invoice from vendor)..."
                  : "Add any optional approval remarks or bank transfer confirmation notes..."
              }
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-background text-text focus:outline-none focus:ring-1 resize-y ${
                action === "deny"
                  ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500"
                  : "border-border focus:border-primary focus:ring-primary"
              }`}
            />
          </div>

          {/* Auto-Budget Integration Checkbox */}
          {action === "approve" && !request.linked_budget_entry_id && (
            <label className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={createBudgetOutcome}
                onChange={(e) => setCreateBudgetOutcome(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs text-text font-medium">
                Automatically log this approved amount as a confirmed Outcome in the Budget & Cashflow Manager
              </span>
            </label>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-hover/30 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-muted-text hover:text-text rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              action === "approve"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : action === "deny"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : action === "approve" ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Authorize & Approve Request</span>
              </>
            ) : action === "deny" ? (
              <>
                <XCircle className="w-4 h-4" />
                <span>Confirm Denial</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>Set to On Hold</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
