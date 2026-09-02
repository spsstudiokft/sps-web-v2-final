import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

type NoticeTone = "success" | "error" | "warning" | "info";
type ConfirmOptions = { title?: string; confirmLabel?: string; tone?: "danger" | "primary" };
type PendingConfirmation = { message: string; options: ConfirmOptions; resolve: (confirmed: boolean) => void };
type FeedbackContextValue = { notify: (message: string, tone?: NoticeTone) => void; confirm: (message: string, options?: ConfirmOptions) => Promise<boolean> };
declare global { var appConfirm: (message: string, options?: ConfirmOptions) => Promise<boolean>; }

const FeedbackContext = createContext<FeedbackContextValue | null>(null);
let confirmBridge: FeedbackContextValue["confirm"] | null = null;
let notifyBridge: FeedbackContextValue["notify"] | null = null;
export const confirmAction = (message: string, options?: ConfirmOptions) => confirmBridge ? confirmBridge(message, options) : Promise.resolve(false);
export const notifyAction = (message: string, tone: NoticeTone = "info") => notifyBridge?.(message, tone);

export function AppFeedbackProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Array<{ id: number; message: string; tone: NoticeTone }>>([]);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const sequence = useRef(0);
  const notify = useCallback((message: string, tone: NoticeTone = "info") => { const id = ++sequence.current; setNotices((items) => [...items, { id, message, tone }].slice(-4)); window.setTimeout(() => setNotices((items) => items.filter((item) => item.id !== id)), 4500); }, []);
  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => new Promise<boolean>((resolve) => setPending({ message, options, resolve })), []);
  useEffect(() => { confirmBridge = confirm; notifyBridge = notify; globalThis.appConfirm = confirm; const originalAlert = window.alert; window.alert = (message?: unknown) => notify(String(message || ""), "error"); return () => { confirmBridge = null; notifyBridge = null; window.alert = originalAlert; }; }, [confirm, notify]);
  const finish = (confirmed: boolean) => { pending?.resolve(confirmed); setPending(null); };
  const icons = { success: CheckCircle2, error: AlertCircle, warning: TriangleAlert, info: Info };
  const tones = { success: "border-emerald-500/30 text-emerald-700 dark:text-emerald-300", error: "border-rose-500/30 text-rose-700 dark:text-rose-300", warning: "border-amber-500/30 text-amber-700 dark:text-amber-300", info: "border-primary/30 text-text" };
  return <FeedbackContext.Provider value={{ notify, confirm }}>{children}<div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2" aria-live="polite">{notices.map((notice) => { const Icon = icons[notice.tone]; return <div key={notice.id} className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-background px-4 py-3 shadow-2xl backdrop-blur ${tones[notice.tone]}`}><Icon className="mt-0.5 h-5 w-5 shrink-0" /><p className="flex-1 text-sm font-medium">{notice.message}</p><button type="button" onClick={() => setNotices((items) => items.filter((item) => item.id !== notice.id))} aria-label="Értesítés bezárása" className="rounded-lg p-1 hover:bg-surface"><X className="h-4 w-4" /></button></div>; })}</div>{pending && <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="app-confirm-title" onMouseDown={(event) => event.target === event.currentTarget && finish(false)}><section className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"><div className="flex items-start gap-3 border-b border-border p-5"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${pending.options.tone === "danger" ? "bg-rose-500/10 text-rose-600" : "bg-primary/10 text-primary"}`}><TriangleAlert className="h-5 w-5" /></div><div><h2 id="app-confirm-title" className="font-bold text-text">{pending.options.title || "Megerősítés szükséges"}</h2><p className="mt-1 whitespace-pre-line text-sm text-muted-text">{pending.message}</p></div></div><div className="flex justify-end gap-2 p-4"><button type="button" onClick={() => finish(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface">Mégse</button><button type="button" autoFocus onClick={() => finish(true)} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${pending.options.tone === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-primary hover:bg-primary/90"}`}>{pending.options.confirmLabel || "Megerősítés"}</button></div></section></div>}</FeedbackContext.Provider>;
}

export function useAppFeedback() { const context = useContext(FeedbackContext); if (!context) throw new Error("useAppFeedback must be used within AppFeedbackProvider"); return context; }
