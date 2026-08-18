import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, CheckCircle2, Cookie, FileCheck2, FileWarning, Scale, X } from "lucide-react";
import { Language } from "../../lib/types";
import { useApi } from "../../hooks/useApi";
import { Button } from "../ui/Button";
import { RichTextEditor } from "./RichTextEditor";

type LegalType = "privacy" | "terms" | "cookies" | "legal_notice";
type LocaleDocument = { title: string; content: string; updated_at?: string };
type LegalDocuments = Record<LegalType, Record<string, LocaleDocument>>;

const DOCUMENTS: Array<{ type: LegalType; label: string; description: string; icon: typeof Scale }> = [
  { type: "privacy", label: "Privacy Policy", description: "Personal data processing and visitor privacy information.", icon: FileCheck2 },
  { type: "terms", label: "Terms & Conditions", description: "Contractual terms governing studio services and orders.", icon: BookOpen },
  { type: "cookies", label: "Cookie Policy", description: "Cookie categories, purposes, retention and consent details.", icon: Cookie },
  { type: "legal_notice", label: "Legal Notice", description: "Publisher, ownership, liability and copyright statement.", icon: Scale },
];

const EMPTY_DOCUMENTS: LegalDocuments = { privacy: {}, terms: {}, cookies: {}, legal_notice: {} };

export function LegalDocumentsManager({ languages, defaultLanguage }: { languages: Language[]; defaultLanguage: string }) {
  const { fetchApi } = useApi();
  const [documents, setDocuments] = useState<LegalDocuments>(EMPTY_DOCUMENTS);
  const [editingType, setEditingType] = useState<LegalType | null>(null);
  const [locale, setLocale] = useState(defaultLanguage || "en");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeLanguages = useMemo(() => languages.length ? languages : [{ code: "en", name: "English" }], [languages]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/api/admin/legal-documents");
      if (res.ok) setDocuments({ ...EMPTY_DOCUMENTS, ...(await res.json()) });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadDocuments(); }, []);

  useEffect(() => {
    if (!editingType) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [editingType]);

  const openEditor = (type: LegalType) => {
    const existing = documents[type]?.[locale];
    const definition = DOCUMENTS.find((doc) => doc.type === type)!;
    setEditingType(type);
    setTitle(existing?.title || definition.label);
    setContent(existing?.content || `<h2>${definition.label}</h2><p>Enter the legal document content here.</p>`);
    setFeedback(null);
  };

  const changeLocale = (nextLocale: string) => {
    setLocale(nextLocale);
    if (!editingType) return;
    const existing = documents[editingType]?.[nextLocale];
    const definition = DOCUMENTS.find((doc) => doc.type === editingType)!;
    setTitle(existing?.title || definition.label);
    setContent(existing?.content || `<h2>${definition.label}</h2><p>Enter the legal document content here.</p>`);
  };

  const save = async () => {
    if (!editingType || !title.trim() || !content.trim()) return;
    setSaving(true); setFeedback(null);
    try {
      const res = await fetchApi(`/api/admin/legal-documents/${editingType}/${locale}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, content }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save document");
      setDocuments((prev) => ({ ...prev, [editingType]: { ...prev[editingType], [locale]: data.document } }));
      setTitle(data.document.title); setContent(data.document.content); setFeedback("Document saved and published successfully.");
    } catch (error: any) { setFeedback(error.message || "Failed to save document"); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOCUMENTS.map((doc) => {
          const Icon = doc.icon;
          const completed = activeLanguages.filter((lang) => documents[doc.type]?.[lang.code]?.content).length;
          return (
            <button key={doc.type} type="button" onClick={() => openEditor(doc.type)} className="text-left p-4 rounded-2xl border border-border bg-surface hover:border-primary/50 hover:shadow-md transition-all group">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></div>
                <div className="min-w-0 flex-1"><h4 className="font-bold text-text group-hover:text-primary">{doc.label}</h4><p className="text-xs text-muted-text mt-1">{doc.description}</p><div className="mt-3 text-[11px] text-muted-text flex items-center gap-1.5">{completed === activeLanguages.length ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <FileWarning className="w-3.5 h-3.5 text-amber-500" />}{completed}/{activeLanguages.length} languages published</div></div>
              </div>
            </button>
          );
        })}
      </div>
      {loading && <p className="text-xs text-muted-text mt-3">Loading legal documents…</p>}

      {editingType && createPortal(
        <div className="fixed inset-0 z-[9999] w-screen h-[100dvh] bg-background overflow-hidden flex flex-col">
          <div className="aero-frost-modal h-full w-full flex flex-col bg-background overflow-hidden">
            <div className="px-4 sm:px-6 py-3.5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-background/90 backdrop-blur-xl">
              <div className="min-w-0"><h3 className="text-lg font-bold text-text truncate">{DOCUMENTS.find((doc) => doc.type === editingType)?.label} Editor</h3><p className="text-xs text-muted-text hidden sm:block">Formatted content is published directly to the matching footer modal.</p></div>
              <div className="flex items-center gap-2 shrink-0"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save & Publish"}</Button><button type="button" aria-label="Close editor" onClick={() => setEditingType(null)} className="p-2.5 rounded-xl text-muted-text hover:text-text hover:bg-surface"><X className="w-5 h-5" /></button></div>
            </div>
            <div className="px-4 sm:px-6 py-3 border-b border-border bg-background shrink-0">
              <div className="grid sm:grid-cols-[200px_1fr] gap-3 max-w-[1400px] mx-auto">
                <select value={locale} onChange={(e) => changeLocale(e.target.value)} className="px-3 py-2.5 rounded-xl bg-surface border border-border text-text text-sm">{activeLanguages.map((lang) => <option key={lang.code} value={lang.code}>{lang.name || lang.code} ({lang.code.toUpperCase()})</option>)}</select>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" className="px-4 py-2.5 rounded-xl bg-surface border border-border text-text font-semibold" />
              </div>
            </div>
            <div className="flex-1 min-h-0 p-3 sm:p-4"><RichTextEditor value={content} onChange={setContent} fullHeight /></div>
            {feedback && <div className="px-4 sm:px-6 py-3 border-t border-primary/20 bg-primary/10 text-sm text-text shrink-0">{feedback}</div>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
