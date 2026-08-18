import React, { useState, useEffect } from "react";
import { FAQCategory } from "../../lib/types";
import { TranslatableInput } from "./TranslatableInput";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { 
  X, 
  FolderTree, 
  Tag, 
  Eye, 
  AlertCircle, 
  Check, 
  Layers, 
  Hash, 
  FileText,
  Link as LinkIcon
} from "lucide-react";

interface FaqCategoryModalProps {
  isOpen: boolean;
  category: Partial<FAQCategory> | null;
  siteLanguages: string;
  allCategories: FAQCategory[];
  onClose: () => void;
  onSave: (categoryData: Partial<FAQCategory>) => Promise<void>;
}

// Slug generator utility
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

export function FaqCategoryModal({
  isOpen,
  category,
  siteLanguages,
  allCategories,
  onClose,
  onSave,
}: FaqCategoryModalProps) {
  const [formData, setFormData] = useState<Partial<FAQCategory>>({
    name: "",
    slug: "",
    description: "",
    parent_id: null,
    is_published: 1,
    sort_order: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  useEffect(() => {
    if (category) {
      setFormData({
        id: category.id,
        name: category.name || "",
        slug: category.slug || "",
        description: category.description || "",
        parent_id: category.parent_id || null,
        is_published: category.is_published !== undefined ? category.is_published : 1,
        sort_order: category.sort_order || 0,
      });
      setAutoSlug(false);
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        parent_id: null,
        is_published: 1,
        sort_order: 0,
      });
      setAutoSlug(true);
    }
    setErrorMessage("");
  }, [category, isOpen]);

  if (!isOpen) return null;

  // Possible parents exclude current category
  const availableParents = allCategories.filter((c) => !formData.id || c.id !== formData.id);

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
    if (!nameText) {
      setErrorMessage("Please enter a category name.");
      return;
    }

    let finalSlug = formData.slug?.trim();
    if (!finalSlug) {
      finalSlug = slugify(formData.name || "");
    }
    if (!finalSlug) {
      finalSlug = `cat-${Date.now()}`;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        ...formData,
        slug: finalSlug,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = parseText(formData.name) || "Category Name";
  const displayDesc = parseText(formData.description || "");
  const selectedParent = allCategories.find((c) => c.id === formData.parent_id);
  const parentName = selectedParent ? parseText(selectedParent.name) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-background border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-surface/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">
                {formData.id ? "Edit FAQ Category" : "Create New FAQ Category"}
              </h2>
              <p className="text-xs text-muted-text">
                Organize FAQ questions into clear, discoverable thematic sections.
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
        <form id="faq-category-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Category Name */}
          <div className="space-y-2">
            <TranslatableInput
              label="Category Name *"
              value={formData.name || ""}
              onChange={handleNameChange}
              siteLanguages={siteLanguages}
            />
          </div>

          {/* Slug & Parent Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-semibold text-text flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-primary" />
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
                value={formData.slug || ""}
                onChange={(e) => {
                  setAutoSlug(false);
                  setFormData((prev) => ({ ...prev, slug: e.target.value }));
                }}
                placeholder="e.g. turnaround-delivery"
                className="text-sm font-mono"
              />
              <p className="text-[11px] text-muted-text mt-1">
                Used for URL anchors and filtering (e.g. #turnaround-delivery).
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-text mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Parent Category (Optional)</span>
              </Label>
              <select
                value={formData.parent_id || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    parent_id: e.target.value ? e.target.value : null,
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">None (Top-level Category)</option>
                {availableParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {parseText(p.name)}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-text mt-1">
                Nest this category under a parent section if needed.
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <TranslatableInput
              label="Description (Optional)"
              value={formData.description || ""}
              onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
              siteLanguages={siteLanguages}
              isTextarea
            />
            <p className="text-[11px] text-muted-text">
              Brief explanatory note displayed above questions in this group.
            </p>
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
                    Display category and its filter tab in public FAQs.
                  </div>
                </div>
              </label>
            </div>

            <div>
              <Label className="text-sm font-medium text-text mb-2 block flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span>Sort Order</span>
              </Label>
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
                Order position for category tabs (1 = first tab).
              </p>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="pt-2">
            <Label className="text-xs uppercase tracking-wider text-muted-text mb-2 block font-semibold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Public Filter Pill & Header Preview
            </Label>
            <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-text font-medium">Filter Pill:</span>
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground shadow-xs">
                  {displayName}
                </span>
                {parentName && (
                  <span className="text-[11px] text-muted-text bg-background border border-border px-2 py-0.5 rounded-md">
                    Child of: <strong>{parentName}</strong>
                  </span>
                )}
              </div>
              {displayDesc && (
                <div className="text-xs text-muted-text border-t border-border/60 pt-2 italic">
                  "{displayDesc}"
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
            form="faq-category-form"
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{formData.id ? "Save Changes" : "Create Category"}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
