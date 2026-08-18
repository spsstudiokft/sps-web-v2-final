import React, { useState, useEffect, useMemo } from "react";
import { Service, SiteSettings } from "../../lib/types";
import { useApi } from "../../hooks/useApi";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useLanguage } from "../../contexts/LanguageContext";
import { PageHeader } from "../../components/admin/PageHeader";
import { ServiceModal } from "../../components/admin/ServiceModal";
import { ServiceIcon } from "../../components/common/ServiceIcon";
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
  rectSortingStrategy,
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
  Sparkles,
  Eye,
  EyeOff,
  Link as LinkIcon,
  LayoutGrid,
  List,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

// Helper to safely extract display title from translatable JSON or string
function getDisplayTitle(val: string | undefined): string {
  if (!val) return "Untitled Service";
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && parsed !== null) {
      return (
        parsed["en"] ||
        Object.values(parsed).find((v) => typeof v === "string" && v.trim() !== "") ||
        "Untitled Service"
      );
    }
  } catch {
    return val;
  }
  return val;
}

function getDisplayDescription(val: string | null | undefined): string {
  if (!val) return "";
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && parsed !== null) {
      return (
        parsed["en"] ||
        Object.values(parsed).find((v) => typeof v === "string" && v.trim() !== "") ||
        ""
      );
    }
  } catch {
    return val;
  }
  return val;
}

