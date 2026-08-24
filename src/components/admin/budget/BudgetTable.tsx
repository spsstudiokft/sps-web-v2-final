import React, { useState } from "react";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Copy, 
  Lock, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles,
  Shield,
  ChevronDown,
  Calendar,
  Layers,
  DollarSign,
  FileText
} from "lucide-react";
import { BudgetEntry, BudgetStatus } from "../../../types";
import { Button } from "../../ui/Button";
import { cn } from "../../../lib/utils";
import { formatConfiguredCurrency } from "../../../lib/currency";

interface BudgetTableProps {
  entries: BudgetEntry[];
  currentAdminId: string;
  isSuperAdmin: boolean;
  onEdit: (entry: BudgetEntry) => void;
  onDelete: (entryId: string) => void;
  onDuplicate: (entry: BudgetEntry) => void;
  onQuickStatusChange: (entryId: string, newStatus: BudgetStatus) => Promise<void>;
  onCreateInvoice?: (entry: BudgetEntry) => void;
  currency?: string;
  onOpenNewModal: () => void;
}

export function BudgetTable({
  entries,
  currentAdminId,
  isSuperAdmin,
  onEdit,
  onDelete,
  onDuplicate,
  onQuickStatusChange,
  onCreateInvoice,
  currency = "USD",
  onOpenNewModal
}: BudgetTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const formatMoney = (amount: number, curr: string = currency) => formatConfiguredCurrency(amount, curr, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStatusBadge = (status: BudgetStatus) => {
    switch (status) {
      case "confirmed":
        return {
          label: "Confirmed",
          icon: CheckCircle2,
          className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
        };
      case "planned":
        return {
          label: "Planned",
          icon: Sparkles,
          className: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
        };
      case "pending":
        return {
          label: "Pending",
          icon: Clock,
          className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
        };
      case "rejected":
        return {
          label: "Rejected",
          icon: AlertCircle,
          className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
        };
      default:
        return {
          label: status,
          icon: Sparkles,
          className: "bg-surface text-text border-border"
        };
    }
  };

  if (entries.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center shadow-xs">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
          <Layers className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-text mb-1 font-heading">
          No budget entries found
        </h3>
        <p className="text-xs text-muted-text max-w-sm mx-auto mb-5">
          There are no financial entries matching your active filters. Create a new transaction to start tracking.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={onOpenNewModal}
          className="inline-flex items-center gap-2"
        >
          <DollarSign className="w-4 h-4" />
          Add First Entry
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          {/* Table Header */}
          <thead className="bg-background border-b border-border text-muted-text font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">Date</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Category & Details</th>
              {isSuperAdmin && <th className="py-3.5 px-4">Owner (Admin)</th>}
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Amount</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border">
            {entries.map((entry) => {
              const isOwner = entry.owner_admin_id === currentAdminId;
              const isIncome = entry.type === "income";
              const statusInfo = getStatusBadge(entry.status);
              const StatusIcon = statusInfo.icon;
              const isMenuOpen = activeMenuId === entry.id;

              return (
                <tr 
                  key={entry.id}
                  className="hover:bg-surface-hover transition-colors group"
                >
                  {/* Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-medium text-text">
                      <div 
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                        style={{ backgroundColor: entry.color_code || "#3B82F6" }}
                        title={`Custom color: ${entry.color_code}`}
                      />
                      <span>{entry.date}</span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border",
                      isIncome 
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                    )}>
                      {isIncome ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {isIncome ? "Income" : "Expense"}
                    </span>
                  </td>

                  {/* Category & Description */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-semibold text-text">
                      {entry.category || "General"}
                    </div>
                    {entry.description && (
                      <div className="text-muted-text text-[11px] truncate mt-0.5" title={entry.description}>
                        {entry.description}
                      </div>
                    )}
                  </td>

                  {/* Owner (Admin) - for Superadmin */}
                  {isSuperAdmin && (
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: entry.color_code || "#3B82F6" }} 
                        />
                        <span className="font-medium text-text">
                          {entry.owner_name || "Admin"}
                        </span>
                        {isOwner ? (
                          <span className="px-1.5 py-0.2 text-[10px] bg-primary/15 text-primary rounded font-semibold border border-primary/20">
                            You
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 text-[10px] bg-background text-muted-text border border-border rounded flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            Read-only
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Status & Quick Status Picker */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {isOwner ? (
                      <div className="relative inline-block text-left">
                        <select
                          value={entry.status}
                          onChange={(e) => onQuickStatusChange(entry.id, e.target.value as BudgetStatus)}
                          className={cn(
                            "appearance-none text-xs font-semibold py-1 pl-2.5 pr-6 rounded-full border cursor-pointer focus:outline-none transition-colors",
                            statusInfo.className
                          )}
                        >
                          <option value="confirmed" className="bg-surface text-text">Confirmed</option>
                          <option value="planned" className="bg-surface text-text">Planned</option>
                          <option value="pending" className="bg-surface text-text">Pending</option>
                          <option value="rejected" className="bg-surface text-text">Rejected</option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    ) : (
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
                        statusInfo.className
                      )}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <span className={cn(
                      "font-bold text-sm font-heading",
                      isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      {isIncome ? "+" : "-"}{formatMoney(entry.amount, entry.currency)}
                    </span>
                  </td>

                  {/* Actions Column */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    {isOwner ? (
                      <div className="flex items-center justify-end gap-1">
                        {onCreateInvoice && (
                          <button
                            type="button"
                            onClick={() => onCreateInvoice(entry)}
                            className="p-1.5 text-muted-text hover:text-sky-600 dark:hover:text-sky-400 hover:bg-surface-hover rounded-lg transition-colors"
                            title="Create Invoice from this Entry"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEdit(entry)}
                          className="p-1.5 text-muted-text hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
                          title="Edit Entry"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicate(entry)}
                          className="p-1.5 text-muted-text hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-surface-hover rounded-lg transition-colors"
                          title="Duplicate Entry"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(entry.id)}
                          className="p-1.5 text-muted-text hover:text-rose-600 dark:hover:text-rose-400 hover:bg-surface-hover rounded-lg transition-colors"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span 
                        className="inline-flex items-center gap-1 text-[11px] text-muted-text italic" 
                        title="Superadmins have read-only access to entries owned by other admins."
                      >
                        <Lock className="w-3 h-3" />
                        Read-only
                      </span>
                    )}
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
