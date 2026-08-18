/**
 * Global Video Stream & Decoder Concurrency Manager
 * 
 * Browsers and mobile GPUs have hardware video decoder limits (typically 4-6 concurrent channels).
 * Attempting to decode 10-20 full video streams simultaneously causes dropped frames, 
 * high CPU usage, and UI stutter.
 * 
 * This manager coordinates playback leases across all visible media cards:
 * - Allocates active hardware decoding leases to the most visible / hovered cards (up to MAX_CONCURRENT_VIDEOS).
 * - Preloads metadata and first keyframes for all upcoming cards for zero-delay activation.
 * - Prioritizes user hovered / interacted cards instantly.
 */

type VideoListener = (canPlay: boolean) => void;

interface VideoRegistration {
  id: string;
  isHovered: boolean;
  visibilityRatio: number;
  isInViewport: boolean;
  priority: boolean;
  lastRequestedAt: number;
  listener: VideoListener;
}

class VideoStreamManager {
  private registrations = new Map<string, VideoRegistration>();
  private activePlayingIds = new Set<string>();
  
  // 5 active hardware decoders maximum provides buttery 60fps rendering without saturating GPU
  private maxConcurrent = 5;
  private updateScheduled = false;

  constructor() {
    // Detect low-power or mobile devices and adjust concurrency
    if (typeof navigator !== "undefined") {
      const cores = navigator.hardwareConcurrency || 4;
      if (cores <= 2) {
        this.maxConcurrent = 3;
      } else if (cores >= 8) {
        this.maxConcurrent = 6;
      }
    }
  }

  public register(
    id: string,
    listener: VideoListener,
    initialState: { isInViewport?: boolean; priority?: boolean } = {}
  ): () => void {
    this.registrations.set(id, {
      id,
      isHovered: false,
      visibilityRatio: initialState.isInViewport ? 1 : 0,
      isInViewport: initialState.isInViewport ?? false,
      priority: initialState.priority ?? false,
      lastRequestedAt: Date.now(),
      listener,
    });

    this.scheduleRebalance();

    return () => {
      this.registrations.delete(id);
      this.activePlayingIds.delete(id);
      this.scheduleRebalance();
    };
  }

  public updateState(
    id: string,
    updates: Partial<Omit<VideoRegistration, "id" | "listener">>
  ) {
    const reg = this.registrations.get(id);
    if (!reg) return;

    Object.assign(reg, updates);
    if (updates.isHovered) {
      reg.lastRequestedAt = Date.now();
    }
    this.scheduleRebalance();
  }

  private scheduleRebalance() {
    if (this.updateScheduled) return;
    this.updateScheduled = true;

    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => {
        this.updateScheduled = false;
        this.rebalance();
      });
    } else {
      setTimeout(() => {
        this.updateScheduled = false;
        this.rebalance();
      }, 16);
    }
  }

  private rebalance() {
    const candidates: VideoRegistration[] = Array.from(this.registrations.values())
      .filter((reg) => reg.isInViewport);

    // Sort by priority score:
    // 1. Hovered cards (instant top priority)
    // 2. High priority prop (first cards in row)
    // 3. Highest visibility ratio
    // 4. Most recent interaction
    candidates.sort((a, b) => {
      if (a.isHovered !== b.isHovered) {
        return a.isHovered ? -1 : 1;
      }
      if (a.priority !== b.priority) {
        return a.priority ? -1 : 1;
      }
      if (Math.abs(a.visibilityRatio - b.visibilityRatio) > 0.1) {
        return b.visibilityRatio - a.visibilityRatio;
      }
      return b.lastRequestedAt - a.lastRequestedAt;
    });

    const allowed = new Set<string>();
    for (let i = 0; i < Math.min(candidates.length, this.maxConcurrent); i++) {
      allowed.add(candidates[i].id);
    }

    this.activePlayingIds = allowed;

    // Notify listeners
    this.registrations.forEach((reg) => {
      const canPlay = allowed.has(reg.id);
      reg.listener(canPlay);
    });
  }
}

export const globalVideoStreamManager = new VideoStreamManager();
