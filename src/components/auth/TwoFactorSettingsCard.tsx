import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";

type Challenge = { challengeId: string; preauthToken: string; maskedEmail: string };

export function TwoFactorSettingsCard() {
  const { fetchApi } = useApi();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<"enable" | "disable" | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi("/api/auth/2fa/status")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "A kétlépcsős ellenőrzés állapota nem tölthető be.");
        setEnabled(Boolean(body.email_otp_enabled));
      })
      .catch((reason) => setError(reason?.message || "A kétlépcsős ellenőrzés állapota nem tölthető be."))
      .finally(() => setLoading(false));
  }, [fetchApi]);

  const resetFlow = () => {
    setAction(null);
    setChallenge(null);
    setPassword("");
    setCode("");
    setError("");
  };

  const startEnable = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetchApi("/api/auth/2fa/email/enrollment/start", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Az ellenőrzőkód kiküldése sikertelen.");
      setAction("enable");
      setChallenge({ challengeId: body.challenge_id, preauthToken: body.preauth_token, maskedEmail: body.masked_email });
    } catch (reason: any) { setError(reason?.message || "Az ellenőrzőkód kiküldése sikertelen."); }
    finally { setBusy(false); }
  };

  const startDisable = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetchApi("/api/auth/2fa/email/disable/start", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "A kikapcsolás megerősítése nem indítható el.");
      setChallenge({ challengeId: body.challenge_id, preauthToken: body.preauth_token, maskedEmail: body.masked_email });
      setPassword("");
    } catch (reason: any) { setError(reason?.message || "A kikapcsolás megerősítése nem indítható el."); }
    finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!challenge || !action) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const path = action === "enable" ? "enrollment" : "disable";
      const response = await fetchApi(`/api/auth/2fa/email/${path}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challenge.challengeId, preauth_token: challenge.preauthToken, code }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "A megerősítés sikertelen.");
      const nextEnabled = action === "enable";
      setEnabled(nextEnabled);
      setMessage(nextEnabled ? "Az emailes kétlépcsős ellenőrzés bekapcsolva." : "Az emailes kétlépcsős ellenőrzés kikapcsolva.");
      setAction(null); setChallenge(null); setCode("");
    } catch (reason: any) { setError(reason?.message || "A megerősítés sikertelen."); }
    finally { setBusy(false); }
  };

  if (loading) return <Card className="border-border"><CardContent className="flex min-h-28 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></CardContent></Card>;

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><ShieldCheck className="h-5 w-5" /></div>
            <div><CardTitle>Kétlépcsős ellenőrzés</CardTitle><CardDescription>Belépéskor a jelszó után egy emailben kapott egyszer használatos kódot is kérünk.</CardDescription></div>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-border bg-background text-muted-text"}`}>{enabled ? "Aktív" : "Kikapcsolva"}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />{message}</div>}
        {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

        {challenge ? (
          <div className="space-y-4 rounded-xl border border-border bg-surface/50 p-4">
            <div className="flex gap-3"><Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p className="text-sm text-muted-text">Nyolcjegyű ellenőrzőkódot küldtünk erre a címre: <strong className="text-text">{challenge.maskedEmail}</strong></p></div>
            <div><Label htmlFor="settings-2fa-code">Ellenőrzőkód</Label><Input id="settings-2fa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} className="mt-1 text-center font-mono text-xl tracking-[0.35em]" autoFocus /></div>
            <div className="flex justify-end gap-3"><button type="button" onClick={resetFlow} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text">Mégse</button><button type="button" onClick={confirm} disabled={busy || code.length !== 8} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Ellenőrzés…" : "Megerősítés"}</button></div>
          </div>
        ) : enabled && action === "disable" ? (
          <div className="space-y-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <div><Label htmlFor="settings-2fa-password">Jelenlegi jelszó</Label><Input id="settings-2fa-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1" autoFocus /></div>
            <p className="text-xs text-muted-text">A jelszó ellenőrzése után emailkóddal is meg kell erősítened a kikapcsolást.</p>
            <div className="flex justify-end gap-3"><button type="button" onClick={resetFlow} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text">Mégse</button><button type="button" onClick={startDisable} disabled={busy || !password} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Küldés…" : "Kikapcsolás folytatása"}</button></div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-text">{enabled ? "A következő jelszavas belépésnél már szükség lesz az emailkódra." : "Opcionális védelem; bármikor bekapcsolhatod ehhez a portálfiókhoz."}</p>
            {enabled ? <button type="button" onClick={() => { setAction("disable"); setError(""); setMessage(""); }} className="shrink-0 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-600">Kikapcsolás</button> : <button type="button" onClick={startEnable} disabled={busy} className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Kód küldése…" : "Bekapcsolás"}</button>}
          </div>
        )}
        <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-text">Authenticator alkalmazás és QR-kódos TOTP támogatás: következő fejlesztési mérföldkő.</div>
      </CardContent>
    </Card>
  );
}
