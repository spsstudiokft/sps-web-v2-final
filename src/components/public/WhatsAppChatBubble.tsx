import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

type WhatsAppConfig = { enabled?: boolean; phone?: string; message?: string };

export function WhatsAppChatBubble() {
  const { pathname } = useLocation();
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const isPortal = /^\/(admin|client|property-manager|property-listings)/.test(pathname);

  useEffect(() => {
    if (isPortal) return;
    fetch("/api/public/whatsapp-config").then(response => response.ok ? response.json() : null).then(data => setConfig(data)).catch(() => setConfig(null));
  }, [isPortal]);

  if (isPortal || dismissed || !config?.enabled || !config.phone) return null;
  const number = String(config.phone).replace(/\D/g, "");
  if (!number) return null;
  const href = `https://wa.me/${number}${config.message ? `?text=${encodeURIComponent(config.message)}` : ""}`;

  return <aside className="fixed bottom-24 right-5 z-[80] flex items-center gap-2" aria-label="WhatsApp kapcsolat"><span className="hidden rounded-xl border border-emerald-400/30 bg-slate-950/90 px-3 py-2 text-xs font-medium text-white shadow-xl backdrop-blur sm:block">Írj nekünk WhatsAppon</span><a href={href} target="_blank" rel="noopener noreferrer" className="group relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-3xl text-white shadow-[0_12px_30px_rgba(37,211,102,0.38)] transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#25D366]/35" aria-label="Kapcsolatfelvétel WhatsAppon"><FontAwesomeIcon icon={faWhatsapp} /><span className="absolute inset-0 rounded-full border border-white/30" /></a><button type="button" onClick={() => setDismissed(true)} className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-slate-950 text-white shadow" aria-label="WhatsApp buborék bezárása"><X className="h-3 w-3" /></button></aside>;
}
