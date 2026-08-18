import React from "react";
import { 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  TrendingUp,
  Percent
} from "lucide-react";
import { InvoiceSummary } from "../../../types";
import { formatConfiguredCurrency } from "../../../lib/currency";
import { useLanguage } from "../../../contexts/LanguageContext";

interface InvoiceStatsCardsProps {
  summary: InvoiceSummary | null;
  currency?: string;
}

export function InvoiceStatsCards({ summary, currency = "USD" }: InvoiceStatsCardsProps) {
  const { tUi } = useLanguage();
  const formatMoney = (amount: number) => {
    return formatConfiguredCurrency(amount, currency, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const totalInvoiced = summary?.totalInvoiced || 0;
  const totalPaid = summary?.totalPaid || 0;
  const totalOutstanding = summary?.totalOutstanding || 0;
  const totalOverdue = summary?.totalOverdue || 0;
  const collectionRate = summary?.collectionRate || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Invoiced */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-xs hover:border-border-hover transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
            {tUi("admin.invoices.stats.total_invoiced")}
          </span>
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-text tracking-tight font-heading">
          {formatMoney(totalInvoiced)}
        </div>
        <div className="text-[11px] text-muted-text mt-1 flex items-center gap-1.5">
          <span>{tUi("admin.invoices.stats.counts", { total: summary?.totalCount || 0, drafts: summary?.draftCount || 0 })}</span>
        </div>
      </div>

      {/* 2. Total Collected / Paid */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-xs hover:border-border-hover transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
            {tUi("admin.invoices.stats.collected")}
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight font-heading">
          {formatMoney(totalPaid)}
        </div>
        <div className="text-[11px] text-muted-text mt-1 flex items-center gap-1">
          <span>{tUi("admin.invoices.stats.settled", { count: summary?.paidCount || 0 })}</span>
        </div>
      </div>

      {/* 3. Outstanding Balance */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-xs hover:border-border-hover transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
            {tUi("admin.invoices.stats.outstanding")}
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-amber-600 dark:text-amber-400 tracking-tight font-heading">
          {formatMoney(totalOutstanding)}
        </div>
        <div className="text-[11px] text-muted-text mt-1 flex items-center gap-1.5">
          <span>{tUi("admin.invoices.stats.sent_viewed", { sent: summary?.sentCount || 0, viewed: summary?.viewedCount || 0 })}</span>
        </div>
      </div>

      {/* 4. Overdue Invoices */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-xs hover:border-border-hover transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
            {tUi("admin.invoices.stats.overdue")}
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-rose-600 dark:text-rose-400 tracking-tight font-heading">
          {formatMoney(totalOverdue)}
        </div>
        <div className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1">
          {tUi("admin.invoices.stats.past_due", { count: summary?.overdueCount || 0 })}
        </div>
      </div>

      {/* 5. Collection Rate */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-xs hover:border-border-hover transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
            {tUi("admin.invoices.stats.collection_rate")}
          </span>
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-text tracking-tight font-heading">
          {collectionRate}%
        </div>
        <div className="w-full bg-border rounded-full h-1.5 mt-2 overflow-hidden">
          <div 
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, collectionRate))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
