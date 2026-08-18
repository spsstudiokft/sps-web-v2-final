import React, { useState, useEffect } from "react";
import { 
  X, 
  Palette, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  FileText
} from "lucide-react";
import { BudgetAdminSettings, BudgetPeriodStatus } from "../../../types";
import { Button } from "../../ui/Button";
import { cn } from "../../../lib/utils";

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Partial<BudgetAdminSettings>) => Promise<void>;
  currentSettings: BudgetAdminSettings | null;
}

const PRESET_THEME_COLORS = [
  { name: "Cobalt Blue", hex: "#3B82F6" },
  { name: "Emerald Studio", hex: "#10B981" },
  { name: "Royal Purple", hex: "#8B5CF6" },
  { name: "Crimson Rose", hex: "#F43F5E" },
  { name: "Amber Gold", hex: "#F59E0B" },
  { name: "Cyan Horizon", hex: "#06B6D4" },
  { name: "Deep Indigo", hex: "#6366F1" },
  { name: "Teal Modern", hex: "#14B8A6" },
  { name: "Tangerine", hex: "#F97316" },
  { name: "Dark Slate", hex: "#475569" }
];

export function BudgetSettingsModal({
  isOpen,
  onClose,
  onSave,
  currentSettings
}: BudgetSettingsModalProps) {
  const [defaultColor, setDefaultColor] = useState<string>("#3B82F6");
  const [defaultCurrency, setDefaultCurrency] = useState<string>("USD");
  const [monthlyTargetIncome, setMonthlyTargetIncome] = useState<string>("5000");
  const [monthlyBudgetCap, setMonthlyBudgetCap] = useState<string>("2000");
  const [periodStatus, setPeriodStatus] = useState<BudgetPeriodStatus>("in_progress");
  const [periodNotes, setPeriodNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (currentSettings) {
      setDefaultColor(currentSettings.default_color || "#3B82F6");
      setDefaultCurrency(currentSettings.default_currency || "USD");
      setMonthlyTargetIncome(String(currentSettings.monthly_target_income || 0));
      setMonthlyBudgetCap(String(currentSettings.monthly_budget_cap || 0));
      setPeriodStatus(currentSettings.period_status || "in_progress");
      setPeriodNotes(currentSettings.period_notes || "");
    }
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      setIsSubmitting(true);
      await onSave({
        default_color: defaultColor,
        default_currency: defaultCurrency,
        monthly_target_income: parseFloat(monthlyTargetIncome) || 0,
        monthly_budget_cap: parseFloat(monthlyBudgetCap) || 0,
        period_status: periodStatus,
        period_notes: periodNotes.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save budget preferences.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-3.5 h-3.5 rounded-full ring-2 ring-offset-2 ring-border shadow-xs" 
              style={{ backgroundColor: defaultColor }} 
            />
            <div>
              <h2 className="text-lg font-bold text-text font-heading">
                Budget Preferences & Customization
              </h2>
              <p className="text-xs text-muted-text">
                Personalize your financial theme color, currency, and period targets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Color Coding (Custom platform identity) */}
          <div className="bg-background p-4 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-primary" />
                Personal Theme Color
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={defaultColor}
                  onChange={(e) => setDefaultColor(e.target.value)}
                  className="w-6 h-6 rounded-md cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="text-[11px] font-mono text-muted-text font-semibold uppercase">{defaultColor}</span>
              </div>
            </div>
            <p className="text-xs text-muted-text mb-3">
              Your entries across the studio and consolidated superadmin views will be color-coded with this accent.
            </p>

            <div className="grid grid-cols-5 gap-2">
              {PRESET_THEME_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setDefaultColor(c.hex)}
                  className={cn(
                    "h-8 rounded-lg flex items-center justify-center transition-all text-white font-bold text-xs shadow-xs",
                    defaultColor.toLowerCase() === c.hex.toLowerCase()
                      ? "ring-2 ring-offset-2 ring-primary scale-105"
                      : "hover:scale-105 opacity-90 hover:opacity-100"
                  )}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {defaultColor.toLowerCase() === c.hex.toLowerCase() && "✓"}
                </button>
              ))}
            </div>
          </div>

          {/* Default Currency */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Default Currency
            </label>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full py-2.5 px-3 bg-background border border-border rounded-xl text-sm font-semibold text-text focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="HUF">HUF (Ft) - Hungarian Forint</option>
              <option value="GBP">GBP (£) - British Pound</option>
              <option value="CAD">CAD ($) - Canadian Dollar</option>
              <option value="CHF">CHF (Fr) - Swiss Franc</option>
              <option value="AUD">AUD ($) - Australian Dollar</option>
            </select>
          </div>

          {/* Monthly Revenue Target & Expense Cap */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text mb-1.5 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                Monthly Revenue Target
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="5000"
                value={monthlyTargetIncome}
                onChange={(e) => setMonthlyTargetIncome(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm font-bold text-text focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Monthly Expense Cap
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="2000"
                value={monthlyBudgetCap}
                onChange={(e) => setMonthlyBudgetCap(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm font-bold text-text focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Overall Period Budget Status */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Overall Period Health / Status
            </label>
            <select
              value={periodStatus}
              onChange={(e) => setPeriodStatus(e.target.value as BudgetPeriodStatus)}
              className="w-full py-2.5 px-3 bg-background border border-border rounded-xl text-sm text-text focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="on_track">🟢 On Track (Revenue beating forecasts)</option>
              <option value="in_progress">🔵 In Progress (Standard monthly cadence)</option>
              <option value="planned">⚪ Planned (Initial projections)</option>
              <option value="over_budget">🔴 Over Budget (Expenses exceeding limits)</option>
              <option value="reviewed">🟣 Reviewed (Audit completed)</option>
              <option value="closed">🔒 Closed (Period finalized & archived)</option>
            </select>
          </div>

          {/* Strategy / Period Notes */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-muted-text" />
              Strategic Period Notes & Goals
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Focus on luxury real estate campaigns; reinvesting 20% into new cinema drone lenses..."
              value={periodNotes}
              onChange={(e) => setPeriodNotes(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-text focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Preferences
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
