import React, { useState, useEffect, useMemo, useRef } from "react";
import { PortfolioItem, Category, PortfolioItemType } from "../../lib/types";
import { TranslatableInput } from "./TranslatableInput";
import { KeywordTagInput } from "./KeywordTagInput";
import { ImageGalleryManager } from "./portfolio/ImageGalleryManager";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { t as translateContent } from "../../lib/i18n";
import { 
  GalleryMediaItem, 
  getNormalizedGallery, 
  parseVideoUrl, 
  isVideoMedia,
  getGalleryCoverThumbnail,
  sanitizeNameForFilename,
  formatItemNumber
} from "../../lib/mediaUtils";
import { uploadMediaFile, UploadResult } from "../../lib/uploadHelper";
import { useBackgroundUploads } from "../../contexts/BackgroundUploadContext";
import { 
  X, 
  Image as ImageIcon, 
  Video as VideoIcon,
  Sparkles, 
  Link as LinkIcon, 
  AlertCircle, 
  Loader2,
  FolderKanban,
  Tag,
  Eye,
  EyeOff,
  Star,
  Upload,
  Play,
  Film,
  Layers,
  ArrowUpDown,
  FileVideo,
  FileImage,
  Compass,
  Plane
} from "lucide-react";

interface PortfolioModalProps {
  isOpen: boolean;
  item: Partial<PortfolioItem> | null;
  categories: Category[];
  siteLanguages: string;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

function parseTitleText(val: string | undefined): string {
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

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
  return (bytes / 1024).toFixed(0) + " KB";
}

// Support high-capacity 10 GB videos and 1 GB raw / ultra-res images
const MAX_IMAGE_SIZE_MB = 1024; // 1 GB
const MAX_VIDEO_SIZE_MB = 10240; // 10 GB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml", "image/tiff"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/ogg", "video/x-m4v", "video/x-matroska", "video/avi"];

export function PortfolioModal({
  isOpen,
  item,
  categories,
  siteLanguages,
  onClose,
  onSave,
}: PortfolioModalProps) {
  const { fetchApi } = useApi();
  const { token } = useAuth();
  const { enqueuePortfolioFiles, isPortfolioUploading } = useBackgroundUploads();
  const { currentLanguage, defaultLanguage, tUi } = useLanguage();
  const coverThumbInputRef = useRef<HTMLInputElement>(null);

  const getCategoryLabel = (category: Category | undefined): string => {
    if (!category) return "";
    const localizedName = translateContent(category.name, currentLanguage, defaultLanguage) || category.name || "";
    // Older seeded categories may store a UI translation key as their name.
    // Resolve that key, while normal custom category names pass through unchanged.
    return tUi(localizedName, currentLanguage) || localizedName;
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    item_type: "image" as PortfolioItemType,
    media_type: "image" as "image" | "video",
    media_url: "",
    thumbnail_url: "",
    image_urls: "[]",
    target_url: "",
    is_featured: false,
    is_published: true,
    sort_order: 0,
    keywords: "",
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [uploadProgress, setUploadProgress] = useState({
    fileName: "",
    kind: "image" as "image" | "video",
    currentFile: 1,
    totalFiles: 1,
    filePercent: 0,
    overallPercent: 0,
    loaded: 0,
    total: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeSection, setActiveSection] = useState<"details" | "media" | "seo">("details");

  // Sync form data when modal opens or item changes
  useEffect(() => {
    if (isOpen) {
      if (item) {
        let detectedItemType: PortfolioItemType = "image";
        if (item.item_type === "drone_video" || item.item_type === "interior_video" || item.item_type === "drone_photo" || item.item_type === "image") {
          detectedItemType = item.item_type as PortfolioItemType;
        } else if (item.category_slug === "drone-videos" || item.category_id === "cat-drone-videos") {
          detectedItemType = "drone_video";
        } else if (item.category_slug === "indoor-videos" || item.category_slug === "interior-videos" || item.category_id === "cat-indoor-videos") {
          detectedItemType = "interior_video";
        } else if (item.media_type === "video" || (item.media_url && /\.(mp4|webm|mov|m4v|mkv)$/i.test(item.media_url))) {
          detectedItemType = "interior_video";
        }

        const detectedMediaType: "image" | "video" = 
          (detectedItemType === "drone_video" || detectedItemType === "interior_video" || item.media_type === "video") 
            ? "video" 
            : "image";

        setFormData({
          title: item.title || "",
          description: item.description || "",
          category_id: item.category_id || "",
          item_type: detectedItemType,
          media_type: detectedMediaType,
          media_url: item.media_url || "",
          thumbnail_url: item.thumbnail_url || "",
          image_urls: item.image_urls || "[]",
          target_url: item.target_url || "",
          is_featured: item.is_featured === 1,
          is_published: item.is_published === undefined ? true : item.is_published === 1,
          sort_order: item.sort_order || 0,
          keywords: item.keywords || "",
        });
      } else {
        setFormData({
          title: "",
          description: "",
          category_id: categories.length > 0 ? categories[0].id : "",
          item_type: "image",
          media_type: "image",
          media_url: "",
          thumbnail_url: "",
          image_urls: "[]",
          target_url: "",
          is_featured: false,
          is_published: true,
          sort_order: 0,
          keywords: "",
        });
      }
      setErrorMessage("");
      setActiveSection("details");
    }
  }, [isOpen, item, categories]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Normalized gallery items
  const parsedGalleryItems: GalleryMediaItem[] = useMemo(() => {
    return getNormalizedGallery(formData.image_urls);
  }, [formData.image_urls]);

  // Media statistics
  const { videoCount, photoCount } = useMemo(() => {
    let vCount = 0;
    let pCount = 0;
    parsedGalleryItems.forEach((it) => {
      if (it.type === "video" || isVideoMedia(it)) {
        vCount++;
      } else {
        pCount++;
      }
    });
    return { videoCount: vCount, photoCount: pCount };
  }, [parsedGalleryItems]);

  if (!isOpen) return null;

  // Single file upload with real-time streaming progress support
  const uploadSingleFile = async (
    file: File, 
    expectedCategory: "image" | "video",
    options?: {
      projectName?: string;
      categoryName?: string;
      itemNumber?: number | string;
      itemType?: string;
      useStructuredName?: boolean;
    },
    onProgress?: (percent: number, loaded: number, total: number) => void
  ): Promise<UploadResult> => {
    const maxMb = expectedCategory === "video" ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error(`File "${file.name}" (${formatFileSize(file.size)}) exceeds the maximum allowed limit of ${formatFileSize(maxBytes)}.`);
    }

    if (expectedCategory === "video") {
      const isVideoType = ALLOWED_VIDEO_TYPES.includes(file.type) || /\.(mp4|webm|mov|m4v|ogg|avi|mkv)$/i.test(file.name);
      if (!isVideoType) {
        throw new Error(`Invalid video format for "${file.name}". Please upload MP4, WebM, or MOV.`);
      }
    } else {
      const isImageType = ALLOWED_IMAGE_TYPES.includes(file.type) || /\.(jpg|jpeg|png|webp|avif|gif|svg|tif|tiff)$/i.test(file.name);
      if (!isImageType) {
        throw new Error(`Invalid image format for "${file.name}". Please upload JPG, PNG, WebP, or AVIF.`);
      }
    }

    const result = await uploadMediaFile(file, {
      token,
      projectName: options?.projectName || parseTitleText(formData.title) || "project",
      categoryName: options?.categoryName || "photos",
      itemNumber: options?.itemNumber,
      itemType: options?.itemType || (expectedCategory === "video" ? "drone_video" : "image"),
      useStructuredName: options?.useStructuredName ?? true,
      onProgress: (percent, loaded, total) => {
        if (onProgress) {
          onProgress(percent, loaded, total);
        }
      }
    });

    return result;
  };

  // Multiple photo upload handler
  const handlePhotosUpload = async (files: FileList) => {
    if (item?.id) {
      setErrorMessage("");
      const fileArray = Array.from(files);
      const projectName = parseTitleText(formData.title) || "project";
      const existingPhotoCount = parsedGalleryItems.filter(i => (i.item_type || i.type) === "image").length;
      try {
        const newItems = await enqueuePortfolioFiles({
          portfolioId: String(item.id),
          portfolioName: projectName,
          files: fileArray,
          kind: "image",
          categoryName: "photos",
          itemType: "image",
          startingNumber: existingPhotoCount + 1,
        });
        setFormData((prev) => {
          const current = getNormalizedGallery(prev.image_urls);
          return {
            ...prev,
            image_urls: JSON.stringify([...current, ...newItems]),
            thumbnail_url: prev.thumbnail_url || newItems[0]?.thumbnail_url || newItems[0]?.compressed_url || newItems[0]?.url || "",
          };
        });
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to upload images.");
      }
      return;
    }

    setIsUploading(true);
    setUploadProgressText("Preparing photos for upload...");
    setErrorMessage("");
    const newItems: GalleryMediaItem[] = [];
    const fileArray = Array.from(files);
    const batchTotalBytes = fileArray.reduce((sum, file) => sum + file.size, 0);
    let completedBytes = 0;
    const projName = parseTitleText(formData.title) || "project";
    const existingPhotoCount = parsedGalleryItems.filter(i => (i.item_type || i.type) === "image").length;

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const seqNumber = existingPhotoCount + i + 1;
        setUploadProgressText(`Uploading photo ${i + 1} of ${fileArray.length}: ${file.name} (${formatFileSize(file.size)})...`);
        setUploadProgress({ fileName: file.name, kind: "image", currentFile: i + 1, totalFiles: fileArray.length, filePercent: 0, overallPercent: Math.round((completedBytes / batchTotalBytes) * 100), loaded: 0, total: file.size });
        
        const result = await uploadSingleFile(
          file, 
          "image",
          {
            projectName: projName,
            categoryName: "photos",
            itemNumber: seqNumber,
            itemType: "image",
            useStructuredName: true
          },
          (percent, loaded, total) => {
            setUploadProgressText(`Uploading photo ${i + 1} of ${fileArray.length}: ${percent}% (${formatFileSize(loaded)} / ${formatFileSize(total)})`);
            setUploadProgress({
              fileName: file.name,
              kind: "image",
              currentFile: i + 1,
              totalFiles: fileArray.length,
              filePercent: percent,
              overallPercent: Math.min(100, Math.round(((completedBytes + loaded) / batchTotalBytes) * 100)),
              loaded,
              total,
            });
          }
        );
        completedBytes += file.size;

        newItems.push({
          id: `img-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          url: result.url,
          filename: result.filename,
          compressed_url: result.compressedUrl,
          compressed_filename: result.compressedFilename,
          compressed_size: result.compressedSize,
          thumbnail_url: result.thumbnailUrl || result.compressedUrl || "",
          item_number: formatItemNumber(seqNumber),
          project_name: sanitizeNameForFilename(projName),
          category_name: "photos",
          item_type: "image",
          type: "image",
          title: file.name.replace(/\.[^/.]+$/, ""),
        });
      }

      if (newItems.length > 0) {
        const updated = [...parsedGalleryItems, ...newItems];
        setFormData((prev) => ({
          ...prev,
          image_urls: JSON.stringify(updated),
          thumbnail_url: prev.thumbnail_url || newItems[0].thumbnail_url || newItems[0].compressed_url || newItems[0].url,
        }));
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload images. Please check file formats and sizes.");
    } finally {
      setIsUploading(false);
      setUploadProgressText("");
    }
  };

  // Direct Video file upload handler (supports up to 10 GB MP4, WebM, MOV)
  const handleVideoUpload = async (file: File) => {
    if (item?.id) {
      setErrorMessage("");
      const projectName = parseTitleText(formData.title) || "project";
      const existingVideoCount = parsedGalleryItems.filter(i => isVideoMedia(i) || i.item_type?.includes("video")).length;
      try {
        const newItems = await enqueuePortfolioFiles({
          portfolioId: String(item.id),
          portfolioName: projectName,
          files: [file],
          kind: "video",
          categoryName: "drone",
          itemType: "drone_video",
          startingNumber: existingVideoCount + 1,
        });
        setFormData((prev) => ({
          ...prev,
          image_urls: JSON.stringify([...getNormalizedGallery(prev.image_urls), ...newItems]),
          media_url: prev.media_url || newItems[0]?.url || "",
          thumbnail_url: prev.thumbnail_url || newItems[0]?.thumbnail_url || "",
          media_type: "video",
        }));
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to upload video.");
      }
      return;
    }

    setIsUploading(true);
    setUploadProgressText(`Uploading video "${file.name}" (0% of ${formatFileSize(file.size)})...`);
    setUploadProgress({ fileName: file.name, kind: "video", currentFile: 1, totalFiles: 1, filePercent: 0, overallPercent: 0, loaded: 0, total: file.size });
    setErrorMessage("");
    const projName = parseTitleText(formData.title) || "project";
    const vType: PortfolioItemType = "drone_video";
    const category = vType === "interior_video" ? "interior" : "drone";
    const existingVideoCount = parsedGalleryItems.filter(i => isVideoMedia(i) || i.item_type?.includes("video")).length;
    const seqNumber = existingVideoCount + 1;

    try {
      const result = await uploadSingleFile(
        file, 
        "video",
        {
          projectName: projName,
          categoryName: category,
          itemNumber: seqNumber,
          itemType: vType,
          useStructuredName: true
        },
        (percent, loaded, total) => {
          setUploadProgressText(`Uploading video "${file.name}": ${percent}% (${formatFileSize(loaded)} of ${formatFileSize(total)})`);
          setUploadProgress({ fileName: file.name, kind: "video", currentFile: 1, totalFiles: 1, filePercent: percent, overallPercent: percent, loaded, total });
        }
      );

      const newVideoItem: GalleryMediaItem = {
        id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: result.url,
        filename: result.filename,
        thumbnail_url: result.thumbnailUrl || "",
        item_number: formatItemNumber(seqNumber),
        project_name: sanitizeNameForFilename(projName),
        category_name: category,
        item_type: vType,
        type: "video",
        title: file.name.replace(/\.[^/.]+$/, ""),
        embed_type: "upload",
      };

      const updated = [...parsedGalleryItems, newVideoItem];
      setFormData((prev) => ({
        ...prev,
        image_urls: JSON.stringify(updated),
        media_url: prev.media_url || result.url,
        thumbnail_url: prev.thumbnail_url || result.thumbnailUrl || "",
        media_type: "video",
      }));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload video.");
    } finally {
      setIsUploading(false);
      setUploadProgressText("");
    }
  };

  // Video Poster / Thumbnail upload helper
  const handleUploadThumbnailOnly = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadProgressText(`Uploading thumbnail "${file.name}"...`);
    setUploadProgress({ fileName: file.name, kind: "image", currentFile: 1, totalFiles: 1, filePercent: 0, overallPercent: 0, loaded: 0, total: file.size });
    try {
      const res = await uploadSingleFile(file, "image", undefined, (percent, loaded, total) => {
        setUploadProgressText(`Uploading thumbnail "${file.name}": ${percent}%`);
        setUploadProgress({ fileName: file.name, kind: "image", currentFile: 1, totalFiles: 1, filePercent: percent, overallPercent: percent, loaded, total });
      });
      return res.compressedUrl || res.url;
    } finally {
      setIsUploading(false);
      setUploadProgressText("");
    }
  };

  // Cover image upload handler
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgressText(`Uploading cover image "${file.name}" (${formatFileSize(file.size)})...`);
    setUploadProgress({ fileName: file.name, kind: "image", currentFile: 1, totalFiles: 1, filePercent: 0, overallPercent: 0, loaded: 0, total: file.size });
    setErrorMessage("");

    try {
      const result = await uploadSingleFile(file, "image", {
        projectName: parseTitleText(formData.title) || "project",
        categoryName: "cover",
        useStructuredName: true
      }, (percent, loaded, total) => {
        setUploadProgressText(`Uploading cover: ${percent}% (${formatFileSize(loaded)} of ${formatFileSize(total)})`);
        setUploadProgress({ fileName: file.name, kind: "image", currentFile: 1, totalFiles: 1, filePercent: percent, overallPercent: percent, loaded, total });
      });
      setFormData((prev) => ({
        ...prev,
        thumbnail_url: result.thumbnailUrl || result.compressedUrl || result.url,
      }));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload cover image.");
    } finally {
      setIsUploading(false);
      setUploadProgressText("");
      if (coverThumbInputRef.current) coverThumbInputRef.current.value = "";
    }
  };

  const handleGalleryChange = (newItems: GalleryMediaItem[]) => {
    // Check if item contains videos
    const hasVideos = newItems.some((it) => it.type === "video" || isVideoMedia(it));
    const firstVideo = newItems.find((it) => it.type === "video" || isVideoMedia(it));
    const remainingUrls = new Set(newItems.flatMap((item) => [item.url, item.compressed_url, item.thumbnail_url].filter(Boolean)));
    const firstCover = getGalleryCoverThumbnail("", "", newItems);

    setFormData((prev) => ({
      ...prev,
      image_urls: JSON.stringify(newItems),
      thumbnail_url: prev.thumbnail_url && remainingUrls.has(prev.thumbnail_url) ? prev.thumbnail_url : (firstCover || ""),
      media_url: prev.media_url && remainingUrls.has(prev.media_url) ? prev.media_url : (firstVideo ? firstVideo.url : ""),
      media_type: hasVideos ? "video" : "image",
      item_type: (newItems[0]?.item_type || newItems[0]?.type || "image") as PortfolioItemType,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const titleText = parseTitleText(formData.title);
    if (!titleText) {
      setErrorMessage("Please enter a title for the portfolio item.");
      setActiveSection("details");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const hasVideos = parsedGalleryItems.some((it) => it.type === "video" || isVideoMedia(it));
      const firstVideo = parsedGalleryItems.find((it) => it.type === "video" || isVideoMedia(it));
      const derivedItemType = (parsedGalleryItems[0]?.item_type || parsedGalleryItems[0]?.type || "image") as PortfolioItemType;
      const coverThumb = getGalleryCoverThumbnail(formData.thumbnail_url, formData.media_url, parsedGalleryItems);

      await onSave({
        ...formData,
        item_type: derivedItemType,
        media_type: hasVideos ? "video" : "image",
        media_url: formData.media_url || (firstVideo ? firstVideo.url : ""),
        thumbnail_url: coverThumb || formData.thumbnail_url,
        image_urls: parsedGalleryItems,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save portfolio item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(item && item.id);
  const activeCoverPreview = getGalleryCoverThumbnail(formData.thumbnail_url, formData.media_url, parsedGalleryItems);

  return (
    <div
      id="portfolio-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="portfolio-modal-title"
    >
      <div
        id="portfolio-modal-dialog"
        className="bg-background border border-border w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border bg-surface/50 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
              formData.item_type === "drone_video" 
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : formData.item_type === "interior_video"
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                : "bg-primary/10 text-primary"
            }`}>
              {formData.item_type === "drone_video" ? (
                <Plane className="w-5 h-5" aria-hidden="true" />
              ) : formData.item_type === "interior_video" ? (
                <Film className="w-5 h-5" aria-hidden="true" />
              ) : (
                <ImageIcon className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 id="portfolio-modal-title" className="text-lg font-bold text-text tracking-tight leading-snug">
                {isEditing ? "Edit Portfolio Item" : "Create Portfolio Item"}
              </h2>
              <p className="text-xs text-muted-text">
                Set item type (Image, Drone video, Interior video) to control public row assignment and media playback.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-muted-text hover:text-text hover:bg-surface rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-border bg-surface/30 px-6 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setActiveSection("details")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeSection === "details"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Type & Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("media")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeSection === "media"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Media Gallery</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-surface border border-border text-[10px] font-bold">
              {parsedGalleryItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("seo")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeSection === "seo"
                ? "border-primary text-primary"
                : "border-transparent text-muted-text hover:text-text"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>SEO & Tags</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error & Uploading Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start space-x-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isUploading && (
            <div className="relative overflow-hidden p-5 rounded-2xl bg-background border border-primary/30 shadow-lg shadow-primary/5 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="absolute inset-x-0 top-0 h-1 bg-primary/10">
                <div className="h-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${uploadProgress.overallPercent}%` }} />
              </div>

              <div className="flex items-start gap-4">
                <div className="relative w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {uploadProgress.kind === "video" ? <FileVideo className="w-5 h-5" /> : <FileImage className="w-5 h-5" />}
                  <span className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-background border border-primary/30 flex items-center justify-center">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-text truncate" title={uploadProgress.fileName}>
                        {uploadProgress.fileName || "Média előkészítése..."}
                      </div>
                      <div className="text-xs text-muted-text mt-0.5">
                        {uploadProgress.totalFiles > 1
                          ? `${uploadProgress.currentFile}. fájl / ${uploadProgress.totalFiles}`
                          : uploadProgress.kind === "video" ? "Videó feltöltése" : "Kép feltöltése"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl leading-none font-black tabular-nums text-primary">{uploadProgress.overallPercent}%</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-text mt-1">összesen</div>
                    </div>
                  </div>

                  <div className="mt-4 h-2.5 rounded-full bg-surface border border-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-400 to-emerald-400 transition-[width] duration-300 ease-out relative"
                      style={{ width: `${uploadProgress.filePercent}%` }}
                    >
                      <span className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-text tabular-nums">
                    <span>{uploadProgress.loaded > 0 ? formatFileSize(uploadProgress.loaded) : "0 KB"} / {uploadProgress.total > 0 ? formatFileSize(uploadProgress.total) : "—"}</span>
                    <span>Aktuális fájl: {uploadProgress.filePercent}%</span>
                  </div>
                  <span className="sr-only">{uploadProgressText || "Processing media upload..."}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Details */}
          {activeSection === "details" && (
            <div className="space-y-6">
              {/* Gallery-level organization. Media type is configured on each gallery item. */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="portfolio-category-select">Assigned Category</Label>
                    <select
                      id="portfolio-category-select"
                      className="mt-1.5 block w-full px-3.5 py-2.5 border border-border bg-background text-text rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none sm:text-sm transition-all"
                      value={formData.category_id}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, category_id: e.target.value }))
                      }
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {getCategoryLabel(c)} {c.slug ? `(${c.slug})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="portfolio-sort-order">Sort Order (Priority)</Label>
                    <div className="relative mt-1.5">
                      <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" />
                      <Input
                        id="portfolio-sort-order"
                        type="number"
                        placeholder="0"
                        value={formData.sort_order}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <TranslatableInput
                    label="Media Title *"
                    value={formData.title}
                    onChange={(val) => setFormData((prev) => ({ ...prev, title: val }))}
                    siteLanguages={siteLanguages}
                    placeholder="e.g. Sunset Coastal Estate Walkthrough, Aerial Mountain Villa"
                  />

                  <div>
                    <Label htmlFor="portfolio-target-url">External Project / Client Virtual Tour URL</Label>
                    <div className="relative mt-1.5">
                      <LinkIcon
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text"
                        aria-hidden="true"
                      />
                      <Input
                        id="portfolio-target-url"
                        placeholder="https://matterport.com/... or client showcase URL"
                        value={formData.target_url}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, target_url: e.target.value }))
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <TranslatableInput
                    label="Description / Captions"
                    value={formData.description}
                    onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
                    siteLanguages={siteLanguages}
                    isTextarea
                    placeholder="Provide details about the camera gear, resolution (4K 60FPS), lighting, location..."
                  />

                  <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-text">
                      Visibility & Highlights
                    </Label>

                    <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-surface transition-colors cursor-pointer select-none">
                      <div className="flex items-center gap-3">
                        <Star className="w-4 h-4 text-amber-500" aria-hidden="true" />
                        <div>
                          <span className="text-sm font-semibold text-text block leading-snug">
                            Featured Spotlight
                          </span>
                          <span className="text-xs text-muted-text block">
                            Highlight with golden badge in animated showcases
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.is_featured}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, is_featured: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-surface transition-colors cursor-pointer select-none">
                      <div className="flex items-center gap-3">
                        {formData.is_published ? (
                          <Eye className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-amber-500" aria-hidden="true" />
                        )}
                        <div>
                          <span className="text-sm font-semibold text-text block leading-snug">
                            {formData.is_published ? "Published & Live" : "Draft (Hidden)"}
                          </span>
                          <span className="text-xs text-muted-text block">
                            Control visibility on the public portfolio gallery
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.is_published}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, is_published: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Media Gallery (Unified Mixed Media) */}
          {activeSection === "media" && (
            <div className="space-y-6">
              <ImageGalleryManager
                images={parsedGalleryItems}
                onChange={handleGalleryChange}
                onUpload={handlePhotosUpload}
                onUploadVideo={handleVideoUpload}
                onUploadThumbnail={handleUploadThumbnailOnly}
                isUploading={isUploading || isPortfolioUploading(item?.id ? String(item.id) : undefined)}
                projectName={parseTitleText(formData.title) || "project"}
                categoryName={getCategoryLabel(categories.find(c => c.id === formData.category_id)) || "photos"}
                portfolioItemId={formData.id || item?.id}
              />

              {/* Cover / Spotlight Poster Settings */}
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <FileImage className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text">Primary Cover / Spotlight Thumbnail</h4>
                      <p className="text-xs text-muted-text">
                        Displayed in grid previews and hero cards. Defaults to the first gallery item if left blank.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div className="sm:col-span-2 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://... cover thumbnail image URL"
                        value={formData.thumbnail_url}
                        onChange={(e) => setFormData((prev) => ({ ...prev, thumbnail_url: e.target.value }))}
                        className="text-xs font-mono flex-1"
                      />
                      <label className="shrink-0 px-3 py-2 border border-border bg-background hover:bg-surface rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Cover</span>
                        <input
                          ref={coverThumbInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-[11px] text-muted-text">
                      Leave empty to automatically use the first photo or video thumbnail in the gallery above.
                    </p>
                  </div>

                  {activeCoverPreview && (
                    <div className="flex items-center gap-3 p-2 bg-background rounded-xl border border-border">
                      <img
                        src={activeCoverPreview}
                        alt="Cover Preview"
                        className="w-20 h-14 object-cover rounded-lg bg-surface border border-border"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-text block">Active Cover</span>
                        <span className="text-[11px] text-muted-text truncate block max-w-[120px]">
                          {formData.thumbnail_url ? "Custom cover" : "Auto from gallery"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Raw JSON viewer */}
              <div className="pt-2 border-t border-border">
                <details className="text-xs">
                  <summary className="text-muted-text cursor-pointer hover:text-text font-medium select-none">
                    Advanced: Raw JSON Media Structure
                  </summary>
                  <div className="mt-2.5">
                    <Input
                      placeholder='[{"url": "https://...", "type": "image"}]'
                      value={formData.image_urls}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, image_urls: e.target.value }))
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* Section: SEO & Keywords */}
          {activeSection === "seo" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-text mb-1">Search Engine Optimization</h3>
                <p className="text-xs text-muted-text mb-4">
                  Boost discoverability on search engines with targeted media keywords and tags.
                </p>
                <KeywordTagInput
                  label="Keywords & Tags"
                  description="Keywords specific to this portfolio item (e.g., real estate drone, interior 4k, architectural photography)."
                  keywords={formData.keywords || ""}
                  onChange={(val) => setFormData((prev) => ({ ...prev, keywords: val }))}
                  placeholder="Type keyword and press Enter or comma..."
                />
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-text">
                  Search Result Preview
                </h4>
                <div className="p-3 bg-background rounded-lg border border-border space-y-1">
                  <div className="text-sm font-medium text-primary hover:underline cursor-pointer truncate">
                    {parseTitleText(formData.title) || "Portfolio Item Title"} | Media Portfolio
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">
                    https://yourstudio.com/portfolio/{formData.category_id || "showcase"}
                  </div>
                  <div className="text-xs text-muted-text line-clamp-2">
                    {parseTitleText(formData.description) || "High resolution architectural photography, cinematic 4k video walkthroughs, and aerial perspectives."}
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-border bg-surface/50 flex items-center justify-between shrink-0">
          <div className="text-xs text-muted-text flex items-center gap-2">
            <span className="font-semibold text-text">
              {parsedGalleryItems.length} media attached
            </span>
            {videoCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold text-[10px]">
                {videoCount} video{videoCount === 1 ? "" : "s"}
              </span>
            )}
            {photoCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold text-[10px]">
                {photoCount} photo{photoCount === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading}
              className="min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Portfolio Item"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
