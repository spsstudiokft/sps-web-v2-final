import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/Card";
import { KeyRound, CheckCircle2, AlertCircle, Loader2, Lock } from "lucide-react";

export default function ResetPasswordPage() {
  usePageTitle("Set New Password | SPS Studio");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Password reset token is missing from URL.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aero-auth-page aero-auth-client min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="space-y-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <KeyRound className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl font-bold">Create New Password</CardTitle>
          <CardDescription>
            Enter your new secure password below to regain access to your account.
          </CardDescription>
        </CardHeader>

        {success ? (
          <CardContent className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold">Password Successfully Updated</div>
                <p className="text-xs leading-relaxed opacity-90">
                  Your password has been changed. You can now log into your client portal or admin console.
                </p>
              </div>
            </div>

            <Button 
              onClick={() => navigate("/client/login")}
              className="w-full"
            >
              Go to Sign In
            </Button>
          </CardContent>
        ) : !token ? (
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Invalid password reset link. Please request a new link from the forgot password page.</span>
            </div>
            <div className="pt-2 text-center">
              <Link to="/auth/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                Request a new password reset link
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
                <Label htmlFor="new-password-input" className="text-xs font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password-input"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="text-sm pl-9"
                  />
                  <Lock className="w-4 h-4 text-muted-text absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password-input" className="text-xs font-medium">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password-input"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="text-sm pl-9"
                  />
                  <Lock className="w-4 h-4 text-muted-text absolute left-3 top-2.5" />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Reset Password</span>
                )}
              </Button>

              <div className="text-center w-full text-xs text-muted-text pt-2">
                <Link to="/client/login" className="hover:text-text hover:underline">
                  Return to Sign In
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
