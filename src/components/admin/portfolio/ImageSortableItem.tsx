import { useState, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faGripVertical, 
  faCheckCircle, 
  faTrash, 
  faEdit, 
  faSave, 
  faTimes,
  faPlay,
  faVideo,
  faImage,
  faExternalLinkAlt,
  faUpload,
  faFileArchive,
  faCheck,
  faExclamationTriangle,
  faCopy,
  faDownload,
  faWandMagicSparkles
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Label } from "../../ui/Label";
import { useApi } from "../../../hooks/useApi";
import { 
  GalleryMediaItem, 
  GalleryItemType, 
  parseVideoUrl, 
  isVideoMedia,
  validateStructuredFilename,
  buildStructuredFilename,
  formatFileSize
} from "../../../lib/mediaUtils";
import { 
  Video as VideoIcon, 
  Image as ImageIcon, 
  Play, 
  Upload, 
  X, 
  Disc, 
  Film, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Download as DownloadIcon, 
  Copy as CopyIcon, 
  Sparkles,
  ExternalLink,
  Zap,
  Plane
} from "lucide-react";

export type GalleryImage = GalleryMediaItem;

interface Props {
  image: GalleryMediaItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<GalleryMediaItem>) => void;
  onDelete: (id: string) => void;
  onUploadThumbnail?: (file: File) => Promise<string>;
  projectName?: string;
  categoryName?: string;
  itemIndex?: number;
  portfolioItemId?: string;
}

