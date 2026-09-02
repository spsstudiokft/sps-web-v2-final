import React, { useState, useMemo, useRef } from "react";
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
import { ImageSortableItem, GalleryImage } from "./ImageSortableItem";
import { EmbedVideoModal } from "./EmbedVideoModal";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faSearch, 
  faTrash, 
  faCheckSquare, 
  faSquare, 
  faUpload, 
  faSpinner, 
  faChevronLeft, 
  faChevronRight,
  faVideo,
  faImage,
  faPlus,
  faLink
} from "@fortawesome/free-solid-svg-icons";
import { GalleryMediaItem, isVideoMedia, buildStructuredFilename, sanitizeNameForFilename, formatItemNumber, validateStructuredFilename } from "../../../lib/mediaUtils";
import { 
  Video as VideoIcon, 
  Image as ImageIcon, 
  Plus, 
  Link as LinkIcon, 
  Upload, 
  Filter,
  Sparkles,
  Layers,
  Film,
  FileCheck2,
  SlidersHorizontal,
  Wand2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plane
} from "lucide-react";
import { useApi } from "../../../hooks/useApi";
import { GalleryItemType } from "../../../lib/mediaUtils";
import { parseVideoUrl } from "../../../lib/mediaUtils";
import { createVideoPosterFromUrl, uploadMediaFile } from "../../../lib/uploadHelper";
import { useAuth } from "../../../contexts/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";

interface Props {
  images: GalleryMediaItem[];
  onChange: (images: GalleryMediaItem[]) => void;
  onUpload: (files: FileList) => Promise<void>;
  onUploadVideo?: (file: File) => Promise<void>;
  onUploadThumbnail?: (file: File) => Promise<string>;
  isUploading: boolean;
  projectName?: string;
  categoryName?: string;
  portfolioItemId?: string;
}

