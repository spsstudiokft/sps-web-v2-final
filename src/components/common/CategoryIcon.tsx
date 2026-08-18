import React from "react";
import {
  Info,
  AlertTriangle,
  Tag,
  Percent,
  AlertCircle,
  Sparkles,
  Megaphone,
  Bell,
  Gift,
  ShieldAlert,
  Clock,
  Calendar,
  Zap,
  Flame,
  CheckCircle2,
  Camera,
  HelpCircle,
  Heart,
  BadgePercent,
  Crown,
  Compass,
  Rocket,
  ShoppingBag,
  Ticket,
  Star,
  Award
} from "lucide-react";

export const AVAILABLE_CATEGORY_ICONS: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "tag", label: "Discount Tag", icon: Tag },
  { id: "percent", label: "Percentage", icon: Percent },
  { id: "badge-percent", label: "Badge Promo", icon: BadgePercent },
  { id: "gift", label: "Gift / Deal", icon: Gift },
  { id: "ticket", label: "Ticket / Coupon", icon: Ticket },
  { id: "sparkles", label: "Sparkles / Promo", icon: Sparkles },
  { id: "star", label: "Star / Featured", icon: Star },
  { id: "award", label: "Award / Premium", icon: Award },
  { id: "crown", label: "Crown / VIP", icon: Crown },
  { id: "info", label: "Information", icon: Info },
  { id: "alert-triangle", label: "Warning Triangle", icon: AlertTriangle },
  { id: "alert-circle", label: "Alert Circle", icon: AlertCircle },
  { id: "shield-alert", label: "Security Notice", icon: ShieldAlert },
  { id: "bell", label: "Notification Bell", icon: Bell },
  { id: "megaphone", label: "Announcement", icon: Megaphone },
  { id: "flame", label: "Hot Deal", icon: Flame },
  { id: "zap", label: "Flash Sale / Fast", icon: Zap },
  { id: "clock", label: "Limited Time", icon: Clock },
  { id: "calendar", label: "Scheduled Event", icon: Calendar },
  { id: "camera", label: "Photography / Studio", icon: Camera },
  { id: "check-circle", label: "Verified / Success", icon: CheckCircle2 },
  { id: "help-circle", label: "Help / FAQ", icon: HelpCircle },
  { id: "heart", label: "Special / Loyalty", icon: Heart },
  { id: "rocket", label: "New Launch", icon: Rocket },
  { id: "shopping-bag", label: "Store / Merch", icon: ShoppingBag },
  { id: "compass", label: "Explore", icon: Compass },
];

export function getCategoryIconComponent(iconName?: string): React.ComponentType<{ className?: string }> {
  if (!iconName) return Info;
  const clean = iconName.toLowerCase().trim();
  const matched = AVAILABLE_CATEGORY_ICONS.find(item => item.id === clean);
  if (matched) return matched.icon;

  // Keyword aliases
  if (clean.includes("warn") || clean.includes("caution") || clean.includes("triangle")) return AlertTriangle;
  if (clean.includes("disc") || clean.includes("tag") || clean.includes("offer")) return Tag;
  if (clean.includes("percent") || clean.includes("sale") || clean.includes("deal")) return Percent;
  if (clean.includes("alert") || clean.includes("error") || clean.includes("urgent")) return AlertCircle;
  if (clean.includes("sparkle") || clean.includes("promo") || clean.includes("shine")) return Sparkles;
  if (clean.includes("mega") || clean.includes("broadcast") || clean.includes("horn")) return Megaphone;
  if (clean.includes("bell") || clean.includes("notify")) return Bell;
  if (clean.includes("gift") || clean.includes("present")) return Gift;
  if (clean.includes("clock") || clean.includes("time") || clean.includes("hour")) return Clock;
  if (clean.includes("cal") || clean.includes("event") || clean.includes("date")) return Calendar;
  if (clean.includes("zap") || clean.includes("flash") || clean.includes("bolt")) return Zap;
  if (clean.includes("fire") || clean.includes("flame") || clean.includes("hot")) return Flame;
  if (clean.includes("cam") || clean.includes("photo") || clean.includes("studio")) return Camera;
  if (clean.includes("check") || clean.includes("success")) return CheckCircle2;
  if (clean.includes("star") || clean.includes("badge")) return Star;

  return Info;
}

export function CategoryIcon({
  icon,
  className = "w-4 h-4"
}: {
  icon?: string;
  className?: string;
}) {
  const IconComp = getCategoryIconComponent(icon);
  return <IconComp className={className} />;
}
