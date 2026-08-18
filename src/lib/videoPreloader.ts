/**
 * Video & Media Stream Preloader Utility
 * 
 * Preloads video headers/metadata and posters during idle browser time
 * to ensure instant streaming starts without initial frame drops or network stalls.
 */

const preloadedUrls = new Set<string>();

/**
 * Preload video stream metadata and initial chunks in the background
 */
export function preloadVideoPreviews(urls: string[]) {
  if (typeof window === "undefined") return;

  const validUrls = urls.filter((u) => u && !preloadedUrls.has(u));
  if (validUrls.length === 0) return;

  const doPreload = () => {
    validUrls.slice(0, 8).forEach((url) => {
      preloadedUrls.add(url);

      // 1. If it's a direct video, warm up connection & range header
      if (url.endsWith(".mp4") || url.endsWith(".webm") || url.includes("/uploads/")) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.src = `${url}#t=0.001`;
        // Clean up element after metadata is ready
        video.onloadedmetadata = () => {
          video.src = "";
          video.load();
        };
      }

      // 2. Preconnect to image & video CDNs if relevant
      if (url.startsWith("http")) {
        try {
          const origin = new URL(url).origin;
          if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
            const link = document.createElement("link");
            link.rel = "preconnect";
            link.href = origin;
            link.crossOrigin = "anonymous";
            document.head.appendChild(link);
          }
        } catch {}
      }
    });
  };

  // Run during idle period so user interactions and animations stay 60fps
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(doPreload, { timeout: 2000 });
  } else {
    setTimeout(doPreload, 300);
  }
}
