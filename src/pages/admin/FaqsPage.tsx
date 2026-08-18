import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FAQItem, FAQCategory, SiteSettings } from "../../lib/types";
import { useApi } from "../../hooks/useApi";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useLanguage } from "../../contexts/LanguageContext";
import { PageHeader } from "../../components/admin/PageHeader";
import { FaqModal } from "../../components/admin/FaqModal";
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
  HelpCircle,
  Eye,
  EyeOff,
  Tag,
  LayoutGrid,
  List,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  FolderTree,
} from "lucide-react";

// Helper to safely extract display question/answer from translatable JSON or string
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

// Sortable Card Item for Accordion/Card View
function SortableFaqCard({
  faq,
  onEdit,
  onDelete,
  onTogglePublish,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  faq: FAQItem;
  onEdit: (faq: FAQItem) => void;
  onDelete: (faq: FAQItem) => void;
  onTogglePublish: (faq: FAQItem) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { currentLanguage, tUi } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: faq.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const question = getDisplayText(faq.question, tUi("admin.faqs.untitled_question", currentLanguage));
  const answer = getDisplayText(faq.answer, tUi("admin.faqs.no_answer", currentLanguage));
  const category = getDisplayText(faq.category_name) || faq.category || tUi("admin.faqs.general_category", currentLanguage);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-surface border rounded-2xl transition-all duration-200 overflow-hidden ${
        faq.is_published === 1
          ? "border-border hover:border-primary/40 shadow-xs"
          : "border-border/60 bg-surface/50 opacity-75"
      }`}
    >
      {/* Header Bar */}
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 mt-0.5 text-muted-text hover:text-text cursor-grab active:cursor-grabbing rounded-lg hover:bg-background/80 transition-colors shrink-0"
            title={tUi("admin.faqs.drag_to_reorder", currentLanguage)}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                #{faq.sort_order}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-background border border-border text-xs font-medium text-muted-text">
                <Tag className="w-3 h-3 text-primary" />
                <span>{category}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="text-left font-semibold text-text hover:text-primary transition-colors text-base flex items-center gap-2 group w-full"
            >
              <span className="flex-1">{question}</span>
              <ChevronDown
                className={`w-4 h-4 text-muted-text group-hover:text-primary transition-transform duration-200 shrink-0 ${
                  isOpen ? "transform rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Reorder Buttons */}
          <div className="flex items-center bg-background border border-border rounded-xl p-0.5">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-1 text-muted-text hover:text-text disabled:opacity-20 rounded transition-colors"
              title={tUi("admin.faqs.move_up", currentLanguage)}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              className="p-1 text-muted-text hover:text-text disabled:opacity-20 rounded transition-colors"
              title={tUi("admin.faqs.move_down", currentLanguage)}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Visibility toggle button */}
          <button
            type="button"
            onClick={() => onTogglePublish(faq)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              faq.is_published === 1
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            {faq.is_published === 1 ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tUi("admin.faqs.published", currentLanguage)}</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tUi("admin.faqs.draft", currentLanguage)}</span>
              </>
            )}
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(faq)}
            className="h-8 w-8 p-0 text-muted-text hover:text-text"
            title={tUi("admin.faqs.edit_faq", currentLanguage)}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(faq)}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            title={tUi("admin.faqs.delete_faq", currentLanguage)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Expandable Answer Section */}
      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-border/60 bg-surface/30">
          <p className="text-sm text-muted-text leading-relaxed whitespace-pre-line pl-7">
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}

