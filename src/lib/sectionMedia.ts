export type SectionMediaItem = {
  backgroundUrl?: string;
  heroGallery?: string[];
  heroSlideIntervalMs?: number;
  backgroundPosition?: string;
  overlayOpacity?: number;
  imageBlur?: number;
  contentImageUrl?: string;
  contentVideoUrl?: string;
  contentVideoAspect?: "portrait" | "landscape";
};

export type SectionMediaConfig = Record<string, SectionMediaItem>;

export function parseSectionMedia(value?: string): SectionMediaConfig {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
