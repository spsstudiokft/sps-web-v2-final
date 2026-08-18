import React, { useState, useEffect, useMemo } from "react";
import { SocialTreeNode, SocialNodeType } from "../../lib/types";
import { useApi } from "../../hooks/useApi";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useLanguage } from "../../contexts/LanguageContext";
import { PageHeader } from "../../components/admin/PageHeader";
import { SocialNodeModal } from "../../components/admin/SocialNodeModal";
import { DeleteSocialNodeModal } from "../../components/admin/DeleteSocialNodeModal";
import { SocialPopup } from "../../components/public/SocialPopup";
import { SocialIconRenderer, getPlatformPreset } from "../../lib/socialPresets";
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
  ChevronRight,
  FolderTree,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Link as LinkIcon,
  Folder,
  Sparkles,
  ExternalLink,
  RotateCcw,
  SlidersHorizontal,
  Share2
} from "lucide-react";

// ----------------------------------------------------------------------
// 1. Sortable Link Item Component (For Children or Flat Lists)
// ----------------------------------------------------------------------
function SortableLinkItem({
  node,
  onEdit,
  onDelete,
  onToggleStatus,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isNested = false,
}: {
  node: SocialTreeNode;
  onEdit: (node: SocialTreeNode) => void;
  onDelete: (node: SocialTreeNode) => void;
  onToggleStatus: (node: SocialTreeNode) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  isNested?: boolean;
}) {
  const { currentLanguage, tUi } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 20 : 1,
  };

  const isEnabled = Number(node.is_enabled) === 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
        isNested
          ? "bg-background/80 border-border/80 hover:border-primary/40 hover:bg-background"
          : "bg-surface/70 border-border hover:border-primary/40 hover:bg-surface"
      } ${!isEnabled ? "opacity-60 bg-surface/30" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 text-muted-text hover:text-text cursor-grab active:cursor-grabbing shrink-0"
          title="Drag to reorder"
          aria-label="Drag handle"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Brand/Platform Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
          style={{ backgroundColor: node.color || "#E4405F" }}
        >
          <SocialIconRenderer
            platform={node.platform}
            icon={node.icon}
            type="link"
            className="w-4 h-4 text-white"
          />
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-text truncate">{node.title}</span>
            {node.badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                {node.badge}
              </span>
            )}
            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-surface text-muted-text uppercase font-mono tracking-wider">
              {node.platform}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-text truncate">
            {node.subtitle && <span className="truncate">{node.subtitle}</span>}
            {node.subtitle && node.url && <span>·</span>}
            {node.url && (
              <a
                href={node.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="truncate hover:text-primary flex items-center gap-1 hover:underline text-muted-text"
              >
                <span>{node.url}</span>
                <ExternalLink className="w-3 h-3 shrink-0 inline" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Up/Down buttons for accessible reordering */}
        <div className="hidden sm:flex items-center">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1.5 text-muted-text hover:text-text disabled:opacity-20 disabled:hover:text-muted-text rounded-lg hover:bg-surface"
            title="Move Up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1.5 text-muted-text hover:text-text disabled:opacity-20 disabled:hover:text-muted-text rounded-lg hover:bg-surface"
            title="Move Down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle Publish */}
        <button
          type="button"
          onClick={() => onToggleStatus(node)}
          className={`p-2 rounded-xl transition-colors ${
            isEnabled
              ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              : "text-muted-text hover:bg-surface"
          }`}
          title={isEnabled ? "Enabled (Click to disable)" : "Disabled (Click to enable)"}
        >
          {isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        {/* Edit */}
        <button
          type="button"
          onClick={() => onEdit(node)}
          className="p-2 text-muted-text hover:text-text rounded-xl hover:bg-surface transition-colors"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(node)}
          className="p-2 text-muted-text hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. Sortable Group Node Component (Tree Folder with nested items)
// ----------------------------------------------------------------------
function SortableGroupNode({
  group,
  childNodes,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddChildLink,
  onMoveUp,
  onMoveDown,
  onReorderChildren,
  isFirst,
  isLast,
  isExpanded,
  onToggleExpand,
}: {
  group: SocialTreeNode;
  childNodes: SocialTreeNode[];
  onEdit: (node: SocialTreeNode) => void;
  onDelete: (node: SocialTreeNode) => void;
  onToggleStatus: (node: SocialTreeNode) => void;
  onAddChildLink: (groupId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onReorderChildren: (newChildren: SocialTreeNode[]) => void;
  isFirst: boolean;
  isLast: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { currentLanguage, tUi } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 20 : 1,
  };

  const isEnabled = Number(group.is_enabled) === 1;

  const childSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleChildDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = childNodes.findIndex((item) => item.id === active.id);
    const newIndex = childNodes.findIndex((item) => item.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(childNodes, oldIndex, newIndex);
      onReorderChildren(reordered);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-3xl border transition-all overflow-hidden mb-4 ${
        isEnabled
          ? "bg-surface/60 border-border shadow-xs hover:border-primary/30"
          : "bg-surface/30 border-border/60 opacity-60"
      }`}
    >
      {/* Group Header Bar */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3 bg-surface/80 border-b border-border/50">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Drag Handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 text-muted-text hover:text-text cursor-grab active:cursor-grabbing shrink-0"
            title="Drag group"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Group Expand Toggle */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 rounded-xl hover:bg-background text-muted-text hover:text-text transition-colors shrink-0"
            title={isExpanded ? "Collapse Group" : "Expand Group"}
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? "rotate-90 text-primary" : ""
              }`}
            />
          </button>

          {/* Group Icon */}
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: group.color || "#3B82F6" }}
          >
            <SocialIconRenderer
              type="group"
              icon={group.icon}
              className="w-5 h-5 text-white"
            />
          </div>

          {/* Group Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-base text-text truncate">{group.title}</span>
              {group.badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  {group.badge}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface text-muted-text font-medium border border-border">
                {childNodes.length} {childNodes.length === 1 ? "link" : "links"}
              </span>
            </div>
            {group.subtitle && (
              <p className="text-xs text-muted-text mt-0.5 truncate">{group.subtitle}</p>
            )}
          </div>
        </div>

        {/* Group Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Add Link to this Group Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddChildLink(group.id)}
            className="h-8 px-2.5 rounded-xl text-xs gap-1.5 hidden sm:flex border-border/80 hover:border-primary/50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Link</span>
          </Button>

          {/* Move Up/Down */}
          <div className="hidden sm:flex items-center">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-1.5 text-muted-text hover:text-text disabled:opacity-20 rounded-lg hover:bg-background"
              title="Move Group Up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              className="p-1.5 text-muted-text hover:text-text disabled:opacity-20 rounded-lg hover:bg-background"
              title="Move Group Down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle Active */}
          <button
            type="button"
            onClick={() => onToggleStatus(group)}
            className={`p-2 rounded-xl transition-colors ${
              isEnabled
                ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                : "text-muted-text hover:bg-background"
            }`}
            title={isEnabled ? "Group Enabled" : "Group Disabled"}
          >
            {isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Edit Group */}
          <button
            type="button"
            onClick={() => onEdit(group)}
            className="p-2 text-muted-text hover:text-text rounded-xl hover:bg-background transition-colors"
            title="Edit Group"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Delete Group */}
          <button
            type="button"
            onClick={() => onDelete(group)}
            className="p-2 text-muted-text hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-colors"
            title="Delete Group"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nested Children Accordion */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-background/50 border-t border-border/40">
          {childNodes.length === 0 ? (
            <div className="p-6 text-center rounded-2xl border border-dashed border-border bg-surface/30">
              <Folder className="w-8 h-8 mx-auto text-muted-text/50 mb-2" />
              <p className="text-sm font-medium text-text mb-1">No links in this group yet</p>
              <p className="text-xs text-muted-text mb-3">Add links to populate this category in the popup</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddChildLink(group.id)}
                className="rounded-xl text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Link to {group.title}</span>
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={childSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleChildDragEnd}
            >
              <SortableContext
                items={childNodes.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2.5">
                  {childNodes.map((child, cIdx) => (
                    <SortableLinkItem
                      key={child.id}
                      node={child}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onToggleStatus={onToggleStatus}
                      onMoveUp={() => {
                        if (cIdx > 0) {
                          const reordered = arrayMove(childNodes, cIdx, cIdx - 1);
                          onReorderChildren(reordered);
                        }
                      }}
                      onMoveDown={() => {
                        if (cIdx < childNodes.length - 1) {
                          const reordered = arrayMove(childNodes, cIdx, cIdx + 1);
                          onReorderChildren(reordered);
                        }
                      }}
                      isFirst={cIdx === 0}
                      isLast={cIdx === childNodes.length - 1}
                      isNested={true}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Quick inline add button */}
          {childNodes.length > 0 && (
            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => onAddChildLink(group.id)}
                className="text-xs text-muted-text hover:text-primary font-medium flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-surface transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add another link to this group</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Main SocialLinksPage Component
// ----------------------------------------------------------------------
export function SocialLinksPage() {
  const { currentLanguage, tUi } = useLanguage();
  usePageTitle(tUi("admin.social.page_title", currentLanguage) || "Social Links Tree Manager");
  const { fetchApi } = useApi();

  const [nodes, setNodes] = useState<SocialTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "group" | "link">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");

  // Expanded Groups state
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Partial<SocialTreeNode> | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [defaultType, setDefaultType] = useState<SocialNodeType>("link");

  const [deleteNode, setDeleteNode] = useState<SocialTreeNode | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [isResetting, setIsResetting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // DnD Sensors for Top-Level list
  const rootSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load all social links
  const loadNodes = async () => {
    try {
      setIsLoading(true);
      const res = await fetchApi("/api/admin/social-links");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNodes(data);
          // Default expand groups that have is_expanded_default = 1
          const initialExpanded = new Set<string>();
          data.filter(n => n.type === "group" && Number(n.is_expanded_default) === 1).forEach(g => {
            initialExpanded.add(g.id);
          });
          setExpandedGroupIds(initialExpanded);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load social links");
      }
    } catch (e: any) {
      console.error("Failed to load social links:", e);
      setFeedbackMsg({ text: e.message || "Failed to load social links", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNodes();
  }, []);

  // Filter groups and top-level root items
  const allGroups = useMemo(() => {
    return nodes.filter(n => n.type === "group");
  }, [nodes]);

  // Build tree representation:
  // Root elements: groups or links without a parent_id
  const { rootNodes, childrenMap } = useMemo(() => {
    const map = new Map<string, SocialTreeNode[]>();
    const roots: SocialTreeNode[] = [];

    // Pre-populate empty array for every group
    nodes.forEach(n => {
      if (n.type === "group") {
        map.set(n.id, []);
      }
    });

    nodes.forEach(n => {
      if (n.parent_id && map.has(n.parent_id)) {
        map.get(n.parent_id)!.push(n);
      } else {
        roots.push(n);
      }
    });

    // Sort items within groups by sort_order
    map.forEach((items) => {
      items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });

    // Sort root items
    roots.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return { rootNodes: roots, childrenMap: map };
  }, [nodes]);

  // Filtered nodes (for flat list & search)
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      // Type filter
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      // Status filter
      if (statusFilter === "enabled" && Number(n.is_enabled) !== 1) return false;
      if (statusFilter === "disabled" && Number(n.is_enabled) === 1) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = n.title?.toLowerCase().includes(q);
        const subMatch = n.subtitle?.toLowerCase().includes(q);
        const urlMatch = n.url?.toLowerCase().includes(q);
        const platMatch = n.platform?.toLowerCase().includes(q);
        const badgeMatch = n.badge?.toLowerCase().includes(q);
        return titleMatch || subMatch || urlMatch || platMatch || badgeMatch;
      }
      return true;
    });
  }, [nodes, typeFilter, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = nodes.length;
    const groupsCount = nodes.filter(n => n.type === "group").length;
    const linksCount = nodes.filter(n => n.type === "link").length;
    const activeLinksCount = nodes.filter(n => n.type === "link" && Number(n.is_enabled) === 1).length;
    return { total, groupsCount, linksCount, activeLinksCount };
  }, [nodes]);

  // Expand / Collapse Helpers
  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    allGroups.forEach(g => all.add(g.id));
    setExpandedGroupIds(all);
  };

  const collapseAll = () => {
    setExpandedGroupIds(new Set());
  };

  // Open modal for new root group
  const handleOpenAddGroup = () => {
    setEditingNode(null);
    setDefaultParentId(null);
    setDefaultType("group");
    setIsModalOpen(true);
  };

  // Open modal for new root link
  const handleOpenAddLink = () => {
    setEditingNode(null);
    setDefaultParentId(null);
    setDefaultType("link");
    setIsModalOpen(true);
  };

  // Open modal for link inside specific group
  const handleOpenAddChildLink = (groupId: string) => {
    setEditingNode(null);
    setDefaultParentId(groupId);
    setDefaultType("link");
    setIsModalOpen(true);
  };

  // Open modal to edit existing node
  const handleOpenEdit = (node: SocialTreeNode) => {
    setEditingNode(node);
    setDefaultParentId(node.parent_id || null);
    setDefaultType(node.type);
    setIsModalOpen(true);
  };

  // Open modal to delete node
  const handleOpenDelete = (node: SocialTreeNode) => {
    setDeleteNode(node);
    setIsDeleteModalOpen(true);
  };

  // Save Node (Create / Update)
  const handleSaveNode = async (nodeData: Partial<SocialTreeNode>) => {
    if (nodeData.id) {
      const res = await fetchApi(`/api/admin/social-links/${nodeData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nodeData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update social link");
      }
      setFeedbackMsg({ text: `Updated "${nodeData.title}" successfully`, type: "success" });
    } else {
      const res = await fetchApi("/api/admin/social-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nodeData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create social link");
      }
      setFeedbackMsg({ text: `Created "${nodeData.title}" successfully`, type: "success" });
    }
    await loadNodes();
  };

  // Delete Node Confirm
  const handleConfirmDelete = async (nodeId: string, deleteChildren: boolean) => {
    try {
      const res = await fetchApi(`/api/admin/social-links/${nodeId}?deleteChildren=${deleteChildren}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete social link");
      }
      setFeedbackMsg({ text: "Node deleted successfully", type: "success" });
      await loadNodes();
    } catch (e: any) {
      setFeedbackMsg({ text: e.message || "Failed to delete node", type: "error" });
    }
  };

  // Toggle node is_enabled
  const handleToggleStatus = async (node: SocialTreeNode) => {
    try {
      const res = await fetchApi(`/api/admin/social-links/${node.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to toggle status");
      }
      const data = await res.json();
      setNodes(prev =>
        prev.map(n => (n.id === node.id ? { ...n, is_enabled: data.is_enabled } : n))
      );
    } catch (e: any) {
      setFeedbackMsg({ text: e.message || "Failed to toggle status", type: "error" });
    }
  };

  // Root Drag & Drop Reorder
  const handleRootDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rootNodes.findIndex(item => item.id === active.id);
    const newIndex = rootNodes.findIndex(item => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedRoots = arrayMove(rootNodes, oldIndex, newIndex);
      // Construct reorder payload for roots
      const itemsPayload = reorderedRoots.map((item, idx) => ({
        id: item.id,
        sort_order: idx + 1,
        parent_id: null,
      }));

      // Optimistic update
      setNodes(prev => {
        const next = [...prev];
        itemsPayload.forEach(p => {
          const found = next.find(n => n.id === p.id);
          if (found) {
            found.sort_order = p.sort_order;
            found.parent_id = null;
          }
        });
        return next;
      });

      try {
        await fetchApi("/api/admin/social-links/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: itemsPayload }),
        });
      } catch (e: any) {
        console.error("Reorder failed:", e);
        loadNodes();
      }
    }
  };

  // Reorder children inside a group
  const handleReorderChildren = async (reorderedChildren: SocialTreeNode[]) => {
    const itemsPayload = reorderedChildren.map((item, idx) => ({
      id: item.id,
      sort_order: idx + 1,
      parent_id: item.parent_id,
    }));

    // Optimistic update
    setNodes(prev => {
      const next = [...prev];
      itemsPayload.forEach(p => {
        const found = next.find(n => n.id === p.id);
        if (found) {
          found.sort_order = p.sort_order;
        }
      });
      return next;
    });

    try {
      await fetchApi("/api/admin/social-links/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsPayload }),
      });
    } catch (e: any) {
      console.error("Reorder children failed:", e);
      loadNodes();
    }
  };

  // Reset to default presets
  const handleResetDefaults = async () => {
    if (!window.confirm("Are you sure you want to reset the social links tree to default presets? All current links and groups will be replaced.")) {
      return;
    }

    try {
      setIsResetting(true);
      const res = await fetchApi("/api/admin/social-links/reset-defaults", {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to reset defaults");
      }
      setFeedbackMsg({ text: "Reset to default social tree successfully!", type: "success" });
      await loadNodes();
    } catch (e: any) {
      setFeedbackMsg({ text: e.message || "Failed to reset defaults", type: "error" });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <PageHeader
        title={tUi("admin.social.page_title", currentLanguage) || "Social Popup Tree Manager"}
        description={
          tUi("admin.social.page_desc", currentLanguage) ||
          "Configure hierarchical groups, brand links, icons, and badges displayed in the public interactive social popup."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Popup Preview */}
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
              className="rounded-2xl gap-2 shadow-xs bg-surface border-border hover:border-primary/40"
            >
              <Share2 className="w-4 h-4 text-primary" />
              <span>{tUi("admin.social.preview_popup", currentLanguage) || "Preview Popup"}</span>
            </Button>

            {/* Reset to defaults */}
            <Button
              variant="outline"
              onClick={handleResetDefaults}
              disabled={isResetting}
              className="rounded-2xl gap-2 text-muted-text hover:text-text border-border"
              title="Reset to default tree structure"
            >
              <RotateCcw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Reset Defaults</span>
            </Button>

            {/* Add Group */}
            <Button
              variant="outline"
              onClick={handleOpenAddGroup}
              className="rounded-2xl gap-2 border-border hover:border-primary/40"
            >
              <FolderTree className="w-4 h-4 text-primary" />
              <span>{tUi("admin.social.add_group_btn", currentLanguage) || "Add Group"}</span>
            </Button>

            {/* Add Social Link */}
            <Button
              onClick={handleOpenAddLink}
              className="rounded-2xl gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{tUi("admin.social.add_link_btn", currentLanguage) || "Add Social Link"}</span>
            </Button>
          </div>
        }
      />

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs opacity-70 hover:opacity-100 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Stats Overview Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="rounded-3xl border-border/80 bg-surface/50 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-text">{stats.total}</div>
              <div className="text-xs text-muted-text font-medium">Total Tree Nodes</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/80 bg-surface/50 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-text">{stats.groupsCount}</div>
              <div className="text-xs text-muted-text font-medium">Link Groups</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/80 bg-surface/50 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-text">{stats.linksCount}</div>
              <div className="text-xs text-muted-text font-medium">Direct Links</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/80 bg-surface/50 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-text">{stats.activeLinksCount}</div>
              <div className="text-xs text-muted-text font-medium">Active & Visible</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <Card className="rounded-3xl border-border/80 bg-surface/40 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tUi("admin.social.search_placeholder", currentLanguage) || "Search platforms, groups, URLs..."}
              className="pl-10 h-10 rounded-2xl bg-background border-border"
            />
            <Search className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-muted-text hover:text-text absolute right-3 top-1/2 -translate-y-1/2"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filters & View Toggles */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="h-10 px-3 rounded-2xl border border-border bg-background text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Types</option>
              <option value="group">📁 Groups Only</option>
              <option value="link">🔗 Links Only</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-10 px-3 rounded-2xl border border-border bg-background text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Statuses</option>
              <option value="enabled">Active (Visible)</option>
              <option value="disabled">Disabled (Hidden)</option>
            </select>

            {/* View Mode (Tree vs Flat) */}
            <div className="flex items-center p-1 bg-surface rounded-2xl border border-border">
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "tree"
                    ? "bg-background text-text shadow-xs"
                    : "text-muted-text hover:text-text"
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Tree View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("flat")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "flat"
                    ? "bg-background text-text shadow-xs"
                    : "text-muted-text hover:text-text"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Flat List</span>
              </button>
            </div>

            {/* Tree Expand/Collapse helpers */}
            {viewMode === "tree" && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={expandAll}
                  className="h-9 px-2 text-xs text-muted-text hover:text-text rounded-xl"
                  title="Expand All Groups"
                >
                  Expand All
                </Button>
                <span className="text-border">|</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={collapseAll}
                  className="h-9 px-2 text-xs text-muted-text hover:text-text rounded-xl"
                  title="Collapse All Groups"
                >
                  Collapse All
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Tree / List Container */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-text">Loading social links tree...</p>
        </div>
      ) : nodes.length === 0 ? (
        <Card className="rounded-3xl border-dashed border-2 border-border bg-surface/30 p-12 text-center">
          <FolderTree className="w-12 h-12 mx-auto text-muted-text mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-text mb-2">No Social Links Configured</h3>
          <p className="text-sm text-muted-text max-w-md mx-auto mb-6">
            Get started by loading our pre-built real estate social media tree or create custom groups and links.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={handleResetDefaults}
              className="rounded-2xl gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Default Studio Social Tree</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenAddGroup}
              className="rounded-2xl gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Empty Group</span>
            </Button>
          </div>
        </Card>
      ) : viewMode === "tree" ? (
        /* ================== TREE VIEW ================== */
        <DndContext
          sensors={rootSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleRootDragEnd}
        >
          <SortableContext
            items={rootNodes.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {rootNodes.map((rootItem, rIdx) => {
                if (rootItem.type === "group") {
                  const children = childrenMap.get(rootItem.id) || [];
                  return (
                    <SortableGroupNode
                      key={rootItem.id}
                      group={rootItem}
                      childNodes={children}
                      onEdit={handleOpenEdit}
                      onDelete={handleOpenDelete}
                      onToggleStatus={handleToggleStatus}
                      onAddChildLink={handleOpenAddChildLink}
                      onMoveUp={() => {
                        if (rIdx > 0) {
                          const reordered = arrayMove(rootNodes, rIdx, rIdx - 1);
                          const itemsPayload = reordered.map((item, idx) => ({
                            id: item.id,
                            sort_order: idx + 1,
                            parent_id: null,
                          }));
                          setNodes(prev => {
                            const next = [...prev];
                            itemsPayload.forEach(p => {
                              const found = next.find(n => n.id === p.id);
                              if (found) found.sort_order = p.sort_order;
                            });
                            return next;
                          });
                          fetchApi("/api/admin/social-links/reorder", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ items: itemsPayload }),
                          });
                        }
                      }}
                      onMoveDown={() => {
                        if (rIdx < rootNodes.length - 1) {
                          const reordered = arrayMove(rootNodes, rIdx, rIdx + 1);
                          const itemsPayload = reordered.map((item, idx) => ({
                            id: item.id,
                            sort_order: idx + 1,
                            parent_id: null,
                          }));
                          setNodes(prev => {
                            const next = [...prev];
                            itemsPayload.forEach(p => {
                              const found = next.find(n => n.id === p.id);
                              if (found) found.sort_order = p.sort_order;
                            });
                            return next;
                          });
                          fetchApi("/api/admin/social-links/reorder", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ items: itemsPayload }),
                          });
                        }
                      }}
                      onReorderChildren={handleReorderChildren}
                      isFirst={rIdx === 0}
                      isLast={rIdx === rootNodes.length - 1}
                      isExpanded={expandedGroupIds.has(rootItem.id)}
                      onToggleExpand={() => toggleGroupExpand(rootItem.id)}
                    />
                  );
                } else {
                  // Standalone Root Link
                  return (
                    <SortableLinkItem
                      key={rootItem.id}
                      node={rootItem}
                      onEdit={handleOpenEdit}
                      onDelete={handleOpenDelete}
                      onToggleStatus={handleToggleStatus}
                      onMoveUp={() => {
                        if (rIdx > 0) {
                          const reordered = arrayMove(rootNodes, rIdx, rIdx - 1);
                          const itemsPayload = reordered.map((item, idx) => ({
                            id: item.id,
                            sort_order: idx + 1,
                            parent_id: null,
                          }));
                          setNodes(prev => {
                            const next = [...prev];
                            itemsPayload.forEach(p => {
                              const found = next.find(n => n.id === p.id);
                              if (found) found.sort_order = p.sort_order;
                            });
                            return next;
                          });
                          fetchApi("/api/admin/social-links/reorder", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ items: itemsPayload }),
                          });
                        }
                      }}
                      onMoveDown={() => {
                        if (rIdx < rootNodes.length - 1) {
                          const reordered = arrayMove(rootNodes, rIdx, rIdx + 1);
                          const itemsPayload = reordered.map((item, idx) => ({
                            id: item.id,
                            sort_order: idx + 1,
                            parent_id: null,
                          }));
                          setNodes(prev => {
                            const next = [...prev];
                            itemsPayload.forEach(p => {
                              const found = next.find(n => n.id === p.id);
                              if (found) found.sort_order = p.sort_order;
                            });
                            return next;
                          });
                          fetchApi("/api/admin/social-links/reorder", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ items: itemsPayload }),
                          });
                        }
                      }}
                      isFirst={rIdx === 0}
                      isLast={rIdx === rootNodes.length - 1}
                      isNested={false}
                    />
                  );
                }
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        /* ================== FLAT LIST VIEW ================== */
        <div className="space-y-3">
          {filteredNodes.length === 0 ? (
            <div className="p-12 text-center text-muted-text">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No nodes match your filter criteria.</p>
            </div>
          ) : (
            filteredNodes.map((node, idx) => (
              <SortableLinkItem
                key={node.id}
                node={node}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
                onToggleStatus={handleToggleStatus}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
                isFirst={idx === 0}
                isLast={idx === filteredNodes.length - 1}
                isNested={false}
              />
            ))
          )}
        </div>
      )}

      {/* Add / Edit Node Modal */}
      <SocialNodeModal
        isOpen={isModalOpen}
        node={editingNode}
        allGroups={allGroups}
        defaultParentId={defaultParentId}
        defaultType={defaultType}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNode}
      />

      {/* Delete Confirmation Modal */}
      <DeleteSocialNodeModal
        isOpen={isDeleteModalOpen}
        node={deleteNode}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* Interactive Public Popup Preview */}
      <SocialPopup
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}

export default SocialLinksPage;

