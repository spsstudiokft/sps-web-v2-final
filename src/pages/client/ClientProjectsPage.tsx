import { useState, useEffect, useRef } from "react";
import { useApi } from "../../hooks/useApi";
import { Project } from "../../lib/types";
import { Card, CardContent } from "../../components/ui/Card";
import { getNormalizedGallery } from "../../lib/mediaUtils";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { 
  FolderKanban, 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ImageIcon, 
  ExternalLink,
  Layers,
  Download,
  LockKeyhole,
  ShieldCheck,
  Check,
  Loader2,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Flag,
  MessageSquare,
  CheckCircle2,
  CircleDot,
  AlertCircle
} from "lucide-react";

export default function ClientProjectsPage() {
  const { tUi } = useLanguage();
  usePageTitle(tUi("client.projects.title"));
  const { fetchApi } = useApi();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [expandedGallery, setExpandedGallery] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, number[]>>({});
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [accessTokens, setAccessTokens] = useState<Record<string, string>>({});
  const [busyGallery, setBusyGallery] = useState<string | null>(null);
  const [resendingPinProject, setResendingPinProject] = useState<string | null>(null);
  const [galleryMessage, setGalleryMessage] = useState<Record<string, string>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, Record<number, string>>>({});
  const createdPreviewUrls = useRef<string[]>([]);
  const [lightbox, setLightbox] = useState<{ galleryId: string; index: number; count: number; title: string } | null>(null);

  useEffect(() => {
    fetchProjects();
    return () => { createdPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url)); };
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "ArrowLeft") setLightbox((current) => current ? { ...current, index: (current.index - 1 + current.count) % current.count } : null);
      if (event.key === "ArrowRight") setLightbox((current) => current ? { ...current, index: (current.index + 1) % current.count } : null);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [lightbox]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/api/client/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0) {
          setExpandedProject(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load client projects", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (id: string) => {
    setExpandedProject(expandedProject === id ? null : id);
  };

  const toggleGallery = (id: string) => {
    setExpandedGallery(expandedGallery === id ? null : id);
  };

  const toggleMediaSelection = (galleryId: string, index: number) => {
    setSelectedItems((current) => {
      const values = current[galleryId] || [];
      return { ...current, [galleryId]: values.includes(index) ? values.filter((item) => item !== index) : [...values, index] };
    });
  };

  const loadGalleryPreviews = async (projectId: string, galleryId: string, itemCount: number, accessToken = accessTokens[projectId] || "") => {
    const entries = await Promise.all(Array.from({ length: itemCount }, async (_, index) => {
      try {
        const response = await fetchApi(`/api/client/projects/${projectId}/galleries/${galleryId}/preview`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index, access_token: accessToken }),
        });
        if (!response.ok) return [index, ""] as const;
        const url = URL.createObjectURL(await response.blob());
        createdPreviewUrls.current.push(url);
        return [index, url] as const;
      } catch { return [index, ""] as const; }
    }));
    setPreviewUrls((current) => ({ ...current, [galleryId]: Object.fromEntries(entries) }));
  };

  const unlockProject = async (projectId: string, galleryId: string) => {
    setBusyGallery(galleryId);
    setGalleryMessage((current) => ({ ...current, [galleryId]: "" }));
    try {
      const response = await fetchApi(`/api/client/projects/${projectId}/galleries/${galleryId}/unlock`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: pinInputs[projectId] || "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The PIN could not be verified.");
      setAccessTokens((current) => ({ ...current, [projectId]: data.access_token }));
      setGalleryMessage((current) => ({ ...current, [galleryId]: tUi("client.gallery.unlock_success") }));
      const gallery = projects.find((project) => project.id === projectId)?.portfolios?.find((item) => item.id === galleryId);
      if (gallery) void loadGalleryPreviews(projectId, galleryId, getNormalizedGallery(gallery.image_urls).length, data.access_token);
    } catch (error: any) {
      setGalleryMessage((current) => ({ ...current, [galleryId]: error.message || tUi("client.gallery.pin_verify_failed") }));
    } finally { setBusyGallery(null); }
  };

  const downloadGallery = async (projectId: string, galleryId: string, indexes: number[], variant: "original" | "optimized" = "original") => {
    setBusyGallery(galleryId);
    setGalleryMessage((current) => ({ ...current, [galleryId]: tUi("client.gallery.preparing") }));
    try {
      const response = await fetchApi(`/api/client/projects/${projectId}/galleries/${galleryId}/download`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indexes, variant, access_token: accessTokens[projectId] || "" }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || tUi("client.gallery.download_failed"));
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "gallery.zip";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      URL.revokeObjectURL(url);
      setGalleryMessage((current) => ({ ...current, [galleryId]: tUi("client.gallery.download_started") }));
    } catch (error: any) {
      setGalleryMessage((current) => ({ ...current, [galleryId]: error.message || tUi("client.gallery.download_failed") }));
    } finally { setBusyGallery(null); }
  };

  const resendProjectPin = async (projectId: string, galleryId: string) => {
    setResendingPinProject(projectId);
    setGalleryMessage((current) => ({ ...current, [galleryId]: tUi("client.gallery.sending_pin") }));
    try {
      const response = await fetchApi(`/api/client/projects/${projectId}/gallery-pin/resend`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || tUi("client.gallery.pin_email_failed"));
      setAccessTokens((current) => { const next = { ...current }; delete next[projectId]; return next; });
      setPinInputs((current) => ({ ...current, [projectId]: "" }));
      setGalleryMessage((current) => ({ ...current, [galleryId]: data.message || tUi("client.gallery.pin_sent") }));
      const gallery = projects.find((project) => project.id === projectId)?.portfolios?.find((item) => item.id === galleryId);
      if (gallery) void loadGalleryPreviews(projectId, galleryId, getNormalizedGallery(gallery.image_urls).length, "");
    } catch (error: any) {
      setGalleryMessage((current) => ({ ...current, [galleryId]: error.message || tUi("client.gallery.pin_email_failed") }));
    } finally { setResendingPinProject(null); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case 'completed': return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case 'archived': return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getMilestoneStatus = (status: string) => {
    switch (status) {
      case "completed": return { label: tUi("client.projects.milestone_completed"), className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 };
      case "in_progress": return { label: tUi("client.projects.milestone_in_progress"), className: "bg-sky-500/10 text-sky-600 dark:text-sky-400", icon: CircleDot };
      case "blocked": return { label: tUi("client.projects.milestone_blocked"), className: "bg-rose-500/10 text-rose-600 dark:text-rose-400", icon: AlertCircle };
      default: return { label: tUi("client.projects.milestone_pending"), className: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: Clock };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-6">
        <div className="h-8 w-48 bg-border animate-pulse rounded"></div>
        <div className="space-y-4">
          {[1, 2].map(n => (
            <div key={n} className="h-40 bg-surface animate-pulse rounded-xl border border-border"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">{tUi("client.projects.title")}</h1>
        <p className="text-muted-text mt-1">{tUi("client.projects.subtitle")}</p>
      </div>

      <div className="space-y-4">
        {projects.map((project) => {
          const isProjExpanded = expandedProject === project.id;
          const linkedGalleries = project.portfolios || [];
          const projectPreview = linkedGalleries
            .map((portfolio) => {
              const gallery = getNormalizedGallery(portfolio.image_urls);
              return previewUrls[portfolio.id]?.[0] || null;
            })
            .find((url): url is string => Boolean(url));
          return (
            <Card key={project.id} className="overflow-hidden border border-border">
              {/* Project Header Accordion Button */}
              <button 
                onClick={() => toggleProject(project.id)}
                className="w-full text-left flex flex-col md:flex-row md:items-center justify-between p-6 gap-4 hover:bg-surface/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl text-primary mt-1 md:mt-0 shrink-0 overflow-hidden flex items-center justify-center border border-border/60">
                    {projectPreview ? (
                      <img
                        src={projectPreview}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <FolderKanban size={24} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-text">{project.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-text">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} /> {tUi("client.projects.created", { date: new Date(project.created_at).toLocaleDateString() })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} /> {tUi("client.projects.updated", { date: new Date(project.updated_at).toLocaleDateString() })}
                      </span>
                      <span className="flex items-center gap-1" title={tUi("client.projects.linked_galleries")}>
                        <Layers size={14} /> {linkedGalleries.length} {tUi("client.projects.linked_galleries")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                  {isProjExpanded ? <ChevronUp size={20} className="text-muted-text" /> : <ChevronDown size={20} className="text-muted-text" />}
                </div>
              </button>

              {/* Project Body */}
              {isProjExpanded && (
                <CardContent className="border-t border-border p-6 bg-surface/10 space-y-6">
                  {project.description && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-text uppercase tracking-wider">{tUi("client.projects.description")}</h4>
                      <p className="text-text/90 text-sm leading-relaxed">{project.description}</p>
                    </div>
                  )}

                  <section className="space-y-4" aria-labelledby={`project-timeline-${project.id}`}>
                    <div className="flex items-center justify-between gap-3">
                      <h4 id={`project-timeline-${project.id}`} className="text-sm font-semibold text-text uppercase tracking-wider">
                        {tUi("client.projects.timeline")}
                      </h4>
                      <span className="text-[11px] text-muted-text">
                        {tUi("client.projects.timeline_summary", {
                          milestones: project.milestones?.length || 0,
                          updates: project.updates?.length || 0,
                        })}
                      </span>
                    </div>

                    {(project.milestones?.length || project.updates?.length) ? (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-border bg-background/70 p-4 sm:p-5">
                          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-text">
                            <Flag className="h-4 w-4 text-primary" />
                            {tUi("client.projects.milestones")}
                          </div>
                          {project.milestones?.length ? (
                            <ol className="space-y-0">
                              {project.milestones.map((milestone, index) => {
                                const status = getMilestoneStatus(milestone.status);
                                const StatusIcon = status.icon;
                                return (
                                  <li key={milestone.id} className="relative flex gap-3 pb-5 last:pb-0">
                                    {index < project.milestones!.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border" aria-hidden="true" />}
                                    <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${status.className}`}>
                                      <StatusIcon className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0 flex-1 pt-0.5">
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <p className="text-sm font-semibold text-text">{milestone.title}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${status.className}`}>{status.label}</span>
                                      </div>
                                      {milestone.description && <p className="mt-1 text-xs leading-relaxed text-muted-text">{milestone.description}</p>}
                                      {milestone.due_date && (
                                        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-text">
                                          <Calendar className="h-3 w-3" />
                                          {tUi("client.projects.due_date", { date: new Date(milestone.due_date).toLocaleDateString() })}
                                        </p>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ol>
                          ) : <p className="text-xs italic text-muted-text">{tUi("client.projects.no_milestones")}</p>}
                        </div>

                        <div className="rounded-2xl border border-border bg-background/70 p-4 sm:p-5">
                          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-text">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            {tUi("client.projects.updates_feed")}
                          </div>
                          {project.updates?.length ? (
                            <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                              {project.updates.map((update) => (
                                <article key={update.id} className="rounded-xl border border-border/80 bg-surface/40 p-3.5">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <h5 className="text-sm font-semibold text-text">{update.title}</h5>
                                    <time className="text-[10px] text-muted-text" dateTime={update.created_at}>{new Date(update.created_at).toLocaleString()}</time>
                                  </div>
                                  {update.status_label && <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{update.status_label}</span>}
                                  <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-text">{update.message}</p>
                                </article>
                              ))}
                            </div>
                          ) : <p className="text-xs italic text-muted-text">{tUi("client.projects.no_updates")}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-background/40 px-4 py-6 text-center text-sm text-muted-text">
                        {tUi("client.projects.no_timeline")}
                      </div>
                    )}
                  </section>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-text uppercase tracking-wider">{tUi("client.projects.linked_galleries")}</h4>
                    
                    {project.portfolios && project.portfolios.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                        {project.portfolios.map((portfolio) => {
                          const isGalExpanded = expandedGallery === portfolio.id;
                          const mediaItems = getNormalizedGallery(portfolio.image_urls).filter((item) => Boolean(item.url));
                          const optimizedIndexes = mediaItems.map((item, index) => item.type === "image" && item.compressed_url ? index : -1).filter((index) => index >= 0);
                          const selectedOptimizedIndexes = (selectedItems[portfolio.id] || []).filter((index) => optimizedIndexes.includes(index));
                          const galleryPreview = previewUrls[portfolio.id]?.[0] || null;
                          const photoUnit = mediaItems.length === 1 ? tUi("client.projects.photo") : tUi("client.projects.photos");
                          
                          return (
                            <div key={portfolio.id} className="border border-border rounded-xl bg-background overflow-hidden">
                              <button
                                onClick={() => { toggleGallery(portfolio.id); if (!isGalExpanded) void loadGalleryPreviews(project.id, portfolio.id, mediaItems.length); }}
                                className="w-full flex items-center justify-between p-4 hover:bg-surface/30 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-14 h-11 bg-primary/10 rounded-lg text-primary shrink-0 overflow-hidden flex items-center justify-center border border-border/60">
                                    {galleryPreview ? (
                                      <img
                                        src={galleryPreview}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <ImageIcon size={18} />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="font-medium text-text text-sm truncate">{portfolio.title}</h5>
                                    <p className="text-xs text-muted-text mt-0.5">
                                      {tUi("client.projects.photos_count", { count: String(mediaItems.length), unit: photoUnit })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {portfolio.target_url && (
                                    <a 
                                      href={portfolio.target_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="p-1.5 hover:bg-surface text-muted-text hover:text-text rounded transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                      title={tUi("client.projects.external_link")}
                                    >
                                      <ExternalLink size={16} />
                                    </a>
                                  )}
                                  {isGalExpanded ? <ChevronUp size={16} className="text-muted-text" /> : <ChevronDown size={16} className="text-muted-text" />}
                                </div>
                              </button>

                              {isGalExpanded && (
                                <div className="p-4 border-t border-border bg-surface/5 space-y-4">
                                  {portfolio.description && (
                                    <p className="text-xs text-muted-text italic leading-relaxed">{portfolio.description}</p>
                                  )}

                                  <div className="rounded-xl border border-white/10 bg-surface/70 backdrop-blur-xl p-4 space-y-3 shadow-lg shadow-black/5">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                      <div className="flex items-start gap-2">
                                        {accessTokens[project.id] ? <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" /> : <LockKeyhole className="w-5 h-5 text-amber-500 shrink-0" />}
                                        <div>
                                          <p className="text-sm font-semibold text-text">{accessTokens[project.id] ? tUi("client.gallery.original_unlocked") : tUi("client.gallery.protected")}</p>
                                          <p className="text-xs text-muted-text">{accessTokens[project.id] ? tUi("client.gallery.unlocked_desc") : tUi("client.gallery.locked_desc")}</p>
                                        </div>
                                      </div>
                                      {!accessTokens[project.id] && (
                                        <div className="flex flex-wrap justify-end gap-2 shrink-0">
                                          <input
                                            value={pinInputs[project.id] || ""}
                                            onChange={(event) => setPinInputs((current) => ({ ...current, [project.id]: event.target.value.replace(/\D/g, "").slice(0, 4) }))}
                                            onKeyDown={(event) => { if (event.key === "Enter") unlockProject(project.id, portfolio.id); }}
                                            inputMode="numeric" autoComplete="one-time-code" placeholder={tUi("client.gallery.pin_placeholder")} aria-label={tUi("client.gallery.pin_label")}
                                            className="w-32 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm tracking-[0.2em] text-text outline-none focus:border-primary"
                                          />
                                          <button onClick={() => unlockProject(project.id, portfolio.id)} disabled={busyGallery === portfolio.id || (pinInputs[project.id] || "").length !== 4} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                                            {busyGallery === portfolio.id ? <Loader2 className="w-4 h-4 animate-spin" /> : tUi("client.gallery.unlock")}
                                          </button>
                                          <button onClick={() => resendProjectPin(project.id, portfolio.id)} disabled={resendingPinProject === project.id} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-3 py-2 text-xs font-semibold text-text hover:bg-surface disabled:opacity-50">
                                            {resendingPinProject === project.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                            {tUi("client.gallery.email_new_pin")}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <button onClick={() => setSelectedItems((current) => ({ ...current, [portfolio.id]: mediaItems.map((_, index) => index) }))} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text hover:bg-surface">{tUi("client.gallery.select_all")}</button>
                                      <button onClick={() => setSelectedItems((current) => ({ ...current, [portfolio.id]: [] }))} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text hover:bg-surface">{tUi("client.gallery.clear")}</button>
                                      <button onClick={() => downloadGallery(project.id, portfolio.id, selectedItems[portfolio.id] || [])} disabled={busyGallery === portfolio.id || !(selectedItems[portfolio.id]?.length)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"><Download className="w-3.5 h-3.5" />{tUi("client.gallery.download_selected", { count: selectedItems[portfolio.id]?.length || 0 })}</button>
                                      <button onClick={() => downloadGallery(project.id, portfolio.id, mediaItems.map((_, index) => index))} disabled={busyGallery === portfolio.id || mediaItems.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"><Download className="w-3.5 h-3.5" />{tUi("client.gallery.download_zip")}</button>
                                    </div>
                                    {galleryMessage[portfolio.id] && <p className="text-xs text-muted-text" role="status">{galleryMessage[portfolio.id]}</p>}
                                  </div>

                                  {optimizedIndexes.length > 0 && (
                                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4 backdrop-blur-xl shadow-lg shadow-emerald-950/5">
                                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-start gap-2.5">
                                          <Download className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                                          <div>
                                            <p className="text-sm font-semibold text-text">{tUi("client.gallery.optimized_title")}</p>
                                            <p className="text-xs text-muted-text">{tUi("client.gallery.optimized_desc")}</p>
                                            <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{tUi(optimizedIndexes.length === 1 ? "client.gallery.optimized_available_one" : "client.gallery.optimized_available", { count: optimizedIndexes.length })}</p>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 sm:justify-end">
                                          <button onClick={() => downloadGallery(project.id, portfolio.id, selectedOptimizedIndexes, "optimized")} disabled={busyGallery === portfolio.id || selectedOptimizedIndexes.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-background/65 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-300">
                                            <Download className="h-3.5 w-3.5" /> {tUi("client.gallery.optimized_selected", { count: selectedOptimizedIndexes.length })}
                                          </button>
                                          <button onClick={() => downloadGallery(project.id, portfolio.id, optimizedIndexes, "optimized")} disabled={busyGallery === portfolio.id} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                                            <Download className="h-3.5 w-3.5" /> {tUi("client.gallery.optimized_zip")}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {mediaItems.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                      {mediaItems.map((media, index) => {
                                        const previewUrl = previewUrls[portfolio.id]?.[index] || "";
                                        return (
                                        <div key={index} onClick={() => toggleMediaSelection(portfolio.id, index)} className={`aspect-[4/3] rounded-lg overflow-hidden border bg-surface group relative cursor-pointer transition-all ${selectedItems[portfolio.id]?.includes(index) ? "border-primary ring-2 ring-primary/40" : "border-border"}`}>
                                          {previewUrl ? (
                                            <img
                                              src={previewUrl}
                                              alt={`${portfolio.title} - ${index + 1}`}
                                              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                              referrerPolicy="no-referrer"
                                              draggable={false}
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-text">
                                              <ImageIcon size={22} />
                                            </div>
                                          )}
                                          <span className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border backdrop-blur-md ${selectedItems[portfolio.id]?.includes(index) ? "border-primary bg-primary text-primary-foreground" : "border-white/40 bg-black/35 text-white"}`}>
                                            {selectedItems[portfolio.id]?.includes(index) && <Check className="w-4 h-4" />}
                                          </span>
                                          <button onClick={(event) => { event.stopPropagation(); downloadGallery(project.id, portfolio.id, [index]); }} disabled={busyGallery === portfolio.id} title={tUi("client.gallery.download_item")} className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/30 bg-black/55 text-white backdrop-blur-md opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 disabled:opacity-50">
                                            <Download className="w-4 h-4" />
                                          </button>
                                          {previewUrl && (
                                            <button onClick={(event) => { event.stopPropagation(); setLightbox({ galleryId: portfolio.id, index, count: mediaItems.length, title: `${portfolio.title} – ${index + 1}` }); }} title={tUi("client.gallery.view_large")} className="absolute bottom-2 right-12 flex h-8 w-8 items-center justify-center rounded-lg border border-white/30 bg-black/55 text-white backdrop-blur-md opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100">
                                              <Maximize2 className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-text italic">{tUi("client.projects.no_images")}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-text italic">{tUi("client.projects.no_galleries")}</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {projects.length === 0 && (
          <div className="text-center py-16 bg-surface rounded-2xl border border-border">
            <FolderKanban className="mx-auto h-12 w-12 text-muted-text/50" />
            <h3 className="mt-4 text-lg font-semibold text-text">{tUi("client.projects.empty_title")}</h3>
            <p className="mt-2 text-sm text-muted-text max-w-sm mx-auto">
              {tUi("client.projects.empty_desc")}
            </p>
          </div>
        )}
      </div>

      {lightbox && previewUrls[lightbox.galleryId]?.[lightbox.index] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/92 p-3 sm:p-6 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={lightbox.title} onMouseDown={(event) => { if (event.target === event.currentTarget) setLightbox(null); }}>
          <div className="relative flex h-full w-full max-w-7xl flex-col items-center justify-center">
            <div className="absolute left-3 top-3 z-10 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-md">
              {lightbox.index + 1} / {lightbox.count}
            </div>
            <button onClick={() => setLightbox(null)} className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-white/15" aria-label={tUi("client.gallery.close_large")}>
              <X className="h-5 w-5" />
            </button>
            {lightbox.count > 1 && (
              <>
                <button onClick={() => setLightbox((current) => current ? { ...current, index: (current.index - 1 + current.count) % current.count, title: current.title.replace(/\d+$/, String((current.index - 1 + current.count) % current.count + 1)) } : null)} className="absolute left-2 sm:left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-white/15" aria-label={tUi("client.gallery.previous")}><ChevronLeft className="h-6 w-6" /></button>
                <button onClick={() => setLightbox((current) => current ? { ...current, index: (current.index + 1) % current.count, title: current.title.replace(/\d+$/, String((current.index + 1) % current.count + 1)) } : null)} className="absolute right-2 sm:right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-white/15" aria-label={tUi("client.gallery.next")}><ChevronRight className="h-6 w-6" /></button>
              </>
            )}
            <img src={previewUrls[lightbox.galleryId][lightbox.index]} alt={lightbox.title} draggable={false} className="max-h-[88vh] max-w-full select-none rounded-xl object-contain shadow-2xl shadow-black/60" />
            <p className="mt-3 text-center text-sm text-white/75">{lightbox.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
