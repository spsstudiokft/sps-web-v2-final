export type GalleryMediaType = "image" | "video";
export type GalleryItemType = "image" | "drone_video" | "interior_video" | "drone_photo";
export type VideoEmbedType = "upload" | "youtube" | "vimeo" | "direct";

export interface GalleryMediaItem {
  id: string;
  url: string;
  type: GalleryMediaType;
  item_type?: GalleryItemType;
  title?: string;
  caption?: string;
  alt?: string; // for images
  thumbnail_url?: string; // poster / thumbnail for videos
  embed_type?: VideoEmbedType;
  video_id?: string;
  filename?: string; // e.g. "skyline_villa_photos_001.jpg"
  original_filename?: string; // e.g. "DSC_9021.JPG"
  file_size?: number; // In bytes
  compressed_url?: string; // e.g. "/uploads/skyline_villa_photos_10mb_001.jpg"
  compressed_filename?: string; // "skyline_villa_photos_10mb_001.jpg"
  compressed_size?: number; // In bytes (<10MB version)
  project_id?: string;
  project_name?: string;
  category_name?: string;
  item_number?: string;
}

/**
 * Sanitizes any string into a clean, lowercased slug for filenames:
 * - Lowercase
 * - Spaces and hyphens replaced with single underscore
 * - Strips special characters
 * - Trims leading/trailing underscores
 */
export function sanitizeNameForFilename(input?: string | null, fallback: string = "general"): string {
  if (!input || typeof input !== "string" || !input.trim()) {
    return fallback;
  }
  
  let clean = input.trim().toLowerCase();

  try {
    if (clean.startsWith("{") && clean.endsWith("}")) {
      const parsed = JSON.parse(clean);
      if (parsed && typeof parsed === "object") {
        clean = (parsed["en"] || Object.values(parsed)[0] || fallback).toString().toLowerCase();
      }
    }
  } catch {}

  clean = clean
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return clean || fallback;
}

/**
 * Formats a sequential number into a 3-digit padded string (001, 002, etc.)
 */
export function formatItemNumber(num?: number | string | null, defaultNum: number = 1): string {
  if (num === undefined || num === null || num === "") {
    return String(defaultNum).padStart(3, "0");
  }
  const parsed = parseInt(String(num).replace(/[^0-9]/g, ""), 10);
  if (isNaN(parsed) || parsed <= 0) {
    return String(defaultNum).padStart(3, "0");
  }
  return String(parsed).padStart(3, "0");
}

/**
 * Builds the structured filename according to specifications:
 * Original: [projectname]_[category]_[itemnumber].[ext]
 * 10MB Compressed: [projectname]_[category]_10mb_[itemnumber].[ext]
 */
export function buildStructuredFilename({
  projectName,
  categoryName,
  itemType,
  itemNumber,
  extension,
  is10MbVersion,
}: {
  projectName?: string | null;
  categoryName?: string | null;
  itemType?: string | null;
  itemNumber?: number | string | null;
  extension?: string | null;
  is10MbVersion?: boolean;
}): string {
  const project = sanitizeNameForFilename(projectName, "project");
  
  let categoryRaw = categoryName;
  if (!categoryRaw && itemType) {
    if (itemType === "drone_video") categoryRaw = "drone";
    else if (itemType === "interior_video") categoryRaw = "interior";
    else if (itemType === "drone_photo") categoryRaw = "drone-photos";
    else categoryRaw = "photos";
  }
  const category = sanitizeNameForFilename(categoryRaw, "photos");
  const num = formatItemNumber(itemNumber);
  
  let ext = extension || ".jpg";
  if (!ext.startsWith(".")) {
    ext = `.${ext}`;
  }
  ext = ext.toLowerCase();

  if (is10MbVersion) {
    return `${project}_${category}_10mb_${num}${ext}`;
  }
  return `${project}_${category}_${num}${ext}`;
}

/**
 * Validates whether a user-edited filename strictly adheres to the structured pattern:
 * Standard: [projectname]_[category]_[itemnumber].[ext]
 * 10MB Variant: [projectname]_[category]_10mb_[itemnumber].[ext]
 */
