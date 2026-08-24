import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2, 
  ArrowRight, 
  Mail, 
  Send,
  ShieldCheck
} from "lucide-react";

export default function VerifyMagicLinkPage() {
  usePageTitle("Verifying Magic Link | SPS Studio");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { login } = useAuth();

  const [status, setStatus] = useState<"loading" | "success" | "expired" | "invalid" | "already_used">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Resend state for expired/invalid tokens
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setErrorMessage("No verification token was provided in the link.");
      return;
    }

    let isMounted = true;

    async function verifyToken() {
      try {
        const res = await fetch("/api/auth/verify-magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });

        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.success && data.token) {
          login(data.token, data.user, data.user?.role === "client" ? "client" : "admin");
          setStatus("success");
          setUserEmail(data.user?.email || "");

          // Smooth redirect after visual confirmation
          setTimeout(() => {
            if (data.user?.role === "admin") {
              navigate("/admin");
            } else {
              navigate("/client");
            }
          }, 1800);
        } else {
          if (data.code === "EXPIRED") {
            setStatus("expired");
          } else if (data.code === "ALREADY_USED") {
            setStatus("already_used");
          } else {
            setStatus("invalid");
          }
          if (data.email) {
            setResendEmail(data.email);
          }
          setErrorMessage(data.error || "Failed to verify authentication link.");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStatus("invalid");
        setErrorMessage("Network error occurred during verification. Please check your connection.");
      }
    }

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token, login, navigate]);

  const handleResendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail || !resendEmail.includes("@")) {
      setResendError("Please provide a valid email address.");
      return;
    }

    setResending(true);
    setResendError("");

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim(), type: "login" })
      });

      const data = await res.json();
      if (!res.ok) {
        setResendError(data.error || "Failed to send magic link.");
      } else {
        setResendSent(true);
      }
    } catch {
      setResendError("Network error occurred. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="aero-auth-page aero-auth-client min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md border-border shadow-xl overflow-hidden">
        {/* Loading State */}
        {status === "loading" && (
          <>
            <CardHeader className="text-center pb-2 pt-8">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 relative animate-pulse">
                <Sparkles className="w-7 h-7" />
              </div>
              <CardTitle className="text-xl font-bold">Verifying Magic Link</CardTitle>
              <CardDescription>
                Authenticating your secure link and preparing your client dashboard...
              </CardDescription>
            </CardHeader>
            <CardContent className="py-8 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs text-muted-text">This will only take a moment</p>
            </CardContent>
          </>
        )}

        {/* Success State */}
        {status === "success" && (
          <>
            <CardHeader className="text-center pb-2 pt-8">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 ring-8 ring-emerald-500/5">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <CardTitle className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                Authentication Successful!
              </CardTitle>
              <CardDescription>
                Your identity has been verified. Welcome to SPS Studio.
              </CardDescription>
            </CardHeader>
            <CardContent className="py-6 space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-200 text-center space-y-1">
                <div className="font-semibold text-sm">Signed In as</div>
                <div className="font-mono">{userEmail}</div>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-text">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Redirecting to your dashboard...</span>
              </div>
            </CardContent>
            <CardFooter className="pb-8">
              <Button 
                onClick={() => navigate("/client")} 
                className="w-full gap-2"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardFooter>
          </>
        )}

        {/* Expired or Already Used or Invalid State */}
        {(status === "expired" || status === "already_used" || status === "invalid") && (
          <>
            <CardHeader className="text-center pb-2 pt-8">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                {status === "expired" ? (
                  <Clock className="w-7 h-7" />
                ) : status === "already_used" ? (
                  <ShieldCheck className="w-7 h-7" />
                ) : (
                  <AlertCircle className="w-7 h-7 text-red-500" />
                )}
              </div>
              <CardTitle className="text-xl font-bold">
                {status === "expired" 
                  ? "Magic Link Expired" 
                  : status === "already_used" 
                  ? "Link Already Used" 
                  : "Invalid Verification Link"
                }
              </CardTitle>
              <CardDescription>
                {status === "expired"
                  ? "For your account security, magic links expire after 20 minutes."
                  : status === "already_used"
                  ? "This magic link has already been used to sign in."
                  : errorMessage || "The link you followed is invalid or has expired."
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {resendSent ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>New Magic Link Sent!</span>
                  </div>
                  <p>
                    We have dispatched a new link to <strong className="font-mono">{resendEmail}</strong>. Please check your inbox.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleResendMagicLink} className="space-y-3">
                  <div className="text-xs font-semibold text-text">
                    Request a fresh magic link:
                  </div>
                  {resendError && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                      {resendError}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="resend-email-input" className="text-xs">
                      Your Email Address
                    </Label>
                    <div className="relative">
                      <Input
                        id="resend-email-input"
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className="pl-9 text-sm font-mono"
                      />
                      <Mail className="w-4 h-4 text-muted-text absolute left-3 top-2.5" />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full gap-2 text-xs" 
                    disabled={resending || !resendEmail}
                  >
                    {resending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Fresh Magic Link</span>
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pt-2 border-t border-border/50 text-xs">
              <div className="flex items-center justify-between w-full">
                <Link to="/client/login" className="text-primary hover:underline font-medium">
                  Go to Client Sign In
                </Link>
                <Link to="/client/register" className="text-muted-text hover:text-text hover:underline">
                  Create New Account
                </Link>
              </div>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
