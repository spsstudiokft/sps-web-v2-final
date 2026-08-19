import React from "react";
import { SocialPlatformPreset } from "./types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faInstagram,
  faFacebookF,
  faYoutube,
  faTiktok,
  faLinkedin,
  faXTwitter,
  faWhatsapp,
  faTelegram,
  faVimeoV,
  faPinterest,
  faThreads,
  faGithub,
  faDiscord,
  faBehance,
  faDribbble
} from "@fortawesome/free-brands-svg-icons";
import {
  faGlobe,
  faEnvelope,
  faPhone,
  faShareNodes,
  faFolder,
  faBriefcase,
  faComments,
  faCompass,
  faLink,
  faVideo,
  faCamera,
  faImage,
  faStar,
  faBuilding,
  faStore,
  faLayerGroup,
  faWandMagicSparkles
} from "@fortawesome/free-solid-svg-icons";
import {
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Twitter,
  Globe,
  Mail,
  Phone,
  MessageCircle,
  Send,
  Share2,
  Folder,
  Briefcase,
  Layers,
  Sparkles,
  Video,
  Camera,
  Image,
  Star,
  Building,
  Store,
  Compass,
  Link as LinkIcon
} from "lucide-react";

export const SOCIAL_PLATFORMS: SocialPlatformPreset[] = [
  {
    id: "instagram",
    name: "Instagram",
    icon: "instagram",
    color: "#E4405F",
    urlPlaceholder: "https://instagram.com/your_handle",
    defaultBadge: "Daily Shoots"
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "facebook",
    color: "#1877F2",
    urlPlaceholder: "https://facebook.com/your_page",
    defaultBadge: "Community"
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "youtube",
    color: "#FF0000",
    urlPlaceholder: "https://youtube.com/@channel",
    defaultBadge: "4K Tours"
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "tiktok",
    color: "#000000",
    urlPlaceholder: "https://tiktok.com/@handle",
    defaultBadge: "Trending"
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "linkedin",
    color: "#0A66C2",
    urlPlaceholder: "https://linkedin.com/company/handle",
    defaultBadge: "B2B Network"
  },
  {
    id: "x",
    name: "X (Twitter)",
    icon: "x",
    color: "#000000",
    urlPlaceholder: "https://x.com/handle",
    defaultBadge: "Updates"
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: "whatsapp",
    color: "#25D366",
    urlPlaceholder: "https://wa.me/36301234567",
    defaultBadge: "Fast Reply"
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: "telegram",
    color: "#229ED9",
    urlPlaceholder: "https://t.me/channel",
    defaultBadge: "Channel"
  },
  {
    id: "vimeo",
    name: "Vimeo",
    icon: "vimeo",
    color: "#1AB7EA",
    urlPlaceholder: "https://vimeo.com/showcase",
    defaultBadge: "HDR Video"
  },
  {
    id: "pinterest",
    name: "Pinterest",
    icon: "pinterest",
    color: "#E60023",
    urlPlaceholder: "https://pinterest.com/profile",
    defaultBadge: "Moodboard"
  },
  {
    id: "threads",
    name: "Threads",
    icon: "threads",
    color: "#000000",
    urlPlaceholder: "https://threads.net/@handle",
    defaultBadge: ""
  },
  {
    id: "website",
    name: "Website / Portal",
    icon: "globe",
    color: "#3B82F6",
    urlPlaceholder: "https://example.com",
    defaultBadge: "Official"
  },
  {
    id: "email",
    name: "Email / Direct",
    icon: "email",
    color: "#EA4335",
    urlPlaceholder: "mailto:info@spsstudio.com",
    defaultBadge: "Inquiry"
  },
  {
    id: "phone",
    name: "Phone / Hotline",
    icon: "phone",
    color: "#10B981",
    urlPlaceholder: "tel:+36301234567",
    defaultBadge: "Call Us"
  },
  {
    id: "github",
    name: "GitHub",
    icon: "github",
    color: "#24292E",
    urlPlaceholder: "https://github.com/org",
    defaultBadge: "Open Source"
  },
  {
    id: "discord",
    name: "Discord",
    icon: "discord",
    color: "#5865F2",
    urlPlaceholder: "https://discord.gg/invite",
    defaultBadge: "Server"
  },
  {
    id: "behance",
    name: "Behance",
    icon: "behance",
    color: "#1769FF",
    urlPlaceholder: "https://behance.net/portfolio",
    defaultBadge: "Showcase"
  },
  {
    id: "dribbble",
    name: "Dribbble",
    icon: "dribbble",
    color: "#EA4C89",
    urlPlaceholder: "https://dribbble.com/portfolio",
    defaultBadge: "Design"
  },
  {
    id: "custom",
    name: "Custom Channel",
    icon: "link",
    color: "#6366F1",
    urlPlaceholder: "https://...",
    defaultBadge: ""
  }
];

