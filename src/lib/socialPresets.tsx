import React from "react";
import { SocialPlatformPreset } from "./types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInstagram,
  faFacebook,
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
  faStore
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
  const iconKey = (icon || platform || "").toLowerCase().trim();

  // 1. Group default or specific icon
  if (type === "group") {
    switch (iconKey) {
      case "folder":
        return <FontAwesomeIcon icon={faFolder} className={className} style={{ color }} />;
      case "briefcase":
        return <FontAwesomeIcon icon={faBriefcase} className={className} style={{ color }} />;
      case "message-circle":
      case "messages":
        return <FontAwesomeIcon icon={faComments} className={className} style={{ color }} />;
      case "globe":
        return <FontAwesomeIcon icon={faGlobe} className={className} style={{ color }} />;
      case "camera":
        return <FontAwesomeIcon icon={faCamera} className={className} style={{ color }} />;
      case "video":
        return <FontAwesomeIcon icon={faVideo} className={className} style={{ color }} />;
      case "building":
        return <FontAwesomeIcon icon={faBuilding} className={className} style={{ color }} />;
      case "star":
        return <FontAwesomeIcon icon={faStar} className={className} style={{ color }} />;
      case "compass":
        return <FontAwesomeIcon icon={faCompass} className={className} style={{ color }} />;
      case "share-2":
      case "share":
      default:
        return <FontAwesomeIcon icon={faShareNodes} className={className} style={{ color }} />;
    }
  }

  // 2. Platform brand icons
  switch (iconKey) {
    case "instagram":
      return <FontAwesomeIcon icon={faInstagram} className={className} style={{ color: color || "#E4405F" }} />;
    case "facebook":
      return <FontAwesomeIcon icon={faFacebook} className={className} style={{ color: color || "#1877F2" }} />;
    case "youtube":
      return <FontAwesomeIcon icon={faYoutube} className={className} style={{ color: color || "#FF0000" }} />;
    case "tiktok":
      return <FontAwesomeIcon icon={faTiktok} className={className} style={{ color }} />;
    case "linkedin":
      return <FontAwesomeIcon icon={faLinkedin} className={className} style={{ color: color || "#0A66C2" }} />;
    case "x":
    case "twitter":
      return <FontAwesomeIcon icon={faXTwitter} className={className} style={{ color }} />;
    case "whatsapp":
      return <FontAwesomeIcon icon={faWhatsapp} className={className} style={{ color: color || "#25D366" }} />;
    case "telegram":
      return <FontAwesomeIcon icon={faTelegram} className={className} style={{ color: color || "#229ED9" }} />;
    case "vimeo":
      return <FontAwesomeIcon icon={faVimeoV} className={className} style={{ color: color || "#1AB7EA" }} />;
    case "pinterest":
      return <FontAwesomeIcon icon={faPinterest} className={className} style={{ color: color || "#E60023" }} />;
    case "threads":
      return <FontAwesomeIcon icon={faThreads} className={className} style={{ color }} />;
    case "github":
      return <FontAwesomeIcon icon={faGithub} className={className} style={{ color }} />;
    case "discord":
      return <FontAwesomeIcon icon={faDiscord} className={className} style={{ color: color || "#5865F2" }} />;
    case "behance":
      return <FontAwesomeIcon icon={faBehance} className={className} style={{ color: color || "#1769FF" }} />;
    case "dribbble":
      return <FontAwesomeIcon icon={faDribbble} className={className} style={{ color: color || "#EA4C89" }} />;
    case "email":
    case "mail":
      return <FontAwesomeIcon icon={faEnvelope} className={className} style={{ color: color || "#EA4335" }} />;
    case "phone":
    case "tel":
      return <FontAwesomeIcon icon={faPhone} className={className} style={{ color: color || "#10B981" }} />;
    case "globe":
    case "website":
      return <FontAwesomeIcon icon={faGlobe} className={className} style={{ color: color || "#3B82F6" }} />;
    case "camera":
      return <FontAwesomeIcon icon={faCamera} className={className} style={{ color }} />;
    case "video":
      return <FontAwesomeIcon icon={faVideo} className={className} style={{ color }} />;
    case "image":
      return <FontAwesomeIcon icon={faImage} className={className} style={{ color }} />;
    default:
      return <FontAwesomeIcon icon={faLink} className={className} style={{ color: color || "#6366F1" }} />;
  }
}
