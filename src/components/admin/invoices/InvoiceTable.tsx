import React, { useState } from "react";
import { createPortal } from "react-dom";
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  CreditCard, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Copy, 
  Printer, 
  ExternalLink,
  Plus,
  Mail,
  User,
  MapPin,
  Calendar,
  Layers,
  Archive
} from "lucide-react";
import { Invoice, InvoiceStatus } from "../../../types";
import { Button } from "../../ui/Button";

interface InvoiceTableProps {
  invoices: Invoice[];
  currency?: string;
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoiceId: string) => void;
  onSend?: (invoice: Invoice) => void;
  onSendRequest?: (invoice: Invoice) => void;
  onDuplicate?: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
  onArchive: (invoice: Invoice) => void;
  onQuickStatusChange: (invoiceId: string, status: InvoiceStatus) => Promise<void>;
  onOpenNewModal: () => void;
  showToast?: (message: string, type?: "success" | "error") => void;
  currentAdminId?: string;
  isSuperAdmin?: boolean;
}

export function InvoiceTable({
  invoices,
  currency = "USD",
  onView,
  onEdit,
  onDelete,
  onSend,
  onSendRequest,
  onDuplicate,
  onRecordPayment,
  onArchive,
  onQuickStatusChange,
  onOpenNewModal,
  showToast
}: InvoiceTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  const toggleInvoiceMenu = (invoiceId: string, button: HTMLButtonElement) => {
    if (activeMenuId === invoiceId) {
      setActiveMenuId(null);
      setMenuPosition(null);
      return;
    }
    const rect = button.getBoundingClientRect();
    const openUpward = window.innerHeight - rect.bottom < 350 && rect.top > 350;
    setMenuPosition({
      ...(openUpward ? { bottom: Math.max(8, window.innerHeight - rect.top + 4) } : { top: Math.max(8, rect.bottom + 4) }),
      right: Math.max(8, window.innerWidth - rect.right),
    });
    setActiveMenuId(invoiceId);
  };

  const closeInvoiceMenu = () => {
    setActiveMenuId(null);
    setMenuPosition(null);
  };

  const handleSendInvoice = (inv: Invoice) => {
    if (typeof onSend === "function") {
      onSend(inv);
    } else if (typeof onSendRequest === "function") {
      onSendRequest(inv);
    }
  };

  const formatMoney = (amount: number, curr: string = currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "paid":
        return {
          label: "Paid",
          icon: CheckCircle2,
          className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
        };
      case "sent":
        return {
          label: "Sent",
          icon: Send,
          className: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
        };
      case "viewed":
        return {
          label: "Viewed",
          icon: Eye,
          className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
        };
      case "overdue":
        return {
          label: "Overdue",
          icon: AlertCircle,
          className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
        };
      case "draft":
        return {
          label: "Draft",
          icon: Clock,
          className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
        };
      case "cancelled":
        return {
          label: "Cancelled",
          icon: AlertCircle,
          className: "bg-surface text-muted-text border-border"
        };
      default:
        return {
          label: status,
          icon: FileText,
          className: "bg-surface text-text border-border"
        };
    }
  };

  const handleCopyLink = (inv: Invoice) => {
    const origin = window.location.origin;
    const url = `${origin}/invoice/${inv.id}?token=${inv.access_token}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast?.("Invoice payment link copied to clipboard", "success");
    }).catch(() => {
      showToast?.("Failed to copy link", "error");
    });
  };

  if (invoices.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center shadow-xs">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-text mb-1 font-heading">
          No invoices found
        </h3>
        <p className="text-xs text-muted-text max-w-sm mx-auto mb-5">
          There are no invoices matching your active filters. Create your first client invoice or bill directly from budget records.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={onOpenNewModal}
          className="inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create First Invoice
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-background border-b border-border text-muted-text font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">Invoice #</th>
              <th className="py-3.5 px-4">Client & Property</th>
              <th className="py-3.5 px-4">Issue / Due Date</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Amount</th>
              <th className="py-3.5 px-4 text-right">Paid</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {invoices.map((inv) => {
              const statusInfo = getStatusBadge(inv.status);
              const StatusIcon = statusInfo.icon;
              const isMenuOpen = activeMenuId === inv.id;
              const outstanding = Math.max(0, Number(inv.total_amount) - Number(inv.amount_paid));

              return (
                <tr 
                  key={inv.id}
                  className="hover:bg-surface-hover transition-colors group"
                >
                  {/* Invoice # */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <button
                          onClick={() => onView(inv)}
                          className="font-bold text-text hover:text-primary transition-colors text-xs font-mono text-left block"
                        >
                          {inv.invoice_number}
                        </button>
                        {inv.linked_budget_entry && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                            <Layers className="w-2.5 h-2.5" />
                            Linked to Cashflow
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Client & Property */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-text text-xs flex items-center gap-1.5">
                      <User className="w-3 h-3 text-muted-text flex-shrink-0" />
                      <span>{inv.client_name}</span>
                    </div>
                    <div className="text-[11px] text-muted-text truncate max-w-[200px]">
                      {inv.client_email}
                    </div>
                    {inv.property_address && (
                      <div className="text-[10px] text-muted-text flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-primary" />
                        <span className="truncate">{inv.property_address}</span>
                      </div>
                    )}
                  </td>

                  {/* Issue / Due Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="text-text font-medium">
                      Issued: {inv.issue_date}
                    </div>
                    <div className={`text-[11px] flex items-center gap-1 mt-0.5 ${
                      inv.status === "overdue" ? "text-rose-600 dark:text-rose-400 font-bold" : "text-muted-text"
                    }`}>
                      <Calendar className="w-3 h-3" />
                      <span>Due: {inv.due_date}</span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusInfo.className}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </span>
                  </td>

                  {/* Total Amount */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <span className="font-bold text-text text-xs">
                      {formatMoney(inv.total_amount, inv.currency)}
                    </span>
                    {outstanding > 0 && inv.status !== "draft" && inv.status !== "paid" && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                        Due: {formatMoney(outstanding, inv.currency)}
                      </div>
                    )}
                  </td>

                  {/* Amount Paid */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <span className={`font-semibold text-xs ${
                      Number(inv.amount_paid) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-text"
                    }`}>
                      {formatMoney(inv.amount_paid, inv.currency)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {/* View button */}
                      <button
                        onClick={() => onView(inv)}
                        title="View / Print Invoice"
                        className="p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-surface-hover transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Send Payment Request Email */}
                      {inv.status === "paid" ? (
                        !inv.archived_at && (
                          <button
                            onClick={() => onArchive(inv)}
                            title="Archive paid invoice"
                            className="p-1.5 rounded-lg text-muted-text hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleSendInvoice(inv)}
                          title={inv.status === "draft" ? "Send Payment Request Email" : "Resend Payment Request"}
                          className="p-1.5 rounded-lg text-muted-text hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Record Payment */}
                      {inv.status !== "paid" && (
                        <button
                          onClick={() => onRecordPayment(inv)}
                          title="Record Payment"
                          className="p-1.5 rounded-lg text-muted-text hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Dropdown Menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleInvoiceMenu(inv.id, e.currentTarget);
                          }}
                          className="p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-surface-hover transition-colors"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {isMenuOpen && menuPosition && createPortal(
                          <>
                            <div 
                              className="fixed inset-0 z-[9998]"
                              onClick={closeInvoiceMenu}
                            />
                            <div
                              className="fixed w-52 max-h-[calc(100vh-1rem)] overflow-y-auto bg-surface border border-border rounded-xl shadow-2xl z-[9999] py-1 text-left"
                              style={{
                                right: menuPosition.right,
                                ...(menuPosition.top !== undefined ? { top: menuPosition.top } : {}),
                                ...(menuPosition.bottom !== undefined ? { bottom: menuPosition.bottom } : {}),
                              }}
                            >
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onView(inv);
                                }}
                                className="w-full px-3 py-2 text-xs text-text hover:bg-surface-hover flex items-center gap-2"
                              >
                                <Eye className="w-3.5 h-3.5 text-muted-text" />
                                View Full Invoice
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleCopyLink(inv);
                                }}
                                className="w-full px-3 py-2 text-xs text-text hover:bg-surface-hover flex items-center gap-2"
                              >
                                <Copy className="w-3.5 h-3.5 text-muted-text" />
                                Copy Payment Link
                              </button>

                              {inv.status !== "paid" && !inv.archived_at && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleSendInvoice(inv);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-text hover:bg-surface-hover flex items-center gap-2"
                                >
                                  <Send className="w-3.5 h-3.5 text-muted-text" />
                                  Send Payment Request
                                </button>
                              )}

                              {inv.status !== "paid" && <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onRecordPayment(inv);
                                }}
                                className="w-full px-3 py-2 text-xs text-text hover:bg-surface-hover flex items-center gap-2"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                Record Payment
                              </button>}

                              {inv.status === "paid" && !inv.archived_at && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onArchive(inv);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-amber-600 hover:bg-amber-500/10 flex items-center gap-2 font-medium"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  Archive Invoice
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onEdit(inv);
                                }}
                                className="w-full px-3 py-2 text-xs text-text hover:bg-surface-hover flex items-center gap-2"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-muted-text" />
                                Edit Details
                              </button>

                              {onDuplicate && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onDuplicate(inv);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-text hover:bg-surface-hover flex items-center gap-2"
                                >
                                  <Copy className="w-3.5 h-3.5 text-indigo-500" />
                                  Duplicate Invoice
                                </button>
                              )}

                              <div className="my-1 border-t border-border" />

                              {inv.status !== "paid" && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onQuickStatusChange(inv.id, "paid");
                                  }}
                                  className="w-full px-3 py-2 text-xs text-emerald-600 hover:bg-emerald-500/10 flex items-center gap-2 font-medium"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Mark as Paid
                                </button>
                              )}

                              {inv.status !== "cancelled" && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onQuickStatusChange(inv.id, "cancelled");
                                  }}
                                  className="w-full px-3 py-2 text-xs text-muted-text hover:bg-surface-hover flex items-center gap-2"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  Mark as Cancelled
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onDelete(inv.id);
                                }}
                                className="w-full px-3 py-2 text-xs text-rose-600 hover:bg-rose-500/10 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Invoice
                              </button>
                            </div>
                          </>,
                          document.body
                        )}
                      </div>
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
