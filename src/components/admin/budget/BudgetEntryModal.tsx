import React, { useState, useEffect } from "react";
import { 
  X, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Palette, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles
} from "lucide-react";
import { BudgetEntry, BudgetEntryType, BudgetStatus } from "../../../types";
import { Button } from "../../ui/Button";
import { cn } from "../../../lib/utils";

interface BudgetEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entryData: Partial<BudgetEntry>) => Promise<void>;
  entryToEdit?: BudgetEntry | null;
  defaultCurrency?: string;
  defaultAdminColor?: string;
}

const PRESET_CATEGORIES_INCOME = [
  "Client Invoices",
  "Real Estate Shoots",
  "Drone Aerials",
  "Virtual 3D Tours",
  "Commercial Video",
  "Studio Retainer",
  "License Fees",
  "Other Income"
];

const PRESET_CATEGORIES_OUTCOME = [
  "Studio Rental & Space",
  "Equipment & Camera Gear",
  "Drone Maintenance & FAA",
  "Software & Cloud Licenses",
  "Contractor & Freelancer",
  "Marketing & Lead Gen",
  "Travel, Gas & Transport",
  "Editing & Post-Production",
  "Office & Supplies",
  "Taxes & Legal Fees",
  "Other Expense"
];

const PRESET_COLORS = [
  { name: "Emerald", hex: "#10B981" },
  { name: "Sky Blue", hex: "#0EA5E9" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Orange", hex: "#F97316" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Slate", hex: "#64748B" }
];

export function BudgetEntryModal({
  isOpen,
  onClose,
  onSave,
  entryToEdit,
  defaultCurrency = "USD",
  defaultAdminColor = "#3B82F6"
}: BudgetEntryModalProps) {
  const [type, setType] = useState<BudgetEntryType>("income");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<string>("Client Invoices");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [status, setStatus] = useState<BudgetStatus>("confirmed");
  const [description, setDescription] = useState<string>("");
  const [colorCode, setColorCode] = useState<string>(defaultAdminColor);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (entryToEdit) {
      setType(entryToEdit.type);
      setAmount(String(entryToEdit.amount));
      setCurrency(entryToEdit.currency || defaultCurrency);
      setDate(entryToEdit.date);
      if (
        (entryToEdit.type === "income" && PRESET_CATEGORIES_INCOME.includes(entryToEdit.category || "")) ||
        (entryToEdit.type === "outcome" && PRESET_CATEGORIES_OUTCOME.includes(entryToEdit.category || ""))
      ) {
        setCategory(entryToEdit.category || "General");
        setCustomCategory("");
      } else {
        setCategory("custom");
        setCustomCategory(entryToEdit.category || "");
      }
      setStatus(entryToEdit.status || "planned");
      setDescription(entryToEdit.description || "");
      setColorCode(entryToEdit.color_code || defaultAdminColor);
    } else {
      setType("income");
      setAmount("");
      setCurrency(defaultCurrency);
      setDate(new Date().toISOString().split("T")[0]);
      setCategory("Client Invoices");
      setCustomCategory("");
      setStatus("confirmed");
      setDescription("");
      setColorCode(defaultAdminColor);
    }
    setErrorMessage("");
  }, [entryToEdit, isOpen, defaultCurrency, defaultAdminColor]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: BudgetEntryType) => {
    setType(newType);
    if (category !== "custom") {
      setCategory(newType === "income" ? PRESET_CATEGORIES_INCOME[0] : PRESET_CATEGORIES_OUTCOME[0]);
    }
  };

  const setDateToday = () => setDate(new Date().toISOString().split("T")[0]);
  const setDateYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split("T")[0]);
  };
  const setDateFirstOfMonth = () => {
    const d = new Date();
    d.setDate(1);
    setDate(d.toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage("Please enter a valid amount greater than 0.");
      return;
    }

    if (!date) {
      setErrorMessage("Please select a valid date.");
      return;
    }

    const finalCategory = category === "custom" ? (customCategory.trim() || "General") : category;

    try {
      setIsSubmitting(true);
      await onSave({
        type,
        amount: numAmount,
        currency,
        date,
        category: finalCategory,
        status,
        description: description.trim(),
        color_code: colorCode
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save budget entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableCategories = type === "income" ? PRESET_CATEGORIES_INCOME : PRESET_CATEGORIES_OUTCOME;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-3.5 h-3.5 rounded-full ring-2 ring-offset-2 ring-border shadow-xs" 
              style={{ backgroundColor: colorCode }} 
            />
            <h2 className="text-lg font-bold text-text font-heading">
              {entryToEdit ? "Edit Budget Entry" : "New Budget Entry"}
            </h2>
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
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Type Toggle: Income vs Outcome */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text mb-2">
              Transaction Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange("income")}
                className={cn(
                  "py-3 px-4 rounded-xl border flex items-center justify-center gap-2.5 text-sm font-semibold transition-all",
                  type === "income"
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-500/20"
                    : "bg-surface text-text border-border hover:bg-emerald-500/10 hover:border-emerald-500/30"
                )}
              >
                <ArrowUpRight className="w-4 h-4" />
                Income (+)
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange("outcome")}
                className={cn(
                  "py-3 px-4 rounded-xl border flex items-center justify-center gap-2.5 text-sm font-semibold transition-all",
                  type === "outcome"
                    ? "bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-500/20"
                    : "bg-surface text-text border-border hover:bg-rose-500/10 hover:border-rose-500/30"
                )}
              >
                <ArrowDownRight className="w-4 h-4" />
                Outcome / Expense (-)
              </button>
            </div>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-text mb-1.5">
                Amount *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-3 pr-3 py-2.5 text-lg font-bold bg-background border border-border rounded-xl text-text focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full py-2.5 px-3 bg-background border border-border rounded-xl text-sm font-semibold text-text focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="HUF">HUF (Ft)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="CHF">CHF (Fr)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
          </div>

          {/* Date and Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-text" />
                Date *
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={setDateToday}
                  className="text-[11px] font-medium text-primary hover:underline px-1.5 py-0.5 rounded-sm hover:bg-primary/10"
                >
                  Today
                </button>
                <span className="text-muted-text">·</span>
                <button
                  type="button"
                  onClick={setDateYesterday}
                  className="text-[11px] font-medium text-muted-text hover:underline px-1.5 py-0.5 rounded-sm hover:bg-surface-hover"
                >
                  Yesterday
                </button>
                <span className="text-muted-text">·</span>
                <button
                  type="button"
                  onClick={setDateFirstOfMonth}
                  className="text-[11px] font-medium text-muted-text hover:underline px-1.5 py-0.5 rounded-sm hover:bg-surface-hover"
                >
                  1st of Month
                </button>
              </div>
            </div>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-text focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="col-span-2 sm:col-span-1 px-3 py-2 bg-background border border-border rounded-xl text-sm text-text focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="custom">+ Custom Category</option>
              </select>

              {category === "custom" && (
                <input
                  type="text"
                  placeholder="Enter custom category..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="col-span-2 sm:col-span-1 px-3 py-2 bg-background border border-border rounded-xl text-sm text-text focus:ring-2 focus:ring-primary focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Status *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "confirmed", label: "Confirmed", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", activeBg: "bg-emerald-600 text-white border-emerald-700" },
                { id: "planned", label: "Planned", icon: Sparkles, color: "text-sky-600 dark:text-sky-400", activeBg: "bg-sky-600 text-white border-sky-700" },
                { id: "pending", label: "Pending", icon: Clock, color: "text-amber-600 dark:text-amber-400", activeBg: "bg-amber-600 text-white border-amber-700" },
                { id: "rejected", label: "Rejected", icon: AlertCircle, color: "text-rose-600 dark:text-rose-400", activeBg: "bg-rose-600 text-white border-rose-700" }
              ].map((st) => {
                const Icon = st.icon;
                const isSelected = status === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatus(st.id as BudgetStatus)}
                    className={cn(
                      "py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                      isSelected
                        ? st.activeBg
                        : "bg-surface border-border text-text hover:bg-surface-hover"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", !isSelected && st.color)} />
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Description & Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 5-bedroom luxury estate drone photoshoot on Sunset Blvd..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-text focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Color Code (Platform Customization) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-muted-text" />
                Color Tag & Visual Coding
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={colorCode}
                  onChange={(e) => setColorCode(e.target.value)}
                  className="w-6 h-6 rounded-md cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="text-[11px] font-mono text-muted-text uppercase">{colorCode}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColorCode(c.hex)}
                  title={c.name}
                  className={cn(
                    "w-7 h-7 rounded-full transition-transform shadow-xs",
                    colorCode.toLowerCase() === c.hex.toLowerCase()
                      ? "ring-2 ring-offset-2 ring-primary scale-110"
                      : "hover:scale-105 opacity-90 hover:opacity-100"
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
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
              className={cn(
                "flex items-center gap-2",
                type === "income" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"
              )}
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {entryToEdit ? "Update Entry" : "Save Entry"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