// Sortable Card Item for Grid View
function SortableServiceCard({
  service,
  onEdit,
  onDelete,
  onTogglePublish,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  onTogglePublish: (service: Service) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { currentLanguage, tUi } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const title = getDisplayTitle(service.title);
  const description = getDisplayDescription(service.description);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-surface border rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between ${
        service.is_published === 1
          ? "border-border hover:border-primary/40 hover:shadow-md"
          : "border-border/60 bg-surface/50 opacity-75"
      }`}
    >
      <div>
        {/* Top bar: Drag Handle + Icon + Status */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <button
              {...attributes}
              {...listeners}
              className="p-1.5 text-muted-text hover:text-text cursor-grab active:cursor-grabbing rounded-lg hover:bg-background/80 transition-colors"
              title={tUi("admin.services.drag_to_reorder", currentLanguage)}
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ServiceIcon
                icon={service.icon}
                imageUrl={service.image_url}
                className="w-6 h-6"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Move Up/Down buttons for touch/accessible reordering */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={isFirst}
                className="p-1 text-muted-text hover:text-text disabled:opacity-20 disabled:hover:text-muted-text rounded hover:bg-background/80 transition-colors"
                title={tUi("admin.services.move_up", currentLanguage)}
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={isLast}
                className="p-1 text-muted-text hover:text-text disabled:opacity-20 disabled:hover:text-muted-text rounded hover:bg-background/80 transition-colors"
                title={tUi("admin.services.move_down", currentLanguage)}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Published Status Pill */}
            <button
              type="button"
              onClick={() => onTogglePublish(service)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                service.is_published === 1
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                  : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 hover:bg-zinc-500/20"
              }`}
              title={tUi("admin.services.toggle_visibility", currentLanguage)}
            >
              {service.is_published === 1 ? (
                <>
                  <Eye className="w-3 h-3" />
                  <span>{tUi("admin.services.published", currentLanguage)}</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span>{tUi("admin.services.draft", currentLanguage)}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-text mb-2 line-clamp-1">{title}</h3>
        <p className="text-sm text-muted-text leading-relaxed line-clamp-3 mb-4">
          {description || tUi("admin.services.no_description", currentLanguage)}
        </p>

        {service.link_url && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-4 truncate">
            <LinkIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{service.link_text || service.link_url}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
        <span className="text-xs text-muted-text">{tUi("admin.services.position", currentLanguage, { order: service.sort_order })}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(service)}
            className="h-8 px-2.5 text-xs text-muted-text hover:text-text"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" />
            {tUi("common.edit", currentLanguage)}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(service)}
            className="h-8 px-2.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {tUi("common.delete", currentLanguage)}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Sortable Row for Table/List View
function SortableServiceRow({
  service,
  onEdit,
  onDelete,
  onTogglePublish,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  onTogglePublish: (service: Service) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { currentLanguage, tUi } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const title = getDisplayTitle(service.title);
  const description = getDisplayDescription(service.description);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-surface/50 border-b border-border transition-colors ${
        service.is_published === 0 ? "opacity-75 bg-surface/20" : ""
      }`}
    >
      <td className="py-4 px-3 w-10 text-center">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-muted-text hover:text-text cursor-grab active:cursor-grabbing rounded hover:bg-surface transition-colors"
          title={tUi("admin.services.drag_to_reorder", currentLanguage)}
        >
          <GripVertical className="w-4 h-4 inline-block" />
        </button>
      </td>
      <td className="py-4 px-3 w-16">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <ServiceIcon
            icon={service.icon}
            imageUrl={service.image_url}
            className="w-5 h-5"
          />
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="font-medium text-text text-sm">{title}</div>
        <div className="text-xs text-muted-text line-clamp-1 max-w-md">
          {description || tUi("admin.services.no_description", currentLanguage)}
        </div>
      </td>
      <td className="py-4 px-4">
        {service.link_url ? (
          <div className="flex items-center gap-1 text-xs text-primary truncate max-w-xs">
            <LinkIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{service.link_text || service.link_url}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-text">—</span>
        )}
      </td>
      <td className="py-4 px-4 text-center">
        <button
          type="button"
          onClick={() => onTogglePublish(service)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            service.is_published === 1
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
              : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 hover:bg-zinc-500/20"
          }`}
        >
          {service.is_published === 1 ? (
            <>
              <Eye className="w-3 h-3" />
              <span>{tUi("admin.services.published", currentLanguage)}</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3" />
              <span>{tUi("admin.services.draft", currentLanguage)}</span>
            </>
          )}
        </button>
      </td>
      <td className="py-4 px-3 text-center">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 text-muted-text hover:text-text disabled:opacity-20 rounded hover:bg-surface"
            title={tUi("admin.services.move_up", currentLanguage)}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 text-muted-text hover:text-text disabled:opacity-20 rounded hover:bg-surface"
            title={tUi("admin.services.move_down", currentLanguage)}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </td>
      <td className="py-4 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(service)}
            className="h-8 px-2.5 text-xs text-muted-text hover:text-text"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" />
            {tUi("common.edit", currentLanguage)}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(service)}
            className="h-8 px-2.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {tUi("common.delete", currentLanguage)}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function ServicesPage() {
  const { currentLanguage, tUi } = useLanguage();
  usePageTitle(tUi("admin.services.title", currentLanguage));
  const { fetchApi } = useApi();

  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);

  // Delete Confirmation State
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Success Toast / Banner
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

  const fetchServicesAndSettings = async () => {
    try {
      setLoading(true);
      const [servicesRes, settingsRes] = await Promise.all([
        fetchApi("/api/admin/services"),
        fetchApi("/api/admin/settings"),
      ]);

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(Array.isArray(servicesData) ? servicesData : []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData || {});
      }
    } catch (error) {
      console.error("Failed to load services", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicesAndSettings();
  }, []);

  const handleCreate = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleSave = async (serviceData: Partial<Service>) => {
    if (serviceData.id) {
      // Update
      const res = await fetchApi(`/api/admin/services/${serviceData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update service");
      }
      showToast(tUi("admin.services.updated_success", currentLanguage));
    } else {
      // Create
      const res = await fetchApi("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create service");
      }
      showToast(tUi("admin.services.created_success", currentLanguage));
    }
    await fetchServicesAndSettings();
  };

  const handleDelete = async () => {
    if (!serviceToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetchApi(`/api/admin/services/${serviceToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete service");
      }
      setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      setServiceToDelete(null);
      showToast(tUi("admin.services.deleted_success", currentLanguage));
    } catch (err: any) {
      alert(err.message || tUi("admin.services.delete_failed", currentLanguage));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublish = async (service: Service) => {
    const newStatus = service.is_published === 1 ? 0 : 1;
    try {
      // Optimistic update
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, is_published: newStatus } : s))
      );

      const res = await fetchApi(`/api/admin/services/${service.id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: newStatus }),
      });

      if (!res.ok) {
        // Revert if failed
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, is_published: service.is_published } : s))
        );
        throw new Error("Failed to update status");
      }

      showToast(newStatus === 1 ? tUi("admin.services.published_toast", currentLanguage) : tUi("admin.services.draft_toast", currentLanguage));
    } catch (err: any) {
      console.error(err);
      fetchServicesAndSettings();
    }
  };

  const persistReorder = async (updatedList: Service[]) => {
    const payload = updatedList.map((item, index) => ({
      id: item.id,
      sort_order: index + 1,
    }));

    try {
      await fetchApi("/api/admin/services/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
    } catch (e) {
      console.error("Failed to save reordered list", e);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = services.findIndex((item) => item.id === active.id);
      const newIndex = services.findIndex((item) => item.id === over.id);
      const updated = arrayMove(services, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        sort_order: idx + 1,
      }));
      setServices(updated);
      persistReorder(updated);
      showToast(tUi("admin.services.order_updated", currentLanguage));
    }
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= services.length) return;

    const updated = arrayMove(services, index, targetIndex).map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));
    setServices(updated);
    persistReorder(updated);
    showToast(tUi("admin.services.position_adjusted", currentLanguage));
  };

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // Status filter
      if (statusFilter === "published" && service.is_published !== 1) return false;
      if (statusFilter === "draft" && service.is_published !== 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = getDisplayTitle(service.title).toLowerCase();
        const desc = getDisplayDescription(service.description).toLowerCase();
        const icon = (service.icon || "").toLowerCase();
        return title.includes(query) || desc.includes(query) || icon.includes(query);
      }

      return true;
    });
  }, [services, searchQuery, statusFilter]);

  const publishedCount = services.filter((s) => s.is_published === 1).length;
  const draftCount = services.filter((s) => s.is_published === 0).length;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title={tUi("admin.services.title", currentLanguage)}
            description={tUi("admin.services.subtitle", currentLanguage)}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>{tUi("admin.services.add_service", currentLanguage)}</span>
          </Button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <Card className="border-border">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
            <Input
              placeholder={tUi("admin.services.search_placeholder", currentLanguage)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
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
                {tUi("admin.services.status_all", currentLanguage, { count: services.length })}
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
                {tUi("admin.services.status_published", currentLanguage, { count: publishedCount })}
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
                {tUi("admin.services.status_draft", currentLanguage, { count: draftCount })}
              </button>
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center p-1 bg-surface rounded-xl border border-border text-xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-text hover:text-text"
                }`}
                title={tUi("admin.services.grid_view", currentLanguage)}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-text hover:text-text"
                }`}
                title={tUi("admin.services.table_view", currentLanguage)}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main List / Grid Content */}
      {loading ? (
        <div className="py-20 text-center text-muted-text">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p>{tUi("admin.services.loading", currentLanguage)}</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <Card className="border-border border-dashed p-12 text-center">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">{tUi("admin.services.no_services_found", currentLanguage)}</h3>
          <p className="text-muted-text text-sm max-w-sm mx-auto mb-6">
            {searchQuery || statusFilter !== "all"
              ? tUi("admin.services.no_services_matched", currentLanguage)
              : tUi("admin.services.no_services_desc", currentLanguage)}
          </p>
          {searchQuery || statusFilter !== "all" ? (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              {tUi("admin.services.reset_filters", currentLanguage)}
            </Button>
          ) : (
            <Button onClick={handleCreate} className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>{tUi("admin.services.add_first_service", currentLanguage)}</span>
            </Button>
          )}
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {viewMode === "grid" ? (
            <SortableContext
              items={filteredServices.map((s) => s.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service, index) => {
                  const globalIndex = services.findIndex((s) => s.id === service.id);
                  return (
                    <SortableServiceCard
                      key={service.id}
                      service={service}
                      onEdit={handleEdit}
                      onDelete={(s) => setServiceToDelete(s)}
                      onTogglePublish={handleTogglePublish}
                      onMoveUp={() => handleMove(globalIndex, "up")}
                      onMoveDown={() => handleMove(globalIndex, "down")}
                      isFirst={globalIndex === 0}
                      isLast={globalIndex === services.length - 1}
                    />
                  );
                })}
              </div>
            </SortableContext>
          ) : (
            <Card className="border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface/50 text-xs font-semibold text-muted-text uppercase tracking-wider">
                      <th className="py-3.5 px-3 w-10 text-center"></th>
                      <th className="py-3.5 px-3 w-16">{tUi("admin.services.th_icon", currentLanguage)}</th>
                      <th className="py-3.5 px-4">{tUi("admin.services.th_service", currentLanguage)}</th>
                      <th className="py-3.5 px-4">{tUi("admin.services.th_cta", currentLanguage)}</th>
                      <th className="py-3.5 px-4 text-center">{tUi("admin.services.th_status", currentLanguage)}</th>
                      <th className="py-3.5 px-3 text-center">{tUi("admin.services.th_order", currentLanguage)}</th>
                      <th className="py-3.5 px-4 text-right">{tUi("admin.services.th_actions", currentLanguage)}</th>
                    </tr>
                  </thead>
                  <SortableContext
                    items={filteredServices.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody className="divide-y divide-border">
                      {filteredServices.map((service, index) => {
                        const globalIndex = services.findIndex((s) => s.id === service.id);
                        return (
                          <SortableServiceRow
                            key={service.id}
                            service={service}
                            onEdit={handleEdit}
                            onDelete={(s) => setServiceToDelete(s)}
                            onTogglePublish={handleTogglePublish}
                            onMoveUp={() => handleMove(globalIndex, "up")}
                            onMoveDown={() => handleMove(globalIndex, "down")}
                            isFirst={globalIndex === 0}
                            isLast={globalIndex === services.length - 1}
                          />
                        );
                      })}
                    </tbody>
                  </SortableContext>
                </table>
              </div>
            </Card>
          )}
        </DndContext>
      )}

      {/* Create / Edit Modal */}
      <ServiceModal
        isOpen={isModalOpen}
        service={editingService}
        siteLanguages={settings.site_languages || ""}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />

      {/* Delete Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-text">{tUi("admin.services.modal_delete_title", currentLanguage)}</h3>
            </div>

            <p className="text-sm text-muted-text leading-relaxed">
              {tUi("admin.services.modal_delete_desc", currentLanguage, { name: getDisplayTitle(serviceToDelete.title) })}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setServiceToDelete(null)}
                disabled={isDeleting}
              >
                {tUi("common.cancel", currentLanguage)}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? tUi("admin.services.deleting", currentLanguage) : tUi("admin.services.confirm_delete_btn", currentLanguage)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
