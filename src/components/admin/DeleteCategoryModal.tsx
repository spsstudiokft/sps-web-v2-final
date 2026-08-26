import { useLanguage } from "../../contexts/LanguageContext";
import React, { useState } from "react";
import { FAQCategory } from "../../lib/types";
import { Button } from "../ui/Button";
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  HelpCircle, 
  ArrowRight, 
  FolderTree 
} from "lucide-react";

interface DeleteCategoryModalProps {
  isOpen: boolean;
  category: FAQCategory | null;
  allCategories: FAQCategory[];
  onClose: () => void;
  onConfirm: (categoryId: string, reassignToId?: string) => Promise<void>;
}

function parseText(val: string | undefined, fallback = "Untitled"): string {
  if (!val) return fallback;
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && parsed !== null) {
      return (
        parsed["en"] ||
        Object.values(parsed).find((v) => typeof v === "string" && v.trim() !== "") ||
        fallback
      );
    }
  } catch {
    return val;
  }
  return val;
}

export function DeleteCategoryModal({
  isOpen,
  category,
  allCategories,
  onClose,
  onConfirm,
}: DeleteCategoryModalProps) {
  const { tUi } = useLanguage();
  const [reassignAction, setReassignAction] = useState<"general" | "reassign">("general");
  const [targetCategoryId, setTargetCategoryId] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen || !category) return null;

  const faqCount = Number(category.faq_count || 0);
  const otherCategories = allCategories.filter((c) => c.id !== category.id);
  const categoryName = parseText(category.name);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage("");
      
      let reassignTarget = "general";
      if (reassignAction === "reassign" && targetCategoryId) {
        reassignTarget = targetCategoryId;
      }
      
      await onConfirm(category.id, reassignTarget);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete category");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-background border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-text">{tUi("admin.faq_categories.delete_category")}</h3>
            <p className="text-xs text-muted-text mt-0.5">
              {tUi("admin.pricing.delete_modal_confirm_prefix")}<strong className="text-text">"{categoryName}"</strong>?
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-text hover:text-text rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm text-muted-text">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs">
              {errorMessage}
            </div>
          )}

          {faqCount > 0 ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>{faqCount} {tUi("admin.faq_categories.faq_singular")}{faqCount === 1 ? "question belongs" : "questions belong"} to this category</span>
                </div>
                <p>
                  To prevent any data loss, existing FAQs will be safely preserved and moved.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-text block">
                  How should existing FAQs be handled?
                </label>

                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-surface/50 cursor-pointer hover:bg-surface transition-colors">
                    <input
                      type="radio"
                      name="reassign_option"
                      checked={reassignAction === "general"}
                      onChange={() => setReassignAction("general")}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div className="text-xs">
                      <div className="font-medium text-text">Move FAQs to "General"</div>
                      <div className="text-muted-text text-[11px]">Keep questions published under the General group.</div>
                    </div>
                  </label>

                  {otherCategories.length > 0 && (
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-surface/50 cursor-pointer hover:bg-surface transition-colors">
                      <input
                        type="radio"
                        name="reassign_option"
                        checked={reassignAction === "reassign"}
                        onChange={() => {
                          setReassignAction("reassign");
                          if (!targetCategoryId && otherCategories.length > 0) {
                            setTargetCategoryId(otherCategories[0].id);
                          }
                        }}
                        className="mt-0.5 text-primary focus:ring-primary"
                      />
                      <div className="flex-1 text-xs">
                        <div className="font-medium text-text">Move to another category</div>
                        {reassignAction === "reassign" && (
                          <select
                            value={targetCategoryId}
                            onChange={(e) => setTargetCategoryId(e.target.value)}
                            className="mt-2 w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {otherCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {parseText(c.name)} ({c.faq_count || 0} FAQs)
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs">
              This category has no FAQ items associated with it. Deleting it will permanently remove the category.
            </p>
          )}

          <div className="text-[11px] text-muted-text pt-2 border-t border-border">
            Any child subcategories nested under this category will be promoted to top-level.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface/50">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isDeleting} size="sm">
            {tUi("admin.clients.cancel")}</Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            size="sm"
            className="flex items-center gap-1.5"
          >
            {isDeleting ? (
              <span>{tUi("admin.faqs.deleting")}</span>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{tUi("admin.faq_categories.delete_category")}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
