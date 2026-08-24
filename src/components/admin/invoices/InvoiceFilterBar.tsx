import React from "react";
import { 
  Search, 
  Filter, 
  Calendar, 
  X, 
  RotateCcw,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText
} from "lucide-react";
import { Button } from "../../ui/Button";

interface InvoiceFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  periodFilter: string;
  onPeriodChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  totalCount: number;
  clientEmailFilter?: string;
  onClientEmailChange?: (email: string) => void;
  clients?: Array<{ id?: string; name?: string; email: string; source?: string }>;
}

export function InvoiceFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  periodFilter,
  onPeriodChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onResetFilters,
  hasActiveFilters,
  totalCount,
  clientEmailFilter = "",
  onClientEmailChange,
  clients = []
}: InvoiceFilterBarProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3.5 shadow-xs space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by invoice #, client name, email, property..."
            className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-lg text-xs text-text placeholder:text-muted-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
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
            { id: "draft", label: "Drafts" },
            { id: "sent", label: "Sent" },
            { id: "viewed", label: "Viewed" },
            { id: "paid", label: "Paid" },
            { id: "overdue", label: "Overdue" },
            { id: "archived", label: "Archived" }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => onStatusChange(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === st.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-background border border-border text-muted-text hover:text-text hover:bg-surface-hover"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Filter Row: Period, Dates & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-border text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Client account selector */}
          {onClientEmailChange && (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-text" />
              <select
                aria-label="Filter invoices by client account"
                value={clientEmailFilter}
                onChange={(e) => onClientEmailChange(e.target.value)}
                className="max-w-[240px] bg-background border border-border rounded-md px-2.5 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All client accounts</option>
                {clients.map((client) => (
                  <option key={client.id || client.email} value={client.email}>
                    {client.name || client.email} — {client.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Period selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-text" />
            <select
              value={periodFilter}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="bg-background border border-border rounded-md px-2.5 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Dates</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {periodFilter === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="bg-background border border-border rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted-text text-[11px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="bg-background border border-border rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-text">
            Found <strong className="text-text">{totalCount}</strong> invoices
          </span>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="h-7 px-2 text-[11px] inline-flex items-center gap-1 text-muted-text hover:text-text"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
