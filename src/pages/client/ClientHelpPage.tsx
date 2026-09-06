import { useEffect, useRef, useState } from "react";
import { BookOpenCheck, Check, CheckCheck, CheckCircle2, ChevronDown, CircleHelp, ImageOff, MessageCircle, Send } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { useLanguage } from "../../contexts/LanguageContext";

type HelpTopic = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  steps: string[];
};

export default function ClientHelpPage() {
  const { fetchApi } = useApi();
  const { tUi } = useLanguage();
  const [topics, setTopics] = useState<HelpTopic[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState<any[]>([]); const [activeConversation, setActiveConversation] = useState<any | null>(null); const [messages, setMessages] = useState<any[]>([]); const [subject, setSubject] = useState(""); const [draft, setDraft] = useState(""); const [chatError, setChatError] = useState(""); const [remoteTyping, setRemoteTyping] = useState(false); const typingTimer = useRef<number | undefined>(undefined); const lastTypingSignal = useRef(0);
  const loadConversations = async () => { const response = await fetchApi("/api/client/feedback/conversations"); if (response.ok) setConversations(await response.json()); };
  const loadMessages = async (conversation: any) => { setActiveConversation(conversation); const response = await fetchApi(`/api/client/feedback/conversations/${conversation.id}/messages`); if (response.ok) setMessages(await response.json()); };
  const loadTyping = async (conversation: any) => { const response = await fetchApi(`/api/client/feedback/conversations/${conversation.id}/typing`); if (response.ok) { const data = await response.json(); setRemoteTyping(Array.isArray(data.actors) && data.actors.length > 0); } };
  const signalTyping = (value: string) => { if (!activeConversation) return; window.clearTimeout(typingTimer.current); const send = (typing: boolean) => void fetchApi(`/api/client/feedback/conversations/${activeConversation.id}/typing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ typing }) }); if (!value.trim()) { send(false); return; } if (Date.now() - lastTypingSignal.current > 1500) { lastTypingSignal.current = Date.now(); send(true); } typingTimer.current = window.setTimeout(() => send(false), 3600); };

  useEffect(() => {
    fetchApi("/api/client/help")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || tUi("client.help.load_failed"));
        setEnabled(body.enabled !== false);
        const nextTopics = Array.isArray(body.topics) ? body.topics : [];
        setTopics(nextTopics);
        setOpenTopic(nextTopics[0]?.id || null);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : tUi("client.help.load_failed")))
      .finally(() => setLoading(false));
  }, [fetchApi]);
  useEffect(() => { void loadConversations(); const timer = window.setInterval(() => { void loadConversations(); if (activeConversation) { void loadMessages(activeConversation); void loadTyping(activeConversation); } }, 5000); return () => window.clearInterval(timer); }, [fetchApi, activeConversation?.id]);
  const sendFeedback = async (event: React.FormEvent) => { event.preventDefault(); setChatError(""); try { if (!activeConversation) { const response = await fetchApi("/api/client/feedback/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, message: draft }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setSubject(""); setDraft(""); await loadConversations(); await loadMessages({ id: data.id, subject: data.subject, status: data.status }); } else { const response = await fetchApi(`/api/client/feedback/conversations/${activeConversation.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: draft }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setDraft(""); signalTyping(""); await loadMessages(activeConversation); await loadConversations(); } } catch (err: any) { setChatError(err.message || tUi("client.help.send_failed")); } };

  if (loading) return <div className="flex min-h-72 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return <div className="space-y-6">
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><BookOpenCheck className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-bold text-text sm:text-2xl">{tUi("client.help.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-text">{tUi("client.help.description")}</p>
        </div>
      </div>
    </div>

    <section className="grid gap-4 rounded-2xl border border-border bg-surface p-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="border-b border-border pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">{tUi("client.help.messages")}</h2><button type="button" onClick={() => { setActiveConversation(null); setMessages([]); }} className="text-xs font-semibold text-primary">{tUi("client.help.new")}</button></div>{conversations.map(conversation => <button key={conversation.id} type="button" onClick={() => void loadMessages(conversation)} className={`mb-2 w-full rounded-xl border p-3 text-left text-xs ${activeConversation?.id === conversation.id ? "border-primary bg-primary/5" : "border-border"}`}><b className="block truncate">{conversation.subject}</b><span className="block truncate text-muted-text">{conversation.last_message}</span></button>)}{!conversations.length && <p className="text-xs text-muted-text">{tUi("client.help.no_conversations")}</p>}</aside>
      <div><div className="mb-3 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /><div><h2 className="text-sm font-bold">{activeConversation?.subject || tUi("client.help.contact_us")}</h2><p className="text-xs text-muted-text">{tUi("client.help.auto_refresh")}</p></div></div><div className="mb-3 min-h-32 max-h-72 space-y-2 overflow-y-auto rounded-xl bg-background/50 p-3">{activeConversation ? messages.map(message => { const mine = message.sender_role === "client"; const status = tUi(message.read_at ? "client.help.read" : message.delivered_at ? "client.help.delivered" : "client.help.sent"); const StatusIcon = message.read_at ? CheckCheck : Check; return <div key={message.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${mine ? "ml-auto bg-primary text-primary-foreground" : "border border-border bg-surface"}`}><p>{message.body}</p><div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "justify-end text-primary-foreground/70" : "text-muted-text"}`}><time>{new Date(message.created_at).toLocaleString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>{mine && <span className="inline-flex items-center gap-0.5"><StatusIcon size={11}/>{status}</span>}</div></div>; }) : <p className="pt-8 text-center text-sm text-muted-text">{tUi("client.help.start_message")}</p>}</div>{chatError && <p className="mb-2 text-xs text-red-600">{chatError}</p>}<form onSubmit={sendFeedback} className="space-y-2">{!activeConversation && <input required value={subject} onChange={event => setSubject(event.target.value)} placeholder={tUi("client.help.subject")} maxLength={160} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />}<p className="min-h-4 text-xs text-muted-text">{remoteTyping ? tUi("client.help.admin_typing") : ""}</p><div className="flex gap-2"><textarea required value={draft} onChange={event => { const value = event.target.value; setDraft(value); signalTyping(value); }} placeholder={tUi("client.help.write_message")} maxLength={5000} className="min-h-20 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" /><button className="self-end rounded-xl bg-primary p-2.5 text-primary-foreground" aria-label={tUi("client.help.send")}><Send className="h-4 w-4" /></button></div></form></div>
    </section>

    {error ? <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}

    {!error && (!enabled || topics.length === 0) ? <div className="rounded-2xl border border-border bg-surface p-10 text-center"><CircleHelp className="mx-auto mb-3 h-10 w-10 text-primary" /><h2 className="text-base font-bold text-text">{tUi("client.help.coming_soon")}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-text">{tUi("client.help.coming_soon_description")}</p></div> : null}

    <div className="space-y-3">
      {topics.map((topic, topicIndex) => {
        const isOpen = openTopic === topic.id;
        return <article key={topic.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <button type="button" onClick={() => setOpenTopic(isOpen ? null : topic.id)} className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5" aria-expanded={isOpen}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{topicIndex + 1}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-text sm:text-base">{topic.title || `Súgótopik ${topicIndex + 1}`}</span><span className="mt-0.5 block truncate text-xs text-muted-text">{topic.description}</span></span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-muted-text transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
          {isOpen ? <div className="border-t border-border px-4 py-5 sm:px-5">
            {topic.description ? <p className="mb-5 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-text">{topic.description}</p> : null}
            <div className={`grid gap-5 ${topic.image_url ? "lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.8fr)]" : ""}`}>
              <div>
                {topic.steps.length ? <ol className="space-y-3">{topic.steps.map((step, stepIndex) => <li key={`${topic.id}-${stepIndex}`} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">{stepIndex + 1}</span><span className="pt-0.5 text-sm leading-6 text-text">{step}</span></li>)}</ol> : <p className="flex items-center gap-2 text-sm text-muted-text"><CheckCircle2 className="h-4 w-4 text-primary" />{tUi("client.help.no_more_steps")}</p>}
              </div>
              {topic.image_url ? <img src={topic.image_url} alt={`${topic.title} – ${tUi("client.help.help_image")}`} className="max-h-[28rem] w-full rounded-xl border border-border bg-background object-contain" loading="lazy" /> : <div className="hidden items-center justify-center rounded-xl border border-dashed border-border bg-background/50 p-6 text-muted-text lg:flex"><ImageOff className="h-5 w-5" /></div>}
            </div>
          </div> : null}
        </article>;
      })}
    </div>
  </div>;
}
