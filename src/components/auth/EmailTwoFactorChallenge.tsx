import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";

export interface EmailChallengeState {
  challengeId: string;
  preauthToken: string;
  maskedEmail: string;
  resendAfter: number;
  method?: "email_otp" | "totp";
  recoveryAvailable?: boolean;
}

export function EmailTwoFactorChallenge({
  challenge,
  onVerified,
  onCancel,
}: {
  challenge: EmailChallengeState;
  onVerified: (data: any) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(challenge.resendAfter || 60);
  const [current, setCurrent] = useState(challenge);
  const [useRecovery, setUseRecovery] = useState(false);
  const isTotp = current.method === "totp";

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: current.challengeId, preauth_token: current.preauthToken, method: current.method || "email_otp", ...(useRecovery ? { recovery_code: code } : { code }) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Az ellenőrzés sikertelen.");
      if (data.requires_2fa) {
        setCurrent({ challengeId: data.challenge_id, preauthToken: data.preauth_token, maskedEmail: data.masked_email || "", resendAfter: data.resend_after || 60, method: data.method, recoveryAvailable: data.recovery_available });
        setSeconds(data.resend_after || 60); setUseRecovery(false); setCode("");
        return;
      }
      onVerified(data);
    } catch (reason: any) {
      setError(reason?.message || "Az ellenőrzés sikertelen.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/2fa/email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preauth_token: current.preauthToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Az új kód kiküldése sikertelen.");
      setCurrent({ ...current, challengeId: data.challenge_id, preauthToken: data.preauth_token, resendAfter: data.resend_after || 60 });
      setSeconds(data.resend_after || 60);
      setCode("");
    } catch (reason: any) {
      setError(reason?.message || "Az új kód kiküldése sikertelen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={verify}>
      <div>
        <h3 className="text-lg font-semibold text-text">Bejelentkezés megerősítése</h3>
        <p className="mt-1 text-sm text-muted-text">{isTotp ? (useRecovery ? "Adj meg egy korábban elmentett, egyszer használható helyreállító kódot." : "Add meg az authenticator alkalmazásban látható hatjegyű kódot.") : <>Nyolcjegyű kódot küldtünk erre a címre: {current.maskedEmail}</>}</p>
      </div>
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
      <div>
        <Label htmlFor="email-2fa-code">Ellenőrzőkód</Label>
        <Input
          id="email-2fa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={useRecovery ? 23 : isTotp ? 6 : 8}
          required
          value={code}
          onChange={(event) => setCode(useRecovery ? event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 23) : event.target.value.replace(/\D/g, "").slice(0, isTotp ? 6 : 8))}
          className="mt-1 text-center font-mono text-xl tracking-[0.35em]"
          autoFocus
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading || (useRecovery ? code.replace(/-/g, "").length !== 20 : code.length !== (isTotp ? 6 : 8))}>{loading ? "Ellenőrzés…" : "Belépés"}</Button>
      <div className="flex items-center justify-between gap-3 text-sm">
        <button type="button" className="text-muted-text hover:text-text" onClick={onCancel}>Vissza</button>
        {isTotp && current.recoveryAvailable ? <button type="button" className="text-primary" onClick={() => { setUseRecovery(value => !value); setCode(""); setError(""); }}>{useRecovery ? "Authenticator kód használata" : "Helyreállító kód használata"}</button> : <button type="button" className="text-primary disabled:text-muted-text" disabled={loading || seconds > 0} onClick={resend}>
          {seconds > 0 ? `Újraküldés ${seconds} mp múlva` : "Új kód küldése"}
        </button>}
      </div>
    </form>
  );
}
