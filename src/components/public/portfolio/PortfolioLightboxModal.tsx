import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { PortfolioItem } from "../../../lib/types";
import { useLanguage } from "../../../contexts/LanguageContext";
import { t } from "../../../lib/i18n";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  ExternalLink, 
  Camera, 
  Video as VideoIcon, 
  Star,
  Send,
  Sparkles,
  Layers,
  Film,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  LoaderCircle
} from "lucide-react";
import { 
  GalleryMediaItem, 
  getNormalizedGallery, 
  parseVideoUrl, 
  isVideoMedia,
  getGalleryCoverThumbnail 
} from "../../../lib/mediaUtils";
import { getResponsiveImageAttributes } from "../../../lib/responsiveImage";

interface PortfolioLightboxModalProps {
  item: PortfolioItem | null;
  initialIndex?: number;
  onClose: () => void;
  useVercelImageOptimization?: boolean;
}

function formatVideoTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function CustomVideoPlayer({ src, poster, title }: { src: string; poster?: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try { await video.play(); } catch {}
    } else {
      video.pause();
    }
  };

  const toggleFullscreen = async () => {
    const target = containerRef.current;
    if (!target) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await target.requestFullscreen();
  };

  return (
    <div ref={containerRef} className="group/video relative aspect-video w-full max-w-4xl overflow-hidden rounded-xl bg-black shadow-2xl">
      <video
        ref={videoRef}
        key={src}
        src={src}
        poster={poster}
        autoPlay
        playsInline
        preload="metadata"
        onClick={togglePlayback}
        onContextMenu={(event) => event.preventDefault()}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onVolumeChange={(event) => {
          setVolume(event.currentTarget.volume);
          setMuted(event.currentTarget.muted);
        }}
        className="h-full w-full cursor-pointer object-contain"
        aria-label={title}
      />

      {!playing && (
        <button type="button" onClick={togglePlayback} aria-label="Play video" className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white shadow-2xl backdrop-blur-md transition-transform hover:scale-105">
          <Play className="ml-1 h-7 w-7 fill-current" />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-3 pb-3 pt-10 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/video:opacity-100 sm:group-focus-within/video:opacity-100">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (videoRef.current) videoRef.current.currentTime = next;
            setCurrentTime(next);
          }}
          aria-label="Video position"
          className="h-1.5 w-full cursor-pointer accent-cyan-400"
        />
        <div className="mt-2 flex items-center gap-2 text-white">
          <button type="button" onClick={togglePlayback} aria-label={playing ? "Pause video" : "Play video"} className="rounded-lg p-2 hover:bg-white/15">
            {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
          </button>
          <button
            type="button"
            onClick={() => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; }}
            aria-label={muted ? "Unmute video" : "Mute video"}
            className="rounded-lg p-2 hover:bg-white/15"
          >
            {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (videoRef.current) { videoRef.current.volume = next; videoRef.current.muted = next === 0; }
            }}
            aria-label="Volume"
            className="hidden h-1 w-20 cursor-pointer accent-cyan-400 sm:block"
          />
          <span className="min-w-0 flex-1 text-xs font-semibold tabular-nums">{formatVideoTime(currentTime)} / {formatVideoTime(duration)}</span>
          <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen" className="rounded-lg p-2 hover:bg-white/15">
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function PortfolioLightboxModal({ item, initialIndex = 0, onClose, useVercelImageOptimization = true }: PortfolioLightboxModalProps) {
  const { currentLang, defaultLang, tUi } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [fullImageLoaded, setFullImageLoaded] = useState(false);
  const [isPreparingProtectedDownload, setIsPreparingProtectedDownload] = useState(false);

  // Normalize all gallery media items
  const mediaItems: GalleryMediaItem[] = useMemo(() => {
    if (!item) return [];
    const parsed = getNormalizedGallery(item.image_urls);
    if (parsed.length > 0) return parsed;

    // Fallback if gallery array is empty
    if (item.media_url) {
      return [
        {
          id: "primary-media",
          url: item.media_url,
          type: item.media_type === "video" || isVideoMedia(item.media_url) ? "video" : "image",
          thumbnail_url: item.thumbnail_url || "",
          title: item.title,
        },
      ];
    }

    if (item.thumbnail_url) {
      return [
        {
          id: "primary-thumb",
          url: item.thumbnail_url,
          type: "image",
          title: item.title,
        },
      ];
    }

    return [];
  }, [item]);

  // Synchronize index when item or initialIndex changes
  useEffect(() => {
    if (typeof initialIndex === "number" && initialIndex >= 0) {
      setCurrentIndex(initialIndex);
    } else {
      setCurrentIndex(0);
    }
  }, [item, initialIndex]);

  useEffect(() => {
    setFullImageLoaded(false);
  }, [item, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (mediaItems.length > 1) {
        if (e.key === "ArrowLeft") {
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
        } else if (e.key === "ArrowRight") {
          setCurrentIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, mediaItems.length, onClose]);

  useEffect(() => {
    if (!item) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [item]);

  if (!item) return null;

  const currentMedia: GalleryMediaItem | undefined = mediaItems[currentIndex];
  const isCurrentVideo = currentMedia ? (currentMedia.type === "video" || isVideoMedia(currentMedia)) : false;
  const currentVideoParsed = (isCurrentVideo && currentMedia) ? parseVideoUrl(currentMedia.url) : null;
  const currentImageSource = !isCurrentVideo && currentMedia
    ? (currentMedia.compressed_url || currentMedia.thumbnail_url || currentMedia.url)
    : "";
  const blurredPreviewSource = !isCurrentVideo && currentMedia
    ? (currentMedia.thumbnail_url || item.thumbnail_url || currentImageSource)
    : "";
  const responsiveCurrentImage = getResponsiveImageAttributes(
    currentImageSource,
    [480, 768, 1024, 1440, 1920],
    "(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc(100vw - 80px), 960px",
    88,
    useVercelImageOptimization,
  );

  const title = t(item.title, currentLang, defaultLang) || item.title;
  const description = t(item.description, currentLang, defaultLang) || item.description;
  const categoryName = item.category_name ? t(item.category_name, currentLang, defaultLang) : "";

  // Count photos vs videos in gallery
  const { videoCount, photoCount } = mediaItems.reduce(
    (acc, m) => {
      if (m.type === "video" || isVideoMedia(m)) {
        acc.videoCount++;
      } else {
        acc.photoCount++;
      }
      return acc;
    },
    { videoCount: 0, photoCount: 0 }
  );

  const handleInquireClick = () => {
    onClose();
    const contactElem = document.getElementById("contact");
    if (contactElem) {
      contactElem.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleProtectedImageDownload = async (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    if (!item.slug || !currentMedia || isCurrentVideo || isPreparingProtectedDownload) return;

    setIsPreparingProtectedDownload(true);
    try {
      const response = await fetch(
        `/api/public/portfolio/${encodeURIComponent(item.slug)}/media/${currentIndex}/watermarked`,
      );
      if (!response.ok) throw new Error(`Protected download failed (${response.status})`);

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const dispositionFilename = disposition.match(/filename="([^"]+)"/i)?.[1];
      const filename = dispositionFilename || `${item.slug}-${currentIndex + 1}-watermarked.jpg`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (error) {
      console.error("Failed to download watermarked portfolio image:", error);
    } finally {
      setIsPreparingProtectedDownload(false);
    }
  };

  return createPortal((
    <div
      id="portfolio-lightbox-backdrop"
      className="fixed inset-0 z-[9999] grid h-[100dvh] w-screen place-items-center overflow-hidden bg-slate-950/75 p-2 backdrop-blur-2xl sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      <div
        id="portfolio-lightbox-dialog"
        className="relative m-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-background text-text shadow-[0_32px_120px_rgba(0,0,0,0.75)] sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-3xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${
              isCurrentVideo 
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" 
                : "bg-primary/10 text-primary"
            }`}>
              {isCurrentVideo ? <VideoIcon className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-text line-clamp-1">
                  {title}
                </h3>
                {item.is_featured === 1 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                    <Star className="w-3 h-3 fill-current" />
                    <span>Featured</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-text">
                {categoryName && <span>{categoryName}</span>}
                {categoryName && <span>•</span>}
                {videoCount > 0 && photoCount > 0 ? (
                  <span>Mixed Gallery ({photoCount} photo{photoCount === 1 ? "" : "s"}, {videoCount} video{videoCount === 1 ? "" : "s"})</span>
                ) : videoCount > 0 ? (
                  <span>{videoCount} Video{videoCount === 1 ? "" : "s"} (4K & Streams)</span>
                ) : (
                  <span>{photoCount} High-Res Photo{photoCount === 1 ? "" : "s"}</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-text hover:text-text hover:bg-surface rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Viewing Stage */}
        <div
          onContextMenu={isCurrentVideo ? (event) => event.preventDefault() : handleProtectedImageDownload}
          className="relative bg-black flex-1 min-h-[300px] sm:min-h-[440px] max-h-[60vh] flex items-center justify-center overflow-hidden select-none"
        >
          {mediaItems.length > 0 && currentMedia ? (
            <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
              {isCurrentVideo ? (
                /* Video Player (YouTube, Vimeo, or HTML5 direct video) */
                <div className="w-full h-full flex items-center justify-center max-h-[56vh]">
                  {currentVideoParsed?.type === "youtube" && currentVideoParsed.videoId ? (
                    <div className="aspect-video w-full max-w-4xl h-full max-h-[56vh] rounded-xl overflow-hidden shadow-2xl bg-black">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${currentVideoParsed.videoId}?autoplay=1&rel=0`}
                        title={currentMedia.title || "YouTube video player"}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : currentVideoParsed?.type === "vimeo" && currentVideoParsed.videoId ? (
                    <div className="aspect-video w-full max-w-4xl h-full max-h-[56vh] rounded-xl overflow-hidden shadow-2xl bg-black">
                      <iframe
                        src={`https://player.vimeo.com/video/${currentVideoParsed.videoId}?autoplay=1`}
                        title={currentMedia.title || "Vimeo video player"}
                        className="w-full h-full border-0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <CustomVideoPlayer
                      src={currentMedia.url}
                      poster={currentMedia.thumbnail_url}
                      title={currentMedia.title || title}
                    />
                  )}
                </div>
              ) : (
                /* Photo Slide */
                <div className="relative w-full h-full max-h-[56vh] flex items-center justify-center overflow-hidden rounded-xl">
                  {blurredPreviewSource && !fullImageLoaded && (
                    <img
                      src={blurredPreviewSource}
                      alt=""
                      aria-hidden="true"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-contain scale-[1.03] blur-xl opacity-75"
                    />
                  )}
                  <img
                    key={currentMedia.compressed_url || currentMedia.url}
                    src={responsiveCurrentImage.src}
                    srcSet={responsiveCurrentImage.srcSet}
                    sizes={responsiveCurrentImage.sizes}
                    alt={currentMedia.alt || currentMedia.title || title}
                    decoding="async"
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                    onLoad={() => setFullImageLoaded(true)}
                    onError={(event) => {
                      const image = event.currentTarget;
                      if (currentImageSource && image.dataset.originalFallback !== "true") {
                        image.dataset.originalFallback = "true";
                        image.removeAttribute("srcset");
                        image.removeAttribute("sizes");
                        image.src = currentImageSource;
                      }
                    }}
                    className={`relative z-10 max-h-[56vh] w-auto max-w-full rounded-xl shadow-2xl object-contain transition-[opacity,filter,transform] duration-500 ease-out ${
                      fullImageLoaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-sm scale-[0.995]"
                    }`}
                  />
                </div>
              )}

              {isPreparingProtectedDownload && (
                <div className="pointer-events-none absolute inset-x-4 top-4 z-30 flex justify-center" role="status">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/80 px-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md">
                    <LoaderCircle className="h-4 w-4 animate-spin text-cyan-400" />
                    {tUi("portfolio.page.preparing_watermarked_download")}
                  </span>
                </div>
              )}

              {/* Navigation Left / Right Buttons */}
              {mediaItems.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1))}
                    className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-primary text-white hover:text-background flex items-center justify-center transition-all backdrop-blur-xs shadow-xl z-20 cursor-pointer"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0))}
                    className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-primary text-white hover:text-background flex items-center justify-center transition-all backdrop-blur-xs shadow-xl z-20 cursor-pointer"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>

                  {/* Counter Pill & Slide Type Badge */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-semibold tracking-wider flex items-center gap-2 shadow-lg z-20">
                    {isCurrentVideo ? (
                      <span className="text-purple-400 flex items-center gap-1">
                        <VideoIcon className="w-3 h-3" />
                        <span>Video</span>
                      </span>
                    ) : (
                      <span className="text-sky-400 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>Photo</span>
                      </span>
                    )}
                    <span className="text-white/40">|</span>
                    <span>{currentIndex + 1} / {mediaItems.length}</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-muted-text text-sm">No media available</div>
          )}
        </div>

        {/* Thumbnail Carousel Strip (Mixed Photos & Videos) */}
        {mediaItems.length > 1 && (
          <div className="px-6 py-3 bg-surface/30 border-t border-border overflow-x-auto flex items-center gap-2.5">
            {mediaItems.map((media, idx) => {
              const isVid = media.type === "video" || isVideoMedia(media);
              const vidInfo = isVid ? parseVideoUrl(media.url) : null;
              const thumb = media.compressed_url || media.thumbnail_url || (vidInfo?.thumbnailUrl) || (isVid ? "" : media.url);
              const responsiveThumb = getResponsiveImageAttributes(thumb, [96, 128, 192], "64px", 76, useVercelImageOptimization);

              return (
                <button
                  key={media.id || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer bg-black/30 ${
                    currentIndex === idx
                      ? "border-primary scale-105 shadow-md ring-2 ring-primary/30"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`Jump to slide ${idx + 1}`}
                >
                  {thumb ? (
                    <img
                      src={responsiveThumb.src}
                      srcSet={responsiveThumb.srcSet}
                      sizes={responsiveThumb.sizes}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        const image = event.currentTarget;
                        if (thumb && image.dataset.originalFallback !== "true") {
                          image.dataset.originalFallback = "true";
                          image.removeAttribute("srcset");
                          image.removeAttribute("sizes");
                          image.src = thumb;
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface text-muted-text">
                      {isVid ? <VideoIcon className="w-4 h-4 text-purple-400" /> : <Camera className="w-4 h-4" />}
                    </div>
                  )}

                  {isVid && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-xs">
                        <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Info & Actions Footer */}
        <div className="p-6 bg-surface/40 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
          <div className="flex-1 space-y-1">
            {/* Slide title / caption if available */}
            {currentMedia?.title && currentMedia.title !== title && (
              <h4 className="text-xs font-bold text-text mb-0.5">
                {currentMedia.title}
              </h4>
            )}
            
            {currentMedia?.caption ? (
              <p className="text-xs text-muted-text line-clamp-2 leading-relaxed">
                {currentMedia.caption}
              </p>
            ) : description ? (
              <p className="text-xs sm:text-sm text-muted-text line-clamp-2 leading-relaxed">
                {description}
              </p>
            ) : (
              <p className="text-xs text-muted-text">
                Professional architectural and real estate visual capture delivered in ultra-crisp resolution.
              </p>
            )}

            {item.keywords && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.keywords.split(",").slice(0, 5).map((kw, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-surface border border-border text-muted-text font-medium">
                    #{kw.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
            {item.slug && (
              <Link
                to={`/portfolio/${item.slug}`}
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{tUi("portfolio.page.open_full_gallery")}</span>
              </Link>
            )}
            {item.target_url && (
              <a
                href={item.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-surface text-text text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-primary" />
                <span>Virtual Tour</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleInquireClick}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-primary text-background text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Book / Inquire</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}