export function ImageSortableItem({ 
  image, 
  isSelected, 
  onSelect, 
  onUpdate, 
  onDelete,
  onUploadThumbnail,
  projectName,
  categoryName,
  itemIndex = 1,
  portfolioItemId
}: Props) {
  const { fetchApi } = useApi();
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewingVideo, setIsPreviewingVideo] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [isSavingAndSyncing, setIsSavingAndSyncing] = useState(false);
  const [copiedFilename, setCopiedFilename] = useState<string | null>(null);
  
  // Resolve item type (image | drone_video | interior_video | drone_photo)
  const resolvedItemType: GalleryItemType = image.item_type || (
    image.type === "video" || isVideoMedia(image) ? "drone_video" : "image"
  );
  const isVideo = resolvedItemType === "drone_video" || resolvedItemType === "interior_video" || image.type === "video" || isVideoMedia(image);
  const parsedVideo = isVideo ? parseVideoUrl(image.url) : null;
  const coverImage = image.compressed_url || image.thumbnail_url || (parsedVideo?.thumbnailUrl) || (isVideo ? "" : image.url);

  // Derive initial filename if missing
  const defaultFilename = useMemo(() => {
    if (image.filename) return image.filename;
    const ext = isVideo ? "mp4" : "jpg";
    return buildStructuredFilename({
      projectName: projectName || "project",
      categoryName: categoryName || (isVideo ? "drone" : "photos"),
      itemNumber: itemIndex,
      extension: ext
    });
  }, [image.filename, projectName, categoryName, isVideo, itemIndex]);

  const [editData, setEditData] = useState<Partial<GalleryMediaItem>>({
    title: image.title || "",
    caption: image.caption || "",
    alt: image.alt || "",
    thumbnail_url: image.thumbnail_url || "",
    url: image.url || "",
    type: isVideo ? "video" : "image",
    item_type: resolvedItemType,
    filename: image.filename || defaultFilename,
    original_filename: image.original_filename || image.filename || defaultFilename,
    compressed_filename: image.compressed_filename || "",
    compressed_url: image.compressed_url || "",
  });

  // Validation state for filename in edit mode
  const filenameValidation = useMemo(() => {
    return validateStructuredFilename(editData.filename || "");
  }, [editData.filename]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTypeChange = (newType: GalleryItemType) => {
    const isNowVideo = newType === "drone_video" || newType === "interior_video";
    const newCategory = newType === "drone_video" ? "drone" : newType === "interior_video" ? "interior" : newType === "drone_photo" ? "drone-photos" : "photos";
    const ext = isNowVideo ? "mp4" : "jpg";
    const newFilename = buildStructuredFilename({
      projectName: projectName || "project",
      categoryName: newCategory,
      itemNumber: itemIndex,
      extension: ext
    });

    onUpdate(image.id, {
      item_type: newType,
      type: isNowVideo ? "video" : "image",
      filename: image.filename ? image.filename : newFilename
    });
  };

  const handleAutoFormatFilename = () => {
    const isNowVideo = editData.item_type === "drone_video" || editData.item_type === "interior_video";
    const cat = editData.item_type === "drone_video" ? "drone" : editData.item_type === "interior_video" ? "interior" : editData.item_type === "drone_photo" ? "drone-photos" : (categoryName || "photos");
    const ext = isNowVideo ? "mp4" : "jpg";
    const formatted = buildStructuredFilename({
      projectName: projectName || "project",
      categoryName: cat,
      itemNumber: itemIndex,
      extension: ext
    });
    setEditData(prev => ({
      ...prev,
      filename: formatted
    }));
  };

  const handleSave = async () => {
    if (!filenameValidation.valid) {
      alert(`Invalid filename format: ${filenameValidation.reason || "Must follow [projectname]_[category]_[itemnumber].[ext]"}`);
      return;
    }

    const isNowVideo = editData.item_type === "drone_video" || editData.item_type === "interior_video";
    
    // Automatically derive 10MB version filename if missing for images
    let compFilename = editData.compressed_filename;
    if (!isNowVideo && editData.filename && !compFilename) {
      const match = editData.filename.match(/^([a-z0-9_]+?)_(\d{3,})(\.[a-z0-9]+)?$/i);
      if (match) {
        compFilename = `${match[1]}_10mb_${match[2]}${match[3] || ".jpg"}`;
      } else {
        compFilename = editData.filename.replace(/\.([^.]+)$/, "_10mb.$1");
      }
    }

    let updatedItem: GalleryMediaItem = {
      ...image,
      ...editData,
      type: isNowVideo ? "video" : "image",
      compressed_filename: compFilename
    };

    // If filename has changed or if item was previously unstructured, sync with storage bucket
    const originalName = image.filename || (image.url ? image.url.split("/").pop()?.split("?")[0] : "");
    const needsBucketSync = editData.filename && (editData.filename !== originalName || !image.compressed_url);

    if (needsBucketSync && editData.url && (editData.url.startsWith("http") || editData.url.startsWith("/"))) {
      try {
        setIsSavingAndSyncing(true);
        const res = await fetchApi("/api/admin/media/restructure-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item: updatedItem,
            targetFilename: editData.filename,
            sourceFilename: originalName,
            projectName: projectName || "project",
            categoryName: categoryName || "photos",
            portfolioItemId,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "The bucket filename could not be synchronized.");
        if (data.item) {
          updatedItem = {
            ...updatedItem,
            ...data.item,
          };
        }
      } catch (err: any) {
        console.error("Could not synchronize item filename in bucket and database", err);
        alert(err.message || "The filename could not be synchronized. No local metadata change was saved.");
        return;
      } finally {
        setIsSavingAndSyncing(false);
      }
    }

    onUpdate(image.id, updatedItem);
    setIsEditing(false);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFilename(text);
    setTimeout(() => setCopiedFilename(null), 2000);
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadThumbnail) return;

    try {
      setIsUploadingThumb(true);
      const url = await onUploadThumbnail(file);
      setEditData(prev => ({ ...prev, thumbnail_url: url }));
    } catch (err) {
      console.error("Failed to upload thumbnail", err);
    } finally {
      setIsUploadingThumb(false);
    }
  };

  const activeFilename = image.filename || defaultFilename;
  const active10mbFilename = image.compressed_filename || (
    !isVideo && activeFilename ? activeFilename.replace(/_(\d{3,})\./, "_10mb_$1.").replace(/\.([^.]+)$/, (m, ext) => m.includes("_10mb_") ? m : `_10mb.${ext}`) : null
  );

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative rounded-xl border ${
        isSelected 
          ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md" 
          : "border-border hover:border-primary/50"
      } bg-background overflow-hidden flex flex-col transition-all duration-200 group`}
    >
      {/* Top Left Controls */}
      <div className="absolute top-2 left-2 z-10 flex gap-1.5">
        <div
          {...attributes}
          {...listeners}
          className="w-7 h-7 rounded-lg bg-background/85 backdrop-blur-xs border border-border flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-background text-muted-text hover:text-text transition-colors shadow-xs"
          title="Drag to reorder"
        >
          <FontAwesomeIcon icon={faGripVertical} className="text-xs" />
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(image.id); }}
          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors shadow-xs ${
            isSelected 
              ? "bg-primary border-primary text-primary-foreground" 
              : "bg-background/85 backdrop-blur-xs border-border text-transparent hover:border-primary/50"
          }`}
          title="Select item"
        >
          <FontAwesomeIcon icon={faCheckCircle} className={isSelected ? "text-background text-xs" : "text-muted-text/30 text-xs"} />
        </button>
      </div>

      {/* Top Right Badges */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 items-center pointer-events-none">
        {resolvedItemType === "drone_photo" ? (
          <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
            <Plane className="w-3 h-3" />
            <span>Drone Photo (Row 4)</span>
          </span>
        ) : resolvedItemType === "drone_video" ? (
          <span className="px-2 py-0.5 rounded-md bg-purple-600/90 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
            <VideoIcon className="w-3 h-3" />
            <span>Drone Video (Row 2)</span>
          </span>
        ) : resolvedItemType === "interior_video" ? (
          <span className="px-2 py-0.5 rounded-md bg-amber-600/90 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
            <Film className="w-3 h-3" />
            <span>Interior Video (Row 3)</span>
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-sky-600/90 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
            <ImageIcon className="w-3 h-3" />
            <span>Photo (Row 1)</span>
          </span>
        )}
      </div>

      {/* Media Preview Stage */}
      <div 
        className="w-full h-44 bg-surface relative overflow-hidden flex items-center justify-center cursor-pointer"
        onClick={() => {
          if (!isEditing) {
            if (isVideo) {
              setIsPreviewingVideo(true);
            } else {
              onSelect(image.id);
            }
          }
        }}
      >
        {coverImage ? (
          <>
            <img 
              src={coverImage} 
              alt={image.alt || image.title || "Gallery media"} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              loading="lazy"
            />
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 group-hover:bg-black/20 transition-colors">
                <div className="w-10 h-10 rounded-full bg-white/90 text-purple-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>
            )}
          </>
        ) : isVideo && image.url ? (
          <div className="w-full h-full bg-black relative flex items-center justify-center">
            {parsedVideo?.type === "youtube" && parsedVideo.videoId ? (
              <img 
                src={`https://img.youtube.com/vi/${parsedVideo.videoId}/hqdefault.jpg`} 
                alt="YouTube thumbnail" 
                className="w-full h-full object-cover opacity-80" 
              />
            ) : (
              <div className="text-purple-400 flex flex-col items-center">
                <VideoIcon className="w-8 h-8 mb-1" />
                <span className="text-[11px]">Video Source</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="w-10 h-10 rounded-full bg-white/90 text-purple-700 flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-text p-4">
            <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
            <span className="text-xs">No media preview</span>
          </div>
        )}
      </div>

      {/* Structured Filename & 10MB Compressed Bar */}
      <div className="px-3 py-2 bg-surface/75 border-t border-border flex flex-col gap-1 text-[11px]">
        {/* Original Structured Filename */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
            <span className="font-mono text-[10.5px] font-semibold text-text truncate" title={activeFilename}>
              {activeFilename}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {image.file_size && (
              <span className="text-[9.5px] text-muted-text bg-background/80 px-1.5 py-0.5 rounded border border-border/60">
                {formatFileSize(image.file_size)}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleCopyText(activeFilename); }}
              className="p-1 text-muted-text hover:text-text rounded hover:bg-background transition-colors"
              title="Copy filename"
            >
              {copiedFilename === activeFilename ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              ) : (
                <CopyIcon className="w-3 h-3" />
              )}
            </button>
            {image.url && (
              <a
                href={image.url}
                target="_blank"
                rel="noreferrer"
                download={activeFilename}
                onClick={(e) => e.stopPropagation()}
                className="p-1 text-muted-text hover:text-text rounded hover:bg-background transition-colors"
                title="Download original file"
              >
                <DownloadIcon className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* 10 MB Compressed Image Version (For Photos) */}
        {!isVideo && (
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40 text-[10px]">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] shrink-0">
                10 MB Opt
              </span>
              <span className="font-mono text-[9.5px] text-muted-text truncate" title={active10mbFilename || "Auto-generated 10MB version"}>
                {active10mbFilename || "10MB version"}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {image.compressed_size ? (
                <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                  {formatFileSize(image.compressed_size)}
                </span>
              ) : null}
              {image.compressed_url ? (
                <a
                  href={image.compressed_url}
                  target="_blank"
                  rel="noreferrer"
                  download={active10mbFilename || "compressed.jpg"}
                  onClick={(e) => e.stopPropagation()}
                  className="p-0.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                  title="Download 10MB optimized version"
                >
                  <DownloadIcon className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[9px] text-muted-text italic">
                  Auto &lt;10MB
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Per-Item Media Type Selector Bar */}
      <div className="px-2.5 py-1.5 bg-surface/50 border-t border-border flex items-center justify-between gap-1 text-[10px]">
        <span className="text-muted-text font-semibold uppercase tracking-wider text-[9px] shrink-0">
          Type:
        </span>
        <div className="inline-flex rounded-lg bg-background p-0.5 border border-border flex-1 justify-between gap-0.5">
          <button
            type="button"
            onClick={() => handleTypeChange("image")}
            className={`px-1.5 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer truncate ${
              resolvedItemType === "image"
                ? "bg-sky-500 text-white shadow-xs"
                : "text-muted-text hover:text-text"
            }`}
            title="Designate as High-Resolution Photo (Row 1)"
          >
            <ImageIcon className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">Photo</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("drone_video")}
            className={`px-1.5 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer truncate ${
              resolvedItemType === "drone_video"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-muted-text hover:text-text"
            }`}
            title="Designate as Drone Aerial Video (Row 2)"
          >
            <VideoIcon className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">Drone</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("interior_video")}
            className={`px-1.5 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer truncate ${
              resolvedItemType === "interior_video"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-muted-text hover:text-text"
            }`}
            title="Designate as Interior Walkthrough Video (Row 3)"
          >
            <Film className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">Interior</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("drone_photo")}
            className={`px-1.5 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer truncate ${
              resolvedItemType === "drone_photo"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-text hover:text-text"
            }`}
            title="Designate as Drone Photo (Row 4)"
          >
            <Plane className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">Drone Photo</span>
          </button>
        </div>
      </div>

      {/* Meta Content & Actions */}
      <div className="p-3 flex-1 flex flex-col text-sm border-t border-border bg-background">
        {isEditing ? (
          <div className="space-y-2.5 flex-1 flex flex-col">
            {/* Structured Filename Input & Live Validation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[11px] font-semibold text-muted-text block">
                  Structured Filename
                </Label>
                <button
                  type="button"
                  onClick={handleAutoFormatFilename}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium"
                  title="Auto-format according to [project]_[category]_[number].[ext]"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  Auto-Format
                </button>
              </div>
              <Input 
                value={editData.filename} 
                onChange={(e) => setEditData({ ...editData, filename: e.target.value })} 
                className={`h-7 text-xs font-mono ${
                  filenameValidation.valid 
                    ? "border-emerald-500/60 focus:ring-emerald-500" 
                    : "border-rose-500 focus:ring-rose-500"
                }`}
                placeholder="project_photos_001.jpg"
              />
              {filenameValidation.valid ? (
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Pattern valid: [project]_[category]_[itemnumber]</span>
                </div>
              ) : (
                <div className="flex items-start gap-1 text-[10px] text-rose-500 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{filenameValidation.reason || "Must match [project]_[category]_[itemnumber].[ext]"}</span>
                </div>
              )}
            </div>

            {/* Media Type Selector in Edit Mode */}
            <div>
              <Label className="text-[11px] mb-1 font-semibold text-muted-text block">Media Item Type</Label>
              <select
                className="w-full px-2 py-1 text-xs border border-border bg-background rounded-lg text-text focus:ring-1 focus:ring-primary outline-none"
                value={editData.item_type || "image"}
                onChange={(e) => setEditData({ ...editData, item_type: e.target.value as GalleryItemType })}
              >
                <option value="image">📷 Photo / Image (Row 1)</option>
                <option value="drone_video">🛸 Drone Aerial Video (Row 2)</option>
                <option value="interior_video">🏠 Interior Walkthrough Video (Row 3)</option>
                <option value="drone_photo">🚁 Drone Photo (Row 4)</option>
              </select>
            </div>

            <div>
              <Label className="text-[11px] mb-1 font-semibold text-muted-text block">Title</Label>
              <Input 
                value={editData.title} 
                onChange={(e) => setEditData({ ...editData, title: e.target.value })} 
                className="h-7 text-xs"
                placeholder={isVideo ? "Video Title" : "Photo Title"}
              />
            </div>

            <div>
              <Label className="text-[11px] mb-1 font-semibold text-muted-text block">Caption</Label>
              <Input 
                value={editData.caption} 
                onChange={(e) => setEditData({ ...editData, caption: e.target.value })} 
                className="h-7 text-xs"
                placeholder="Optional description"
              />
            </div>

            {isVideo ? (
              <>
                <div>
                  <Label className="text-[11px] mb-1 font-semibold text-muted-text block">Video URL</Label>
                  <Input 
                    value={editData.url} 
                    onChange={(e) => setEditData({ ...editData, url: e.target.value })} 
                    className="h-7 text-xs font-mono"
                    placeholder="YouTube, Vimeo or MP4 URL"
                  />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 font-semibold text-muted-text block">Poster Image URL</Label>
                  <div className="flex gap-1.5">
                    <Input 
                      value={editData.thumbnail_url} 
                      onChange={(e) => setEditData({ ...editData, thumbnail_url: e.target.value })} 
                      className="h-7 text-xs font-mono flex-1"
                      placeholder="https://... cover image"
                    />
                    {onUploadThumbnail && (
                      <label className="shrink-0 px-2 h-7 border border-border bg-surface hover:bg-surface/80 rounded-md text-[11px] font-medium cursor-pointer flex items-center gap-1 transition-colors">
                        <Upload className="w-3 h-3" />
                        <span>{isUploadingThumb ? "..." : "Upload"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <Label className="text-[11px] mb-1 font-semibold text-muted-text block">Alt Text</Label>
                <Input 
                  value={editData.alt} 
                  onChange={(e) => setEditData({ ...editData, alt: e.target.value })} 
                  className="h-7 text-xs"
                  placeholder="Accessibility alt description"
                />
              </div>
            )}

            <div className="flex gap-2 mt-auto pt-2 border-t border-border">
              <Button 
                size="sm" 
                onClick={handleSave} 
                disabled={!filenameValidation.valid || isSavingAndSyncing}
                className="flex-1 h-7 text-xs"
              >
                {isSavingAndSyncing ? (
                  <span className="flex items-center justify-center gap-1">
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Syncing...</span>
                  </span>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} className="mr-1" /> Save
                  </>
                )}
              </Button>
              <Button size="sm" variant="secondary" disabled={isSavingAndSyncing} onClick={() => setIsEditing(false)} className="h-7 px-2 text-xs">
                <FontAwesomeIcon icon={faTimes} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-xs text-text line-clamp-1 mb-0.5">
                {image.title || <span className="text-muted-text italic">Untitled {isVideo ? "Video" : "Photo"}</span>}
              </div>
              <div className="text-muted-text text-[11px] line-clamp-1">
                {image.caption || (isVideo ? (parsedVideo?.type === "youtube" ? "YouTube Embed" : parsedVideo?.type === "vimeo" ? "Vimeo Embed" : "Direct Video Stream") : "High-Resolution Image")}
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-border">
              {isVideo && (
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => setIsPreviewingVideo(true)} 
                  className="h-7 px-2 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                  title="Play video preview"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </Button>
              )}
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={() => setIsEditing(true)} 
                className="flex-1 h-7 text-xs"
              >
                <FontAwesomeIcon icon={faEdit} className="mr-1 text-xs" /> Edit
              </Button>
              <Button 
                size="sm" 
                variant="danger" 
                onClick={() => onDelete(image.id)} 
                className="h-7 px-2.5 text-xs"
                title="Delete media"
              >
                <FontAwesomeIcon icon={faTrash} className="text-xs" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Video Live Playback Modal Preview */}
      {isPreviewingVideo && isVideo && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => { e.stopPropagation(); setIsPreviewingVideo(false); }}
        >
          <div 
            className="bg-background border border-border w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface/50">
              <div className="flex items-center gap-2">
                <VideoIcon className="w-4 h-4 text-purple-500" />
                <h4 className="text-sm font-bold text-text truncate max-w-md">
                  {image.title || "Video Preview"}
                </h4>
              </div>
              <button 
                type="button" 
                onClick={() => setIsPreviewingVideo(false)}
                className="p-1.5 text-muted-text hover:text-text rounded-lg hover:bg-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-video bg-black flex items-center justify-center relative">
              {parsedVideo?.type === "youtube" && parsedVideo.videoId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${parsedVideo.videoId}?autoplay=1&rel=0`}
                  title="YouTube video"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : parsedVideo?.type === "vimeo" && parsedVideo.videoId ? (
                <iframe
                  src={`https://player.vimeo.com/video/${parsedVideo.videoId}?autoplay=1`}
                  title="Vimeo video"
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={image.url}
                  poster={image.thumbnail_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {image.caption && (
              <div className="p-4 bg-surface/40 border-t border-border text-xs text-muted-text">
                {image.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
