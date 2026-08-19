import { useState, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PortfolioItem } from "../../../lib/types";
import { getNormalizedGallery, parseVideoUrl, isVideoMedia, getGalleryCoverThumbnail } from "../../../lib/mediaUtils";
import { useLanguage } from "../../../contexts/LanguageContext";
import { t as translateContent } from "../../../lib/i18n";
import { Card, CardContent } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { 
  GripVertical, 
  CheckCircle2, 
  Save, 
  X, 
  Video as VideoIcon, 
  Camera, 
  Star, 
  Eye, 
  EyeOff, 
  Play, 
  Sparkles,
  Edit2,
  Trash2,
  Layers,
  Plane
} from "lucide-react";

interface Props {
  item: PortfolioItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (item: PortfolioItem) => void;
  onDelete: (id: string) => void;
  onQuickSave?: (item: PortfolioItem) => void;
}

export function PortfolioSortableItem({ item, isSelected, onSelect, onEdit, onDelete, onQuickSave }: Props) {
  const { currentLanguage, defaultLanguage, tUi } = useLanguage();
  const displayTitle = translateContent(item.title, currentLanguage, defaultLanguage) || "Untitled portfolio";
  const localizedCategory = translateContent(item.category_name, currentLanguage, defaultLanguage) || item.category_name || "";
  const displayCategory = localizedCategory ? (tUi(localizedCategory, currentLanguage) || localizedCategory) : "Uncategorized";
  const displayDescription = translateContent(item.description, currentLanguage, defaultLanguage) || item.description || "";
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [quickEditTitle, setQuickEditTitle] = useState(displayTitle);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  // Parse mixed gallery items
  const galleryItems = useMemo(() => {
    return getNormalizedGallery(item.image_urls);
  }, [item.image_urls]);

  const { photoCount, videoCount, hasVideo } = useMemo(() => {
    let p = 0;
    let v = 0;
    galleryItems.forEach(it => {
      if (it.type === "video" || isVideoMedia(it)) {
        v++;
      } else {
        p++;
      }
    });

    const isDirectVideo = item.media_type === "video" || (item.media_url && isVideoMedia(item.media_url));
    if (galleryItems.length === 0 && isDirectVideo) {
      v = 1;
    }

    return {
      photoCount: p,
      videoCount: v,
      hasVideo: v > 0 || isDirectVideo
    };
  }, [galleryItems, item.media_type, item.media_url]);

  const coverImage = getGalleryCoverThumbnail(item.thumbnail_url, item.media_url, galleryItems);

  const handleSave = () => {
    if (onQuickSave) {
      let nextTitle = quickEditTitle;
      try {
        const parsed = JSON.parse(item.title);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          nextTitle = JSON.stringify({ ...parsed, [currentLanguage]: quickEditTitle });
        }
      } catch {}
      onQuickSave({ ...item, title: nextTitle });
    }
    setIsQuickEditing(false);
  };

  const togglePublished = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickSave) {
      onQuickSave({ ...item, is_published: item.is_published ? 0 : 1 });
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Card className={`flex flex-col h-full overflow-hidden transition-all duration-200 ${isSelected ? "ring-2 ring-primary ring-offset-2" : "hover:border-primary/50"}`}>
        {/* Top Control Overlay */}
        <div className="absolute top-2 left-2 z-10 flex gap-1.5">
          <div
            {...attributes}
            {...listeners}
            className="w-7 h-7 rounded-lg bg-background/85 backdrop-blur-xs border border-border flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-background text-muted-text hover:text-text transition-colors shadow-xs"
            title="Drag to reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors shadow-xs ${
              isSelected 
                ? "bg-primary border-primary text-background" 
                : "bg-background/85 backdrop-blur-xs border-border text-transparent hover:border-primary/50"
            }`}
            title="Select item"
          >
            <CheckCircle2 className={`w-4 h-4 ${isSelected ? "text-background" : "text-muted-text/40 group-hover:text-muted-text"}`} />
          </button>
        </div>

        {/* Top Right Badges */}
        <div className="absolute top-2 right-2 z-10 flex gap-1 items-center pointer-events-none flex-wrap justify-end">
          {item.item_type === "drone_photo" ? (
            <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 shadow-xs" title="Row 4: Drone Photo">
              <Plane className="w-3 h-3" />
              <span>Drone Photo</span>
            </span>
          ) : item.item_type === "drone_video" ? (
            <span className="px-2 py-0.5 rounded-md bg-purple-600/90 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 shadow-xs" title="Row 2: Drone Video">
              <VideoIcon className="w-3 h-3" />
              <span>Drone Video</span>
            </span>
          ) : item.item_type === "interior_video" ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-600/90 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 shadow-xs" title="Row 3: Interior Video">
              <VideoIcon className="w-3 h-3" />
              <span>Interior Video</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-sky-600/90 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 shadow-xs" title="Row 1: Image">
              <Camera className="w-3 h-3" />
              <span>Image</span>
            </span>
          )}

          {item.is_featured === 1 && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold flex items-center shadow-xs" title="Featured item">
              <Star className="w-3 h-3 fill-current" />
            </span>
          )}
        </div>
        
        {/* Media Thumbnail */}
        {coverImage ? (
          <div className="w-full h-44 bg-surface relative overflow-hidden cursor-pointer" onClick={() => !isQuickEditing && onSelect(item.id)}>
            <img 
              src={coverImage} 
              alt={displayTitle}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
            {hasVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                <div className="w-10 h-10 rounded-full bg-white/90 text-purple-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ) : (
          <div className="w-full h-44 bg-surface flex flex-col items-center justify-center text-muted-text cursor-pointer p-4 text-center" onClick={() => !isQuickEditing && onSelect(item.id)}>
            <Camera className="w-8 h-8 mb-1 opacity-40" />
            <span className="text-xs">No media preview</span>
          </div>
        )}
        
        <CardContent className="flex-1 flex flex-col justify-between p-4 bg-background">
          <div>
            {isQuickEditing ? (
              <Input 
                value={quickEditTitle} 
                onChange={e => setQuickEditTitle(e.target.value)} 
                className="mb-2 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setIsQuickEditing(false);
                }}
              />
            ) : (
              <h3 
                className="font-semibold text-sm text-text line-clamp-1 cursor-text hover:text-primary transition-colors mb-1"
                onClick={() => { setIsQuickEditing(true); setQuickEditTitle(displayTitle); }}
                title="Click to quick-edit title"
              >
                {displayTitle}
              </h3>
            )}
            
            <div className="flex items-center justify-between text-xs text-muted-text mb-2">
              <span className="font-medium truncate max-w-[150px]">
                {displayCategory}
              </span>
              <span className="font-mono text-[11px]">
                #{item.sort_order ?? 0}
              </span>
            </div>

            {displayDescription && (
              <p className="text-xs text-muted-text line-clamp-1 mb-2 font-normal">
                {displayDescription}
              </p>
            )}
          </div>
          
          <div className="flex justify-between items-center text-xs pt-3 border-t border-border mt-auto">
            <button
              type="button"
              onClick={togglePublished}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                item.is_published 
                  ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300" 
                  : "text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
              }`}
              title="Click to toggle publish status"
            >
              {item.is_published ? (
                <>
                  <Eye className="w-3 h-3" />
                  <span>Published</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span>Draft</span>
                </>
              )}
            </button>

            <div className="flex space-x-1.5">
              {isQuickEditing ? (
                <>
                  <Button variant="secondary" onClick={handleSave} className="px-2 py-1 h-7 text-xs text-emerald-600">
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="secondary" onClick={() => setIsQuickEditing(false)} className="px-2 py-1 h-7 text-xs text-red-600">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => onEdit(item)} className="px-2.5 py-1 h-7 text-xs flex items-center gap-1">
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </Button>
                  <Button variant="danger" onClick={() => onDelete(item.id)} className="px-2 py-1 h-7 text-xs" title="Delete item">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
