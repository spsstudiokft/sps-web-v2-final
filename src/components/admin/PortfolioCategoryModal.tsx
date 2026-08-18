import React, { useState, useEffect } from "react";
import { Category } from "../../lib/types";
import { TranslatableInput } from "./TranslatableInput";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { useLanguage } from "../../contexts/LanguageContext";
import { t as translateContent } from "../../lib/i18n";
import { 
  X, 
  FolderTree, 
  Layers, 
  Link as LinkIcon, 
  Hash, 
  AlertCircle, 
  Check, 
  Loader2, 
  FileText,
  Sparkles
} from "lucide-react";

interface PortfolioCategoryModalProps {
  isOpen: boolean;
  category: Partial<Category> | null;
  siteLanguages: string;
  allCategories: Category[];
  onClose: () => void;
  onSave: (categoryData: Partial<Category>) => Promise<void>;
}

// Utility: Slugify input text
function slugify(text: string): string {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null) {
      text = parsed["en"] || Object.values(parsed)[0] || "";
    }
  } catch {}
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Utility: Extract plain text from translatable string or JSON
function parseText(val: string | undefined): string {
  if (!val) return "";
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && parsed !== null) {
      return (
        parsed["en"] ||
        (Object.values(parsed).find((v) => typeof v === "string" && v.trim() !== "") as string) ||
        ""
      );
    }
  } catch {
    return val.trim();
  }
  return val.trim();
}

export function PortfolioCategoryModal({
  isOpen,
  category,
  siteLanguages,
  allCategories,
  onClose,
  onSave,
}: PortfolioCategoryModalProps) {
  const { currentLanguage, defaultLanguage, tUi } = useLanguage();
  const [formData, setFormData] = useState<Partial<Category>>({
    name: "",
    slug: "",
    description: "",
    parent_id: null,
    sort_order: 0,
  });

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setFormData({
          id: category.id,
          name: category.name || "",
          slug: category.slug || "",
          description: category.description || "",
          parent_id: category.parent_id || null,
          sort_order: category.sort_order !== undefined ? category.sort_order : 0,
        });
        setAutoSlug(!category.slug);
      } else {
        setFormData({
          name: "",
          slug: "",
          description: "",
          parent_id: null,
          sort_order: allCategories.length + 1,
        });
        setAutoSlug(true);
      }
      setErrorMessage("");
    }
  }, [category, isOpen, allCategories.length]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEditing = Boolean(formData.id);

  // Available parent categories (prevent selecting self as parent)
  const availableParents = allCategories.filter(
    (c) => !formData.id || c.id !== formData.id
  );

  const handleNameChange = (val: string) => {
    setFormData((prev) => {
      const updated = { ...prev, name: val };
      if (autoSlug) {
        updated.slug = slugify(val);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const nameText = parseText(formData.name);
    if (!nameText || nameText.trim() === "") {
      setErrorMessage("Please provide a category name.");
      return;
    }

    let finalSlug = formData.slug?.trim();
    if (!finalSlug) {
      finalSlug = slugify(formData.name || "");
    }
    if (!finalSlug) {
      finalSlug = `category-${Date.now()}`;
    }

    try {
      setSaving(true);
      await onSave({
        ...formData,
        slug: finalSlug,
        sort_order: Number(formData.sort_order) || 0,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save category. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="portfolio-category-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="portfolio-category-modal-title"
    >
      <div
        id="portfolio-category-modal-dialog"
        className="bg-background border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border bg-surface/50 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <FolderTree className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="portfolio-category-modal-title" className="text-lg font-bold text-text tracking-tight leading-snug">
                {isEditing ? "Edit Category" : "Add Portfolio Category"}
              </h2>
              <p className="text-xs text-muted-text">
                {isEditing
                  ? "Update category naming, hierarchy, and public portfolio grouping."
                  : "Create a new portfolio category to organize showcase galleries and projects."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-text hover:text-text hover:bg-surface rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form
          id="portfolio-category-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          {errorMessage && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm animate-in fade-in duration-150"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Category Name (Multilingual aware) */}
          <div className="space-y-1.5">
            <TranslatableInput
              label="Category Name *"
              value={formData.name || ""}
              onChange={handleNameChange}
              siteLanguages={siteLanguages || '[{"code":"en","name":"English"}]'}
              placeholder="e.g. Architecture & Interiors"
            />
          </div>

          {/* Slug & Parent Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="category-slug-input" className="text-sm font-semibold text-text flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span>Slug / Identifier</span>
                </Label>
                {autoSlug ? (
                  <span className="text-[11px] text-primary font-medium">Auto-generated</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAutoSlug(true);
                      setFormData((prev) => ({ ...prev, slug: slugify(prev.name || "") }));
                    }}
                    className="text-[11px] text-muted-text hover:text-primary transition-colors"
                  >
                    Reset to auto
                  </button>
                )}
              </div>
              <Input
                id="category-slug-input"
                value={formData.slug || ""}
                onChange={(e) => {
                  setAutoSlug(false);
                  setFormData((prev) => ({ ...prev, slug: e.target.value }));
                }}
                placeholder="e.g. architecture-interiors"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-text">
                Used in navigation filters and portfolio category URLs.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category-parent-select" className="text-sm font-semibold text-text flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Parent Category (Optional)</span>
              </Label>
              <select
                id="category-parent-select"
                className="w-full px-3.5 py-2.5 border border-border bg-surface text-text rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none sm:text-sm transition-all"
                value={formData.parent_id || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    parent_id: e.target.value ? e.target.value : null,
                  }))
                }
              >
                <option value="">-- Top-level Category (No Parent) --</option>
                {availableParents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {(() => {
                      const localizedName = translateContent(parent.name, currentLanguage, defaultLanguage) || parseText(parent.name);
                      return tUi(localizedName, currentLanguage) || localizedName;
                    })()}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-text">
                Nest under a parent to create subcategory groups.
              </p>
            </div>
          </div>

          {/* Description (Multilingual aware) */}
          <div className="space-y-1.5">
            <TranslatableInput
              label="Description (Optional)"
              value={formData.description || ""}
              onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
              siteLanguages={siteLanguages || '[{"code":"en","name":"English"}]'}
              isTextarea
              placeholder="Brief summary of projects included in this category..."
            />
          </div>

          {/* Display Sort Order */}
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="category-sort-input" className="text-sm font-semibold text-text flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>Display Sort Order</span>
            </Label>
            <Input
              id="category-sort-input"
              type="number"
              min={0}
              value={formData.sort_order ?? 0}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sort_order: parseInt(e.target.value) || 0,
                }))
              }
              className="text-sm font-mono"
            />
            <p className="text-[11px] text-muted-text">
              Lower numbers appear first in gallery filter bars.
            </p>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface/50 shrink-0">
          <div className="text-xs text-muted-text hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-[10px]">Esc</kbd> to exit
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="portfolio-category-form"
              disabled={saving}
              className="flex-1 sm:flex-none"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" aria-hidden="true" />
                  {isEditing ? "Save Changes" : "Create Category"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
