import React, { useState, useMemo } from "react";
import { PortfolioItem } from "../../lib/types";
import { InfiniteMarqueeRow } from "./portfolio/InfiniteMarqueeRow";
import { ShowcaseMediaCardItem } from "./portfolio/MediaCard";
import { PortfolioLightboxModal } from "./portfolio/PortfolioLightboxModal";
import { useLanguage } from "../../contexts/LanguageContext";
import { tUi } from "../../lib/i18n";
import { motion } from "motion/react";
import { 
  staggerContainer, 
  fadeInUp, 
  fadeIn, 
  VIEWPORT_CONFIG 
} from "../../lib/animations";
import { 
  Sparkles, 
  Play, 
  Pause, 
  Layers,
  Camera,
  Film,
  Plane
} from "lucide-react";
import { 
  GalleryMediaItem, 
  getNormalizedGallery, 
  isVideoMedia 
} from "../../lib/mediaUtils";

interface PortfolioProps {
  items: PortfolioItem[];
  isPerformanceLite?: boolean;
}

function shuffleShowcaseCards(cards: ShowcaseMediaCardItem[]): ShowcaseMediaCardItem[] {
  const remaining = [...cards];
  const shuffled: ShowcaseMediaCardItem[] = [];

  while (remaining.length > 0) {
    const previousPortfolioId = shuffled.at(-1)?.item.id;
    const eligibleIndexes = remaining
      .map((card, index) => card.item.id !== previousPortfolioId ? index : -1)
      .filter((index) => index >= 0);
    const candidates = eligibleIndexes.length > 0
      ? eligibleIndexes
      : remaining.map((_, index) => index);
    const selectedIndex = candidates[Math.floor(Math.random() * candidates.length)];
    shuffled.push(remaining.splice(selectedIndex, 1)[0]);
  }

  return shuffled;
}

