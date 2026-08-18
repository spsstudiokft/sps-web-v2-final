import React, { useState, useEffect } from "react";
import { FAQItem, FAQCategory } from "../../lib/types";
import { TranslatableInput } from "./TranslatableInput";
import { FaqCategoryModal } from "./FaqCategoryModal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { useApi } from "../../hooks/useApi";
import { 
  X, 
  HelpCircle, 
  Tag, 
  Eye, 
  AlertCircle, 
  Check, 
  ChevronDown, 
  Layers,
  Plus
} from "lucide-react";

interface FaqModalProps {
  isOpen: boolean;
  faq: Partial<FAQItem> | null;
  siteLanguages: string;
  categories?: FAQCategory[];
  onClose: () => void;
  onSave: (faqData: Partial<FAQItem>) => Promise<void>;
  onCategoryCreated?: (newCategory: FAQCategory) => void;
}

function parseText(val: string | undefined): string {
  if (!val) return "";
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && parsed !== null) {
      return (
        parsed["en"] ||
        Object.values(parsed).find((v) => typeof v === "string" && v.trim() !== "") as string ||
        ""
      );
    }
  } catch {
    return val.trim();
  }
  return val.trim();
}

export function FaqModal({
  isOpen,
  faq,
  siteLanguages,
  categories = [],
  onClose,
  onSave,
  onCategoryCreated,
}: FaqModalProps) {
  const [formData, setFormData] = useState<Partial<FAQItem>>({
    question: "",
    answer: "",
    category: "General",
    category_id: null,
    is_published: 1,
    sort_order: 0,
  });

  const { fetchApi } = useApi();
  const [customCategory, setCustomCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    if (faq) {
      setFormData({
        id: faq.id,
        question: faq.question || "",
        answer: faq.answer || "",
        category: faq.category || "General",
        category_id: faq.category_id || null,
        is_published: faq.is_published !== undefined ? faq.is_published : 1,
        sort_order: faq.sort_order || 0,
      });
      setCustomCategory("");
    } else {
      // Find first available category if any
      const defaultCat = categories.length > 0 ? categories[0] : null;
      setFormData({
        question: "",
        answer: "",
        category: defaultCat ? parseText(defaultCat.name) : "General",
        category_id: defaultCat ? defaultCat.id : null,
        is_published: 1,
        sort_order: 0,
      });
      setCustomCategory("");
    }
    setErrorMessage("");
  }, [faq, isOpen, categories]);

  if (!isOpen) return null;

  // Build hierarchical category items (top-level and children)
  const hierarchicalCategories = (() => {
    const roots = categories.filter((c) => !c.parent_id);
    const result: Array<{ id: string; name: string; isChild?: boolean; parentName?: string }> = [];

    roots.forEach((root) => {
      const rootName = parseText(root.name);
      result.push({ id: root.id, name: rootName });
      const children = categories.filter((c) => c.parent_id === root.id);
      children.forEach((child) => {
        result.push({
          id: child.id,
          name: `└── ${parseText(child.name)}`,
          isChild: true,
          parentName: rootName,
        });
      });
    });

    // Add any orphaned children if any
    const processedIds = new Set(result.map((r) => r.id));
    categories.forEach((c) => {
      if (!processedIds.has(c.id)) {
        result.push({ id: c.id, name: parseText(c.name) });
      }
    });

    return result;
  })();

  const handleCategorySelect = (selectedVal: string) => {
    if (selectedVal === "custom") {
      setFormData((prev) => ({ ...prev, category_id: null }));
      setCustomCategory("");
      return;
    }

    const matchedCat = categories.find((c) => c.id === selectedVal || parseText(c.name) === selectedVal);
    if (matchedCat) {
      setFormData((prev) => ({
        ...prev,
        category_id: matchedCat.id,
        category: parseText(matchedCat.name),
      }));
      setCustomCategory("");
    } else {
      setFormData((prev) => ({
        ...prev,
        category_id: null,
        category: selectedVal,
      }));
      setCustomCategory("");
    }
  };

  const handleInlineCategorySave = async (newCatData: Partial<FAQCategory>) => {
    try {
      const res = await fetchApi("/api/admin/faq-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCatData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create category");
      }
      const data = await res.json();
      const newCategoryName = parseText(newCatData.name as string);
      
      const createdObj: FAQCategory = {
        id: data.id,
        name: newCatData.name as string,
        slug: newCatData.slug,
        description: newCatData.description,
        parent_id: newCatData.parent_id,
        is_published: 1,
        sort_order: newCatData.sort_order || 1,
      };

      if (onCategoryCreated) {
        onCategoryCreated(createdObj);
      }

      // Automatically select the new category for this FAQ
      setFormData((prev) => ({
        ...prev,
        category_id: data.id,
        category: newCategoryName,
      }));
      setShowCategoryModal(false);
    } catch (err: any) {
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const questionText = parseText(formData.question);
    const answerText = parseText(formData.answer);

    if (!questionText) {
      setErrorMessage("Please enter the FAQ question.");
      return;
    }

    if (!answerText) {
      setErrorMessage("Please enter the FAQ answer.");
      return;
    }

    const finalCategory = customCategory.trim() || formData.category || "General";

    try {
      setIsSubmitting(true);
      await onSave({
        ...formData,
        category: finalCategory,
        category_id: customCategory.trim() ? null : formData.category_id,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save FAQ. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
        <div className="bg-background border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-surface/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">
                  {formData.id ? "Edit FAQ Item" : "Create New FAQ Item"}
                </h2>
                <p className="text-xs text-muted-text">
                  Add clear, helpful answers to common client questions and inquiries.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-muted-text hover:text-text hover:bg-surface rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <form id="faq-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {errorMessage && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* Question & Answer Inputs */}
            <div className="space-y-4">
              <TranslatableInput
                label="Question *"
                value={formData.question}
                onChange={(val) => setFormData((prev) => ({ ...prev, question: val }))}
                siteLanguages={siteLanguages}
              />

              <TranslatableInput
                label="Answer *"
                value={formData.answer || ""}
                onChange={(val) => setFormData((prev) => ({ ...prev, answer: val }))}
                siteLanguages={siteLanguages}
                isTextarea={true}
              />
            </div>

            {/* Category Selection */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-text flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-primary" />
                  <span>Category / Section</span>
                </Label>
                
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-text mb-1 block">Choose Group</Label>
                  <select
                    value={formData.category_id || formData.category || ""}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {hierarchicalCategories.length > 0 ? (
                      hierarchicalCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))
                    ) : (
                      <option value="General">General</option>
                    )}
                    <option value="custom">+ Type Custom Name...</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-muted-text mb-1 block">Or Type Custom Category</Label>
                  <Input
                    placeholder="e.g. Commercial Shoots, Floor Plans"
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      if (e.target.value) {
                        setFormData((prev) => ({ ...prev, category: e.target.value, category_id: null }));
                      }
                    }}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Visibility & Sort Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <Label className="text-sm font-medium text-text mb-2 block">Visibility</Label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface/50 cursor-pointer hover:bg-surface transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_published === 1}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_published: e.target.checked ? 1 : 0,
                      }))
                    }
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="text-sm font-medium text-text">Published on Site</div>
                    <div className="text-xs text-muted-text">
                      When checked, this FAQ appears in the public FAQs section.
                    </div>
                  </div>
                </label>
              </div>

              <div>
                <Label className="text-sm font-medium text-text mb-2 block">Sort Order Position</Label>
                <Input
                  type="number"
                  value={formData.sort_order ?? 0}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sort_order: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="text-sm"
                  min={0}
                />
                <p className="text-xs text-muted-text mt-1">
                  Lower numbers appear higher on the page (e.g. 1, 2, 3).
                </p>
              </div>
            </div>

            {/* Live Accordion Preview */}
            <div className="pt-2">
              <Label className="text-xs uppercase tracking-wider text-muted-text mb-2 block font-semibold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Live Accordion Preview
              </Label>
              <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(!previewOpen)}
                  className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-surface/80"
                >
                  <div className="pr-4">
                    <div className="inline-block px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold mb-1">
                      {customCategory.trim() || formData.category || "General"}
                    </div>
                    <div className="text-base font-semibold text-text">
                      {parseText(formData.question) || "What is your question preview?"}
                    </div>
                  </div>
                  <div
                    className={`w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center text-muted-text transition-transform duration-200 shrink-0 ${
                      previewOpen ? "transform rotate-180 bg-primary/10 text-primary border-primary/30" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                {previewOpen && (
                  <div className="px-5 pb-5 text-sm text-muted-text leading-relaxed border-t border-border/60 pt-3">
                    {parseText(formData.answer) ||
                      "This is how your detailed answer will render inside the expandable accordion for clients visiting the website."}
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface/50">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="faq-form"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{formData.id ? "Save Changes" : "Create FAQ"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Inline Category Modal for quick creation */}
      <FaqCategoryModal
        isOpen={showCategoryModal}
        category={null}
        siteLanguages={siteLanguages}
        allCategories={categories}
        onClose={() => setShowCategoryModal(false)}
        onSave={handleInlineCategorySave}
      />
    </>
  );
}

