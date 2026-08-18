import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Button } from "../components/ui/Button";
import { usePageTitle } from "../hooks/usePageTitle";

import { AuthSkeleton } from "../components/admin/AdminSkeleton";

export default function AdminSetup() {
  const { currentLang, tUi } = useLanguage();
  usePageTitle(tUi("auth.admin_setup.title"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/setup/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.isSetupComplete) {
          navigate("/admin/login");
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        navigate("/admin/login");
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch {
      setError(tUi("auth.admin_setup.setup_failed"));
    }
  };

  if (loading) return <AuthSkeleton />;

  return (
    <div className="aero-auth-page aero-auth-admin min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <FontAwesomeIcon icon={faCamera} className="w-12 h-12 text-primary" aria-hidden="true" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-text">
          {tUi("auth.admin_setup.title")}
        </h2>
        <p className="mt-2 text-center text-sm text-muted-text">
          {tUi("auth.admin_setup.subtitle")}
        </p>
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
                <Label>{tUi("auth.admin_login.password")}</Label>
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
                  {tUi("auth.admin_setup.complete_setup")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
