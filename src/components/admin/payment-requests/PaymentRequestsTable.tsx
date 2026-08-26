import { useLanguage } from "../../../contexts/LanguageContext";
import React, { useState } from "react";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  Edit3, 
  Trash2, 
  FileText, 
  Paperclip, 
  Link as LinkIcon, 
  CheckCheck,
  RotateCcw,
  MoreVertical,
  Calendar,
  User,
  ShieldCheck,
  Send
} from "lucide-react";
import { PaymentRequest, PaymentRequestStatus } from "../../../types";
import { formatConfiguredCurrency } from "../../../lib/currency";

interface PaymentRequestsTableProps {
  requests: PaymentRequest[];
  isLoading: boolean;
  isSuperAdmin: boolean;
  currentUserId: string;
  currency: string;
  onView: (request: PaymentRequest) => void;
  onReview: (request: PaymentRequest) => void;
  onEdit: (request: PaymentRequest) => void;
  onDelete: (requestId: string) => void;
  onOpenCreateModal: () => void;
}

export function PaymentRequestsTable({
  requests,
  isLoading,
  isSuperAdmin,
  currentUserId,
  currency,
  onView,
  onReview,
  onEdit,
  onDelete,
  onOpenCreateModal
}: PaymentRequestsTableProps) {
  const { tUi } = useLanguage();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const formatMoney = (amount: number, curr: string = currency) => formatConfiguredCurrency(amount, curr, { maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "–";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status: PaymentRequestStatus) => {
    switch (status) {
      case "pending":
      case "resubmitted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>{status === "resubmitted" ? "Resubmitted" : "Pending Review"}</span>
          </span>
        );
      case "approved":
      case "paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
          </span>
        );
      case "denied":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
            <XCircle className="w-3.5 h-3.5" />
            <span>Denied</span>
          </span>
        );
      case "on_hold":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>On Hold</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-text">
            {status}
          </span>
        );
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    if (email) return email.substring(0, 2).toUpperCase();
    return "US";
  };

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center shadow-sm">
        <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-muted-text">Loading payment requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-surface border border-dashed border-border rounded-xl p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-text mb-1">No payment requests found</h3>
        <p className="text-xs text-muted-text max-w-md mx-auto mb-5">
          Coworkers can create payment requests for expenses, gear purchases, or contractor payouts that route to the Superadmin for review.
        </p>
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Submit Payment Request</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-hover/70 border-b border-border text-muted-text font-medium uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Request # & Date</th>
              <th className="py-3 px-4">Requester</th>
              <th className="py-3 px-4">Title & Category</th>
              <th className="py-3 px-4">Linked Reference</th>
              <th className="py-3 px-4 text-right">{tUi("admin.budget.table.th_amount")}</th>
              <th className="py-3 px-4 text-center">{tUi("admin.clients.th_status")}</th>
              <th className="py-3 px-4 text-center">Review Info</th>
              <th className="py-3 px-4 text-right">{tUi("admin.clients.th_actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((req) => {
              const isOwner = req.requester_id === currentUserId;
              const isPending = req.status === "pending" || req.status === "resubmitted";
              const isDenied = req.status === "denied";
              const isOnHold = req.status === "on_hold";
              const hasAttachments = req.attachments && req.attachments.length > 0;

              return (
                <tr
                  key={req.id}
                  className={`hover:bg-surface-hover/50 transition-colors ${
                    isDenied ? "bg-rose-500/[0.02]" : isPending ? "bg-amber-500/[0.02]" : ""
                  }`}
                >
                  {/* 1. Request Number & Date */}
                  <td className="py-3.5 px-4 font-mono font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="text-text font-bold">{req.request_number}</span>
                      {hasAttachments && (
                        <span 
                          title={`${req.attachments?.length} attached file(s)`}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-primary/10 text-primary font-sans"
                        >
                          <Paperclip className="w-2.5 h-2.5" />
                          <span>{req.attachments?.length}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-text mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-text" />
                      <span>{formatDate(req.created_at)}</span>
                    </div>
                  </td>

                  {/* 2. Requester Info */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs overflow-hidden flex-shrink-0">
                        {req.requester_avatar ? (
                          <img
                            src={req.requester_avatar}
                            alt={req.requester_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitials(req.requester_name, req.requester_email)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-text font-medium truncate flex items-center gap-1">
                          <span>{req.requester_name || "Coworker"}</span>
                          {isOwner && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-primary/10 text-primary font-bold">
                              {tUi("admin.team.you_badge")}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-text truncate">
                          {req.requester_email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 3. Title & Category */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="text-text font-medium truncate" title={req.title}>
                      {req.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-hover text-muted-text capitalize">
                        {req.category?.replace(/_/g, " ") || "General"}
                      </span>
                      {req.due_date && (
                        <span className="text-[10px] text-muted-text">
                          Due: {formatDate(req.due_date)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 4. Linked Reference */}
                  <td className="py-3.5 px-4">
                    {req.link_type === "budget_entry" && req.linked_budget_entry ? (
                      <div className="flex items-center gap-1.5 text-xs text-text bg-primary/5 border border-primary/20 px-2 py-1 rounded-md">
                        <LinkIcon className="w-3 h-3 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium text-primary truncate max-w-[140px]">
                            {req.linked_budget_entry.description || "Budget Entry"}
                          </div>
                          <div className="text-[9px] text-muted-text">
                            {formatMoney(req.linked_budget_entry.amount, req.linked_budget_entry.currency)} • {req.linked_budget_entry.status}
                          </div>
                        </div>
                      </div>
                    ) : req.link_type === "invoice" && req.linked_invoice ? (
                      <div className="flex items-center gap-1.5 text-xs text-text bg-indigo-500/5 border border-indigo-500/20 px-2 py-1 rounded-md">
                        <FileText className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]">
                            {req.linked_invoice.invoice_number}
                          </div>
                          <div className="text-[9px] text-muted-text">
                            {req.linked_invoice.client_name} • {formatMoney(req.linked_invoice.total_amount, req.linked_invoice.currency)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-text italic">
                        Standalone
                      </span>
                    )}
                  </td>

                  {/* 5. Amount */}
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="text-sm font-bold text-text">
                      {formatMoney(req.amount, req.currency)}
                    </span>
                    <div className="text-[10px] text-muted-text">
                      {req.currency}
                    </div>
                  </td>

                  {/* 6. Status Badge */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {renderStatusBadge(req.status)}
                  </td>

                  {/* 7. Review Info & Notes */}
                  <td className="py-3.5 px-4 text-center">
                    {req.reviewed_by_name ? (
                      <div className="text-left inline-block max-w-[130px]">
                        <div className="text-[10px] font-semibold text-text flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          <span className="truncate">{req.reviewed_by_name}</span>
                        </div>
                        {req.review_notes ? (
                          <div
                            className={`text-[10px] truncate max-w-[120px] ${
                              isDenied ? "text-rose-500 font-medium" : "text-muted-text"
                            }`}
                            title={req.review_notes}
                          >
                            "{req.review_notes}"
                          </div>
                        ) : (
                          <div className="text-[9px] text-muted-text">
                            {formatDate(req.reviewed_at || "")}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-text italic">
                        Pending review
                      </span>
                    )}
                  </td>

                  {/* 8. Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Superadmin Quick Review Button */}
                      {isSuperAdmin && (isPending || isOnHold) && (
                        <button
                          onClick={() => onReview(req)}
                          className="px-2.5 py-1 bg-primary text-white hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                          title="Review & decide on this request"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      )}

                      {/* View Details */}
                      <button
                        onClick={() => onView(req)}
                        title="View request details & audit log"
                        className="p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-surface-hover transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Resubmit / Edit for Coworker (when denied/on hold/pending) */}
                      {(isOwner || isSuperAdmin) && (isDenied || isOnHold || isPending) && (
                        <button
                          onClick={() => onEdit(req)}
                          title={isDenied ? "Edit & Resubmit Request" : "Edit Details"}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDenied
                              ? "text-amber-500 hover:bg-amber-500/10 font-bold"
                              : "text-muted-text hover:text-text hover:bg-surface-hover"
                          }`}
                        >
                          {isDenied ? (
                            <RotateCcw className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Edit3 className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {/* Delete */}
                      {(isSuperAdmin || (isOwner && (isPending || isDenied))) && (
                        <button
                          onClick={() => onDelete(req.id)}
                          title="Delete Request"
                          className="p-1.5 rounded-lg text-muted-text hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
