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
  const [notices, setNotices] = useState<Array<{ id: number; message: string; tone: NoticeTone; leaving?: boolean }>>([]);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const sequence = useRef(0);
  const dismissNotice = useCallback((id: number) => {
    setNotices((items) => items.map((item) => item.id === id ? { ...item, leaving: true } : item));
    window.setTimeout(() => setNotices((items) => items.filter((item) => item.id !== id)), 260);
  }, []);
  const notify = useCallback((message: string, tone: NoticeTone = "info") => { const id = ++sequence.current; setNotices((items) => [...items, { id, message, tone }].slice(-4)); window.setTimeout(() => dismissNotice(id), 4250); }, [dismissNotice]);
  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => new Promise<boolean>((resolve) => setPending({ message, options, resolve })), []);
  useEffect(() => { confirmBridge = confirm; notifyBridge = notify; globalThis.appConfirm = confirm; const originalAlert = window.alert; window.alert = (message?: unknown) => notify(String(message || ""), "error"); return () => { confirmBridge = null; notifyBridge = null; window.alert = originalAlert; }; }, [confirm, notify]);
  const finish = (confirmed: boolean) => { pending?.resolve(confirmed); setPending(null); };
  const icons = { success: CheckCircle2, error: AlertCircle, warning: TriangleAlert, info: Info };
  const tones = {
    success: "border-emerald-400/45 bg-emerald-500/15 text-emerald-950 shadow-[0_18px_45px_rgba(16,185,129,0.22)] dark:text-emerald-100",
    error: "border-rose-400/45 bg-rose-500/15 text-rose-950 shadow-[0_18px_45px_rgba(244,63,94,0.22)] dark:text-rose-100",
    warning: "border-amber-400/45 bg-amber-500/15 text-amber-950 shadow-[0_18px_45px_rgba(245,158,11,0.22)] dark:text-amber-100",
    info: "border-primary/45 bg-primary/15 text-text shadow-[0_18px_45px_color-mix(in_srgb,var(--theme-primary)_22%,transparent)]",
  };
  const isDanger = pending?.options.tone === "danger";
  const confirmationGlass = isDanger
    ? "border-rose-400/40 bg-rose-950/35 shadow-[0_24px_70px_rgba(244,63,94,0.24)]"
    : "border-primary/40 bg-slate-950/35 shadow-[0_24px_70px_color-mix(in_srgb,var(--theme-primary)_24%,transparent)]";
  return <FeedbackContext.Provider value={{ notify, confirm }}>{children}<div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2" aria-live="polite">{notices.map((notice) => { const Icon = icons[notice.tone]; return <div key={notice.id} className={`app-feedback-toast ${notice.leaving ? "app-feedback-toast--leaving" : ""} pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border px-4 py-3 backdrop-blur-2xl ${tones[notice.tone]}`}><Icon className="app-feedback-toast-icon mt-0.5 h-5 w-5 shrink-0" /><p className="relative z-10 flex-1 text-sm font-medium">{notice.message}</p><button type="button" onClick={() => dismissNotice(notice.id)} aria-label="Értesítés bezárása" className="relative z-10 rounded-lg p-1 hover:bg-white/15"><X className="h-4 w-4" /></button></div>; })}</div>{pending && <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="app-confirm-title" onMouseDown={(event) => event.target === event.currentTarget && finish(false)}><section className={`app-feedback-dialog relative w-full max-w-md overflow-hidden rounded-2xl border backdrop-blur-2xl ${confirmationGlass}`}><div className="relative z-10 flex items-start gap-3 border-b border-white/15 p-5"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDanger ? "bg-rose-400/20 text-rose-100" : "bg-primary/20 text-primary"}`}><TriangleAlert className="h-5 w-5" /></div><div><h2 id="app-confirm-title" className="font-bold text-white">{pending.options.title || "Megerősítés szükséges"}</h2><p className="mt-1 whitespace-pre-line text-sm text-slate-200">{pending.message}</p></div></div><div className="relative z-10 flex justify-end gap-2 p-4"><button type="button" onClick={() => finish(false)} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Mégse</button><button type="button" autoFocus onClick={() => finish(true)} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${isDanger ? "bg-rose-500/90 hover:bg-rose-500" : "bg-primary/90 hover:bg-primary"}`}>{pending.options.confirmLabel || "Megerősítés"}</button></div></section></div>}</FeedbackContext.Provider>;
}

export function useAppFeedback() { const context = useContext(FeedbackContext); if (!context) throw new Error("useAppFeedback must be used within AppFeedbackProvider"); return context; }
