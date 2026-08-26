export interface ResponsiveImageAttributes {
  src: string;
  srcSet?: string;
  sizes?: string;
}

const APPWRITE_FILE_ROUTE = /\/storage\/buckets\/[^/]+\/files\/[^/]+\/(?:view|download|preview)$/i;
const VERCEL_IMAGE_ENDPOINT = "/_vercel/image";

function safeImageWidth(width: number): number {
  return Math.min(4000, Math.max(64, Math.round(width)));
}

function safeImageQuality(quality: number): number {
  return Math.min(100, Math.max(40, Math.round(quality)));
}

function buildVercelImageUrl(source: string, width: number, quality: number): string {
  const params = new URLSearchParams({
    url: source,
    w: String(safeImageWidth(width)),
    q: String(safeImageQuality(quality)),
  });
  return `${VERCEL_IMAGE_ENDPOINT}?${params.toString()}`;
}

function buildTransformedImageUrl(source: string, width: number, quality: number): string {
  if (!source || source.startsWith("data:") || source.startsWith("blob:")) return source;

  try {
    const isAbsolute = /^https?:\/\//i.test(source);
    const parsed = new URL(source, isAbsolute ? undefined : "https://responsive-image.local");
    const safeWidth = safeImageWidth(width);
    const safeQuality = safeImageQuality(quality);

    if (APPWRITE_FILE_ROUTE.test(parsed.pathname)) {
      // Vercel serves the production build and can cache and negotiate AVIF/WebP
      // responses. Keep the Appwrite preview route in local development, where
      // Vercel's internal endpoint is intentionally unavailable.
      if (import.meta.env.PROD) {
        return buildVercelImageUrl(parsed.toString(), safeWidth, safeQuality);
      }

      parsed.pathname = parsed.pathname.replace(/\/(?:view|download|preview)$/i, "/preview");
      parsed.searchParams.delete("mode");
      parsed.searchParams.set("width", String(safeWidth));
      parsed.searchParams.set("quality", String(safeQuality));
      // Appwrite Cloud currently returns HTTP 500 for WebP output on the
      // project's otherwise valid previews. JPEG resizing is supported and
      // still reduces the tested 767 KB card asset to roughly 29 KB.
      parsed.searchParams.set("output", "jpg");
      return isAbsolute ? parsed.toString() : `${parsed.pathname}${parsed.search}`;
    }

    if (parsed.hostname === "images.unsplash.com") {
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", parsed.searchParams.get("fit") || "max");
      parsed.searchParams.set("w", String(safeWidth));
      parsed.searchParams.set("q", String(safeQuality));
      return parsed.toString();
    }
  } catch {
    return source;
  }

  return source;
}

export function getResponsiveImageAttributes(
  source: string,
  widths: number[],
  sizes: string,
  quality = 82,
): ResponsiveImageAttributes {
  const normalizedWidths = Array.from(new Set(widths))
    .map(safeImageWidth)
    .sort((a, b) => a - b);

  if (!source || normalizedWidths.length === 0) return { src: source };

  const candidates = normalizedWidths.map((width) => ({
    width,
    url: buildTransformedImageUrl(source, width, quality),
  }));
  const supportsTransforms = candidates.some((candidate) => candidate.url !== source);

  if (!supportsTransforms) return { src: source };

  return {
    src: candidates[Math.min(candidates.length - 1, Math.floor(candidates.length / 2))].url,
    srcSet: candidates.map((candidate) => `${candidate.url} ${candidate.width}w`).join(", "),
    sizes,
  };
}