export function validateStructuredFilename(filename: string): {
  valid: boolean;
  error?: string;
  parsed?: {
    projectName: string;
    categoryName: string;
    itemNumber: string;
    is10Mb: boolean;
    extension: string;
  };
} {
  if (!filename || typeof filename !== "string" || !filename.trim()) {
    return {
      valid: false,
      error: "Filename cannot be empty.",
    };
  }

  const trimmed = filename.trim().toLowerCase();
  
  // Regex pattern matching [project]_[category]_[itemnumber].[ext] OR [project]_[category]_10mb_[itemnumber].[ext]
  const regex = /^([a-z0-9]+(?:_[a-z0-9]+)*)_([a-z0-9]+(?:_[a-z0-9]+)*)_(?:(10mb)_)?(\d{3,})(\.[a-z0-9]+)?$/i;
  const match = trimmed.match(regex);

  if (!match) {
    return {
      valid: false,
      error: "Must match pattern: [projectname]_[category]_[itemnumber].[ext] (e.g. project_photos_001.jpg)",
    };
  }

  return {
    valid: true,
    parsed: {
      projectName: match[1],
      categoryName: match[2],
      is10Mb: match[3] === "10mb",
      itemNumber: match[4],
      extension: match[5] || "",
    },
  };
}

/**
 * Formats byte sizes into human readable units
 */
export function formatBytes(bytes?: number | null): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) return "0 B";
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(0) + " KB";
  }
  return bytes + " B";
}

export interface ParsedVideoInfo {
  type: VideoEmbedType;
  videoId?: string;
  embedUrl: string;
  thumbnailUrl?: string;
  originalUrl: string;
}

/**
 * Parses any video URL (YouTube, Vimeo, direct MP4/WebM, or blob/data URL)
 * and extracts embed URL, video ID, and thumbnail.
 */
export function parseVideoUrl(inputUrl: string): ParsedVideoInfo {
  if (!inputUrl || typeof inputUrl !== "string") {
    return {
      type: "direct",
      embedUrl: "",
      originalUrl: "",
    };
  }

  const url = inputUrl.trim();

  // 1. YouTube Matchers
  // Supports:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  // - https://youtube.com/v/VIDEO_ID
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: "youtube",
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      originalUrl: url,
    };
  }

  // 2. Vimeo Matchers
  // Supports:
  // - https://vimeo.com/123456789
  // - https://player.vimeo.com/video/123456789
  const vimeoMatch = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      type: "vimeo",
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`,
      originalUrl: url,
    };
  }

  // 3. Direct video file or uploaded media
  const isDirectVideo =
    /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url) ||
    url.startsWith("data:video/") ||
    url.includes("/media/upload") ||
    url.includes("r2.") ||
    url.includes("appwrite");

  return {
    type: isDirectVideo ? "upload" : "direct",
    embedUrl: url,
    originalUrl: url,
  };
}

/**
 * Returns an optimized 360p low-latency preview URL for video media
 * to avoid dropped frames and minimize memory/bandwidth usage during animation.
 */
export function getOptimized360pVideoUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  
  // Cloudinary optimization for 360p
  if (url.includes("cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/w_640,h_360,c_limit,q_auto:low,vc_auto/");
  }

  // ImageKit optimization for 360p
  if (url.includes("ik.imagekit.io")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}tr=w-640,h-360,q-60`;
  }

  return url;
}

/**
 * Checks if a URL or object is a video
 */
export function isVideoMedia(item: any): boolean {
  if (!item) return false;
  if (typeof item === "string") {
    const info = parseVideoUrl(item);
    return (
      info.type === "youtube" ||
      info.type === "vimeo" ||
      /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(item) ||
      item.startsWith("data:video/")
    );
  }
  if (item.type === "video") return true;
  if (item.type === "image") return false;
  if (item.embed_type && item.embed_type !== "image") return true;
  if (item.url) {
    return isVideoMedia(item.url);
  }
  return false;
}

/**
 * Normalizes any raw image/video item into a robust GalleryMediaItem.
 */
