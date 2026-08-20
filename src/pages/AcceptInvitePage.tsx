import React, { useState, useEffect } from "react";
import { useSearchParams, useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/Card";
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Sparkles,
  ArrowRight,
  Clock,
  Info
} from "lucide-react";

export default function AcceptInvitePage() {
  const { tUi } = useLanguage();
  usePageTitle(tUi("auth.invite.page_title", undefined, "Accept Invitation | SPS Studio"));
  const [searchParams] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const tokenFromQuery = searchParams.get("token");
  const tokenFromParam = params.token;
  const token = (tokenFromQuery || tokenFromParam || "").trim();

  const [loadingValidation, setLoadingValidation] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<string>("loading");

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setLoadingValidation(false);
      setValidationStatus("missing_token");
      setValidationError(tUi("auth.invite.err_missing_token", undefined, "No invitation token was found in the URL. Please click the invitation link received in your email."));
      return;
    }

    let isMounted = true;

    async function validateToken() {
      try {
        setLoadingValidation(true);
        const res = await fetch(`/api/invitations/validate?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok || !data.valid) {
          setValidationStatus(data.status || "invalid");
          setValidationError(data.error || tUi("auth.invite.err_invalid_or_expired", undefined, "This invitation is invalid or has expired."));
          if (data.invitation) {
            setInvitation(data.invitation);
          }
        } else {
          setValidationStatus("valid");
          setInvitation(data.invitation);
          if (data.invitation.name) {
            setName(data.invitation.name);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setValidationStatus("network_error");
        setValidationError(tUi("auth.invite.err_network", undefined, "Could not connect to the authentication server. Please check your internet connection."));
      } finally {
        if (isMounted) setLoadingValidation(false);
      }
    }

    validateToken();

    return () => {
      isMounted = false;
    };
  }, [token, tUi]);

  // Handle countdown after successful account creation
  useEffect(() => {
    if (!success) return;
    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/admin");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [success, navigate]);

  // Password strength helper
  const getPasswordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score; // 0 to 4
  };

  const strengthScore = getPasswordStrength();
  const strengthLabels = [
    tUi("auth.invite.strength_very_weak", undefined, "Very Weak"),
    tUi("auth.invite.strength_weak", undefined, "Weak"),
    tUi("auth.invite.strength_moderate", undefined, "Moderate"),
    tUi("auth.invite.strength_strong", undefined, "Strong"),
    tUi("auth.invite.strength_very_strong", undefined, "Very Strong")
  ];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError(tUi("auth.invite.err_name_required", undefined, "Please enter your full name."));
      return;
    }

    if (password.length < 6) {
      setFormError(tUi("auth.invite.err_password_length", undefined, "Password must be at least 6 characters long."));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(tUi("auth.invite.err_password_mismatch", undefined, "Passwords do not match."));
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: name.trim(),
          phone: phone.trim(),
          password
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.error || tUi("auth.invite.err_setup_failed", undefined, "Failed to set up account. Please try again."));
      } else {
        // Log in immediately via AuthContext
        if (data.token) {
          login(data.token, data.user);
        }
        setSuccess(true);
      }
    } catch {
      setFormError(tUi("auth.invite.err_network_submit", undefined, "Network error occurred during account creation. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const r = (role || "").toLowerCase().replace(/[_-]/g, "");
    if (r === "superadmin") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          Superadmin
        </span>
      );
    }
    if (r === "admin") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          {tUi("admin.team.role_admin", undefined, "Administrator")}
        </span>
      );
    }
    if (r === "viewer") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
          <Eye className="w-3.5 h-3.5" />
          {tUi("admin.team.role_viewer", undefined, "Viewer")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
        <Sparkles className="w-3.5 h-3.5" />
        {tUi("admin.team.role_editor", undefined, "Editor")}
      </span>
    );
  };

  const getRolePermissionsDescription = (role: string) => {
    const r = (role || "").toLowerCase();
    if (r === "admin") {
      return tUi("auth.invite.role_desc_admin", undefined, "Full access to portfolio, deliverables, team management, packages, system settings, and email automations.");
    }
    if (r === "viewer") {
      return tUi("auth.invite.role_desc_viewer", undefined, "Read-only access to view studio dashboards, media galleries, project timelines, and operational metrics.");
    }
    return tUi("auth.invite.role_desc_editor", undefined, "Permission to create and manage photo galleries, milestones, studio services, FAQs, and client submissions.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      <div className="w-full max-w-lg space-y-6">
        {/* Studio Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground font-black text-xl shadow-lg shadow-primary/20">
            SPS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {invitation?.studio_name || "SPS Studio"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tUi("auth.invite.subtitle", undefined, "Management Portal · Team Workspace Onboarding")}
          </p>
        </div>

        {/* Card Body */}
        <Card className="border-border shadow-xl bg-card">
          {loadingValidation ? (
            <CardContent className="py-16 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
              <div className="space-y-1">
                <div className="font-semibold text-base">
                  {tUi("auth.invite.verifying", undefined, "Verifying Invitation...")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tUi("auth.invite.verifying_sub", undefined, "Validating security token and role permissions")}
                </p>
              </div>
            </CardContent>
          ) : success ? (
            <CardContent className="py-10 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold">
                  {tUi("auth.invite.success_title", undefined, "Account Created Successfully!")}
                </CardTitle>
                <CardDescription className="text-sm">
                  {tUi("auth.invite.success_desc", { name: name || "Team Member" }, `Welcome to the team, ${name}! Your administrator profile is fully activated.`)}
                </CardDescription>
              </div>

              <div className="p-4 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 animate-spin text-primary" />
                <span>
                  {tUi("auth.invite.redirecting", { count: redirectCountdown }, `Redirecting to Admin Studio in ${redirectCountdown}s...`)}
                </span>
              </div>

              <Button
                onClick={() => navigate("/admin")}
                className="w-full flex items-center justify-center gap-2 font-semibold shadow-md"
              >
                <span>{tUi("auth.invite.btn_go_admin", undefined, "Go to Admin Studio Now")}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          ) : validationStatus !== "valid" ? (
            <CardContent className="py-10 space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div className="text-center space-y-2">
                <CardTitle className="text-xl font-bold">
                  {validationStatus === "already_used"
                    ? tUi("auth.invite.already_used_title", undefined, "Invitation Already Used")
                    : validationStatus === "expired"
                    ? tUi("auth.invite.expired_title", undefined, "Invitation Expired")
                    : validationStatus === "revoked"
                    ? tUi("auth.invite.revoked_title", undefined, "Invitation Revoked")
                    : tUi("auth.invite.invalid_title", undefined, "Invalid Invitation")}
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {validationError}
                </CardDescription>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                {validationStatus === "already_used" ? (
                  <Button 
                    onClick={() => navigate("/admin/login")} 
                    className="w-full"
                  >
                    {tUi("auth.invite.btn_back_login", undefined, "Return to Login")}
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate("/")} 
                      className="flex-1"
                    >
                      {tUi("nav.home", undefined, "Return to Website")}
                    </Button>
                    <Button 
                      onClick={() => navigate("/admin/login")} 
                      className="flex-1"
                    >
                      {tUi("auth.invite.btn_back_login", undefined, "Admin Sign In")}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="space-y-3 pb-4 border-b border-border/50">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {tUi("auth.invite.assigned_role", undefined, "Invitation Details")}
                  </span>
                  {getRoleBadge(invitation?.role)}
                </div>

                <div>
                  <CardTitle className="text-xl font-bold">
                    {tUi("auth.invite.join_studio", { studio: invitation?.workspace || invitation?.studio_name || "Main Studio" }, `Join ${invitation?.workspace || "Main Studio"}`)}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {tUi("auth.invite.invited_by", { inviter: invitation?.inviter_name || "Administrator", role: invitation?.role || "team member" }, `You have been invited by ${invitation?.inviter_name || "Administrator"} to join as ${invitation?.role}.`)}
                  </CardDescription>
                </div>

                {invitation?.custom_message && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-foreground/90 italic">
                    <span className="font-semibold not-italic block text-[11px] text-muted-foreground mb-0.5">
                      {tUi("auth.invite.custom_message_label", undefined, "Custom message from inviter:")}
                    </span>
                    "{invitation.custom_message}"
                  </div>
                )}

                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    {tUi("auth.invite.assigned_role", undefined, "Role Privileges:")}
                  </div>
                  <p className="leading-relaxed">
                    {getRolePermissionsDescription(invitation?.role)}
                  </p>
                </div>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 pt-5">
                  {formError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Confirmed Email */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      {tUi("auth.invite.email_label", undefined, "Account Email")}
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        value={invitation?.email || ""}
                        disabled
                        className="pl-9 bg-muted/50 cursor-not-allowed font-medium text-foreground text-sm"
                      />
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-medium">
                      {tUi("auth.invite.name_label", undefined, "Your Full Name *")}
                    </Label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder={tUi("auth.invite.name_ph", undefined, "e.g. Alex Morgan")}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="pl-9"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Phone (Optional) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-medium">
                      {tUi("auth.invite.phone_label", undefined, "Phone Number (Optional)")}
                    </Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={tUi("auth.invite.phone_ph", undefined, "+36 30 123 4567")}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-medium">
                      {tUi("auth.invite.password_label", undefined, "Create Password *")}
                    </Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={tUi("auth.invite.password_ph", undefined, "Minimum 6 characters")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="pl-9 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password strength bar */}
                    {password && (
                      <div className="pt-1 space-y-1">
                        <div className="flex gap-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          {[1, 2, 3, 4].map((step) => (
                            <div
                              key={step}
                              className={`h-full flex-1 transition-all ${
                                strengthScore >= step ? strengthColors[strengthScore] : "bg-muted"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>
                            {tUi("auth.invite.password_strength", undefined, "Strength:")} <strong>{strengthLabels[strengthScore]}</strong>
                          </span>
                          <span>{tUi("auth.password_hint", undefined, "Use numbers & mixed case")}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-medium">
                      {tUi("auth.invite.confirm_password_label", undefined, "Confirm Password *")}
                    </Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder={tUi("auth.invite.confirm_password_ph", undefined, "Repeat your chosen password")}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full font-semibold shadow-md h-11"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {tUi("auth.invite.btn_submitting", undefined, "Setting up account...")}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        {tUi("auth.invite.btn_submit", undefined, "Complete Account Setup")}
                      </>
                    )}
                  </Button>

                  <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                    {tUi("auth.invite.security_note", undefined, "Security Note: Your login credentials are encrypted with industry-standard bcrypt hashing.")}
                  </p>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
