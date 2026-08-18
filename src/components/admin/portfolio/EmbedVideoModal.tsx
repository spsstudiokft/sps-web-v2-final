import React, { useState, useEffect } from "react";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Label } from "../../ui/Label";
import { parseVideoUrl, GalleryMediaItem, GalleryItemType } from "../../../lib/mediaUtils";
import { 
  X, 
  Video as VideoIcon, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Play, 
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Film
} from "lucide-react";

interface EmbedVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVideo: (videoItem: GalleryMediaItem) => void;
  onUploadThumbnail?: (file: File) => Promise<string>;
}

export function EmbedVideoModal({
  isOpen,
  onClose,
  onAddVideo,
  onUploadThumbnail
}: EmbedVideoModalProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [itemType, setItemType] = useState<GalleryItemType>("drone_video");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [customThumbnail, setCustomThumbnail] = useState("");
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [error, setError] = useState("");

  const parsedInfo = parseVideoUrl(videoUrl);
  const detectedThumbnail = customThumbnail || parsedInfo.thumbnailUrl || "";

  useEffect(() => {
    if (isOpen) {
      setVideoUrl("");
      setItemType("drone_video");
      setTitle("");
      setCaption("");
      setCustomThumbnail("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadThumbnail) return;

    try {
      setIsUploadingThumb(true);
      setError("");
      const url = await onUploadThumbnail(file);
      setCustomThumbnail(url);
    } catch (err: any) {
      setError(err.message || "Failed to upload thumbnail image");
    } finally {
      setIsUploadingThumb(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      setError("Please enter a YouTube, Vimeo, or direct video URL.");
      return;
    }

    const info = parseVideoUrl(videoUrl);
    if (!info.embedUrl && !info.originalUrl) {
      setError("Please provide a valid video URL.");
      return;
    }

    const newItem: GalleryMediaItem = {
      id: `video-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      url: videoUrl.trim(),
      type: "video",
      item_type: itemType,
      title: title.trim() || (info.type === "youtube" ? "YouTube Video" : info.type === "vimeo" ? "Vimeo Video" : "Video Clip"),
      caption: caption.trim(),
      thumbnail_url: detectedThumbnail,
      embed_type: info.type,
      video_id: info.videoId,
    };

    onAddVideo(newItem);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-background border border-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
              <VideoIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">Embed External Video</h3>
              <p className="text-xs text-muted-text">YouTube, Vimeo, or Direct Video Streams</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-text hover:text-text hover:bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Media Type Selector */}
          <div>
            <Label className="text-xs font-semibold block mb-1.5">
              Video Category / Showcase Row Assignment *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setItemType("drone_video")}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  itemType === "drone_video"
                    ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500"
                    : "border-border hover:border-purple-500/40 bg-surface/50"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <VideoIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-text">Drone Video</div>
                  <div className="text-[11px] text-muted-text">Showcased in Row 2</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setItemType("interior_video")}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  itemType === "interior_video"
                    ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
                    : "border-border hover:border-amber-500/40 bg-surface/50"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-text">Interior Video</div>
                  <div className="text-[11px] text-muted-text">Showcased in Row 3</div>
                </div>
              </button>
            </div>
          </div>

          {/* Video URL Input */}
          <div>
            <Label htmlFor="embed-video-url" className="text-xs font-semibold">
              Video URL or Embed Link *
            </Label>
            <Input
              id="embed-video-url"
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setError("");
              }}
              autoFocus
              className="mt-1.5 text-sm"
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-text">
              <span>Supports YouTube, Vimeo, MP4, WebM URLs</span>
              {parsedInfo.type === "youtube" && (
                <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> YouTube Video Detected
                </span>
              )}
              {parsedInfo.type === "vimeo" && (
                <span className="text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Vimeo Video Detected
                </span>
              )}
            </div>
          </div>

          {/* Video Live Preview if URL is valid */}
          {videoUrl.trim() && (
            <div className="p-3 bg-surface rounded-xl border border-border space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-text block">
                Preview & Poster
              </span>

              <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative shadow-inner flex items-center justify-center">
                {parsedInfo.type === "youtube" && parsedInfo.videoId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${parsedInfo.videoId}?rel=0`}
                    title="YouTube video player"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : parsedInfo.type === "vimeo" && parsedInfo.videoId ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${parsedInfo.videoId}`}
                    title="Vimeo video player"
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : parsedInfo.type === "upload" || /\.(mp4|webm|mov|ogg)$/i.test(videoUrl) ? (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : detectedThumbnail ? (
                  <img
                    src={detectedThumbnail}
                    alt="Preview poster"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-text text-xs p-4">
                    <VideoIcon className="w-8 h-8 opacity-40 mb-1" />
                    <span>Video stream attached</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title & Caption */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="embed-video-title" className="text-xs font-semibold">
                Video Title (Optional)
              </Label>
              <Input
                id="embed-video-title"
                placeholder="e.g. 4K Cinematic Walkthrough"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="embed-video-caption" className="text-xs font-semibold">
                Caption / Description (Optional)
              </Label>
              <Input
                id="embed-video-caption"
                placeholder="e.g. Captured in 4K 60FPS with aerial drone"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          {/* Custom Poster / Thumbnail */}
          <div>
            <Label htmlFor="embed-video-poster" className="text-xs font-semibold">
              Cover Poster / Thumbnail URL (Optional)
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="embed-video-poster"
                placeholder={parsedInfo.type === "youtube" ? "Auto-detected from YouTube (or override here)" : "https://... image poster"}
                value={customThumbnail}
                onChange={(e) => setCustomThumbnail(e.target.value)}
                className="text-xs font-mono flex-1"
              />
              {onUploadThumbnail && (
                <label className="shrink-0 px-3 py-2 border border-border bg-surface hover:bg-surface/80 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingThumb ? "..." : "Upload Poster"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {detectedThumbnail && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={detectedThumbnail}
                  alt="Poster preview"
                  className="w-16 h-10 object-cover rounded border border-border bg-surface"
                />
                <span className="text-[11px] text-muted-text">Active cover poster</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Add Video to Gallery
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