export const GROUP_ICON_OPTIONS = [
  { id: "share-2", label: "Social Network", icon: "share-2" },
  { id: "folder", label: "Folder", icon: "folder" },
  { id: "briefcase", label: "Professional / B2B", icon: "briefcase" },
  { id: "message-circle", label: "Messaging", icon: "message-circle" },
  { id: "layers", label: "Categories / Layers", icon: "layers" },
  { id: "globe", label: "Regional / Web", icon: "globe" },
  { id: "sparkles", label: "Featured Channels", icon: "sparkles" },
  { id: "camera", label: "Photography", icon: "camera" },
  { id: "video", label: "Video Showcase", icon: "video" },
  { id: "building", label: "Real Estate Portals", icon: "building" },
  { id: "star", label: "VIP / Direct", icon: "star" },
  { id: "compass", label: "Explore & Community", icon: "compass" }
];

export const BRAND_COLOR_PRESETS = [
  { name: "Instagram Pink", color: "#E4405F" },
  { name: "Facebook Blue", color: "#1877F2" },
  { name: "YouTube Red", color: "#FF0000" },
  { name: "LinkedIn Blue", color: "#0A66C2" },
  { name: "WhatsApp Green", color: "#25D366" },
  { name: "Telegram Cyan", color: "#229ED9" },
  { name: "Vimeo Aqua", color: "#1AB7EA" },
  { name: "Pinterest Red", color: "#E60023" },
  { name: "Discord Indigo", color: "#5865F2" },
  { name: "Studio Royal Blue", color: "#3B82F6" },
  { name: "Emerald Accent", color: "#10B981" },
  { name: "Warm Amber", color: "#F59E0B" },
  { name: "Purple Luxury", color: "#8B5CF6" },
  { name: "Midnight Black", color: "#1E293B" }
];

export function getPlatformPreset(platformId?: string | null): SocialPlatformPreset {
  if (!platformId) return SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1]; // custom
  const found = SOCIAL_PLATFORMS.find(p => p.id.toLowerCase() === platformId.toLowerCase());
  return found || SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];
}

