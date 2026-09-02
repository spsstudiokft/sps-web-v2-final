import { useEffect, useState } from "react";
import { Copy, Edit3, Mail, Plus, Send, Trash2 } from "lucide-react";
import { EmailTemplate } from "../../lib/types";
import { EmailTemplateEditorModal } from "../../components/admin/EmailTemplateEditorModal";

const authHeaders = (json = false) => {
  const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
  return { ...(json ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

export default function MarketingEmailsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [name, setName] = useState("");
  const [recipient, setRecipient] = useState("");
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const welcomeTemplates = templates.filter(template => template.template_key.startsWith("welcome_"));
  const campaignTemplates = templates.filter(template => !template.template_key.startsWith("welcome_"));

  const load = async () => {
    const res = await fetch("/api/admin/email/templates", { headers: authHeaders() });
    if (res.ok) setTemplates((await res.json()).filter((item: EmailTemplate) => item.category === "marketing"));
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selected) return;
    const next: Record<string, string> = {};
    for (const token of selected.available_tokens || []) {
      const key = token.token.replace(/^{{\s*|\s*}}$/g, "");
      next[key] = "";
    }
    next.recipient_name = "";
    setTokens(next);
  }, [selected]);

  const createTemplate = async (source?: EmailTemplate) => {
    const templateName = source ? `${source.name} – másolat` : name.trim();
    if (!templateName) return setNotice("Adj nevet az új sablonnak.");
    setBusy(true); setNotice("");
    try {
      const res = await fetch("/api/admin/email/templates/marketing", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ name: templateName, description: source?.description, subject: source?.subject, body_html: source?.body_html, body_text: source?.body_text }) });
      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await res.json() : { error: await res.text() };
      if (!res.ok) throw new Error(data.error || `A sablon létrehozása sikertelen (${res.status}).`);
      setName(""); setNotice("A marketing sablon elkészült."); await load(); setEditing(data.template);
    } catch (error: any) {
      setNotice(error?.message || "A szerver nem érhető el. Indítsd újra, majd próbáld meg ismét.");
    } finally { setBusy(false); }
  };

  const remove = async (template: EmailTemplate) => {
    if (!(await globalThis.appConfirm(`Biztosan törlöd ezt a sablont: ${template.name}?`, { tone: "danger", confirmLabel: "Törlés" }))) return;
    const res = await fetch(`/api/admin/email/templates/marketing/${template.template_key}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) { if (selected?.template_key === template.template_key) setSelected(null); await load(); }
  };

  const dispatch = async () => {
    if (!selected) return;
    setBusy(true); setNotice("");
    const res = await fetch(`/api/admin/email/templates/marketing/${selected.template_key}/send`, { method: "POST", headers: authHeaders(true), body: JSON.stringify({ recipient, tokens }) });
    const data = await res.json(); setBusy(false);
    setNotice(res.ok ? (data.notice || "Az email sikeresen elküldve.") : (data.error || "A küldés sikertelen."));
  };

  return <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-7">
    <div><div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-primary/15 text-primary"><Mail /></div><div><h1 className="text-2xl md:text-3xl font-bold text-text">Marketing emailek</h1><p className="text-muted-text">Újrahasználható sablonok szerkesztése és kézi kiküldése.</p></div></div></div>
    {notice && <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-text">{notice}</div>}
    <section className="rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-5 shadow-xl">
      <h2 className="font-semibold text-text mb-3">Új sablon</h2><div className="flex flex-col sm:flex-row gap-3"><input value={name} onChange={e => setName(e.target.value)} placeholder="Sablon neve" className="flex-1 rounded-xl border border-border bg-background/70 px-4 py-2.5 text-text"/><button disabled={busy} onClick={() => createTemplate()} className="rounded-xl bg-primary text-white px-5 py-2.5 font-semibold flex items-center justify-center gap-2"><Plus size={17}/> Létrehozás</button></div>
    </section>
    <section className="space-y-4">
      <div><h2 className="font-semibold text-text">Welcome e-mailek</h2><p className="text-sm text-muted-text">Személyre szabható, manuálisan kiküldhető első kapcsolatfelvételi sablonok.</p></div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {welcomeTemplates.map(template => <article key={template.id} className={`rounded-2xl border p-5 backdrop-blur-xl transition ${selected?.id === template.id ? "border-primary bg-primary/10" : "border-border bg-card/70"}`}>
        <h3 className="font-bold text-text">{template.name}</h3><p className="text-sm text-muted-text mt-1 line-clamp-2">{template.description}</p><p className="text-xs text-muted-text mt-3">v{template.version} · {new Date(template.last_updated_at).toLocaleString("hu-HU")}</p>
        <div className="flex flex-wrap gap-2 mt-4"><button onClick={() => setEditing(template)} className="px-3 py-2 rounded-lg bg-background border border-border text-sm text-text flex gap-1.5 items-center"><Edit3 size={14}/> Szerkesztés</button><button onClick={() => createTemplate(template)} className="px-3 py-2 rounded-lg bg-background border border-border text-sm text-text"><Copy size={14}/></button><button onClick={() => setSelected(template)} className="px-3 py-2 rounded-lg bg-primary text-white text-sm flex gap-1.5 items-center"><Send size={14}/> Küldés</button>{template.is_customized && <button onClick={() => remove(template)} className="px-3 py-2 rounded-lg text-red-500 border border-red-500/20"><Trash2 size={14}/></button>}</div>
      </article>)}
      </div>
    </section>
    <section className="space-y-4">
      <div><h2 className="font-semibold text-text">Hirdetési és egyéb kampányok</h2></div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {campaignTemplates.map(template => <article key={template.id} className={`rounded-2xl border p-5 backdrop-blur-xl transition ${selected?.id === template.id ? "border-primary bg-primary/10" : "border-border bg-card/70"}`}>
        <h3 className="font-bold text-text">{template.name}</h3><p className="text-sm text-muted-text mt-1 line-clamp-2">{template.description}</p><p className="text-xs text-muted-text mt-3">v{template.version} · {new Date(template.last_updated_at).toLocaleString("hu-HU")}</p>
        <div className="flex flex-wrap gap-2 mt-4"><button onClick={() => setEditing(template)} className="px-3 py-2 rounded-lg bg-background border border-border text-sm text-text flex gap-1.5 items-center"><Edit3 size={14}/> Szerkesztés</button><button onClick={() => createTemplate(template)} className="px-3 py-2 rounded-lg bg-background border border-border text-sm text-text"><Copy size={14}/></button><button onClick={() => setSelected(template)} className="px-3 py-2 rounded-lg bg-primary text-white text-sm flex gap-1.5 items-center"><Send size={14}/> Küldés</button>{template.is_customized && <button onClick={() => remove(template)} className="px-3 py-2 rounded-lg text-red-500 border border-red-500/20"><Trash2 size={14}/></button>}</div>
      </article>)}
      </div>
    </section>
    {selected && <section className="rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-5 space-y-4"><div><h2 className="font-bold text-text">Küldés: {selected.name}</h2><p className="text-sm text-muted-text">Töltsd ki a sablon változóit, majd küldd el egyedileg.</p></div><div className="grid md:grid-cols-2 gap-3"><input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="Címzett e-mail-címe" type="email" className="rounded-xl border border-border bg-background/70 px-4 py-2.5 text-text"/>{selected.available_tokens.map(token => { const key = token.token.replace(/^{{\s*|\s*}}$/g, ""); const longValue = /message|summary|details/i.test(key); return <label key={token.token} className={longValue ? "md:col-span-2" : ""}><span className="mb-1 block text-xs font-medium text-muted-text">{token.label}</span>{longValue ? <textarea value={tokens[key] ?? ""} onChange={e=>setTokens({...tokens,[key]:e.target.value})} placeholder={token.example} rows={4} className="w-full rounded-xl border border-border bg-background/70 px-4 py-2.5 text-text"/> : <input value={tokens[key] ?? ""} onChange={e=>setTokens({...tokens,[key]:e.target.value})} placeholder={token.example} className="w-full rounded-xl border border-border bg-background/70 px-4 py-2.5 text-text"/>}</label>; })}</div><button disabled={busy} onClick={dispatch} className="rounded-xl bg-primary text-white px-5 py-2.5 font-semibold flex gap-2 items-center"><Send size={17}/>{busy ? "Küldés…" : "E-mail kiküldése"}</button></section>}
    <EmailTemplateEditorModal template={editing} isOpen={!!editing} allowReset={false} onClose={() => setEditing(null)} onSaved={updated => { setEditing(updated); setTemplates(list => list.map(x => x.id === updated.id ? updated : x)); }} />
  </div>;
}
