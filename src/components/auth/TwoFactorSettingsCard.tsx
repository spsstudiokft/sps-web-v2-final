import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Download, Loader2, Mail, ShieldCheck, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";

type Challenge = { challengeId: string; preauthToken: string; maskedEmail: string };

export function TwoFactorSettingsCard() {
  const { fetchApi } = useApi();
  const [enabled, setEnabled] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [recoveryRemaining, setRecoveryRemaining] = useState(0);
  const [totpFlow, setTotpFlow] = useState<"password" | "setup" | "disable" | null>(null);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; token: string; qr: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loginMode, setLoginMode] = useState<"email_only" | "totp_only" | "combined" | null>(null);
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
        setTotpEnabled(Boolean(body.totp_enabled));
        setRecoveryRemaining(Number(body.recovery_codes_remaining || 0));
        setLoginMode(body.login_mode || null);
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

  const startTotp = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetchApi("/api/auth/2fa/totp/enrollment/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Az authenticator beállítása nem indítható el.");
      const qr = await QRCode.toDataURL(body.otpauth_uri, { width: 240, margin: 2, errorCorrectionLevel: "M" });
      setTotpSetup({ secret: body.secret, token: body.enrollment_token, qr }); setTotpFlow("setup"); setPassword(""); setCode("");
    } catch (reason: any) { setError(reason?.message || "Az authenticator beállítása nem indítható el."); }
    finally { setBusy(false); }
  };

  const confirmTotp = async () => {
    if (!totpSetup) return;
    setBusy(true); setError("");
    try {
      const response = await fetchApi("/api/auth/2fa/totp/enrollment/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enrollment_token: totpSetup.token, code }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "A kód ellenőrzése sikertelen.");
      setTotpEnabled(true); if (!enabled) setLoginMode("totp_only"); setRecoveryCodes(body.recovery_codes || []); setRecoveryRemaining((body.recovery_codes || []).length); setTotpFlow(null); setTotpSetup(null); setCode(""); setMessage("Az authenticatoros kétlépcsős ellenőrzés bekapcsolva. Mentsd el a helyreállító kódokat!");
    } catch (reason: any) { setError(reason?.message || "A kód ellenőrzése sikertelen."); }
    finally { setBusy(false); }
  };

  const disableTotp = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetchApi("/api/auth/2fa/totp/disable", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, code }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Az authenticator kikapcsolása sikertelen.");
      setTotpEnabled(false); setLoginMode(enabled ? "email_only" : null); setRecoveryRemaining(0); setRecoveryCodes([]); setTotpFlow(null); setPassword(""); setCode(""); setMessage("Az authenticatoros ellenőrzés kikapcsolva.");
    } catch (reason: any) { setError(reason?.message || "Az authenticator kikapcsolása sikertelen."); }
    finally { setBusy(false); }
  };

  const downloadRecovery = () => {
    const blob = new Blob([`SPS Studio helyreállító kódok\n\n${recoveryCodes.join("\n")}\n\nMinden kód egyszer használható.`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "sps-studio-recovery-codes.txt"; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const changeLoginMode = async (nextMode: "email_only" | "totp_only" | "combined") => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetchApi("/api/auth/2fa/login-mode", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login_mode: nextMode }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "A belépési mód nem menthető.");
      setLoginMode(nextMode); setMessage("A kétlépcsős belépési mód frissítve.");
    } catch (reason: any) { setError(reason?.message || "A belépési mód nem menthető."); }
    finally { setBusy(false); }
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
      if (nextEnabled && !totpEnabled) setLoginMode("email_only");
      if (!nextEnabled) setLoginMode(totpEnabled ? "totp_only" : null);
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

        {(enabled || totpEnabled) && <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4"><div><p className="font-semibold text-text">Belépési védelem módja</p><p className="text-xs text-muted-text">A két faktor külön is használható, vagy kombinált módban egymás után mindkettő kérhető.</p></div><div className="grid gap-2 sm:grid-cols-3">{([
          { id: "email_only", title: "Csak email", description: "Jelszó + emailkód", disabled: !enabled },
          { id: "totp_only", title: "Csak authenticator", description: "Jelszó + 6 jegyű TOTP", disabled: !totpEnabled },
          { id: "combined", title: "Kombinált", description: "Jelszó + TOTP + email", disabled: !enabled || !totpEnabled },
        ] as const).map(option => <button key={option.id} type="button" disabled={busy || option.disabled} onClick={() => changeLoginMode(option.id)} className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${loginMode === option.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:border-primary/40"}`}><span className="block text-sm font-semibold text-text">{option.title}</span><span className="mt-1 block text-xs text-muted-text">{option.description}</span></button>)}</div>{(!enabled || !totpEnabled) && <p className="text-xs text-muted-text">A kombinált mód akkor választható, ha az emailes és az authenticatoros ellenőrzés is aktív.</p>}</div>}

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
        <div className="border-t border-border pt-5 space-y-4">
          <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><Smartphone className="mt-0.5 h-5 w-5 text-primary"/><div><p className="font-semibold text-text">Authenticator alkalmazás</p><p className="text-sm text-muted-text">Google Authenticator, Microsoft Authenticator, 1Password és más RFC 6238 alkalmazásokkal.</p></div></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${totpEnabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "border-border text-muted-text"}`}>{totpEnabled ? "Aktív" : "Kikapcsolva"}</span></div>
          {totpFlow === "password" && <div className="space-y-3 rounded-xl border border-border p-4"><Label>Jelenlegi jelszó</Label><Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} autoFocus/><div className="flex justify-end gap-2"><button onClick={() => { setTotpFlow(null); setPassword(""); }} className="rounded-lg border border-border px-4 py-2 text-sm">Mégse</button><button onClick={startTotp} disabled={busy || !password} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">QR-kód létrehozása</button></div></div>}
          {totpFlow === "setup" && totpSetup && <div className="space-y-4 rounded-xl border border-border p-4"><p className="text-sm text-muted-text">Olvasd be a QR-kódot az alkalmazásban. A QR helyben készül, a titkos kulcs nem kerül külső QR-szolgáltatóhoz.</p><div className="flex justify-center"><img src={totpSetup.qr} alt="Authenticator QR-kód" className="rounded-xl border border-border bg-white p-2" width={240} height={240}/></div><div className="rounded-lg bg-background p-3 text-center"><p className="text-xs text-muted-text">Kézi beállítási kulcs</p><code className="mt-1 block break-all text-sm text-text">{totpSetup.secret}</code><button onClick={() => navigator.clipboard.writeText(totpSetup.secret)} className="mt-2 inline-flex items-center gap-1 text-xs text-primary"><Copy className="h-3 w-3"/>Másolás</button></div><div><Label>Hatjegyű kód az alkalmazásból</Label><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-1 text-center font-mono text-xl tracking-[0.35em]" autoFocus/></div><div className="flex justify-end gap-2"><button onClick={() => { setTotpFlow(null); setTotpSetup(null); setCode(""); }} className="rounded-lg border border-border px-4 py-2 text-sm">Mégse</button><button onClick={confirmTotp} disabled={busy || code.length !== 6} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Aktiválás</button></div></div>}
          {totpFlow === "disable" && <div className="space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4"><div><Label>Jelenlegi jelszó</Label><Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}/></div><div><Label>Hatjegyű authenticator kód</Label><Input inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-1 text-center font-mono"/></div><div className="flex justify-end gap-2"><button onClick={() => { setTotpFlow(null); setPassword(""); setCode(""); }} className="rounded-lg border border-border px-4 py-2 text-sm">Mégse</button><button onClick={disableTotp} disabled={busy || !password || code.length !== 6} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Kikapcsolás</button></div></div>}
          {!totpFlow && <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-text">{totpEnabled ? `${recoveryRemaining} fel nem használt helyreállító kód.` : "Opcionális; bekapcsolás után ez lesz az elsődleges belépési módszer."}</p>{totpEnabled ? <button onClick={() => { setTotpFlow("disable"); setError(""); }} className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-600">Kikapcsolás</button> : <button onClick={() => { setTotpFlow("password"); setError(""); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Authenticator beállítása</button>}</div>}
          {recoveryCodes.length > 0 && <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"><p className="text-sm font-semibold text-text">Mentsd el most ezt a tíz helyreállító kódot</p><p className="text-xs text-muted-text">Csak most jelennek meg, és mindegyik egyszer használható.</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{recoveryCodes.map(item => <code key={item} className="rounded bg-background px-3 py-2 text-center text-sm">{item}</code>)}</div><button onClick={downloadRecovery} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold"><Download className="h-4 w-4"/>Letöltés .txt fájlként</button></div>}
        </div>
      </CardContent>
    </Card>
  );
}