// Sortable Row for Table View
function SortableFaqRow({
  faq,
  onEdit,
  onDelete,
  onTogglePublish,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  faq: FAQItem;
  onEdit: (faq: FAQItem) => void;
  onDelete: (faq: FAQItem) => void;
  onTogglePublish: (faq: FAQItem) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { currentLanguage, tUi } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: faq.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const question = getDisplayText(faq.question, tUi("admin.faqs.untitled_question", currentLanguage));
  const answer = getDisplayText(faq.answer, tUi("admin.faqs.no_answer", currentLanguage));
  const category = getDisplayText(faq.category_name) || faq.category || tUi("admin.faqs.general_category", currentLanguage);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-surface/50 border-b border-border transition-colors ${
        faq.is_published === 0 ? "opacity-75 bg-surface/20" : ""
      }`}
    >
      <td className="py-4 px-3 w-10 text-center">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-muted-text hover:text-text cursor-grab active:cursor-grabbing rounded hover:bg-surface transition-colors"
          title={tUi("admin.faqs.drag_to_reorder", currentLanguage)}
        >
          <GripVertical className="w-4 h-4 inline-block" />
        </button>
      </td>
      <td className="py-4 px-3 w-36">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold truncate max-w-[130px]">
          <Tag className="w-3 h-3 shrink-0" />
          <span className="truncate">{category}</span>
        </span>
      </td>
      <td className="py-4 px-4">
        <div className="font-semibold text-text text-sm mb-0.5 line-clamp-1">{question}</div>
        <div className="text-xs text-muted-text line-clamp-2 max-w-xl">
          {answer}
        </div>
      </td>
      <td className="py-4 px-4 text-center w-28">
        <button
          type="button"
          onClick={() => onTogglePublish(faq)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            faq.is_published === 1
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
              : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 hover:bg-zinc-500/20"
          }`}
        >
          {faq.is_published === 1 ? (
            <>
              <Eye className="w-3 h-3" />
              <span>{tUi("admin.faqs.published", currentLanguage)}</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3" />
              <span>{tUi("admin.faqs.draft", currentLanguage)}</span>
            </>
          )}
        </button>
      </td>
      <td className="py-4 px-3 text-center w-20">
        <div className="inline-flex items-center bg-surface border border-border rounded-lg p-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 text-muted-text hover:text-text disabled:opacity-20 rounded hover:bg-surface"
            title={tUi("admin.faqs.move_up", currentLanguage)}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 text-muted-text hover:text-text disabled:opacity-20 rounded hover:bg-surface"
            title={tUi("admin.faqs.move_down", currentLanguage)}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </td>
      <td className="py-4 px-4 text-right w-24">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(faq)}
            className="h-8 w-8 p-0 text-muted-text hover:text-text"
            title={tUi("admin.faqs.edit_faq", currentLanguage)}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(faq)}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            title={tUi("admin.faqs.delete_faq", currentLanguage)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function FaqsPage() {
  const { currentLanguage, tUi } = useLanguage();
  usePageTitle(tUi("admin.faqs.title", currentLanguage));
  const { fetchApi } = useApi();
  const [searchParams, setSearchParams] = useSearchParams();

  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Read category URL search param if present
  useEffect(() => {
    const catParam = searchParams.get("category");
    if (catParam) {
      setSelectedCategory(catParam);
    }
  }, [searchParams]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Partial<FAQItem> | null>(null);

  // Delete Confirmation State
  const [faqToDelete, setFaqToDelete] = useState<FAQItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Success Toast Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

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

  const fetchFaqsAndSettings = async () => {
    try {
      setLoading(true);
      const [faqsRes, catsRes, settingsRes] = await Promise.all([
        fetchApi("/api/admin/faqs"),
        fetchApi("/api/admin/faq-categories"),
        fetchApi("/api/admin/settings"),
      ]);

      if (faqsRes.ok) {
        const faqsData = await faqsRes.json();
        setFaqs(Array.isArray(faqsData) ? faqsData : []);
      }

      if (catsRes.ok) {
        const catsData = await catsRes.json();
        setCategories(Array.isArray(catsData) ? catsData : []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData || {});
      }
    } catch (error) {
      console.error("Failed to load FAQs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqsAndSettings();
  }, []);

  // Distinct category list
  const categoryFilterList = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((c) => ({
        id: c.id,
        name: getDisplayText(c.name),
        slug: c.slug,
        count: faqs.filter(
          (f) => f.category_id === c.id || f.category === getDisplayText(c.name)
        ).length,
      }));
    }

    const uniqueCats = new Set<string>();
    faqs.forEach((f) => {
      if (f.category && f.category.trim()) {
        uniqueCats.add(f.category.trim());
      }
    });

    return Array.from(uniqueCats).map((name) => ({
      id: name,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      count: faqs.filter((f) => (f.category || "General") === name).length,
    }));
  }, [categories, faqs]);

  const handleCreate = () => {
    setEditingFaq(null);
    setIsModalOpen(true);
  };

  const handleEdit = (faq: FAQItem) => {
    setEditingFaq(faq);
    setIsModalOpen(true);
  };

  const handleSave = async (faqData: Partial<FAQItem>) => {
    if (faqData.id) {
      // Update
      const res = await fetchApi(`/api/admin/faqs/${faqData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(faqData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update FAQ");
      }
      showToast(tUi("admin.faqs.updated_success", currentLanguage));
    } else {
      // Create
      const res = await fetchApi("/api/admin/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(faqData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create FAQ");
      }
      showToast(tUi("admin.faqs.created_success", currentLanguage));
    }
    await fetchFaqsAndSettings();
  };

  const handleDelete = async () => {
    if (!faqToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetchApi(`/api/admin/faqs/${faqToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete FAQ");
      }
      setFaqs((prev) => prev.filter((f) => f.id !== faqToDelete.id));
      setFaqToDelete(null);
      showToast(tUi("admin.faqs.deleted_success", currentLanguage));
    } catch (err: any) {
      alert(err.message || tUi("admin.faqs.delete_failed", currentLanguage));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublish = async (faq: FAQItem) => {
    const newStatus = faq.is_published === 1 ? 0 : 1;
    try {
      // Optimistic update
      setFaqs((prev) =>
        prev.map((f) => (f.id === faq.id ? { ...f, is_published: newStatus } : f))
      );

      const res = await fetchApi(`/api/admin/faqs/${faq.id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: newStatus }),
      });

      if (!res.ok) {
        // Revert if failed
        setFaqs((prev) =>
          prev.map((f) => (f.id === faq.id ? { ...f, is_published: faq.is_published } : f))
        );
        throw new Error("Failed to update status");
      }

      showToast(newStatus === 1 ? tUi("admin.faqs.published_toast", currentLanguage) : tUi("admin.faqs.draft_toast", currentLanguage));
    } catch (err: any) {
      console.error(err);
      fetchFaqsAndSettings();
    }
  };

  const persistReorder = async (updatedList: FAQItem[]) => {
    const payload = updatedList.map((item, index) => ({
      id: item.id,
      sort_order: index + 1,
    }));

    try {
      await fetchApi("/api/admin/faqs/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
    } catch (e) {
      console.error("Failed to save reordered FAQs", e);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = faqs.findIndex((item) => item.id === active.id);
      const newIndex = faqs.findIndex((item) => item.id === over.id);
      const updated = arrayMove(faqs, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        sort_order: idx + 1,
      }));
      setFaqs(updated);
      persistReorder(updated);
      showToast(tUi("admin.faqs.order_updated", currentLanguage));
    }
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= faqs.length) return;

    const updated = arrayMove(faqs, index, targetIndex).map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));
    setFaqs(updated);
    persistReorder(updated);
    showToast(tUi("admin.faqs.position_adjusted", currentLanguage));
  };

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      // Status filter
      if (statusFilter === "published" && faq.is_published !== 1) return false;
      if (statusFilter === "draft" && faq.is_published !== 0) return false;

      // Category filter
      if (selectedCategory !== "all") {
        const catName = getDisplayText(faq.category_name) || faq.category || "General";
        const catId = faq.category_id;
        if (catName !== selectedCategory && catId !== selectedCategory) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const question = getDisplayText(faq.question).toLowerCase();
        const answer = getDisplayText(faq.answer).toLowerCase();
        const cat = (getDisplayText(faq.category_name) || faq.category || "").toLowerCase();
        return question.includes(query) || answer.includes(query) || cat.includes(query);
      }

      return true;
    });
  }, [faqs, searchQuery, statusFilter, selectedCategory]);

  const publishedCount = faqs.filter((f) => f.is_published === 1).length;
  const draftCount = faqs.filter((f) => f.is_published === 0).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-text text-background rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title={tUi("admin.faqs.title", currentLanguage)}
        subtitle={tUi("admin.faqs.subtitle", currentLanguage)}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link to="/admin/faqs/categories">
            <Button variant="outline" size="sm" className="flex items-center gap-2 border-border">
              <FolderTree className="w-4 h-4" />
              <span>{tUi("admin.faqs.categories_btn", currentLanguage, { count: categories.length })}</span>
            </Button>
          </Link>
          <Button onClick={handleCreate} className="flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            <span>{tUi("admin.faqs.add_faq", currentLanguage)}</span>
          </Button>
        </div>
      </PageHeader>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground shadow-xs">
          <HelpCircle className="w-4 h-4" />
          <span>{tUi("admin.faqs.tab_questions_count", currentLanguage, { count: faqs.length })}</span>
        </div>
        <Link
          to="/admin/faqs/categories"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl text-muted-text hover:text-text hover:bg-surface transition-colors"
        >
          <FolderTree className="w-4 h-4" />
          <span>{tUi("admin.faqs.tab_categories_count", currentLanguage, { count: categories.length })}</span>
        </Link>
      </div>

      {/* Control & Filter Card */}
      <Card className="border-border">
        <CardContent className="p-4 space-y-4">
          {/* Top Row: Search + Status + View Mode */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
              <Input
                placeholder={tUi("admin.faqs.search_placeholder", currentLanguage)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-text hover:text-text"
                >
                  {tUi("admin.faqs.clear", currentLanguage)}
                </button>
              )}
            </div>

            {/* Status Tabs & Layout Mode */}
            <div className="flex flex-wrap items-center justify-between w-full md:w-auto gap-3">
              {/* Status Filter Buttons */}
              <div className="flex items-center p-1 bg-surface rounded-xl border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    statusFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  {tUi("admin.faqs.status_all", currentLanguage, { count: faqs.length })}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("published")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    statusFilter === "published"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  {tUi("admin.faqs.status_published", currentLanguage, { count: publishedCount })}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("draft")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    statusFilter === "draft"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  {tUi("admin.faqs.status_draft", currentLanguage, { count: draftCount })}
                </button>
              </div>

              {/* Layout Mode Toggle */}
              <div className="flex items-center p-1 bg-surface rounded-xl border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "cards"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                  title={tUi("admin.faqs.view_cards", currentLanguage)}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "table"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-text hover:text-text"
                  }`}
                  title={tUi("admin.faqs.view_table", currentLanguage)}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          {categoryFilterList.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-border/60 pb-1">
              <span className="text-xs font-semibold text-muted-text uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {tUi("admin.faqs.categories_filter_label", currentLanguage)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchParams({});
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-surface text-muted-text hover:text-text border border-border"
                }`}
              >
                {tUi("admin.faqs.filter_category_all", currentLanguage)}
              </button>
              {categoryFilterList.map((cat) => {
                const isSelected = selectedCategory === cat.name || selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setSearchParams({ category: cat.name });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-surface text-muted-text hover:text-text border border-border"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-background text-muted-text"
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main List Content */}
      {loading ? (
        <div className="py-20 text-center text-muted-text">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p>{tUi("admin.faqs.loading", currentLanguage)}</p>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <Card className="border-border border-dashed p-12 text-center">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">{tUi("admin.faqs.empty_title", currentLanguage)}</h3>
          <p className="text-muted-text text-sm max-w-sm mx-auto mb-6">
            {searchQuery || statusFilter !== "all" || selectedCategory !== "all"
              ? tUi("admin.faqs.no_faqs_match", currentLanguage)
              : tUi("admin.faqs.empty_desc", currentLanguage)}
          </p>
          {searchQuery || statusFilter !== "all" || selectedCategory !== "all" ? (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setSelectedCategory("all");
                setSearchParams({});
              }}
              className="mx-auto"
            >
              {tUi("admin.faqs.reset_filters", currentLanguage)}
            </Button>
          ) : (
            <Button onClick={handleCreate} className="flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              <span>{tUi("admin.faqs.create_first", currentLanguage)}</span>
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
            /* Accordion Cards Drag and Drop View */
            <SortableContext
              items={filteredFaqs.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {filteredFaqs.map((faq, index) => (
                  <SortableFaqCard
                    key={faq.id}
                    faq={faq}
                    onEdit={handleEdit}
                    onDelete={(f) => setFaqToDelete(f)}
                    onTogglePublish={handleTogglePublish}
                    onMoveUp={() => handleMove(index, "up")}
                    onMoveDown={() => handleMove(index, "down")}
                    isFirst={index === 0}
                    isLast={index === filteredFaqs.length - 1}
                  />
                ))}
              </div>
            </SortableContext>
          ) : (
            /* Table Drag and Drop View */
            <Card className="border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface text-xs font-semibold text-muted-text uppercase tracking-wider">
                      <th className="py-3 px-3 w-10 text-center">{tUi("admin.faqs.th_order", currentLanguage)}</th>
                      <th className="py-3 px-3 w-36">{tUi("admin.faqs.th_category", currentLanguage)}</th>
                      <th className="py-3 px-4">{tUi("admin.faqs.th_question_answer", currentLanguage)}</th>
                      <th className="py-3 px-4 text-center w-28">{tUi("admin.faqs.th_status", currentLanguage)}</th>
                      <th className="py-3 px-3 text-center w-20">{tUi("admin.faqs.th_move", currentLanguage)}</th>
                      <th className="py-3 px-4 text-right w-24">{tUi("admin.faqs.th_actions", currentLanguage)}</th>
                    </tr>
                  </thead>
                  <SortableContext
                    items={filteredFaqs.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody className="divide-y divide-border/60">
                      {filteredFaqs.map((faq, index) => (
                        <SortableFaqRow
                          key={faq.id}
                          faq={faq}
                          onEdit={handleEdit}
                          onDelete={(f) => setFaqToDelete(f)}
                          onTogglePublish={handleTogglePublish}
                          onMoveUp={() => handleMove(index, "up")}
                          onMoveDown={() => handleMove(index, "down")}
                          isFirst={index === 0}
                          isLast={index === filteredFaqs.length - 1}
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

      {/* Faq Edit / Create Modal */}
      <FaqModal
        isOpen={isModalOpen}
        faq={editingFaq}
        siteLanguages={settings.site_languages || ""}
        categories={categories}
        onClose={() => {
          setIsModalOpen(false);
          setEditingFaq(null);
        }}
        onSave={handleSave}
        onCategoryCreated={(newCat) => {
          setCategories((prev) => [...prev, newCat]);
        }}
      />

      {/* Delete Confirmation Modal */}
      {faqToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text">{tUi("admin.faqs.modal_delete_title", currentLanguage)}</h3>
                <p className="text-sm text-muted-text mt-1">
                  {tUi("admin.faqs.modal_delete_desc", currentLanguage)}
                </p>
                <div className="mt-3 p-3 rounded-xl bg-surface border border-border/80 text-xs text-text font-medium">
                  "{getDisplayText(faqToDelete.question)}"
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface/50">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFaqToDelete(null)}
                disabled={isDeleting}
              >
                {tUi("common.cancel", currentLanguage)}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2"
              >
                {isDeleting ? (
                  <span>{tUi("admin.faqs.deleting", currentLanguage)}</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{tUi("admin.faqs.delete_btn", currentLanguage)}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
