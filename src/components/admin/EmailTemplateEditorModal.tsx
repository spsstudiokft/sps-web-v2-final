import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Save, 
  RotateCcw, 
  Send, 
  Eye, 
  Code, 
  FileText, 
  Sparkles, 
  Smartphone, 
  Monitor, 
  Check, 
  AlertTriangle, 
  Loader2, 
  Info, 
  Clock, 
  Copy, 
  ExternalLink,
  ShieldAlert,
  Layers,
  ChevronRight
} from "lucide-react";
import { EmailTemplate, EmailTemplateToken } from "../../lib/types";
import { Button } from "../ui/Button";

interface EmailTemplateEditorModalProps {
  template: EmailTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedTemplate: EmailTemplate) => void;
  allowReset?: boolean;
}

export function EmailTemplateEditorModal({
  template,
  isOpen,
  onClose,
  onSaved,
  allowReset = true
}: EmailTemplateEditorModalProps) {
  if (!isOpen || !template) return null;

  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.body_html);
  const [bodyText, setBodyText] = useState(template.body_text);
  const [sampleData, setSampleData] = useState<Record<string, any>>(template.sample_data || {});
  const [activeTab, setActiveTab] = useState<"editor" | "preview" | "test">("editor");
  const [bodyFormat, setBodyFormat] = useState<"html" | "text">("html");
  const [deviceView, setDeviceView] = useState<"desktop" | "mobile" | "plaintext">("desktop");
  const [tokenSearch, setTokenSearch] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Live preview state
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Save / Reset / Test state
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string; messageId?: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Refs for insertion
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const plainTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lastFocusedFieldRef = useRef<"subject" | "html" | "text">("html");

  // Sync state when template changes
  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setBodyHtml(template.body_html);
      setBodyText(template.body_text);
      setSampleData(template.sample_data || {});
      setTestStatus(null);
      setFeedback(null);
    }
  }, [template]);

  // Debounced live preview generation
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
        const res = await fetch("/api/admin/email/templates/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            templateKey: template.template_key,
            subject,
            bodyHtml,
            bodyText,
            sampleData
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (active) {
            setPreviewHtml(data.html || "");
            setPreviewSubject(data.subject || "");
            setPreviewText(data.text || "");
          }
        }
      } catch (err) {
        console.error("Preview render failed:", err);
      } finally {
        if (active) setPreviewLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [template.template_key, subject, bodyHtml, bodyText, sampleData]);

  // Insert token at cursor in the last focused field
  const handleInsertToken = (tokenStr: string) => {
    if (lastFocusedFieldRef.current === "subject" && subjectInputRef.current) {
      const input = subjectInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const next = subject.substring(0, start) + tokenStr + subject.substring(end);
      setSubject(next);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + tokenStr.length, start + tokenStr.length);
      }, 50);
    } else if (bodyFormat === "text" && plainTextareaRef.current) {
      const textarea = plainTextareaRef.current;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const next = bodyText.substring(0, start) + tokenStr + bodyText.substring(end);
      setBodyText(next);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tokenStr.length, start + tokenStr.length);
      }, 50);
    } else if (htmlTextareaRef.current) {
      const textarea = htmlTextareaRef.current;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const next = bodyHtml.substring(0, start) + tokenStr + bodyHtml.substring(end);
      setBodyHtml(next);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tokenStr.length, start + tokenStr.length);
      }, 50);
    }

    setCopiedToken(tokenStr);
    setTimeout(() => setCopiedToken(null), 1800);
  };

  // Save changes
  const handleSave = async () => {
    if (!subject.trim()) {
      setFeedback({ type: "error", message: "Subject line cannot be empty." });
      return;
    }
    if (!bodyHtml.trim()) {
      setFeedback({ type: "error", message: "HTML body cannot be empty." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`/api/admin/email/templates/${template.template_key}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          subject,
          body_html: bodyHtml,
          body_text: bodyText
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save template");
      }

      setFeedback({ type: "success", message: `Template '${template.name}' saved successfully (v${data.template.version}).` });
      onSaved(data.template);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to save template changes." });
    } finally {
      setSaving(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    if (!window.confirm(`Are you sure you want to reset "${template.name}" back to the system factory default? All custom edits will be discarded.`)) {
      return;
    }

    setResetting(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`/api/admin/email/templates/${template.template_key}/reset`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset template");
      }

      setSubject(data.template.subject);
      setBodyHtml(data.template.body_html);
      setBodyText(data.template.body_text);
      setFeedback({ type: "success", message: `Template reset to pristine default.` });
      onSaved(data.template);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to reset template." });
    } finally {
      setResetting(false);
    }
  };

  // Send test email
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient || !testRecipient.includes("@")) {
      setTestStatus({ success: false, message: "Please provide a valid recipient email address." });
      return;
    }

    setSendingTest(true);
    setTestStatus(null);

    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/email/templates/send-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          recipient: testRecipient.trim(),
          templateKey: template.template_key,
          subject,
          bodyHtml,
          bodyText,
          sampleData
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setTestStatus({
          success: false,
          message: data.error || "Failed to dispatch test email."
        });
      } else {
        setTestStatus({
          success: true,
          message: data.notice || "Test email dispatched successfully.",
          messageId: data.messageId
        });
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: err.message || "Network exception during test dispatch."
      });
    } finally {
      setSendingTest(false);
    }
  };

  const filteredTokens = (template.available_tokens || []).filter(t => 
    t.token.toLowerCase().includes(tokenSearch.toLowerCase()) ||
    t.label.toLowerCase().includes(tokenSearch.toLowerCase()) ||
    t.description.toLowerCase().includes(tokenSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-70 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-background border border-border shadow-2xl rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 px-5 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-text">{template.name}</h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-background border border-border text-muted-text">
                  {template.template_key}
                </span>
                {template.is_customized ? (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    Customized v{template.version}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-500/10 text-muted-text border border-zinc-500/20">
                    System Default
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-text mt-0.5 line-clamp-1">
                {template.description}
              </p>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-2">
            {allowReset && template.is_customized && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={resetting || saving}
                className="text-xs h-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 border-amber-500/20 flex items-center gap-1.5"
                title="Reset to factory default template"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
                <span>Reset Default</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || resetting}
              className="text-xs h-8 bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-1.5 shadow-sm"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Template</span>
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-background text-muted-text hover:text-text transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Feedback Toast */}
        {feedback && (
          <div className={`px-5 py-2.5 text-xs flex items-center justify-between border-b ${
            feedback.type === "success" 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{feedback.message}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setFeedback(null)} 
              className="text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Editor Navigation Tabs */}
        <div className="px-5 border-b border-border bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "editor"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-text hover:text-text"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Editor & Variables</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "preview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-text hover:text-text"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Visual Preview</span>
              {previewLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("test")}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "test"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-text hover:text-text"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Email</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-text">
            <Clock className="w-3 h-3" />
            <span>Updated: {new Date(template.last_updated_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          
          {/* 1. EDITOR & VARIABLES TAB */}
          {activeTab === "editor" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
              
              {/* Left Column: Subject & Template Body (7 cols) */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* Subject Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                      <span>Email Subject Line</span>
                      <span className="text-[10px] text-muted-text font-normal">(Dynamic tokens supported)</span>
                    </label>
                    <span className="text-[11px] text-muted-text font-mono">
                      {subject.length} chars
                    </span>
                  </div>
                  <input
                    ref={subjectInputRef}
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    onFocus={() => { lastFocusedFieldRef.current = "subject"; }}
                    placeholder="e.g. Update on {{project_name}} · {{studio_name}}"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                  />
                </div>

                {/* Body Format Switcher (HTML vs Plain Text) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-text">Email Body Content</label>
                      <div className="inline-flex rounded-lg p-0.5 bg-surface border border-border">
                        <button
                          type="button"
                          onClick={() => {
                            setBodyFormat("html");
                            lastFocusedFieldRef.current = "html";
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                            bodyFormat === "html"
                              ? "bg-primary text-white shadow-xs"
                              : "text-muted-text hover:text-text"
                          }`}
                        >
                          Responsive HTML
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBodyFormat("text");
                            lastFocusedFieldRef.current = "text";
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                            bodyFormat === "text"
                              ? "bg-primary text-white shadow-xs"
                              : "text-muted-text hover:text-text"
                          }`}
                        >
                          Plain Text Fallback
                        </button>
                      </div>
                    </div>

                    <span className="text-[11px] text-muted-text">
                      {bodyFormat === "html" ? "Rendered with Master Luxury Template" : "Fallback for legacy clients"}
                    </span>
                  </div>

                  {bodyFormat === "html" ? (
                    <div className="relative">
                      <textarea
                        ref={htmlTextareaRef}
                        rows={16}
                        value={bodyHtml}
                        onChange={(e) => setBodyHtml(e.target.value)}
                        onFocus={() => { lastFocusedFieldRef.current = "html"; }}
                        placeholder="Write responsive email HTML with inline CSS styling..."
                        className="w-full p-4 rounded-xl border border-border bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-inner resize-y"
                        spellCheck={false}
                      />
                      <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                        HTML5 · {bodyHtml.split("\n").length} lines
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <textarea
                        ref={plainTextareaRef}
                        rows={14}
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        onFocus={() => { lastFocusedFieldRef.current = "text"; }}
                        placeholder="Plain text version for accessibility and text-only email clients..."
                        className="w-full p-4 rounded-xl border border-border bg-background text-text font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                      />
                      <div className="absolute bottom-3 right-3 text-[10px] font-mono text-muted-text bg-surface px-2 py-0.5 rounded border border-border">
                        TXT · {bodyText.length} chars
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-surface border border-border text-xs text-muted-text flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Click any variable on the right to insert directly at your cursor position.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>View Rendered</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Right Column: Dynamic Tokens / Variable Inserter (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col h-full">
                  <div className="flex items-center justify-between pb-2.5 border-b border-border">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold text-text">Available Tokens</h3>
                    </div>
                    <span className="text-[10px] text-muted-text font-mono">
                      {filteredTokens.length} variables
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-text mt-2">
                    Variables are dynamically replaced with recipient and project details upon dispatch.
                  </p>

                  <div className="my-2.5">
                    <input
                      type="text"
                      value={tokenSearch}
                      onChange={(e) => setTokenSearch(e.target.value)}
                      placeholder="Search tokens..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Token List */}
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {filteredTokens.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-text">
                        No matching variables found.
                      </div>
                    ) : (
                      filteredTokens.map((t) => (
                        <div
                          key={t.token}
                          onClick={() => handleInsertToken(t.token)}
                          className="p-2.5 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[11px] font-semibold text-primary group-hover:underline">
                              {t.token}
                            </span>
                            {copiedToken === t.token ? (
                              <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Inserted
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-text opacity-0 group-hover:opacity-100 transition-opacity">
                                Click to insert
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-text font-medium mt-0.5">
                            {t.label}
                          </div>
                          <div className="text-[10px] text-muted-text mt-0.5">
                            {t.description}
                          </div>
                          <div className="text-[10px] text-muted-text font-mono mt-1 opacity-80">
                            Example: <span className="text-text">{t.example}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Global Auto Tokens */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-text mb-1.5">
                      Global Tokens (Always Available)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["{{studio_name}}", "{{current_year}}", "{{footer_text}}", "{{from_email}}", "{{timestamp}}"].map((gt) => (
                        <button
                          key={gt}
                          type="button"
                          onClick={() => handleInsertToken(gt)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-background border border-border text-muted-text hover:text-primary hover:border-primary/40 transition-colors"
                        >
                          {gt}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* 2. LIVE VISUAL PREVIEW TAB */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              
              {/* Preview Controls Bar */}
              <div className="p-3 rounded-xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text">Device Viewport:</span>
                  <div className="inline-flex rounded-lg p-0.5 bg-background border border-border">
                    <button
                      type="button"
                      onClick={() => setDeviceView("desktop")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                        deviceView === "desktop"
                          ? "bg-primary text-white shadow-xs"
                          : "text-muted-text hover:text-text"
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Desktop (600px)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeviceView("mobile")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                        deviceView === "mobile"
                          ? "bg-primary text-white shadow-xs"
                          : "text-muted-text hover:text-text"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Mobile (375px)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeviceView("plaintext")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                        deviceView === "plaintext"
                          ? "bg-primary text-white shadow-xs"
                          : "text-muted-text hover:text-text"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Plain Text</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-text">
                    Rendered with live test tokens
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("test")}
                    className="text-xs h-7 px-2.5"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    <span>Send Test</span>
                  </Button>
                </div>
              </div>

              {/* Rendered Subject Banner */}
              <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                <div className="text-[11px] font-semibold text-muted-text uppercase tracking-wider">
                  Rendered Subject Line
                </div>
                <div className="text-sm font-bold text-text">
                  {previewSubject || subject}
                </div>
              </div>

              {/* Rendered Email Container */}
              <div className="p-4 sm:p-8 bg-slate-900/10 dark:bg-slate-950/40 rounded-2xl border border-border flex justify-center min-h-[480px]">
                {previewLoading ? (
                  <div className="py-24 flex items-center justify-center text-muted-text text-sm gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span>Rendering email markup...</span>
                  </div>
                ) : deviceView === "plaintext" ? (
                  <div className="w-full max-w-[620px] bg-background border border-border p-5 rounded-xl font-mono text-xs text-text whitespace-pre-wrap shadow-md">
                    {previewText || bodyText}
                  </div>
                ) : (
                  <div 
                    className={`transition-all duration-200 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden ${
                      deviceView === "mobile" ? "w-[375px]" : "w-full max-w-[640px]"
                    }`}
                  >
                    <iframe
                      title="Live Email Preview"
                      srcDoc={previewHtml}
                      className="w-full min-h-[580px] bg-white border-0"
                    />
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 3. SEND TEST EMAIL TAB */}
          {activeTab === "test" && (
            <div className="max-w-2xl mx-auto space-y-5 py-4">
              <div className="p-5 rounded-2xl border border-border bg-surface space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Send className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-text">Send Live Deliverability Test</h3>
                </div>

                <p className="text-xs text-muted-text leading-relaxed">
                  Dispatch a real email to test rendering, token interpolation, and deliverability across Outlook, Apple Mail, Gmail, and mobile clients before publishing.
                </p>

                <form onSubmit={handleSendTest} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text">Recipient Email Address</label>
                    <input
                      type="email"
                      required
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      placeholder="e.g. yourname@domain.com"
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-background border border-border text-xs space-y-1 text-muted-text">
                    <div className="font-semibold text-text">Test Dispatch Details:</div>
                    <div>• Template: <span className="font-mono text-text">{template.template_key}</span></div>
                    <div>• Subject: <span className="font-medium text-text">{previewSubject || subject}</span></div>
                  </div>

                  <Button
                    type="submit"
                    disabled={sendingTest}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 text-xs flex items-center justify-center gap-2"
                  >
                    {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{sendingTest ? "Dispatching via Resend..." : "Send Test Email"}</span>
                  </Button>
                </form>

                {testStatus && (
                  <div className={`p-4 rounded-xl text-xs border ${
                    testStatus.success 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  }`}>
                    <div className="flex items-center gap-2 font-semibold">
                      {testStatus.success ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      <span>{testStatus.message}</span>
                    </div>
                    {testStatus.messageId && (
                      <div className="mt-1 font-mono text-[11px] opacity-85">
                        Resend ID: {testStatus.messageId}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 px-5 bg-surface border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-text">
            <span>Version: <strong className="text-text">v{template.version}</strong></span>
            <span>•</span>
            <span>Category: <strong className="text-text capitalize">{template.category}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="text-xs h-8 bg-primary hover:bg-primary/90 text-white font-medium"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              <span>Save & Apply</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
