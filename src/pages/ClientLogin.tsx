import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/Card";
import { 
  Sparkles, 
  KeyRound, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RotateCw, 
  Lock 
} from "lucide-react";

export default function ClientLogin() {
  const { tUi } = useLanguage();
  usePageTitle(tUi("auth.client_login.title") || "Client Portal | SPS Studio");

  const [authMethod, setAuthMethod] = useState<"magic_link" | "password">("magic_link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, token, user } = useAuth();

  // If already authenticated, redirect to appropriate portal
  useEffect(() => {
    if (token) {
      let role = user?.role;
      if (!role && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          role = payload.role;
        } catch {
          role = undefined;
        }
      }
      if (role === "admin" || role === "editor" || role === "viewer") {
        navigate("/admin", { replace: true });
      } else if (role === "client") {
        const from = (location.state as any)?.from?.pathname || "/client";
        navigate(from, { replace: true });
      }
    }
  }, [token, user, navigate, location]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Handle Magic Link Submission
  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), type: "login" }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMagicLinkSent(true);
        setCooldown(60);
      } else {
        setError(data.error || "Failed to dispatch magic link. Please try again.");
      }
    } catch {
      setError(tUi("auth.client_login.error_generic") || "A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend Magic Link
  const handleResendMagicLink = async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), type: "login" }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCooldown(60);
      } else {
        setError(data.error || "Failed to resend magic link.");
      }
    } catch {
      setError("Failed to resend. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Login Submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.ok) {
        const data = await res.json();
        login(data.token, data.user);
        const role = data.user?.role || "client";
        if (role === "admin" || role === "editor" || role === "viewer") {
          navigate("/admin", { replace: true });
        } else {
          const from = (location.state as any)?.from?.pathname || "/client";
          navigate(from, { replace: true });
        }
      } else {
        const data = await res.json();
        setError(data.error || tUi("auth.admin_login.login_failed") || "Invalid email or password");
      }
    } catch {
      setError(tUi("auth.client_login.error_generic") || "A network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aero-auth-page aero-auth-client min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              {authMethod === "magic_link" ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <KeyRound className="w-5 h-5" />
              )}
            </div>

            {/* Auth Method Switcher */}
            {!magicLinkSent && (
              <div className="flex bg-muted/60 p-1 rounded-lg text-xs font-medium border border-border/50">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("magic_link");
                    setError("");
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    authMethod === "magic_link"
                      ? "bg-background text-text shadow-sm font-semibold"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  Magic Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("password");
                    setError("");
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    authMethod === "password"
                      ? "bg-background text-text shadow-sm font-semibold"
                      : "text-muted-text hover:text-text"
                  }`}
                >
                  Password
                </button>
              </div>
            )}
          </div>

          <CardTitle className="text-xl font-bold">
            {tUi("auth.client_login.title") || "Client Portal"}
          </CardTitle>
          <CardDescription>
            {authMethod === "magic_link"
              ? "Sign in instantly with a secure, one-time magic link sent to your inbox."
              : "Sign in with your email address and password."}
          </CardDescription>
        </CardHeader>

        {magicLinkSent ? (
          <CardContent className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-sm space-y-2.5">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Check Your Email</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-text dark:text-emerald-300">
                We've sent a magic login link to:
              </p>
              <div className="p-2 rounded bg-background/80 border border-emerald-500/30 font-mono text-xs font-semibold text-text text-center break-all">
                {email}
              </div>
              <p className="text-xs text-muted-text leading-relaxed">
                Click the link in the message to sign in instantly. The link is valid for <strong>20 minutes</strong>.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <Button
                variant="outline"
                onClick={handleResendMagicLink}
                disabled={cooldown > 0 || loading}
                className="w-full text-xs gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Resending Link...</span>
                  </>
                ) : (
                  <>
                    <RotateCw className={`w-3.5 h-3.5 ${cooldown > 0 ? "opacity-50" : ""}`} />
                    <span>{cooldown > 0 ? `Resend Link in (${cooldown}s)` : "Resend Magic Link"}</span>
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMagicLinkSent(false);
                    setCooldown(0);
                  }}
                  className="text-muted-text hover:text-text underline"
                >
                  Change email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMagicLinkSent(false);
                    setAuthMethod("password");
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in with password
                </button>
              </div>
            </div>
          </CardContent>
        ) : authMethod === "magic_link" ? (
          <form onSubmit={handleMagicLinkSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="magic-email" className="text-xs font-medium">
                  {tUi("auth.admin_login.email") || "Email Address"}
                </Label>
                <div className="relative">
                  <Input
                    id="magic-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@realty.com"
                    className="pl-9 text-sm font-mono"
                    autoFocus
                  />
                  <Mail className="w-4 h-4 text-muted-text absolute left-3 top-2.5" />
                </div>
                <p className="text-[11px] text-muted-text">
                  No password needed. We will email you a secure 1-click login link.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Magic Link...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Send Magic Login Link</span>
                  </>
                )}
              </Button>

              <div className="text-xs text-center text-muted-text">
                {tUi("auth.client_login.no_account") || "Don't have an account?"}{" "}
                <Link to="/client/register" className="text-primary font-semibold hover:underline">
                  {tUi("auth.client_login.register_here") || "Register here"}
                </Link>
              </div>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password-email" className="text-xs font-medium">
                  {tUi("auth.admin_login.email") || "Email Address"}
                </Label>
                <div className="relative">
                  <Input
                    id="password-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@realty.com"
                    className="pl-9 text-sm font-mono"
                    autoFocus
                  />
                  <Mail className="w-4 h-4 text-muted-text absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password-field" className="text-xs font-medium">
                    {tUi("auth.admin_login.password") || "Password"}
                  </Label>
                  <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password-field"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 text-sm"
                  />
                  <Lock className="w-4 h-4 text-muted-text absolute left-3 top-2.5" />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading 
                  ? (tUi("auth.client_login.signing_in") || "Signing in...") 
                  : (tUi("auth.client_login.sign_in") || "Sign In")
                }
              </Button>

              <div className="text-xs text-center text-muted-text">
                {tUi("auth.client_login.no_account") || "Don't have an account?"}{" "}
                <Link to="/client/register" className="text-primary font-semibold hover:underline">
                  {tUi("auth.client_login.register_here") || "Register here"}
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
