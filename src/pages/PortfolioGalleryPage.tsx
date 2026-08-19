import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Camera, Images, LoaderCircle, Play, SearchX } from "lucide-react";
import { Header } from "../components/public/Header";
import { Footer } from "../components/public/Footer";
import { PortfolioLightboxModal } from "../components/public/portfolio/PortfolioLightboxModal";
import { LanguageProvider, useLanguage } from "../contexts/LanguageContext";
import { PortfolioItem, SiteSettings } from "../lib/types";
import { t } from "../lib/i18n";
import { getNormalizedGallery, isVideoMedia, parseVideoUrl } from "../lib/mediaUtils";
import { getResponsiveImageAttributes } from "../lib/responsiveImage";

function setMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
}

export default function PortfolioGalleryPage() {
  const { slug = "" } = useParams();
  const [settings, setSettings] = useState<SiteSettings>({});
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/public/settings").then((response) => response.ok ? response.json() : {}),
      fetch(`/api/public/portfolio/${encodeURIComponent(slug)}`).then(async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`Gallery request failed (${response.status})`);
        return response.json();
      }),
    ]).then(([nextSettings, gallery]) => {
      if (!active) return;
      setSettings(nextSettings || {});
      setItem(gallery);
      setNotFound(!gallery);
    }).catch((error) => {
      console.error(error);
      if (active) setNotFound(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [slug]);

  if (loading) return <div className="min-h-screen animate-pulse bg-background" aria-busy="true" />;

  return (
    <LanguageProvider settings={settings}>
      <PortfolioGalleryContent settings={settings} item={item} notFound={notFound} />
    </LanguageProvider>
  );
}

function PortfolioGalleryContent({ settings, item, notFound }: { settings: SiteSettings; item: PortfolioItem | null; notFound: boolean }) {
  const { currentLang, defaultLang, tUi } = useLanguage();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [protectedDownloadIndex, setProtectedDownloadIndex] = useState<number | null>(null);
  const mediaItems = useMemo(() => item ? getNormalizedGallery(item.image_urls) : [], [item]);
  const title = item ? (t(item.title, currentLang, defaultLang) || item.title) : tUi("portfolio.page.not_found_title");
  const description = item ? (t(item.description, currentLang, defaultLang) || item.description || "") : "";
  const category = item?.category_name ? t(item.category_name, currentLang, defaultLang) : "";

  const downloadWatermarkedImage = async (index: number) => {
    if (!item?.slug || protectedDownloadIndex !== null) return;
    setProtectedDownloadIndex(index);
    try {
      const response = await fetch(`/api/public/portfolio/${encodeURIComponent(item.slug)}/media/${index}/watermarked`);
      if (!response.ok) throw new Error(`Protected download failed (${response.status})`);
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/i)?.[1] || `${item.slug}-${index + 1}-watermarked.jpg`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (error) {
      console.error("Failed to download watermarked portfolio image:", error);
    } finally {
      setProtectedDownloadIndex(null);
    }
  };

  useEffect(() => {
    const previousTitle = document.title;
    const canonical = `${window.location.origin}/portfolio/${item?.slug || ""}`;
    const cover = mediaItems.find((media) => !isVideoMedia(media));
    const coverUrl = cover?.compressed_url || cover?.thumbnail_url || cover?.url || item?.thumbnail_url || "";
    const seoTitle = item ? `${title} | ${tUi("portfolio.page.seo_suffix")}` : tUi("portfolio.page.not_found_title");
    const seoDescription = description || (item ? tUi("portfolio.page.default_description", { title }) : tUi("portfolio.page.not_found_description"));
    document.title = seoTitle;
    setMeta('meta[name="description"]', { name: "description", content: seoDescription });
    setMeta('meta[property="og:title"]', { property: "og:title", content: seoTitle });
    setMeta('meta[property="og:description"]', { property: "og:description", content: seoDescription });
    setMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    setMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    if (coverUrl) setMeta('meta[property="og:image"]', { property: "og:image", content: coverUrl });
    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    const structuredData = document.createElement("script");
    structuredData.id = "portfolio-gallery-structured-data";
    structuredData.type = "application/ld+json";
    structuredData.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      name: title,
      description: seoDescription,
      url: canonical,
      image: mediaItems.filter((media) => !isVideoMedia(media)).map((media) => ({
        "@type": "ImageObject",
        contentUrl: media.compressed_url || media.thumbnail_url || media.url,
        caption: media.caption || media.title || title,
      })),
    });
    document.getElementById(structuredData.id)?.remove();
    document.head.appendChild(structuredData);
    return () => {
      document.title = previousTitle;
      structuredData.remove();
    };
  }, [item, mediaItems, title, description, tUi]);

  return (
    <div className="min-h-screen bg-background text-text">
      <Header settings={settings} hasServices={false} hasPortfolio />
      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8 lg:pt-32">
        {notFound || !item ? (
          <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center text-center">
            <SearchX className="mb-5 h-14 w-14 text-muted-text" />
            <h1 className="text-3xl font-bold">{tUi("portfolio.page.not_found_title")}</h1>
            <p className="mt-3 text-muted-text">{tUi("portfolio.page.not_found_description")}</p>
            <Link to="/#portfolio" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">
              <ArrowLeft className="h-4 w-4" /> {tUi("portfolio.page.back")}
            </Link>
          </div>
        ) : (
          <>
            <nav aria-label="Breadcrumb" className="mb-7">
              <Link to="/#portfolio" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80">
                <ArrowLeft className="h-4 w-4" /> {tUi("portfolio.page.back")}
              </Link>
            </nav>
            <header className="mb-10 max-w-4xl">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <Camera className="h-4 w-4" />
                {category || tUi("portfolio.page.gallery")}
              </div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
              {description && <p className="mt-5 max-w-3xl text-base leading-7 text-muted-text sm:text-lg">{description}</p>}
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-muted-text">
                <Images className="h-4 w-4" /> {tUi("portfolio.page.media_count", { count: mediaItems.length })}
              </p>
            </header>

            <section aria-label={tUi("portfolio.page.gallery")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mediaItems.map((media, index) => {
                const isVideo = isVideoMedia(media);
                const parsedVideo = isVideo ? parseVideoUrl(media.url) : null;
                const preview = media.thumbnail_url || media.compressed_url || parsedVideo?.thumbnailUrl || (!isVideo ? media.url : "");
                const responsive = getResponsiveImageAttributes(preview, [480, 768, 1024], "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw", 84);
                return (
                  <button
                    key={media.id || index}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      if (!isVideo) void downloadWatermarkedImage(index);
                    }}
                    className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-sm transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={tUi("portfolio.page.open_media", { index: index + 1 })}
                  >
                    {preview ? (
                      <img
                        src={responsive.src}
                        srcSet={responsive.srcSet}
                        sizes={responsive.sizes}
                        alt={media.alt || media.title || `${title} – ${index + 1}`}
                        loading={index < 3 ? "eager" : "lazy"}
                        decoding="async"
                        draggable={false}
                        onDragStart={(event) => event.preventDefault()}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : <div className="h-full w-full bg-surface" />}
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">{index + 1} / {mediaItems.length}</span>
                    {isVideo && <span className="absolute inset-0 flex items-center justify-center bg-black/15"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-xl"><Play className="ml-0.5 h-5 w-5 fill-current" /></span></span>}
                    {protectedDownloadIndex === index && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white backdrop-blur-sm" role="status">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/75 px-4 py-2 text-xs font-semibold shadow-xl">
                          <LoaderCircle className="h-4 w-4 animate-spin text-cyan-400" />
                          {tUi("portfolio.page.preparing_watermarked_download")}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </section>
          </>
        )}
      </main>
      <Footer settings={settings} />
      {item && lightboxIndex !== null && (
        <PortfolioLightboxModal item={item} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}
