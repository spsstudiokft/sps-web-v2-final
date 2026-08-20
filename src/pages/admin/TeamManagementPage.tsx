import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { EmailTemplateEditorModal } from "../../components/admin/EmailTemplateEditorModal";
import { EmailTemplate } from "../../lib/types";
import { 
  Users, 
  UserPlus, 
  Mail, 
  ShieldCheck, 
  Sparkles, 
  Eye, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  Send, 
  RefreshCw, 
  Trash2, 
  Search, 
  Filter, 
  MoreVertical, 
  Building2, 
  Phone, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  MessageSquare,
  FileText,
  Shield,
  Edit2,
  Calendar
  ,Lock
} from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "editor" | "viewer";
  workspace?: string;
  custom_message?: string;
  token: string;
  inviter_id?: string;
  inviter_email?: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  used_at?: string;
  revoked_at?: string;
  created_at: string;
  updated_at?: string;
  accept_link?: string;
  is_expired?: boolean;
}

interface TeamMember {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: "superadmin" | "admin" | "editor" | "viewer";
  workspace?: string;
  team_id?: string | null;
  team_name?: string | null;
  is_active: number | boolean;
  last_login_at?: string;
  created_at: string;
  updated_at?: string;
}

interface Team { id: string; name: string; description?: string; color?: string; is_active: number; member_count: number; }

