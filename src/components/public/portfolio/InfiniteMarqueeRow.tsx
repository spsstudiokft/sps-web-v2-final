import React, { useMemo, useState } from "react";
import { PortfolioItem } from "../../../lib/types";
import { MediaCard, ShowcaseMediaCardItem } from "./MediaCard";

interface InfiniteMarqueeRowProps {
  items: ShowcaseMediaCardItem[];
  direction: "left" | "right";
  speedSeconds?: number;
  isPaused?: boolean;
  onItemClick: (item: PortfolioItem, mediaIndex: number) => void;
  isReducedMotion?: boolean;
}

export function InfiniteMarqueeRow({
  items,
  direction,
  speedSeconds = 45,
  isPaused = false,
  onItemClick,
  isReducedMotion = false,
}: InfiniteMarqueeRowProps) {
  const [isRowHovered, setIsRowHovered] = useState(false);

  // Build a seamless base sequence that is guaranteed wide enough for ultra-wide screens
  const baseSequence = useMemo(() => {
    if (!items || items.length === 0) return [];
    
    // Ensure base sequence has at least 6 items so one track spans beyond widest displays
    const minItemsNeeded = 6;
    const multiplier = Math.max(1, Math.ceil(minItemsNeeded / items.length));
    
    const seq: ShowcaseMediaCardItem[] = [];
    for (let m = 0; m < multiplier; m++) {
      seq.push(...items);
    }
    return seq;
  }, [items]);

  if (!items || items.length === 0 || baseSequence.length === 0) return null;

  // Reduced motion: accessible clean scroll container
  if (isReducedMotion) {
    return (
      <div className="w-full overflow-x-auto py-2.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div className="flex items-center px-4 w-max">
          {items.map((card, idx) => (
            <MediaCard
              key={`static-${card.id}-${idx}`}
              card={card}
              onClick={onItemClick}
            />
          ))}
        </div>
      </div>
    );
  }

  const animationClass = direction === "right" ? "animate-marquee-right" : "animate-marquee-left";
  const shouldPause = isPaused || isRowHovered;

  // Scale duration proportionally to track length for smooth, natural uniform velocity
  const computedDuration = Math.max(25, (baseSequence.length / 6) * speedSeconds);

  return (
    <div
      className="aero-marquee-viewport relative w-full overflow-hidden py-2 select-none"
      onMouseEnter={() => setIsRowHovered(true)}
      onMouseLeave={() => setIsRowHovered(false)}
    >
      {/* 
        Two identical tracks (Track 1 & Track 2) moving continuously.
        Translating -50% shifts Track 1 exactly out and Track 2 in its exact starting position.
        Result: True mathematical infinity with zero dropbacks, jumps, or visible restarts.
      */}
      <div
        className={`flex w-max will-change-transform transform-gpu ${animationClass}`}
        style={{
          animationDuration: `${computedDuration}s`,
          animationPlayState: shouldPause ? "paused" : "running",
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      >
        {/* Track 1: Primary Sequence */}
        <div className="flex items-center shrink-0">
          {baseSequence.map((card, idx) => (
            <MediaCard
              key={`track1-${card.id}-${idx}`}
              card={card}
              onClick={onItemClick}
              priority={idx < 4}
            />
          ))}
        </div>

        {/* Track 2: Identical Clone Track for Seamless Infinite Looping */}
        <div className="flex items-center shrink-0" aria-hidden="true">
          {baseSequence.map((card, idx) => (
            <MediaCard
              key={`track2-${card.id}-${idx}`}
              card={card}
              onClick={onItemClick}
              priority={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
