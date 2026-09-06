const productionOrigin = "https://www.spsstudio.hu";

export function getCanonicalPublicOrigin() {
  const configured = String(import.meta.env.VITE_SEO_CANONICAL_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) return window.location.origin;
  return productionOrigin;
}

export function canonicalPath(pathname: string) {
  const path = `/${String(pathname || "/").replace(/^\/+|\/+$/g, "")}`;
  return path === "/" ? "/" : path;
}

export function getCanonicalUrl(pathname: string) {
  return `${getCanonicalPublicOrigin()}${canonicalPath(pathname)}`;
}

export function setCanonicalUrl(pathname: string) {
  if (typeof document === "undefined") return;
  const href = getCanonicalUrl(pathname);
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;

  let ogUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement("meta");
    ogUrl.setAttribute("property", "og:url");
    document.head.appendChild(ogUrl);
  }
  ogUrl.content = href;
}

export function removeCanonicalUrl() {
  if (typeof document === "undefined") return;
  document.head.querySelector('link[rel="canonical"]')?.remove();
}

export function setRobots(content: string) {
  if (typeof document === "undefined") return;
  let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.appendChild(robots);
  }
  robots.content = content;
}
