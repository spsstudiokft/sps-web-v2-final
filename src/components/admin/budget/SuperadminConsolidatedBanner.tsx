import React from "react";
import { 
  ShieldCheck, 
  Users, 
  Lock, 
  Check, 
  Layers,
  Sparkles
} from "lucide-react";
import { BudgetAdminItem } from "../../../types";
import { cn } from "../../../lib/utils";

interface SuperadminConsolidatedBannerProps {
  admins: BudgetAdminItem[];
  selectedAdminId: string;
  onSelectAdmin: (adminId: string) => void;
  currency?: string;
}

export function SuperadminConsolidatedBanner({
  admins,
  selectedAdminId,
  onSelectAdmin,
  currency = "USD"
}: SuperadminConsolidatedBannerProps) {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalStudioIncome = admins.reduce((acc, a) => acc + a.totalIncome, 0);
  const totalStudioOutcome = admins.reduce((acc, a) => acc + a.totalOutcome, 0);
  const totalStudioNet = totalStudioIncome - totalStudioOutcome;

  return (
    <div className="bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-purple-900/10 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 mb-6 relative overflow-hidden shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Superadmin Consolidated View
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Read-Only Across All Budgets
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Review company-wide financial performance across all administrators and studio members.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs bg-white/70 dark:bg-gray-900/70 px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-gray-800">
          <div>
            <span className="text-gray-400 text-[10px] uppercase block">Studio Net</span>
            <span className={cn(
              "font-bold",
              totalStudioNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}>
              {totalStudioNet >= 0 ? "+" : ""}{formatMoney(totalStudioNet)}
            </span>
          </div>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
          <div>
            <span className="text-gray-400 text-[10px] uppercase block">Active Admins</span>
            <span className="font-bold text-gray-900 dark:text-white">{admins.length}</span>
          </div>
        </div>
      </div>

      {/* Admin Quick Switcher Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => onSelectAdmin("all")}
          className={cn(
            "px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 flex items-center gap-1.5 border",
            selectedAdminId === "all"
              ? "bg-blue-600 text-white border-blue-700 shadow-xs font-semibold"
              : "bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Admins (Consolidated)</span>
        </button>

        {admins.map((adm) => (
          <button
            key={adm.id}
            type="button"
            onClick={() => onSelectAdmin(adm.id)}
            className={cn(
              "px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 flex items-center gap-2 border",
              selectedAdminId === adm.id
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs font-semibold"
                : "bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800"
            )}
          >
            <div 
              className="w-2.5 h-2.5 rounded-full shrink-0" 
              style={{ backgroundColor: adm.defaultColor || "#3B82F6" }} 
            />
            <span>{adm.name}</span>
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.2 rounded",
              adm.net >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            )}>
              {formatMoney(adm.net)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
