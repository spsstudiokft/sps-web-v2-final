import React from "react";
import { Clock, CheckCircle2, XCircle, AlertTriangle, ArrowUpRight } from "lucide-react";
import { PaymentRequestSummary } from "../../../types";
import { formatConfiguredCurrency } from "../../../lib/currency";
import { useLanguage } from "../../../contexts/LanguageContext";

interface PaymentRequestsStatsCardsProps {
  summary: PaymentRequestSummary | null;
  currency?: string;
  isSuperAdmin?: boolean;
  activeStatus?: string;
  onStatusSelect?: (status: string) => void;
}

export function PaymentRequestsStatsCards({
  summary,
  currency = "USD",
  activeStatus,
  onStatusSelect
}: PaymentRequestsStatsCardsProps) {
  const { tUi } = useLanguage();
  const requestLabel = (count: number) => tUi(count === 1 ? "admin.payment_requests.stats.request_one" : "admin.payment_requests.stats.request_many");
  const formatMoney = (amount: number) => {
    return formatConfiguredCurrency(amount, currency, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const pendingCount = summary?.pendingCount || 0;
  const approvedCount = summary?.approvedCount || 0;
  const deniedCount = summary?.deniedCount || 0;
  const onHoldCount = summary?.onHoldCount || 0;
  const totalPendingAmount = summary?.totalPendingAmount || 0;
  const totalApprovedAmount = summary?.totalApprovedAmount || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Pending Approval */}
      <div 
        onClick={() => onStatusSelect?.(activeStatus === "pending" ? "all" : "pending")}
        className={`bg-surface border rounded-xl p-4 shadow-sm relative overflow-hidden transition-all cursor-pointer ${
          activeStatus === "pending" 
            ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/[0.04]" 
            : "border-amber-500/30 hover:border-amber-500/60 hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {tUi("admin.payment_requests.stats.pending")}
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-text font-mono">
            {formatMoney(totalPendingAmount)}
          </div>
          <div className="text-xs text-muted-text mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
              {pendingCount} {requestLabel(pendingCount)}
            </span>
            <span>{tUi("admin.payment_requests.stats.awaiting")}</span>
          </div>
        </div>
      </div>

      {/* 2. Approved */}
      <div 
        onClick={() => onStatusSelect?.(activeStatus === "approved" ? "all" : "approved")}
        className={`bg-surface border rounded-xl p-4 shadow-sm relative overflow-hidden transition-all cursor-pointer ${
          activeStatus === "approved" 
            ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.04]" 
            : "border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {tUi("admin.payment_requests.stats.approved")}
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-text font-mono">
            {formatMoney(totalApprovedAmount)}
          </div>
          <div className="text-xs text-muted-text mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              {approvedCount} {requestLabel(approvedCount)}
            </span>
            <span>{tUi("admin.payment_requests.stats.cleared")}</span>
          </div>
        </div>
      </div>

      {/* 3. Denied */}
      <div 
        onClick={() => onStatusSelect?.(activeStatus === "denied" ? "all" : "denied")}
        className={`bg-surface border rounded-xl p-4 shadow-sm relative overflow-hidden transition-all cursor-pointer ${
          activeStatus === "denied" 
            ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/[0.04]" 
            : "border-rose-500/30 hover:border-rose-500/60 hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            {tUi("admin.payment_requests.stats.denied")}
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-text font-mono">
            {deniedCount}
          </div>
          <div className="text-xs text-muted-text mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300">
              {deniedCount} {requestLabel(deniedCount)}
            </span>
            <span>{tUi("admin.payment_requests.stats.denied_note")}</span>
          </div>
        </div>
      </div>

      {/* 4. On Hold / Total Volume */}
      <div 
        onClick={() => onStatusSelect?.(onHoldCount > 0 ? (activeStatus === "on_hold" ? "all" : "on_hold") : "all")}
        className={`bg-surface border rounded-xl p-4 shadow-sm relative overflow-hidden transition-all cursor-pointer ${
          activeStatus === "on_hold" 
            ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/[0.04]" 
            : activeStatus === "all"
            ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]"
            : "border-border hover:border-primary/40 hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-text">
            {tUi(onHoldCount > 0 ? "admin.payment_requests.stats.on_hold" : "admin.payment_requests.stats.total")}
          </span>
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {onHoldCount > 0 ? (
              <AlertTriangle className="w-4 h-4 text-purple-500" />
            ) : (
              <ArrowUpRight className="w-4 h-4" />
            )}
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-text font-mono">
            {onHoldCount > 0 ? onHoldCount : (summary?.totalCount || 0)}
          </div>
          <div className="text-xs text-muted-text mt-1 flex items-center gap-1.5">
            {onHoldCount > 0 ? (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300">
                {tUi("admin.payment_requests.stats.on_hold_count", { count: onHoldCount })}
              </span>
            ) : (
              <span className="text-muted-text">{tUi("admin.payment_requests.stats.all_records")}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
