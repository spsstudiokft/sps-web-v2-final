import React, { useState, useEffect, useMemo } from "react";
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit, 
  Copy, 
  Save, 
  Check, 
  AlertTriangle, 
  Sliders, 
  Layers, 
  Calendar, 
  Clock, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Sparkles,
  ArrowUp,
  ArrowDown,
  Sun,
  Moon,
  Info,
  CheckCircle2,
  X
} from "lucide-react";
import { InfoBarCategory, InfoBarMessage, InfoBarSettings } from "../../lib/types";
import { CategoryIcon, AVAILABLE_CATEGORY_ICONS } from "../../components/common/CategoryIcon";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function InfoBarPage() {
  const { token } = useAuth();
  const { currentLang, tUi } = useLanguage();
  const [activeTab, setActiveTab] = useState<"messages" | "categories" | "settings">("messages");

  // Data state
  const [messages, setMessages] = useState<InfoBarMessage[]>([]);
  const [categories, setCategories] = useState<InfoBarCategory[]>([]);
  const [settings, setSettings] = useState<InfoBarSettings>({
    info_bar_enabled: true,
    info_bar_rotation_interval: 7,
    info_bar_pause_on_hover: true,
    info_bar_show_indicators: true,
    info_bar_animation: "slide"
  });

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals state
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Partial<InfoBarMessage> | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<InfoBarCategory> | null>(null);

  // Simulator preview state
  const [previewDarkBg, setPreviewDarkBg] = useState(false);
  const [selectedPreviewMsgId, setSelectedPreviewMsgId] = useState<string | null>(null);

  const authHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }), [token]);

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [catsRes, msgsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/info-bar/categories", { headers: authHeaders }),
        fetch("/api/admin/info-bar/messages", { headers: authHeaders }),
        fetch("/api/admin/info-bar/settings", { headers: authHeaders })
      ]);

      if (catsRes.ok) {
        const cats = await catsRes.json();
        setCategories(Array.isArray(cats) ? cats : []);
      }
      if (msgsRes.ok) {
        const msgs = await msgsRes.json();
        setMessages(Array.isArray(msgs) ? msgs : []);
      }
      if (settingsRes.ok) {
        const sett = await settingsRes.json();
        setSettings(sett);
      }
    } catch (err: any) {
      console.error("Failed to load info bar admin data:", err);
      setFeedback({ type: "error", text: "Failed to load announcement bar data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const showToast = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Schedule status helper
  const getScheduleStatus = (msg: InfoBarMessage) => {
    if (!msg.is_enabled) return { label: "Disabled", color: "bg-gray-500/15 text-gray-400 border-gray-500/20" };
    const now = new Date().getTime();
    if (msg.start_date && new Date(msg.start_date).getTime() > now) {
      return { label: "Scheduled", color: "bg-sky-500/15 text-sky-400 border-sky-500/20" };
    }
    if (msg.end_date && new Date(msg.end_date).getTime() < now) {
      return { label: "Expired", color: "bg-rose-500/15 text-rose-400 border-rose-500/20" };
    }
    return { label: "Active Now", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" };
  };

  // Toggle Message Enabled
  const handleToggleMessage = async (msg: InfoBarMessage) => {
    try {
      const res = await fetch(`/api/admin/info-bar/messages/${msg.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ is_enabled: !msg.is_enabled })
      });
      if (!res.ok) throw new Error("Failed to update status");
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_enabled: !m.is_enabled } : m));
      showToast("success", `Announcement ${!msg.is_enabled ? "enabled" : "disabled"}.`);
    } catch (e: any) {
      showToast("error", e.message || "Failed to update announcement");
    }
  };

  // Delete Message
  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const res = await fetch(`/api/admin/info-bar/messages/${id}`, {
        method: "DELETE",
        headers: authHeaders
      });
      if (!res.ok) throw new Error("Failed to delete announcement");
      setMessages(prev => prev.filter(m => m.id !== id));
      showToast("success", "Announcement deleted.");
    } catch (e: any) {
      showToast("error", e.message || "Failed to delete");
    }
  };

  // Save / Create Message
  const handleSaveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessage || !editingMessage.category_id || !editingMessage.text?.trim()) {
      showToast("error", "Category and announcement text are required.");
      return;
    }

    try {
      const isNew = !editingMessage.id;
      const url = isNew ? "/api/admin/info-bar/messages" : `/api/admin/info-bar/messages/${editingMessage.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(editingMessage)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save announcement");
      }

      const result = await res.json();
      if (isNew) {
        setMessages(prev => [result.message, ...prev]);
        showToast("success", "Announcement created successfully.");
      } else {
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? result.message : m));
        showToast("success", "Announcement updated successfully.");
      }
      setMessageModalOpen(false);
      setEditingMessage(null);
    } catch (e: any) {
      showToast("error", e.message || "Failed to save announcement");
    }
  };

  // Duplicate Message
  const handleDuplicateMessage = (msg: InfoBarMessage) => {
    setEditingMessage({
      category_id: msg.category_id,
      text: `${msg.text} (Copy)`,
      link_url: msg.link_url || "",
      link_label: msg.link_label || "",
      link_target_blank: msg.link_target_blank || 0,
      badge_text: msg.badge_text || "",
      is_enabled: 1,
      is_dismissible: msg.is_dismissible ?? 1,
      dismiss_scope: msg.dismiss_scope || "session",
      sort_order: (msg.sort_order || 0) + 1
    });
    setMessageModalOpen(true);
  };

  // Move Message Up / Down
  const handleMoveOrder = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= messages.length) return;

    const newMsgs = [...messages];
    const [moved] = newMsgs.splice(index, 1);
    newMsgs.splice(targetIndex, 0, moved);

    const reordered = newMsgs.map((m, idx) => ({ ...m, sort_order: idx + 1 }));
    setMessages(reordered);

    try {
      await fetch("/api/admin/info-bar/messages/reorder", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ items: reordered.map(m => ({ id: m.id, sort_order: m.sort_order })) })
      });
    } catch (e) {
      console.error("Reorder failed", e);
    }
  };

  // Save / Create Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name?.trim() || !editingCategory.label?.trim() || !editingCategory.bg_color) {
      showToast("error", "Name, label, and background color are required.");
      return;
    }

    try {
      const isNew = !editingCategory.id;
      const url = isNew ? "/api/admin/info-bar/categories" : `/api/admin/info-bar/categories/${editingCategory.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(editingCategory)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save category");
      }

      const result = await res.json();
      if (isNew) {
        setCategories(prev => [...prev, result.category]);
        showToast("success", "Category created successfully.");
      } else {
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...result.category, message_count: c.message_count } : c));
        // Also refresh messages so category metadata reflects immediately
        fetchData();
        showToast("success", "Category updated successfully.");
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (e: any) {
      showToast("error", e.message || "Failed to save category");
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await fetch(`/api/admin/info-bar/categories/${id}`, {
        method: "DELETE",
        headers: authHeaders
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete category");
      }

      setCategories(prev => prev.filter(c => c.id !== id));
      showToast("success", "Category deleted.");
    } catch (e: any) {
      showToast("error", e.message || "Failed to delete category");
    }
  };

  // Save Global Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/info-bar/settings", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(settings)
      });

      if (!res.ok) throw new Error("Failed to save settings");
      showToast("success", "Global Announcement Bar settings saved.");
    } catch (e: any) {
      showToast("error", e.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Selected or active preview message
  const activePreviewMessage = useMemo(() => {
    if (selectedPreviewMsgId) {
      const found = messages.find(m => m.id === selectedPreviewMsgId);
      if (found) return found;
    }
    return messages.find(m => m.is_enabled) || messages[0] || null;
  }, [messages, selectedPreviewMsgId]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">
                Announcement Info Bar
              </h1>
              <p className="text-sm text-muted-text mt-0.5">
                Configure multi-category announcements, promotions, notices, and scheduled banners.
              </p>
            </div>
          </div>
        </div>

        {/* Global status badge & refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface/80 text-muted-text hover:text-text transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border ${
            settings.info_bar_enabled 
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-500 border-rose-500/20"
          }`}>
            <span className={`w-2 h-2 rounded-full ${settings.info_bar_enabled ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            {settings.info_bar_enabled ? "Info Bar Live" : "Info Bar Disabled"}
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 shadow-md transition-all ${
          feedback.type === "success" 
            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
            : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* LIVE SIMULATOR PREVIEW */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-text pb-1">
          <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-text">
            <Eye className="w-4 h-4 text-primary" />
            <span>Live Info Bar Simulator</span>
          </div>

          <div className="flex items-center gap-3">
            {messages.length > 1 && (
              <select
                value={selectedPreviewMsgId || ""}
                onChange={(e) => setSelectedPreviewMsgId(e.target.value || null)}
                className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-text focus:outline-none"
              >
                <option value="">Cycle Active Messages ({messages.filter(m => m.is_enabled).length} active)</option>
                {messages.map((m, idx) => (
                  <option key={m.id} value={m.id}>
                    #{idx + 1}: {m.badge_text ? `[${m.badge_text}] ` : ""}{m.text.slice(0, 35)}...
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setPreviewDarkBg(!previewDarkBg)}
              title="Toggle preview background theme"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-surface text-text transition-colors"
            >
              {previewDarkBg ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{previewDarkBg ? "Dark View" : "Light View"}</span>
            </button>
          </div>
        </div>

        {/* Live Simulation Canvas */}
        <div className={`p-4 rounded-xl border border-dashed border-border/70 transition-colors duration-300 ${
          previewDarkBg ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-900"
        }`}>
          {activePreviewMessage ? (
            <div
              style={{
                backgroundColor: activePreviewMessage.category_bg_color || "#0284c7",
                color: activePreviewMessage.category_text_color || "#ffffff"
              }}
              className="rounded-full px-4 py-2.5 flex items-center justify-between gap-3 shadow-md border border-white/20 transition-all"
            >
              <div className="flex-1 flex flex-wrap items-center justify-center text-center gap-x-2.5 gap-y-1 text-xs font-medium">
                <span className="p-1 rounded-md bg-white/20 flex items-center justify-center">
                  <CategoryIcon icon={activePreviewMessage.category_icon || "info"} className="w-3.5 h-3.5" />
                </span>

                {activePreviewMessage.badge_text ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-white text-gray-900 shadow-xs">
                    {activePreviewMessage.badge_text}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20">
                    {activePreviewMessage.category_label || activePreviewMessage.category_name || "Announcement"}
                  </span>
                )}

                <span className="font-medium max-w-xl truncate">
                  {activePreviewMessage.text}
                </span>

                {activePreviewMessage.link_url && (
                  <span className="inline-flex items-center gap-1 font-bold text-[11px] uppercase tracking-wider py-0.5 px-2.5 rounded-full bg-white/25">
                    <span>{activePreviewMessage.link_label || "Learn More"}</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                )}
              </div>

              {Boolean(activePreviewMessage.is_dismissible) && (
                <span className="w-6 h-6 rounded-full flex items-center justify-center bg-black/15 opacity-80 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-text">
              No active announcements found. Create an announcement below to view it here.
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("messages")}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "messages"
              ? "border-primary text-primary"
              : "border-transparent text-muted-text hover:text-text"
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Announcements ({messages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "categories"
              ? "border-primary text-primary"
              : "border-transparent text-muted-text hover:text-text"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "settings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-text hover:text-text"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Global Settings</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: ANNOUNCEMENTS / MESSAGES
         ========================================================================= */}
      {activeTab === "messages" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Active Announcements & Banners</h2>
              <p className="text-xs text-muted-text">
                Manage your messages, promotional CTAs, and automated date-range schedules.
              </p>
            </div>

            <button
              onClick={() => {
                const defaultCat = categories[0]?.id || "";
                setEditingMessage({
                  category_id: defaultCat,
                  text: "",
                  link_url: "",
                  link_label: "Learn More",
                  link_target_blank: 0,
                  badge_text: "",
                  is_enabled: 1,
                  is_dismissible: 1,
                  dismiss_scope: "session",
                  sort_order: messages.length + 1
                });
                setMessageModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 shadow-sm transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>Create Announcement</span>
            </button>
          </div>

          {messages.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface/50">
              <Megaphone className="w-12 h-12 text-muted-text mx-auto mb-3 opacity-50" />
              <h3 className="text-base font-semibold text-text">No Announcements Created Yet</h3>
              <p className="text-xs text-muted-text max-w-md mx-auto mt-1 mb-4">
                Add an announcement or promotional banner to inform visitors about special offers, studio notices, or updates.
              </p>
              <button
                onClick={() => {
                  setEditingMessage({
                    category_id: categories[0]?.id || "",
                    text: "",
                    link_url: "",
                    link_label: "Learn More",
                    link_target_blank: 0,
                    is_enabled: 1,
                    is_dismissible: 1,
                    dismiss_scope: "session",
                    sort_order: 1
                  });
                  setMessageModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
              >
                Add Your First Announcement
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => {
                const status = getScheduleStatus(msg);
                const category = categories.find(c => c.id === msg.category_id);
                const bg = msg.category_bg_color || category?.bg_color || "#0284c7";
                const fg = msg.category_text_color || category?.text_color || "#ffffff";
                const catLabel = msg.category_label || category?.label || "Notice";
                const icon = msg.category_icon || category?.icon || "info";

                return (
                  <div
                    key={msg.id}
                    className="p-4 rounded-2xl border border-border bg-surface hover:border-border/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                  >
                    {/* Left: Reorder controls + Category Badge + Text */}
                    <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
                      {/* Order Controls */}
                      <div className="flex flex-col gap-1 shrink-0 pt-1 md:pt-0">
                        <button
                          disabled={index === 0}
                          onClick={() => handleMoveOrder(index, -1)}
                          className="p-1 rounded-md hover:bg-background text-muted-text hover:text-text disabled:opacity-20 disabled:hover:bg-transparent"
                          title={tUi("admin.faq_categories.move_up")}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={index === messages.length - 1}
                          onClick={() => handleMoveOrder(index, 1)}
                          className="p-1 rounded-md hover:bg-background text-muted-text hover:text-text disabled:opacity-20 disabled:hover:bg-transparent"
                          title={tUi("admin.faq_categories.move_down")}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Category Chip */}
                      <div
                        style={{ backgroundColor: bg, color: fg }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 shadow-2xs"
                      >
                        <CategoryIcon icon={icon} className="w-3.5 h-3.5" />
                        <span>{catLabel}</span>
                      </div>

                      {/* Message details */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {msg.badge_text && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                              {msg.badge_text}
                            </span>
                          )}
                          <span className="font-semibold text-text text-sm break-words">
                            {msg.text}
                          </span>
                        </div>

                        {/* CTA / Schedule Metadata */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-text">
                          {msg.link_url && (
                            <span className="flex items-center gap-1 text-primary hover:underline">
                              <span>CTA: {msg.link_label || "Link"} ({msg.link_url})</span>
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          )}

                          {(msg.start_date || msg.end_date) && (
                            <span className="flex items-center gap-1 text-muted-text">
                              <Calendar className="w-3 h-3" />
                              {msg.start_date ? new Date(msg.start_date).toLocaleDateString() : "Anytime"} → {msg.end_date ? new Date(msg.end_date).toLocaleDateString() : "Ongoing"}
                            </span>
                          )}

                          <span className="text-[11px] text-muted-text/70">
                            Dismissible: {msg.is_dismissible ? `Yes (${msg.dismiss_scope || "session"})` : "No"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status badge & Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                        {status.label}
                      </span>

                      <button
                        onClick={() => handleToggleMessage(msg)}
                        title={msg.is_enabled ? "Disable announcement" : "Enable announcement"}
                        className={`p-2 rounded-xl border border-border text-xs font-semibold transition-colors ${
                          msg.is_enabled 
                            ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" 
                            : "bg-surface text-muted-text hover:text-text"
                        }`}
                      >
                        {msg.is_enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleDuplicateMessage(msg)}
                        title="Duplicate announcement"
                        className="p-2 rounded-xl border border-border bg-surface hover:bg-surface/80 text-muted-text hover:text-text transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setEditingMessage({ ...msg });
                          setMessageModalOpen(true);
                        }}
                        title="Edit announcement"
                        className="p-2 rounded-xl border border-border bg-surface hover:bg-surface/80 text-muted-text hover:text-text transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        title="Delete announcement"
                        className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: CATEGORIES MANAGEMENT
         ========================================================================= */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Announcement Categories</h2>
              <p className="text-xs text-muted-text">
                Manage color palettes, distinct badges, and icon indicators per announcement category.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingCategory({
                  name: "",
                  label: "",
                  bg_color: "#0284c7",
                  text_color: "#ffffff",
                  icon: "info",
                  is_enabled: 1,
                  sort_order: categories.length + 1
                });
                setCategoryModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 shadow-sm transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-5 rounded-2xl border border-border bg-surface hover:border-border/80 transition-all flex flex-col justify-between gap-4 shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    {/* Color chip preview */}
                    <div
                      style={{ backgroundColor: cat.bg_color, color: cat.text_color }}
                      className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs"
                    >
                      <CategoryIcon icon={cat.icon} className="w-4 h-4" />
                      <span>{cat.label}</span>
                    </div>

                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-background border border-border text-muted-text">
                      {cat.name}
                    </span>
                  </div>

                  {/* Category Details */}
                  <div className="space-y-1 text-xs text-muted-text">
                    <div className="flex items-center justify-between">
                      <span>Assigned Messages:</span>
                      <span className="font-semibold text-text">{cat.message_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Icon:</span>
                      <span className="font-mono text-text">{cat.icon}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Background Color:</span>
                      <span className="font-mono font-bold flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full inline-block border border-white/20" style={{ backgroundColor: cat.bg_color }} />
                        {cat.bg_color}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Text Color:</span>
                      <span className="font-mono font-bold flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full inline-block border border-black/20" style={{ backgroundColor: cat.text_color }} />
                        {cat.text_color}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingCategory({ ...cat });
                      setCategoryModalOpen(true);
                    }}
                    className="p-2 rounded-xl border border-border bg-surface hover:bg-surface/80 text-muted-text hover:text-text text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>{tUi("admin.customers.edit")}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{tUi("admin.customers.delete")}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: GLOBAL SETTINGS
         ========================================================================= */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-text">Global Announcement Bar Configuration</h2>
              <p className="text-xs text-muted-text mt-0.5">
                Customize rotation intervals, hover behavior, transition style, and visibility.
              </p>
            </div>

            {/* Master Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background">
              <div>
                <div className="font-semibold text-sm text-text">Enable Info Bar</div>
                <div className="text-xs text-muted-text">Display active announcements below the main navbar.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.info_bar_enabled}
                  onChange={(e) => setSettings(s => ({ ...s, info_bar_enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            {/* Rotation Interval */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label className="font-semibold text-text">Auto-Rotation Interval</label>
                <span className="font-mono text-primary font-bold text-sm">{settings.info_bar_rotation_interval} seconds</span>
              </div>
              <input
                type="range"
                min={3}
                max={25}
                step={1}
                value={settings.info_bar_rotation_interval}
                onChange={(e) => setSettings(s => ({ ...s, info_bar_rotation_interval: Number(e.target.value) }))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[11px] text-muted-text">
                <span>3s (Fast)</span>
                <span>7s (Default)</span>
                <span>25s (Slow)</span>
              </div>
            </div>

            {/* Pause on Hover */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background">
              <div>
                <div className="font-semibold text-sm text-text">Pause on User Hover & Focus</div>
                <div className="text-xs text-muted-text">Stops auto-rotation when visitor hovers or focuses on the announcement.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.info_bar_pause_on_hover}
                  onChange={(e) => setSettings(s => ({ ...s, info_bar_pause_on_hover: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            {/* Show Navigation Indicators */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background">
              <div>
                <div className="font-semibold text-sm text-text">Show Controls & Counter</div>
                <div className="text-xs text-muted-text">Display manual arrows, counter (e.g. "1/3"), and play/pause button.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.info_bar_show_indicators}
                  onChange={(e) => setSettings(s => ({ ...s, info_bar_show_indicators: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            {/* Animation Style */}
            <div className="space-y-2">
              <label className="font-semibold text-sm text-text">Transition Animation</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, info_bar_animation: "slide" }))}
                  className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    settings.info_bar_animation === "slide"
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border bg-background text-muted-text hover:text-text"
                  }`}
                >
                  <span>Horizontal Slide</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, info_bar_animation: "fade" }))}
                  className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    settings.info_bar_animation === "fade"
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border bg-background text-muted-text hover:text-text"
                  }`}
                >
                  <span>Smooth Fade</span>
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={savingSettings}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Info Bar Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          CREATE / EDIT MESSAGE MODAL
         ========================================================================= */}
      {messageModalOpen && editingMessage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-text">
                {editingMessage.id ? "Edit Announcement" : "Create New Announcement"}
              </h3>
              <button
                onClick={() => {
                  setMessageModalOpen(false);
                  setEditingMessage(null);
                }}
                className="p-1.5 rounded-lg hover:bg-background text-muted-text hover:text-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMessage} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">Category *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map(c => {
                    const selected = editingMessage.category_id === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setEditingMessage(m => ({ ...m, category_id: c.id }))}
                        style={{
                          backgroundColor: selected ? c.bg_color : undefined,
                          color: selected ? c.text_color : undefined
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                          selected 
                            ? "border-white/30 shadow-md ring-2 ring-primary" 
                            : "border-border bg-background text-text hover:border-border/80"
                        }`}
                      >
                        <CategoryIcon icon={c.icon} className="w-4 h-4" />
                        <span className="truncate">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Text */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Announcement Message *</label>
                <textarea
                  required
                  rows={2}
                  value={editingMessage.text || ""}
                  onChange={(e) => setEditingMessage(m => ({ ...m, text: e.target.value }))}
                  placeholder="e.g. ✨ Spring Studio Promotion: Book 2 photography shoots and get 20% off drone coverage!"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-text text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Badge Text */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Optional Highlight Badge</label>
                <input
                  type="text"
                  value={editingMessage.badge_text || ""}
                  onChange={(e) => setEditingMessage(m => ({ ...m, badge_text: e.target.value }))}
                  placeholder="e.g. 20% OFF, LIMITED TIME, NEW, IMPORTANT"
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-text text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Link CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">CTA Button Label</label>
                  <input
                    type="text"
                    value={editingMessage.link_label || ""}
                    onChange={(e) => setEditingMessage(m => ({ ...m, link_label: e.target.value }))}
                    placeholder="e.g. View Packages, Book Studio"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-text text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">CTA Target URL</label>
                  <input
                    type="text"
                    value={editingMessage.link_url || ""}
                    onChange={(e) => setEditingMessage(m => ({ ...m, link_url: e.target.value }))}
                    placeholder="e.g. #pricing, #contact, /client/register"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-text text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="target-blank"
                  checked={Boolean(editingMessage.link_target_blank)}
                  onChange={(e) => setEditingMessage(m => ({ ...m, link_target_blank: e.target.checked ? 1 : 0 }))}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="target-blank" className="text-xs text-text cursor-pointer">
                  Open CTA link in a new browser tab
                </label>
              </div>

              {/* Scheduling (Start & End Dates) */}
              <div className="p-3.5 rounded-xl border border-border bg-background/50 space-y-2">
                <div className="text-xs font-semibold text-text flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Scheduling & Visibility Window (Optional)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-muted-text mb-1">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={editingMessage.start_date ? editingMessage.start_date.slice(0, 16) : ""}
                      onChange={(e) => setEditingMessage(m => ({ ...m, start_date: e.target.value || null }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-text text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-muted-text mb-1">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={editingMessage.end_date ? editingMessage.end_date.slice(0, 16) : ""}
                      onChange={(e) => setEditingMessage(m => ({ ...m, end_date: e.target.value || null }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-text text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingMessage(m => ({ ...m, start_date: null, end_date: null }))}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Clear dates (Always Active)
                  </button>
                </div>
              </div>

              {/* Dismissible & Enabled Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                  <span className="text-xs font-medium text-text">Allow visitor to dismiss (X)</span>
                  <input
                    type="checkbox"
                    checked={Boolean(editingMessage.is_dismissible)}
                    onChange={(e) => setEditingMessage(m => ({ ...m, is_dismissible: e.target.checked ? 1 : 0 }))}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                  <span className="text-xs font-medium text-text">Announcement Enabled</span>
                  <input
                    type="checkbox"
                    checked={Boolean(editingMessage.is_enabled)}
                    onChange={(e) => setEditingMessage(m => ({ ...m, is_enabled: e.target.checked ? 1 : 0 }))}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                </div>
              </div>

              {/* Dismiss Scope */}
              {Boolean(editingMessage.is_dismissible) && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-text">Dismiss Scope</label>
                  <select
                    value={editingMessage.dismiss_scope || "session"}
                    onChange={(e) => setEditingMessage(m => ({ ...m, dismiss_scope: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-text text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="session">Per Session (reappears on next visit / browser reopen)</option>
                    <option value="permanent">Permanent (saved in localStorage until storage cleared)</option>
                  </select>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMessageModalOpen(false);
                    setEditingMessage(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface/80 text-text text-sm font-semibold"
                >
                  {tUi("admin.clients.cancel")}</button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 shadow-sm"
                >
                  {editingMessage.id ? "Update Announcement" : "Create Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          CREATE / EDIT CATEGORY MODAL
         ========================================================================= */}
      {categoryModalOpen && editingCategory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-text">
                {editingCategory.id ? "Edit Category" : "Create New Category"}
              </h3>
              <button
                onClick={() => {
                  setCategoryModalOpen(false);
                  setEditingCategory(null);
                }}
                className="p-1.5 rounded-lg hover:bg-background text-muted-text hover:text-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Category Code / Slug *</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.name || ""}
                    onChange={(e) => setEditingCategory(c => ({ ...c, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                    placeholder="e.g. discount, info, alert"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-text text-sm focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Display Label *</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.label || ""}
                    onChange={(e) => setEditingCategory(c => ({ ...c, label: e.target.value }))}
                    placeholder="e.g. Special Offer, Notice, Alert"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-text text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">Category Icon</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl border border-border bg-background/50">
                  {AVAILABLE_CATEGORY_ICONS.map(({ id, label, icon: IconComponent }) => {
                    const isSelected = (editingCategory.icon || "info") === id;
                    return (
                      <button
                        type="button"
                        key={id}
                        onClick={() => setEditingCategory(c => ({ ...c, icon: id }))}
                        title={label}
                        className={`p-2.5 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected 
                            ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary" 
                            : "hover:bg-surface text-muted-text hover:text-text"
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                        <span className="text-[9px] truncate max-w-full">{id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Presets & Pickers */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">Background Color Preset</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { label: "Emerald", hex: "#059669" },
                    { label: "Sky Blue", hex: "#0284c7" },
                    { label: "Amber", hex: "#d97706" },
                    { label: "Rose", hex: "#e11d48" },
                    { label: "Violet", hex: "#7c3aed" },
                    { label: "Indigo", hex: "#4f46e5" },
                    { label: "Teal", hex: "#0d9488" },
                    { label: "Slate", hex: "#334155" },
                    { label: "Dark", hex: "#18181b" }
                  ].map(preset => (
                    <button
                      type="button"
                      key={preset.hex}
                      onClick={() => setEditingCategory(c => ({ ...c, bg_color: preset.hex }))}
                      style={{ backgroundColor: preset.hex }}
                      className={`px-3 py-1 rounded-lg text-white text-xs font-semibold transition-all ${
                        editingCategory.bg_color === preset.hex ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105" : "opacity-90 hover:opacity-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-muted-text mb-1">Custom Background Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingCategory.bg_color || "#0284c7"}
                        onChange={(e) => setEditingCategory(c => ({ ...c, bg_color: e.target.value }))}
                        className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={editingCategory.bg_color || "#0284c7"}
                        onChange={(e) => setEditingCategory(c => ({ ...c, bg_color: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-text text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-muted-text mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingCategory.text_color || "#ffffff"}
                        onChange={(e) => setEditingCategory(c => ({ ...c, text_color: e.target.value }))}
                        className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={editingCategory.text_color || "#ffffff"}
                        onChange={(e) => setEditingCategory(c => ({ ...c, text_color: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-text text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Live Preview Badge */}
              <div className="p-3.5 rounded-xl border border-dashed border-border flex items-center justify-between">
                <span className="text-xs text-muted-text">Live Category Badge Preview:</span>
                <div
                  style={{
                    backgroundColor: editingCategory.bg_color || "#0284c7",
                    color: editingCategory.text_color || "#ffffff"
                  }}
                  className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 shadow-xs"
                >
                  <CategoryIcon icon={editingCategory.icon || "info"} className="w-4 h-4" />
                  <span>{editingCategory.label || "Sample Label"}</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface/80 text-text text-sm font-semibold"
                >
                  {tUi("admin.clients.cancel")}</button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 shadow-sm"
                >
                  {editingCategory.id ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
