import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { removeCanonicalUrl, setCanonicalUrl, setRobots } from "../lib/canonicalUrl";

const staticIndexablePaths = new Set(["/", "/properties", "/changelog", "/open-source", "/installers"]);

function isIndexablePublicPath(pathname: string) {
  if (staticIndexablePaths.has(pathname)) return true;
  return /^\/(?:portfolio|properties|open-source)\/[^/]+$/.test(pathname);
}

/** Keeps SPA head metadata aligned with the public URLs emitted by sitemap.xml. */
export function CanonicalUrlManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isIndexablePublicPath(pathname)) {
      removeCanonicalUrl();
      setRobots("noindex, nofollow");
      return;
    }
    setCanonicalUrl(pathname);
    setRobots("index, follow");
  }, [pathname]);

  return null;
}
