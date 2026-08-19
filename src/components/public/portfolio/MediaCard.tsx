import React, { useState, useRef, useEffect, useId } from "react";
import { PortfolioItem } from "../../../lib/types";
import { useLanguage } from "../../../contexts/LanguageContext";
import { t, tUi } from "../../../lib/i18n";
import { 
  Play, 
  Camera, 
  Video as VideoIcon, 
  Star, 
  ExternalLink, 
  Eye, 
  Film,
  Plane,
  Images,
  Gauge
} from "lucide-react";
import { 
  GalleryMediaItem, 
  parseVideoUrl, 
  isVideoMedia,
  getOptimized360pVideoUrl 
} from "../../../lib/mediaUtils";
import { globalVideoStreamManager } from "../../../lib/videoManager";
import { getResponsiveImageAttributes } from "../../../lib/responsiveImage";

export interface ShowcaseMediaCardItem {
  id: string;
  item: PortfolioItem;
  media: GalleryMediaItem;
  mediaIndex: number;
  totalInGallery: number;
  itemType: "image" | "drone_video" | "interior_video" | "drone_photo";
}

interface MediaCardProps {
  card: ShowcaseMediaCardItem;
  onClick: (item: PortfolioItem, mediaIndex: number) => void;
  priority?: boolean;
  deferMedia?: boolean;
}

