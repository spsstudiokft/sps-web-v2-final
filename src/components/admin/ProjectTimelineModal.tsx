import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, CheckCircle2, Circle, Clock3, Mail, Megaphone, Plus, Send, Trash2, X } from "lucide-react";
import { Project } from "../../lib/types";
import { useApi } from "../../hooks/useApi";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";

type Milestone = { id: string; title: string; description: string; status: string; due_date?: string | null; client_notified_at?: string | null };
type ProjectUpdate = { id: string; title: string; message: string; status_label?: string; milestone_id?: string | null; sent_to_client: number; sent_at?: string | null; email_status?: string; created_at: string };

export function ProjectTimelineModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const { fetchApi } = useApi();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [milestoneForm, setMilestoneForm] = useState({ title: "", description: "", status: "pending", due_date: "", notify_client: false });
  const [updateForm, setUpdateForm] = useState({ title: "", message: "", status_label: "", milestone_id: "", notify_client: true });

  const load = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const response = await fetchApi(`/api/admin/projects/${project.id}/timeline`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load timeline");
      setMilestones(data.milestones || []);
      setUpdates(data.updates || []);
    } catch (error: any) { setFeedback(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (project) void load(); }, [project?.id]);
  if (!project) return null;

  const createMilestone = async () => {
    if (!milestoneForm.title.trim()) return;
    setSaving(true); setFeedback("");
    try {
      const response = await fetchApi(`/api/admin/projects/${project.id}/milestones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...milestoneForm, notify_client: Boolean(project.client_id) && milestoneForm.notify_client }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create milestone");
      setMilestoneForm({ title: "", description: "", status: "pending", due_date: "", notify_client: false });
      setFeedback(data.email?.success ? "Milestone created and emailed with the project_update template." : "Milestone created.");
      await load();
    } catch (error: any) { setFeedback(error.message); }
    finally { setSaving(false); }
  };

  const changeMilestoneStatus = async (milestone: Milestone, status: string) => {
    setSaving(true); setFeedback("");
    try {
      const response = await fetchApi(`/api/admin/projects/${project.id}/milestones/${milestone.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...milestone, status, notify_client: Boolean(project.client_id) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update milestone");
      setFeedback(project.client_id ? "Milestone updated and the client was notified using project_update." : "Milestone status updated.");
      await load();
    } catch (error: any) { setFeedback(error.message); }
    finally { setSaving(false); }
  };

  const publishUpdate = async () => {
    if (!updateForm.title.trim() || !updateForm.message.trim()) return;
    setSaving(true); setFeedback("");
    try {
      const response = await fetchApi(`/api/admin/projects/${project.id}/updates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...updateForm, notify_client: Boolean(project.client_id) && updateForm.notify_client }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to publish update");
      setUpdateForm({ title: "", message: "", status_label: "", milestone_id: "", notify_client: true });
      setFeedback(data.email?.success ? "Project update published and emailed with the project_update template." : "Project update saved without email delivery.");
      await load();
    } catch (error: any) { setFeedback(error.message); }
    finally { setSaving(false); }
  };

  const remove = async (kind: "milestones" | "updates", id: string) => {
    if (!window.confirm(`Delete this ${kind === "milestones" ? "milestone" : "project update"}?`)) return;
    const response = await fetchApi(`/api/admin/projects/${project.id}/${kind}/${id}`, { method: "DELETE" });
    if (response.ok) await load();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-label={`${project.name} timeline`}>
      <div className="aero-frost-modal max-w-6xl mx-auto rounded-3xl border border-border bg-background shadow-2xl overflow-hidden">
        <header className="sticky top-0 z-20 px-5 sm:px-7 py-4 border-b border-border bg-background/90 backdrop-blur-xl flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-bold text-text">Project timeline</h2><p className="text-sm text-muted-text">{project.name} · milestones and client updates</p></div>
          <button type="button" onClick={onClose} className="p-2.5 rounded-xl text-muted-text hover:text-text hover:bg-surface" aria-label="Close timeline"><X className="w-5 h-5" /></button>
        </header>
        <div className="p-4 sm:p-6 grid lg:grid-cols-2 gap-6">
          <section className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center gap-2 font-bold text-text"><CalendarDays className="w-4 h-4 text-primary" />New milestone</div>
              <Input placeholder="Milestone title" value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} />
              <textarea rows={3} placeholder="Description and client-facing details" className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-text text-sm" value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} />
              <div className="grid sm:grid-cols-2 gap-3"><select className="px-3 py-2.5 rounded-xl border border-border bg-background text-text text-sm" value={milestoneForm.status} onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value })}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select><Input type="datetime-local" value={milestoneForm.due_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-xs text-muted-text"><input type="checkbox" disabled={!project.client_id} checked={Boolean(project.client_id) && milestoneForm.notify_client} onChange={(e) => setMilestoneForm({ ...milestoneForm, notify_client: e.target.checked })} /> {project.client_id ? "Notify client with project_update email" : "Assign a client to enable email notification"}</label>
              <Button onClick={createMilestone} disabled={saving || !milestoneForm.title.trim()} className="w-full"><Plus className="w-4 h-4 mr-2" />Add milestone</Button>
            </div>
            <div className="space-y-2">
              {milestones.map((item) => <div key={item.id} className="rounded-2xl border border-border bg-surface p-4 flex gap-3"><div className="pt-1">{item.status === "completed" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : item.status === "in_progress" ? <Clock3 className="w-5 h-5 text-amber-500" /> : <Circle className="w-5 h-5 text-muted-text" />}</div><div className="flex-1 min-w-0"><div className="font-semibold text-text">{item.title}</div>{item.description && <p className="text-xs text-muted-text mt-1">{item.description}</p>}<div className="flex flex-wrap items-center gap-2 mt-3"><select value={item.status} disabled={saving} onChange={(e) => changeMilestoneStatus(item, e.target.value)} className="text-xs px-2 py-1.5 rounded-lg bg-background border border-border text-text"><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select>{item.client_notified_at && <span className="text-[11px] text-primary flex items-center gap-1"><Mail className="w-3 h-3" />Client notified</span>}</div></div><button type="button" onClick={() => remove("milestones", item.id)} className="p-2 text-muted-text hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>)}
              {!loading && milestones.length === 0 && <p className="text-sm text-muted-text text-center py-8">No milestones yet.</p>}
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center gap-2 font-bold text-text"><Megaphone className="w-4 h-4 text-primary" />Publish project update</div>
              <Input placeholder="Update title" value={updateForm.title} onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })} />
              <div className="grid sm:grid-cols-2 gap-3"><Input placeholder="Status label (e.g. Editing started)" value={updateForm.status_label} onChange={(e) => setUpdateForm({ ...updateForm, status_label: e.target.value })} /><select className="px-3 py-2.5 rounded-xl border border-border bg-background text-text text-sm" value={updateForm.milestone_id} onChange={(e) => setUpdateForm({ ...updateForm, milestone_id: e.target.value })}><option value="">No linked milestone</option>{milestones.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
              <textarea rows={5} placeholder="Client-facing project update" className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-text text-sm" value={updateForm.message} onChange={(e) => setUpdateForm({ ...updateForm, message: e.target.value })} />
              <label className="flex items-center gap-2 text-xs text-muted-text"><input type="checkbox" disabled={!project.client_id} checked={Boolean(project.client_id) && updateForm.notify_client} onChange={(e) => setUpdateForm({ ...updateForm, notify_client: e.target.checked })} /> {project.client_id ? "Send with editable project_update email template" : "Assign a client to enable email delivery"}</label>
              <Button onClick={publishUpdate} disabled={saving || !updateForm.title.trim() || !updateForm.message.trim()} className="w-full"><Send className="w-4 h-4 mr-2" />Publish update</Button>
            </div>
            <div className="space-y-2">
              {updates.map((item) => <article key={item.id} className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-start gap-3"><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-text">{item.title}</h3>{item.status_label && <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary">{item.status_label}</span>}</div><p className="text-sm text-muted-text mt-2 whitespace-pre-wrap">{item.message}</p><div className="text-[11px] text-muted-text mt-3 flex items-center gap-2"><span>{new Date(item.created_at).toLocaleString()}</span>{Boolean(item.sent_to_client) && <span className="text-emerald-500 flex items-center gap-1"><Mail className="w-3 h-3" />Email sent</span>}</div></div><button type="button" onClick={() => remove("updates", item.id)} className="p-2 text-muted-text hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div></article>)}
              {!loading && updates.length === 0 && <p className="text-sm text-muted-text text-center py-8">No project updates yet.</p>}
            </div>
          </section>
        </div>
        {feedback && <div className="sticky bottom-0 px-5 py-3 border-t border-primary/20 bg-background/95 backdrop-blur-xl text-sm text-text">{feedback}</div>}
      </div>
    </div>,
    document.body
  );
}
