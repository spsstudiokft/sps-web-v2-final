import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, LockKeyhole, UserRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { TwoFactorSettingsCard } from "../../components/auth/TwoFactorSettingsCard";

interface SettingsProfile {
  id: string;
  email: string;
  name: string;
  hasPassword: boolean;
  passwordUpdatedAt?: string | null;
  tfa: { enabled: boolean; available: boolean };
}

export default function ClientSettingsPage() {
  const { fetchApi } = useApi();
  const { updateUser } = useAuth();
  const { tUi } = useLanguage();
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  usePageTitle(tUi("client.settings.page_title"));

  useEffect(() => {
    fetchApi("/api/client/settings/profile")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || tUi("client.settings.load_failed"));
        setProfile(body);
        setName(body.name || "");
      })
      .catch((error) => setProfileMessage({ type: "error", text: error.message || tUi("client.settings.load_failed") }))
      .finally(() => setLoading(false));
  }, [fetchApi, tUi]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setProfileMessage(null);
    setSavingProfile(true);
    try {
      const response = await fetchApi("/api/client/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || tUi("client.settings.profile_save_failed"));
      setName(body.name);
      setProfile((current) => current ? { ...current, name: body.name } : current);
      updateUser({ name: body.name });
      setProfileMessage({ type: "success", text: tUi("client.settings.profile_saved") });
    } catch (error: any) {
      setProfileMessage({ type: "error", text: error.message || tUi("client.settings.profile_save_failed") });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: tUi("client.settings.password_mismatch") });
      return;
    }
    setSavingPassword(true);
    try {
      const response = await fetchApi("/api/client/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || tUi("client.settings.password_save_failed"));
      setProfile((current) => current ? { ...current, hasPassword: true, passwordUpdatedAt: new Date().toISOString() } : current);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({ type: "success", text: body.mode === "added" ? tUi("client.settings.password_added") : tUi("client.settings.password_changed") });
    } catch (error: any) {
      setPasswordMessage({ type: "error", text: error.message || tUi("client.settings.password_save_failed") });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text">{tUi("client.settings.title")}</h2>
        <p className="mt-1 text-sm text-muted-text">{tUi("client.settings.subtitle")}</p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><UserRound className="h-5 w-5" /></div>
            <div><CardTitle>{tUi("client.settings.profile_title")}</CardTitle><CardDescription>{tUi("client.settings.profile_desc")}</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            {profileMessage && <StatusMessage {...profileMessage} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="client-settings-name">{tUi("client.settings.name")}</Label>
                <Input id="client-settings-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoComplete="name" required />
                <p className="text-[11px] text-muted-text">{tUi("client.settings.name_help")}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-settings-email">{tUi("client.settings.email")}</Label>
                <Input id="client-settings-email" value={profile?.email || ""} disabled className="opacity-70" />
                <p className="text-[11px] text-muted-text">{tUi("client.settings.email_help")}</p>
              </div>
            </div>
            <div className="flex justify-end"><button type="submit" disabled={savingProfile} className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-60">{savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tUi("client.settings.save_profile")}</button></div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><KeyRound className="h-5 w-5" /></div>
            <div><CardTitle>{profile?.hasPassword ? tUi("client.settings.change_password") : tUi("client.settings.add_password")}</CardTitle><CardDescription>{profile?.hasPassword ? tUi("client.settings.change_password_desc") : tUi("client.settings.add_password_desc")}</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            {passwordMessage && <StatusMessage {...passwordMessage} />}
            {profile?.hasPassword && <div className="space-y-1.5"><Label htmlFor="current-password">{tUi("client.settings.current_password")}</Label><Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="new-password">{tUi("client.settings.new_password")}</Label><Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required /></div>
              <div className="space-y-1.5"><Label htmlFor="confirm-password">{tUi("client.settings.confirm_password")}</Label><Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></div>
            </div>
            <div className="rounded-xl border border-border bg-surface/60 p-3 text-xs leading-relaxed text-muted-text"><LockKeyhole className="mr-2 inline h-4 w-4 text-primary" />{tUi("client.settings.password_rules")}</div>
            <div className="flex justify-end"><button type="submit" disabled={savingPassword} className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-60">{savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{profile?.hasPassword ? tUi("client.settings.update_password") : tUi("client.settings.set_password")}</button></div>
          </form>
        </CardContent>
      </Card>

      <TwoFactorSettingsCard />
    </div>
  );
}

function StatusMessage({ type, text }: { type: "success" | "error"; text: string }) {
  return <div className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${type === "success" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300"}`}>{type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <LockKeyhole className="h-4 w-4 shrink-0" />}<span>{text}</span></div>;
}