// Universal Component to render platform or group icon
export function SocialIconRenderer({
  platform,
  icon,
  type = "link",
  className = "w-5 h-5",
  color
}: {
  platform?: string | null;
  icon?: string | null;
  type?: "group" | "link";
  className?: string;
  color?: string;
}) {
  const normalizeIconKey = (value?: string | null) => String(value || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/^(fab|fas|far)[\s:-]+/, "")
    .replace(/^fa[\s:-]+/, "")
    .replace(/^fa-/, "")
    .replace(/^fa(?=[a-z])/, "")
    .replace(/_/g, "-");
  const aliases: Record<string, string> = {
    "facebook-f": "facebook", "facebook-square": "facebook", fb: "facebook", meta: "facebook",
    "instagram-square": "instagram", "youtube-play": "youtube", "linkedin-in": "linkedin",
    "twitter-x": "x", "x-com": "x", "whats-app": "whatsapp", "telegram-plane": "telegram",
    envelope: "email", mail: "email", tel: "phone", website: "globe", "external-link": "link",
    messages: "message-circle", share: "share-2",
  };
  const canonicalize = (key: string) => aliases[key] || key;
  const groupIcons = new Set(["folder", "briefcase", "message-circle", "layers", "globe", "sparkles", "camera", "video", "building", "star", "compass", "share-2"]);
  const linkIcons = new Set(["instagram", "facebook", "youtube", "tiktok", "linkedin", "x", "x-twitter", "twitter", "whatsapp", "telegram", "vimeo", "vimeo-v", "pinterest", "threads", "github", "discord", "behance", "dribbble", "email", "phone", "globe", "camera", "video", "image", "link"]);
  const normalizedIcon = canonicalize(normalizeIconKey(icon));
  const normalizedPlatform = canonicalize(normalizeIconKey(platform));
  const supportedIcons = type === "group" ? groupIcons : linkIcons;
  const iconKey = supportedIcons.has(normalizedIcon)
    ? normalizedIcon
    : (supportedIcons.has(normalizedPlatform) ? normalizedPlatform : (type === "group" ? "share-2" : "link"));
  const explicitColorStyle = color ? { color } : undefined;
  const renderIcon = (definition: IconDefinition) => (
    <span className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`} style={explicitColorStyle} aria-hidden="true" data-social-icon={iconKey}>
      <FontAwesomeIcon icon={definition} className="block h-full w-full" style={{ width: "100%", height: "100%" }} />
    </span>
  );

  // 1. Group default or specific icon
  if (type === "group") {
    switch (iconKey) {
      case "folder":
        return renderIcon(faFolder);
      case "briefcase":
        return renderIcon(faBriefcase);
      case "message-circle":
      case "messages":
        return renderIcon(faComments);
      case "layers":
        return renderIcon(faLayerGroup);
      case "sparkles":
        return renderIcon(faWandMagicSparkles);
      case "globe":
        return renderIcon(faGlobe);
      case "camera":
        return renderIcon(faCamera);
      case "video":
        return renderIcon(faVideo);
      case "building":
        return renderIcon(faBuilding);
      case "star":
        return renderIcon(faStar);
      case "compass":
        return renderIcon(faCompass);
      case "share-2":
      case "share":
      default:
        return renderIcon(faShareNodes);
    }
  }

  // 2. Platform brand icons
  switch (iconKey) {
    case "instagram":
      return renderIcon(faInstagram);
    case "facebook":
      return renderIcon(faFacebookF);
    case "youtube":
      return renderIcon(faYoutube);
    case "tiktok":
      return renderIcon(faTiktok);
    case "linkedin":
      return renderIcon(faLinkedin);
    case "x":
    case "x-twitter":
    case "twitter":
      return renderIcon(faXTwitter);
    case "whatsapp":
      return renderIcon(faWhatsapp);
    case "telegram":
      return renderIcon(faTelegram);
    case "vimeo":
    case "vimeo-v":
      return renderIcon(faVimeoV);
    case "pinterest":
      return renderIcon(faPinterest);
    case "threads":
      return renderIcon(faThreads);
    case "github":
      return renderIcon(faGithub);
    case "discord":
      return renderIcon(faDiscord);
    case "behance":
      return renderIcon(faBehance);
    case "dribbble":
      return renderIcon(faDribbble);
    case "email":
    case "envelope":
    case "mail":
      return renderIcon(faEnvelope);
    case "phone":
    case "tel":
      return renderIcon(faPhone);
    case "globe":
    case "website":
      return renderIcon(faGlobe);
    case "camera":
      return renderIcon(faCamera);
    case "video":
      return renderIcon(faVideo);
    case "image":
      return renderIcon(faImage);
    default:
      return renderIcon(faLink);
  }
}