export function MediaCard({ card, onClick, priority = false, deferMedia = false }: MediaCardProps) {
  const instanceId = useId();
  const { currentLang, defaultLang } = useLanguage();
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInViewport, setIsInViewport] = useState(priority);
  const [isHovered, setIsHovered] = useState(false);
  const [canPlayStream, setCanPlayStream] = useState(priority);
  
  const cardRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Stable per-card preview position between 18% and 78% of the video.
  // A deterministic value avoids the poster jumping whenever React re-renders.
  const previewRatioRef = useRef<number>(
    0.18 + (Array.from(card.id).reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7) % 61) / 100
  );

  const { item, media, mediaIndex, totalInGallery, itemType } = card;

  const isVideoCard = 
    itemType === "drone_video" || 
    itemType === "interior_video" || 
    media.type === "video" || 
    isVideoMedia(media) ||
    isVideoMedia(media.url);

  const rawVideoUrl = isVideoCard ? (media.url || item.media_url || "") : "";
  const parsedVideo = isVideoCard ? parseVideoUrl(rawVideoUrl) : null;
  const isDirectVideo = isVideoCard && (parsedVideo?.type === "upload" || parsedVideo?.type === "direct");
  
  // Downscale video stream to 360p for low-latency preview without dropping frames
  const optimizedVideoUrl = isDirectVideo ? getOptimized360pVideoUrl(rawVideoUrl) : rawVideoUrl;
  const directVideoSrcWithKeyframe = optimizedVideoUrl ? (optimizedVideoUrl.includes("#t=") ? optimizedVideoUrl : `${optimizedVideoUrl}#t=0.001`) : "";

  // 1. Register with Global Video Playback Scheduler to enforce GPU concurrency budget (Max 5 active streams)
  useEffect(() => {
    if (!isVideoCard) return;

    const unregister = globalVideoStreamManager.register(
      instanceId,
      (allowedToPlay) => {
        setCanPlayStream(allowedToPlay);
      },
      { isInViewport: priority, priority }
    );

    return () => unregister();
  }, [instanceId, isVideoCard, priority]);

  // 2. Viewport Intersection Observer: Detect entry & track visibility ratio
  useEffect(() => {
    if (!cardRef.current || typeof IntersectionObserver === "undefined") {
      setIsInViewport(true);
      if (isVideoCard) {
        globalVideoStreamManager.updateState(instanceId, { isInViewport: true, visibilityRatio: 1 });
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const isVisible = entry.isIntersecting;
        const ratio = entry.intersectionRatio;
        
        setIsInViewport(isVisible);
        
        if (isVideoCard) {
          globalVideoStreamManager.updateState(instanceId, {
            isInViewport: isVisible,
            visibilityRatio: ratio,
          });
        }
      },
      {
        rootMargin: deferMedia ? "40px 60px" : "250px 100px",
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [deferMedia, instanceId, isVideoCard]);

  // 3. Update hover state in Video Stream Manager for instant top-priority playback
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (isVideoCard) {
      globalVideoStreamManager.updateState(instanceId, { isHovered: true });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (isVideoCard) {
      globalVideoStreamManager.updateState(instanceId, { isHovered: false });
    }
  };

  const seekToPreviewFrame = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const target = Math.min(Math.max(video.duration * previewRatioRef.current, 0.05), Math.max(0.05, video.duration - 0.1));
    if (Math.abs(video.currentTime - target) > 0.1) {
      video.currentTime = target;
    }
  };

  // 4. Playback is hover-only. The global scheduler still caps simultaneous
  // decoders when users hover overlapping cards during marquee movement.
  useEffect(() => {
    if (!isDirectVideo || !videoRef.current) return;

    if (canPlayStream && isInViewport && isHovered) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Handled silently for browser autoplay restrictions
        });
      }
    } else {
      videoRef.current.pause();
      if (!isHovered) seekToPreviewFrame();
    }
  }, [canPlayStream, isInViewport, isHovered, isDirectVideo]);

  // For image items derive image preview. For video items, use dedicated 360p video poster (never project cover art).
  const youtubePreviewIndex = (Array.from(card.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3) + 1;
  const previewImageUrl = !isVideoCard
    ? (media.thumbnail_url || item.thumbnail_url || media.compressed_url || media.url || "")
    : (media.thumbnail_url || (parsedVideo?.type === "youtube" ? `https://img.youtube.com/vi/${parsedVideo.videoId}/${youtubePreviewIndex}.jpg` : ""));
  const shouldLoadMedia = priority || isInViewport;
  const hasStoredCardPreview = Boolean(
    media.thumbnail_url && media.thumbnail_url !== media.compressed_url,
  );
  const responsivePreview = hasStoredCardPreview
    ? {
        src: previewImageUrl,
        srcSet: undefined,
        sizes: "(max-width: 639px) 310px, (max-width: 767px) 380px, 420px",
      }
    : getResponsiveImageAttributes(
        previewImageUrl,
        deferMedia ? [640] : [480, 640, 840],
        "(max-width: 639px) 310px, (max-width: 767px) 380px, 420px",
        82,
      );
  const handleResponsiveImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (previewImageUrl && image.dataset.originalFallback !== "true") {
      image.dataset.originalFallback = "true";
      image.removeAttribute("srcset");
      image.removeAttribute("sizes");
      image.src = previewImageUrl;
      return;
    }
    setHasError(true);
  };

  const projectTitle = t(item.title, currentLang, defaultLang) || item.title;
  // The public portfolio cards identify the project, not the uploaded file.
  // Media titles often contain filenames and remain available in the admin
  // editor without leaking into the homepage showcase.
  const displayTitle = projectTitle;
  const displaySubtitle = item.category_name ? t(item.category_name, currentLang, defaultLang) : "";
  
  const rawCaption = media.caption || item.description || "";
  const caption = t(rawCaption, currentLang, defaultLang) || rawCaption;

  return (
    <div
      ref={cardRef}
      onClick={() => onClick(item, mediaIndex)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative flex-shrink-0 w-[310px] sm:w-[380px] md:w-[420px] h-52 sm:h-64 rounded-2xl overflow-hidden bg-black/95 border border-white/10 shadow-lg hover:shadow-2xl hover:border-primary/60 hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.9),0_0_25px_rgba(245,158,11,0.2)] transition-all duration-400 cursor-pointer select-none mx-2.5 transform-gpu"
      style={{
        transform: "translate3d(0, 0, 0)",
        contain: "content",
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(item, mediaIndex);
        }
      }}
      aria-label={tUi("portfolio.view_media_from_project", { title: displayTitle, project: projectTitle }, currentLang, defaultLang)}
    >
      {/* Media Rendering Layer */}
      {isVideoCard ? (
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-zinc-950">
          {/* 1. Direct HTML5 Low-Latency 360p Video Preview */}
          {isDirectVideo && directVideoSrcWithKeyframe ? (
            isInViewport ? (
              <video
                ref={videoRef}
                src={directVideoSrcWithKeyframe}
                poster={previewImageUrl || undefined}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none ${
                  isVideoReady ? "opacity-100" : "opacity-90"
                }`}
                autoPlay={false}
                muted
                loop
                playsInline
                preload={isHovered ? "auto" : "metadata"}
                disablePictureInPicture
                // @ts-ignore
                disableRemotePlayback
                onLoadedMetadata={seekToPreviewFrame}
                onCanPlay={() => setIsVideoReady(true)}
                onLoadedData={() => {
                  if (!isHovered) seekToPreviewFrame();
                }}
                onSeeked={() => setIsVideoReady(true)}
                onError={() => setHasError(true)}
              />
            ) : (
              /* Lightweight standby state when out of view */
              <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
                {previewImageUrl && shouldLoadMedia && (
                  <img
                    src={responsivePreview.src}
                    srcSet={responsivePreview.srcSet}
                    sizes={responsivePreview.sizes}
                    alt={displayTitle}
                    loading="lazy"
                    decoding="async"
                    onError={handleResponsiveImageError}
                    className="w-full h-full object-cover opacity-60"
                  />
                )}
              </div>
            )
          ) : parsedVideo?.type === "youtube" && parsedVideo.videoId ? (
            /* 2. Embedded Low-Latency 360p YouTube Stream (active on hover/priority to avoid heavy iframe overload) */
            isHovered && canPlayStream && isInViewport ? (
              <div className="relative w-full h-full pointer-events-none overflow-hidden">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${parsedVideo.videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${parsedVideo.videoId}&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&vq=medium`}
                  className="w-[140%] h-[140%] -top-[20%] -left-[20%] absolute object-cover pointer-events-none group-hover:scale-105 transition-transform duration-700"
                  title={displayTitle}
                  allow="autoplay; encrypted-media"
                  loading="lazy"
                />
              </div>
            ) : (
              shouldLoadMedia ? <img
                src={responsivePreview.src || `https://img.youtube.com/vi/${parsedVideo.videoId}/${youtubePreviewIndex}.jpg`}
                srcSet={responsivePreview.srcSet}
                sizes={responsivePreview.sizes}
                alt={displayTitle}
                loading="lazy"
                decoding="async"
                onError={handleResponsiveImageError}
                className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700"
              /> : <div className="w-full h-full bg-zinc-950" />
            )
          ) : parsedVideo?.type === "vimeo" && parsedVideo.videoId ? (
            /* 3. Embedded Low-Latency 360p Vimeo Stream */
            isHovered && canPlayStream && isInViewport ? (
              <div className="relative w-full h-full pointer-events-none overflow-hidden">
                <iframe
                  src={`https://player.vimeo.com/video/${parsedVideo.videoId}?autoplay=1&muted=1&loop=1&background=1&quality=360p&title=0&byline=0&portrait=0&autopause=0`}
                  className="w-[140%] h-[140%] -top-[20%] -left-[20%] absolute object-cover pointer-events-none group-hover:scale-105 transition-transform duration-700"
                  title={displayTitle}
                  allow="autoplay; encrypted-media"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                <Film className="w-12 h-12 text-amber-400/60" />
              </div>
            )
          ) : previewImageUrl && !hasError && shouldLoadMedia ? (
            /* 4. Dedicated video poster thumbnail (never cover image) */
            <img
              src={responsivePreview.src}
              srcSet={responsivePreview.srcSet}
              sizes={responsivePreview.sizes}
              alt={displayTitle}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={handleResponsiveImageError}
              className={`w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : (
            /* 5. Minimal Dark Video Standby */
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400">
              {itemType === "drone_video" ? (
                <Plane className="w-10 h-10 mb-1 opacity-50 text-purple-400" />
              ) : (
                <Film className="w-10 h-10 mb-1 opacity-50 text-amber-400" />
              )}
              <span className="text-xs font-semibold text-zinc-300">{displayTitle}</span>
            </div>
          )}
        </div>
      ) : (
        /* Image Preview Card */
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-zinc-900">
          {previewImageUrl && !hasError && shouldLoadMedia ? (
            <img
              src={responsivePreview.src}
              srcSet={responsivePreview.srcSet}
              sizes={responsivePreview.sizes}
              alt={displayTitle}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={handleResponsiveImageError}
              className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400">
              <Camera className="w-10 h-10 mb-1 opacity-40 text-sky-400" />
              <span className="text-xs">{displayTitle}</span>
            </div>
          )}
        </div>
      )}

      {/* Top Floating Badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-1.5 flex-wrap">
          {itemType === "drone_photo" ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 backdrop-blur-md text-emerald-200 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
              <Plane className="w-3 h-3 text-emerald-400" />
              <span>{tUi("portfolio.drone_photo", currentLang, undefined, defaultLang)}</span>
            </span>
          ) : itemType === "drone_video" ? (
            <span className="px-2.5 py-1 rounded-full bg-purple-950/90 backdrop-blur-md text-purple-200 border border-purple-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
              <Plane className="w-3 h-3 text-purple-400" />
              <span>{tUi("portfolio.drone_video", currentLang, undefined, defaultLang)}</span>
            </span>
          ) : itemType === "interior_video" ? (
            <span className="px-2.5 py-1 rounded-full bg-amber-950/90 backdrop-blur-md text-amber-200 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
              <Film className="w-3 h-3 text-amber-400" />
              <span>{tUi("portfolio.interior_walkthrough", currentLang, undefined, defaultLang)}</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-sky-950/90 backdrop-blur-md text-sky-200 border border-sky-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
              <Camera className="w-3 h-3 text-sky-400" />
              <span>
                {totalInGallery > 1
                  ? tUi("portfolio.photo_position", { current: mediaIndex + 1, total: totalInGallery }, currentLang, defaultLang)
                  : tUi("portfolio.photo", currentLang, undefined, defaultLang)}
              </span>
            </span>
          )}

          {isVideoCard && (
            <span className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/80 border border-white/20 text-[10px] font-medium flex items-center gap-1 shadow-sm">
              <Gauge className="w-2.5 h-2.5 text-emerald-400" />
              <span>{tUi("portfolio.fast_stream", currentLang, undefined, defaultLang)}</span>
            </span>
          )}

          {item.is_featured === 1 && (
            <span className="px-2 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3 fill-current" />
              <span>{tUi("portfolio.featured_badge", currentLang, undefined, defaultLang)}</span>
            </span>
          )}
        </div>

        {item.target_url && (
          <span className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Video Center Play Button overlay on Hover */}
      {isVideoCard && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-xl group-hover:scale-115 group-hover:bg-primary group-hover:text-background group-hover:border-primary transition-all duration-300">
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
          </div>
        </div>
      )}

      {/* Bottom Content Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-4 sm:p-5 text-white z-20 pointer-events-none">
        <h3 className="text-sm sm:text-base font-bold tracking-tight line-clamp-1 group-hover:text-primary transition-colors mb-0.5">
          {displayTitle}
        </h3>

        {displaySubtitle && (
          <p className="text-[11px] sm:text-xs text-primary/90 font-medium line-clamp-1 mb-1">
            {displaySubtitle}
          </p>
        )}

        {caption && (
          <p className="text-xs text-white/70 line-clamp-1 font-normal mb-2 hidden sm:block">
            {caption}
          </p>
        )}

        <div className="flex items-center justify-between text-[11px] text-white/60 font-medium pt-1 border-t border-white/10">
          <span className="flex items-center gap-1.5 truncate max-w-[190px]">
            <Images className="w-3 h-3 text-white/50 shrink-0" />
            <span className="truncate">{tUi(totalInGallery === 1 ? "portfolio.media_item_count_one" : "portfolio.media_item_count_many", { count: totalInGallery }, currentLang, defaultLang)}</span>
          </span>
          <span className="flex items-center gap-1 group-hover:text-white transition-colors shrink-0">
            <Eye className="w-3 h-3" />
            <span>{isVideoCard ? tUi("portfolio.watch_4k", currentLang, undefined, defaultLang) : tUi("portfolio.explore", currentLang, undefined, defaultLang)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
