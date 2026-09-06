import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BarChart3, Check, CheckCheck, ChevronLeft, ChevronRight, MessageCircle, Minus, Plus, Send, Users, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

type WorkspaceTool = "chat" | "analytics";
type ChatScope = "clients" | "staff";
type ChatItem = { id: string; title: string; subtitle?: string; last_message?: string; unread_count?: number; kind: ChatScope; status?: string };
type OpenChat = ChatItem & { minimized?: boolean };

const storageKey = "sps_admin_workspace_panel";
const runtimeStorageKey = "sps_admin_workspace_runtime";

function initialState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}") as { open?: boolean; tool?: WorkspaceTool; scope?: ChatScope };
  } catch { return {}; }
}

function initialRuntime() {
  try {
    return JSON.parse(sessionStorage.getItem(runtimeStorageKey) || "{}") as Pick<WorkspaceRuntime, "openChats" | "messages" | "drafts">;
  } catch { return {}; }
}

type WorkspaceRuntime = { openChats: OpenChat[]; messages: Record<string, any[]>; drafts: Record<string, string> };

export function AdminWorkspacePanel() {
  const saved = useMemo(initialState, []);
  const runtime = useMemo(initialRuntime, []);
  const { fetchApi } = useApi();
  const { user } = useAuth();
  const { tUi } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(saved.open ?? true);
  const [tool, setTool] = useState<WorkspaceTool>(saved.tool ?? "chat");
  const [scope, setScope] = useState<ChatScope>(saved.scope ?? "clients");
  const [clientItems, setClientItems] = useState<ChatItem[]>([]);
  const [staffItems, setStaffItems] = useState<ChatItem[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [openChats, setOpenChats] = useState<OpenChat[]>(runtime.openChats || []);
  const [messages, setMessages] = useState<Record<string, any[]>>(runtime.messages || {});
  const [drafts, setDrafts] = useState<Record<string, string>>(runtime.drafts || {});
  const [typingActors, setTypingActors] = useState<Record<string, any[]>>({});
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);
  const [mobileChatKey, setMobileChatKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const typingTimers = useRef<Record<string, number>>({});
  const lastTypingSignal = useRef<Record<string, number>>({});

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify({ open: isOpen, tool, scope })); }, [isOpen, tool, scope]);
  useEffect(() => { sessionStorage.setItem(runtimeStorageKey, JSON.stringify({ openChats, messages, drafts } satisfies WorkspaceRuntime)); }, [openChats, messages, drafts]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clients, staff, members] = await Promise.all([
        fetchApi("/api/admin/client-feedback"),
        fetchApi("/api/admin/workspace-chat/staff/conversations"),
        fetchApi("/api/admin/workspace-chat/staff/members"),
      ]);
      if (clients.ok) setClientItems((await clients.json()).map((item: any) => ({ id: String(item.id), title: item.client_name || item.client_email || "Ügyfél", subtitle: item.subject, last_message: item.last_message, unread_count: Number(item.unread_count || 0), status: item.status, kind: "clients" })));
      if (staff.ok) setStaffItems((await staff.json()).map((item: any) => ({ id: String(item.id), title: item.member_name || item.member_email || "Munkatárs", subtitle: item.member_email, last_message: item.last_message, unread_count: Number(item.unread_count || 0), kind: "staff" })));
      if (members.ok) setStaffMembers(await members.json());
    } finally { setLoading(false); }
  }, [fetchApi]);

  useEffect(() => { void load(); const interval = window.setInterval(() => void load(), 15000); return () => window.clearInterval(interval); }, [load]);

  const loadMessages = useCallback(async (item: ChatItem) => {
    const base = item.kind === "clients" ? `/api/admin/client-feedback/${item.id}/messages` : `/api/admin/workspace-chat/staff/conversations/${item.id}/messages`;
    const response = await fetchApi(base);
    if (response.ok) {
      const result = await response.json();
      setMessages(current => ({ ...current, [item.id]: result }));
    }
  }, [fetchApi]);

  const typingEndpoint = useCallback((item: ChatItem) => item.kind === "clients" ? `/api/admin/client-feedback/${item.id}/typing` : `/api/admin/workspace-chat/staff/conversations/${item.id}/typing`, []);
  const loadTyping = useCallback(async (item: ChatItem) => {
    const response = await fetchApi(typingEndpoint(item));
    if (!response.ok) return;
    const data = await response.json();
    setTypingActors(current => ({ ...current, [`${item.kind}:${item.id}`]: Array.isArray(data.actors) ? data.actors : [] }));
  }, [fetchApi, typingEndpoint]);
  const signalTyping = useCallback((item: ChatItem, value: string) => {
    const key = `${item.kind}:${item.id}`;
    const send = (typing: boolean) => void fetchApi(typingEndpoint(item), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ typing }) });
    window.clearTimeout(typingTimers.current[key]);
    if (!value.trim()) { send(false); return; }
    if (Date.now() - (lastTypingSignal.current[key] || 0) > 1500) { lastTypingSignal.current[key] = Date.now(); send(true); }
    typingTimers.current[key] = window.setTimeout(() => send(false), 3600);
  }, [fetchApi, typingEndpoint]);

  const openChat = useCallback((item: ChatItem) => {
    setOpenChats(current => current.some(chat => chat.id === item.id && chat.kind === item.kind)
      ? current.map(chat => chat.id === item.id && chat.kind === item.kind ? { ...chat, minimized: false } : chat)
      : [...current, { ...item, minimized: false }]);
    if (item.kind === "clients") setClientItems(current => current.map(chat => chat.id === item.id ? { ...chat, unread_count: 0 } : chat));
    else setStaffItems(current => current.map(chat => chat.id === item.id ? { ...chat, unread_count: 0 } : chat));
    void loadMessages(item);
  }, [loadMessages]);

  useEffect(() => {
    const refreshOpenChats = () => openChats.filter(chat => !chat.minimized).forEach(chat => { void loadMessages(chat); void loadTyping(chat); });
    refreshOpenChats();
    const interval = window.setInterval(refreshOpenChats, 5000);
    return () => window.clearInterval(interval);
  }, [loadMessages, loadTyping, openChats]);

  useEffect(() => {
    const requestedChat = new URLSearchParams(location.search).get("workspaceChat");
    if (!requestedChat) return;

    const openRequestedChat = async () => {
      const response = await fetchApi("/api/admin/client-feedback");
      if (!response.ok) return;
      const conversations = await response.json();
      const conversation = requestedChat === "latest"
        ? conversations[0]
        : conversations.find((item: any) => String(item.id) === requestedChat);
      if (!conversation) return;
      openChat({ id: String(conversation.id), title: conversation.client_name || conversation.client_email || "Ügyfél", subtitle: conversation.subject, last_message: conversation.last_message, unread_count: Number(conversation.unread_count || 0), status: conversation.status, kind: "clients" });
    };

    void openRequestedChat();
    const params = new URLSearchParams(location.search);
    params.delete("workspaceChat");
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
  }, [fetchApi, location.pathname, location.search, navigate, openChat]);

  const createStaffChat = async (member: any) => {
    const response = await fetchApi("/api/admin/workspace-chat/staff/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ member_id: member.id }) });
    if (!response.ok) return;
    const { id } = await response.json();
    const item: ChatItem = { id: String(id), title: member.name || member.email, subtitle: member.email, kind: "staff" };
    await load();
    openChat(item);
  };

  const sendMessage = async (chat: OpenChat) => {
    const message = (drafts[chat.id] || "").trim();
    if (!message) return;
    const endpoint = chat.kind === "clients" ? `/api/admin/client-feedback/${chat.id}/messages` : `/api/admin/workspace-chat/staff/conversations/${chat.id}/messages`;
    const response = await fetchApi(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
    if (!response.ok) return;
    setDrafts(current => ({ ...current, [chat.id]: "" }));
    signalTyping(chat, "");
    await loadMessages(chat);
    await load();
  };

  const visibleItems = scope === "clients" ? clientItems : staffItems;
  const activeChats = openChats.filter(chat => !chat.minimized);
  const minimizedChats = openChats.filter(chat => chat.minimized);
  const unreadFor = (chat: ChatItem) => Number((chat.kind === "clients" ? clientItems : staffItems).find(item => item.id === chat.id)?.unread_count ?? chat.unread_count ?? 0);
  const activeChatKeys = new Set(activeChats.map(chat => `${chat.kind}:${chat.id}`));
  const unreadOutsideOpenChats = [...clientItems, ...staffItems].filter(item => !activeChatKeys.has(`${item.kind}:${item.id}`)).reduce((total, item) => total + Number(item.unread_count || 0), 0);
  const mobileChat = openChats.find(chat => `${chat.kind}:${chat.id}` === mobileChatKey);

  return (
    <>
      <div className="lg:hidden">
        <button type="button" onClick={() => { setMobileWorkspaceOpen(true); setMobileChatKey(null); }} className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-[70] flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary text-primary-foreground shadow-[0_10px_30px_color-mix(in_srgb,var(--theme-primary)_45%,transparent)]" aria-label={tUi("admin.workspace.open_messages")}>
          <MessageCircle size={21}/>{unreadOutsideOpenChats > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-rose-500 px-1 text-[10px] font-black text-white">{unreadOutsideOpenChats > 99 ? "99+" : unreadOutsideOpenChats}</span>}
        </button>
        {mobileWorkspaceOpen && <section className="fixed inset-0 z-[100] flex flex-col bg-background/98 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={tUi("admin.workspace.messages")}>
          {mobileChat ? <>
            <header className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]"><button type="button" onClick={() => setMobileChatKey(null)} className="rounded-xl p-2 text-muted-text hover:bg-background hover:text-text" aria-label={tUi("admin.workspace.back_to_conversations")}><ArrowLeft size={20}/></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-text">{mobileChat.title}</p><p className="truncate text-xs text-muted-text">{mobileChat.subtitle || tUi(mobileChat.kind === "clients" ? "admin.workspace.client_conversation" : "admin.workspace.staff_conversation")}</p></div><button type="button" onClick={() => { setOpenChats(items => items.filter(item => item.id !== mobileChat.id || item.kind !== mobileChat.kind)); setMobileChatKey(null); }} className="rounded-xl p-2 text-muted-text hover:bg-background hover:text-text" aria-label={tUi("admin.workspace.close_chat")}><X size={19}/></button></header>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">{(messages[mobileChat.id] || []).map((message: any) => { const mine = mobileChat.kind === "clients" ? message.sender_role === "admin" : String(message.sender_id) === String(user?.id); const status = tUi(message.read_at ? "admin.workspace.read" : message.delivered_at ? "admin.workspace.delivered" : "admin.workspace.sent"); const StatusIcon = message.read_at ? CheckCheck : Check; return <div key={message.id} className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${mine ? "ml-auto bg-primary text-primary-foreground" : "bg-surface text-text"}`}><p>{message.body}</p><div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "justify-end text-primary-foreground/70" : "text-muted-text"}`}><time>{new Date(message.created_at).toLocaleString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>{mine && <span className="inline-flex items-center gap-0.5"><StatusIcon size={11}/>{status}</span>}</div></div>; })}</div>
            <form onSubmit={event => { event.preventDefault(); void sendMessage(mobileChat); }} className="shrink-0 border-t border-border bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"><p className="mb-1 min-h-4 text-[11px] text-muted-text">{typingActors[`${mobileChat.kind}:${mobileChat.id}`]?.length ? tUi(mobileChat.kind === "clients" ? "admin.workspace.client_typing" : "admin.workspace.staff_typing") : ""}</p><div className="flex gap-2"><input autoFocus value={drafts[mobileChat.id] || ""} onChange={event => { const value = event.target.value; setDrafts(current => ({ ...current, [mobileChat.id]: value })); signalTyping(mobileChat, value); }} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-3 text-base outline-none focus:border-primary" placeholder={tUi("admin.workspace.write_message")}/><button type="submit" className="rounded-xl bg-primary px-3 text-primary-foreground" aria-label={tUi("admin.workspace.send_message")}><Send size={20}/></button></div></form>
          </> : <>
            <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]"><div><p className="text-base font-bold text-text">{tUi("admin.workspace.messages")}</p><p className="text-xs text-muted-text">{tUi("admin.workspace.messages_subtitle")}</p></div><button type="button" onClick={() => setMobileWorkspaceOpen(false)} className="rounded-xl p-2 text-muted-text hover:bg-background hover:text-text" aria-label={tUi("admin.workspace.close_messages")}><X size={20}/></button></header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1" role="tablist"><button onClick={() => setScope("clients")} className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${scope === "clients" ? "bg-primary text-primary-foreground" : "text-muted-text"}`}>{tUi("admin.workspace.clients")}</button><button onClick={() => setScope("staff")} className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${scope === "staff" ? "bg-primary text-primary-foreground" : "text-muted-text"}`}>{tUi("admin.workspace.staff")}</button></div>{scope === "staff" && <details className="mb-3 rounded-xl border border-border bg-surface"><summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-text"><span className="inline-flex items-center gap-2"><Plus size={16}/> {tUi("admin.workspace.new_staff_chat")}</span></summary><div className="border-t border-border p-2">{staffMembers.map(member => <button key={member.id} onClick={() => void createStaffChat(member)} className="flex w-full items-center justify-between rounded-lg px-2 py-3 text-left text-sm hover:bg-background"><span className="truncate">{member.name || member.email}</span><Plus size={16} className="text-primary"/></button>)}</div></details>}<p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-text">{tUi(scope === "clients" ? "admin.workspace.client_conversations" : "admin.workspace.staff_conversations")}</p>{visibleItems.length ? visibleItems.map(item => <button key={item.id} type="button" onClick={() => { openChat(item); setMobileChatKey(`${item.kind}:${item.id}`); }} className="mb-2 flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">{item.kind === "clients" ? <MessageCircle size={17}/> : <Users size={17}/>}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><b className="truncate text-sm text-text">{item.title}</b>{item.unread_count ? <i className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] not-italic text-primary-foreground">{item.unread_count}</i> : null}</span><span className="block truncate text-xs text-muted-text">{item.last_message || item.subtitle || tUi("admin.workspace.new_conversation")}</span></span></button>) : <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-text">{loading ? tUi("admin.workspace.loading") : tUi(scope === "clients" ? "admin.workspace.no_client_chats" : "admin.workspace.no_staff_chats")}</p>}</div>
          </>}
        </section>}
      </div>
    <aside className={`admin-workspace-panel hidden lg:flex relative z-50 isolate shrink-0 h-full overflow-visible border-l border-border bg-surface/90 backdrop-blur-xl transition-[width] duration-300 ${isOpen ? "w-[348px]" : "w-12"}`} aria-label={tUi("admin.workspace.messages")}>
      <div className="absolute right-full bottom-0 z-[60] mr-0 flex items-end gap-3 pointer-events-auto">
        {minimizedChats.map(chat => { const unreadCount = unreadFor(chat); return <button key={`${chat.kind}-${chat.id}`} onClick={() => setOpenChats(items => items.map(item => item.id === chat.id && item.kind === chat.kind ? { ...item, minimized: false } : item))} className="relative rounded-t-xl border border-border bg-surface px-4 py-2 text-xs font-semibold shadow-xl hover:border-primary" title={`${chat.title} chat megnyitása`}>{chat.title}{unreadCount > 0 && <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-black text-primary-foreground shadow-[0_0_14px_color-mix(in_srgb,var(--theme-primary)_65%,transparent)]" aria-label={`${unreadCount} új üzenet`}>{unreadCount > 99 ? "99+" : unreadCount}</span>}</button>; })}
        {activeChats.map(chat => <section key={`${chat.kind}-${chat.id}`} className="flex h-[510px] w-[350px] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-border bg-background shadow-2xl">
          <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-bold text-text">{chat.title}</p><p className="truncate text-xs text-muted-text">{chat.subtitle || tUi(chat.kind === "clients" ? "admin.workspace.client_conversation" : "admin.workspace.staff_conversation")}</p></div>
            <div className="flex gap-1"><button onClick={() => setOpenChats(items => items.map(item => item.id === chat.id && item.kind === chat.kind ? { ...item, minimized: true } : item))} className="rounded p-1.5 text-muted-text hover:bg-background hover:text-text" aria-label={tUi("admin.workspace.minimize_chat")}><Minus size={16}/></button><button onClick={() => setOpenChats(items => items.filter(item => item.id !== chat.id || item.kind !== chat.kind))} className="rounded p-1.5 text-muted-text hover:bg-background hover:text-text" aria-label={tUi("admin.workspace.close_chat")}><X size={16}/></button></div>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {(messages[chat.id] || []).map((message: any) => { const mine = chat.kind === "clients" ? message.sender_role === "admin" : String(message.sender_id) === String(user?.id); const status = tUi(message.read_at ? "admin.workspace.read" : message.delivered_at ? "admin.workspace.delivered" : "admin.workspace.sent"); const StatusIcon = message.read_at ? CheckCheck : Check; return <div key={message.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "ml-auto bg-primary text-primary-foreground" : "bg-surface text-text"}`}><p>{message.body}</p><div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "justify-end text-primary-foreground/70" : "text-muted-text"}`}><time>{new Date(message.created_at).toLocaleString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>{mine && <span className="inline-flex items-center gap-0.5"><StatusIcon size={11}/>{status}</span>}</div></div>; })}
          </div>
          <form onSubmit={event => { event.preventDefault(); void sendMessage(chat); }} className="border-t border-border p-3"><p className="mb-1 min-h-4 text-[11px] text-muted-text">{typingActors[`${chat.kind}:${chat.id}`]?.length ? tUi(chat.kind === "clients" ? "admin.workspace.client_typing" : "admin.workspace.staff_typing") : ""}</p><div className="flex gap-2"><input value={drafts[chat.id] || ""} onChange={event => { const value = event.target.value; setDrafts(current => ({ ...current, [chat.id]: value })); signalTyping(chat, value); }} className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary" placeholder={tUi("admin.workspace.write_message")}/><button type="submit" className="rounded-xl bg-primary p-2 text-primary-foreground hover:brightness-110" aria-label={tUi("admin.workspace.send_message")}><Send size={17}/></button></div></form>
        </section>)}
      </div>

      <button onClick={() => setIsOpen(open => !open)} className="absolute -left-3 top-5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-muted-text shadow hover:text-primary" aria-label={tUi(isOpen ? "admin.workspace.close_panel" : "admin.workspace.open_panel")}>{isOpen ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}</button>
      {isOpen && <div className="flex min-w-0 flex-1 flex-col p-3">
        {tool === "chat" ? <>
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-background/70 p-1" role="tablist"><button onClick={() => setScope("clients")} aria-current={scope === "clients" ? "page" : undefined} className={`aero-sidebar-item rounded-lg px-3 py-2 text-xs font-semibold ${scope === "clients" ? "bg-primary text-primary-foreground shadow" : "text-muted-text"}`}>{tUi("admin.workspace.clients")}</button><button onClick={() => setScope("staff")} aria-current={scope === "staff" ? "page" : undefined} className={`aero-sidebar-item rounded-lg px-3 py-2 text-xs font-semibold ${scope === "staff" ? "bg-primary text-primary-foreground shadow" : "text-muted-text"}`}>{tUi("admin.workspace.staff")}</button></div>
          {scope === "staff" && <details className="mb-2 rounded-xl border border-border bg-background"><summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-text"><span className="inline-flex items-center gap-2"><Plus size={14}/> Új belső beszélgetés</span></summary><div className="max-h-36 overflow-y-auto border-t border-border p-2">{staffMembers.map(member => <button key={member.id} onClick={() => void createStaffChat(member)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs hover:bg-surface"><span className="truncate">{member.name || member.email}</span><Plus size={14} className="text-primary"/></button>)}</div></details>}
          <div className="admin-workspace-scroll min-h-0 flex-1 overflow-y-auto"><p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-text">{tUi(scope === "clients" ? "admin.workspace.client_conversations" : "admin.workspace.recent_staff_chat")}</p>{loading && !visibleItems.length ? <p className="p-3 text-sm text-muted-text">{tUi("admin.workspace.loading")}</p> : visibleItems.length ? visibleItems.map(item => { const isChatOpen = openChats.some(chat => chat.id === item.id && chat.kind === item.kind && !chat.minimized); return <button key={item.id} onClick={() => openChat(item)} aria-current={isChatOpen ? "page" : undefined} className={`aero-sidebar-item mb-1 flex w-full gap-3 rounded-xl p-3 text-left ${isChatOpen ? "border-primary/30 bg-primary/10" : ""}`}><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">{scope === "clients" ? <MessageCircle size={16}/> : <Users size={16}/>}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><b className="truncate text-sm text-text">{item.title}</b>{item.unread_count ? <i className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] not-italic text-primary-foreground">{item.unread_count}</i> : null}</span><span className="block truncate text-xs text-muted-text">{item.last_message || item.subtitle || tUi("admin.workspace.new_conversation")}</span></span></button>; }) : <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-text">{tUi(scope === "clients" ? "admin.workspace.no_client_chats" : "admin.workspace.no_staff_chats")}</p>}</div>
        </> : <div className="flex flex-1 flex-col items-center justify-center text-center"><BarChart3 className="mb-3 text-primary" size={34}/><p className="font-semibold">{tUi("admin.workspace.analytics")}</p><p className="mt-1 text-xs text-muted-text">{tUi("admin.workspace.analytics_description")}</p><button onClick={() => navigate("/admin/analytics")} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{tUi("admin.workspace.open_analytics")}</button></div>}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3"><button onClick={() => setTool("analytics")} aria-current={tool === "analytics" ? "page" : undefined} className={`aero-sidebar-item flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold ${tool === "analytics" ? "bg-primary text-primary-foreground" : "bg-background text-muted-text"}`}><BarChart3 size={15}/>{tUi("admin.workspace.analytics")}</button><button onClick={() => setTool("chat")} aria-current={tool === "chat" ? "page" : undefined} className={`aero-sidebar-item relative flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold ${tool === "chat" ? "bg-primary text-primary-foreground" : "bg-background text-muted-text"}`}><MessageCircle size={15}/>{tUi("admin.workspace.messages")}{unreadOutsideOpenChats > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-primary px-1 text-[10px] font-black text-primary-foreground shadow-[0_0_14px_color-mix(in_srgb,var(--theme-primary)_65%,transparent)]" aria-label={`${unreadOutsideOpenChats} ${tUi("admin.workspace.messages")}`}>{unreadOutsideOpenChats > 99 ? "99+" : unreadOutsideOpenChats}</span>}</button></div>
      </div>}
      {!isOpen && <div className="flex flex-1 flex-col items-center gap-3 pt-16"><button onClick={() => { setTool("chat"); setIsOpen(true); }} className="relative rounded-xl p-2 text-primary hover:bg-background" title={tUi("admin.workspace.messages")}><MessageCircle size={19}/>{unreadOutsideOpenChats > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-surface bg-primary px-1 text-[9px] font-black text-primary-foreground shadow-[0_0_12px_color-mix(in_srgb,var(--theme-primary)_65%,transparent)]" aria-label={`${unreadOutsideOpenChats} ${tUi("admin.workspace.messages")}`}>{unreadOutsideOpenChats > 9 ? "9+" : unreadOutsideOpenChats}</span>}</button><button onClick={() => { setTool("analytics"); setIsOpen(true); }} className="rounded-xl p-2 text-muted-text hover:bg-background hover:text-primary" title={tUi("admin.workspace.analytics")}><BarChart3 size={19}/></button></div>}
    </aside>
    </>
  );
}