export function ImageGalleryManager({ 
  images, 
  onChange, 
  onUpload, 
  onUploadVideo,
  onUploadThumbnail,
  isUploading,
  projectName = "project",
  categoryName = "photos",
  portfolioItemId
}: Props) {
  const { tUi, currentLanguage } = useLanguage();
  const { fetchApi } = useApi();
  const { token } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "photos" | "drone" | "interior" | "drone_photos" | "videos">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [isBatchRestructuring, setIsBatchRestructuring] = useState(false);
  const [isGeneratingVideoPosters, setIsGeneratingVideoPosters] = useState(false);
  const [restructureFeedback, setRestructureFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 24;

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

  // Count items that do not yet have a valid structured filename
  const unstructuredCount = useMemo(() => {
    return images.filter(img => {
      const fn = img.filename || (img.url ? img.url.split("/").pop()?.split("?")[0] : "");
      const v = validateStructuredFilename(fn || "");
      return !v.valid || v.parsed?.is10Mb;
    }).length;
  }, [images]);

  const missingVideoPosterCount = useMemo(() => images.filter((image) => {
    const isVideo = image.type === "video" || isVideoMedia(image) || image.item_type?.includes("video");
    return isVideo && !image.thumbnail_url?.trim() && parseVideoUrl(image.url).type === "upload";
  }).length, [images]);

  const handleGenerateMissingVideoPosters = async () => {
    if (!portfolioItemId || isGeneratingVideoPosters || missingVideoPosterCount === 0) return;
    setIsGeneratingVideoPosters(true);
    setRestructureFeedback({ type: "info", message: tUi("admin.portfolio.gallery.poster_generating_info", currentLanguage, { count: missingVideoPosterCount }) });
    let updatedImages = [...images];
    let generated = 0;
    let failed = 0;

    for (const image of images) {
      const isVideo = image.type === "video" || isVideoMedia(image) || image.item_type?.includes("video");
      if (!isVideo || image.thumbnail_url?.trim() || parseVideoUrl(image.url).type !== "upload") continue;
      try {
        const posterFile = await createVideoPosterFromUrl(image.url, image.filename || "video.mp4");
        if (!posterFile) throw new Error(tUi("admin.portfolio.gallery.poster_extract_failed", currentLanguage));
        const result = await uploadMediaFile(posterFile, {
          token,
          projectName,
          categoryName: "posters",
          itemType: "video-poster",
          itemNumber: generated + 1,
          useStructuredName: true,
        });
        const updatedItem = { ...image, thumbnail_url: result.thumbnailUrl || result.compressedUrl || result.url };
        const response = await fetchApi(`/api/admin/portfolio/${encodeURIComponent(portfolioItemId)}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item: updatedItem }),
        });
        if (!response.ok) throw new Error(tUi("admin.portfolio.gallery.poster_save_failed", currentLanguage));
        updatedImages = updatedImages.map((current) => current.id === image.id ? updatedItem : current);
        onChange(updatedImages);
        generated += 1;
      } catch (error) {
        console.warn("Could not generate a video poster", error);
        failed += 1;
      }
    }

    setIsGeneratingVideoPosters(false);
    setRestructureFeedback({
      type: failed ? "error" : "success",
      message: failed
        ? tUi("admin.portfolio.gallery.poster_result_partial", currentLanguage, { generated, failed })
        : tUi("admin.portfolio.gallery.poster_result_success", currentLanguage, { count: generated }),
    });
  };

  // Batch auto-structure filenames: renames unstructured files in bucket and creates under 10MB images
  const handleBatchStandardizeFilenames = async () => {
    if (images.length === 0 || isBatchRestructuring || isUploading) return;

    try {
      setIsBatchRestructuring(true);
      setRestructureFeedback({
        type: "info",
        message: tUi("admin.portfolio.gallery.restructure_info", currentLanguage)
      });

      const res = await fetchApi("/api/admin/media/batch-restructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: images,
          projectName: projectName || "project",
          categoryName: categoryName || "photos",
          portfolioItemId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || tUi("admin.portfolio.gallery.restructure_storage_failed", currentLanguage));
      }

      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        onChange(data.items);
      }

      const sum = data.summary;
      setRestructureFeedback({
        type: "success",
        message: tUi("admin.portfolio.gallery.restructure_success", currentLanguage, {
          renamed: sum?.renamedInBucket || 0,
          compressed: sum?.compressedCreated || 0,
          structured: sum?.alreadyStructured || 0,
        })
      });

      setTimeout(() => {
        setRestructureFeedback(null);
      }, 7000);
    } catch (err: any) {
      console.error("Batch restructure error:", err);
      setRestructureFeedback({
        type: "error",
        message: err.message || tUi("admin.portfolio.gallery.restructure_failed", currentLanguage)
      });
    } finally {
      setIsBatchRestructuring(false);
    }
  };

  // Calculate specific media type counts
  const { photoCount, droneVideoCount, interiorVideoCount, dronePhotoCount, totalVideos } = useMemo(() => {
    let pCount = 0;
    let dCount = 0;
    let iCount = 0;
    let dpCount = 0;

    images.forEach(img => {
      const type = img.item_type || (img.type === "video" || isVideoMedia(img) ? "drone_video" : "image");
      if (type === "image") {
        pCount++;
      } else if (type === "drone_video") {
        dCount++;
      } else if (type === "interior_video") {
        iCount++;
      } else if (type === "drone_photo") {
        dpCount++;
      } else {
        pCount++;
      }
    });

    return { 
      photoCount: pCount, 
      droneVideoCount: dCount, 
      interiorVideoCount: iCount,
      dronePhotoCount: dpCount,
      totalVideos: dCount + iCount
    };
  }, [images]);

  const filteredImages = useMemo(() => {
    return images.filter(img => {
      const type = img.item_type || (img.type === "video" || isVideoMedia(img) ? "drone_video" : "image");
      
      // Media type filter
      if (mediaTypeFilter === "photos" && type !== "image") return false;
      if (mediaTypeFilter === "drone" && type !== "drone_video") return false;
      if (mediaTypeFilter === "interior" && type !== "interior_video") return false;
      if (mediaTypeFilter === "drone_photos" && type !== "drone_photo") return false;
      if (mediaTypeFilter === "videos" && type !== "drone_video" && type !== "interior_video") return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (img.title && img.title.toLowerCase().includes(q)) ||
        (img.caption && img.caption.toLowerCase().includes(q)) ||
        (img.alt && img.alt.toLowerCase().includes(q)) ||
        (img.url && img.url.toLowerCase().includes(q))
      );
    });
  }, [images, searchQuery, mediaTypeFilter]);

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
  
  const currentImages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredImages.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredImages, currentPage]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex(img => img.id === active.id);
      const newIndex = images.findIndex(img => img.id === over.id);
      
      const newImages = arrayMove(images, oldIndex, newIndex);
      onChange(newImages);
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
    if (selectedIds.size === currentImages.length && currentImages.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentImages.map(i => i.id)));
    }
  };

  const handleUpdate = (id: string, updates: Partial<GalleryMediaItem>) => {
    const newImages = images.map(img => img.id === id ? { ...img, ...updates } : img);
    onChange(newImages);
  };

  const handleDelete = (id: string) => {
    const newImages = images.filter(img => img.id !== id);
    onChange(newImages);
    
    if (selectedIds.has(id)) {
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
    }
    
    const newFilteredLength = filteredImages.length - 1;
    const newTotalPages = Math.ceil(newFilteredLength / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  };

  const handleBulkSetType = (newType: GalleryItemType) => {
    if (selectedIds.size === 0) return;
    const isNowVideo = newType === "drone_video" || newType === "interior_video";
    const newImages = images.map(img => {
      if (selectedIds.has(img.id)) {
        return {
          ...img,
          item_type: newType,
          type: isNowVideo ? "video" : "image"
        };
      }
      return img;
    });
    onChange(newImages);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!(await globalThis.appConfirm(tUi("admin.portfolio.gallery.delete_confirm", currentLanguage, { count: selectedIds.size }), { tone: "danger", confirmLabel: "Törlés" }))) return;
    
    const newImages = images.filter(img => !selectedIds.has(img.id));
    onChange(newImages);
    setSelectedIds(new Set());
    
    const newFilteredLength = filteredImages.length - selectedIds.size;
    const newTotalPages = Math.ceil(newFilteredLength / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  };

  const handleAddEmbeddedVideo = (videoItem: GalleryMediaItem) => {
    const updated = [...images, videoItem];
    onChange(updated);
  };

  const handleVideoFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onUploadVideo) {
      await onUploadVideo(file);
    }
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-surface p-4 rounded-2xl border border-border shadow-xs">
        {/* Left: Search & Filter Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative w-full sm:w-60">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text text-xs" />
            <Input 
              placeholder={tUi("admin.portfolio.gallery.search", currentLanguage)} 
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-9 text-xs"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => { setMediaTypeFilter("all"); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                mediaTypeFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-text hover:text-text"
              }`}
            >
              {tUi("admin.portfolio.gallery.filter_all_count", currentLanguage, { count: images.length })}
            </button>
            <button
              type="button"
              onClick={() => { setMediaTypeFilter("photos"); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                mediaTypeFilter === "photos"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-muted-text hover:text-text"
              }`}
              title={tUi("admin.portfolio.gallery.filter_photos_hint", currentLanguage)}
            >
              <ImageIcon className="w-3 h-3" />
              <span>{tUi("admin.portfolio.gallery.filter_photo_items_count", currentLanguage, { count: photoCount })}</span>
            </button>
            <button
              type="button"
              onClick={() => { setMediaTypeFilter("drone"); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                mediaTypeFilter === "drone"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-text hover:text-text"
              }`}
              title={tUi("admin.portfolio.gallery.filter_drone_videos_hint", currentLanguage)}
            >
              <VideoIcon className="w-3 h-3" />
              <span>{tUi("admin.portfolio.gallery.filter_drone_videos_count", currentLanguage, { count: droneVideoCount })}</span>
            </button>
            <button
              type="button"
              onClick={() => { setMediaTypeFilter("interior"); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                mediaTypeFilter === "interior"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-muted-text hover:text-text"
              }`}
              title={tUi("admin.portfolio.gallery.filter_interior_videos_hint", currentLanguage)}
            >
              <Film className="w-3 h-3" />
              <span>{tUi("admin.portfolio.gallery.filter_interior_videos_count", currentLanguage, { count: interiorVideoCount })}</span>
            </button>
            <button
              type="button"
              onClick={() => { setMediaTypeFilter("drone_photos"); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                mediaTypeFilter === "drone_photos"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-text hover:text-text"
              }`}
              title={tUi("admin.portfolio.gallery.filter_drone_photos_hint", currentLanguage)}
            >
              <Plane className="w-3 h-3" />
              <span>{tUi("admin.portfolio.gallery.filter_drone_photos_count", currentLanguage, { count: dronePhotoCount })}</span>
            </button>
          </div>
        </div>
        
        {/* Right: Media Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Format All Filenames Tool */}
          {images.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              disabled={isBatchRestructuring || isUploading}
              onClick={handleBatchStandardizeFilenames}
              className={`text-xs h-8.5 px-3 border-border transition-all ${
                unstructuredCount > 0 
                  ? "border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary font-medium" 
                  : "hover:border-primary hover:text-primary"
              }`}
              title={
                unstructuredCount > 0
                  ? tUi("admin.portfolio.gallery.restructure_hint_pending", currentLanguage, { count: unstructuredCount })
                  : tUi("admin.portfolio.gallery.restructure_hint_complete", currentLanguage)
              }
            >
              {isBatchRestructuring ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-primary" />
                  <span>{tUi("admin.portfolio.gallery.restructuring", currentLanguage)}</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  <span>
                    {tUi("admin.portfolio.gallery.auto_structure", currentLanguage)} {unstructuredCount > 0
                      ? tUi("admin.portfolio.gallery.new_count", currentLanguage, { count: unstructuredCount })
                      : ""}
                  </span>
                </>
              )}
            </Button>
          )}

          {missingVideoPosterCount > 0 && portfolioItemId && (
            <Button
              type="button"
              variant="secondary"
              disabled={isGeneratingVideoPosters || isUploading}
              onClick={handleGenerateMissingVideoPosters}
              className="h-8.5 border-purple-500/30 bg-purple-500/5 px-3 text-xs text-purple-600 hover:border-purple-500 hover:bg-purple-500/10 dark:text-purple-300"
              title={tUi("admin.portfolio.gallery.poster_generate_hint", currentLanguage)}
            >
              {isGeneratingVideoPosters
                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{tUi("admin.portfolio.gallery.poster_generating", currentLanguage)}</>
                : <><Film className="mr-1.5 h-3.5 w-3.5" />{tUi("admin.portfolio.gallery.missing_posters_count", currentLanguage, { count: missingVideoPosterCount })}</>}
            </Button>
          )}

          {/* Upload Photos Button */}
          <label 
            title={tUi("admin.portfolio.gallery.upload_photos_hint", currentLanguage)}
            className={`relative overflow-hidden inline-flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-background hover:opacity-90 transition-all cursor-pointer shadow-xs ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            {isUploading ? (
              <><FontAwesomeIcon icon={faSpinner} spin className="mr-1.5" /> {tUi("admin.portfolio.gallery.uploading", currentLanguage)}</>
            ) : (
              <><Upload className="w-3.5 h-3.5 mr-1.5" /> {tUi("admin.portfolio.gallery.upload_photos", currentLanguage)}</>
            )}
            <input 
              type="file" 
              multiple 
              accept="image/*"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onUpload(e.target.files);
                  e.target.value = "";
                }
              }}
            />
          </label>

          {/* Upload Video Button */}
          <label 
            title={tUi("admin.portfolio.gallery.upload_video_hint", currentLanguage)}
            className={`relative overflow-hidden inline-flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-all cursor-pointer shadow-xs ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <VideoIcon className="w-3.5 h-3.5 mr-1.5" />
            <span>{tUi("admin.portfolio.gallery.upload_video", currentLanguage)}</span>
            <input 
              ref={videoFileInputRef}
              type="file" 
              accept="video/mp4,video/webm,video/quicktime,video/ogg,video/x-m4v,video/x-matroska,video/avi"
              className="hidden"
              disabled={isUploading}
              onChange={handleVideoFileInputChange}
            />
          </label>

          {/* Embed Video Button */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsEmbedModalOpen(true)}
            className="text-xs h-8.5 px-3 border-border hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400"
          >
            <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
            <span>{tUi("admin.portfolio.gallery.embed_video", currentLanguage)}</span>
          </Button>
        </div>
      </div>

      {/* Info notice about mixed media */}
      <div className="flex items-center justify-between text-xs px-1 text-muted-text">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>
            {tUi("admin.portfolio.gallery.mixed_media_notice", currentLanguage)}
          </span>
        </div>
        <span className="font-semibold text-text">
          {tUi("admin.portfolio.gallery.total_media_count", currentLanguage, { count: images.length })}
        </span>
      </div>

      {/* Restructure Feedback Alert */}
      {restructureFeedback && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all ${
            restructureFeedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : restructureFeedback.type === "error"
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              : "bg-primary/10 text-primary border border-primary/20"
          }`}
        >
          {restructureFeedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          ) : restructureFeedback.type === "error" ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          ) : (
            <Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary" />
          )}
          <span className="font-medium flex-1">{restructureFeedback.message}</span>
          <button
            type="button"
            onClick={() => setRestructureFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 ml-2"
            aria-label={tUi("admin.portfolio.gallery.dismiss_feedback", currentLanguage)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Bulk Select and Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <button 
          type="button" 
          onClick={toggleAll} 
          className="text-muted-text hover:text-text transition-colors flex items-center gap-2 text-xs font-semibold select-none cursor-pointer"
        >
          <FontAwesomeIcon icon={selectedIds.size === currentImages.length && currentImages.length > 0 ? faCheckSquare : faSquare} className="text-sm" />
          <span>{selectedIds.size === currentImages.length && currentImages.length > 0 ? tUi("admin.portfolio.gallery.deselect_page", currentLanguage) : tUi("admin.portfolio.gallery.select_page", currentLanguage)}</span>
        </button>
        
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-primary font-bold mr-1">{tUi("admin.portfolio.gallery.selected_actions_count", currentLanguage, { count: selectedIds.size })}</span>
            
            <button
              type="button"
              onClick={() => handleBulkSetType("image")}
              className="px-2.5 py-1 rounded-lg bg-sky-600/10 text-sky-600 dark:text-sky-400 border border-sky-600/20 hover:bg-sky-600 hover:text-white transition-colors flex items-center gap-1 font-semibold"
              title={tUi("admin.portfolio.gallery.set_photo_hint", currentLanguage)}
            >
              <ImageIcon className="w-3 h-3" />
              <span>{tUi("admin.portfolio.gallery.set_photo", currentLanguage)}</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkSetType("drone_video")}
              className="px-2.5 py-1 rounded-lg bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-600/20 hover:bg-purple-600 hover:text-white transition-colors flex items-center gap-1 font-semibold"
              title={tUi("admin.portfolio.gallery.set_drone_video_hint", currentLanguage)}
            >
              <VideoIcon className="w-3 h-3" />
              <span>{tUi("admin.portfolio.gallery.set_drone_video", currentLanguage)}</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkSetType("interior_video")}
              className="px-2.5 py-1 rounded-lg bg-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-600/20 hover:bg-amber-600 hover:text-white transition-colors flex items-center gap-1 font-semibold"
              title={tUi("admin.portfolio.gallery.set_interior_video_hint", currentLanguage)}
            >
              <Film className="w-3 h-3" />
              <span>{tUi("admin.portfolio.gallery.set_interior_video", currentLanguage)}</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkSetType("drone_photo")}
              className="px-2.5 py-1 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-600/20 hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1 font-semibold"
              title={tUi("admin.portfolio.gallery.set_drone_photo_hint", currentLanguage)}
            >
              <Plane className="w-3 h-3" />
              <span>{tUi("admin.portfolio.gallery.set_drone_photo", currentLanguage)}</span>
            </button>

            <Button 
              type="button" 
              variant="danger" 
              size="sm" 
              onClick={handleBulkDelete} 
              className="h-7 text-xs ml-1"
            >
              <FontAwesomeIcon icon={faTrash} className="mr-1.5" /> {tUi("admin.submissions.bulk_delete")}</Button>
          </div>
        )}
      </div>

      {/* DnD Grid of Sortable Media Items */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={currentImages.map(i => i.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentImages.map((img, idx) => (
              <ImageSortableItem
                key={img.id}
                image={img}
                isSelected={selectedIds.has(img.id)}
                onSelect={toggleSelection}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onUploadThumbnail={onUploadThumbnail}
                projectName={projectName}
                categoryName={categoryName}
                itemIndex={idx + 1}
                portfolioItemId={portfolioItemId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
          <span className="text-xs text-muted-text">
            {tUi("admin.portfolio.gallery.pagination", currentLanguage, {
              from: (currentPage - 1) * itemsPerPage + 1,
              to: Math.min(currentPage * itemsPerPage, filteredImages.length),
              total: filteredImages.length,
            })}
          </span>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              type="button"
              className="h-8"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </Button>
            <div className="flex items-center px-3 text-xs font-semibold text-text bg-surface rounded-lg border border-border">
              {currentPage} / {totalPages}
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              type="button"
              className="h-8"
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredImages.length === 0 && (
        <div className="text-center py-14 px-6 bg-surface/50 rounded-2xl border-2 border-dashed border-border text-muted-text space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-muted-text">
            <Layers className="w-6 h-6 opacity-60" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm font-bold text-text">{tUi("admin.portfolio.gallery.no_items", currentLanguage)}</h4>
            <p className="text-xs text-muted-text">
              {images.length === 0 
                ? tUi("admin.portfolio.gallery.no_items_empty", currentLanguage)
                : tUi("admin.portfolio.gallery.no_items_filter", currentLanguage)}</p>
          </div>
          {images.length === 0 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEmbedModalOpen(true)}
                className="text-xs"
              >
                <LinkIcon className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
                {tUi("admin.portfolio.gallery.embed_video", currentLanguage)}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* External Video Embed Modal */}
      <EmbedVideoModal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
        onAddVideo={handleAddEmbeddedVideo}
        onUploadThumbnail={onUploadThumbnail}
      />
    </div>
  );
}
