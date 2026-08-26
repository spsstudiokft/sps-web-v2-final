import React, { useState, useEffect } from "react";
import { 
  X, 
  History, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Settings2, 
  Clock, 
  User, 
  RefreshCw
} from "lucide-react";
import { BudgetAuditLog } from "../../../types";
import { Button } from "../../ui/Button";
import { cn } from "../../../lib/utils";
import { useLanguage } from "../../../contexts/LanguageContext";

interface BudgetAuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
}

export function BudgetAuditLogsModal({
  isOpen,
  onClose,
  token
}: BudgetAuditLogsModalProps) {
  const { tUi } = useLanguage();
  const [logs, setLogs] = useState<BudgetAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterAction, setFilterAction] = useState<string>("all");

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/budgets/audit-logs", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterAction === "all") return true;
    return log.action === filterAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "create":
        return {
          label: "Created Entry",
          icon: PlusCircle,
          bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
        };
      case "update":
        return {
          label: "Updated Entry",
          icon: Edit3,
          bg: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
        };
      case "delete":
        return {
          label: "Deleted Entry",
          icon: Trash2,
          bg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
        };
      case "settings_update":
        return {
          label: "Updated Settings",
          icon: Settings2,
          bg: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
        };
      default:
        return {
          label: action,
          icon: Clock,
          bg: "bg-surface text-text border-border"
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text font-heading">
                {tUi("admin.budget.audit.title")}</h2>
              <p className="text-xs text-muted-text">
                {tUi("admin.budget.audit.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-surface-hover transition-colors"
              title={tUi("admin.budget.audit.refresh")}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin text-primary")} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-surface-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 border-b border-border flex items-center justify-between gap-2 bg-background shrink-0 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-text">{tUi("admin.budget.audit.filter_action")}:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1 text-text font-medium focus:outline-none"
            >
              <option value="all">All Actions ({logs.length})</option>
              <option value="create">{tUi("admin.budget.audit.created")}</option>
              <option value="update">{tUi("admin.budget.audit.updated")}</option>
              <option value="delete">{tUi("admin.budget.audit.deleted")}</option>
              <option value="settings_update">{tUi("admin.budget.audit.settings_updated")}</option>
            </select>
          </div>

          <span className="text-muted-text">
            {tUi("admin.faq_categories.showing")}{filteredLogs.length} events
          </span>
        </div>

        {/* Logs List Body */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-background border border-border rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-text">
              No audit logs recorded for this filter.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const badge = getActionBadge(log.action);
              const Icon = badge.icon;
              const details = log.details || {};

              return (
                <div
                  key={log.id}
                  className="bg-background border border-border rounded-xl p-3.5 text-xs transition-all hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold border",
                        badge.bg
                      )}>
                        <Icon className="w-3 h-3" />
                        {badge.label}
                      </span>
                      <div className="flex items-center gap-1 text-text font-semibold">
                        <User className="w-3.5 h-3.5 text-muted-text" />
                        <span>{log.performedByName || "Admin"}</span>
                        <span className="text-[10px] text-muted-text font-normal">
                          ({log.performerRole || "admin"})
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-text font-mono whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Details Render */}
                  {log.action === "create" && (
                    <div className="text-muted-text bg-surface p-2.5 rounded-lg border border-border text-[11px]">
                      {tUi("admin.budget.audit.created_summary", { type: details.type, amount: details.amount, currency: details.currency, category: details.category || tUi("admin.budget.general"), date: details.date, status: details.status })}
                      {details.description && <p className="mt-1 text-muted-text italic">"{details.description}"</p>}
                    </div>
                  )}

                  {log.action === "update" && (
                    <div className="text-muted-text bg-surface p-2.5 rounded-lg border border-border text-[11px] space-y-1">
                      <div>{tUi("admin.budget.audit.updated_changes")}</div>
                      {details.before && details.after && (
                        <div className="grid grid-cols-2 gap-2 mt-1 text-[10px]">
                          <div className="p-1.5 bg-rose-500/5 rounded border border-rose-500/20">
                            <strong className="text-rose-600 dark:text-rose-400 block mb-0.5">{tUi("admin.budget.audit.previous")}</strong>
                            <span className="text-muted-text">{details.before.type} · ${details.before.amount} · {details.before.status} · {details.before.date}</span>
                          </div>
                          <div className="p-1.5 bg-emerald-500/5 rounded border border-emerald-500/20">
                            <strong className="text-emerald-600 dark:text-emerald-400 block mb-0.5">{tUi("admin.budget.audit.updated_value")}</strong>
                            <span className="text-muted-text">{details.after.type} · ${details.after.amount} · {details.after.status} · {details.after.date}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {log.action === "delete" && (
                    <div className="text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 text-[11px]">
                      Deleted {details.deleted_entry?.type || "entry"}: ${details.deleted_entry?.amount} ({details.deleted_entry?.category || "General"})
                    </div>
                  )}

                  {log.action === "settings_update" && (
                    <div className="text-muted-text bg-surface p-2.5 rounded-lg border border-border text-[11px]">
                      Saved preferences: Color <strong className="text-text">{details.default_color}</strong> · Currency <strong className="text-text">{details.default_currency}</strong> · Target: <strong className="text-text">${details.monthly_target_income}</strong> · Cap: <strong className="text-text">${details.monthly_budget_cap}</strong>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-background flex justify-end shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            {tUi("admin.team.btn_close")}</Button>
        </div>
      </div>
    </div>
  );
}
