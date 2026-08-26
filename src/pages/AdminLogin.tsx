import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Button } from "../components/ui/Button";
import { usePageTitle } from "../hooks/usePageTitle";
import { AuthSkeleton } from "../components/admin/AdminSkeleton";

export default function AdminLogin() {
  const { currentLang, tUi } = useLanguage();
  usePageTitle(tUi("auth.admin_login.title"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    sessionStorage.getItem("admin_token_expired")
      ? tUi("auth.admin_login.session_expired")
      : ""
  );
  const navigate = useNavigate();
  const location = useLocation();
  const { login, token, user } = useAuth();
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState<Array<{ label: string; email: string; password: string; role: string }>>([]);

  useEffect(() => {
    if (token) {
      let role = user?.role;
      if (!role && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          role = payload.role || 'admin';
        } catch {
          role = 'admin';
        }
      }
      if (role === "admin" || role === "editor" || role === "viewer") {
        const from = (location.state as any)?.from?.pathname || "/admin";
        navigate(from, { replace: true });
      } else if (role === "client") {
        navigate("/client", { replace: true });
      } else {
        navigate("/admin", { replace: true });
      }
    }
  }, [token, user, navigate, location]);

  useEffect(() => {
    fetch("/api/setup/status")
      .then((res) => res.json())
      .then((data) => {
        if (!data.isSetupComplete) {
          navigate("/admin/setup");
        }
      })
      .finally(() => setCheckingSetup(false));
  }, [navigate]);

  useEffect(() => {
    fetch("/api/development/demo-accounts", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : { enabled: false, accounts: [] })
      .then((data) => setDemoAccounts(data.enabled && Array.isArray(data.accounts) ? data.accounts : []))
      .catch(() => setDemoAccounts([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, account_context: "admin" }),
      });
      if (res.ok) {
        const data = await res.json();
        login(data.token, data.user, "admin");
        const role = data.user?.role || "admin";
        if (role === "admin" || role === "editor" || role === "viewer") {
          const from = (location.state as any)?.from?.pathname || "/admin";
          navigate(from, { replace: true });
        } else if (role === "client") {
          navigate("/client", { replace: true });
        } else {
          navigate("/admin", { replace: true });
        }
      } else {
        const data = await res.json();
        setError(data.error || tUi("auth.admin_login.login_failed"));
      }
    } catch {
      setError(tUi("auth.admin_login.login_failed"));
    }
  };

  if (checkingSetup) return <AuthSkeleton />;

  return (
    <div className="aero-auth-page aero-auth-admin min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <FontAwesomeIcon icon={faCamera} className="w-12 h-12 text-primary" aria-hidden="true" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-text">
          {tUi("auth.admin_login.title")}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardContent className="pt-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && <div className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</div>}
              <div>
                <Label>{tUi("auth.admin_login.email")}</Label>
                <div className="mt-1">
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>{tUi("auth.admin_login.password")}</Label>
                  <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="mt-1">
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Button type="submit" className="w-full">
                  {tUi("auth.admin_login.sign_in")}
                </Button>
              </div>
            </form>

            {demoAccounts.map((account) => (
              <div key={account.email} className="mt-6 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm">
                <div className="font-semibold text-text">{tUi("auth.admin_login.demo_title")}</div>
                <p className="mt-1 text-xs text-muted-text">{tUi("auth.admin_login.demo_description")}</p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
                  <dt className="font-sans text-muted-text">{tUi("auth.admin_login.demo_email")}:</dt><dd className="break-all text-text">{account.email}</dd>
                  <dt className="font-sans text-muted-text">{tUi("auth.admin_login.demo_password")}:</dt><dd className="break-all text-text">{account.password}</dd>
                  <dt className="font-sans text-muted-text">{tUi("auth.admin_login.demo_role")}:</dt><dd className="text-text">{account.role}</dd>
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => { setEmail(account.email); setPassword(account.password); setError(""); }}
                >
                  {tUi("auth.admin_login.demo_fill")}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
