import React, { useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from "recharts";
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Users, 
  Layers
} from "lucide-react";
import { BudgetSummary } from "../../../types";
import { cn } from "../../../lib/utils";
import { formatConfiguredCurrency } from "../../../lib/currency";
import { useLanguage } from "../../../contexts/LanguageContext";

interface BudgetChartSectionProps {
  summary: BudgetSummary | null;
  currency?: string;
  isSuperAdmin?: boolean;
}

const CATEGORY_COLORS = [
  "#10B981", // emerald
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#F59E0B", // amber
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
  "#14B8A6", // teal
  "#6366F1", // indigo
  "#EF4444"  // red
];

export function BudgetChartSection({
  summary,
  currency = "USD",
  isSuperAdmin = false
}: BudgetChartSectionProps) {
  const { tUi } = useLanguage();
  const [activeTab, setActiveTab] = useState<"cashflow" | "categories" | "status" | "admins">("cashflow");

  if (!summary) return null;

  const formatCurrency = (val: number) => formatConfiguredCurrency(val, currency, { maximumFractionDigits: 0 });

  // Status pie chart data
  const statusData = [
    { name: "Confirmed", value: summary.confirmedIncome + summary.confirmedOutcome, color: "#10B981" },
    { name: "Planned", value: summary.plannedIncome + summary.plannedOutcome, color: "#0ea5e9" },
    { name: "Pending", value: summary.pendingIncome + summary.pendingOutcome, color: "#F59E0B" },
    { name: "Rejected", value: summary.rejectedIncome + summary.rejectedOutcome, color: "#EF4444" }
  ].filter(d => d.value > 0);

  // Categories data
  const topIncomes = summary.categoryBreakdown.incomes.slice(0, 6);
  const topOutcomes = summary.categoryBreakdown.outcomes.slice(0, 6);

  // Admin breakdown for superadmin
  const adminData = (summary.adminBreakdown || []).map(a => ({
    name: a.adminName,
    income: a.totalIncome,
    outcome: a.totalOutcome,
    net: a.net,
    color: a.adminColor
  }));

  const hasMonthlyData = summary.monthlyBreakdown && summary.monthlyBreakdown.length > 0;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-xs mb-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
        <div>
          <h3 className="text-base font-bold text-text flex items-center gap-2 font-heading">
            <BarChart3 className="w-5 h-5 text-primary" />
            Budget Analytics & Trends
          </h3>
          <p className="text-xs text-muted-text mt-0.5">
            Financial breakdown across monthly cashflow, categories, and studio operational targets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-background border border-border rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("cashflow")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium",
              activeTab === "cashflow"
                ? "bg-surface text-text shadow-xs border border-border font-semibold"
                : "text-muted-text hover:text-text"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Cashflow Trend
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium",
              activeTab === "categories"
                ? "bg-surface text-text shadow-xs border border-border font-semibold"
                : "text-muted-text hover:text-text"
            )}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            {tUi("admin.portfolio.tab_categories")}</button>

          <button
            type="button"
            onClick={() => setActiveTab("status")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium",
              activeTab === "status"
                ? "bg-surface text-text shadow-xs border border-border font-semibold"
                : "text-muted-text hover:text-text"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            Status Distribution
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("admins")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium",
                activeTab === "admins"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-text hover:text-text"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              Per-Admin Comparison
            </button>
          )}
        </div>
      </div>

      {/* 1. Cashflow Trend Tab */}
      {activeTab === "cashflow" && (
        <div>
          {hasMonthlyData ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.monthlyBreakdown}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.12} stroke="currentColor" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12, fill: "currentColor" }} 
                    stroke="currentColor" 
                    opacity={0.6}
                  />
                  <YAxis 
                    tickFormatter={(v) => `$${v}`} 
                    tick={{ fontSize: 12, fill: "currentColor" }} 
                    stroke="currentColor" 
                    opacity={0.6}
                  />
                  <Tooltip 
                    formatter={(val: any) => [formatCurrency(Number(val)), ""]}
                    contentStyle={{
                      backgroundColor: "var(--theme-surface, #1e293b)",
                      borderRadius: "12px",
                      border: "1px solid var(--theme-border, #334155)",
                      color: "var(--theme-text, #f8fafc)",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)"
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} 
                  />
                  <Bar dataKey="income" name="Incomes (+)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outcome" name="Outcomes (-)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net" name="Net Balance" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-text text-sm">
              <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
              No timeframe data available yet. Create budget entries to see monthly cashflow trends.
            </div>
          )}
        </div>
      )}

      {/* 2. Categories Tab */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incomes by category */}
          <div className="bg-background rounded-xl p-4 border border-border">
            <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center justify-between">
              <span>{tUi("admin.budget.chart.income_categories")}</span>
              <span className="font-heading">{formatCurrency(summary.totalIncome)}</span>
            </h4>
            {topIncomes.length > 0 ? (
              <div className="space-y-2.5">
                {topIncomes.map((cat, idx) => {
                  const pct = summary.totalIncome > 0 ? (cat.amount / summary.totalIncome) * 100 : 0;
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-muted-text">
                          {cat.category} ({cat.count})
                        </span>
                        <span className="text-text font-semibold">
                          {formatCurrency(cat.amount)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-surface border border-border/60 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-text">{tUi("admin.budget.chart.no_income_categories")}</div>
            )}
          </div>

          {/* Outcomes by category */}
          <div className="bg-background rounded-xl p-4 border border-border">
            <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-3 flex items-center justify-between">
              <span>{tUi("admin.budget.chart.expense_categories")}</span>
              <span className="font-heading">{formatCurrency(summary.totalOutcome)}</span>
            </h4>
            {topOutcomes.length > 0 ? (
              <div className="space-y-2.5">
                {topOutcomes.map((cat, idx) => {
                  const pct = summary.totalOutcome > 0 ? (cat.amount / summary.totalOutcome) * 100 : 0;
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-muted-text">
                          {cat.category} ({cat.count})
                        </span>
                        <span className="text-text font-semibold">
                          {formatCurrency(cat.amount)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-surface border border-border/60 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: CATEGORY_COLORS[(idx + 4) % CATEGORY_COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-text">{tUi("admin.budget.chart.no_expense_categories")}</div>
            )}
          </div>
        </div>
      )}

      {/* 3. Status Distribution Tab */}
      {activeTab === "status" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="h-64 flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [formatCurrency(Number(val)), ""]}
                    contentStyle={{
                      backgroundColor: "var(--theme-surface, #1e293b)",
                      borderRadius: "12px",
                      border: "1px solid var(--theme-border, #334155)",
                      color: "var(--theme-text, #f8fafc)",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)"
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-muted-text">{tUi("admin.budget.chart.no_status")}</div>
            )}
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{tUi("admin.budget.chart.confirmed_entries")}</span>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">{tUi("admin.budget.chart.confirmed_help")}</p>
              </div>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 font-heading">
                {formatCurrency(summary.confirmedIncome + summary.confirmedOutcome)}
              </span>
            </div>

            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">{tUi("admin.budget.chart.planned_entries")}</span>
                <p className="text-xs text-sky-600/80 dark:text-sky-400/80">{tUi("admin.budget.chart.planned_help")}</p>
              </div>
              <span className="text-sm font-bold text-sky-700 dark:text-sky-300 font-heading">
                {formatCurrency(summary.plannedIncome + summary.plannedOutcome)}
              </span>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{tUi("admin.budget.chart.pending_entries")}</span>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">{tUi("admin.budget.chart.pending_help")}</p>
              </div>
              <span className="text-sm font-bold text-amber-700 dark:text-amber-300 font-heading">
                {formatCurrency(summary.pendingIncome + summary.pendingOutcome)}
              </span>
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">{tUi("admin.budget.chart.rejected_entries")}</span>
                <p className="text-xs text-rose-600/80 dark:text-rose-400/80">{tUi("admin.budget.chart.rejected_help")}</p>
              </div>
              <span className="text-sm font-bold text-rose-700 dark:text-rose-300 font-heading">
                {formatCurrency(summary.rejectedIncome + summary.rejectedOutcome)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Superadmin Per-Admin Breakdown Tab */}
      {activeTab === "admins" && isSuperAdmin && (
        <div>
          {adminData.length > 0 ? (
            <div className="space-y-6">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={adminData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} stroke="currentColor" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "currentColor" }} stroke="currentColor" opacity={0.6} />
                    <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12, fill: "currentColor" }} stroke="currentColor" opacity={0.6} />
                    <Tooltip 
                      formatter={(val: any) => [formatCurrency(Number(val)), ""]}
                      contentStyle={{
                        backgroundColor: "var(--theme-surface, #1e293b)",
                        borderRadius: "12px",
                        border: "1px solid var(--theme-border, #334155)",
                        color: "var(--theme-text, #f8fafc)",
                        fontSize: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)"
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="income" name="Incomes" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outcome" name="Outcomes" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="net" name="Net Balance" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Breakdown Table for Admins */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {summary.adminBreakdown?.map((adm) => (
                  <div 
                    key={adm.adminId}
                    className="p-3.5 bg-background rounded-xl border border-border relative overflow-hidden"
                  >
                    <div 
                      className="absolute top-0 left-0 bottom-0 w-1.5" 
                      style={{ backgroundColor: adm.adminColor || "#3B82F6" }} 
                    />
                    <div className="pl-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-text">
                          {adm.adminName}
                        </span>
                        <span 
                          className="px-2 py-0.5 text-xs rounded-full text-white font-medium"
                          style={{ backgroundColor: adm.adminColor || "#3B82F6" }}
                        >
                          {adm.entryCount} entries
                        </span>
                      </div>
                      <p className="text-xs text-muted-text mt-0.5 truncate">{adm.adminEmail}</p>

                      <div className="mt-3 pt-2.5 border-t border-border grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-text block text-[10px] uppercase font-semibold">{tUi("admin.budget.stats.total_income")}</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(adm.totalIncome)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-text block text-[10px] uppercase font-semibold">{tUi("admin.budget.stats.total_outcome")}</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            {formatCurrency(adm.totalOutcome)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-text block text-[10px] uppercase font-semibold">{tUi("admin.budget.chart.net")}</span>
                          <span className={cn(
                            "font-bold font-heading",
                            adm.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          )}>
                            {adm.net >= 0 ? "+" : ""}{formatCurrency(adm.net)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-text">{tUi("admin.budget.chart.no_admin_comparison")}</div>
          )}
        </div>
      )}
    </div>
  );
}
