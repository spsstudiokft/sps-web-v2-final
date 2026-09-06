import { BellRing, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const decodeVapidKey = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4)), char => char.charCodeAt(0));

export function PublicPushSubscription() {
  const [status, setStatus] = useState<"idle" | "working" | "enabled" | "unavailable">("idle");

  const subscribe = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || Notification.permission === "denied") { setStatus("unavailable"); return; }
    setStatus("working");
    try {
      const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (permission !== "granted") { setStatus("unavailable"); return; }
      const keyResponse = await fetch("/api/public/push/public-key");
      const { publicKey } = keyResponse.ok ? await keyResponse.json() : {};
      if (!publicKey) throw new Error("Missing public key");
      const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(publicKey) });
      const response = await fetch("/api/public/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: subscription.toJSON() }) });
      if (!response.ok) throw new Error("Subscription failed");
      setStatus("enabled");
    } catch {
      setStatus("unavailable");
    }
  };

  if (status === "enabled") return <p className="inline-flex items-center gap-1.5 text-xs text-emerald-300"><CheckCircle2 className="h-4 w-4" />Értesítések bekapcsolva ezen az eszközön.</p>;
  return <div className="flex flex-col items-center gap-2"><button type="button" onClick={() => void subscribe()} disabled={status === "working"} className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/25 disabled:cursor-wait disabled:opacity-60"><BellRing className="h-4 w-4" />{status === "working" ? "Bekapcsolás…" : "Karbantartási értesítések kérése"}</button>{status === "unavailable" && <p className="max-w-sm text-[11px] text-background/55">A böngészőben engedélyezd az értesítéseket, majd próbáld újra.</p>}</div>;
}
