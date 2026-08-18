import React from "react";
import {
  Camera,
  Video,
  Plane,
  Armchair,
  Ruler,
  Moon,
  Sun,
  Sparkles,
  Wand2,
  Home,
  Building,
  Building2,
  Eye,
  Layers,
  Box,
  Award,
  Star,
  Shield,
  Zap,
  Clock,
  MapPin,
  Palette,
  Scan,
  Compass,
  Film,
  Maximize2,
  Grid,
  Image as ImageIcon
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faCamera, 
  faVideo, 
  faHelicopter, 
  faCouch, 
  faRulerCombined, 
  faMoon, 
  faSun, 
  faBuilding, 
  faHome, 
  faEye, 
  faLayerGroup, 
  faSparkles,
  faStar,
  faAward
} from "@fortawesome/free-solid-svg-icons";

export interface ServiceIconOption {
  id: string;
  name: string;
  category: string;
}

export const AVAILABLE_SERVICE_ICONS: ServiceIconOption[] = [
  { id: "camera", name: "Camera (Photography)", category: "Media" },
  { id: "video", name: "Video (Tours & Walkthroughs)", category: "Media" },
  { id: "film", name: "Cinematic Film", category: "Media" },
  { id: "helicopter", name: "Drone / Helicopter Aerial", category: "Aerial" },
  { id: "plane", name: "Aerial Perspectives", category: "Aerial" },
  { id: "couch", name: "Virtual Staging / Interior", category: "Interior" },
  { id: "home", name: "Residential Property", category: "Property" },
  { id: "building", name: "Commercial Architecture", category: "Property" },
  { id: "ruler", name: "Floor Plans & Measurements", category: "Drafting" },
  { id: "grid", name: "Grid Layout & 2D Plans", category: "Drafting" },
  { id: "moon", name: "Twilight / Evening", category: "Lighting" },
  { id: "sun", name: "Daylight & Golden Hour", category: "Lighting" },
  { id: "sparkles", name: "Enhancement & Retouching", category: "Creative" },
  { id: "wand", name: "AI Virtual Magic", category: "Creative" },
  { id: "eye", name: "3D Virtual Tour / VR", category: "Interactive" },
  { id: "box", name: "3D Model / Matterport", category: "Interactive" },
  { id: "layers", name: "Multi-Asset Bundles", category: "Packages" },
  { id: "award", name: "Premium VIP Tier", category: "Branding" },
  { id: "star", name: "Featured Showcase", category: "Branding" },
  { id: "shield", name: "Certified Quality", category: "Branding" },
  { id: "zap", name: "24h Express Turnaround", category: "Speed" },
  { id: "clock", name: "Flexible Scheduling", category: "Speed" },
  { id: "palette", name: "Color Grading & Style", category: "Creative" },
  { id: "compass", name: "Site Context & Map", category: "Aerial" },
  { id: "scan", name: "LiDAR & Laser Scan", category: "Drafting" },
  { id: "image", name: "Editorial Stills", category: "Media" }
];

interface ServiceIconProps {
  icon?: string | null;
  imageUrl?: string | null;
  className?: string;
  size?: number;
}

export function ServiceIcon({ icon, imageUrl, className = "w-6 h-6", size = 24 }: ServiceIconProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={`object-cover rounded-md ${className}`}
        style={{ width: size, height: size }}
        onError={(e) => {
          // If image fails, hide image element
          (e.target as HTMLElement).style.display = "none";
        }}
      />
    );
  }

  const normalized = (icon || "camera").toLowerCase().trim();

  // FontAwesome direct name matches for backward compatibility
  if (normalized === "facamera") return <FontAwesomeIcon icon={faCamera} className={className} />;
  if (normalized === "favideo") return <FontAwesomeIcon icon={faVideo} className={className} />;
  if (normalized === "fahelicopter") return <FontAwesomeIcon icon={faHelicopter} className={className} />;
  if (normalized === "facouch") return <FontAwesomeIcon icon={faCouch} className={className} />;
  if (normalized === "farulercombined") return <FontAwesomeIcon icon={faRulerCombined} className={className} />;
  if (normalized === "famoon") return <FontAwesomeIcon icon={faMoon} className={className} />;
  if (normalized === "fasun") return <FontAwesomeIcon icon={faSun} className={className} />;

  switch (normalized) {
    case "camera":
    case "photo":
    case "photography":
      return <Camera className={className} size={size} />;
    case "video":
    case "videography":
    case "tour":
      return <Video className={className} size={size} />;
    case "film":
    case "cinematic":
      return <Film className={className} size={size} />;
    case "helicopter":
      return <FontAwesomeIcon icon={faHelicopter} className={className} />;
    case "drone":
    case "aerial":
    case "plane":
      return <Plane className={className} size={size} />;
    case "couch":
    case "staging":
    case "interior":
    case "furniture":
      return <Armchair className={className} size={size} />;
    case "ruler":
    case "floorplan":
    case "floorplans":
    case "measure":
      return <Ruler className={className} size={size} />;
    case "grid":
    case "layout":
      return <Grid className={className} size={size} />;
    case "moon":
    case "twilight":
    case "evening":
    case "night":
      return <Moon className={className} size={size} />;
    case "sun":
    case "daylight":
    case "goldenhour":
      return <Sun className={className} size={size} />;
    case "sparkles":
    case "enhancement":
      return <Sparkles className={className} size={size} />;
    case "wand":
    case "ai":
    case "magic":
      return <Wand2 className={className} size={size} />;
    case "home":
    case "residential":
    case "house":
      return <Home className={className} size={size} />;
    case "building":
    case "commercial":
    case "estate":
      return <Building className={className} size={size} />;
    case "building2":
      return <Building2 className={className} size={size} />;
    case "eye":
    case "vr":
    case "virtual":
      return <Eye className={className} size={size} />;
    case "box":
    case "3d":
    case "matterport":
      return <Box className={className} size={size} />;
    case "layers":
    case "bundle":
    case "packages":
      return <Layers className={className} size={size} />;
    case "award":
    case "vip":
      return <Award className={className} size={size} />;
    case "star":
    case "showcase":
      return <Star className={className} size={size} />;
    case "shield":
    case "quality":
      return <Shield className={className} size={size} />;
    case "zap":
    case "express":
    case "fast":
      return <Zap className={className} size={size} />;
    case "clock":
    case "time":
      return <Clock className={className} size={size} />;
    case "palette":
    case "color":
      return <Palette className={className} size={size} />;
    case "compass":
    case "location":
      return <Compass className={className} size={size} />;
    case "scan":
    case "lidar":
      return <Scan className={className} size={size} />;
    case "image":
    case "gallery":
      return <ImageIcon className={className} size={size} />;
    default:
      return <Camera className={className} size={size} />;
  }
}
