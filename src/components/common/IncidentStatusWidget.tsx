import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertOctagon, 
  AlertTriangle, 
  AlertCircle, 
  Wrench, 
  X, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Clock,
  Radio,
  Layers,
  Minimize2,
  Maximize2
} from "lucide-react";
import { useIncidentStatus } from "../../hooks/useIncidentStatus";
import { OverallStatusType, IncidentIoIncident, IncidentIoMaintenance } from "../../types/status";
import { useLanguage } from "../../contexts/LanguageContext";

interface StatusVisualConfig {
  labelKey: string;
  defaultLabel: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  cardBg: string;
  cardBorder: string;
  accentText: string;
  icon: React.ReactNode;
}

export function IncidentStatusWidget() {
  const { tUi } = useLanguage();
  const {
    summary,
    overallStatus,
    ongoingIncidents,
    inProgressMaintenances,
    isVisible,
    lastUpdated,
    dismiss,
    refetch,
    isLoading,
    statusPageUrl
  } = useIncidentStatus();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Status visual mapping with high-contrast accessibility and theme matching
  const getVisualConfig = (status: OverallStatusType): StatusVisualConfig => {
    switch (status) {
      case "major_outage":
        return {
          labelKey: "status_widget.major_outage",
          defaultLabel: "Major Outage",
          badgeBg: "bg-red-600 dark:bg-red-500",
          badgeText: "text-white",
          dotColor: "bg-red-500",
          cardBg: "bg-surface/95 dark:bg-slate-900/95",
          cardBorder: "border-red-500/40 dark:border-red-500/50 shadow-red-500/10",
          accentText: "text-red-600 dark:text-red-400",
          icon: <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
        };
      case "partial_outage":
        return {
          labelKey: "status_widget.partial_outage",
          defaultLabel: "Partial Outage",
          badgeBg: "bg-sky-500 dark:bg-sky-400",
          badgeText: "text-white",
          dotColor: "bg-sky-500",
          cardBg: "bg-surface/95 dark:bg-slate-900/95",
          cardBorder: "border-sky-500/40 dark:border-sky-400/50 shadow-sky-500/10",
          accentText: "text-sky-700 dark:text-sky-300",
          icon: <AlertTriangle className="w-4 h-4 text-sky-700 dark:text-sky-300 shrink-0" />
        };
      case "degraded":
        return {
          labelKey: "status_widget.degraded",
          defaultLabel: "Degraded Performance",
          badgeBg: "bg-cyan-600 dark:bg-cyan-400",
          badgeText: "text-slate-950 font-bold",
          dotColor: "bg-cyan-500",
          cardBg: "bg-surface/95 dark:bg-slate-900/95",
          cardBorder: "border-cyan-500/40 dark:border-cyan-400/50 shadow-cyan-500/10",
          accentText: "text-cyan-700 dark:text-cyan-300",
          icon: <AlertCircle className="w-4 h-4 text-cyan-700 dark:text-cyan-300 shrink-0" />
        };
      case "under_maintenance":
        return {
          labelKey: "status_widget.under_maintenance",
          defaultLabel: "Under Maintenance",
          badgeBg: "bg-sky-600 dark:bg-sky-500",
          badgeText: "text-white",
          dotColor: "bg-sky-500",
          cardBg: "bg-surface/95 dark:bg-slate-900/95",
          cardBorder: "border-sky-500/40 dark:border-sky-500/50 shadow-sky-500/10",
          accentText: "text-sky-600 dark:text-sky-400",
          icon: <Wrench className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
        };
      case "operational":
      default:
        return {
          labelKey: "status_widget.operational",
          defaultLabel: "All Systems Operational",
          badgeBg: "bg-emerald-600 dark:bg-emerald-500",
          badgeText: "text-white",
          dotColor: "bg-emerald-500",
          cardBg: "bg-surface/95 dark:bg-slate-900/95",
          cardBorder: "border-emerald-500/30 dark:border-emerald-500/40 shadow-emerald-500/10",
          accentText: "text-emerald-600 dark:text-emerald-400",
          icon: <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        };
    }
  };

  const visual = getVisualConfig(overallStatus);
  const statusLabel = tUi(visual.labelKey, undefined, visual.defaultLabel);

  // Primary active item to showcase (incident or maintenance)
  const primaryIncident: IncidentIoIncident | undefined = ongoingIncidents[0];
  const primaryMaintenance: IncidentIoMaintenance | undefined = inProgressMaintenances[0];

  const primaryItemTitle = primaryIncident?.name || primaryMaintenance?.name || summary?.description || "Service disruption is currently being investigated.";
  const primaryItemSummary = primaryIncident?.last_update_message || primaryIncident?.summary || primaryMaintenance?.last_update_message || primaryMaintenance?.summary || "";
  const primaryItemType = primaryIncident 
    ? tUi("status_widget.incident", undefined, "Incident")
    : primaryMaintenance 
    ? tUi("status_widget.maintenance", undefined, "Maintenance") 
    : tUi("status_widget.title", undefined, "Status Alert");

  const totalEventsCount = ongoingIncidents.length + inProgressMaintenances.length;

  const formatIncidentStatus = (statusStr?: string) => {
    if (!statusStr) return "";
    const lower = statusStr.toLowerCase();
    if (lower === "identified") return tUi("status_widget.identified", undefined, "Identified");
    if (lower === "investigating") return tUi("status_widget.investigating", undefined, "Investigating");
    if (lower === "monitoring") return tUi("status_widget.monitoring", undefined, "Monitoring");
    if (lower === "resolved") return tUi("status_widget.resolved", undefined, "Resolved");
    if (lower === "in_progress") return tUi("status_widget.in_progress", undefined, "In Progress");
    return statusStr;
  };

  const formatComponentStatus = (statusStr?: string) => {
    if (!statusStr) return "";
    const lower = statusStr.toLowerCase();
    if (lower.includes("degraded")) return tUi("status_widget.impact_degraded", undefined, "Degraded");
    if (lower.includes("outage")) return tUi("status_widget.impact_outage", undefined, "Outage");
    if (lower.includes("operational")) return tUi("status_widget.operational", undefined, "Operational");
    return statusStr;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          id="incident-status-popup"
          role="region"
          aria-label={tUi("status_widget.title", undefined, "Service status alert")}
          aria-live="polite"
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-5 right-5 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] select-text font-sans"
        >
          {isMinimized ? (
            /* Minimized Pill State */
            <div
              className={`cinematic-incident-glass rounded-full p-2.5 px-4 border ${visual.cardBorder} flex items-center justify-between gap-3 cursor-pointer`}
              onClick={() => setIsMinimized(false)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setIsMinimized(false);
                }
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex items-center justify-center shrink-0 w-2.5 h-2.5">
                  <span className={`absolute inline-flex h-full w-full rounded-full ${visual.dotColor} opacity-75 animate-ping`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${visual.dotColor}`} />
                </div>
                <span className="text-xs font-semibold text-text truncate">
                  {statusLabel}
                </span>
                <span className="text-[11px] font-medium text-muted-text uppercase tracking-wider hidden sm:inline-block">
                  ({primaryItemType})
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(false);
                  }}
                  className="p-1 rounded-full text-muted-text hover:text-text hover:bg-surface/80 transition-colors"
                  title="Expand"
                  aria-label="Expand status widget"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss();
                  }}
                  className="p-1 rounded-full text-muted-text hover:text-text hover:bg-surface/80 transition-colors"
                  title={tUi("status_widget.dismiss", undefined, "Dismiss")}
                  aria-label={tUi("status_widget.dismiss", undefined, "Dismiss")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Full Expanded Widget Card */
            <div
              className={`cinematic-incident-glass rounded-2xl p-4 sm:p-5 border ${visual.cardBorder} transition-colors`}
            >
              {/* Top Row: Status Badge, Live Dot, Actions */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Pulsing indicator dot */}
                  <div className="relative flex items-center justify-center shrink-0 w-3 h-3">
                    <span className={`absolute inline-flex h-full w-full rounded-full ${visual.dotColor} opacity-75 animate-ping`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${visual.dotColor}`} />
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${visual.badgeBg} ${visual.badgeText} shadow-xs shrink-0`}
                  >
                    {visual.icon}
                    <span>{statusLabel}</span>
                  </span>

                  {/* Event Type Chip */}
                  <span className="text-[11px] font-semibold text-muted-text truncate uppercase tracking-wider hidden sm:inline-block">
                    {primaryItemType}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Refresh button */}
                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="p-1 rounded-lg text-muted-text hover:text-text hover:bg-surface/80 transition-colors"
                    title={tUi("status_widget.refresh", undefined, "Refresh status")}
                    aria-label={tUi("status_widget.refresh", undefined, "Refresh status")}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
                  </button>

                  {/* Minimize button */}
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    className="p-1 rounded-lg text-muted-text hover:text-text hover:bg-surface/80 transition-colors"
                    title="Minimize"
                    aria-label="Minimize status notification"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Dismiss button */}
                  <button
                    type="button"
                    onClick={dismiss}
                    className="p-1 rounded-lg text-muted-text hover:text-text hover:bg-surface/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                    title={tUi("status_widget.dismiss", undefined, "Dismiss")}
                    aria-label={tUi("status_widget.dismiss", undefined, "Dismiss")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Middle Section: Main Active Event Title & Summary */}
              <div className="pt-3 pb-2 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-text leading-snug">
                    {primaryItemTitle}
                  </h4>
                  {primaryIncident?.status && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 shrink-0">
                      {formatIncidentStatus(primaryIncident.status)}
                    </span>
                  )}
                </div>

                {/* Affected Components Badges if available */}
                {primaryIncident?.affected_components && primaryIncident.affected_components.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-semibold text-muted-text uppercase flex items-center gap-1">
                      <Layers className="w-3 h-3 text-primary" />
                      <span>{tUi("status_widget.affected_components", undefined, "Affected")}:</span>
                    </span>
                    {primaryIncident.affected_components.map((comp) => (
                      <span
                        key={comp.id || comp.name}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-surface text-text border border-border"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        <span>{comp.name}</span>
                        {comp.current_status && (
                          <span className="text-[9px] text-muted-text font-mono">
                            ({formatComponentStatus(comp.current_status)})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {primaryItemSummary && (
                  <p className="cinematic-incident-inset text-xs text-muted-text line-clamp-3 leading-relaxed p-2 rounded-lg border border-border/40">
                    {primaryItemSummary}
                  </p>
                )}

                {/* Timestamp */}
                {lastUpdated && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-text/80 pt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>
                      {tUi("status_widget.latest_update", undefined, "Updated")}: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {totalEventsCount > 1 && (
                      <span className="ml-auto font-medium text-primary text-xs">
                        +{totalEventsCount - 1} {tUi("status_widget.more_issues", { count: totalEventsCount - 1 }, "more issues")}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Expandable Details for Multiple Events */}
              {totalEventsCount > 1 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="w-full py-1 text-xs font-medium text-muted-text hover:text-text flex items-center justify-between gap-1 border-t border-border/40 mt-1 transition-colors"
                  >
                    <span>
                      {isExpanded 
                        ? tUi("status_widget.hide_details", undefined, "Hide details") 
                        : tUi("status_widget.view_all_events", { count: totalEventsCount }, `View all ${totalEventsCount} active events`)}
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2 pt-2 text-xs"
                      >
                        {/* Ongoing Incidents */}
                        {ongoingIncidents.map((incident) => (
                          <div
                            key={incident.id}
                            className="cinematic-incident-inset p-2.5 rounded-xl border border-border/80 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-text">{incident.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 font-medium uppercase">
                                {formatIncidentStatus(incident.status)}
                              </span>
                            </div>

                            {incident.affected_components && incident.affected_components.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {incident.affected_components.map(c => (
                                  <span key={c.id || c.name} className="text-[10px] px-1.5 py-0.2 rounded bg-background border border-border text-muted-text">
                                    {c.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {(incident.last_update_message || incident.summary) && (
                              <p className="text-muted-text text-[11px] leading-relaxed">
                                {incident.last_update_message || incident.summary}
                              </p>
                            )}
                          </div>
                        ))}

                        {/* Maintenances */}
                        {inProgressMaintenances.map((m) => (
                          <div
                            key={m.id}
                            className="cinematic-incident-inset p-2.5 rounded-xl border border-border/80 space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-text">{m.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium uppercase">
                                {tUi("status_widget.maintenance", undefined, "Maintenance")}
                              </span>
                            </div>
                            {(m.last_update_message || m.summary) && (
                              <p className="text-muted-text text-[11px]">{m.last_update_message || m.summary}</p>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Bottom Actions Row */}
              <div className="pt-3 mt-2 border-t border-border/60 flex items-center justify-between gap-3">
                <span className="text-[11px] text-muted-text">
                  {tUi("status_widget.live_updates", undefined, "Live updates enabled")}
                </span>

                <a
                  href={primaryIncident?.url || statusPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
                >
                  <span>{tUi("status_widget.view_status_page", undefined, "View Status Page")}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
