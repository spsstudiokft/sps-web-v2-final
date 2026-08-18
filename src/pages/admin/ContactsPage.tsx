import { useState, useEffect, useMemo } from "react";
import { ContactSubmission, CRMRecord } from "../../lib/types";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { cn } from "../../lib/utils";
import { AdminListSkeleton } from "../../components/admin/AdminSkeleton";
import { CustomerModal } from "../../components/admin/CustomerModal";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { 
  Search, 
  Trash2, 
  Mail, 
  Eye, 
  Phone, 
  MapPin, 
  Archive, 
  ArchiveRestore, 
  Inbox, 
  Lock, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  User, 
  Calendar,
  AlertCircle,
  Sparkles,
  Info,
  Filter,
  Check,
  UserPlus,
  UserCheck,
  Globe,
  ExternalLink,
  Edit2,
  Tag,
  X
} from "lucide-react";

type TabType = "active" | "archived" | "all";

export default function ContactsPage() {
  const { currentLanguage, tUi } = useLanguage();
  usePageTitle(tUi("admin.submissions.title", currentLanguage));
  const { fetchApi } = useApi();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewContact, setViewContact] = useState<ContactSubmission | null>(null);

  // Customer creation and details modal state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerModalData, setCustomerModalData] = useState<Partial<CRMRecord> | null>(null);
  const [linkedContactId, setLinkedContactId] = useState<string | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<CRMRecord | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/api/admin/contacts");
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const data = await res.json();
      setContacts(data);
      
      // If we are currently viewing a contact, update its state from fresh list
      if (viewContact) {
        const updatedView = data.find((c: ContactSubmission) => c.id === viewContact.id);
        if (updatedView) {
          setViewContact(updatedView);
        }
      }
    } catch (err: any) {
      console.error(err);
      setFeedbackMessage({ type: "error", text: err.message || "Failed to load messages" });
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: "success" | "error", text: string) => {
    setFeedbackMessage({ type, text });
  };

  const handleOpenCreateCustomer = (contact: ContactSubmission) => {
    if (!isAdmin) {
      showNotification("error", "Only administrators can create customer records");
      return;
    }
    // Prefill customer form fields using data from the message sender:
    // Full name, Email, Phone, Address/Contact details
    // STRICT: Do not include the message body or subject in any customer field.
    setCustomerModalData({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      property_address: contact.property_address || '',
      source: 'Website Contact Form',
      status: 'active',
      notes: '', // message subject/body are strictly excluded
      owner_id: user?.email || '',
    });
    setLinkedContactId(contact.id);
    setIsCustomerModalOpen(true);
  };

  const handleCustomerSaved = async (newCustomer: CRMRecord) => {
    showNotification("success", tUi("admin.submissions.customer_created_and_linked", currentLanguage) || "Customer created and linked to this message.");
    await fetchContacts();
  };

  const handleOpenExistingCustomer = (customer: CRMRecord) => {
    setViewingCustomer(customer);
  };

  const updateContact = async (id: string, updates: Partial<ContactSubmission>) => {
    try {
      setActionLoading(true);
      const res = await fetchApi(`/api/admin/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update submission");
      }

      await fetchContacts();
      showNotification("success", "Message updated successfully");
    } catch (e: any) {
      console.error(e);
      showNotification("error", e.message || "Failed to update submission");
    } finally {
      setActionLoading(false);
    }
  };

  const archiveContact = async (id: string) => {
    if (!isAdmin) {
      showNotification("error", "Only administrators can archive messages");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetchApi(`/api/admin/contacts/${id}/archive`, {
        method: "PUT",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to archive message");
      }

      const data = await res.json();
      setContacts(prev => prev.map(c => c.id === id ? { ...c, is_archived: 1, archived_at: data.archived_at, archived_by: data.archived_by } : c));
      
      if (viewContact?.id === id) {
        setViewContact(prev => prev ? { ...prev, is_archived: 1, archived_at: data.archived_at, archived_by: data.archived_by } : null);
      }

      showNotification("success", "Message archived. It is now read-only in the archive.");
    } catch (e: any) {
      console.error(e);
      showNotification("error", e.message || "Failed to archive message");
    } finally {
      setActionLoading(false);
    }
  };

  const unarchiveContact = async (id: string) => {
    if (!isAdmin) {
      showNotification("error", "Only administrators can restore archived messages");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetchApi(`/api/admin/contacts/${id}/unarchive`, {
        method: "PUT",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to restore message");
      }

      const data = await res.json();
      setContacts(prev => prev.map(c => c.id === id ? { ...c, is_archived: 0, unarchived_at: data.unarchived_at, unarchived_by: data.unarchived_by } : c));
      
      if (viewContact?.id === id) {
        setViewContact(prev => prev ? { ...prev, is_archived: 0, unarchived_at: data.unarchived_at, unarchived_by: data.unarchived_by } : null);
      }

      showNotification("success", "Message restored to active inbox.");
    } catch (e: any) {
      console.error(e);
      showNotification("error", e.message || "Failed to restore message");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm(tUi("admin.submissions.confirm_delete", currentLanguage))) return;
    try {
      setActionLoading(true);
      const res = await fetchApi(`/api/admin/contacts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete contact");
      
      if (viewContact?.id === id) setViewContact(null);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await fetchContacts();
      showNotification("success", "Message deleted");
    } catch (e: any) {
      console.error(e);
      showNotification("error", e.message || "Failed to delete contact");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (!confirm(tUi("admin.submissions.confirm_bulk_archive", currentLanguage, { count: ids.length }))) return;

    try {
      setActionLoading(true);
      const res = await fetchApi("/api/admin/contacts/bulk-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to bulk archive");
      }

      setSelectedIds(new Set());
      await fetchContacts();
      showNotification("success", `${ids.length} message(s) archived successfully.`);
    } catch (e: any) {
      console.error(e);
      showNotification("error", e.message || "Failed to bulk archive");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (!confirm(tUi("admin.submissions.confirm_bulk_unarchive", currentLanguage, { count: ids.length }))) return;

    try {
      setActionLoading(true);
      const res = await fetchApi("/api/admin/contacts/bulk-unarchive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to bulk restore");
      }

      setSelectedIds(new Set());
      await fetchContacts();
      showNotification("success", `${ids.length} message(s) restored to active inbox.`);
    } catch (e: any) {
      console.error(e);
      showNotification("error", e.message || "Failed to bulk restore");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkUpdate = async (updates: Partial<ContactSubmission>) => {
    if (selectedIds.size === 0) return;
    try {
      setActionLoading(true);
      const res = await fetchApi(`/api/admin/contacts/bulk-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), updates }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update selected messages");
      }

      setSelectedIds(new Set());
      await fetchContacts();
      showNotification("success", "Selected messages updated");
    } catch (e: any) {
      console.error(e);
      showNotification("error", e.message || "Failed to update messages");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(tUi("admin.submissions.confirm_bulk_delete", currentLanguage, { count: selectedIds.size }))) return;
    try {
      setActionLoading(true);
      const res = await fetchApi(`/api/admin/contacts/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Failed to delete selected contacts");
      setSelectedIds(new Set());
      await fetchContacts();
      showNotification("success", "Selected messages deleted");
    } catch (e: any) {
      console.error(e);
      showNotification("error", e.message || "Failed to delete messages");
    } finally {
      setActionLoading(false);
    }
  };

  // Compute counts
  const activeCount = useMemo(() => contacts.filter(c => !c.is_archived).length, [contacts]);
  const unreadActiveCount = useMemo(() => contacts.filter(c => !c.is_archived && !c.is_read).length, [contacts]);
  const archivedCount = useMemo(() => contacts.filter(c => !!c.is_archived).length, [contacts]);
  const allCount = contacts.length;

  // Filter contacts based on activeTab, search, statusFilter
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      // 1. Tab filter
      const isArchived = Boolean(c.is_archived);
      if (activeTab === "active" && isArchived) return false;
      if (activeTab === "archived" && !isArchived) return false;

      // 2. Status filter
      if (statusFilter !== "all" && c.status !== statusFilter) return false;

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q);
        const matchSubject = c.subject?.toLowerCase().includes(q);
        const matchAddress = c.property_address?.toLowerCase().includes(q);
        const matchMsg = c.message?.toLowerCase().includes(q);
        const matchNotes = c.notes?.toLowerCase().includes(q);

        if (!matchName && !matchEmail && !matchPhone && !matchSubject && !matchAddress && !matchMsg && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [contacts, activeTab, statusFilter, search]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length && filteredContacts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return tUi("admin.submissions.filter_new", currentLanguage);
      case 'in_progress': return tUi("admin.submissions.filter_in_progress", currentLanguage);
      case 'resolved': return tUi("admin.submissions.filter_resolved", currentLanguage);
      default: return (status || 'new').replace('_', ' ').toUpperCase();
    }
  };

  if (loading && contacts.length === 0) {
    return <AdminListSkeleton title={tUi("admin.submissions.title", currentLanguage)} />;
  }

  // ==================== DETAIL VIEW ====================
  if (viewContact) {
    const isArchived = Boolean(viewContact.is_archived);

    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        {/* Toast / Feedback */}
        {feedbackMessage && (
          <div className={cn(
            "p-3.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border",
            feedbackMessage.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          )}>
            {feedbackMessage.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Header navigation & top actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setViewContact(null)}
              className="flex items-center gap-1.5"
            >
              &larr; {tUi("admin.submissions.back_to_list", currentLanguage)}
            </Button>
            <h2 className="text-2xl font-bold text-text">
              {tUi("admin.submissions.details_title", currentLanguage)}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Button
                variant="primary"
                onClick={() => handleOpenCreateCustomer(viewContact)}
                className="flex items-center gap-2"
                title={tUi("admin.submissions.create_customer", currentLanguage)}
              >
                <UserPlus size={16} />
                <span>{tUi("admin.submissions.create_customer", currentLanguage)}</span>
              </Button>
            )}

            {isArchived ? (
              <Button
                variant="secondary"
                onClick={() => unarchiveContact(viewContact.id)}
                disabled={actionLoading}
                className="flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/10"
              >
                <ArchiveRestore size={16} />
                <span>{tUi("admin.submissions.unarchive_btn", currentLanguage)}</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => archiveContact(viewContact.id)}
                disabled={actionLoading}
                className="flex items-center gap-2"
              >
                <Archive size={16} />
                <span>{tUi("admin.submissions.archive_btn", currentLanguage)}</span>
              </Button>
            )}

            <Button 
              variant="danger" 
              onClick={() => deleteContact(viewContact.id)}
              disabled={actionLoading}
              className="flex items-center gap-1.5"
            >
              <Trash2 size={16} />
              <span>{tUi("admin.submissions.delete", currentLanguage)}</span>
            </Button>
          </div>
        </div>

        {/* ARCHIVED BANNER (if archived) */}
        {isArchived && (
          <div className="bg-amber-500/10 border border-amber-500/30 dark:bg-amber-950/30 dark:border-amber-700/50 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg shrink-0 mt-0.5">
                <Lock size={20} />
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-text flex items-center gap-2">
                  <span>{tUi("admin.submissions.archived_banner_title", currentLanguage)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-medium">
                    {tUi("admin.submissions.archived_badge", currentLanguage)}
                  </span>
                </div>
                <p className="text-sm text-muted-text leading-relaxed">
                  {tUi("admin.submissions.archived_banner_desc", currentLanguage)}
                </p>
                {viewContact.archived_at && (
                  <p className="text-xs text-muted-text/90 flex items-center gap-1.5 pt-0.5">
                    <Clock size={12} className="text-primary" />
                    <span>
                      {tUi("admin.submissions.archived_by_on", currentLanguage, {
                        user: viewContact.archived_by || "Admin",
                        date: new Date(viewContact.archived_at).toLocaleString()
                      })}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => unarchiveContact(viewContact.id)}
              disabled={actionLoading}
              className="shrink-0 self-start sm:self-center flex items-center gap-1.5"
            >
              <ArchiveRestore size={16} />
              <span>{tUi("admin.submissions.unarchive", currentLanguage)}</span>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Inquiry Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-text">{viewContact.name}</h3>
                      {isArchived && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <Archive size={12} />
                          {tUi("admin.submissions.archived_badge", currentLanguage)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center text-sm gap-y-2 gap-x-4 text-muted-text">
                      <div className="flex items-center gap-1.5">
                        <Mail size={15} className="text-primary shrink-0" />
                        <a href={`mailto:${viewContact.email}`} className="hover:underline text-text font-medium">{viewContact.email}</a>
                      </div>
                      {viewContact.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={15} className="text-primary shrink-0" />
                          <a href={`tel:${viewContact.phone.replace(/\s+/g, '')}`} className="hover:underline text-text">{viewContact.phone}</a>
                        </div>
                      )}
                    </div>

                    {viewContact.subject && (
                      <div className="text-xs inline-flex items-center gap-1 text-primary font-medium bg-primary/10 px-2.5 py-1 rounded-md">
                        <Sparkles size={12} />
                        <span>{tUi("admin.submissions.subject", currentLanguage) || "Service"}: {viewContact.subject}</span>
                      </div>
                    )}

                    {viewContact.plan_name && (
                      <div className="flex items-center gap-1.5 text-xs bg-violet-500/10 text-violet-800 dark:text-violet-300 px-3 py-1.5 rounded-lg border border-violet-500/20 w-fit font-medium">
                        <Tag size={14} className="text-violet-600 dark:text-violet-400 shrink-0" />
                        <span className="font-semibold">{tUi("admin.submissions.selected_plan", currentLanguage) || "Pricing Plan"}:</span>
                        <span>{viewContact.plan_name}</span>
                      </div>
                    )}

                    {viewContact.property_address && (
                      <div className="flex items-center gap-1.5 text-xs bg-surface px-3 py-1.5 rounded-lg border border-border text-text w-fit">
                        <MapPin size={14} className="text-primary shrink-0" />
                        <span className="font-medium">{tUi("admin.submissions.property_address", currentLanguage) || "Property"}:</span>
                        <span>{viewContact.property_address}</span>
                      </div>
                    )}

                    {viewContact.availability_start && viewContact.availability_end && (
                      <div className="flex items-center gap-1.5 text-xs bg-sky-500/10 text-sky-800 dark:text-sky-300 px-3 py-1.5 rounded-lg border border-sky-500/20 w-fit">
                        <Clock size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
                        <span className="font-semibold">{tUi("admin.submissions.availability_window", currentLanguage) || "Preferred Contact Window"}:</span>
                        <span>
                          {new Date(viewContact.availability_start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} – {new Date(viewContact.availability_end).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                    )}

                    {viewContact.customer_id ? (
                      <div className="flex items-center gap-2 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg w-fit">
                        <UserCheck size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-semibold">{tUi("admin.submissions.linked_customer_badge", currentLanguage)}</span>
                      </div>
                    ) : isAdmin ? (
                      <div className="pt-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenCreateCustomer(viewContact)}
                          className="h-7 text-xs px-2.5 flex items-center gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                        >
                          <UserPlus size={13} />
                          <span>{tUi("admin.submissions.create_customer", currentLanguage)}</span>
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="sm:text-right space-y-2">
                    <p className="text-xs text-muted-text flex items-center sm:justify-end gap-1">
                      <Calendar size={13} className="text-muted-text" />
                      <span>{new Date(viewContact.created_at).toLocaleString()}</span>
                    </p>
                    <div className="flex sm:justify-end items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                        viewContact.status === 'new' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        viewContact.status === 'in_progress' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      )}>
                        {getStatusLabel(viewContact.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Body */}
                <div className="bg-surface p-5 rounded-xl border border-border space-y-3">
                  <div className="text-xs uppercase tracking-wider text-muted-text font-bold flex items-center justify-between">
                    <span>{tUi("admin.submissions.message_content", currentLanguage)}</span>
                    <span className="text-[11px] font-normal text-muted-text/80 lowercase">
                      {viewContact.message.length} characters
                    </span>
                  </div>
                  <p className="text-text whitespace-pre-wrap text-sm leading-relaxed font-sans">
                    {viewContact.message}
                  </p>
                </div>

                {/* Client Reply & Auto-Unarchive Notice */}
                <div className="p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-lg flex items-start gap-2.5 text-xs text-muted-text">
                  <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <span>{tUi("admin.submissions.auto_unarchive_hint", currentLanguage)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Controls & Audit Card */}
          <div className="space-y-6">
            {/* Status & Workflow Card */}
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-semibold text-text flex items-center gap-2">
                    {tUi("admin.submissions.status_notes", currentLanguage)}
                  </h3>
                  {isArchived && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <Lock size={12} />
                      {tUi("admin.submissions.readonly_notice", currentLanguage)}
                    </span>
                  )}
                </div>

                {/* Status selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-text uppercase tracking-wider block">
                    {tUi("admin.submissions.status", currentLanguage)}
                  </label>
                  <select
                    disabled={isArchived || actionLoading}
                    className={cn(
                      "w-full h-10 px-3 bg-surface border rounded-lg text-sm transition-colors outline-none",
                      isArchived 
                        ? "opacity-60 bg-muted/30 cursor-not-allowed border-border text-muted-text" 
                        : "border-border text-text focus:ring-2 focus:ring-primary focus:border-primary"
                    )}
                    value={viewContact.status}
                    onChange={(e) => updateContact(viewContact.id, { status: e.target.value })}
                  >
                    <option value="new">{tUi("admin.submissions.filter_new", currentLanguage)}</option>
                    <option value="in_progress">{tUi("admin.submissions.filter_in_progress", currentLanguage)}</option>
                    <option value="resolved">{tUi("admin.submissions.filter_resolved", currentLanguage)}</option>
                  </select>
                  {isArchived && (
                    <p className="text-[11px] text-muted-text">
                      Status modification is locked on archived items.
                    </p>
                  )}
                </div>

                {/* Mark as read */}
                <div className="pt-1">
                  <label className={cn(
                    "flex items-center gap-2.5 text-sm text-text",
                    isArchived ? "opacity-60 cursor-not-allowed text-muted-text" : "cursor-pointer"
                  )}>
                    <input 
                      type="checkbox" 
                      disabled={isArchived || actionLoading}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 disabled:cursor-not-allowed"
                      checked={viewContact.is_read === 1}
                      onChange={(e) => updateContact(viewContact.id, { is_read: e.target.checked ? 1 : 0 })}
                    />
                    <span>{tUi("admin.submissions.marked_as_read", currentLanguage)}</span>
                  </label>
                </div>

                {/* Internal Notes */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="text-xs font-semibold text-muted-text uppercase tracking-wider flex items-center justify-between">
                    <span>{tUi("admin.submissions.internal_notes", currentLanguage)}</span>
                    {isArchived && <Lock size={12} className="text-muted-text" />}
                  </label>
                  <textarea
                    disabled={isArchived || actionLoading}
                    className={cn(
                      "w-full h-32 bg-surface border rounded-lg p-3 text-sm transition-colors outline-none",
                      isArchived 
                        ? "opacity-60 bg-muted/30 cursor-not-allowed border-border text-muted-text resize-none" 
                        : "border-border text-text focus:ring-2 focus:ring-primary focus:border-primary"
                    )}
                    placeholder={isArchived ? "Unarchive to edit internal notes" : tUi("admin.submissions.notes_placeholder", currentLanguage)}
                    defaultValue={viewContact.notes || ""}
                    onBlur={(e) => {
                      if (!isArchived && e.target.value !== (viewContact.notes || "")) {
                        updateContact(viewContact.id, { notes: e.target.value });
                      }
                    }}
                  />
                  {isArchived && (
                    <p className="text-[11px] text-muted-text">
                      Note editing is disabled while message is archived.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Audit & Archive History Card */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-text text-sm flex items-center gap-2 border-b border-border pb-3">
                  <Clock size={16} className="text-primary" />
                  <span>{tUi("admin.submissions.audit_trail", currentLanguage)}</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-text">Received:</span>
                    <span className="text-text font-medium text-right">{new Date(viewContact.created_at).toLocaleString()}</span>
                  </div>

                  {viewContact.archived_at && (
                    <div className="flex items-start justify-between gap-2 pt-2 border-t border-border/60">
                      <span className="text-muted-text">Archived:</span>
                      <div className="text-right">
                        <div className="text-text font-medium">{new Date(viewContact.archived_at).toLocaleString()}</div>
                        <div className="text-muted-text text-[11px]">by {viewContact.archived_by || "Admin"}</div>
                      </div>
                    </div>
                  )}

                  {viewContact.unarchived_at && (
                    <div className="flex items-start justify-between gap-2 pt-2 border-t border-border/60">
                      <span className="text-muted-text">Restored:</span>
                      <div className="text-right">
                        <div className="text-text font-medium">{new Date(viewContact.unarchived_at).toLocaleString()}</div>
                        <div className="text-muted-text text-[11px]">by {viewContact.unarchived_by || "Admin"}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ==================== LIST / INBOX VIEW ====================
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title={tUi("admin.submissions.title", currentLanguage)} 
        subtitle={tUi("admin.submissions.subtitle", currentLanguage)} 
      />

      {/* Toast Notification */}
      {feedbackMessage && (
        <div className={cn(
          "p-3.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border",
          feedbackMessage.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
        )}>
          {feedbackMessage.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => {
            setActiveTab("active");
            setSelectedIds(new Set());
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all border-b-2 -mb-[5px]",
            activeTab === "active"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-text hover:text-text hover:bg-muted/30"
          )}
        >
          <Inbox size={17} />
          <span>{tUi("admin.submissions.tab_active", currentLanguage)}</span>
          <span className={cn(
            "ml-1 px-2 py-0.5 text-xs rounded-full font-semibold",
            unreadActiveCount > 0 
              ? "bg-primary text-white" 
              : "bg-surface border border-border text-muted-text"
          )}>
            {activeCount}
          </span>
          {unreadActiveCount > 0 && (
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" title="Unread messages" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab("archived");
            setSelectedIds(new Set());
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all border-b-2 -mb-[5px]",
            activeTab === "archived"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-text hover:text-text hover:bg-muted/30"
          )}
        >
          <Archive size={17} />
          <span>{tUi("admin.submissions.tab_archived", currentLanguage)}</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full font-semibold bg-surface border border-border text-muted-text">
            {archivedCount}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("all");
            setSelectedIds(new Set());
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all border-b-2 -mb-[5px]",
            activeTab === "all"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-text hover:text-text hover:bg-muted/30"
          )}
        >
          <Filter size={17} />
          <span>{tUi("admin.submissions.tab_all", currentLanguage)}</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full font-semibold bg-surface border border-border text-muted-text">
            {allCount}
          </span>
        </button>
      </div>
      
      {/* Controls Bar: Search, Status Filter & Bulk Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" size={17} />
            <Input 
              className="pl-9" 
              placeholder={tUi("admin.submissions.search_placeholder", currentLanguage)} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="h-[38px] px-3 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{tUi("admin.submissions.filter_all", currentLanguage)}</option>
            <option value="new">{tUi("admin.submissions.filter_new", currentLanguage)}</option>
            <option value="in_progress">{tUi("admin.submissions.filter_in_progress", currentLanguage)}</option>
            <option value="resolved">{tUi("admin.submissions.filter_resolved", currentLanguage)}</option>
          </select>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-primary/10 px-3.5 py-2 rounded-lg border border-primary/20 animate-fadeIn">
            <span className="text-sm font-semibold text-primary mr-1">
              {tUi("admin.submissions.selected_count", currentLanguage, { count: selectedIds.size })}
            </span>

            {/* Archive Selected (in active tab or all tab) */}
            {activeTab !== "archived" && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleBulkArchive}
                disabled={actionLoading}
                className="flex items-center gap-1"
              >
                <Archive size={14} />
                <span>{tUi("admin.submissions.archive_selected", currentLanguage)}</span>
              </Button>
            )}

            {/* Restore Selected (in archived tab or all tab) */}
            {activeTab !== "active" && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleBulkUnarchive}
                disabled={actionLoading}
                className="flex items-center gap-1 border-primary/30 text-primary hover:bg-primary/10"
              >
                <ArchiveRestore size={14} />
                <span>{tUi("admin.submissions.unarchive_selected", currentLanguage)}</span>
              </Button>
            )}

            {/* If in Active tab, allow status and mark read */}
            {activeTab === "active" && (
              <>
                <select 
                  className="text-xs bg-white dark:bg-slate-800 border border-border rounded-md px-2.5 py-1.5 outline-none cursor-pointer text-text"
                  onChange={(e) => {
                    if (e.target.value) handleBulkUpdate({ status: e.target.value });
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>{tUi("admin.submissions.set_status", currentLanguage)}</option>
                  <option value="new">{tUi("admin.submissions.filter_new", currentLanguage)}</option>
                  <option value="in_progress">{tUi("admin.submissions.filter_in_progress", currentLanguage)}</option>
                  <option value="resolved">{tUi("admin.submissions.filter_resolved", currentLanguage)}</option>
                </select>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => handleBulkUpdate({ is_read: 1 })}
                  disabled={actionLoading}
                >
                  {tUi("admin.submissions.mark_read", currentLanguage)}
                </Button>
              </>
            )}

            <Button 
              variant="danger" 
              size="sm" 
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="flex items-center gap-1"
            >
              <Trash2 size={14} />
              <span>{tUi("admin.submissions.delete", currentLanguage)}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Messages Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background/80">
                <th className="p-4 w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    checked={filteredContacts.length > 0 && selectedIds.size === filteredContacts.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.submissions.th_contact", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.submissions.th_message", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.submissions.th_status", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.submissions.th_date", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider text-right">{tUi("admin.submissions.th_actions", currentLanguage)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredContacts.map(c => {
                const isArchived = Boolean(c.is_archived);

                return (
                  <tr 
                    key={c.id} 
                    className={cn(
                      "hover:bg-background/50 transition-colors group",
                      !c.is_read && !isArchived && "bg-primary/5 font-medium",
                      isArchived && "bg-muted/10 opacity-90"
                    )}
                  >
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-text">{c.name}</div>
                        {!c.is_read && !isArchived && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" title="New unread message" />
                        )}
                        {c.customer_id && (
                          <span 
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-medium"
                            title="Linked to CRM Customer"
                          >
                            <UserCheck size={11} />
                            <span>{tUi("admin.submissions.linked_customer_badge", currentLanguage)}</span>
                          </span>
                        )}
                        {c.plan_name && (
                          <span 
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 font-medium"
                            title={`Plan: ${c.plan_name}`}
                          >
                            <Tag size={11} className="shrink-0" />
                            <span className="truncate max-w-[140px]">{c.plan_name}</span>
                          </span>
                        )}
                        {isArchived && (
                          <span 
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium"
                            title={c.archived_at ? `Archived by ${c.archived_by || 'Admin'} on ${new Date(c.archived_at).toLocaleString()}` : "Archived"}
                          >
                            <Archive size={11} />
                            <span>{tUi("admin.submissions.archived_badge", currentLanguage)}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-text flex items-center gap-1 mt-0.5">
                        <Mail size={12} className="shrink-0" />
                        <span className="truncate max-w-[160px]">{c.email}</span>
                      </div>
                      {c.phone && (
                        <div className="text-xs text-muted-text flex items-center gap-1 mt-0.5">
                          <Phone size={12} className="shrink-0 text-primary" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {c.subject && (
                        <div className="text-xs text-primary font-medium flex items-center gap-1 mb-1">
                          <Sparkles size={11} className="shrink-0" />
                          <span className="truncate max-w-xs">{c.subject}</span>
                        </div>
                      )}
                      {c.property_address && (
                        <div className="text-xs text-muted-text font-medium flex items-center gap-1 mb-1">
                          <MapPin size={11} className="shrink-0 text-primary" />
                          <span className="truncate max-w-xs">{c.property_address}</span>
                        </div>
                      )}
                      {c.availability_start && c.availability_end && (
                        <div className="text-xs text-sky-700 dark:text-sky-400 font-medium flex items-center gap-1 mb-1">
                          <Clock size={11} className="shrink-0 text-sky-500" />
                          <span className="truncate max-w-xs">
                            {new Date(c.availability_start).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(c.availability_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(c.availability_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      <div className="text-sm text-text line-clamp-2 max-w-sm leading-relaxed">
                        {c.message}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                        c.status === 'new' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        c.status === 'in_progress' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      )}>
                        {getStatusLabel(c.status)}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-xs text-muted-text">
                      <div>{new Date(c.created_at).toLocaleDateString()}</div>
                      <div className="text-[11px] text-muted-text/70">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Create Customer Button */}
                        {isAdmin && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => handleOpenCreateCustomer(c)} 
                            title={tUi("admin.submissions.create_customer", currentLanguage)}
                            className="h-8 px-2 flex items-center gap-1 text-xs text-primary hover:bg-primary/10 border-primary/20"
                          >
                            <UserPlus size={14} />
                            <span className="hidden xl:inline">{tUi("admin.submissions.create_customer", currentLanguage)}</span>
                          </Button>
                        )}

                        {/* View Details */}
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => {
                            if (!c.is_read && !isArchived) updateContact(c.id, { is_read: 1 });
                            setViewContact(c);
                          }} 
                          title={tUi("admin.submissions.view_details", currentLanguage)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye size={15} />
                        </Button>

                        {/* Archive or Unarchive button */}
                        {isArchived ? (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => unarchiveContact(c.id)} 
                            title={tUi("admin.submissions.unarchive", currentLanguage)}
                            disabled={actionLoading}
                            className="h-8 w-8 p-0 text-primary hover:bg-primary/10 border-primary/20"
                          >
                            <ArchiveRestore size={15} />
                          </Button>
                        ) : (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => archiveContact(c.id)} 
                            title={tUi("admin.submissions.archive", currentLanguage)}
                            disabled={actionLoading}
                            className="h-8 w-8 p-0 hover:text-amber-600 hover:border-amber-400"
                          >
                            <Archive size={15} />
                          </Button>
                        )}

                        {/* Delete button */}
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => deleteContact(c.id)} 
                          title={tUi("admin.submissions.delete", currentLanguage)}
                          disabled={actionLoading}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-text">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="p-3 bg-muted/40 rounded-full text-muted-text">
                        {activeTab === "archived" ? <Archive size={28} /> : <Inbox size={28} />}
                      </div>
                      <p className="font-semibold text-text">
                        {activeTab === "archived" 
                          ? "No archived messages" 
                          : tUi("admin.submissions.no_match", currentLanguage)}
                      </p>
                      <p className="text-xs text-muted-text max-w-sm">
                        {activeTab === "archived" 
                          ? "Inquiries that have been closed and archived for record keeping will appear here." 
                          : "Try adjusting your search query or status filter."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reusable Customer Creation / Edit Modal */}
      <CustomerModal 
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setCustomerModalData(null);
          setLinkedContactId(null);
        }}
        initialData={customerModalData}
        linkedContactId={linkedContactId}
        onSaved={handleCustomerSaved}
        onOpenExistingCustomer={handleOpenExistingCustomer}
      />

      {/* View Existing Customer Modal (e.g. from duplicate prompt) */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text">{viewingCustomer.name}</h3>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    viewingCustomer.status === 'active' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
                    viewingCustomer.status === 'inactive' ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" :
                    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"
                  )}>
                    {viewingCustomer.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewingCustomer(null)} className="text-muted-text hover:text-text transition-colors">
                <X size={20} />
              </button>
            </div>
            <CardContent className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.customers.field_email", currentLanguage)}</div>
                  <div className="text-text font-medium">{viewingCustomer.email || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.customers.field_phone", currentLanguage)}</div>
                  <div className="text-text font-medium">{viewingCustomer.phone || '-'}</div>
                </div>
              </div>

              {viewingCustomer.property_address && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.customers.field_property_address", currentLanguage)}</div>
                  <div className="text-text">{viewingCustomer.property_address}</div>
                </div>
              )}

              {viewingCustomer.advertisement_link && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.customers.field_advertisement_link", currentLanguage)}</div>
                  <a 
                    href={viewingCustomer.advertisement_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium break-all"
                  >
                    <span>{tUi("admin.customers.view_advert", currentLanguage)}</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}

              {viewingCustomer.notes && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.customers.field_notes", currentLanguage)}</div>
                  <div className="text-text bg-background/50 p-3 rounded-lg border border-border whitespace-pre-wrap">{viewingCustomer.notes}</div>
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t border-border flex justify-end gap-2 bg-surface rounded-b-xl">
              <Button variant="secondary" onClick={() => setViewingCustomer(null)}>
                {tUi("admin.customers.cancel", currentLanguage)}
              </Button>
              <Button onClick={() => {
                const cust = viewingCustomer;
                setViewingCustomer(null);
                setCustomerModalData(cust);
                setIsCustomerModalOpen(true);
              }}>
                <Edit2 size={15} className="mr-1.5" />
                {tUi("admin.customers.edit_customer", currentLanguage)}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
