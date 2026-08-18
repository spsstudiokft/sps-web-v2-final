import React from "react";
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Settings2, 
  History, 
  LayoutList, 
  KanbanSquare, 
  Users, 
  Calendar,
  X,
  RefreshCw,
  Eye,
  RotateCcw
} from "lucide-react";
import { BudgetAdminItem } from "../../../types";
import { Button } from "../../ui/Button";
import { cn } from "../../../lib/utils";

interface BudgetFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  typeFilter: string;
  onTypeFilterChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (val: string) => void;
  categoriesList: string[];
  periodFilter: string;
  onPeriodFilterChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  selectedAdminId: string;
  onAdminChange: (val: string) => void;
  adminsList: BudgetAdminItem[];
  isSuperAdmin: boolean;
  viewMode: "table" | "kanban";
  onViewModeChange: (mode: "table" | "kanban") => void;
  onOpenNewModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenAuditLogsModal: () => void;
  onExportCSV: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function BudgetFilterBar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categoriesList,
  periodFilter,
  onPeriodFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  selectedAdminId,
  onAdminChange,
  adminsList,
  isSuperAdmin,
  viewMode,
  onViewModeChange,
  onOpenNewModal,
  onOpenSettingsModal,
  onOpenAuditLogsModal,
  onExportCSV,
  onRefresh,
  isRefreshing
}: BudgetFilterBarProps) {
  const hasActiveFilters = search || typeFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all" || periodFilter !== "all" || (isSuperAdmin && selectedAdminId !== "all");

  const clearAllFilters = () => {
    onSearchChange("");
    onTypeFilterChange("all");
    onStatusFilterChange("all");
    onCategoryFilterChange("all");
    onPeriodFilterChange("all");
    onStartDateChange("");
    onEndDateChange("");
    if (isSuperAdmin) onAdminChange("all");
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-xs mb-6 space-y-4">
      {/* Top Row: Search, Actions, View Mode */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
          <input
            type="text"
            placeholder="Search descriptions, categories, admins..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-lg text-sm text-text placeholder-muted-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
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

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Table / Kanban View Toggle */}
          <div className="flex items-center bg-background border border-border rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={cn(
                "p-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 text-xs",
                viewMode === "table"
                  ? "bg-surface text-text shadow-xs border border-border font-semibold"
                  : "text-muted-text hover:text-text"
              )}
              title="Table View"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("kanban")}
              className={cn(
                "p-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 text-xs",
                viewMode === "kanban"
                  ? "bg-surface text-text shadow-xs border border-border font-semibold"
                  : "text-muted-text hover:text-text"
              )}
              title="Kanban Board View"
            >
              <KanbanSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
          </div>

          {/* Refresh Button */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2"
            title="Refresh budget data"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-primary")} />
          </Button>

          {/* Audit Logs */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenAuditLogsModal}
            className="flex items-center gap-1.5"
            title="View Audit Trail"
          >
            <History className="w-3.5 h-3.5 text-muted-text" />
            <span className="hidden md:inline">Audit Trail</span>
          </Button>

          {/* Settings / Targets */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenSettingsModal}
            className="flex items-center gap-1.5"
            title="Budget Preferences & Color Customization"
          >
            <Settings2 className="w-3.5 h-3.5 text-muted-text" />
            <span className="hidden md:inline">Preferences</span>
          </Button>

          {/* Export CSV */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onExportCSV}
            className="flex items-center gap-1.5"
            title="Export to CSV file"
          >
            <Download className="w-3.5 h-3.5 text-muted-text" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          {/* New Entry Primary CTA */}
          <Button
            type="button"
            size="sm"
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Entry</span>
          </Button>
        </div>
      </div>

      {/* Filter Selectors Row */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border text-xs">
        
        {/* Superadmin Admin Selector */}
        {isSuperAdmin && (
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1 text-xs">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-text">Admin:</span>
            <select
              value={selectedAdminId}
              onChange={(e) => onAdminChange(e.target.value)}
              className="bg-transparent font-medium text-text focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-surface text-text">Consolidated (All Admins)</option>
              {adminsList.map((adm) => (
                <option key={adm.id} value={adm.id} className="bg-surface text-text">
                  {adm.name} ({adm.role})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Period Selector */}
        <select
          value={periodFilter}
          onChange={(e) => onPeriodFilterChange(e.target.value)}
          className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-text font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors cursor-pointer text-xs"
        >
          <option value="all" className="bg-surface text-text">All Dates</option>
          <option value="this_month" className="bg-surface text-text">This Month</option>
          <option value="last_month" className="bg-surface text-text">Last Month</option>
          <option value="this_quarter" className="bg-surface text-text">This Quarter</option>
          <option value="this_year" className="bg-surface text-text">This Year</option>
          <option value="custom" className="bg-surface text-text">Custom Date Range</option>
        </select>

        {/* Custom Date Range pickers if periodFilter === 'custom' */}
        {periodFilter === "custom" && (
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-transparent text-text text-xs outline-none"
            />
            <span className="text-muted-text">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-transparent text-text text-xs outline-none"
            />
          </div>
        )}

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-text font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors cursor-pointer text-xs"
        >
          <option value="all" className="bg-surface text-text">All Types</option>
          <option value="income" className="bg-surface text-text">Incomes Only (+)</option>
          <option value="outcome" className="bg-surface text-text">Outcomes Only (-)</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-text font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors cursor-pointer text-xs"
        >
          <option value="all" className="bg-surface text-text">All Statuses</option>
          <option value="confirmed" className="bg-surface text-text">Confirmed</option>
          <option value="planned" className="bg-surface text-text">Planned</option>
          <option value="pending" className="bg-surface text-text">Pending</option>
          <option value="rejected" className="bg-surface text-text">Rejected</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-text font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors cursor-pointer text-xs"
        >
          <option value="all" className="bg-surface text-text">All Categories</option>
          {categoriesList.map((cat) => (
            <option key={cat} value={cat} className="bg-surface text-text">{cat}</option>
          ))}
        </select>

        {/* Reset Filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-primary hover:underline px-2 py-1 font-medium flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