export function Portfolio({ items, isPerformanceLite = false }: PortfolioProps) {
  const { currentLang, defaultLang } = useLanguage();
  const [activeModalItem, setActiveModalItem] = useState<PortfolioItem | null>(null);
  const [activeModalMediaIndex, setActiveModalMediaIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  // The showcase always starts as a running conveyor. It only pauses through
  // the explicit control button, so its initial behaviour is deterministic.
  const isReducedMotion = isPerformanceLite;

  // Extract individual gallery item previews across all portfolio projects into their designated rows
  const { imageCards, droneVideoCards, interiorVideoCards, dronePhotoCards } = useMemo(() => {
    if (!items || items.length === 0) {
      return { imageCards: [], droneVideoCards: [], interiorVideoCards: [], dronePhotoCards: [] };
    }

    const imgCards: ShowcaseMediaCardItem[] = [];
    const droneCards: ShowcaseMediaCardItem[] = [];
    const interiorCards: ShowcaseMediaCardItem[] = [];
    const dronePhotoCards: ShowcaseMediaCardItem[] = [];

    items.forEach((item) => {
      const gallery = getNormalizedGallery(item.image_urls);
      const totalGallery = gallery.length;

      // Project fallback heuristics
      const titleLower = (typeof item.title === "string" ? item.title : JSON.stringify(item.title)).toLowerCase();
      const catSlug = (item.category_slug || "").toLowerCase();
      const isLegacyDrone = catSlug.includes("drone") || catSlug.includes("aerial") || titleLower.includes("drone") || titleLower.includes("aerial");

      if (totalGallery > 0) {
        gallery.forEach((media, idx) => {
          // The interactive homepage showcase must never fetch the full-size
          // original when an optimized derivative exists. The original URL
          // remains stored on the portfolio item for protected downloads.
          const displayMedia: GalleryMediaItem = media.type === "image" && media.compressed_url
            ? { ...media, url: media.compressed_url, thumbnail_url: media.compressed_url }
            : media;
          let resolvedType: "image" | "drone_video" | "interior_video" | "drone_photo" = "image";

          if (media.item_type === "drone_photo") {
            resolvedType = "drone_photo";
          } else if (media.item_type === "drone_video") {
            resolvedType = "drone_video";
          } else if (media.item_type === "interior_video") {
            resolvedType = "interior_video";
          } else if (media.item_type === "image") {
            resolvedType = "image";
          } else if (media.type === "video" || isVideoMedia(media)) {
            // Check title/caption hints
            const mTitle = (media.title || "").toLowerCase();
            const mCap = (media.caption || "").toLowerCase();
            if (item.item_type === "drone_video" || isLegacyDrone || mTitle.includes("drone") || mTitle.includes("aerial") || mCap.includes("drone")) {
              resolvedType = "drone_video";
            } else {
              resolvedType = "interior_video";
            }
          } else {
            resolvedType = "image";
          }

          const cardItem: ShowcaseMediaCardItem = {
            id: `${item.id}-${media.id || idx}-${idx}`,
            item,
            media: displayMedia,
            mediaIndex: idx,
            totalInGallery: totalGallery,
            itemType: resolvedType,
          };

          if (resolvedType === "drone_photo") {
            dronePhotoCards.push(cardItem);
          } else if (resolvedType === "drone_video") {
            droneCards.push(cardItem);
          } else if (resolvedType === "interior_video") {
            interiorCards.push(cardItem);
          } else {
            imgCards.push(cardItem);
          }
        });
      } else {
        // Fallback when gallery is empty: use primary media_url or thumbnail_url
        const isVideo = item.media_type === "video" || (item.media_url && isVideoMedia(item.media_url));
        let resolvedType: "image" | "drone_video" | "interior_video" | "drone_photo" = "image";

        if (item.item_type === "drone_photo" && !isVideo) {
          resolvedType = "drone_photo";
        } else if (item.item_type === "drone_video" || (isVideo && isLegacyDrone)) {
          resolvedType = "drone_video";
        } else if (item.item_type === "interior_video" || isVideo) {
          resolvedType = "interior_video";
        } else {
          resolvedType = "image";
        }

        const isVideoCategory = resolvedType === "drone_video" || resolvedType === "interior_video" || isVideo;
        const fallbackMedia: GalleryMediaItem = {
          id: `${item.id}-media-card`,
          url: item.media_url || (!isVideoCategory ? (item.thumbnail_url || "") : ""),
          thumbnail_url: !isVideoCategory ? (item.thumbnail_url || "") : "",
          type: isVideoCategory ? "video" : "image",
          title: item.title,
          caption: item.description,
          item_type: resolvedType,
        };

        const cardItem: ShowcaseMediaCardItem = {
          id: `${item.id}-cover-card`,
          item,
          media: fallbackMedia,
          mediaIndex: 0,
          totalInGallery: 1,
          itemType: resolvedType,
        };

        if (resolvedType === "drone_photo") {
          dronePhotoCards.push(cardItem);
        } else if (resolvedType === "drone_video") {
          droneCards.push(cardItem);
        } else if (resolvedType === "interior_video") {
          interiorCards.push(cardItem);
        } else {
          imgCards.push(cardItem);
        }
      }
    });

    return {
      imageCards: shuffleShowcaseCards(imgCards),
      droneVideoCards: shuffleShowcaseCards(droneCards),
      interiorVideoCards: shuffleShowcaseCards(interiorCards),
      dronePhotoCards: shuffleShowcaseCards(dronePhotoCards),
    };
  }, [items]);

  const handleCardClick = (item: PortfolioItem, mediaIndex: number) => {
    setActiveModalItem(item);
    setActiveModalMediaIndex(mediaIndex);
  };

  if (!items || items.length === 0) return null;

  return (
    <section 
      id="portfolio" 
      className="aero-portfolio aero-image-section scroll-mt-20 py-24 md:py-32 px-6 relative overflow-hidden"
    >
      {/* Background Ambience Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 blur-[120px] pointer-events-none rounded-full" />

      {/* Header Container */}
      <div className="max-w-7xl mx-auto mb-12 relative z-10">
        <motion.div 
          variants={staggerContainer(0.1, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_CONFIG}
          className="aero-section-heading flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-8 border-b border-border"
        >
          <div className="space-y-4 max-w-2xl">
            <motion.div 
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{tUi("Interactive Showcase", currentLang, undefined, defaultLang)}</span>
            </motion.div>

            <motion.h2 
              variants={fadeInUp}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-text"
            >
              {tUi("Portfolio", currentLang, undefined, defaultLang) || "Our Portfolio"}
            </motion.h2>

            <motion.p 
              variants={fadeInUp}
              className="text-base sm:text-lg text-muted-text leading-relaxed font-normal"
            >
              {tUi(
                "Explore our visual galleries featuring high-resolution architectural photography, 4K walkthrough motion reels, and cinematic aerial drone captures.",
                currentLang,
                undefined,
                defaultLang
              )}
            </motion.p>
          </div>

          {/* Controls: Play/Pause & Motion Toggle */}
          <motion.div variants={fadeInUp} className="flex items-center gap-3 shrink-0 flex-wrap">
            {!isReducedMotion && (
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                className="px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface/80 text-text text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs cursor-pointer active:scale-95"
                title={isPaused ? tUi("portfolio.resume_scroll", currentLang, undefined, defaultLang) : tUi("portfolio.pause_scroll", currentLang, undefined, defaultLang)}
              >
                {isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-primary fill-current" />
                    <span>{tUi("portfolio.resume_conveyor", currentLang, undefined, defaultLang)}</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-muted-text" />
                    <span>{tUi("portfolio.stop_conveyor", currentLang, undefined, defaultLang)}</span>
                  </>
                )}
              </button>
            )}

          </motion.div>
        </motion.div>
      </div>

      {/* 3 Showcase Rows Filled with Distinct Gallery Item Previews */}
      <motion.div 
        variants={fadeIn}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT_CONFIG}
        className="space-y-4 sm:space-y-6 overflow-hidden relative z-10"
      >
        {/* Row 1: Photography Previews (scrolls left) */}
        {imageCards.length > 0 && (
          <div className="relative">
            <div className="max-w-7xl mx-auto px-6 mb-2 flex items-center justify-between text-xs text-muted-text font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-500" />
                <span>{tUi("High-Resolution Photography", currentLang, undefined, defaultLang) || "High-Resolution Photography"}</span>
              </span>
              <span className="text-[11px] opacity-60">
                {tUi(imageCards.length === 1 ? "portfolio.photo_preview_count_one" : "portfolio.photo_preview_count_many", { count: imageCards.length }, currentLang, defaultLang)}
              </span>
            </div>
            <InfiniteMarqueeRow
              items={imageCards}
              direction="left"
              speedSeconds={48}
              isPaused={isPaused}
              onItemClick={handleCardClick}
              isReducedMotion={isReducedMotion}
            />
          </div>
        )}

        {/* Row 2: Drone Video Previews (scrolls right) */}
        {droneVideoCards.length > 0 && (
          <div className="relative">
            <div className="max-w-7xl mx-auto px-6 mb-2 flex items-center justify-between text-xs text-muted-text font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-purple-500" />
                <span>{tUi("Drone Aerial Cinematography", currentLang, undefined, defaultLang) || "Drone Aerial Cinematography"}</span>
              </span>
              <span className="text-[11px] opacity-60">
                {tUi(droneVideoCards.length === 1 ? "portfolio.video_reel_count_one" : "portfolio.video_reel_count_many", { count: droneVideoCards.length }, currentLang, defaultLang)}
              </span>
            </div>
            <InfiniteMarqueeRow
              items={droneVideoCards}
              direction="right"
              speedSeconds={42}
              isPaused={isPaused}
              onItemClick={handleCardClick}
              isReducedMotion={isReducedMotion}
            />
          </div>
        )}

        {/* Row 3: Interior Video Walkthrough Previews (scrolls left) */}
        {interiorVideoCards.length > 0 && (
          <div className="relative">
            <div className="max-w-7xl mx-auto px-6 mb-2 flex items-center justify-between text-xs text-muted-text font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-amber-500" />
                <span>{tUi("Interior Video Walkthroughs", currentLang, undefined, defaultLang) || "Interior Video Walkthroughs"}</span>
              </span>
              <span className="text-[11px] opacity-60">
                {tUi(interiorVideoCards.length === 1 ? "portfolio.video_reel_count_one" : "portfolio.video_reel_count_many", { count: interiorVideoCards.length }, currentLang, defaultLang)}
              </span>
            </div>
            <InfiniteMarqueeRow
              items={interiorVideoCards}
              direction="left"
              speedSeconds={52}
              isPaused={isPaused}
              onItemClick={handleCardClick}
              isReducedMotion={isReducedMotion}
            />
          </div>
        )}

        {/* Row 4: Drone Photography Previews (scrolls right) */}
        {dronePhotoCards.length > 0 && (
          <div className="relative">
            <div className="max-w-7xl mx-auto px-6 mb-2 flex items-center justify-between text-xs text-muted-text font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-emerald-500" />
                <span>{tUi("Drone Photography", currentLang, undefined, defaultLang) || "Drone Photography"}</span>
              </span>
              <span className="text-[11px] opacity-60">
                {tUi(dronePhotoCards.length === 1 ? "portfolio.photo_preview_count_one" : "portfolio.photo_preview_count_many", { count: dronePhotoCards.length }, currentLang, defaultLang)}
              </span>
            </div>
            <InfiniteMarqueeRow
              items={dronePhotoCards}
              direction="right"
              speedSeconds={46}
              isPaused={isPaused}
              onItemClick={handleCardClick}
              isReducedMotion={isReducedMotion}
            />
          </div>
        )}
      </motion.div>

      {/* Lightbox Modal for Photos & Videos */}
      <PortfolioLightboxModal
        item={activeModalItem}
        initialIndex={activeModalMediaIndex}
        onClose={() => setActiveModalItem(null)}
      />
    </section>
  );
}
