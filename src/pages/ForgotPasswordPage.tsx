import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/Card";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { tUi } = useLanguage();
  usePageTitle("Password Recovery | SPS Studio");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to process password reset request.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aero-auth-page aero-auth-client min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="space-y-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <Mail className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl font-bold">Reset Your Password</CardTitle>
          <CardDescription>
            Enter the email address linked to your account, and we will send you a secure link to reset your password.
          </CardDescription>
        </CardHeader>

        {submitted ? (
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold">Reset Link Sent</div>
                <p className="text-xs leading-relaxed opacity-90">
                  If an account exists for <span className="font-mono font-medium text-text">{email}</span>, you will receive an email shortly with instructions to reset your password.
                </p>
              </div>
            </div>

            <div className="pt-2 text-center">
              <Link 
                to="/client/login" 
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="reset-email-input" className="text-xs font-medium">
                  Account Email Address
                </Label>
                <Input
                  id="reset-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="text-sm font-mono"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <span>Send Password Reset Link</span>
                )}
              </Button>

              <div className="flex items-center justify-between w-full text-xs text-muted-text pt-2">
                <Link to="/client/login" className="hover:text-text hover:underline flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Client Login</span>
                </Link>
                <Link to="/admin/login" className="hover:text-text hover:underline">
                  Admin Login
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
