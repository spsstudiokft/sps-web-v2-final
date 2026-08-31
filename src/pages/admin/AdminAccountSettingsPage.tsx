import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, LockKeyhole, UserRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { TwoFactorSettingsCard } from "../../components/auth/TwoFactorSettingsCard";

type Profile = { email: string; name: string; role: string };

async function readAccountApiResponse(response: Response): Promise<any> {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    // Vercel can return a plain-text platform error before Express gets a
    // chance to serialize its usual JSON error response.
    throw new Error(`A szerver nem feldolgozható választ adott (HTTP ${response.status}). Kérlek próbáld újra néhány perc múlva.`);
  }
}

export default function AdminAccountSettingsPage() {
  const { fetchApi } = useApi(); const { updateUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null); const [name, setName] = useState(""); const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  useEffect(() => { fetchApi("/api/admin/account/profile").then(async r => { const body = await readAccountApiResponse(r); if (!r.ok) throw new Error(body.error || `A profil nem tölthető be (HTTP ${r.status}).`); setProfile(body); setName(body.name || ""); }).catch(e => setError(e.message || "A fiókbeállítások nem tölthetők be.")).finally(() => setLoading(false)); }, [fetchApi]);
  const saveProfile = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setMessage(""); setError(""); try { const r = await fetchApi("/api/admin/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }); const body = await readAccountApiResponse(r); if (!r.ok) throw new Error(body.error || `A profil nem menthető (HTTP ${r.status}).`); setProfile(p => p ? { ...p, name: body.name } : p); updateUser({ name: body.name }); setMessage("A profil mentve."); } catch (e: any) { setError(e.message || "A profil mentése sikertelen."); } finally { setSaving(false); } };
  const savePassword = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setMessage(""); setError(""); if (newPassword !== confirmPassword) { setError("Az új jelszavak nem egyeznek."); setSaving(false); return; } try { const r = await fetchApi("/api/admin/account/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) }); const body = await readAccountApiResponse(r); if (!r.ok) throw new Error(body.error || `A jelszó nem módosítható (HTTP ${r.status}).`); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setMessage("A jelszó megváltozott."); } catch (e: any) { setError(e.message || "A jelszó mentése sikertelen."); } finally { setSaving(false); } };
  if (loading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  const status = message || error;
  return <div className="mx-auto max-w-4xl space-y-6"><div><h1 className="text-2xl font-bold text-text">Saját fiók</h1><p className="mt-1 text-sm text-muted-text">Adminisztrátori profilod és bejelentkezési adataid kezelése.</p></div>{status && <div className={`flex gap-2 rounded-xl border p-3 text-sm ${error ? "border-red-500/25 bg-red-500/10 text-red-700" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"}`}>{error ? <LockKeyhole className="h-4 w-4 shrink-0"/> : <CheckCircle2 className="h-4 w-4 shrink-0"/>}{status}</div>}<Card className="border-border"><CardHeader><div className="flex gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><UserRound className="h-5 w-5"/></div><div><CardTitle>Profil</CardTitle><CardDescription>A megjelenő név a belső adminfelületen használatos.</CardDescription></div></div></CardHeader><CardContent><form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2"><div><Label>Név</Label><Input value={name} onChange={e => setName(e.target.value)} required maxLength={100} className="mt-1"/></div><div><Label>E-mail-cím</Label><Input value={profile?.email || ""} disabled className="mt-1 opacity-70"/></div><div className="sm:col-span-2 flex justify-end"><button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Profil mentése</button></div></form></CardContent></Card><Card className="border-border"><CardHeader><div className="flex gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><KeyRound className="h-5 w-5"/></div><div><CardTitle>Jelszó módosítása</CardTitle><CardDescription>A biztonságos jelszó kis- és nagybetűt, számot és speciális karaktert is tartalmaz.</CardDescription></div></div></CardHeader><CardContent><form onSubmit={savePassword} className="space-y-4"><div><Label>Jelenlegi jelszó</Label><Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="mt-1"/></div><div className="grid gap-4 sm:grid-cols-2"><div><Label>Új jelszó</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="mt-1"/></div><div><Label>Új jelszó ismét</Label><Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="mt-1"/></div></div><div className="flex justify-end"><button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Jelszó frissítése</button></div></form></CardContent></Card><TwoFactorSettingsCard /></div>;
}
