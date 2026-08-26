import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FAQCategory, SiteSettings } from "../../lib/types";
import { useApi } from "../../hooks/useApi";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useLanguage } from "../../contexts/LanguageContext";
import { PageHeader } from "../../components/admin/PageHeader";
import { FaqCategoryModal } from "../../components/admin/FaqCategoryModal";
import { DeleteCategoryModal } from "../../components/admin/DeleteCategoryModal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card, CardContent } from "../../components/ui/Card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Search,
  GripVertical,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  FolderTree,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Layers,
  Link as LinkIcon,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Safe text extractor for translatable JSON strings
function getDisplayText(val: string | undefined, fallback = "Untitled"): string {
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

// ----------------------------------------------------------------------
// 1. Sortable Category Card Item (Accordion / Card View)
// ----------------------------------------------------------------------
function SortableCategoryCard({
  category,
  allCategories,
  onEdit,
  onDelete,
  onTogglePublish,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onNavigateToFaqs,
}: {
  category: FAQCategory;
  allCategories: FAQCategory[];
  onEdit: (cat: FAQCategory) => void;
  onDelete: (cat: FAQCategory) => void;
  onTogglePublish: (cat: FAQCategory) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  onNavigateToFaqs: (categoryName: string) => void;
}) {
  const { currentLanguage, tUi } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const name = getDisplayText(category.name, "Untitled Category");
  const description = getDisplayText(category.description || "", "");
  const parent = category.parent_id
    ? allCategories.find((c) => c.id === category.parent_id)
    : null;
  const parentName = parent ? getDisplayText(parent.name) : null;
  const faqCount = Number(category.faq_count || 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-surface border rounded-2xl transition-all duration-200 overflow-hidden ${
        category.is_published === 1
          ? "border-border hover:border-primary/40 shadow-xs"
          : "border-border/60 bg-surface/50 opacity-80"
      }`}
    >
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Section: Drag handle & Metadata */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 mt-0.5 text-muted-text hover:text-text cursor-grab active:cursor-grabbing rounded-lg hover:bg-background/80 transition-colors shrink-0"
            title={tUi("admin.faq_categories.drag_reorder", currentLanguage)}
            aria-label={tUi("admin.pricing.drag_reorder")}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            {/* Badges / Meta row */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
              <span className="text-[11px] sm:text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                #{category.sort_order}
              </span>

              {category.slug && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border text-[11px] font-mono text-muted-text shrink-0">
                  <LinkIcon className="w-2.5 h-2.5 text-muted-text" />
                  <span className="truncate max-w-[150px] sm:max-w-[220px]">{category.slug}</span>
                </span>
              )}

              {parentName && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border text-[11px] text-muted-text shrink-0">
                  <Layers className="w-2.5 h-2.5 text-primary" />
                  <span>
                    {tUi("admin.faq_categories.child_of", currentLanguage)}{" "}
                    <strong className="text-text font-medium">{parentName}</strong>
                  </span>
                </span>
              )}
            </div>

            {/* Category Title */}
            <div className="flex items-baseline gap-2">
              <h3 className="font-semibold text-text text-base sm:text-lg leading-snug break-words">
                {name}
              </h3>
            </div>

            {/* Description */}
            {description && (
              <p className="text-xs sm:text-sm text-muted-text line-clamp-2 mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right Section: FAQ count, status toggle, reordering, and action buttons */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 sm:gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60">
          {/* FAQ Count link button */}
          <button
            type="button"
            onClick={() => onNavigateToFaqs(name)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border hover:border-primary/40 text-xs font-semibold text-text hover:text-primary transition-all group shrink-0"
            title={tUi("admin.faq_categories.view_faqs_count", currentLanguage, { count: faqCount, name })}
          >
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            <span>
              <strong>{faqCount}</strong> {faqCount === 1 ? tUi("admin.faq_categories.faq_singular", currentLanguage) : tUi("admin.faq_categories.faq_plural", currentLanguage)}
            </span>
            <ArrowRight className="w-3 h-3 text-muted-text group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Visibility status button */}
          <button
            type="button"
            onClick={() => onTogglePublish(category)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
              category.is_published === 1
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
            }`}
            title={category.is_published === 1 ? tUi("admin.faq_categories.click_draft", currentLanguage) : tUi("admin.faq_categories.click_publish", currentLanguage)}
          >
            {category.is_published === 1 ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>{tUi("admin.faq_categories.published", currentLanguage)}</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>{tUi("admin.faq_categories.draft", currentLanguage)}</span>
              </>
            )}
          </button>

          {/* Up / Down position buttons */}
          <div className="flex items-center bg-background border border-border rounded-xl p-0.5 shrink-0">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-1 text-muted-text hover:text-text disabled:opacity-20 disabled:cursor-not-allowed rounded hover:bg-surface transition-colors"
              title={tUi("admin.faq_categories.move_up", currentLanguage)}
              aria-label="Move category up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              className="p-1 text-muted-text hover:text-text disabled:opacity-20 disabled:cursor-not-allowed rounded hover:bg-surface transition-colors"
              title={tUi("admin.faq_categories.move_down", currentLanguage)}
              aria-label="Move category down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Edit / Delete Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(category)}
              className="h-8 px-2.5 text-xs flex items-center gap-1.5 border-border hover:bg-surface"
              title={tUi("admin.faq_categories.edit_category", currentLanguage)}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{tUi("admin.faq_categories.edit", currentLanguage)}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(category)}
              className="h-8 w-8 p-0 text-muted-text hover:text-red-600 hover:bg-red-500/10"
              title={tUi("admin.faq_categories.delete_category", currentLanguage)}
              aria-label="Delete category"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. Sortable Category Row Item (Table View)
