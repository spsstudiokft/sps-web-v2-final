import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../ThemeProvider";
import { useLanguage } from "../../contexts/LanguageContext";
import { cn } from "../../lib/utils";
import { 
  LayoutDashboard, 
  Image as ImageIcon, 
  MessageSquare, 
  Users, 
  UserPlus,
  Settings as SettingsIcon, 
  LogOut, 
  Sun, 
  Moon, 
  Globe,
  Target,
  UserCheck,
  FolderKanban,
  Sparkles,
  HelpCircle,
  FolderTree,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Menu,
  Languages,
  Palette,
  Share2,
  Tag,
  Megaphone,
  Wallet,
  Receipt,
  Send,
  Gift,
  Mail,
  LucideIcon
} from "lucide-react";

export interface SubNavItem {
  to: string;
  label: string;
  translationKey: string;
  icon: LucideIcon;
  badge?: string | number;
}

export interface NavItemConfig {
  to: string;
  label: string;
  translationKey: string;
  icon: LucideIcon;
  badge?: string | number;
  subItems?: SubNavItem[];
  roles?: string[];
}

export interface NavSectionConfig {
  id: string;
  title: string;
  translationKey: string;
  items: NavItemConfig[];
}

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { mode, setMode } = useTheme();
  const { currentLang, setLang, supportedLangs, tUi } = useLanguage();

  // Desktop sidebar collapsed (icon-only) state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("admin_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Nav item groups with translation keys
  const navSections: NavSectionConfig[] = [
    {
      id: "overview",
      title: "Overview",
      translationKey: "admin.nav.overview",
      items: [
        { to: "/admin", label: "Dashboard", translationKey: "admin.nav.dashboard", icon: LayoutDashboard },
        { to: "/admin/budget", label: "Budget Manager", translationKey: "admin.nav.budget", icon: Wallet },
        { to: "/admin/budget?tab=invoices", label: "Invoices & Payments", translationKey: "admin.nav.invoices", icon: Receipt },
        { to: "/admin/budget?tab=payment-requests", label: "Payment Requests", translationKey: "admin.nav.payment_requests", icon: Send }
      ]
    },
    {
      id: "content",
      title: "Content",
      translationKey: "admin.nav.content",
      items: [
        { to: "/admin/portfolio", label: "Portfolio", translationKey: "admin.nav.portfolio", icon: ImageIcon },
        { to: "/admin/projects", label: "Projects", translationKey: "admin.nav.projects", icon: FolderKanban },
        { to: "/admin/services", label: "Services", translationKey: "admin.nav.services", icon: Sparkles },
        { to: "/admin/pricing", label: "Pricing & Packages", translationKey: "admin.nav.pricing", icon: Tag },
        { to: "/admin/info-bar", label: "Announcement Bar", translationKey: "admin.nav.info_bar", icon: Megaphone },
        { to: "/admin/social-links", label: "Social Popup Tree", translationKey: "admin.nav.social_links", icon: Share2 },
        { 
          to: "/admin/faqs", 
          label: "FAQs & Help", 
          translationKey: "admin.nav.faqs",
          icon: HelpCircle,
          subItems: [
            { to: "/admin/faqs", label: "Questions & Answers", translationKey: "admin.nav.faq_questions", icon: HelpCircle },
            { to: "/admin/faqs/categories", label: "FAQ Categories", translationKey: "admin.nav.faq_categories", icon: FolderTree },
          ]
        },
      ]
    },
    {
      id: "users-clients",
      title: "Users & Clients",
      translationKey: "admin.nav.users_clients",
      items: [
        { to: "/admin/team", label: "Team & Invites", translationKey: "admin.nav.team_invites", icon: UserPlus },
        { to: "/admin/referrals", label: "VIP Referral Program", translationKey: "admin.nav.referrals", icon: Gift },
        { to: "/admin/leads", label: "Leads Pipeline", translationKey: "admin.nav.leads", icon: Target },
        { to: "/admin/customers", label: "Customers", translationKey: "admin.nav.customers", icon: UserCheck },
        { to: "/admin/clients", label: "Client Portal Users", translationKey: "admin.nav.clients", icon: Users },
        { to: "/admin/contacts", label: "Submissions", translationKey: "admin.nav.submissions", icon: MessageSquare },
        { to: "/admin/marketing-emails", label: "Marketing Emails", translationKey: "admin.nav.marketing_emails", icon: Mail },
      ]
    },
    {
      id: "settings",
      title: "Settings & System",
      translationKey: "admin.nav.settings_system",
      items: [
        { to: "/admin/themes", label: "Theme & Branding", translationKey: "admin.nav.themes", icon: Palette },
        { to: "/admin/settings", label: "Site Settings", translationKey: "admin.nav.settings", icon: SettingsIcon },
      ]
    }
  ];

  // State to track expanded submenus
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (location.pathname.startsWith("/admin/faqs")) {
      initial["/admin/faqs"] = true;
    }
    return initial;
  });

  // Automatically expand parent menu if current location matches any child
  useEffect(() => {
    navSections.forEach((section) => {
      section.items.forEach((link) => {
        if (link.subItems) {
          const isChildActive = link.subItems.some(
            (sub) => location.pathname === sub.to || location.pathname.startsWith(`${sub.to}/`)
          );
          if (isChildActive) {
            setExpandedMenus((prev) => ({ ...prev, [link.to]: true }));
          }
        }
      });
    });
  }, [location.pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (onMobileClose) {
      onMobileClose();
    }
  }, [location.pathname]);

  const toggleSubmenu = (to: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedMenus((prev) => ({ ...prev, [to]: !prev[to] }));
  };

  // Filter sections by role if specified
  const filteredSections = navSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!item.roles || item.roles.length === 0) return true;
      return user?.role && item.roles.includes(user.role);
    })
  })).filter((section) => section.items.length > 0);

  const isLinkActive = (to: string) => {
    if (to === "/admin") {
      return location.pathname === "/admin";
    }
    const [toPath, toQuery] = to.split("?");
    if (toQuery) {
      return location.pathname === toPath && location.search.includes(toQuery);
    }
    if (location.pathname === toPath) {
      if (toPath === "/admin/budget" && location.search.includes("tab=invoices")) {
        return false;
      }
      return true;
    }
    return location.pathname.startsWith(`${toPath}/`);
  };

  const sidebarContent = (
    <div className="aero-admin-sidebar flex flex-col h-full bg-background text-text select-none">
      {/* Header / Brand */}
      <div className={cn(
        "p-4 border-b border-border flex items-center justify-between shrink-0",
        isCollapsed ? "justify-center" : "px-5"
      )}>
        <Link 
          to="/admin" 
          className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg group min-w-0"
          title="Studio Admin"
        >
          <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-xs transition-transform group-hover:scale-105 shrink-0">
            SP
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-text tracking-tight leading-none truncate">
                {tUi("Admin Panel") || "Studio Admin"}
              </h1>
              <span className="text-[11px] text-muted-text font-medium">
                {tUi("admin.nav.control_panel") || "Control Panel"}
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden md:flex p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-surface transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={isCollapsed ? (tUi("admin.nav.expand_sidebar") || "Expand Sidebar") : (tUi("admin.nav.collapse_sidebar") || "Collapse Sidebar")}
          aria-label={isCollapsed ? (tUi("admin.nav.expand_sidebar") || "Expand Sidebar") : (tUi("admin.nav.collapse_sidebar") || "Collapse Sidebar")}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        {/* Mobile Close Button */}
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-surface transition-colors focus:outline-none"
            aria-label="Close Navigation"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Main Categorized Navigation List */}
      <nav 
        className="flex-1 px-3 py-3 space-y-5 overflow-y-auto overflow-x-hidden scrollbar-thin" 
        aria-label="Admin Categorized Navigation"
      >
        {filteredSections.map((section, sIdx) => {
          const sectionTitle = tUi(section.translationKey) || section.title;

          return (
            <div key={section.id} className="space-y-1">
              {/* Section Header / Label */}
              {!isCollapsed ? (
                <div className="px-3 pt-1 pb-1 flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-text/80 truncate">
                    {sectionTitle}
                  </span>
                  <div className="h-[1px] flex-1 bg-border/40 ml-2.5" />
                </div>
              ) : (
                sIdx > 0 && <div className="my-2 border-t border-border/60 mx-2" />
              )}

              {/* Section Items */}
              <div className="space-y-1">
                {section.items.map((link) => {
                  const hasSubItems = Boolean(link.subItems && link.subItems.length > 0);
                  const isExpanded = expandedMenus[link.to] ?? false;

                  const isParentActive = isLinkActive(link.to);

                  const Icon = link.icon;
                  const itemLabel = tUi(link.translationKey) || link.label;

                  return (
                    <div key={link.to} className="space-y-1">
                      <div className="flex items-center group">
                        <Link
                          to={link.to}
                          title={isCollapsed ? itemLabel : undefined}
                          className={cn(
                            "aero-sidebar-item flex-1 flex items-center py-2.5 text-sm font-medium rounded-xl transition-all duration-150 relative",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            isCollapsed ? "px-0 justify-center" : "px-3.5",
                            isParentActive && !hasSubItems
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : isParentActive && hasSubItems
                              ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                              : "text-muted-text hover:text-text hover:bg-surface"
                          )}
                          aria-current={isParentActive ? "page" : undefined}
                        >
                          <Icon 
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              !isCollapsed && "mr-3",
                              isParentActive && !hasSubItems 
                                ? "text-primary-foreground" 
                                : isParentActive && hasSubItems
                                ? "text-primary"
                                : "text-muted-text group-hover:text-text"
                            )} 
                            aria-hidden="true" 
                          />
                          {!isCollapsed && (
                            <span className="truncate">{itemLabel}</span>
                          )}
                          {!isCollapsed && link.badge !== undefined && (
                            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface border border-border text-muted-text">
                              {link.badge}
                            </span>
                          )}
                        </Link>

                        {hasSubItems && !isCollapsed && (
                          <button
                            type="button"
                            onClick={(e) => toggleSubmenu(link.to, e)}
                            className={cn(
                              "p-2 ml-1 rounded-lg text-muted-text hover:text-text hover:bg-surface transition-colors",
                              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            )}
                            aria-label={`Toggle ${itemLabel} Submenu`}
                            aria-expanded={isExpanded}
                          >
                            <ChevronDown 
                              className={cn(
                                "h-3.5 w-3.5 transition-transform duration-200",
                                isExpanded ? "rotate-180 text-primary" : "text-muted-text"
                              )} 
                              aria-hidden="true" 
                            />
                          </button>
                        )}
                      </div>

                      {/* Nested Submenu */}
                      {hasSubItems && isExpanded && link.subItems && !isCollapsed && (
                        <div 
                          className="ml-4 pl-3.5 border-l-2 border-border/80 space-y-1 py-1 transition-all"
                          role="group"
                          aria-label={`${itemLabel} sub-items`}
                        >
                          {link.subItems.map((sub) => {
                            const isSubActive = isLinkActive(sub.to);
                            const SubIcon = sub.icon;
                            const subLabel = tUi(sub.translationKey) || sub.label;

                            return (
                              <Link
                                key={sub.to}
                                to={sub.to}
                                className={cn(
                                  "aero-sidebar-item aero-sidebar-subitem flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150",
                                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                                  isSubActive
                                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                    : "text-muted-text hover:text-text hover:bg-surface"
                                )}
                                aria-current={isSubActive ? "page" : undefined}
                              >
                                <SubIcon 
                                  className={cn(
                                    "mr-2.5 h-3.5 w-3.5 shrink-0",
                                    isSubActive ? "text-primary-foreground" : "text-muted-text"
                                  )} 
                                  aria-hidden="true" 
                                />
                                <span className="truncate">{subLabel}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer Controls */}
      <div className="p-3 border-t border-border space-y-1.5 bg-background shrink-0">
        
        {/* Language Selector Dropdown */}
        {supportedLangs.length > 1 && (
          <div className={cn(
            "flex items-center w-full py-1.5 text-xs rounded-xl bg-surface/50 border border-border transition-all",
            isCollapsed ? "justify-center px-1" : "px-3 justify-between"
          )}>
            <div className="flex items-center gap-2 min-w-0">
              <Languages className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
              {!isCollapsed && (
                <span className="text-[11px] font-semibold text-muted-text truncate">Language:</span>
              )}
            </div>
            
            <select
              value={currentLang}
              onChange={(e) => setLang(e.target.value)}
              className={cn(
                "bg-transparent text-xs font-semibold text-text focus:outline-none cursor-pointer",
                isCollapsed ? "w-6 text-center" : "max-w-[100px] truncate text-right"
              )}
              aria-label="Change Language"
            >
              {supportedLangs.map((lang) => {
                const isEnabled = lang.enabled !== false;
                return (
                  <option key={lang.code} value={lang.code} className="bg-background text-text">
                    {isCollapsed 
                      ? lang.code.toUpperCase() 
                      : isEnabled 
                        ? (lang.name || lang.code) 
                        : `${lang.name || lang.code} (Disabled)`}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Theme Mode Toggle Button */}
        <button
          id="theme-toggle-btn"
          type="button"
          onClick={() => setMode(mode === "dark" ? "light" : "dark")}
          className={cn(
            "aero-sidebar-item flex items-center w-full py-2 text-xs font-medium text-muted-text hover:text-text hover:bg-surface rounded-xl border border-transparent hover:border-border transition-all",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background group",
            isCollapsed ? "px-0 justify-center" : "px-3 justify-between"
          )}
          title={isCollapsed ? `Switch to ${mode === "dark" ? "Light" : "Dark"} Mode` : undefined}
          aria-label={`Switch to ${mode === "dark" ? "Light" : "Dark"} Mode`}
        >
          <div className="flex items-center gap-2.5">
            {mode === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400 group-hover:rotate-45 transition-transform" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-primary group-hover:-rotate-12 transition-transform" aria-hidden="true" />
            )}
            {!isCollapsed && (
              <span className="font-medium text-text">
                {mode === "dark" ? (tUi("admin.nav.light_mode") || "Light Mode") : (tUi("admin.nav.dark_mode") || "Dark Mode")}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono uppercase bg-surface border border-border text-muted-text">
              {mode}
            </span>
          )}
        </button>

        {/* View Site Link */}
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "aero-sidebar-item flex items-center w-full py-2 text-xs font-medium text-muted-text hover:text-text hover:bg-surface rounded-xl border border-transparent hover:border-border transition-all",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background group",
            isCollapsed ? "px-0 justify-center" : "px-3"
          )}
          title={isCollapsed ? (tUi("admin.nav.view_site") || "View Live Site") : undefined}
        >
          <Globe className={cn("h-4 w-4 text-muted-text group-hover:text-primary transition-colors", !isCollapsed && "mr-2.5")} aria-hidden="true" />
          {!isCollapsed && <span>{tUi("admin.nav.view_site") || "View Live Site"}</span>}
        </Link>

        {/* Sign Out Button */}
        <button
          id="admin-logout-btn"
          type="button"
          onClick={logout}
          className={cn(
            "aero-sidebar-item aero-sidebar-danger flex items-center w-full py-2 text-xs font-medium text-muted-text hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background group",
            isCollapsed ? "px-0 justify-center" : "px-3"
          )}
          title={isCollapsed ? (tUi("admin.nav.sign_out") || "Sign Out") : undefined}
        >
          <LogOut className={cn("h-4 w-4 text-muted-text group-hover:text-red-500 transition-colors", !isCollapsed && "mr-2.5")} aria-hidden="true" />
          {!isCollapsed && <span>{tUi("admin.nav.sign_out") || "Sign Out"}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside 
        id="admin-sidebar" 
        className={cn(
          "hidden md:flex flex-col h-full border-r border-border transition-[width] duration-200 shrink-0",
          isCollapsed ? "w-18" : "w-64"
        )}
        aria-label="Admin Navigation Sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={onMobileClose}
          aria-hidden="true"
        >
          <div 
            className="w-72 h-full max-w-[85vw] bg-background shadow-2xl animate-in slide-in-from-left duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Admin Navigation"
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
