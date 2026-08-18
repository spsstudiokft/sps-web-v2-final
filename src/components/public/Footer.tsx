import React, { useState, useEffect } from "react";
import { SiteSettings, SocialTreeNode } from "../../lib/types";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../ThemeProvider";
import { t, tUi } from "../../lib/i18n";
import { LegalDocumentModal } from "./LegalDocumentModal";
import { Facebook, Github, Globe2, Instagram, Linkedin, MessageCircle, Music2, Youtube } from "lucide-react";

type LegalType = "privacy" | "terms" | "cookies" | "legal_notice";
type LegalDocuments = Record<LegalType, Record<string, { title: string; content: string; updated_at?: string }>>;

export function Footer({ settings }: { settings: SiteSettings }) {
  const { currentLang, defaultLang } = useLanguage();
  const { mode } = useTheme();
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [documents, setDocuments] = useState<LegalDocuments>({ privacy: {}, terms: {}, cookies: {}, legal_notice: {} });
  const [activeDocument, setActiveDocument] = useState<LegalType | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialTreeNode[]>([]);

  // Determine active footer logo based on theme mode, falling back to header logo
  const footerLogo = mode === "dark"
    ? (settings.logo_footer_dark || settings.logo_header_dark || settings.logo_footer_light || settings.logo_header_light)
    : (settings.logo_footer_light || settings.logo_header_light || settings.logo_footer_dark || settings.logo_header_dark);

  const studioName = t(settings.studio_name, currentLang, defaultLang) || "SPS Studio";
  const altText = settings.logo_alt_text || studioName;

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [footerLogo]);

  useEffect(() => {
    fetch("/api/public/legal-documents").then((res) => res.ok ? res.json() : null).then((data) => data && setDocuments((prev) => ({ ...prev, ...data }))).catch(() => {});
    fetch("/api/public/social-links").then((res) => res.ok ? res.json() : []).then((data) => setSocialLinks(Array.isArray(data) ? data.filter((node) => node.type === "link" && node.url) : [])).catch(() => {});
  }, []);

  const socialIcon = (platform = "") => {
    const key = platform.toLowerCase();
    if (key.includes("instagram")) return Instagram;
    if (key.includes("facebook")) return Facebook;
    if (key.includes("youtube")) return Youtube;
    if (key.includes("linkedin")) return Linkedin;
    if (key.includes("github")) return Github;
    if (key.includes("tiktok")) return Music2;
    if (key.includes("messenger") || key.includes("whatsapp")) return MessageCircle;
    return Globe2;
  };

  const safeSocialUrl = (url?: string | null) => url && /^(https?:|mailto:|tel:)/i.test(url) ? url : "#";
  const version = settings.footer_version || "v2.0.0";
  const aiNotice = t(settings.footer_ai_notice, currentLang, defaultLang) || tUi("footer.ai_notice", currentLang, undefined, defaultLang);
  const createdPrefix = t(settings.footer_created_prefix, currentLang, defaultLang) || tUi("footer.created_with", currentLang, undefined, defaultLang);
  const createdSuffix = t(settings.footer_created_suffix, currentLang, defaultLang) || tUi("footer.created_in", currentLang, undefined, defaultLang);

  const legalLinks: Array<{ type: LegalType; labelKey: string }> = [
    { type: "privacy", labelKey: "legal.privacy_policy" },
    { type: "terms", labelKey: "legal.terms_conditions" },
    { type: "cookies", labelKey: "legal.cookie_policy" },
    { type: "legal_notice", labelKey: "legal.legal_notice" },
  ];

  const resolveDocument = (type: LegalType | null) => {
    if (!type) return null;
    const localized = documents[type]?.[currentLang] || documents[type]?.[defaultLang] || documents[type]?.en;
    return localized || Object.values(documents[type] || {})[0] || null;
  };

  const selectedDocument = resolveDocument(activeDocument);

  return (
    <footer className="aero-footer text-white/80 py-14 px-4 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-4 text-center">
        {footerLogo && !logoLoadFailed && (
          <div className="mb-2">
            <img
              src={footerLogo}
              alt={altText}
              className="h-8 md:h-10 max-w-[220px] w-auto object-contain mx-auto brightness-0 invert opacity-90 hover:opacity-100 transition-opacity"
              onError={() => setLogoLoadFailed(true)}
            />
          </div>
        )}
        <p className="text-sm text-background/70 font-medium">
          &copy; {new Date().getFullYear()} {studioName}. {tUi("All rights reserved.", currentLang)}
        </p>
        <nav aria-label={tUi("legal.footer_navigation", currentLang, undefined, defaultLang)} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-1">
          {legalLinks.map((link) => (
            <button key={link.type} type="button" onClick={() => setActiveDocument(link.type)} className="text-xs text-background/60 hover:text-background underline-offset-4 hover:underline transition-colors">
              {tUi(link.labelKey, currentLang, undefined, defaultLang)}
            </button>
          ))}
        </nav>
        {socialLinks.length > 0 && (
          <nav aria-label={tUi("footer.social_links", currentLang, undefined, defaultLang)} className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {socialLinks.map((link) => {
              const Icon = socialIcon(link.platform || link.title);
              return <a key={link.id} href={safeSocialUrl(link.url)} target="_blank" rel="noopener noreferrer" aria-label={link.title} title={link.title} className="aero-footer-social w-10 h-10 rounded-xl border border-white/15 bg-white/8 hover:bg-white/15 hover:border-primary/50 hover:text-primary flex items-center justify-center transition-all"><Icon className="w-4.5 h-4.5" /></a>;
            })}
          </nav>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 pt-2">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold tracking-wider text-primary">{version}</span>
          <p className="max-w-2xl text-[11px] leading-relaxed text-background/55">{aiNotice}</p>
        </div>
        <p className="inline-flex flex-wrap items-center justify-center gap-1.5 text-xs text-background/65">
          <span>{createdPrefix}</span>
          <svg viewBox="-11.5 -10.23174 23 20.46348" aria-label="React" className="w-4 h-4 text-[#61dafb] fill-current"><circle cx="0" cy="0" r="2.05"/><g fill="none" stroke="currentColor" strokeWidth="1"><ellipse rx="11" ry="4.2"/><ellipse rx="11" ry="4.2" transform="rotate(60)"/><ellipse rx="11" ry="4.2" transform="rotate(120)"/></g></svg>
          <span aria-hidden="true">&amp;</span><span role="img" aria-label="heart">❤️</span><span>{createdSuffix}</span><span role="img" aria-label="Hungary">🇭🇺</span>
        </p>
      </div>
      <LegalDocumentModal open={activeDocument !== null} title={selectedDocument?.title || (activeDocument ? tUi(legalLinks.find((link) => link.type === activeDocument)?.labelKey || "legal.legal_notice", currentLang, undefined, defaultLang) : "")} content={selectedDocument?.content || ""} updatedAt={selectedDocument?.updated_at} language={currentLang} defaultLanguage={defaultLang} onClose={() => setActiveDocument(null)} />
    </footer>
  );
}
