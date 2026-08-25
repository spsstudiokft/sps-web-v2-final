import { useState, useMemo, useEffect } from "react";
import { PortfolioItem, Category } from "../../../lib/types";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { PortfolioSortableItem } from "./PortfolioSortableItem";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { 
  Search, 
  Trash2, 
  Eye, 
  EyeOff, 
  CheckSquare, 
  Square, 
  Filter, 
  Camera, 
  Video as VideoIcon, 
  Sparkles,
  Layers,
  CheckCircle2,
  Film,
  Plane
} from "lucide-react";
import { getNormalizedGallery, isVideoMedia } from "../../../lib/mediaUtils";
import { AdminPagination } from "../AdminPagination";

interface Props {
  items: PortfolioItem[];
  categories?: Category[];
  onEdit: (item: PortfolioItem) => void;
  onDelete: (id: string) => void;
  onReorder: (items: {id: string, sort_order: number}[]) => void;
  onBulkAction: (action: string, ids: string[], value?: any) => void;
  onQuickSave: (item: PortfolioItem) => void;
}

export function PortfolioGallery({ items: initialItems, onEdit, onDelete, onReorder, onBulkAction, onQuickSave }: Props) {
  const [items, setItems] = useState<PortfolioItem[]>(initialItems);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterItemType, setFilterItemType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 24;

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

  // Sync state if initialItems change
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Compute counts for item categories
  const { totalCount, photoCount, droneVideoCount, interiorVideoCount, dronePhotoCount } = useMemo(() => {
    let p = 0;
    let d = 0;
    let i = 0;
    let dp = 0;

    items.forEach(item => {
      const type = item.item_type || (item.media_type === "video" ? "drone_video" : "image");
      if (type === "drone_video") d++;
      else if (type === "interior_video") i++;
      else if (type === "drone_photo") dp++;
      else p++;
    });

    return {
      totalCount: items.length,
      photoCount: p,
      droneVideoCount: d,
      interiorVideoCount: i,
      dronePhotoCount: dp
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        item.title.toLowerCase().includes(q) || 
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.keywords && item.keywords.toLowerCase().includes(q));

      const gallery = getNormalizedGallery(item.image_urls);
      let pCount = 0;
      let vCount = 0;
      gallery.forEach(it => {
        if (it.type === "video" || isVideoMedia(it)) {
          vCount++;
        } else {
          pCount++;
        }
      });
      const isDirectVideo = item.media_type === "video" || (item.media_url && isVideoMedia(item.media_url));
      if (gallery.length === 0 && isDirectVideo) {
        vCount = 1;
      }

      let matchesItemType = true;
      if (filterItemType === "drone_video") {
        matchesItemType = item.item_type === "drone_video";
      } else if (filterItemType === "interior_video") {
        matchesItemType = item.item_type === "interior_video";
      } else if (filterItemType === "drone_photo") {
        matchesItemType = item.item_type === "drone_photo";
      } else if (filterItemType === "image") {
        matchesItemType = item.item_type === "image" || (!item.item_type && vCount === 0);
      } else if (filterItemType === "video") {
        matchesItemType = item.item_type === "drone_video" || item.item_type === "interior_video" || vCount > 0;
      } else if (filterItemType === "mixed") {
        matchesItemType = pCount > 0 && vCount > 0;
      }

      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "published" && item.is_published) || 
        (filterStatus === "draft" && !item.is_published);

      return matchesSearch && matchesItemType && matchesStatus;
    });
  }, [items, searchQuery, filterItemType, filterStatus]);

  useEffect(() => { setPage(1); }, [searchQuery, filterItemType, filterStatus]);
  const visibleItems = useMemo(() => filteredItems.slice((page - 1) * pageSize, page * pageSize), [filteredItems, page]);
  const pagination = { page, page_size: pageSize, total: filteredItems.length, total_pages: Math.max(1, Math.ceil(filteredItems.length / pageSize)) };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Calculate new sort orders
        const reorderedItems = newItems.map((item, index) => ({
          id: item.id,
          sort_order: index
        }));
        
        onReorder(reorderedItems);
        return newItems;
      });
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleBulkAction = (action: string, value?: any) => {
    if (selectedIds.size === 0) return;
    onBulkAction(action, Array.from(selectedIds), value);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Item Filter Category Pills & Controls */}
      <div className="space-y-4">
        {/* Item Filter Category Quick Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setFilterItemType("all")}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              filterItemType === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-surface border border-border text-muted-text hover:text-text hover:bg-surface/80"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Items ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterItemType(filterItemType === "image" ? "all" : "image")}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              filterItemType === "image"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-surface border border-border text-muted-text hover:text-text hover:bg-surface/80"
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-sky-500" />
            <span>Photos / Images (Row 1) ({photoCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterItemType(filterItemType === "drone_video" ? "all" : "drone_video")}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              filterItemType === "drone_video"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-surface border border-border text-muted-text hover:text-text hover:bg-surface/80"
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-purple-500" />
            <span>Drone Videos (Row 2) ({droneVideoCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterItemType(filterItemType === "interior_video" ? "all" : "interior_video")}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              filterItemType === "interior_video"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-surface border border-border text-muted-text hover:text-text hover:bg-surface/80"
            }`}
          >
            <Film className="w-3.5 h-3.5 text-amber-500" />
            <span>Interior Walkthroughs (Row 3) ({interiorVideoCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterItemType(filterItemType === "drone_photo" ? "all" : "drone_photo")}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              filterItemType === "drone_photo"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-surface border border-border text-muted-text hover:text-text hover:bg-surface/80"
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-emerald-500" />
            <span>Drone Photos (Row 4) ({dronePhotoCount})</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-surface p-4 rounded-xl border border-border shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" />
            <Input 
              placeholder="Search by title, keywords or description..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Item Filter Category Dropdown */}
            <select 
              className="px-3 py-2 border border-border bg-background text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-xs font-medium transition-shadow"
              value={filterItemType}
              onChange={e => setFilterItemType(e.target.value)}
            >
              <option value="all">All Item Categories</option>
              <option value="image">📷 Photos / Images (Row 1)</option>
              <option value="drone_video">🛸 Drone Aerial Videos (Row 2)</option>
              <option value="interior_video">🏠 Interior Walkthroughs (Row 3)</option>
              <option value="drone_photo">🚁 Drone Photos (Row 4)</option>
              <option value="video">🎥 All Video Items</option>
              <option value="mixed">✨ Mixed Galleries</option>
            </select>
            
            {/* Status Dropdown */}
            <select 
              className="px-3 py-2 border border-border bg-background text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-xs font-medium transition-shadow"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft (Hidden)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface/60 px-4 py-3 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-2 text-xs font-semibold text-text hover:text-primary transition-colors cursor-pointer"
          >
            {selectedIds.size > 0 && selectedIds.size === filteredItems.length ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4 text-muted-text" />
            )}
            <span>
              {selectedIds.size === 0 
                ? `Select All (${filteredItems.length})` 
                : `${selectedIds.size} Selected`}
            </span>
          </button>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap animate-in fade-in duration-150">
            <span className="text-xs text-muted-text mr-1">Bulk:</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleBulkAction("publish", true)}
              className="text-xs h-7.5 px-2.5 text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Publish</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleBulkAction("publish", false)}
              className="text-xs h-7.5 px-2.5 text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Draft</span>
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleBulkAction("delete")}
              className="text-xs h-7.5 px-2.5 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        )}
      </div>

      {/* DnD Grid */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={visibleItems.map(i => i.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleItems.map((item) => (
              <PortfolioSortableItem
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                onSelect={toggleSelection}
                onEdit={onEdit}
                onDelete={onDelete}
                onQuickSave={onQuickSave}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <AdminPagination meta={pagination} onPageChange={setPage} />

      {filteredItems.length === 0 && (
        <div className="text-center py-16 bg-surface/50 rounded-2xl border-2 border-dashed border-border text-muted-text space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-muted-text">
            <Filter className="w-6 h-6 opacity-60" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm font-bold text-text">No Portfolio Items Found</h4>
            <p className="text-xs text-muted-text">
              {items.length === 0
                ? "Click 'Add Portfolio Item' above to upload photography, video walkthroughs, or YouTube/Vimeo embeds."
                : "No portfolio items matched your current search filters."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
