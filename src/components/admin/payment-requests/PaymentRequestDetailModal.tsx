import React from "react";
import { 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  Paperclip, 
  Link as LinkIcon, 
  ShieldCheck, 
  RotateCcw,
  Building2,
  ExternalLink,
  History
} from "lucide-react";
import { PaymentRequest } from "../../../types";
import { formatConfiguredCurrency } from "../../../lib/currency";

interface PaymentRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PaymentRequest | null;
  currency: string;
  isSuperAdmin: boolean;
  currentUserId: string;
  onOpenReview: (request: PaymentRequest) => void;
  onOpenEdit: (request: PaymentRequest) => void;
}

export function PaymentRequestDetailModal({
  isOpen,
  onClose,
  request,
  currency,
  isSuperAdmin,
  currentUserId,
  onOpenReview,
  onOpenEdit
}: PaymentRequestDetailModalProps) {
  if (!isOpen || !request) return null;

  const isOwner = request.requester_id === currentUserId;
  const isPending = request.status === "pending" || request.status === "resubmitted";
  const isDenied = request.status === "denied";
  const isOnHold = request.status === "on_hold";

  const formatMoney = (amount: number, curr: string = request.currency || currency) => formatConfiguredCurrency(amount, curr || "USD", { maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "–";
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = () => {
    switch (request.status) {
      case "pending":
      case "resubmitted":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span>{request.status === "resubmitted" ? "Resubmitted (Pending)" : "Pending Review"}</span>
          </span>
        );
      case "approved":
      case "paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved by Superadmin</span>
          </span>
        );
      case "denied":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            <span>Denied</span>
          </span>
        );
      case "on_hold":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>On Hold</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-text">
            {request.status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text font-mono">
                  {request.request_number}
                </h2>
                {renderStatusBadge()}
              </div>
              <p className="text-xs text-muted-text mt-0.5">
                Submitted on {formatDate(request.created_at)}
              </p>
            </div>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Key Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount & Category */}
            <div className="p-4 bg-surface-hover/40 border border-border rounded-xl">
              <div className="text-xs font-semibold text-muted-text uppercase tracking-wider">
                Requested Amount
              </div>
              <div className="text-2xl font-bold font-mono text-text mt-1">
                {formatMoney(request.amount, request.currency)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface border border-border text-text capitalize">
                  {request.category?.replace(/_/g, " ") || "General"}
                </span>
                {request.due_date && (
                  <span className="text-xs text-muted-text">
                    Due: {formatDate(request.due_date)}
                  </span>
                )}
              </div>
            </div>

            {/* Requester Profile */}
            <div className="p-4 bg-surface-hover/40 border border-border rounded-xl">
              <div className="text-xs font-semibold text-muted-text uppercase tracking-wider">
                Requester Profile
              </div>
              <div className="flex items-center gap-2.5 mt-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-indigo-500 text-white text-xs font-bold flex items-center justify-center shadow-xs overflow-hidden">
                  {request.requester_avatar ? (
                    <img
                      src={request.requester_avatar}
                      alt={request.requester_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    request.requester_name?.substring(0, 2).toUpperCase() || "US"
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text flex items-center gap-1.5">
                    <span>{request.requester_name}</span>
                    {isOwner && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/15 text-primary font-bold">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-text">
                    {request.requester_email} ({request.requester_role || "Coworker"})
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-text">{request.title}</h3>
            {request.description ? (
              <p className="text-xs text-muted-text whitespace-pre-wrap leading-relaxed bg-surface-hover/30 p-3 rounded-xl border border-border/60">
                {request.description}
              </p>
            ) : (
              <p className="text-xs text-muted-text italic">No additional description provided.</p>
            )}
          </div>

          {/* Payee / Beneficiary Info */}
          {(request.beneficiary_name || request.beneficiary_account || request.payment_method) && (
            <div className="p-3.5 bg-surface border border-border rounded-xl text-xs space-y-1.5">
              <div className="font-semibold text-text flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>Payment & Payee Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-text pt-1">
                <div>
                  <span className="font-medium">Method: </span>
                  <span className="text-text capitalize">{request.payment_method?.replace(/_/g, " ")}</span>
                </div>
                {request.beneficiary_name && (
                  <div>
                    <span className="font-medium">Payee: </span>
                    <span className="text-text font-semibold">{request.beneficiary_name}</span>
                  </div>
                )}
                {request.beneficiary_account && (
                  <div className="sm:col-span-2">
                    <span className="font-medium">Account / IBAN: </span>
                    <span className="text-text font-mono bg-surface-hover px-1.5 py-0.5 rounded">
                      {request.beneficiary_account}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Linked Record Details */}
          {(request.linked_budget_entry || request.linked_invoice) && (
            <div className="p-3.5 bg-surface border border-border rounded-xl text-xs space-y-2">
              <div className="font-semibold text-text flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-primary" />
                <span>Linked System Record</span>
              </div>

              {request.linked_budget_entry && (
                <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-primary">
                      Budget Entry: {request.linked_budget_entry.description}
                    </div>
                    <div className="text-[11px] text-muted-text mt-0.5">
                      Amount: {formatMoney(request.linked_budget_entry.amount, request.linked_budget_entry.currency)} • Type: {request.linked_budget_entry.type} • Status: {request.linked_budget_entry.status}
                    </div>
                  </div>
                </div>
              )}

              {request.linked_invoice && (
                <div className="p-2.5 bg-indigo-500/5 border border-indigo-500/20 rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                      Client Invoice: {request.linked_invoice.invoice_number}
                    </div>
                    <div className="text-[11px] text-muted-text mt-0.5">
                      Client: {request.linked_invoice.client_name} • Total: {formatMoney(request.linked_invoice.total_amount, request.linked_invoice.currency)} • Status: {request.linked_invoice.status}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attachments Section */}
          {request.attachments && request.attachments.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-primary" />
                <span>Attached Receipts & Invoices ({request.attachments.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {request.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-surface-hover/50 hover:bg-surface-hover border border-border rounded-xl flex items-center justify-between text-xs transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-text truncate max-w-[160px]">
                          {att.name}
                        </div>
                        {att.size && (
                          <div className="text-[10px] text-muted-text">
                            {(att.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-text group-hover:text-primary transition-colors flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Audit Log / History Timeline */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="text-xs font-bold text-text flex items-center gap-1.5 uppercase tracking-wider">
              <History className="w-3.5 h-3.5 text-primary" />
              <span>Audit Trail & Approval History</span>
            </div>

            {request.action_history && request.action_history.length > 0 ? (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {request.action_history.map((hist, idx) => {
                  const isApprovedAction = hist.action === "approved";
                  const isDeniedAction = hist.action === "denied";
                  const isOnHoldAction = hist.action === "on_hold";
                  const isCreatedAction = hist.action === "created";

                  return (
                    <div key={hist.id || idx} className="relative">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 bg-surface flex items-center justify-center ${
                          isApprovedAction
                            ? "border-emerald-500 text-emerald-500"
                            : isDeniedAction
                            ? "border-rose-500 text-rose-500"
                            : isOnHoldAction
                            ? "border-purple-500 text-purple-500"
                            : "border-primary text-primary"
                        }`}
                      >
                        {isApprovedAction ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : isDeniedAction ? (
                          <XCircle className="w-3 h-3" />
                        ) : isOnHoldAction ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="bg-surface-hover/30 border border-border/80 rounded-xl p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-text capitalize">
                            {hist.action === "created"
                              ? "Payment Request Created"
                              : hist.action === "approved"
                              ? "Approved by Superadmin"
                              : hist.action === "denied"
                              ? "Denied by Superadmin"
                              : hist.action === "resubmitted"
                              ? "Request Resubmitted"
                              : `Status: ${hist.action}`}
                          </span>
                          <span className="text-[10px] text-muted-text font-mono">
                            {formatDate(hist.timestamp)}
                          </span>
                        </div>
                        <div className="text-muted-text mt-0.5">
                          Actor: <span className="text-text font-medium">{hist.actor_name}</span> ({hist.actor_role || "User"})
                        </div>
                        {hist.note && (
                          <div className={`mt-1.5 p-2 rounded-lg text-xs italic ${
                            isDeniedAction
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-background/60 text-text border border-border/40"
                          }`}>
                            "{hist.note}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-text italic">No history records logged yet.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-hover/30 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-muted-text hover:text-text rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {/* Superadmin Quick Review Button */}
            {isSuperAdmin && (isPending || isOnHold) && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReview(request);
                }}
                className="px-4 py-2 text-xs font-semibold bg-primary text-white hover:bg-primary/90 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Review Request</span>
              </button>
            )}

            {/* Coworker Resubmit / Edit Button */}
            {(isOwner || isSuperAdmin) && (isDenied || isOnHold || isPending) && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(request);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                  isDenied
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-surface border border-border text-text hover:bg-surface-hover"
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isDenied ? "Edit & Resubmit" : "Edit Request"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
