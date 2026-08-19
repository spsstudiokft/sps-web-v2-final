import { useEffect, useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { SiteSettings, SocialTreeNode } from "../../lib/types";
import { LanguageProvider, useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../ThemeProvider";
import { t, tUi } from "../../lib/i18n";
import { Footer } from "./Footer";
import { SocialIconRenderer } from "../../lib/socialPresets";
import { usePageTitle } from "../../hooks/usePageTitle";

const safeUrl = (url?: string | null) => url && /^(https?:|mailto:|tel:)/i.test(url) ? url : "#";

export function ComingSoonPage({ settings }: { settings: SiteSettings }) {
  return <LanguageProvider settings={settings}><ComingSoonContent settings={settings} /></LanguageProvider>;
}

function ComingSoonContent({ settings }: { settings: SiteSettings }) {
  const { currentLang, defaultLang } = useLanguage();
  const { mode } = useTheme();
  const [now, setNow] = useState(Date.now());
  const [socials, setSocials] = useState<SocialTreeNode[]>([]);
  const [logoFailed, setLogoFailed] = useState(false);
  const title = t(settings.coming_soon_title, currentLang, defaultLang) || tUi("coming_soon.default_title", currentLang, "Something new is coming", defaultLang);
  const description = t(settings.coming_soon_description, currentLang, defaultLang) || tUi("coming_soon.default_description", currentLang, "We are preparing a new experience. Please check back soon.", defaultLang);
  const studioName = t(settings.studio_name, currentLang, defaultLang) || "SPS Studio";
  const logo = mode === "dark"
    ? (settings.logo_header_dark || settings.logo_footer_dark || settings.logo_header_light || settings.logo_footer_light)
    : (settings.logo_header_light || settings.logo_footer_light || settings.logo_header_dark || settings.logo_footer_dark);
  const showSocials = settings.coming_soon_show_socials !== "0" && settings.coming_soon_show_socials !== "false";
  const showFooter = settings.coming_soon_show_footer !== "0" && settings.coming_soon_show_footer !== "false";
  const mediaType = settings.coming_soon_media_type || "image";
  const blur = Math.min(30, Math.max(0, Number(settings.coming_soon_blur || 10)));
  const overlay = Math.min(.9, Math.max(0, Number(settings.coming_soon_overlay || .55)));
  usePageTitle(title, studioName);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!showSocials) return;
    fetch("/api/public/social-links")
      .then(response => response.ok ? response.json() : [])
      .then(data => setSocials(Array.isArray(data) ? data.filter(node => node.type === "link" && node.url) : []))
      .catch(() => setSocials([]));
  }, [showSocials]);

  const countdown = useMemo(() => {
    const target = settings.coming_soon_target_at ? new Date(settings.coming_soon_target_at).getTime() : NaN;
    if (!Number.isFinite(target)) return null;
    const remaining = Math.max(0, target - now);
    return {
      days: Math.floor(remaining / 86_400_000),
      hours: Math.floor((remaining / 3_600_000) % 24),
      minutes: Math.floor((remaining / 60_000) % 60),
      seconds: Math.floor((remaining / 1000) % 60),
    };
  }, [settings.coming_soon_target_at, now]);

  const units = countdown ? [
    [countdown.days, tUi("coming_soon.days", currentLang, "Days", defaultLang)],
    [countdown.hours, tUi("coming_soon.hours", currentLang, "Hours", defaultLang)],
    [countdown.minutes, tUi("coming_soon.minutes", currentLang, "Minutes", defaultLang)],
    [countdown.seconds, tUi("coming_soon.seconds", currentLang, "Seconds", defaultLang)],
  ] : [];

  return <div className="min-h-screen bg-background text-text">
    <main className="relative isolate flex min-h-[calc(100svh-13rem)] items-center justify-center overflow-hidden px-4 py-16 sm:px-6">
      {settings.coming_soon_media_url && <div className="absolute -inset-10 -z-20 overflow-hidden bg-slate-950" aria-hidden="true">
        {mediaType === "video"
          ? <video src={settings.coming_soon_media_url} className="h-full w-full scale-110 object-cover" style={{ filter: `blur(${blur}px)` }} autoPlay muted loop playsInline preload="metadata" />
          : <img src={settings.coming_soon_media_url} alt="" className="h-full w-full scale-110 object-cover" style={{ filter: `blur(${blur}px)` }} />}
      </div>}
      <div className="absolute inset-0 -z-10 bg-slate-950" style={{ opacity: settings.coming_soon_media_url ? overlay : .94 }} />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_15%,rgba(72,200,255,.24),transparent_34%),radial-gradient(circle_at_85%_75%,rgba(11,135,235,.2),transparent_38%)]" />
      <section className="w-full max-w-5xl text-center text-white">
        <div className="mx-auto mb-8 flex w-fit items-center justify-center gap-3 rounded-2xl border border-white/15 bg-slate-950/35 px-5 py-3 shadow-2xl backdrop-blur-xl">
          {logo && !logoFailed ? <img src={logo} alt={settings.logo_alt_text || studioName} className="h-8 max-w-[190px] object-contain" onError={() => setLogoFailed(true)} /> : null}
          {(!logo || logoFailed) && <span className="text-lg font-black tracking-tight">{studioName}</span>}
        </div>
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/15 px-4 py-2 text-xs font-black uppercase tracking-[.22em] text-[#8cddff] backdrop-blur-xl"><CalendarClock className="h-4 w-4" />{tUi("coming_soon.eyebrow", currentLang, "Coming soon", defaultLang)}</div>
        <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-black leading-[.98] tracking-[-.05em] sm:text-6xl lg:text-7xl">{title}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">{description}</p>
        {countdown && <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {units.map(([value, label]) => <div key={String(label)} className="rounded-2xl border border-white/15 bg-slate-950/35 px-3 py-5 shadow-xl backdrop-blur-xl"><div className="text-3xl font-black tabular-nums sm:text-4xl">{String(value).padStart(2, "0")}</div><div className="mt-2 text-[10px] font-bold uppercase tracking-[.18em] text-white/55 sm:text-xs">{label}</div></div>)}
        </div>}
        {showSocials && socials.length > 0 && <nav aria-label={tUi("coming_soon.socials", currentLang, "Social media", defaultLang)} className="mt-9 flex flex-wrap justify-center gap-3">
          {socials.map(link => <a key={link.id} href={safeUrl(link.url)} target="_blank" rel="noopener noreferrer" aria-label={link.title} title={link.title} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-slate-950/35 text-white shadow-lg backdrop-blur-xl transition hover:-translate-y-1 hover:border-primary/60 hover:text-primary"><SocialIconRenderer platform={link.platform || link.title} icon={link.icon} type="link" className="h-5 w-5" /></a>)}
        </nav>}
      </section>
    </main>
    {showFooter && <Footer settings={settings} />}
  </div>;
}
