import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, CalendarDays, CheckSquare, ChevronLeft, ChevronRight, Clock3, FolderKanban, Images, Lock, Plus, Repeat2, Trash2, X } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";

type CalendarEvent = {
  id: string; title: string; description: string; start_at: string; end_at: string;
  color: string; owner_id: string; owner_name: string; project_id?: string; portfolio_id?: string;
  event_type: "event" | "reminder" | "task" | "project" | "portfolio";
  reminder_at?: string | null; is_completed: number | boolean; is_all_day: number | boolean;
  recurrence_rule: "none" | "daily" | "weekly" | "monthly"; occurrence_key?: string;
  series_start_at?: string; series_end_at?: string; can_edit: number | boolean;
};

const HOUR_HEIGHT = 64;
const START_HOUR = 7;
const END_HOUR = 21;
const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
const ENTRY_TYPES = [
  { id: "event", label: "Esemény", icon: CalendarDays },
  { id: "reminder", label: "Emlékeztető", icon: Bell },
  { id: "task", label: "Feladat", icon: CheckSquare },
  { id: "project", label: "Projekt", icon: FolderKanban },
  { id: "portfolio", label: "Galéria", icon: Images },
] as const;
const pad = (n: number) => String(n).padStart(2, "0");
const localInput = (value: Date | string) => { const d = new Date(value); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const mondayOf = (date: Date) => { const d = new Date(date); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
const addDays = (date: Date, days: number) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const dayLabel = new Intl.DateTimeFormat("hu-HU", { weekday: "short" });
const monthLabel = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long" });

export default function CalendarPage() {
  const { fetchApi } = useApi();
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<Partial<CalendarEvent> | null>(null);
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState<{ day: Date; start: number; end: number } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const drag = useRef<{ day: Date; origin: number; column: HTMLDivElement } | null>(null);
  const calendarViewportRef = useRef<HTMLDivElement | null>(null);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const loadEvents = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetchApi(`/api/admin/calendar-events?from=${encodeURIComponent(weekStart.toISOString())}&to=${encodeURIComponent(weekEnd.toISOString())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "A naptár nem tölthető be.");
      setEvents(Array.isArray(data) ? data as CalendarEvent[] : []);
    } catch (e: any) { setError(e.message || "A naptár nem tölthető be."); }
    finally { setLoading(false); }
  }, [fetchApi, weekStart, weekEnd]);
  useEffect(() => { void loadEvents(); }, [loadEvents]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const viewport = calendarViewportRef.current;
    if (!viewport || !days.some(day => sameDay(day, new Date()))) return;
    const currentMinutes = (new Date().getHours() - START_HOUR) * 60 + new Date().getMinutes();
    const target = Math.max(0, currentMinutes / 60 * HOUR_HEIGHT - viewport.clientHeight * 0.38);
    const frame = window.requestAnimationFrame(() => viewport.scrollTo({ top: target, behavior: "smooth" }));
    return () => window.cancelAnimationFrame(frame);
  }, [weekStart]);

  const minutesAt = (clientY: number, column: HTMLDivElement) => {
    const rect = column.getBoundingClientRect();
    const raw = ((clientY - rect.top) / HOUR_HEIGHT) * 60;
    return Math.max(0, Math.min((END_HOUR - START_HOUR) * 60, Math.round(raw / 15) * 15));
  };
  const beginSelection = (e: React.PointerEvent<HTMLDivElement>, day: Date) => {
    if ((e.target as HTMLElement).closest("[data-event]")) return;
    const origin = minutesAt(e.clientY, e.currentTarget);
    drag.current = { day, origin, column: e.currentTarget };
    setSelection({ day, start: origin, end: Math.min(origin + 15, (END_HOUR - START_HOUR) * 60) });
    const onMove = (move: PointerEvent) => {
      if (!drag.current) return;
      const current = minutesAt(move.clientY, drag.current.column);
      setSelection({ day: drag.current.day, start: Math.min(drag.current.origin, current), end: Math.min((END_HOUR - START_HOUR) * 60, Math.max(drag.current.origin + 15, current + 15)) });
    };
    const onUp = () => {
      const selected = drag.current; drag.current = null;
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp);
      setSelection(current => {
        if (selected && current) {
          const start = new Date(current.day); start.setHours(START_HOUR, current.start, 0, 0);
          const end = new Date(current.day); end.setHours(START_HOUR, current.end, 0, 0);
          setActive({ title: "", description: "", start_at: start.toISOString(), end_at: end.toISOString(), color: COLORS[0], event_type: "event", recurrence_rule: "none", is_all_day: false, is_completed: false, can_edit: true });
        }
        return null;
      });
    };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp, { once: true });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!active || !active.can_edit) return;
    setSaving(true); setError("");
    try {
      const method = active.id ? "PUT" : "POST";
      const url = active.id ? `/api/admin/calendar-events/${active.id}` : "/api/admin/calendar-events";
      const res = await fetchApi(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(active) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "A mentés sikertelen.");
      setActive(null); await loadEvents();
    } catch (e: any) { setError(e.message || "A mentés sikertelen."); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!active?.id || !active.can_edit || !confirm(`Biztosan törlöd ezt a bejegyzést${active.event_type === "portfolio" ? " és az üres portfóliógaléria-vázlatot" : active.event_type === "project" ? " és a hozzá tartozó belső projektet" : ""}?`)) return;
    setSaving(true);
    try { const res = await fetchApi(`/api/admin/calendar-events/${active.id}`, { method: "DELETE" }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setActive(null); await loadEvents(); }
    catch (e: any) { setError(e.message || "A törlés sikertelen."); } finally { setSaving(false); }
  };

  const today = new Date();
  const currentTimeMinutes = (now.getHours() - START_HOUR) * 60 + now.getMinutes() + now.getSeconds() / 60;
  const currentTimeTop = currentTimeMinutes / 60 * HOUR_HEIGHT;
  const currentTimeVisible = currentTimeMinutes >= 0 && currentTimeMinutes <= (END_HOUR - START_HOUR) * 60 && days.some(day => sameDay(day, now));
  const dueReminders = events.filter(event => event.event_type === "reminder" && Boolean(event.can_edit) && !event.is_completed && event.reminder_at && new Date(event.reminder_at) <= now && new Date(event.reminder_at).getTime() > now.getTime() - 86400000);
  return <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-text">
    <header className="shrink-0 flex flex-col gap-4 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><CalendarDays size={23}/></div><div><h1 className="text-xl font-bold">Belső naptár</h1><p className="text-xs text-muted-text">Közös időbeosztás · saját események szerkesztése</p></div></div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-surface" onClick={() => setWeekStart(mondayOf(new Date()))}>Ma</button>
        <button aria-label="Előző hét" className="rounded-lg border border-border p-2 hover:bg-surface" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={18}/></button>
        <button aria-label="Következő hét" className="rounded-lg border border-border p-2 hover:bg-surface" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={18}/></button>
        <strong className="min-w-44 px-2 text-sm capitalize">{monthLabel.format(weekStart)}</strong>
        <input aria-label="Dátum kiválasztása" type="date" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={localInput(weekStart).slice(0,10)} onChange={e => e.target.value && setWeekStart(mondayOf(new Date(`${e.target.value}T12:00:00`)))}/>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20" onClick={() => { const start = new Date(); start.setMinutes(Math.ceil(start.getMinutes()/15)*15,0,0); const end = new Date(start.getTime()+3600000); setActive({ title:"", description:"", start_at:start.toISOString(), end_at:end.toISOString(), color:COLORS[0], event_type:"event", recurrence_rule:"none", is_all_day:false, is_completed:false, can_edit:true }); }}><Plus size={17}/> Új bejegyzés</button>
      </div>
    </header>
    {error && <div className="mx-4 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}
    {dueReminders.length>0&&<button onClick={()=>setActive({...dueReminders[0],start_at:dueReminders[0].series_start_at||dueReminders[0].start_at,end_at:dueReminders[0].series_end_at||dueReminders[0].end_at})} className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-600"><Bell size={18}/><span><strong>{dueReminders.length} esedékes emlékeztetőd van.</strong> {dueReminders[0].title}</span></button>}
    <div ref={calendarViewportRef} className="min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-gutter:stable]">
      <div className="min-w-[900px]">
        <div className="sticky top-0 z-20 grid border-b border-border bg-surface/95 backdrop-blur" style={{gridTemplateColumns:"64px repeat(7, minmax(130px, 1fr))"}}>
          <div className="sticky left-0 z-30 border-r border-border bg-surface/95"/>{days.map(day => <div key={day.toISOString()} className={`border-r border-border px-2 py-2 text-center ${sameDay(day,today)?"bg-primary/5":""}`}><div className="text-[11px] font-bold uppercase tracking-widest text-muted-text">{dayLabel.format(day)}</div><div className={`mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${sameDay(day,today)?"bg-primary text-white":""}`}>{day.getDate()}</div></div>)}
        </div>
        <div className="grid" style={{gridTemplateColumns:"64px repeat(7, minmax(130px, 1fr))"}}>
          <div className="sticky left-0 z-20 border-r border-border bg-background" style={{height:(END_HOUR-START_HOUR)*HOUR_HEIGHT}}>{Array.from({length:END_HOUR-START_HOUR+1},(_,i)=><span key={i} className="absolute right-2 -translate-y-2 text-[10px] font-medium text-muted-text" style={{top:i*HOUR_HEIGHT}}>{pad(START_HOUR+i)}:00</span>)}{currentTimeVisible&&<div className="absolute inset-x-0 z-30 flex -translate-y-1/2 items-center" style={{top:currentTimeTop}}><span className="ml-1 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-white shadow-sm">{pad(now.getHours())}:{pad(now.getMinutes())}</span></div>}</div>
          {days.map(day => <div key={day.toISOString()} className={`relative select-none border-r border-border ${sameDay(day,today)?"bg-primary/[0.025]":""}`} style={{height:(END_HOUR-START_HOUR)*HOUR_HEIGHT}} onPointerDown={e=>beginSelection(e,day)}>
            {Array.from({length:(END_HOUR-START_HOUR)*2},(_,i)=><div key={i} className={`absolute left-0 right-0 border-t ${i%2===0?"border-border":"border-border/40"}`} style={{top:i*HOUR_HEIGHT/2}}/>)}
            {selection && sameDay(selection.day,day) && <div className="pointer-events-none absolute inset-x-1 z-10 rounded-md border border-primary bg-primary/20" style={{top:selection.start/60*HOUR_HEIGHT,height:Math.max(16,(selection.end-selection.start)/60*HOUR_HEIGHT)}}/>}
            {currentTimeVisible&&sameDay(day,now)&&<div aria-label={`Aktuális idő ${pad(now.getHours())}:${pad(now.getMinutes())}`} className="pointer-events-none absolute inset-x-0 z-30 h-px bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.65)]" style={{top:currentTimeTop}}><span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-background bg-red-500"/></div>}
            {events.filter(ev=>sameDay(new Date(ev.start_at),day)).map(ev=>{ const start=new Date(ev.start_at), end=new Date(ev.end_at); const top=ev.is_all_day?0:Math.max(0,((start.getHours()+start.getMinutes()/60)-START_HOUR)*HOUR_HEIGHT); const height=ev.is_all_day?30:Math.max(28,(end.getTime()-start.getTime())/3600000*HOUR_HEIGHT); return <button data-event key={ev.occurrence_key||ev.id} onClick={e=>{e.stopPropagation();setActive({...ev,start_at:ev.series_start_at||ev.start_at,end_at:ev.series_end_at||ev.end_at})}} className={`absolute inset-x-1 z-10 overflow-hidden rounded-md border-l-4 px-2 py-1.5 text-left text-white shadow-md transition hover:z-20 hover:brightness-110 ${ev.is_completed?"opacity-60":""}`} style={{top,height,backgroundColor:`${ev.color}dd`,borderLeftColor:ev.color}}><div className={`flex items-center gap-1 truncate text-xs font-bold ${ev.is_completed?"line-through":""}`}>{ev.event_type==="reminder"&&<Bell size={11}/>} {ev.event_type==="task"&&<CheckSquare size={11}/>} {ev.title}{ev.recurrence_rule!=="none"&&<Repeat2 size={10}/>}</div><div className="mt-0.5 flex items-center gap-1 truncate text-[10px] opacity-90"><Clock3 size={10}/>{ev.is_all_day?"Egész napos":`${pad(start.getHours())}:${pad(start.getMinutes())}`} · {ev.owner_name}</div></button>})}
          </div>)}
        </div>
      </div>
    </div>
    {loading && <div className="fixed bottom-5 right-5 rounded-full border border-border bg-surface px-4 py-2 text-xs shadow-xl">Naptár frissítése…</div>}
    {active && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={e=>e.target===e.currentTarget&&setActive(null)}><form onSubmit={save} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-bold">{active.id?"Esemény részletei":"Új esemény"}</h2>{active.id&&<p className="mt-0.5 text-xs text-muted-text">{active.owner_name}</p>}</div><button type="button" className="rounded-lg p-2 hover:bg-background" onClick={()=>setActive(null)}><X size={18}/></button></div>
      <div className="space-y-4 p-5">
        {!active.can_edit&&<div className="flex gap-2 rounded-xl border border-border bg-background p-3 text-xs text-muted-text"><Lock size={16} className="shrink-0"/>Más csapattag eseménye csak megtekinthető.</div>}
        {!active.id&&active.can_edit&&<div><span className="mb-2 block text-xs font-semibold text-muted-text">Bejegyzés típusa</span><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{ENTRY_TYPES.map(type=>{const Icon=type.icon;return <button type="button" key={type.id} onClick={()=>setActive({...active,event_type:type.id})} className={`rounded-xl border p-2.5 text-center transition ${active.event_type===type.id?"border-primary bg-primary/10 text-primary":"border-border bg-background hover:border-primary/40"}`}><Icon size={19} className="mx-auto mb-1.5"/><span className="block text-[11px] font-bold">{type.label}</span></button>})}</div>{active.event_type==="project"&&<p className="mt-2 text-[11px] text-muted-text">Automatikusan létrejön egy kapcsolt belső projekt.</p>}{active.event_type==="portfolio"&&<p className="mt-2 text-[11px] text-muted-text">Automatikusan létrejön egy nem publikált galériavázlat.</p>}</div>}
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted-text">Esemény neve</span><input required disabled={!active.can_edit} className="w-full rounded-xl border border-border bg-background px-3.5 py-3 outline-none focus:border-primary disabled:opacity-70" value={active.title||""} onChange={e=>setActive({...active,title:e.target.value})}/></label>
        {active.can_edit&&<label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-primary" checked={Boolean(active.is_all_day)} onChange={e=>{if(e.target.checked){const start=new Date(active.start_at!);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);setActive({...active,is_all_day:true,start_at:start.toISOString(),end_at:end.toISOString()})}else setActive({...active,is_all_day:false})}}/> Egész napos</label>}
        <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-semibold text-muted-text">Kezdés</span><input required disabled={!active.can_edit} type={active.is_all_day?"date":"datetime-local"} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" value={active.is_all_day?localInput(active.start_at!).slice(0,10):localInput(active.start_at!)} onChange={e=>e.target.value&&setActive({...active,start_at:new Date(active.is_all_day?`${e.target.value}T00:00:00`:e.target.value).toISOString()})}/></label><label><span className="mb-1.5 block text-xs font-semibold text-muted-text">Befejezés</span><input required disabled={!active.can_edit} type={active.is_all_day?"date":"datetime-local"} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" value={active.is_all_day?localInput(active.end_at!).slice(0,10):localInput(active.end_at!)} onChange={e=>e.target.value&&setActive({...active,end_at:new Date(active.is_all_day?`${e.target.value}T00:00:00`:e.target.value).toISOString()})}/></label></div>
        <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-semibold text-muted-text">Ismétlődés</span><select disabled={!active.can_edit} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" value={active.recurrence_rule||"none"} onChange={e=>setActive({...active,recurrence_rule:e.target.value as CalendarEvent["recurrence_rule"]})}><option value="none">Nem ismétlődik</option><option value="daily">Naponta</option><option value="weekly">Hetente</option><option value="monthly">Havonta</option></select></label>{active.event_type==="reminder"&&<label><span className="mb-1.5 block text-xs font-semibold text-muted-text">E-mail értesítés időpontja</span><input required disabled={!active.can_edit} type="datetime-local" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" value={active.reminder_at?localInput(active.reminder_at):""} onChange={e=>setActive({...active,reminder_at:e.target.value?new Date(e.target.value).toISOString():null})}/><span className="mt-1.5 block text-[10px] leading-4 text-muted-text">A rendszer bezárt oldal mellett is e-mailt küld a fiókod címére.</span></label>}</div>
        {active.event_type==="task"&&active.can_edit&&<label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-primary" checked={Boolean(active.is_completed)} onChange={e=>setActive({...active,is_completed:e.target.checked})}/> Feladat teljesítve</label>}
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted-text">Leírás</span><textarea disabled={!active.can_edit} rows={3} className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-3 outline-none focus:border-primary disabled:opacity-70" value={active.description||""} onChange={e=>setActive({...active,description:e.target.value})}/></label>
        {active.can_edit&&<div><span className="mb-2 block text-xs font-semibold text-muted-text">Szín</span><div className="flex gap-2">{COLORS.map(color=><button aria-label={`Szín ${color}`} type="button" key={color} onClick={()=>setActive({...active,color})} className={`h-8 w-8 rounded-full transition ${active.color===color?"ring-2 ring-primary ring-offset-2 ring-offset-surface":"hover:scale-110"}`} style={{backgroundColor:color}}/>)}</div></div>}
        {active.project_id&&<a href="/admin/projects" className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-3 text-sm font-semibold text-primary hover:border-primary/40"><FolderKanban size={17}/> Kapcsolt belső projekt megnyitása</a>}
        {active.portfolio_id&&<a href="/admin/portfolio" className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-3 text-sm font-semibold text-primary hover:border-primary/40"><Images size={17}/> Kapcsolt portfóliógaléria megnyitása</a>}
      </div>
      <div className="flex items-center justify-between border-t border-border bg-background/50 px-5 py-4"><div>{active.id&&active.can_edit&&<button type="button" onClick={remove} disabled={saving} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10"><Trash2 size={16}/> Törlés</button>}</div><div className="flex gap-2"><button type="button" onClick={()=>setActive(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">{active.can_edit?"Mégse":"Bezárás"}</button>{active.can_edit&&<button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?"Mentés…":active.id?"Mentés":"Létrehozás"}</button>}</div></div>
    </form></div>}
  </div>;
}
