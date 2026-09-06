import { AnimatePresence, motion } from "motion/react";
import { FileText, X } from "lucide-react";
import { tUi } from "../../lib/i18n";

export function LegalDocumentModal({ open, title, content, updatedAt, language, defaultLanguage, onClose }: { open: boolean; title: string; content: string; updatedAt?: string; language: string; defaultLanguage: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[110] flex items-center justify-center overflow-hidden bg-slate-950/70 p-3 backdrop-blur-md sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.article role="dialog" aria-modal="true" aria-labelledby="legal-document-title" initial={{ opacity: 0, y: 28, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }} transition={{ duration: 0.25 }} className="aero-legal-modal aero-frost-modal flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl sm:max-h-[calc(100dvh-3rem)]">
            <header className="z-10 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface/90 px-5 py-4 backdrop-blur-xl sm:px-7 sm:py-5">
              <div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div><div className="min-w-0"><h2 id="legal-document-title" className="text-lg sm:text-xl font-bold text-text truncate">{title}</h2>{updatedAt && <p className="text-[11px] text-muted-text mt-0.5">{tUi("legal.last_updated", language, { date: new Date(updatedAt).toLocaleDateString(language) }, defaultLanguage)}</p>}</div></div>
              <button type="button" onClick={onClose} aria-label={tUi("legal.close", language, undefined, defaultLanguage)} className="p-2.5 rounded-xl text-muted-text hover:text-text hover:bg-background"><X className="w-5 h-5" /></button>
            </header>
            <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain bg-surface p-5 [-webkit-overflow-scrolling:touch] sm:p-8 md:p-10">
              {content ? <div className="legal-document-content" dangerouslySetInnerHTML={{ __html: content }} /> : <p className="text-muted-text text-center py-16">{tUi("legal.not_published", language, undefined, defaultLanguage)}</p>}
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
