import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/Card";
import { 
  Sparkles, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  RotateCw, 
  ShieldCheck, 
  Home,
  Plus,
  Trash2,
  Building,
  Gift,
  Tag,
  Check
  ,Lock
} from "lucide-react";

interface PropertyInputItem {
  id: string;
  name: string;
  address: string;
}

export default function ClientRegister() {
  const submittingRef = useRef(false);
  const { tUi } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  usePageTitle(tUi("auth.client_register.title") || "Register for Client Portal | SPS Studio");
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [registrationMethod, setRegistrationMethod] = useState<"password" | "magic_link">("password");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState(
    searchParams.get("ref") || searchParams.get("referral") || searchParams.get("referral_code") || ""
  );
  const [referralInfo, setReferralInfo] = useState<{
    valid: boolean;
    referrer_name?: string;
    welcome_reward?: { type: string; value: number; description: string };
  } | null>(null);
  const [validatingRef, setValidatingRef] = useState(false);
  const [showReferralInput, setShowReferralInput] = useState(
    Boolean(searchParams.get("ref") || searchParams.get("referral") || searchParams.get("referral_code"))
  );

  const [properties, setProperties] = useState<PropertyInputItem[]>([]);
  const [showPropertyFields, setShowPropertyFields] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Validate referral code when provided
  useEffect(() => {
    const code = referralCode.trim();
    if (!code) {
      setReferralInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      setValidatingRef(true);
      try {
        const res = await fetch(`/api/public/referrals/validate-code/${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data.valid) {
          setReferralInfo(data);
        } else {
          setReferralInfo({ valid: false });
        }
      } catch {
        setReferralInfo(null);
      } finally {
        setValidatingRef(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [referralCode]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleAddProperty = () => {
    if (properties.length >= 10) {
      setError("Registration allows a maximum of 10 properties. Additional properties can be added in your portal.");
      return;
    }
    setError("");
    const newIndex = properties.length + 1;
    setProperties(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `Property ${newIndex}`,
        address: ""
      }
    ]);
  };

  const handleRemoveProperty = (id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateProperty = (id: string, field: "name" | "address", value: string) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (registrationMethod === "password") {
      if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        setError("A jelszó legalább 8 karakteres legyen, és tartalmazzon kis- és nagybetűt, számot és speciális karaktert.");
        return;
      }
      if (password !== confirmPassword) { setError("A két jelszó nem egyezik."); return; }
    }

    const validProps = properties
      .map(p => ({
        property_name: p.name.trim() || undefined,
        address: p.address.trim()
      }))
      .filter(p => p.address.length > 0);

    if (validProps.length > 10) {
      setError("Maximum 10 properties allowed during registration.");
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(registrationMethod === "password" ? "/api/auth/register" : "/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim(), 
          type: "signup", password: registrationMethod === "password" ? password : undefined,
          property_address: validProps.length > 0 ? validProps[0].address : undefined,
          properties: validProps.length > 0 ? validProps : undefined,
          referral_code: referralCode.trim() || undefined
        }),
      });

      const data = await res.json();

      if (res.ok && (data.success || data.token)) {
        if (registrationMethod === "password" && data.token) {
          login(data.token, data.user, "client"); navigate("/client", { replace: true });
        } else { setSentSuccess(true); setCooldown(60); }
      } else {
        setError(data.error || "Failed to send registration link. Please try again.");
      }
    } catch {
      setError(tUi("auth.client_register.error_generic") || "A network error occurred. Please try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");

    const validProps = properties
      .map(p => ({
        property_name: p.name.trim() || undefined,
        address: p.address.trim()
      }))
      .filter(p => p.address.length > 0);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim(), 
          type: "signup",
          property_address: validProps.length > 0 ? validProps[0].address : undefined,
          properties: validProps.length > 0 ? validProps : undefined,
          referral_code: referralCode.trim() || undefined
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCooldown(60);
      } else {
        setError(data.error || "Failed to resend email.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="aero-auth-page aero-auth-client min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-lg border-border shadow-xl">
        <CardHeader className="space-y-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
            <Sparkles className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl font-bold">
            {tUi("auth.client_register.title") || "Create Client Account"}
          </CardTitle>
          <CardDescription>
            {tUi("auth.client_register.subtitle") || "Access your property photos, media delivery, and downloads."}
          </CardDescription>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/50 border border-border p-1 text-xs">
            <button type="button" onClick={() => { setRegistrationMethod("password"); setError(""); }} className={`rounded-lg px-3 py-2 transition ${registrationMethod === "password" ? "bg-background text-text shadow-sm font-semibold" : "text-muted-text"}`}><Lock className="inline w-3.5 h-3.5 mr-1.5"/>Jelszóval</button>
            <button type="button" onClick={() => { setRegistrationMethod("magic_link"); setError(""); }} className={`rounded-lg px-3 py-2 transition ${registrationMethod === "magic_link" ? "bg-background text-text shadow-sm font-semibold" : "text-muted-text"}`}><Sparkles className="inline w-3.5 h-3.5 mr-1.5"/>Magic linkkel</button>
          </div>

          {/* Referral Welcome Banner if valid code */}
          {referralInfo?.valid && (
            <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-primary/10 to-indigo-500/15 border border-amber-500/30 flex items-start gap-2.5 text-xs text-text">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Gift className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <span>VIP Invitation by {referralInfo.referrer_name || "a colleague"}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 rounded font-mono text-amber-800 dark:text-amber-200">
                    {referralCode.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-muted-text">
                  {referralInfo.welcome_reward?.description || "A welcome discount voucher will be credited to your account upon registration."}
                </p>
              </div>
            </div>
          )}
        </CardHeader>

        {sentSuccess ? (
          <CardContent className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-sm space-y-2.5">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Magic Sign-Up Link Dispatched!</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-text dark:text-emerald-300">
                We sent a secure single-use registration link to:
              </p>
              <div className="p-2 rounded bg-background/80 border border-emerald-500/30 font-mono text-xs font-semibold text-text text-center break-all">
                {email}
              </div>
              {referralInfo?.valid && (
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" />
                  <span>VIP referral code {referralCode.toUpperCase()} attached to your registration.</span>
                </div>
              )}
              <p className="text-xs text-muted-text leading-relaxed">
                Click the link in the email to automatically create your account and access your client portal. The link is valid for <strong>20 minutes</strong>.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                variant="outline"
                onClick={handleResend}
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

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setSentSuccess(false);
                    setCooldown(0);
                  }}
                  className="text-xs text-muted-text hover:text-text underline"
                >
                  Use a different email address
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-border text-center">
              <Link 
                to="/client/login" 
                className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1.5"
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
                <Label htmlFor="email" className="text-xs font-medium">
                  {tUi("contact.email") || "Email Address"} <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="email"
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
                <p className="text-[11px] text-muted-text">{registrationMethod === "password" ? "Ezzel az email-címmel és jelszóval később közvetlenül bejelentkezhetsz." : "Jelszó nélkül egy egyszer használható belépési linket küldünk emailben."}</p>
              </div>

              {registrationMethod === "password" && <div className="grid sm:grid-cols-2 gap-3"><div className="space-y-1.5"><Label htmlFor="register-password" className="text-xs font-medium">Jelszó *</Label><div className="relative"><Input id="register-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="pl-9"/><Lock className="w-4 h-4 text-muted-text absolute left-3 top-2.5"/></div></div><div className="space-y-1.5"><Label htmlFor="register-password-confirm" className="text-xs font-medium">Jelszó ismétlése *</Label><div className="relative"><Input id="register-password-confirm" type="password" required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="pl-9"/><Lock className="w-4 h-4 text-muted-text absolute left-3 top-2.5"/></div></div><p className="sm:col-span-2 text-[11px] text-muted-text">Legalább 8 karakter, kis- és nagybetű, szám és speciális karakter szükséges.</p></div>}

              {/* Referral Code input toggle */}
              <div className="space-y-1.5">
                {!showReferralInput ? (
                  <button
                    type="button"
                    onClick={() => setShowReferralInput(true)}
                    className="text-xs text-muted-text hover:text-primary transition-colors flex items-center gap-1.5 font-medium"
                  >
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    <span>Have a referral or invite code?</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/70 space-y-1.5">
                    <Label htmlFor="referral_code" className="text-xs font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-primary" />
                        <span>Referral / Invite Code</span>
                      </span>
                      {validatingRef && <Loader2 className="w-3 h-3 animate-spin text-muted-text" />}
                      {!validatingRef && referralInfo?.valid && (
                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Valid
                        </span>
                      )}
                    </Label>
                    <Input
                      id="referral_code"
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="e.g. REF-ALEX9K4M"
                      className="text-xs font-mono uppercase tracking-wider"
                    />
                    {referralCode.trim() && !validatingRef && referralInfo && !referralInfo.valid && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        Referral code not found, but you can still proceed with registration.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Optional properties section (up to 10) */}
              <div className="pt-1 space-y-2">
                {!showPropertyFields && properties.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPropertyFields(true);
                      handleAddProperty();
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>+ Add Property / Project Address (Optional, max 10)</span>
                  </button>
                ) : (
                  <div className="space-y-3 p-3.5 rounded-xl bg-muted/30 border border-border/60 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                        <Building className="w-4 h-4 text-primary" />
                        <span>Registered Properties ({properties.length}/10 max)</span>
                      </div>
                      {properties.length < 10 && (
                        <button
                          type="button"
                          onClick={handleAddProperty}
                          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add another</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {properties.map((prop, idx) => (
                        <div 
                          key={prop.id}
                          className="p-2.5 rounded-lg bg-surface border border-border/70 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={prop.name}
                              onChange={(e) => handleUpdateProperty(prop.id, "name", e.target.value)}
                              placeholder={`Property ${idx + 1}`}
                              className="text-xs font-medium bg-transparent border-b border-border/50 focus:border-primary focus:outline-none px-1 py-0.5 text-text w-1/2"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveProperty(prop.id)}
                              className="text-muted-text hover:text-rose-500 transition-colors p-1"
                              title="Remove property"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <Input
                            type="text"
                            value={prop.address}
                            onChange={(e) => handleUpdateProperty(prop.id, "address", e.target.value)}
                            placeholder="e.g. 124 Ocean Drive, Miami, FL"
                            className="text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border/40 flex items-start gap-2.5 text-xs text-muted-text">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  {registrationMethod === "password" ? "A jelszót biztonságos bcrypt hash formájában tároljuk; az eredeti jelszó nem kerül az adatbázisba." : "Az egyszer használható, időkorlátos magic link gyors és biztonságos hozzáférést biztosít."}
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button 
                type="submit" 
                className="w-full flex items-center justify-center gap-2" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{registrationMethod === "password" ? "Fiók létrehozása..." : "Magic link küldése..."}</span>
                  </>
                ) : (
                  <>
                    {registrationMethod === "password" ? <Lock className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    <span>{registrationMethod === "password" ? "Regisztráció jelszóval" : "Regisztrációs magic link küldése"}</span>
                  </>
                )}
              </Button>

              <div className="text-xs text-center text-muted-text">
                {tUi("auth.client_register.have_account") || "Already have an account?"}{" "}
                <Link to="/client/login" className="text-primary font-semibold hover:underline">
                  {tUi("auth.client_register.signin_here") || "Sign in here"}
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
