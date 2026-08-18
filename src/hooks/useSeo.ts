import { useEffect } from "react";
import { SiteSettings, PageSeoMeta } from "../lib/types";

interface UseSeoOptions {
  title?: string;
  description?: string;
  keywords?: string; // Specific page or item keywords
  settings?: SiteSettings;
  pageKey?: string; // e.g. "home", "about", "portfolio", "services", "contact", "faq"
}

export function useSeo({ title, description, keywords, settings = {}, pageKey }: UseSeoOptions) {
  useEffect(() => {
    let finalTitle = "";
    let finalDescription = "";
    let finalKeywords: string[] = [];

    // 1. Get default settings
    const defaultSiteTitle = settings.studio_name || "SPS Studio";
    const defaultGlobalTitle = settings.seo_default_title || `${defaultSiteTitle} - Real Estate Photography & Media`;
    const defaultGlobalDesc = settings.seo_default_description || "Elevating property presentations with high-end real estate photography, video tours, and aerial imagery.";
    const defaultGlobalKeywords = settings.seo_default_keywords 
      ? settings.seo_default_keywords.split(",").map(k => k.trim()).filter(Boolean)
      : ["real estate photography", "drone photography", "virtual tours", "property media", "SPS Studio"];

    // 2. Check if page-specific settings exist in settings.seo_pages_meta
    let pageMeta: PageSeoMeta = {};
    if (pageKey && settings.seo_pages_meta) {
      try {
        const parsedPages = JSON.parse(settings.seo_pages_meta);
        if (parsedPages[pageKey]) {
          pageMeta = parsedPages[pageKey];
        }
      } catch (e) {
        console.error("Failed to parse seo_pages_meta", e);
      }
    }

    // 3. Resolve final title
    if (title) {
      finalTitle = `${title} | ${defaultSiteTitle}`;
    } else if (pageMeta.title) {
      finalTitle = pageMeta.title.includes(defaultSiteTitle) ? pageMeta.title : `${pageMeta.title} | ${defaultSiteTitle}`;
    } else {
      finalTitle = defaultGlobalTitle;
    }

    // 4. Resolve final description
    finalDescription = description || pageMeta.description || defaultGlobalDesc;

    // 5. Resolve final keywords (combine entity/page keywords with global defaults)
    const specificKwString = keywords || pageMeta.keywords || "";
    const specificKeywords = specificKwString
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);

    // Combine and deduplicate
    const combinedSet = new Set<string>();
    specificKeywords.forEach(k => combinedSet.add(k));
    defaultGlobalKeywords.forEach(k => combinedSet.add(k));

    finalKeywords = Array.from(combinedSet);

    // 6. Update DOM <head>
    if (finalTitle) {
      document.title = finalTitle;
    }

    // Update or create <meta name="description">
    updateMetaTag("name", "description", finalDescription);
    updateMetaTag("property", "og:description", finalDescription);

    // Update or create <meta name="keywords">
    const keywordsStr = finalKeywords.join(", ");
    updateMetaTag("name", "keywords", keywordsStr);
    updateMetaTag("property", "og:keywords", keywordsStr);

    // Update OpenGraph Title
    updateMetaTag("property", "og:title", finalTitle);

  }, [title, description, keywords, settings, pageKey]);
}

function updateMetaTag(attrName: "name" | "property", attrValue: string, content: string) {
  if (!content) return;
  
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}
