import React from "react";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Lock, 
  Edit3, 
  Trash2, 
  Plus,
  ChevronRight
} from "lucide-react";
import { BudgetEntry, BudgetStatus } from "../../../types";
import { cn } from "../../../lib/utils";

interface BudgetKanbanViewProps {
  entries: BudgetEntry[];
  currentAdminId: string;
  isSuperAdmin: boolean;
  onEdit: (entry: BudgetEntry) => void;
  onDelete: (entryId: string) => void;
  onQuickStatusChange: (entryId: string, newStatus: BudgetStatus) => Promise<void>;
  onOpenNewModal: () => void;
  currency?: string;
}

export function BudgetKanbanView({
  entries,
  currentAdminId,
  isSuperAdmin,
  onEdit,
  onDelete,
  onQuickStatusChange,
  onOpenNewModal,
  currency = "USD"
}: BudgetKanbanViewProps) {
  const formatMoney = (amount: number, curr: string = currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const columns: {
    id: BudgetStatus;
    title: string;
    icon: any;
    headerBg: string;
    headerText: string;
    border: string;
  }[] = [
    {
      id: "planned",
      title: "Planned & Projected",
      icon: Sparkles,
      headerBg: "bg-sky-500/10",
      headerText: "text-sky-700 dark:text-sky-300",
      border: "border-sky-500/30"
    },
    {
      id: "pending",
      title: "Pending Review",
      icon: Clock,
      headerBg: "bg-amber-500/10",
      headerText: "text-amber-700 dark:text-amber-300",
      border: "border-amber-500/30"
    },
    {
      id: "confirmed",
      title: "Confirmed & Cleared",
      icon: CheckCircle2,
      headerBg: "bg-emerald-500/10",
      headerText: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-500/30"
    },
    {
      id: "rejected",
      title: "Rejected / Cancelled",
      icon: AlertCircle,
      headerBg: "bg-rose-500/10",
      headerText: "text-rose-700 dark:text-rose-300",
      border: "border-rose-500/30"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {columns.map((col) => {
        const colEntries = entries.filter((e) => e.status === col.id);
        const colIncome = colEntries
          .filter((e) => e.type === "income")
          .reduce((acc, curr) => acc + curr.amount, 0);
        const colOutcome = colEntries
          .filter((e) => e.type === "outcome")
          .reduce((acc, curr) => acc + curr.amount, 0);
        const colNet = colIncome - colOutcome;
        const Icon = col.icon;

        return (
          <div 
            key={col.id}
            className="bg-surface border border-border rounded-xl p-3.5 flex flex-col h-full min-h-[450px] shadow-xs"
          >
            {/* Column Header */}
            <div className={cn(
              "px-3.5 py-2.5 rounded-lg border mb-3 flex items-center justify-between",
              col.headerBg,
              col.border
            )}>
              <div className="flex items-center gap-2">
                <Icon className={cn("w-4 h-4", col.headerText)} />
                <span className={cn("font-bold text-xs font-heading", col.headerText)}>
                  {col.title}
                </span>
              </div>
              <span className={cn(
                "px-2 py-0.5 text-xs font-bold rounded-full bg-surface text-text border border-border shadow-xs",
                col.headerText
              )}>
                {colEntries.length}
              </span>
            </div>

            {/* Column Metrics Subheader */}
            <div className="px-2 py-1 mb-2 text-[11px] flex items-center justify-between text-muted-text font-medium border-b border-border/50 pb-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{formatMoney(colIncome)}</span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">-{formatMoney(colOutcome)}</span>
              <span className={cn(
                "font-bold font-heading",
                colNet >= 0 ? "text-text" : "text-rose-600 dark:text-rose-400"
              )}>
                Net: {formatMoney(colNet)}
              </span>
            </div>

            {/* Entries Cards */}
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
              {colEntries.map((entry) => {
                const isOwner = entry.owner_admin_id === currentAdminId;
                const isIncome = entry.type === "income";

                return (
                  <div
                    key={entry.id}
                    className="bg-background border border-border rounded-xl p-3.5 shadow-xs relative overflow-hidden transition-all hover:border-primary/40 group"
                  >
                    {/* Color Left Tag */}
                    <div 
                      className="absolute top-0 left-0 bottom-0 w-1.5" 
                      style={{ backgroundColor: entry.color_code || "#3B82F6" }} 
                    />

                    <div className="pl-1.5 space-y-2">
                      {/* Top: Category & Type */}
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-text truncate">
                          {entry.category || "General"}
                        </span>
                        <span className={cn(
                          "inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold border",
                          isIncome 
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                        )}>
                          {isIncome ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {isIncome ? "Income" : "Expense"}
                        </span>
                      </div>

                      {/* Amount & Date */}
                      <div className="flex items-baseline justify-between">
                        <span className={cn(
                          "text-base font-bold tracking-tight font-heading",
                          isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                          {isIncome ? "+" : "-"}{formatMoney(entry.amount, entry.currency)}
                        </span>
                        <span className="text-[10px] text-muted-text font-medium">
                          {entry.date}
                        </span>
                      </div>

                      {/* Description */}
                      {entry.description && (
                        <p className="text-xs text-muted-text line-clamp-2">
                          {entry.description}
                        </p>
                      )}

                      {/* Bottom Owner & Actions */}
                      <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                        {isSuperAdmin && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-text">
                            <span 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: entry.color_code || "#3B82F6" }} 
                            />
                            <span className="truncate max-w-[80px] font-medium text-text">
                              {entry.owner_name}
                            </span>
                          </div>
                        )}

                        {isOwner ? (
                          <div className="flex items-center gap-1 ml-auto">
                            {/* Quick Advance Status Button */}
                            {col.id !== "confirmed" && (
                              <button
                                type="button"
                                onClick={() => onQuickStatusChange(entry.id, col.id === "planned" ? "pending" : "confirmed")}
                                className="px-2 py-0.5 text-[10px] font-semibold bg-surface border border-border hover:bg-emerald-500/10 text-muted-text hover:text-emerald-600 dark:hover:text-emerald-400 rounded flex items-center gap-0.5 transition-colors"
                                title="Move to next status"
                              >
                                <span>Advance</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onEdit(entry)}
                              className="p-1 text-muted-text hover:text-primary rounded hover:bg-surface transition-colors"
                              title="Edit Entry"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(entry.id)}
                              className="p-1 text-muted-text hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-surface transition-colors"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-text italic flex items-center gap-0.5 ml-auto">
                            <Lock className="w-2.5 h-2.5" /> Read-only
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {colEntries.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-text border border-dashed border-border rounded-xl">
                  No {col.title.toLowerCase()}
                </div>
              )}
            </div>

            {/* Quick Add CTA at bottom of column */}
            <button
              type="button"
              onClick={onOpenNewModal}
              className="mt-3 w-full py-2 border border-dashed border-border hover:border-primary rounded-xl text-xs font-semibold text-muted-text hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Transaction
            </button>
          </div>
        );
      })}
    </div>
  );
}
