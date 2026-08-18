import React from "react";
import { Search, Filter, X, Calendar, User, Link as LinkIcon } from "lucide-react";
import { BudgetAdminItem, PaymentRequestSummary } from "../../../types";
import { PaymentRequestCategoryOption } from "./PaymentRequestCategoriesModal";

interface PaymentRequestsFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (val: string) => void;
  requesterFilter: string;
  onRequesterFilterChange: (val: string) => void;
  linkFilter: string;
  onLinkFilterChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  adminsList: BudgetAdminItem[];
  isSuperAdmin: boolean;
  onResetFilters: () => void;
  summary?: PaymentRequestSummary | null;
  categories?: PaymentRequestCategoryOption[];
}

export function PaymentRequestsFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  requesterFilter,
  onRequesterFilterChange,
  linkFilter,
  onLinkFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  adminsList,
  isSuperAdmin,
  onResetFilters,
  summary,
  categories = []
}: PaymentRequestsFilterBarProps) {
  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    requesterFilter !== "all" ||
    linkFilter !== "all" ||
    startDate !== "" ||
    endDate !== "";

  const getStatusCount = (statusId: string) => {
    if (!summary) return null;
    if (statusId === "all") return summary.totalCount;
    if (statusId === "pending") return summary.pendingCount;
    if (statusId === "approved") return summary.approvedCount;
    if (statusId === "denied") return summary.deniedCount;
    if (statusId === "on_hold") return summary.onHoldCount;
    return null;
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search request #, subject, reason, payee, or coworker..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-text hover:text-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All" },
            { id: "pending", label: "Pending" },
            { id: "approved", label: "Approved" },
            { id: "denied", label: "Denied" },
            { id: "on_hold", label: "On Hold" }
          ].map((item) => {
            const count = getStatusCount(item.id);
            const isSelected = statusFilter === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onStatusFilterChange(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-hover/70 text-muted-text hover:text-text hover:bg-surface-hover"
                }`}
              >
                <span>{item.label}</span>
                {count !== null && count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : item.id === "pending" && count > 0
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        : item.id === "denied" && count > 0
                        ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                        : item.id === "approved" && count > 0
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-surface text-muted-text"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Row: Category, Requester, Link Type, Date Range */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/60">
        {/* Category Dropdown */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-text hidden sm:inline" />
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Requester Dropdown (Visible to Superadmin) */}
        {isSuperAdmin && adminsList.length > 0 && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-muted-text hidden sm:inline" />
            <select
              value={requesterFilter}
              onChange={(e) => onRequesterFilterChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Coworkers</option>
              {adminsList.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name} ({admin.role})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Link Type Filter */}
        <div className="flex items-center gap-1.5">
          <LinkIcon className="w-3.5 h-3.5 text-muted-text hidden sm:inline" />
          <select
            value={linkFilter}
            onChange={(e) => onLinkFilterChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Linked Types</option>
            <option value="budget_entry">Linked to Budget Entry</option>
            <option value="invoice">Linked to Client Invoice</option>
            <option value="none">Standalone (Unlinked)</option>
          </select>
        </div>

        {/* Date Range Inputs */}
        <div className="flex items-center gap-1.5 text-xs text-muted-text ml-auto">
          <Calendar className="w-3.5 h-3.5 hidden sm:inline" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary"
            title="Start Date"
          />
          <span>–</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary"
            title="End Date"
          />
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="px-2.5 py-1 text-xs text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1 ml-auto sm:ml-0"
          >
            <X className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
