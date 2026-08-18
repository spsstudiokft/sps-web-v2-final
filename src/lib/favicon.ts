/**
 * Utility to manage dynamic favicon injection and cache busting.
 * Supports ICO, PNG, and SVG favicons with immediate live tab updates.
 */

const DEFAULT_SVG_FAVICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z'/%3E%3Ccircle cx='12' cy='13' r='3'/%3E%3C/svg%3E`;

export function updateDocumentFavicon(faviconUrl?: string | null) {
  if (typeof document === "undefined") return;

  const rawUrl = (faviconUrl && faviconUrl.trim() !== "") ? faviconUrl.trim() : DEFAULT_SVG_FAVICON;

  // Determine icon type based on data-URI prefix or file extension
  let mimeType = "image/x-icon";
  if (rawUrl.startsWith("data:image/svg+xml") || rawUrl.endsWith(".svg") || rawUrl.includes(".svg?")) {
    mimeType = "image/svg+xml";
  } else if (rawUrl.startsWith("data:image/png") || rawUrl.endsWith(".png") || rawUrl.includes(".png?")) {
    mimeType = "image/png";
  } else if (rawUrl.startsWith("data:image/jpeg") || rawUrl.endsWith(".jpg") || rawUrl.endsWith(".jpeg")) {
    mimeType = "image/jpeg";
  } else if (rawUrl.endsWith(".ico") || rawUrl.includes(".ico?")) {
    mimeType = "image/x-icon";
  }

  // Use raw URL or add lightweight cache-buster timestamp for remote HTTP URLs
  const finalHref = rawUrl;

  const relTargets = ["icon", "shortcut icon", "apple-touch-icon"];

  relTargets.forEach((rel) => {
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.type = mimeType;
    link.href = finalHref;
  });
}
