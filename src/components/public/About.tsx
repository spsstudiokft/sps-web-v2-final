import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { SiteSettings } from "../../lib/types";
import { useLanguage } from "../../contexts/LanguageContext";
import { t, tUi } from "../../lib/i18n";
import { parseSectionMedia } from "../../lib/sectionMedia";

export function About({ settings }: { settings: SiteSettings }) {
  const { currentLang, defaultLang } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const aboutMedia = parseSectionMedia(settings.section_media).about || {};
  const aboutImage = aboutMedia.contentImageUrl
    || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1000";
  const aboutVideo = aboutMedia.contentVideoUrl;
  const frameAspect = aboutVideo
    ? (aboutMedia.contentVideoAspect === "landscape" ? "aspect-video" : "aspect-[9/16]")
    : "aspect-[4/5] md:aspect-square";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = 0.5;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [aboutVideo]);

  const toggleVideoPlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = 0.5;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      video.pause();
    }
  };
  return (
    <section
      id="about" 
      data-gsap-reveal
      className="aero-section aero-about scroll-mt-20 py-24 md:py-32"
    >
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div className="aero-copy-card">
          <h2 className="text-4xl font-bold tracking-tight mb-6">{tUi("about.title", currentLang, undefined, defaultLang)}</h2>
          <p className="text-lg text-muted-text leading-relaxed mb-8">
            {t(settings.about_text, currentLang, defaultLang) || tUi("about.subtitle", currentLang, undefined, defaultLang)}
          </p>
        </div>
        <div className={`aero-media-frame group ${frameAspect} overflow-hidden relative`}>
          {aboutVideo ? (
            <>
              <video
                ref={videoRef}
                src={aboutVideo}
                playsInline
                preload="metadata"
                className="h-full w-full object-cover object-center transition-[filter,transform] duration-500 ease-out group-hover:scale-[1.025] group-hover:brightness-105"
                aria-label={tUi("about.title", currentLang, undefined, defaultLang)}
              />
              <button
                type="button"
                onClick={toggleVideoPlayback}
                aria-label={isPlaying ? "Videó szüneteltetése" : "Videó lejátszása"}
                className="absolute inset-0 flex items-center justify-center bg-slate-950/10 transition-colors duration-300 hover:bg-slate-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-slate-950/65 text-white shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                  {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="ml-0.5 h-6 w-6 fill-current" />}
                </span>
              </button>
            </>
          ) : (
            <img
              src={aboutImage}
              alt={tUi("about.title", currentLang, undefined, defaultLang)}
              className="w-full h-full object-cover object-center transition-[filter,transform] duration-500 ease-out group-hover:scale-[1.025] group-hover:brightness-105"
            />
          )}
        </div>
      </div>
    </section>
  );
}
