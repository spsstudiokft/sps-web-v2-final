import React, { useState, useEffect, useMemo, useRef } from "react";
import { SocialTreeNode } from "../../lib/types";
import { SocialIconRenderer } from "../../lib/socialPresets";
import { useLanguage } from "../../contexts/LanguageContext";
import { 
  X, 
  Search, 
  Share2, 
  Copy, 
  Check, 
  ChevronDown, 
  ArrowUpRight 
} from "lucide-react";

interface SocialPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SocialPopup({ isOpen, onClose }: SocialPopupProps) {
  const { currentLang, defaultLang, tUi } = useLanguage();
  const [nodes, setNodes] = useState<SocialTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroupTab, setActiveGroupTab] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch public social links when modal is opened or mounted
  useEffect(() => {
    let isMounted = true;
    const fetchSocials = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/public/social-links");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setNodes(data);
            // Default expand groups that have is_expanded_default = 1
            const initialExpanded = new Set<string>();
            data.filter(n => n.type === "group" && Number(n.is_expanded_default) === 1).forEach(g => {
              initialExpanded.add(g.id);
            });
            setExpandedGroupIds(initialExpanded);
          }
        }
      } catch (err) {
        console.error("Failed to load public social links:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSocials();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Groups and items tree mapping
  const { groups, childrenMap, standaloneLinks } = useMemo(() => {
    const groupList: SocialTreeNode[] = [];
    const childMap = new Map<string, SocialTreeNode[]>();
    const standalones: SocialTreeNode[] = [];

    nodes.forEach(n => {
      if (n.type === "group") {
        groupList.push(n);
        childMap.set(n.id, []);
      }
    });

    nodes.forEach(n => {
      if (n.type === "link") {
        if (n.parent_id && childMap.has(n.parent_id)) {
          childMap.get(n.parent_id)!.push(n);
        } else {
          standalones.push(n);
        }
      }
    });

    return { groups: groupList, childrenMap: childMap, standaloneLinks: standalones };
  }, [nodes]);

  // Filtered links when searching
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return nodes.filter(n => {
      if (n.type !== "link") return false;
      const titleMatch = n.title?.toLowerCase().includes(q);
      const subMatch = n.subtitle?.toLowerCase().includes(q);
      const platMatch = n.platform?.toLowerCase().includes(q);
      const badgeMatch = n.badge?.toLowerCase().includes(q);
      return Boolean(titleMatch || subMatch || platMatch || badgeMatch);
    });
  }, [nodes, searchQuery]);

  const handleCopyLink = (e: React.MouseEvent, node: SocialTreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (!node.url) return;
    navigator.clipboard.writeText(node.url);
    setCopiedId(node.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  // Localized texts
  const titleText = tUi("social_popup.title", currentLang, undefined, defaultLang) || "Connect with SPS Studio";
  const subtitleText = tUi("social_popup.subtitle", currentLang, undefined, defaultLang) || "Official Channels, Cinematic Portfolios & Instant Messaging";
  const searchPlaceholderText = tUi("social_popup.search_placeholder", currentLang, undefined, defaultLang) || "Search platforms, channels, portfolios...";
  const allChannelsText = tUi("social_popup.all_channels", currentLang, undefined, defaultLang) || "All Channels";
  const loadingText = tUi("social_popup.loading", currentLang, undefined, defaultLang) || "Loading channels...";
  const emptyGroupText = tUi("social_popup.empty_group", currentLang, undefined, defaultLang) || "No links configured in this group yet.";
  const otherChannelsText = tUi("social_popup.other_channels", currentLang, undefined, defaultLang) || "Other Channels";
  const footerBrandText = tUi("social_popup.footer_brand", currentLang, undefined, defaultLang) || "SPS Real Estate Studio";
  const footerTaglineText = tUi("social_popup.footer_tagline", currentLang, undefined, defaultLang) || "Verified Official Profiles";
  const closeText = tUi("social_popup.close", currentLang, undefined, defaultLang) || "Close";
  const onlineText = tUi("social_popup.online", currentLang, undefined, defaultLang) || "Online";

  const totalLinksCount = nodes.filter(n => n.type === "link").length;

  return (
    <div
      id="social-modal-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3.5 sm:p-6 bg-black/75 backdrop-blur-md transition-all duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-popup-title"
      onClick={onClose}
    >
      <div
        id="social-modal-dialog"
        className="relative bg-background border border-border/80 rounded-3xl w-full max-w-xl max-h-[90vh] sm:max-h-[85vh] shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200 z-10 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Popup Header Banner */}
        <div className="relative p-4 sm:p-6 border-b border-border/60 bg-surface/90 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary text-background flex items-center justify-center shadow-md shrink-0">
                <Share2 className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </div>
              <div className="min-w-0">
                <h2 id="social-popup-title" className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-text flex items-center gap-2 truncate">
                  <span className="truncate">{titleText}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title={onlineText} />
                </h2>
                <p className="text-xs sm:text-xs text-muted-text truncate mt-0.5">
                  {subtitleText}
                </p>
              </div>
            </div>

            {/* Visible Top-Right Close Button */}
            <button
              id="social-modal-header-close-btn"
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 text-muted-text hover:text-text rounded-2xl hover:bg-background/90 border border-transparent hover:border-border transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={closeText}
              title={closeText}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Filter Bar */}
          <div className="mt-3.5 sm:mt-4 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholderText}
              className="w-full h-10 pl-9 pr-8 text-xs sm:text-sm rounded-2xl border border-border bg-background/95 text-text placeholder:text-muted-text focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
            />
            <Search className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="p-1 text-muted-text hover:text-text absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full hover:bg-surface"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group Category Tabs (When not searching) */}
          {!searchQuery && groups.length > 1 && (
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setActiveGroupTab("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeGroupTab === "all"
                    ? "bg-primary text-background shadow-xs"
                    : "bg-background/60 text-muted-text hover:text-text hover:bg-background border border-border/50"
                }`}
              >
                {allChannelsText} ({totalLinksCount})
              </button>
              {groups.map((group) => {
                const childCount = childrenMap.get(group.id)?.length || 0;
                const isSelected = activeGroupTab === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setActiveGroupTab(group.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? "bg-primary text-background shadow-xs"
                        : "bg-background/60 text-muted-text hover:text-text hover:bg-background border border-border/50"
                    }`}
                  >
                    <SocialIconRenderer
                      type="group"
                      icon={group.icon}
                      className="w-3.5 h-3.5"
                      color={isSelected ? "currentColor" : group.color || undefined}
                    />
                    <span>{group.title}</span>
                    <span className="opacity-70 text-[10px]">({childCount})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Popup Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 overscroll-contain">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-medium text-muted-text">{loadingText}</p>
            </div>
          ) : searchQuery && searchResults ? (
            /* Search Results View */
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-muted-text uppercase tracking-wider px-1">
                {tUi("social_popup.search_results_found", currentLang, { count: searchResults.length }, defaultLang) || `Found ${searchResults.length} channels`}
              </div>
              {searchResults.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border text-muted-text space-y-1">
                  <p className="text-sm font-medium">
                    {tUi("social_popup.no_results", currentLang, { query: searchQuery }, defaultLang) || `No social channels found matching "${searchQuery}"`}
                  </p>
                </div>
              ) : (
                searchResults.map((link) => (
                  <SocialLinkCard
                    key={link.id}
                    link={link}
                    copiedId={copiedId}
                    onCopyLink={handleCopyLink}
                    currentLang={currentLang}
                    defaultLang={defaultLang}
                  />
                ))
              )}
            </div>
          ) : activeGroupTab !== "all" ? (
            /* Single Selected Tab Group View */
            <div className="space-y-2.5">
              {childrenMap.get(activeGroupTab)?.length === 0 ? (
                <div className="p-8 text-center text-muted-text text-sm">
                  {emptyGroupText}
                </div>
              ) : (
                childrenMap.get(activeGroupTab)?.map((link) => (
                  <SocialLinkCard
                    key={link.id}
                    link={link}
                    copiedId={copiedId}
                    onCopyLink={handleCopyLink}
                    currentLang={currentLang}
                    defaultLang={defaultLang}
                  />
                ))
              )}
            </div>
          ) : (
            /* Full Hierarchical Tree View */
            <div className="space-y-4">
              {/* 1. Nested Groups Accordions */}
              {groups.map((group) => {
                const groupLinks = childrenMap.get(group.id) || [];
                if (groupLinks.length === 0) return null;
                const isExpanded = expandedGroupIds.has(group.id);

                return (
                  <div
                    key={group.id}
                    className="rounded-3xl border border-border/80 bg-surface/40 overflow-hidden transition-all shadow-2xs"
                  >
                    {/* Group Header Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand(group.id)}
                      className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left hover:bg-surface/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: group.color || "#3B82F6" }}
                        >
                          <SocialIconRenderer
                            type="group"
                            icon={group.icon}
                            className="w-4 h-4 text-white"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-text truncate">
                              {group.title}
                            </span>
                            {group.badge && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                {group.badge}
                              </span>
                            )}
                          </div>
                          {group.subtitle && (
                            <div className="text-xs text-muted-text truncate mt-0.5">
                              {group.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-text font-medium px-2 py-0.5 rounded-full bg-background border border-border">
                          {groupLinks.length}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-text transition-transform duration-200 ${
                            isExpanded ? "rotate-180 text-primary" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* Group Nested Links List */}
                    {isExpanded && (
                      <div className="p-3 sm:p-4 bg-background/50 border-t border-border/50 space-y-2">
                        {groupLinks.map((link) => (
                          <SocialLinkCard
                            key={link.id}
                            link={link}
                            copiedId={copiedId}
                            onCopyLink={handleCopyLink}
                            isNested={true}
                            currentLang={currentLang}
                            defaultLang={defaultLang}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 2. Standalone Root Links (if any) */}
              {standaloneLinks.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-text px-1">
                    {otherChannelsText}
                  </div>
                  {standaloneLinks.map((link) => (
                    <SocialLinkCard
                      key={link.id}
                      link={link}
                      copiedId={copiedId}
                      onCopyLink={handleCopyLink}
                      currentLang={currentLang}
                      defaultLang={defaultLang}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Popup Footer */}
        <div className="p-3.5 sm:p-4 border-t border-border/60 bg-surface/70 flex items-center justify-between text-xs text-muted-text shrink-0">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="font-semibold text-text truncate">{footerBrandText}</span>
            <span>·</span>
            <span className="truncate hidden sm:inline">{footerTaglineText}</span>
          </div>

          {/* Visible Footer Close Button */}
          <button
            id="social-modal-footer-close-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface hover:bg-background border border-border text-text font-semibold transition-all hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          >
            {closeText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponent: Clickable Social Link Card
// ----------------------------------------------------------------------
function SocialLinkCard({
  link,
  copiedId,
  onCopyLink,
  isNested = false,
  currentLang,
  defaultLang,
}: {
  link: SocialTreeNode;
  copiedId: string | null;
  onCopyLink: (e: React.MouseEvent, node: SocialTreeNode) => void;
  isNested?: boolean;
  currentLang: string;
  defaultLang: string;
}) {
  const { tUi } = useLanguage();
  const isCopied = copiedId === link.id;

  const copyLabel = isCopied 
    ? (tUi("social_popup.copied", currentLang, undefined, defaultLang) || "Copied to clipboard!")
    : (tUi("social_popup.copy_link", currentLang, undefined, defaultLang) || "Copy profile link");
  const openLabel = tUi("social_popup.open_link", currentLang, undefined, defaultLang) || "Open link";

  return (
    <a
      href={link.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all pointer-events-auto cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isNested
          ? "bg-background/90 border-border/80 hover:border-primary/50 hover:bg-surface hover:shadow-xs"
          : "bg-surface/70 border-border hover:border-primary/50 hover:bg-surface hover:shadow-xs"
      }`}
      aria-label={`${link.title} - ${openLabel}`}
    >
      <div className="flex items-center gap-3 min-w-0 mr-2 flex-1">
        {/* Brand Icon */}
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform"
          style={{ backgroundColor: link.color || "#E4405F" }}
        >
          <SocialIconRenderer
            platform={link.platform}
            icon={link.icon}
            type="link"
            className="w-5 h-5 text-white"
          />
        </div>

        {/* Title & Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-text group-hover:text-primary transition-colors truncate">
              {link.title}
            </span>
            {link.badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                {link.badge}
              </span>
            )}
          </div>
          {link.subtitle ? (
            <div className="text-xs text-muted-text truncate mt-0.5">{link.subtitle}</div>
          ) : link.url ? (
            <div className="text-xs text-muted-text/80 truncate mt-0.5">{link.url}</div>
          ) : null}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Copy Link Button */}
        {link.url && (
          <button
            type="button"
            onClick={(e) => onCopyLink(e, link)}
            className="p-2 rounded-xl text-muted-text hover:text-text hover:bg-background border border-transparent hover:border-border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title={copyLabel}
            aria-label={copyLabel}
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* External Link Arrow */}
        <div 
          className="w-8 h-8 rounded-xl bg-background group-hover:bg-primary group-hover:text-background text-muted-text flex items-center justify-center border border-border/80 group-hover:border-primary transition-all shadow-2xs"
          title={openLabel}
        >
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
    </a>
  );
}
