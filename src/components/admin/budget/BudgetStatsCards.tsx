import React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Target, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from "lucide-react";
import { BudgetSummary } from "../../../types";
import { cn } from "../../../lib/utils";
import { formatConfiguredCurrency } from "../../../lib/currency";
import { useLanguage } from "../../../contexts/LanguageContext";

interface BudgetStatsCardsProps {
  summary: BudgetSummary | null;
  currency?: string;
  isSuperAdmin?: boolean;
  selectedAdminName?: string;
}

export function BudgetStatsCards({
  summary,
  currency = "USD",
  isSuperAdmin = false,
  selectedAdminName
}: BudgetStatsCardsProps) {
  const { tUi } = useLanguage();
  if (!summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-surface/60 border border-border animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const formatMoney = (amount: number, curr: string = currency) => {
    return formatConfiguredCurrency(amount, curr, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  const isNetPositive = summary.netBalance >= 0;
  const targetIncome = summary.targets?.monthlyTargetIncome || 0;
  const budgetCap = summary.targets?.monthlyBudgetCap || 0;
  const incomeProgress = targetIncome > 0 ? (summary.totalIncome / targetIncome) * 100 : 0;
  const budgetUsed = budgetCap > 0 ? (summary.totalOutcome / budgetCap) * 100 : 0;

  // Status mapping matching admin system
  const periodStatus = summary.targets?.periodStatus || "in_progress";
  const periodStatusConfig: Record<string, { label: string; className: string }> = {
    on_track: { label: tUi("admin.budget.status.on_track"), className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
    in_progress: { label: tUi("admin.budget.status.in_progress"), className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" },
    over_budget: { label: tUi("admin.budget.status.over_budget"), className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
    planned: { label: tUi("admin.budget.status.planned"), className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" },
    reviewed: { label: tUi("admin.budget.status.reviewed"), className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
    closed: { label: tUi("admin.budget.status.closed"), className: "bg-surface text-muted-text border-border" }
  };

  const statusBadge = periodStatusConfig[periodStatus] || periodStatusConfig.in_progress;

  return (
    <div className="space-y-4 mb-6">
      {/* Top 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income Card */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-xs relative overflow-hidden transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-text">
              {tUi("admin.budget.stats.total_incomes")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-text tracking-tight font-heading">
              {formatMoney(summary.totalIncome)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-text border-t border-border pt-2.5">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {tUi("admin.budget.stats.confirmed_amount", { amount: formatMoney(summary.confirmedIncome) })}
            </span>
            <span>{tUi("admin.budget.stats.planned_amount", { amount: summary.plannedIncome > 0 ? formatMoney(summary.plannedIncome) : "0" })}</span>
          </div>
        </div>

        {/* Total Outcome / Expenses Card */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-xs relative overflow-hidden transition-all hover:border-rose-500/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-text">
              {tUi("admin.budget.stats.total_outcomes")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-text tracking-tight font-heading">
              {formatMoney(summary.totalOutcome)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-text border-t border-border pt-2.5">
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {tUi("admin.budget.stats.confirmed_amount", { amount: formatMoney(summary.confirmedOutcome) })}
            </span>
            <span>{tUi("admin.budget.stats.planned_amount", { amount: summary.plannedOutcome > 0 ? formatMoney(summary.plannedOutcome) : "0" })}</span>
          </div>
        </div>

        {/* Net Balance Card */}
        <div className={cn(
          "bg-surface border rounded-xl p-5 shadow-xs relative overflow-hidden transition-all",
          isNetPositive
            ? "border-emerald-500/30 hover:border-emerald-500/50"
            : "border-rose-500/30 hover:border-rose-500/50"
        )}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-text">
              {tUi("admin.budget.stats.net_balance")}
            </span>
            <div className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center",
              isNetPositive
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
            )}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-2xl lg:text-3xl font-bold tracking-tight font-heading",
              isNetPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}>
              {isNetPositive ? "+" : ""}{formatMoney(summary.netBalance)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-text border-t border-border pt-2.5">
            <span>{tUi("admin.budget.stats.confirmed_net")}</span>
            <span className={cn(
              "font-semibold",
              summary.confirmedNet >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}>
              {summary.confirmedNet >= 0 ? "+" : ""}{formatMoney(summary.confirmedNet)}
            </span>
          </div>
        </div>

        {/* Profit Margin & Health Card */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-xs relative overflow-hidden transition-all hover:border-primary/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-text">
              {tUi("admin.budget.stats.profit_status")}
            </span>
            <span className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-full border",
              statusBadge.className
            )}>
              {statusBadge.label}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-text tracking-tight font-heading">
              {summary.profitMargin.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-text">{tUi("admin.budget.stats.net_margin")}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-text border-t border-border pt-2.5">
            <span>{tUi("admin.budget.stats.total_entries")}:</span>
            <span className="font-semibold text-text">{summary.totalEntries} records</span>
          </div>
        </div>
      </div>

      {/* Target Progress Bar (if target or cap is set) */}
      {(targetIncome > 0 || budgetCap > 0) && (
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {targetIncome > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-text flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-500" />
                    Monthly Revenue Target ({formatMoney(targetIncome)})
                  </span>
                  <span className={cn(
                    "font-semibold",
                    incomeProgress >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-text"
                  )}>
                    {incomeProgress.toFixed(0)}% reached ({formatMoney(summary.totalIncome)})
                  </span>
                </div>
                <div className="w-full h-2 bg-background border border-border/60 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, incomeProgress))}%` }}
                  />
                </div>
              </div>
            )}

            {budgetCap > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-text flex items-center gap-1.5">
                    <AlertTriangle className={cn("w-3.5 h-3.5", budgetUsed > 100 ? "text-rose-500" : "text-amber-500")} />
                    Monthly Expense Cap ({formatMoney(budgetCap)})
                  </span>
                  <span className={cn(
                    "font-semibold",
                    budgetUsed > 100 ? "text-rose-600 dark:text-rose-400" : "text-text"
                  )}>
                    {budgetUsed.toFixed(0)}% used ({formatMoney(summary.totalOutcome)})
                  </span>
                </div>
                <div className="w-full h-2 bg-background border border-border/60 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500 rounded-full",
                      budgetUsed > 100 ? "bg-rose-500" : budgetUsed > 80 ? "bg-amber-500" : "bg-sky-500"
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, budgetUsed))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