export function normalizeGalleryMediaItem(raw: any, index: number = 0): GalleryMediaItem {
  if (!raw) {
    return {
      id: `media-${Date.now()}-${index}`,
      url: "",
      type: "image",
    };
  }

  // If item is string URL
  if (typeof raw === "string") {
    const isVideo = isVideoMedia(raw);
    const itemNum = formatItemNumber(index + 1);
    const filename = raw.split("/").pop() || "";
    if (isVideo) {
      const parsed = parseVideoUrl(raw);
      const isDrone = /drone|aerial|flyover|dji/i.test(raw);
      return {
        id: `video-${Date.now()}-${index}`,
        url: raw,
        type: "video",
        item_type: isDrone ? "drone_video" : "interior_video",
        embed_type: parsed.type,
        video_id: parsed.videoId,
        thumbnail_url: parsed.thumbnailUrl || "",
        title: "",
        filename: filename || undefined,
        item_number: itemNum,
      };
    }
    return {
      id: `img-${Date.now()}-${index}`,
      url: raw,
      type: "image",
      item_type: "image",
      title: "",
      filename: filename || undefined,
      item_number: itemNum,
    };
  }

  // If item is object
  const url = raw.url || raw.media_url || "";
  const isVideo = raw.type === "video" || (!raw.type && isVideoMedia(url));
  const parsedVideo = isVideo ? parseVideoUrl(url) : null;

  // Deduce item_type if not explicitly set
  let resolvedItemType: GalleryItemType = raw.item_type;
  if (!resolvedItemType) {
    if (isVideo) {
      const textToTest = `${raw.title || ""} ${raw.caption || ""} ${url}`.toLowerCase();
      if (textToTest.includes("drone") || textToTest.includes("aerial") || textToTest.includes("flyover") || textToTest.includes("dji")) {
        resolvedItemType = "drone_video";
      } else {
        resolvedItemType = "interior_video";
      }
    } else {
      resolvedItemType = "image";
    }
  }

  const fallbackFilename = url.split("/").pop()?.split("?")[0] || "";

  return {
    id: raw.id || `${isVideo ? "video" : "img"}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    url,
    type: isVideo ? "video" : "image",
    item_type: resolvedItemType,
    title: raw.title || "",
    caption: raw.caption || "",
    alt: raw.alt || "",
    thumbnail_url:
      raw.thumbnail_url ||
      (parsedVideo?.type === "youtube" ? parsedVideo.thumbnailUrl : "") ||
      "",
    embed_type: raw.embed_type || (parsedVideo ? parsedVideo.type : undefined),
    video_id: raw.video_id || (parsedVideo ? parsedVideo.videoId : undefined),
    filename: raw.filename || fallbackFilename || undefined,
    original_filename: raw.original_filename || undefined,
    file_size: raw.file_size ? Number(raw.file_size) : undefined,
    compressed_url: raw.compressed_url || undefined,
    compressed_filename: raw.compressed_filename || undefined,
    compressed_size: raw.compressed_size ? Number(raw.compressed_size) : undefined,
    project_id: raw.project_id || undefined,
    project_name: raw.project_name || undefined,
    category_name: raw.category_name || undefined,
    item_number: raw.item_number || formatItemNumber(index + 1),
  };
}

/**
 * Parses image_urls / media_gallery JSON string or array into normalized GalleryMediaItem array.
 */
export function getNormalizedGallery(jsonStrOrArray: any): GalleryMediaItem[] {
  if (!jsonStrOrArray) return [];
  let parsed: any[] = [];
  if (typeof jsonStrOrArray === "string") {
    try {
      parsed = JSON.parse(jsonStrOrArray);
    } catch {
      // If single string URL
      if (jsonStrOrArray.trim().startsWith("http") || jsonStrOrArray.trim().startsWith("data:")) {
        parsed = [jsonStrOrArray.trim()];
      } else {
        parsed = [];
      }
    }
  } else if (Array.isArray(jsonStrOrArray)) {
    parsed = jsonStrOrArray;
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.map((item, index) => normalizeGalleryMediaItem(item, index));
}

/** Returns the lightweight display asset while keeping `url` as the original download source. */
export function getOptimizedMediaUrl(item: GalleryMediaItem | null | undefined): string {
  if (!item) return "";
  if (item.type === "video" || isVideoMedia(item)) {
    return item.thumbnail_url || "";
  }
  return item.compressed_url || item.thumbnail_url || item.url || "";
}

/**
 * Returns the primary cover thumbnail for a portfolio item or gallery.
 */
export function getGalleryCoverThumbnail(
  thumbnailUrl: string | null | undefined,
  mediaUrl: string | null | undefined,
  galleryItems: GalleryMediaItem[]
): string | null {
  if (galleryItems && galleryItems.length > 0) {
    const first = galleryItems[0];
    if (first.type === "image" && first.compressed_url?.trim()) {
      return first.compressed_url.trim();
    }
    if (first.thumbnail_url && first.thumbnail_url.trim()) {
      return first.thumbnail_url.trim();
    }
    if (first.type === "image" && first.url) {
      return first.url;
    }
    if (first.type === "video") {
      const parsed = parseVideoUrl(first.url);
      if (parsed.thumbnailUrl) return parsed.thumbnailUrl;
    }
  }

  if (thumbnailUrl && thumbnailUrl.trim()) return thumbnailUrl.trim();

  if (mediaUrl) {
    const parsed = parseVideoUrl(mediaUrl);
    if (parsed.thumbnailUrl) return parsed.thumbnailUrl;
    if (!isVideoMedia(mediaUrl)) return mediaUrl;
  }

  return null;
}

/**
 * Format bytes into human readable format (e.g. "8.4 MB", "1.2 GB")
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  return `${size} ${units[i] || "B"}`;
}
