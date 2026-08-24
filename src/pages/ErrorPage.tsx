import { Component, ErrorInfo, ReactNode, useEffect, useState } from "react";
import { ArrowLeft, Home, LockKeyhole, RefreshCw, SearchX, ServerCrash, ShieldAlert } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { tUi } from "../lib/i18n";
import { usePageTitle } from "../hooks/usePageTitle";

export type ErrorStatus = 401 | 403 | 404 | 500 | 503;

const statusIcon = {
  401: LockKeyhole,
  403: ShieldAlert,
  404: SearchX,
  500: ServerCrash,
  503: ServerCrash,
} satisfies Record<ErrorStatus, typeof SearchX>;

export function ErrorPage({ status = 404, embedded = false }: { status?: ErrorStatus; embedded?: boolean }) {
  const { currentLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const Icon = statusIcon[status];
  const [secondsRemaining, setSecondsRemaining] = useState(3);
  const tr = (suffix: string, fallback: string) => tUi(`error.${status}.${suffix}`, currentLang, fallback);
  const title = tr("title", status === 404 ? "Page not found" : "Something went wrong");
  usePageTitle(`${status} — ${title}`, "SPS Studio");

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => navigate("/", { replace: true }), 3000);
    const countdownTimer = window.setInterval(() => setSecondsRemaining((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => {
      window.clearTimeout(redirectTimer);
      window.clearInterval(countdownTimer);
    };
  }, [navigate]);

  return (
    <main className={`relative isolate flex items-center justify-center overflow-hidden bg-background px-4 ${embedded ? "min-h-[70vh] py-12" : "min-h-screen py-20"}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(72,200,255,.18),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(11,135,235,.14),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[.045] [background-image:linear-gradient(rgba(72,200,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(72,200,255,.8)_1px,transparent_1px)] [background-size:48px_48px]" />
      <section className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-border bg-surface/90 p-6 text-center shadow-2xl backdrop-blur-xl sm:p-10 md:p-14">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/25 bg-primary/10 text-primary shadow-[0_0_45px_rgba(72,200,255,.18)]">
          <Icon className="h-9 w-9" aria-hidden="true" />
        </div>
        <div className="mt-7 text-sm font-black uppercase tracking-[.35em] text-primary">HTTP {status}</div>
        <h1 className="mt-3 text-4xl font-black tracking-[-.04em] text-text sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-text sm:text-lg">{tr("description", "The requested page is unavailable.")}</p>
        <p className="mt-3 text-sm font-semibold text-primary">Automatikus átirányítás a főoldalra: {secondsRemaining} mp</p>
        {status === 404 && <p className="mx-auto mt-3 max-w-xl truncate rounded-xl border border-border bg-background/70 px-4 py-2 font-mono text-xs text-muted-text" title={location.pathname}>{location.pathname}</p>}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold text-text transition hover:border-primary/50 hover:bg-surface-hover">
            <ArrowLeft className="mr-2 h-4 w-4" />{tUi("error.action.back", currentLang, "Go back")}
          </button>
          {(status === 500 || status === 503) ? (
            <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition hover:opacity-90">
              <RefreshCw className="mr-2 h-4 w-4" />{tUi("error.action.retry", currentLang, "Try again")}
            </button>
          ) : (
            <Link to="/" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition hover:opacity-90">
              <Home className="mr-2 h-4 w-4" />{tUi("error.action.home", currentLang, "Back to home")}
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[UI ErrorBoundary]", error, info.componentStack);
  }

  render() {
    return this.state.failed ? <ErrorPage status={500} /> : this.props.children;
  }
}

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}