// ----------------------------------------------------------------------
function SortableCategoryRow({
  category,
  allCategories,
  onEdit,
  onDelete,
  onTogglePublish,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onNavigateToFaqs,
}: {
  category: FAQCategory;
  allCategories: FAQCategory[];
  onEdit: (cat: FAQCategory) => void;
  onDelete: (cat: FAQCategory) => void;
  onTogglePublish: (cat: FAQCategory) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  onNavigateToFaqs: (categoryName: string) => void;
}) {
  const { currentLanguage, tUi } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const name = getDisplayText(category.name, "Untitled Category");
  const description = getDisplayText(category.description || "", "");
  const parent = category.parent_id
    ? allCategories.find((c) => c.id === category.parent_id)
    : null;
  const parentName = parent ? getDisplayText(parent.name) : null;
  const faqCount = Number(category.faq_count || 0);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-surface/60 border-b border-border/80 transition-colors ${
        category.is_published === 0 ? "opacity-75 bg-surface/20" : ""
      }`}
    >
      {/* Drag handle */}
      <td className="py-3.5 px-3 w-10 text-center align-middle">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-muted-text hover:text-text cursor-grab active:cursor-grabbing rounded hover:bg-surface transition-colors"
          title={tUi("admin.faq_categories.drag_reorder", currentLanguage)}
          aria-label={tUi("admin.pricing.drag_reorder")}
        >
          <GripVertical className="w-4 h-4 inline-block" />
        </button>
      </td>

      {/* Order Badge */}
      <td className="py-3.5 px-2 w-14 text-center align-middle">
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
          #{category.sort_order}
        </span>
      </td>

      {/* Category Name & Description */}
      <td className="py-3.5 px-4 min-w-[200px] align-middle">
        <div className="font-semibold text-text text-sm leading-snug">{name}</div>
        {description && (
          <div className="text-xs text-muted-text line-clamp-1 max-w-md mt-0.5">
            {description}
          </div>
        )}
      </td>

      {/* Slug identifier */}
      <td className="py-3.5 px-4 hidden md:table-cell w-36 align-middle font-mono text-xs text-muted-text">
        {category.slug ? (
          <span className="inline-flex items-center gap-1 bg-background border border-border px-2 py-0.5 rounded text-[11px] truncate max-w-[130px]">
            <LinkIcon className="w-2.5 h-2.5 text-muted-text" />
            <span className="truncate">{category.slug}</span>
          </span>
        ) : (
          <span className="text-muted-text/40">-</span>
        )}
      </td>

      {/* Parent Category */}
      <td className="py-3.5 px-4 hidden sm:table-cell w-40 align-middle text-xs">
        {parentName ? (
          <span className="inline-flex items-center gap-1 text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 rounded-md truncate max-w-[140px]">
            <Layers className="w-3 h-3 shrink-0" />
            <span className="truncate">{parentName}</span>
          </span>
        ) : (
          <span className="text-muted-text/60">{tUi("admin.faq_categories.top_level", currentLanguage)}</span>
        )}
      </td>

      {/* FAQs count */}
      <td className="py-3.5 px-4 text-center w-28 align-middle">
        <button
          type="button"
          onClick={() => onNavigateToFaqs(name)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border hover:border-primary/40 text-xs font-semibold text-text hover:text-primary transition-colors"
          title={tUi("admin.faq_categories.view_faqs_count", currentLanguage, { count: faqCount, name })}
        >
          <HelpCircle className="w-3 h-3 text-primary" />
          <span>{faqCount}</span>
        </button>
      </td>

      {/* Status */}
      <td className="py-3.5 px-4 text-center w-28 align-middle">
        <button
          type="button"
          onClick={() => onTogglePublish(category)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            category.is_published === 1
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
          }`}
          title={category.is_published === 1 ? tUi("admin.faq_categories.click_draft", currentLanguage) : tUi("admin.faq_categories.click_publish", currentLanguage)}
        >
          {category.is_published === 1 ? (
            <>
              <Eye className="w-3 h-3" />
              <span>{tUi("admin.faq_categories.published", currentLanguage)}</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3" />
              <span>{tUi("admin.faq_categories.draft", currentLanguage)}</span>
            </>
          )}
        </button>
      </td>

      {/* Move Up / Down */}
      <td className="py-3.5 px-3 text-center w-20 align-middle">
        <div className="inline-flex items-center bg-background border border-border rounded-lg p-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 text-muted-text hover:text-text disabled:opacity-20 rounded hover:bg-surface transition-colors"
            title={tUi("admin.faq_categories.move_up", currentLanguage)}
            aria-label={tUi("admin.faq_categories.move_up")}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 text-muted-text hover:text-text disabled:opacity-20 rounded hover:bg-surface transition-colors"
            title={tUi("admin.faq_categories.move_down", currentLanguage)}
            aria-label={tUi("admin.faq_categories.move_down")}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4 text-right w-24 align-middle">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(category)}
            className="h-8 w-8 p-0 text-muted-text hover:text-text"
            title={tUi("admin.faq_categories.edit_category", currentLanguage)}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(category)}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            title={tUi("admin.faq_categories.delete_category", currentLanguage)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ----------------------------------------------------------------------
// 3. Main FAQ Categories Page
// ----------------------------------------------------------------------
export default function FaqCategoriesPage() {
  const { currentLanguage, tUi } = useLanguage();
  usePageTitle(tUi("admin.faq_categories.title", currentLanguage));
  const { fetchApi } = useApi();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [levelFilter, setLevelFilter] = useState<"all" | "root" | "sub">("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FAQCategory | null>(null);
  const [deleteModalCategory, setDeleteModalCategory] = useState<FAQCategory | null>(null);

  // Site Settings & Feedback
  const [siteLanguages, setSiteLanguages] = useState("");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catsRes, settingsRes] = await Promise.all([
        fetchApi("/api/admin/faq-categories"),
        fetchApi("/api/admin/settings"),
      ]);

      if (catsRes.ok) {
        const catsData = await catsRes.json();
        setCategories(Array.isArray(catsData) ? catsData : []);
      }
      if (settingsRes.ok) {
        const settingsData: SiteSettings = await settingsRes.json();
        setSiteLanguages(settingsData.site_languages || "");
      }
    } catch (error) {
      console.error("Failed to load FAQ categories data", error);
      showToast(tUi("admin.faq_categories.toast_load_failed", currentLanguage), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = getDisplayText(cat.name).toLowerCase();
        const desc = getDisplayText(cat.description || "").toLowerCase();
        const slug = (cat.slug || "").toLowerCase();
        if (!name.includes(q) && !desc.includes(q) && !slug.includes(q)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === "published" && cat.is_published !== 1) return false;
      if (statusFilter === "draft" && cat.is_published === 1) return false;

      // Level filter
      if (levelFilter === "root" && cat.parent_id) return false;
      if (levelFilter === "sub" && !cat.parent_id) return false;

      return true;
    });
  }, [categories, searchQuery, statusFilter, levelFilter]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, levelFilter, pageSize]);

  // Paginated categories slice
  const paginatedCategories = useMemo(() => {
    if (pageSize === 0) return filteredCategories; // 0 means "All"
    const start = (currentPage - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filteredCategories.length / pageSize));

  // Summary Metrics
  const stats = useMemo(() => {
    const total = categories.length;
    const published = categories.filter((c) => c.is_published === 1).length;
    const drafts = total - published;
    const subcats = categories.filter((c) => Boolean(c.parent_id)).length;
    const totalFaqs = categories.reduce((sum, c) => sum + (Number(c.faq_count) || 0), 0);
    return { total, published, drafts, subcats, totalFaqs };
  }, [categories]);

  // Drag & Drop Reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(categories, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        sort_order: idx + 1,
      }));

      setCategories(newItems);
      saveReorderedList(newItems);
    }
  };

  const saveReorderedList = async (items: FAQCategory[]) => {
    try {
      const payload = items.map((item, idx) => ({
        id: item.id,
        sort_order: idx + 1,
      }));
      const res = await fetchApi("/api/admin/faq-categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      if (!res.ok) throw new Error("Failed to save reordered categories");
      showToast(tUi("admin.faq_categories.toast_order_saved", currentLanguage));
    } catch (err: any) {
      showToast(err.message || tUi("admin.faq_categories.toast_order_failed", currentLanguage), "error");
      fetchData();
    }
  };

  const moveCategory = (index: number, direction: "up" | "down") => {
    // Determine the actual index in the master categories array
    const currentItem = paginatedCategories[index];
    if (!currentItem) return;

    const masterIndex = categories.findIndex((c) => c.id === currentItem.id);
    if (masterIndex === -1) return;

    const targetMasterIndex = direction === "up" ? masterIndex - 1 : masterIndex + 1;
    if (targetMasterIndex < 0 || targetMasterIndex >= categories.length) return;

    const newItems = arrayMove(categories, masterIndex, targetMasterIndex).map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));

    setCategories(newItems);
    saveReorderedList(newItems);
  };

  const handleTogglePublish = async (cat: FAQCategory) => {
    const newStatus = cat.is_published === 1 ? 0 : 1;
    try {
      // Optimistic update
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_published: newStatus } : c))
      );

      const res = await fetchApi(`/api/admin/faq-categories/${cat.id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: newStatus }),
      });
      if (!res.ok) {
        // Revert
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, is_published: cat.is_published } : c))
        );
        throw new Error("Failed to update status");
      }

      showToast(newStatus === 1 ? tUi("admin.faq_categories.toast_published", currentLanguage) : tUi("admin.faq_categories.toast_draft", currentLanguage));
    } catch (err: any) {
      showToast(err.message || "Failed to update category status", "error");
    }
  };

  const handleSaveCategory = async (catData: Partial<FAQCategory>) => {
    if (catData.id) {
      const res = await fetchApi(`/api/admin/faq-categories/${catData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update category");
      }
      showToast(tUi("admin.faq_categories.toast_updated", currentLanguage));
    } else {
      const res = await fetchApi("/api/admin/faq-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create category");
      }
      showToast(tUi("admin.faq_categories.toast_created", currentLanguage));
    }
    fetchData();
  };

  const handleDeleteConfirm = async (categoryId: string, reassignToId?: string) => {
    const url = `/api/admin/faq-categories/${categoryId}?reassign_to=${encodeURIComponent(
      reassignToId || "general"
    )}`;
    const res = await fetchApi(url, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete category");
    }
    showToast(tUi("admin.faq_categories.toast_deleted", currentLanguage));
    fetchData();
  };

  const navigateToFaqsWithCategory = (categoryName: string) => {
    navigate(`/admin/faqs?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium ${
              toastMessage.type === "success"
                ? "bg-surface border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-surface border-red-500/30 text-red-600 dark:text-red-400"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title={tUi("admin.faq_categories.title", currentLanguage)}
        subtitle={tUi("admin.faq_categories.subtitle", currentLanguage)}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 border-border"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{tUi("admin.faq_categories.refresh", currentLanguage)}</span>
          </Button>

          <Button
            onClick={() => {
              setEditingCategory(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{tUi("admin.faq_categories.add_category", currentLanguage)}</span>
          </Button>
        </div>
      </PageHeader>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <Link
          to="/admin/faqs"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl text-muted-text hover:text-text hover:bg-surface transition-colors shrink-0"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{tUi("admin.faq_categories.tab_qa", currentLanguage, { count: stats.totalFaqs })}</span>
        </Link>
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground shadow-xs shrink-0">
          <FolderTree className="w-4 h-4" />
          <span>{tUi("admin.faq_categories.tab_categories", currentLanguage, { count: categories.length })}</span>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-surface border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-text">{stats.total}</div>
              <div className="text-xs text-muted-text font-medium mt-0.5">{tUi("admin.faq_categories.stat_total", currentLanguage)}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FolderTree className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.published}
              </div>
              <div className="text-xs text-muted-text font-medium mt-0.5">{tUi("admin.faq_categories.stat_published", currentLanguage)}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-text">{stats.totalFaqs}</div>
              <div className="text-xs text-muted-text font-medium mt-0.5">{tUi("admin.faq_categories.stat_faqs", currentLanguage)}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.subcats}</div>
              <div className="text-xs text-muted-text font-medium mt-0.5">{tUi("admin.faq_categories.stat_subcats", currentLanguage)}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control & Filter Card */}
      <Card className="bg-surface border-border shadow-xs">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-text" />
              <Input
                placeholder={tUi("admin.faq_categories.search_placeholder", currentLanguage)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm bg-background border-border"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-text hover:text-text"
                >
                  {tUi("admin.faq_categories.clear", currentLanguage)}
                </button>
              )}
            </div>

            {/* Filter Pills & View Toggle */}
            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 w-full lg:w-auto">
              {/* Status Filter */}
              <div className="flex items-center bg-background border border-border rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  {tUi("admin.faq_categories.filter_all", currentLanguage, { count: categories.length })}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("published")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === "published"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  {tUi("admin.faq_categories.filter_published", currentLanguage, { count: stats.published })}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("draft")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === "draft"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  {tUi("admin.faq_categories.filter_draft", currentLanguage, { count: stats.drafts })}
                </button>
              </div>

              {/* Hierarchy Filter */}
              <div className="flex items-center bg-background border border-border rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setLevelFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    levelFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  {tUi("admin.faq_categories.level_all", currentLanguage)}
                </button>
                <button
                  type="button"
                  onClick={() => setLevelFilter("root")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    levelFilter === "root"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  {tUi("admin.faq_categories.level_root", currentLanguage)}
                </button>
                <button
                  type="button"
                  onClick={() => setLevelFilter("sub")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    levelFilter === "sub"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  {tUi("admin.faq_categories.level_sub", currentLanguage, { count: stats.subcats })}
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-background border border-border rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === "cards"
                      ? "bg-surface text-text shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                  title={tUi("admin.faq_categories.view_cards", currentLanguage)}
                  aria-label={tUi("admin.faq_categories.view_cards")}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === "table"
                      ? "bg-surface text-text shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                  title={tUi("admin.faq_categories.view_table", currentLanguage)}
                  aria-label={tUi("admin.faq_categories.view_table")}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Categories Content */}
      {loading && categories.length === 0 ? (
        <div className="p-12 text-center text-muted-text bg-surface border border-border rounded-2xl">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm font-medium">{tUi("admin.faq_categories.loading", currentLanguage)}</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card className="border-border border-dashed p-12 text-center">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderTree className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">{tUi("admin.faq_categories.no_found", currentLanguage)}</h3>
          <p className="text-muted-text text-sm max-w-sm mx-auto mb-6">
            {searchQuery || statusFilter !== "all" || levelFilter !== "all"
              ? tUi("admin.faq_categories.no_match", currentLanguage)
              : tUi("admin.faq_categories.empty_desc", currentLanguage)}
          </p>
          {searchQuery || statusFilter !== "all" || levelFilter !== "all" ? (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setLevelFilter("all");
              }}
              className="mx-auto"
            >
              {tUi("admin.faq_categories.reset_filters", currentLanguage)}
            </Button>
          ) : (
            <Button
              onClick={() => {
                setEditingCategory(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{tUi("admin.faq_categories.create_first", currentLanguage)}</span>
            </Button>
          )}
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {viewMode === "cards" ? (
            /* Drag-and-drop Sortable Cards View */
            <div className="space-y-4">
              <SortableContext
                items={paginatedCategories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {paginatedCategories.map((cat, index) => (
                    <SortableCategoryCard
                      key={cat.id}
                      category={cat}
                      allCategories={categories}
                      onEdit={(c) => {
                        setEditingCategory(c);
                        setIsModalOpen(true);
                      }}
                      onDelete={(c) => setDeleteModalCategory(c)}
                      onTogglePublish={handleTogglePublish}
                      onMoveUp={() => moveCategory(index, "up")}
                      onMoveDown={() => moveCategory(index, "down")}
                      isFirst={index === 0 && currentPage === 1}
                      isLast={index === paginatedCategories.length - 1 && currentPage === totalPages}
                      onNavigateToFaqs={navigateToFaqsWithCategory}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          ) : (
            /* Table View with Drag and Drop Reordering */
            <Card className="border-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface text-xs font-semibold text-muted-text uppercase tracking-wider">
                      <th className="py-3 px-3 w-10 text-center">{tUi("admin.faq_categories.th_move", currentLanguage)}</th>
                      <th className="py-3 px-2 w-14 text-center">{tUi("admin.faq_categories.th_order", currentLanguage)}</th>
                      <th className="py-3 px-4 min-w-[200px]">{tUi("admin.faq_categories.th_category", currentLanguage)}</th>
                      <th className="py-3 px-4 hidden md:table-cell w-36">{tUi("admin.faq_categories.th_slug", currentLanguage)}</th>
                      <th className="py-3 px-4 hidden sm:table-cell w-40">{tUi("admin.faq_categories.th_parent", currentLanguage)}</th>
                      <th className="py-3 px-4 text-center w-28">{tUi("admin.faq_categories.th_faqs", currentLanguage)}</th>
                      <th className="py-3 px-4 text-center w-28">{tUi("admin.faq_categories.th_status", currentLanguage)}</th>
                      <th className="py-3 px-3 text-center w-20">{tUi("admin.faq_categories.th_shift", currentLanguage)}</th>
                      <th className="py-3 px-4 text-right w-24">{tUi("admin.faq_categories.th_actions", currentLanguage)}</th>
                    </tr>
                  </thead>
                  <SortableContext
                    items={paginatedCategories.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody className="divide-y divide-border/60">
                      {paginatedCategories.map((cat, index) => (
                        <SortableCategoryRow
                          key={cat.id}
                          category={cat}
                          allCategories={categories}
                          onEdit={(c) => {
                            setEditingCategory(c);
                            setIsModalOpen(true);
                          }}
                          onDelete={(c) => setDeleteModalCategory(c)}
                          onTogglePublish={handleTogglePublish}
                          onMoveUp={() => moveCategory(index, "up")}
                          onMoveDown={() => moveCategory(index, "down")}
                          isFirst={index === 0 && currentPage === 1}
                          isLast={index === paginatedCategories.length - 1 && currentPage === totalPages}
                          onNavigateToFaqs={navigateToFaqsWithCategory}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </table>
              </div>
            </Card>
          )}
        </DndContext>
      )}

      {/* Pagination Footer */}
      {filteredCategories.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-border/80 text-xs text-muted-text">
          <div className="flex items-center gap-2">
            <span>
              {tUi("admin.faq_categories.showing", currentLanguage)}{" "}
              <strong className="text-text">
                {pageSize === 0
                  ? filteredCategories.length
                  : Math.min((currentPage - 1) * pageSize + 1, filteredCategories.length)}
              </strong>{" "}
              {tUi("admin.faq_categories.to", currentLanguage)}{" "}
              <strong className="text-text">
                {pageSize === 0
                  ? filteredCategories.length
                  : Math.min(currentPage * pageSize, filteredCategories.length)}
              </strong>{" "}
              {tUi("admin.faq_categories.of", currentLanguage)} <strong className="text-text">{filteredCategories.length}</strong> {tUi("admin.faq_categories.categories", currentLanguage)}
            </span>

            {/* Page size selector */}
            <div className="flex items-center gap-1.5 ml-3">
              <span>{tUi("admin.faq_categories.per_page", currentLanguage)}</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-surface border border-border text-text rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={0}>{tUi("common.all")}</option>
              </select>
            </div>
          </div>

          {/* Page numbers / Next & Prev */}
          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tUi("admin.faq_categories.prev", currentLanguage)}</span>
              </Button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      currentPage === pageNum
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-text hover:text-text hover:bg-surface"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2.5 text-xs flex items-center gap-1"
              >
                <span className="hidden sm:inline">{tUi("admin.faq_categories.next", currentLanguage)}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Category Edit/Create Modal */}
      <FaqCategoryModal
        isOpen={isModalOpen}
        category={editingCategory}
        siteLanguages={siteLanguages}
        allCategories={categories}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
      />

      {/* Category Safe Delete Modal */}
      <DeleteCategoryModal
        isOpen={Boolean(deleteModalCategory)}
        category={deleteModalCategory}
        allCategories={categories}
        onClose={() => setDeleteModalCategory(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}