export default function TeamManagementPage() {
  usePageTitle("Team & Invitations | Admin Studio");
  const { user: currentUser, token } = useAuth();
  const { currentLang } = useLanguage();

  const authHeaders: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const [activeTab, setActiveTab] = useState<"invitations" | "members" | "template">("invitations");

  // Invitations State
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteStatusFilter, setInviteStatusFilter] = useState("all");
  const [inviteRoleFilter, setInviteRoleFilter] = useState("all");

  // Team Members State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("all");

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [actionSuccessData, setActionSuccessData] = useState<{
    email: string;
    accept_link: string;
    role: string;
    dispatched: boolean;
  } | null>(null);

  // New Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [inviteWorkspace, setInviteWorkspace] = useState("Main Studio");
  const [inviteTeamId, setInviteTeamId] = useState("team-main-studio");
  const [inviteCustomMessage, setInviteCustomMessage] = useState("");
  const [inviteSendEmail, setInviteSendEmail] = useState(true);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [accountCreationMode, setAccountCreationMode] = useState<"invite" | "password">("invite");
  const [directPassword, setDirectPassword] = useState("");
  const [directPasswordConfirm, setDirectPasswordConfirm] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [sendingVerificationCode, setSendingVerificationCode] = useState(false);

  // Edit Member Form State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<"superadmin" | "admin" | "editor" | "viewer">("editor");
  const [editWorkspace, setEditWorkspace] = useState("Main Studio");
  const [editTeamId, setEditTeamId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Copy Feedback Tracking
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Template simulator preview state
  const [previewRole, setPreviewRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [previewCustomMsg, setPreviewCustomMsg] = useState(true);
  const [invitationTemplate, setInvitationTemplate] = useState<EmailTemplate | null>(null);
  const [templatePreview, setTemplatePreview] = useState({ subject: "", html: "" });
  const [templateLoading, setTemplateLoading] = useState(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [templateRevision, setTemplateRevision] = useState(0);

  useEffect(() => {
    if (activeTab !== "template") return;
    let active = true;
    const loadTemplate = async () => {
      setTemplateLoading(true);
      try {
        const response = await fetch("/api/admin/email/templates/admin_invitation", { headers: authHeaders });
        const template = await response.json();
        if (!response.ok) throw new Error(template.error || "Failed to load invitation template");
        const roleDescription = previewRole === "admin"
          ? "Full access to studio portfolio, deliverables, team management, pricing packages, and system settings."
          : previewRole === "viewer"
            ? "Read-only view access across studio dashboards, visual media, schedules, and analytics."
            : "Access to manage photo galleries, project milestones, services, FAQs, and client submissions.";
        const sampleData = { ...template.sample_data, role: previewRole, role_description: roleDescription, custom_message: previewCustomMsg ? template.sample_data?.custom_message : "" };
        const previewResponse = await fetch("/api/admin/email/templates/preview", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ templateKey: "admin_invitation", subject: template.subject, bodyHtml: template.body_html, bodyText: template.body_text, sampleData }) });
        const preview = await previewResponse.json();
        if (active) { setInvitationTemplate(template); setTemplatePreview({ subject: preview.subject || template.subject, html: preview.html || "" }); }
      } catch (error) { console.error("Admin invitation template preview failed:", error); }
      finally { if (active) setTemplateLoading(false); }
    };
    void loadTemplate();
    return () => { active = false; };
  }, [activeTab, previewRole, previewCustomMsg, templateRevision]);

  // Fetch Invitations
  const fetchInvitations = async () => {
    try {
      setLoadingInvites(true);
      const params = new URLSearchParams();
      if (inviteStatusFilter !== "all") params.set("status", inviteStatusFilter);
      if (inviteRoleFilter !== "all") params.set("role", inviteRoleFilter);
      if (inviteSearch.trim()) params.set("search", inviteSearch.trim());

      const res = await fetch(`/api/admin/invitations?${params.toString()}`, {
        headers: authHeaders
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to load invitations");
      setInvitations(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load invitations:", e);
    } finally {
      setLoadingInvites(false);
    }
  };

  // Fetch Team Members
  const fetchTeamMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await fetch("/api/admin/team", {
        headers: authHeaders
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to load team members");
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load team members:", e);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/admin/teams", { headers: authHeaders });
      if (res.ok) setTeams(await res.json());
    } catch (error) { console.error("Failed to load teams:", error); }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    try {
      const res = await fetch("/api/admin/teams", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ name: newTeamName.trim() }) });
      const data = await res.json();
      if (!res.ok) return alert(data.error || "Failed to create team");
      setNewTeamName("");
      await fetchTeams();
    } finally { setCreatingTeam(false); }
  };

  const handleDeleteTeam = async (team: Team) => {
    if (Number(team.member_count) > 0) return alert("Move all members out of this team before deleting it.");
    if (!window.confirm(`Delete the ${team.name} team?`)) return;
    const response = await fetch(`/api/admin/teams/${team.id}`, { method: "DELETE", headers: authHeaders });
    const data = await response.json();
    if (!response.ok) return alert(data.error || "Failed to delete team");
    await fetchTeams();
  };

  useEffect(() => {
    fetchInvitations();
  }, [inviteStatusFilter, inviteRoleFilter]);

  useEffect(() => {
    fetchTeamMembers();
    fetchTeams();
  }, []);

  // Handle Search Debounce for Invitations
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvitations();
    }, 300);
    return () => clearTimeout(timer);
  }, [inviteSearch]);

  // Create Invitation Submit
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");

    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      setInviteError("Please provide a valid email address.");
      return;
    }
    if (accountCreationMode === "password" && directPassword !== directPasswordConfirm) { setInviteError("The passwords do not match."); return; }
    if (accountCreationMode === "password" && !/^\d{6}$/.test(verificationCode)) { setInviteError("Enter the six-digit code sent to the account email address."); return; }

    setSubmittingInvite(true);

    try {
      const res = await fetch(accountCreationMode === "password" ? "/api/admin/team" : "/api/admin/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          role: inviteRole,
          workspace: inviteWorkspace.trim() || "Main Studio",
          team_id: inviteTeamId || null,
          custom_message: inviteCustomMessage.trim(),
          send_email: inviteSendEmail,
          password: accountCreationMode === "password" ? directPassword : undefined,
          verification_code: accountCreationMode === "password" ? verificationCode : undefined
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setInviteError(data?.error || "Failed to create invitation.");
      } else {
        // Success
        if (accountCreationMode === "invite") setActionSuccessData({ email: data.invitation.email, accept_link: data.invitation.accept_link, role: data.invitation.role, dispatched: inviteSendEmail && data.emailResult?.success });
        setIsInviteModalOpen(false);
        // Reset form
        setInviteEmail("");
        setInviteName("");
        setInviteCustomMessage("");
        setInviteWorkspace("Main Studio");
        setInviteTeamId("team-main-studio");
        setInviteRole("editor");
        setDirectPassword(""); setDirectPasswordConfirm(""); setVerificationCode(""); setVerificationCodeSent(false);
        fetchInvitations();
        fetchTeamMembers();
      }
    } catch (e: any) {
      setInviteError("Network error while creating invitation.");
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleSendVerificationCode = async () => {
    setInviteError("");
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) { setInviteError("Enter the account email address before requesting a code."); return; }
    setSendingVerificationCode(true);
    try {
      const res = await fetch("/api/admin/team/verification-code", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ email: inviteEmail.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send verification code.");
      setVerificationCodeSent(true);
      if (data.simulated) setInviteError("Email delivery is currently simulated. Configure Resend before using direct account creation.");
    } catch (error: any) { setInviteError(error.message || "Failed to send verification code."); }
    finally { setSendingVerificationCode(false); }
  };

  // Resend / Re-issue Invitation
  const handleResend = async (id: string, email: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/invitations/${id}/resend`, {
        method: "POST",
        headers: authHeaders
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccessData({
          email: email,
          accept_link: data.invitation.accept_link,
          role: data.invitation.role,
          dispatched: true
        });
        fetchInvitations();
      } else {
        alert(data.error || "Failed to resend invitation.");
      }
    } catch {
      alert("Network error while re-issuing invitation.");
    } finally {
      setProcessingId(null);
    }
  };

  // Revoke Invitation
  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this invitation? The token link will immediately stop working.")) {
      return;
    }
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/invitations/${id}/revoke`, {
        method: "POST",
        headers: authHeaders
      });
      if (res.ok) {
        fetchInvitations();
      }
    } catch {
      alert("Failed to revoke invitation.");
    } finally {
      setProcessingId(null);
    }
  };

  // Delete Invitation Record
  const handleDeleteInvite = async (id: string) => {
    if (!confirm("Delete this invitation log record completely?")) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/invitations/${id}`, {
        method: "DELETE",
        headers: authHeaders
      });
      if (res.ok) {
        fetchInvitations();
      }
    } catch {
      alert("Failed to delete invitation.");
    } finally {
      setProcessingId(null);
    }
  };

  // Open Edit Member Modal
  const handleOpenEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setEditName(member.name || "");
    setEditPhone(member.phone || "");
    setEditRole(member.role);
    setEditWorkspace(member.workspace || "Main Studio");
    setEditTeamId(member.team_id || "");
    setEditIsActive(Boolean(member.is_active));
    setEditError("");
    setIsEditMemberModalOpen(true);
  };

  // Save Member Edit
  const handleSaveMemberEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    setSubmittingEdit(true);
    setEditError("");

    try {
      const res = await fetch(`/api/admin/team/${selectedMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          role: editRole,
          workspace: editWorkspace.trim(),
          team_id: editTeamId || null,
          is_active: editIsActive
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to update team member.");
      } else {
        setIsEditMemberModalOpen(false);
        fetchTeamMembers();
        fetchTeams();
      }
    } catch {
      setEditError("Network error while updating team member.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Delete Member
  const handleDeleteMember = async (id: string, nameOrEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${nameOrEmail} from the team? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: "DELETE",
        headers: authHeaders
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete team member.");
      } else {
        fetchTeamMembers();
      }
    } catch {
      alert("Failed to delete team member.");
    }
  };

  // Copy Link with Feedback
  const handleCopyLink = (id: string, link?: string) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedTokenId(id);
    setTimeout(() => {
      setCopiedTokenId(null);
    }, 2500);
  };

  // Computed Metrics
  const pendingCount = invitations.filter((i) => i.status === "pending").length;
  const acceptedCount = invitations.filter((i) => i.status === "accepted").length;
  const expiredCount = invitations.filter((i) => i.status === "expired" || i.is_expired).length;
  const totalTeamCount = teamMembers.length;

  const getRoleBadge = (role: string) => {
    const r = (role || "").toLowerCase().replace(/[_-]/g, "");
    if (r === "superadmin") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <Shield className="w-3 h-3" />
          Superadmin
        </span>
      );
    }
    if (r === "admin") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
          <ShieldCheck className="w-3 h-3" />
          Admin
        </span>
      );
    }
    if (r === "viewer") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
          <Eye className="w-3 h-3" />
          Viewer
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
        <Sparkles className="w-3 h-3" />
        Editor
      </span>
    );
  };

  const getStatusBadge = (status: string, isExpired?: boolean) => {
    if (status === "accepted") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Accepted
        </span>
      );
    }
    if (status === "revoked") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20">
          <XCircle className="w-3 h-3" />
          Revoked
        </span>
      );
    }
    if (status === "expired" || isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
          <Clock className="w-3 h-3" />
          Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 animate-pulse">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  const calculateDaysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 1) return "Expires in 1 day";
    return `Expires in ${days} days`;
  };

  // Filtered Members for Search
  const filteredMembers = teamMembers.filter((m) => {
    const matchesSearch =
      !memberSearch.trim() ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.name && m.name.toLowerCase().includes(memberSearch.toLowerCase())) ||
      (m.workspace && m.workspace.toLowerCase().includes(memberSearch.toLowerCase()));

    const matchesRole = memberRoleFilter === "all" || m.role === memberRoleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="w-7 h-7 text-primary" />
            Team & Admin Invitations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Invite colleagues, assign workspace roles (Admin, Editor, Viewer), and manage account access with secure templated emails.
          </p>
        </div>

        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 shadow-md font-semibold shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Team Member</span>
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Team Members
              </p>
              <div className="text-2xl font-bold text-foreground mt-1">
                {totalTeamCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Active studio accounts
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pending Invites
              </p>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {pendingCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Awaiting acceptance
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Accepted Invites
              </p>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {acceptedCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Successfully activated
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Expired / Revoked
              </p>
              <div className="text-2xl font-bold text-zinc-600 dark:text-zinc-400 mt-1">
                {expiredCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Past 7-day TTL limit
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Success Card / Alert (When an invite was dispatched or resent) */}
      {actionSuccessData && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <div className="font-semibold text-sm">
                Invitation Generated for <strong>{actionSuccessData.email}</strong> ({actionSuccessData.role.toUpperCase()})
              </div>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                {actionSuccessData.dispatched
                  ? "A templated invitation email has been dispatched via Resend with an activation link."
                  : "Invitation link generated. You can manually copy and share it with the recipient below."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyLink("success-banner", actionSuccessData.accept_link)}
              className="bg-background text-foreground text-xs font-semibold h-8 w-full sm:w-auto"
            >
              {copiedTokenId === "success-banner" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                  Copied Link
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy Invitation Link
                </>
              )}
            </Button>
            <button
              onClick={() => setActionSuccessData(null)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("invitations")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "invitations"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Invitations</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-background/20 font-bold">
            {invitations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "members"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Team</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-background/20 font-bold">
            {teamMembers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("template")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "template"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Email Template Preview</span>
        </button>
      </div>

      {/* TAB 1: INVITATIONS LIST */}
      {activeTab === "invitations" && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by email, name, or workspace..."
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                className="pl-9 bg-background h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Status Filter */}
              <select
                value={inviteStatusFilter}
                onChange={(e) => setInviteStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </select>

              {/* Role Filter */}
              <select
                value={inviteRoleFilter}
                onChange={(e) => setInviteRoleFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrator</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchInvitations}
                disabled={loadingInvites}
                className="h-9 px-3 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingInvites ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Invitations Table / List */}
          <Card className="border-border bg-card overflow-hidden">
            {loadingInvites ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-xs text-muted-foreground">Loading invitations list...</p>
              </div>
            ) : invitations.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Mail className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                <div className="space-y-1">
                  <div className="font-semibold text-foreground text-sm">No invitations found</div>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {inviteSearch || inviteStatusFilter !== "all" || inviteRoleFilter !== "all"
                      ? "No invitations matched the selected filter criteria."
                      : "Click 'Invite Team Member' above to dispatch your first admin or team invitation."}
                  </p>
                </div>
                {!inviteSearch && inviteStatusFilter === "all" && (
                  <Button
                    size="sm"
                    onClick={() => setIsInviteModalOpen(true)}
                    className="mt-2 text-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Send First Invitation
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Workspace</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Expiration / Sent</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground">
                            {inv.name ? inv.name : inv.email.split("@")[0]}
                          </div>
                          <div className="text-muted-foreground text-[11px] font-mono">
                            {inv.email}
                          </div>
                          {inv.custom_message && (
                            <div className="mt-1 text-[11px] text-muted-foreground italic truncate max-w-xs flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 shrink-0" />
                              <span>"{inv.custom_message}"</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {getRoleBadge(inv.role)}
                        </td>

                        <td className="py-3.5 px-4 text-foreground font-medium">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Building2 className="w-3.5 h-3.5" />
                            {inv.workspace || "Main Studio"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {getStatusBadge(inv.status, inv.is_expired)}
                        </td>

                        <td className="py-3.5 px-4 space-y-0.5">
                          <div className="font-medium text-foreground">
                            {inv.status === "pending"
                              ? calculateDaysRemaining(inv.expires_at)
                              : inv.status === "accepted"
                              ? `Accepted on ${inv.used_at ? new Date(inv.used_at).toLocaleDateString() : "Active"}`
                              : `Sent ${new Date(inv.created_at).toLocaleDateString()}`}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Invited by {inv.inviter_email ? inv.inviter_email.split("@")[0] : "Admin"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {/* Copy Link Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              title="Copy single-use invitation link"
                              onClick={() => handleCopyLink(inv.id, inv.accept_link)}
                              className="h-8 px-2.5 text-xs"
                            >
                              {copiedTokenId === inv.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span className="ml-1 hidden md:inline">
                                {copiedTokenId === inv.id ? "Copied" : "Copy Link"}
                              </span>
                            </Button>

                            {/* Re-send / Re-issue */}
                            <Button
                              variant="outline"
                              size="sm"
                              title="Re-issue & email new invitation token"
                              disabled={processingId === inv.id}
                              onClick={() => handleResend(inv.id, inv.email)}
                              className="h-8 px-2.5 text-xs text-primary hover:text-primary"
                            >
                              <Send className={`w-3.5 h-3.5 ${processingId === inv.id ? "animate-spin" : ""}`} />
                              <span className="ml-1 hidden md:inline">Re-issue</span>
                            </Button>

                            {/* Revoke (if pending) */}
                            {inv.status === "pending" && !inv.is_expired && (
                              <Button
                                variant="outline"
                                size="sm"
                                title="Revoke invitation immediately"
                                disabled={processingId === inv.id}
                                onClick={() => handleRevoke(inv.id)}
                                className="h-8 px-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Delete record */}
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete record"
                              disabled={processingId === inv.id}
                              onClick={() => handleDeleteInvite(inv.id)}
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: ACTIVE TEAM MEMBERS */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1"><div className="text-sm font-bold text-foreground">Teams</div><div className="text-xs text-muted-foreground mt-0.5">Create reusable teams and assign members consistently.</div><div className="flex flex-wrap gap-2 mt-3">{teams.map((team) => <span key={team.id} className="pl-2.5 pr-1 py-1 rounded-full border border-border bg-muted/50 text-xs font-semibold inline-flex items-center gap-1.5">{team.name} · {team.member_count}{Number(team.member_count) === 0 && <button type="button" onClick={() => handleDeleteTeam(team)} className="p-0.5 rounded-full text-muted-foreground hover:text-red-500"><XCircle className="w-3.5 h-3.5" /></button>}</span>)}</div></div>
              <div className="flex gap-2 sm:w-80"><Input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="New team name" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleCreateTeam(); } }} /><Button onClick={handleCreateTeam} disabled={creatingTeam || !newTeamName.trim()}><UserPlus className="w-4 h-4" /></Button></div>
            </CardContent>
          </Card>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search team members by name or email..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9 bg-background h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={memberRoleFilter}
                onChange={(e) => setMemberRoleFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Roles</option>
                <option value="superadmin">Superadmins</option>
                <option value="admin">Administrators</option>
                <option value="editor">Editors</option>
                <option value="viewer">Viewers</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchTeamMembers}
                disabled={loadingMembers}
                className="h-9 px-3 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMembers ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <Card className="border-border bg-card overflow-hidden">
            {loadingMembers ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-xs text-muted-foreground">Loading active team members...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Users className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                <div className="font-semibold text-foreground text-sm">No team members match query</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Member Name</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Workspace</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                              {(member.name || member.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <span>{member.name || member.email.split("@")[0]}</span>
                                {currentUser?.id === member.id && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-primary/10 text-primary font-semibold">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-muted-foreground text-[11px] font-mono">
                                {member.email}
                              </div>
                              {member.phone && (
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  <span>{member.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {getRoleBadge(member.role)}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-foreground">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Building2 className="w-3.5 h-3.5" />
                            {member.workspace || "Main Studio"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {member.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400">
                              <XCircle className="w-3 h-3" />
                              Disabled
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 space-y-0.5 text-muted-foreground">
                          <div>
                            {member.last_login_at
                              ? new Date(member.last_login_at).toLocaleString()
                              : "No recorded login"}
                          </div>
                          <div className="text-[11px]">
                            Joined {new Date(member.created_at).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditMember(member)}
                              className="h-8 px-2.5 text-xs font-medium"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>

                            {currentUser?.id !== member.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMember(member.id, member.name || member.email)}
                                className="h-8 px-2 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: EMAIL TEMPLATE PREVIEW & INSPECTOR */}
      {activeTab === "template" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Simulator Controls */}
          <Card className="border-border bg-card lg:col-span-1 space-y-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Template Controls
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect how dynamic tokens interpolate into the official <strong>Admin Invitation</strong> transactional email.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Simulated Role</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["admin", "editor", "viewer"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPreviewRole(r)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold capitalize transition-all border ${
                        previewRole === r
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-semibold">Include Custom Inviter Message</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="simMsg"
                    checked={previewCustomMsg}
                    onChange={(e) => setPreviewCustomMsg(e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-border"
                  />
                  <label htmlFor="simMsg" className="text-xs text-foreground cursor-pointer">
                    Show personalized message note
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs space-y-2">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Included Template Tokens:
                </div>
                <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                  <li><code>{"{{recipient_name}}"}</code></li>
                  <li><code>{"{{inviter_name}}"}</code></li>
                  <li><code>{"{{role}}"}</code> & <code>{"{{role_description}}"}</code></li>
                  <li><code>{"{{workspace}}"}</code></li>
                  <li><code>{"{{custom_message}}"}</code></li>
                  <li><code>{"{{accept_link}}"}</code></li>
                  <li><code>{"{{expiration_days}}"}</code> (7 days TTL)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Rendered Email Visual Frame */}
          <Card className="border-border bg-card lg:col-span-2 overflow-hidden shadow-lg">
            <CardHeader className="bg-muted/40 border-b border-border py-3 px-4 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Subject Line
                </div>
                <div className="text-sm font-bold text-foreground">{templatePreview.subject || "Loading admin_invitation template…"}</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setIsTemplateEditorOpen(true)} disabled={!invitationTemplate}><Edit2 className="w-3.5 h-3.5 mr-1.5" />Edit admin_invitation</Button>
            </CardHeader>

            <CardContent className="p-3 bg-slate-100 dark:bg-zinc-950/60">
              {templateLoading ? <div className="h-[620px] flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" />Rendering saved template…</div> : <iframe title="Admin invitation email template preview" srcDoc={templatePreview.html} className="w-full h-[620px] rounded-xl border border-border bg-white" sandbox="allow-same-origin" />}
            </CardContent>
            <CardContent className="hidden p-6 bg-slate-50 dark:bg-zinc-950/60 font-sans">
              <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl text-slate-800 dark:text-zinc-100 space-y-5">
                {/* Header */}
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                    SPS
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">SPS Studio</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400">Team Onboarding Invitation</div>
                  </div>
                </div>

                {/* Greeting */}
                <p className="text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
                  Hello <strong>Sarah Jenkins</strong>,
                </p>

                <p className="text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
                  <strong>Alexander Sterling</strong> has invited you to join the <strong>SPS Studio</strong> management portal as <strong className="text-sky-600 uppercase font-bold">{previewRole}</strong>.
                </p>

                {previewCustomMsg && (
                  <div className="bg-sky-50 dark:bg-sky-950/30 border-l-4 border-sky-500 p-3 rounded-r text-xs text-slate-700 dark:text-zinc-300 italic">
                    <div className="text-[10px] font-bold uppercase text-sky-800 dark:text-sky-400 not-italic mb-1">
                      Message from Alexander Sterling:
                    </div>
                    "Welcome to the SPS production crew! Excited to have you on board to manage our media galleries."
                  </div>
                )}

                {/* Role and Permissions Box */}
                <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 rounded-xl p-4 space-y-2 text-xs">
                  <div className="font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-zinc-400">
                    Assigned Role & Access:
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-600 dark:text-zinc-400">Role:</span>
                    <span className="px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
                      {previewRole}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-600 dark:text-zinc-400">Workspace:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">Main Studio</span>
                  </div>
                  <div className="pt-1 text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                    <strong>Permissions:</strong>{" "}
                    {previewRole === "admin"
                      ? "Full access to studio portfolio, deliverables, team management, pricing packages, and system settings."
                      : previewRole === "viewer"
                      ? "Read-only view access across studio dashboards, visual media, schedules, and analytics."
                      : "Access to manage photo galleries, project milestones, services, FAQs, and client submissions."}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="text-center py-2">
                  <button
                    type="button"
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm py-3 px-6 rounded-xl shadow-lg hover:opacity-90 transition-opacity"
                  >
                    Accept Invitation & Set Up Account
                  </button>
                </div>

                {/* Expiration Note */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>Security Notice:</strong> This single-use invitation is secure and expires in <strong>7 days</strong>.
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 dark:text-zinc-500 text-center leading-relaxed">
                  SPS Studio · Premium Real Estate Visual Marketing · All rights reserved.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <EmailTemplateEditorModal template={invitationTemplate} isOpen={isTemplateEditorOpen} onClose={() => setIsTemplateEditorOpen(false)} onSaved={(updated) => { setInvitationTemplate(updated); setTemplateRevision((value) => value + 1); setIsTemplateEditorOpen(false); }} />

      {/* ========================================== */}
      {/* MODAL: INVITE TEAM MEMBER                  */}
      {/* ========================================== */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg border-border shadow-2xl bg-card">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Invite Team Member
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {accountCreationMode === "invite" ? "Generate a secure, single-use invitation token with designated role privileges." : "Create an active admin-panel account immediately with an email address and password."}
                </CardDescription>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </CardHeader>

            <form onSubmit={handleCreateInvite}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/50 border border-border p-1 text-xs"><button type="button" onClick={()=>{setAccountCreationMode("invite");setInviteError("");}} className={`rounded-lg px-3 py-2 ${accountCreationMode === "invite" ? "bg-background shadow-sm font-semibold" : "text-muted-foreground"}`}><Send className="inline w-3.5 h-3.5 mr-1.5"/>Invitation</button><button type="button" onClick={()=>{setAccountCreationMode("password");setInviteError("");}} className={`rounded-lg px-3 py-2 ${accountCreationMode === "password" ? "bg-background shadow-sm font-semibold" : "text-muted-foreground"}`}><Lock className="inline w-3.5 h-3.5 mr-1.5"/>Direct password</button></div>
                {inviteError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                {/* Email Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="inviteEmail" className="text-xs font-semibold">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="inviteEmail"
                      type="email"
                      placeholder="e.g. colleague@spsstudio.hu"
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setVerificationCodeSent(false); setVerificationCode(""); }}
                      required
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="inviteName" className="text-xs font-semibold">
                    Recipient Name <span className="text-muted-foreground text-[11px] font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="inviteName"
                    type="text"
                    placeholder="e.g. Sarah Jenkins"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>

                {/* Role Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Assigned Role</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setInviteRole("admin")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        inviteRole === "admin"
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Admin
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                        Full studio settings & team control
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInviteRole("editor")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        inviteRole === "editor"
                          ? "border-sky-500 bg-sky-500/10 text-sky-900 dark:text-sky-200 ring-2 ring-sky-500/20"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        Editor
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                        Manage portfolio, projects & FAQs
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInviteRole("viewer")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        inviteRole === "viewer"
                          ? "border-slate-500 bg-slate-500/10 text-slate-900 dark:text-slate-200 ring-2 ring-slate-500/20"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        Viewer
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                        Read-only dashboards & media
                      </div>
                    </button>
                  </div>
                </div>

                {/* Workspace / Team Assignment */}
                <div className="space-y-1.5">
                  <Label htmlFor="inviteWorkspace" className="text-xs font-semibold">
                    Workspace / Team Assignment
                  </Label>
                  <select id="inviteWorkspace" value={inviteTeamId} onChange={(e) => { const id = e.target.value; setInviteTeamId(id); setInviteWorkspace(teams.find((team) => team.id === id)?.name || "Main Studio"); }} className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground">
                    <option value="">No team</option>{teams.filter((team) => team.is_active).map((team) => <option key={team.id} value={team.id}>{team.name} ({team.member_count} members)</option>)}
                  </select>
                </div>

                {/* Custom Personal Note */}
                {accountCreationMode === "invite" && <div className="space-y-1.5">
                  <Label htmlFor="customMsg" className="text-xs font-semibold">
                    Personal Message <span className="text-muted-foreground text-[11px] font-normal">(Optional)</span>
                  </Label>
                  <textarea
                    id="customMsg"
                    rows={2}
                    placeholder="Add a personalized greeting note to be featured in their invitation email..."
                    value={inviteCustomMessage}
                    onChange={(e) => setInviteCustomMessage(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>}

                {accountCreationMode === "password" && <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label htmlFor="directPassword" className="text-xs font-semibold">Password *</Label><Input id="directPassword" type="password" required value={directPassword} onChange={e=>setDirectPassword(e.target.value)}/></div><div className="space-y-1.5"><Label htmlFor="directPasswordConfirm" className="text-xs font-semibold">Confirm password *</Label><Input id="directPasswordConfirm" type="password" required value={directPasswordConfirm} onChange={e=>setDirectPasswordConfirm(e.target.value)}/></div><p className="col-span-2 text-[11px] text-muted-foreground">At least 8 characters with uppercase, lowercase, number, and special character.</p></div>}

                {accountCreationMode === "password" && <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2"><Label htmlFor="directVerificationCode" className="text-xs font-semibold">Email verification code *</Label><div className="flex gap-2"><Input id="directVerificationCode" inputMode="numeric" maxLength={6} value={verificationCode} onChange={e=>setVerificationCode(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="000000" className="font-mono tracking-[0.3em] text-center"/><Button type="button" variant="secondary" size="sm" disabled={sendingVerificationCode || !inviteEmail.includes("@") || verificationCodeSent} onClick={handleSendVerificationCode}>{sendingVerificationCode ? <Loader2 className="w-4 h-4 animate-spin"/> : verificationCodeSent ? "Code sent" : "Send code"}</Button></div><p className="text-[11px] text-muted-foreground">The one-time code is sent to the new member and expires after 15 minutes. Ask them for the code before creating the account.</p></div>}

                {/* Checkbox: Dispatch Email */}
                {accountCreationMode === "invite" && <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="sendMailCheck"
                    checked={inviteSendEmail}
                    onChange={(e) => setInviteSendEmail(e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-border"
                  />
                  <label htmlFor="sendMailCheck" className="text-xs font-medium text-foreground cursor-pointer">
                    Automatically dispatch invitation email via Resend
                  </label>
                </div>}
              </CardContent>

              <div className="p-4 bg-muted/40 border-t border-border flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInviteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingInvite || (accountCreationMode === "password" && (!verificationCodeSent || verificationCode.length !== 6))}
                  size="sm"
                  className="font-semibold shadow-md"
                >
                  {submittingInvite ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      {accountCreationMode === "invite" ? "Creating Invitation..." : "Creating Account..."}
                    </>
                  ) : (
                    <>
                      {accountCreationMode === "invite" ? <Send className="w-3.5 h-3.5 mr-1.5" /> : <Lock className="w-3.5 h-3.5 mr-1.5" />}
                      {accountCreationMode === "invite" ? "Dispatch Invitation" : "Create Account"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: EDIT TEAM MEMBER                    */}
      {/* ========================================== */}
      {isEditMemberModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md border-border shadow-2xl bg-card">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-primary" />
                  Edit Team Member
                </CardTitle>
                <CardDescription className="text-xs font-mono text-muted-foreground mt-0.5">
                  {selectedMember.email}
                </CardDescription>
              </div>
              <button
                onClick={() => setIsEditMemberModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </CardHeader>

            <form onSubmit={handleSaveMemberEdit}>
              <CardContent className="space-y-4">
                {editError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Name</Label>
                  <Input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Marcus Vance"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Phone Number</Label>
                  <Input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+36 30 123 4567"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Role</Label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {selectedMember.role === "superadmin" && <option value="superadmin">Superadmin (System Owner)</option>}
                    <option value="admin">Administrator (Full Access)</option>
                    <option value="editor">Editor (Content & Project Manager)</option>
                    <option value="viewer">Viewer (Read-only View)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Workspace / Team</Label>
                  <select value={editTeamId} onChange={(e) => { const id = e.target.value; setEditTeamId(id); setEditWorkspace(teams.find((team) => team.id === id)?.name || ""); }} className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground">
                    <option value="">No team</option>{teams.filter((team) => team.is_active).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <div>
                    <div className="text-xs font-semibold text-foreground">Account Status</div>
                    <div className="text-[11px] text-muted-foreground">
                      {editIsActive ? "User can sign in and manage data" : "Account suspended / disabled"}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-border"
                  />
                </div>
              </CardContent>

              <div className="p-4 bg-muted/40 border-t border-border flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMemberModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingEdit}
                  size="sm"
                  className="font-semibold shadow-md"
                >
                  {submittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Saving Changes...
                    </>
                  ) : (
                    "Save Member Details"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
