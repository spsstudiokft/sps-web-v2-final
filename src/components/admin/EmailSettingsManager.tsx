import React, { useState, useEffect } from "react";
import { SiteSettings, EmailLog, EmailTemplate } from "../../lib/types";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";
import { useApi } from "../../hooks/useApi";
import { useLanguage } from "../../contexts/LanguageContext";
import { EmailTemplateEditorModal } from "./EmailTemplateEditorModal";
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ShieldCheck, 
  Globe, 
  FileText, 
  Eye, 
  Trash2, 
  Check, 
  Copy, 
  Info,
  Server,
  Key,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Sparkles,
  Edit3,
  RotateCcw,
  Sliders,
  Code,
  Layers,
  Smartphone,
  Monitor
} from "lucide-react";

interface EmailSettingsManagerProps {
  settings: SiteSettings;
  onChange: (key: keyof SiteSettings, value: string) => void;
}

export function EmailSettingsManager({ settings, onChange }: EmailSettingsManagerProps) {
  const { tUi } = useLanguage();
  const { fetchApi } = useApi();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<"templates" | "config" | "logs">("templates");

  // Templates list state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Active template being edited in the editor modal
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);

  // Quick preview modal state
  const [quickPreviewTemplate, setQuickPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [quickPreviewHtml, setQuickPreviewHtml] = useState<string>("");
  const [quickPreviewSubject, setQuickPreviewSubject] = useState<string>("");
  const [quickPreviewText, setQuickPreviewText] = useState<string>("");
  const [quickPreviewLoading, setQuickPreviewLoading] = useState(false);
  const [quickPreviewDevice, setQuickPreviewDevice] = useState<"desktop" | "mobile" | "text">("desktop");
  const [showQuickPreviewModal, setShowQuickPreviewModal] = useState(false);

  // Test send state
  const [testRecipient, setTestRecipient] = useState("");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("test_email");
  const [customTestSubject, setCustomTestSubject] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    messageId?: string;
    error?: string;
    simulated?: boolean;
  } | null>(null);

  // Config status state
  const [configStatus, setConfigStatus] = useState<{
    apiKeyPresent: boolean;
    maskedKey: string | null;
    fromEmail: string;
    fromName: string;
    replyToEmail: string;
    adminNotificationEmail: string;
    isDefaultDomain: boolean;
  } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingMoreLogs, setLoadingMoreLogs] = useState(false);
  const [logsTotal, setLogsTotal] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<string>("all");

  // Accordion toggle states
  const [showDnsGuide, setShowDnsGuide] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch all templates from API
  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await fetchApi("/api/admin/email/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (e) {
      console.error("Failed to load email templates", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Fetch email config
  const fetchConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await fetchApi("/api/admin/email/config");
      if (res.ok) {
        const data = await res.json();
        setConfigStatus(data);
        if (!testRecipient && data.adminNotificationEmail) {
          setTestRecipient(data.adminNotificationEmail);
        }
      }
    } catch (e) {
      console.error("Failed to load email config", e);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Fetch email logs
  const fetchLogs = async (options: { append?: boolean } = {}) => {
    const append = options.append === true;
    try {
      if (append) setLoadingMoreLogs(true);
      else setLoadingLogs(true);
      const offset = append ? logs.length : 0;
      const res = await fetchApi(`/api/admin/email/logs?limit=100&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        const incoming = Array.isArray(data) ? data : (Array.isArray(data.logs) ? data.logs : []);
        setLogs((current) => append ? [...current, ...incoming] : incoming);
        setLogsTotal(Number(data.total ?? incoming.length));
        setHasMoreLogs(Boolean(data.has_more));
      }
    } catch (e) {
      console.error("Failed to load email logs", e);
    } finally {
      if (append) setLoadingMoreLogs(false);
      else setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchConfig();
    fetchLogs();
  }, []);

  // Quick preview loader
  const handleOpenQuickPreview = async (tmpl: EmailTemplate) => {
    setQuickPreviewTemplate(tmpl);
    setQuickPreviewLoading(true);
    setShowQuickPreviewModal(true);
    try {
      const res = await fetchApi("/api/admin/email/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: tmpl.template_key,
          subject: tmpl.subject,
          bodyHtml: tmpl.body_html,
          bodyText: tmpl.body_text,
          sampleData: tmpl.sample_data
        })
      });
      if (res.ok) {
        const data = await res.json();
        setQuickPreviewHtml(data.html || "");
        setQuickPreviewSubject(data.subject || tmpl.subject);
        setQuickPreviewText(data.text || tmpl.body_text);
      }
    } catch (e) {
      console.error("Failed to render preview", e);
    } finally {
      setQuickPreviewLoading(false);
    }
  };

  // Open editor
  const handleOpenEditor = (tmpl: EmailTemplate) => {
    setEditingTemplate(tmpl);
    setShowEditorModal(true);
  };

  // Template updated callback from modal
  const handleTemplateSaved = (updated: EmailTemplate) => {
    setTemplates(prev => prev.map(t => t.template_key === updated.template_key ? updated : t));
    if (quickPreviewTemplate?.template_key === updated.template_key) {
      setQuickPreviewTemplate(updated);
    }
  };

  // Handle Send Test Email
  const handleSendTest = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!testRecipient || !testRecipient.includes("@")) {
      setTestResult({
        success: false,
        error: tUi("admin.email.runtime.invalid_recipient")
      });
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetchApi("/api/admin/email/templates/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: testRecipient.trim(),
          templateKey: selectedTemplateKey,
          subject: customTestSubject.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setTestResult({
          success: false,
          error: data.error || tUi("admin.email.runtime.test_delivery_failed")
        });
      } else {
        setTestResult({
          success: true,
          message: data.notice || tUi("admin.email.runtime.test_sent"),
          messageId: data.messageId,
          simulated: data.simulated
        });
        fetchLogs(); // refresh logs
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || tUi("admin.email.runtime.test_network_failed")
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Handle Clear Logs
  const handleClearLogs = async () => {
    if (!confirm(tUi("admin.email.runtime.clear_logs_confirm"))) return;
    try {
      setClearingLogs(true);
      const res = await fetchApi("/api/admin/email/logs", { method: "DELETE" });
      if (res.ok) {
        setLogs([]);
        setLogsTotal(0);
        setHasMoreLogs(false);
      }
    } catch (e) {
      console.error("Failed to clear logs", e);
    } finally {
      setClearingLogs(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Category filtering
  const categories = [
    { id: "all", label: "All Templates" },
    { id: "billing", label: "Billing & Payment Requests" },
    { id: "auth", label: "Authentication & Security" },
    { id: "onboarding", label: "Client Onboarding" },
    { id: "production", label: "Production & Media" },
    { id: "notifications", label: "Admin Alerts & Auto-Replies" },
    { id: "diagnostics", label: "Diagnostics & System" }
  ];

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    const matchesSearch = !templateSearch.trim() || 
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.template_key.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.subject.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(templateSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredLogs = logs.filter(l => {
    if (logFilter === "all") return true;
    if (logFilter === "sent") return l.status === "sent";
    if (logFilter === "mock_logged") return l.status === "mock_logged";
    if (logFilter === "failed") return l.status === "failed";
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* 1. Resend Status & Health Banner */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs ${
            configStatus?.apiKeyPresent 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          }`}>
            <Mail className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-text text-sm sm:text-base">{tUi("admin.email.settings.resend_email_engine")}</span>
              {configStatus?.apiKeyPresent ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{tUi("admin.email.settings.live_delivery_active")}</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{tUi("admin.email.settings.sandbox_simulation")}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-text mt-1">
              {configStatus?.apiKeyPresent 
                ? `Active Key: ${configStatus.maskedKey || "Configured in Environment"} · Outgoing: ${configStatus.fromName} <${configStatus.fromEmail}>`
                : "Set RESEND_API_KEY in environment variables for production delivery. All transactional emails are currently logged locally."
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { fetchConfig(); fetchTemplates(); fetchLogs(); }}
            disabled={loadingConfig || loadingTemplates}
            className="text-xs h-8 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingConfig || loadingTemplates ? "animate-spin" : ""}`} />
            <span>{tUi("admin.email.settings.sync_all")}</span>
          </Button>
          <a
            href="https://resend.com/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-surface text-text text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs h-8"
          >
            <span>{tUi("admin.email.settings.resend_dashboard")}</span>
            <ExternalLink className="w-3 h-3 text-muted-text" />
          </a>
        </div>
      </div>

      {/* 2. Top-Level Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "templates"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-text hover:text-text hover:bg-surface"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{tUi("admin.email.settings.email_templates_editor")}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === "templates" ? "bg-white/20 text-white" : "bg-surface border border-border text-muted-text"
          }`}>
            {templates.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("config")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "config"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-text hover:text-text hover:bg-surface"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>{tUi("admin.email.settings.sender_domain_settings")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "logs"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-text hover:text-text hover:bg-surface"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>{tUi("admin.email.settings.activity_logs_delivery")}</span>
          {logs.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === "logs" ? "bg-white/20 text-white" : "bg-surface border border-border text-muted-text"
            }`}>
              {logs.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TRANSACTIONAL EMAIL TEMPLATES CATALOG & VIEWER */}
      {/* ========================================================================= */}
      {activeTab === "templates" && (
        <div className="space-y-5">
          
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface border border-border">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder={tUi("admin.email.settings.search_templates_by_name_key_subject_or_variables")}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Filter className="w-3.5 h-3.5 text-muted-text hidden sm:block mr-1" />
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === c.id
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted-text hover:text-text hover:bg-background"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          {loadingTemplates ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-text text-sm gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>{tUi("admin.email.settings.loading_email_templates_catalog")}</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-border bg-surface/50 p-6">
              <FileText className="w-8 h-8 text-muted-text mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-semibold text-text">{tUi("admin.email.settings.no_matching_templates_found")}</h3>
              <p className="text-xs text-muted-text mt-1">
                {tUi("admin.email.settings.try_clearing_your_search_terms_or_choosing_a_different")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((t) => (
                <div
                  key={t.template_key}
                  className="rounded-2xl border border-border bg-surface hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-4 space-y-3">
                    
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-background border border-border text-muted-text">
                        {t.template_key}
                      </span>
                      {t.is_customized ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          {tUi("admin.email.settings.customized_v")}{t.version}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-500/10 text-muted-text border border-zinc-500/20">
                          {tUi("admin.languages.default")}</span>
                      )}
                    </div>

                    {/* Template Name & Subject */}
                    <div>
                      <h4 className="text-sm font-bold text-text group-hover:text-primary transition-colors">
                        {t.name}
                      </h4>
                      <p className="text-xs text-muted-text mt-1 line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    </div>

                    {/* Subject Preview Line */}
                    <div className="p-2.5 rounded-xl bg-background border border-border text-xs space-y-0.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-text">
                        {tUi("admin.email.settings.subject_line")}</div>
                      <div className="text-xs font-mono font-medium text-text truncate" title={t.subject}>
                        {t.subject}
                      </div>
                    </div>

                    {/* Available Tokens Chips */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-text">
                        <span className="font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-primary" />
                          <span>{tUi("admin.email.settings.variables")}{t.available_tokens?.length || 0})</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-[56px] overflow-hidden">
                        {(t.available_tokens || []).slice(0, 4).map((tok) => (
                          <span
                            key={tok.token}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-background border border-border text-muted-text truncate max-w-[130px]"
                            title={`${tok.label}: ${tok.example}`}
                          >
                            {tok.token}
                          </span>
                        ))}
                        {(t.available_tokens || []).length > 4 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-background text-muted-text">
                            +{(t.available_tokens || []).length - 4} {tUi("admin.email.settings.more")}</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Card Action Footer */}
                  <div className="p-3 px-4 bg-background/50 border-t border-border flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenQuickPreview(t)}
                      className="text-xs font-semibold text-muted-text hover:text-text flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-surface transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{tUi("admin.pricing.tab_preview")}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplateKey(t.template_key);
                          setActiveTab("config");
                        }}
                        className="text-xs h-7 px-2"
                        title={tUi("admin.email.settings.send_live_test_email_with_this_template")}
                      >
                        <Send className="w-3 h-3" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleOpenEditor(t)}
                        className="text-xs h-7 px-3 bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-1 shadow-xs"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{tUi("admin.email.settings.edit_template")}</span>
                      </Button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SENDER & DOMAIN CONFIGURATION */}
      {/* ========================================================================= */}
      {activeTab === "config" && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sender Identity */}
            <div className="space-y-4 p-5 rounded-2xl border border-border bg-surface">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Server className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text">{tUi("admin.email.settings.default_outgoing_sender")}</h3>
              </div>

              <div>
                <Label htmlFor="resend_from_name" className="text-xs font-semibold text-text">
                  {tUi("admin.email.settings.sender_name_from_name")}</Label>
                <Input
                  id="resend_from_name"
                  type="text"
                  value={settings.resend_from_name ?? "SPS Studio"}
                  onChange={(e) => onChange("resend_from_name", e.target.value)}
                  placeholder={tUi("admin.email.settings.e_g_sps_studio")}
                  className="mt-1 text-sm font-medium"
                />
                <p className="text-[11px] text-muted-text mt-1">
                  {tUi("admin.email.settings.brand_name_displayed_to_clients_in_email_client_list_v")}</p>
              </div>

              <div>
                <Label htmlFor="resend_from_email" className="text-xs font-semibold text-text">
                  {tUi("admin.email.settings.sender_email_address_from_email")}</Label>
                <Input
                  id="resend_from_email"
                  type="email"
                  value={settings.resend_from_email ?? "onboarding@resend.dev"}
                  onChange={(e) => onChange("resend_from_email", e.target.value)}
                  placeholder={tUi("admin.email.settings.e_g_noreply_yourdomain_com_or_onboarding_resend_dev")}
                  className="mt-1 text-sm font-mono"
                />
                <p className="text-[11px] text-muted-text mt-1">
                  {tUi("admin.email.settings.must_belong_to_a_verified_custom_domain_in_resend_or_u")}<code className="text-primary font-mono">{tUi("admin.email.settings.onboarding_resend_dev")}</code> {tUi("admin.email.settings.for_testing")}</p>
              </div>

              <div>
                <Label htmlFor="resend_reply_to" className="text-xs font-semibold text-text">
                  {tUi("admin.email.settings.reply_to_email_address")}</Label>
                <Input
                  id="resend_reply_to"
                  type="email"
                  value={settings.resend_reply_to ?? "contact@spsstudio.com"}
                  onChange={(e) => onChange("resend_reply_to", e.target.value)}
                  placeholder={tUi("admin.email.settings.e_g_contact_spsstudio_com")}
                  className="mt-1 text-sm font-mono"
                />
                <p className="text-[11px] text-muted-text mt-1">
                  {tUi("admin.email.settings.target_address_when_recipients_hit_reply_in_their_emai")}</p>
              </div>
            </div>

            {/* Admin Notifications & Footer */}
            <div className="space-y-4 p-5 rounded-2xl border border-border bg-surface">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text">{tUi("admin.email.settings.admin_notifications_branding")}</h3>
              </div>

              <div>
                <Label htmlFor="admin_notification_email" className="text-xs font-semibold text-text">
                  {tUi("admin.email.settings.admin_alert_recipient_email")}</Label>
                <Input
                  id="admin_notification_email"
                  type="email"
                  value={settings.admin_notification_email ?? "spsstudiokft@gmail.com"}
                  onChange={(e) => onChange("admin_notification_email", e.target.value)}
                  placeholder={tUi("admin.email.settings.e_g_admin_yourdomain_com")}
                  className="mt-1 text-sm font-mono"
                />
                <p className="text-[11px] text-muted-text mt-1">
                  {tUi("admin.email.settings.receives_instant_notifications_whenever_new_inquiries_")}</p>
              </div>

              <div>
                <Label htmlFor="email_brand_display" className="text-xs font-semibold text-text">
                  {tUi("admin.email.settings.email_header_brand_display")}</Label>
                <select
                  id="email_brand_display"
                  value={settings.email_brand_display || settings.header_brand_display || "logo_only"}
                  onChange={(e) => onChange("email_brand_display", e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="logo_only">{tUi("admin.email.settings.uploaded_logo_only")}</option>
                  <option value="logo_and_name">{tUi("admin.email.settings.uploaded_logo_and_studio_name")}</option>
                  <option value="name_only">{tUi("admin.branding.display_name_only")}</option>
                </select>
                <p className="text-[11px] text-muted-text mt-1">
                  {tUi("admin.email.settings.uses_the_uploaded_dark_background_header_logo_on_the_b")}</p>
              </div>

              <div>
                <Label htmlFor="email_footer_text" className="text-xs font-semibold text-text">
                  {tUi("admin.email.settings.master_email_footer_copyright_notice")}</Label>
                <textarea
                  id="email_footer_text"
                  rows={3}
                  value={settings.email_footer_text ?? "SPS Studio · Premium Real Estate Visual Marketing · All rights reserved."}
                  onChange={(e) => onChange("email_footer_text", e.target.value)}
                  placeholder={tUi("admin.email.settings.sps_studio_all_rights_reserved")}
                  className="w-full mt-1 p-2.5 rounded-xl border border-border bg-background text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-[11px] text-muted-text mt-1">
                  {tUi("admin.email.settings.appended_across_all_transactional_html_templates_autom")}</p>
              </div>
            </div>

          </div>

          <div className="p-5 rounded-2xl border border-border bg-surface">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-text">{tUi("admin.email.settings.client_welcome_emails")}</h3>
                <p className="text-xs text-muted-text mt-1.5 max-w-3xl">{tUi("admin.email.settings.client_welcome_emails_description")}</p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.client_welcome_email_enabled !== "0"}
                  onChange={(e) => onChange("client_welcome_email_enabled", e.target.checked ? "1" : "0")}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs font-semibold text-text">{tUi("admin.email.settings.client_welcome_emails_enabled")}</span>
              </label>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-surface">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-text">{tUi("admin.email.settings.internet_archive")}</h3>
                <p className="text-xs text-muted-text mt-1.5 max-w-3xl">{tUi("admin.email.settings.internet_archive_description")}</p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                <input type="checkbox" checked={settings.internet_archive_enabled === "1"} onChange={(e) => onChange("internet_archive_enabled", e.target.checked ? "1" : "0")} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                <span className="text-xs font-semibold text-text">{tUi("admin.email.settings.internet_archive_enabled")}</span>
              </label>
            </div>
          </div>

          {/* Quick Deliverability Test Panel */}
          <div className="p-5 rounded-2xl border border-border bg-surface space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text">{tUi("admin.email.settings.dispatch_live_integration_test")}</h3>
              </div>
              <span className="text-xs text-muted-text">{tUi("admin.email.settings.test_real_smtp_deliverability")}</span>
            </div>

            <form onSubmit={handleSendTest} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-4">
                <Label htmlFor="test_recipient_input" className="text-xs font-semibold text-text">
                  {tUi("admin.email.settings.recipient_email")}</Label>
                <Input
                  id="test_recipient_input"
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder={tUi("admin.email.settings.e_g_yourname_domain_com")}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div className="md:col-span-4">
                <Label htmlFor="test_template_select" className="text-xs font-semibold text-text">
                  {tUi("admin.email.settings.choose_template_to_test")}</Label>
                <select
                  id="test_template_select"
                  value={selectedTemplateKey}
                  onChange={(e) => setSelectedTemplateKey(e.target.value)}
                  className="w-full mt-1 h-9 px-3 rounded-xl border border-border bg-background text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {templates.map((t) => (
                    <option key={t.template_key} value={t.template_key}>
                      {t.name} ({t.template_key})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <Button
                  type="submit"
                  disabled={sendingTest}
                  className="w-full h-9 bg-primary hover:bg-primary/90 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{sendingTest ? "Sending..." : "Dispatch Test"}</span>
                </Button>
              </div>
            </form>

            {testResult && (
              <div className={`p-3.5 rounded-xl text-xs border ${
                testResult.success 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
              }`}>
                <div className="flex items-center gap-2 font-semibold">
                  {testResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{testResult.message || testResult.error}</span>
                </div>
                {testResult.messageId && (
                  <div className="mt-1 font-mono text-[11px] opacity-80">
                    {tUi("admin.email.settings.message_id")}{testResult.messageId}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DNS Configuration Guide Accordion */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDnsGuide(!showDnsGuide)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-background/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-text">{tUi("admin.email.settings.custom_domain_dns_verification_guide_dkim_spf")}</span>
              </div>
              {showDnsGuide ? <ChevronUp className="w-4 h-4 text-muted-text" /> : <ChevronDown className="w-4 h-4 text-muted-text" />}
            </button>

            {showDnsGuide && (
              <div className="p-4 border-t border-border bg-background space-y-3 text-xs">
                <p className="text-muted-text leading-relaxed">
                  {tUi("admin.email.settings.to_send_transactional_emails_directly_from_your_custom")}<code className="text-primary font-mono font-semibold">{tUi("admin.email.settings.noreply_spsstudio_com")}</code>{tUi("admin.email.settings.without_deliverability_warnings_add_these_standard_dns")}</p>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface text-muted-text font-semibold border-b border-border">
                      <tr>
                        <th className="p-2.5">{tUi("admin.budget.filter.type_label")}</th>
                        <th className="p-2.5">{tUi("admin.email.settings.host_name")}</th>
                        <th className="p-2.5">{tUi("admin.email.settings.value_target")}</th>
                        <th className="p-2.5">{tUi("client.invoices.action")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-text font-mono text-[11px]">
                      <tr>
                        <td className="p-2.5 font-bold text-primary">{tUi("admin.email.settings.txt")}</td>
                        <td className="p-2.5">{tUi("admin.email.settings.resend_domainkey")}</td>
                        <td className="p-2.5 text-muted-text truncate max-w-[200px]">{tUi("admin.email.settings.k_rsa_p_migfma0gcs")}</td>
                        <td className="p-2.5">
                          <button
                            type="button"
                            onClick={() => copyToClipboard("resend._domainkey", "dkim_host")}
                            className="text-primary hover:underline text-[11px] font-sans"
                          >
                            {copiedKey === "dkim_host" ? "Copied" : "Copy"}
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-primary">{tUi("admin.email.settings.txt")}</td>
                        <td className="p-2.5">@</td>
                        <td className="p-2.5 text-muted-text">{tUi("admin.email.settings.v_spf1_include_resend_com_all")}</td>
                        <td className="p-2.5">
                          <button
                            type="button"
                            onClick={() => copyToClipboard("v=spf1 include:resend.com ~all", "spf_val")}
                            className="text-primary hover:underline text-[11px] font-sans"
                          >
                            {copiedKey === "spf_val" ? "Copied" : "Copy"}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ACTIVITY LOGS & DELIVERABILITY */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <div className="p-5 rounded-2xl border border-border bg-surface space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-text">{tUi("admin.email.settings.transactional_delivery_logs")}</h3>
              <span className="text-xs text-muted-text">({filteredLogs.length}{logsTotal > filteredLogs.length ? ` / ${logsTotal}` : ""} {tUi("admin.email.settings.events")}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-lg p-0.5 bg-background border border-border text-xs">
                {["all", "sent", "mock_logged", "failed"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setLogFilter(f)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-all ${
                      logFilter === f
                        ? "bg-primary text-white shadow-xs"
                        : "text-muted-text hover:text-text"
                    }`}
                  >
                    {f === "mock_logged" ? "Simulated" : f}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="text-xs h-7 px-2.5 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingLogs ? "animate-spin" : ""}`} />
                <span>{tUi("admin.faq_categories.refresh")}</span>
              </Button>

              {hasMoreLogs && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs({ append: true })}
                  disabled={loadingMoreLogs}
                  className="text-xs h-7 px-2.5 flex items-center gap-1"
                >
                  {loadingMoreLogs ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
                  <span>További naplóbejegyzések</span>
                </Button>
              )}

              {logs.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearLogs}
                  disabled={clearingLogs}
                  className="text-xs h-7 px-2.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  <span>{tUi("admin.email.settings.clear_logs")}</span>
                </Button>
              )}
            </div>
          </div>

          {loadingLogs ? (
            <div className="py-16 flex items-center justify-center text-muted-text text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>{tUi("admin.email.settings.loading_delivery_logs")}</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-text text-xs">
              {tUi("admin.email.settings.no_email_events_matching_current_filter_recorded_yet")}</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs text-left">
                <thead className="bg-background border-b border-border text-muted-text font-semibold">
                  <tr>
                    <th className="p-2.5">{tUi("admin.clients.th_status")}</th>
                    <th className="p-2.5">{tUi("admin.team.th_recipient")}</th>
                    <th className="p-2.5">{tUi("admin.email.settings.subject")}</th>
                    <th className="p-2.5">{tUi("admin.email.settings.template")}</th>
                    <th className="p-2.5">{tUi("admin.email.settings.timestamp")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-background/40">
                      <td className="p-2.5">
                        {log.status === "sent" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {tUi("client.invoice_status.sent")}</span>
                        ) : log.status === "mock_logged" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {tUi("admin.email.settings.simulated")}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" title={log.error_message || ""}>
                            {tUi("admin.email.settings.failed")}</span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] max-w-[160px] truncate">{log.recipient}</td>
                      <td className="p-2.5 font-medium max-w-[220px] truncate">{log.subject}</td>
                      <td className="p-2.5 text-muted-text font-mono text-[11px]">{log.template_id || "custom"}</td>
                      <td className="p-2.5 text-muted-text whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TEMPLATE EDITOR MODAL (Full HTML/Text/Variables/Test Send) */}
      {/* ========================================================================= */}
      {showEditorModal && editingTemplate && (
        <EmailTemplateEditorModal
          template={editingTemplate}
          isOpen={showEditorModal}
          onClose={() => {
            setShowEditorModal(false);
            setEditingTemplate(null);
          }}
          onSaved={handleTemplateSaved}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. QUICK PREVIEW MODAL */}
      {/* ========================================================================= */}
      {showQuickPreviewModal && quickPreviewTemplate && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-background border border-border shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 px-5 border-b border-border bg-surface flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="text-sm font-bold text-text">
                    {quickPreviewTemplate.name}
                  </h3>
                  <p className="text-[11px] text-muted-text font-mono">
                    {quickPreviewTemplate.template_key}
                  </p>
                </div>
              </div>

              {/* View Controls & Close */}
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg p-0.5 bg-background border border-border">
                  <button
                    type="button"
                    onClick={() => setQuickPreviewDevice("desktop")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
                      quickPreviewDevice === "desktop" ? "bg-primary text-white" : "text-muted-text hover:text-text"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>{tUi("admin.email.settings.desktop")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickPreviewDevice("mobile")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
                      quickPreviewDevice === "mobile" ? "bg-primary text-white" : "text-muted-text hover:text-text"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{tUi("admin.email.settings.mobile")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickPreviewDevice("text")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
                      quickPreviewDevice === "text" ? "bg-primary text-white" : "text-muted-text hover:text-text"
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{tUi("themePreview.swatch_short_text")}</span>
                  </button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setShowQuickPreviewModal(false);
                    handleOpenEditor(quickPreviewTemplate);
                  }}
                  className="text-xs h-8 bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  <span>{tUi("admin.email.settings.open_in_editor")}</span>
                </Button>

                <button
                  type="button"
                  onClick={() => setShowQuickPreviewModal(false)}
                  className="p-1.5 rounded-lg hover:bg-background text-muted-text hover:text-text transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Subject Banner */}
            <div className="p-3 px-5 bg-background border-b border-border text-xs">
              <span className="font-semibold text-muted-text">{tUi("admin.email.settings.subject_2")}</span>
              <span className="font-bold text-text">{quickPreviewSubject}</span>
            </div>

            {/* Preview Frame */}
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-slate-900/10 flex justify-center">
              {quickPreviewLoading ? (
                <div className="py-20 flex items-center justify-center text-muted-text text-sm gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span>{tUi("admin.email.settings.rendering_email_preview")}</span>
                </div>
              ) : quickPreviewDevice === "text" ? (
                <div className="w-full max-w-[620px] bg-background border border-border p-5 rounded-xl font-mono text-xs text-text whitespace-pre-wrap shadow-md">
                  {quickPreviewText || quickPreviewTemplate.body_text}
                </div>
              ) : (
                <div className={`transition-all duration-200 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden ${
                  quickPreviewDevice === "mobile" ? "w-[375px]" : "w-full max-w-[620px]"
                }`}>
                  <iframe
                    title={tUi("admin.email.settings.quick_email_preview")}
                    srcDoc={quickPreviewHtml}
                    className="w-full min-h-[520px] bg-white border-0"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 px-5 bg-surface border-t border-border flex items-center justify-between text-xs text-muted-text">
              <span>{tUi("admin.email.settings.inline_css_rendered_multi_client_tested")}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowQuickPreviewModal(false)}
                className="text-xs h-7"
              >
                {tUi("admin.email.settings.close_preview")}</Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
