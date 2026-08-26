import { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { CRMRecord, AuditLog } from "../../lib/types";
import { PageHeader } from "../../components/admin/PageHeader";
import { AdminListSkeleton } from "../../components/admin/AdminSkeleton";
import { AdminPagination, AdminPaginationMeta } from "../../components/admin/AdminPagination";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { CustomerModal } from "../../components/admin/CustomerModal";
import { cn } from "../../lib/utils";
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  ExternalLink, 
  Eye,
  KeyRound,
  Check,
  Send,
  Loader2,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  Info,
  ShieldAlert,
  ShieldCheck,
  History,
  UserX,
  UserCheck,
  Building,
  Copy
} from "lucide-react";
import { Link } from "react-router-dom";

interface InviteFeedback {
  type: "success" | "error" | "info";
  title: string;
  message: string;
  recipient?: string;
  simulated?: boolean;
  expiresAt?: string;
  details?: Array<{ name: string; email: string; success: boolean; simulated?: boolean; error?: string }>;
}

const AUDIT_ACTION_KEYS: Record<string, string> = {
  CUSTOMER_CREATED: "admin.customers.audit.action.customer_created",
  CUSTOMER_DELETED: "admin.customers.audit.action.customer_deleted",
  CUSTOMER_STATUS_CHANGED: "admin.customers.audit.action.status_changed",
  PORTAL_ACCESS_DISABLED_INACTIVITY: "admin.customers.audit.action.portal_disabled_automatic",
  PORTAL_ACCESS_DISABLED_MANUAL: "admin.customers.audit.action.portal_disabled_manual",
  PORTAL_ACCESS_ENABLED_MANUAL: "admin.customers.audit.action.portal_enabled_manual",
  PORTAL_ACCESS_ENABLED_REACTIVATION: "admin.customers.audit.action.portal_enabled_reactivation",
};

const AUDIT_FIELD_KEYS: Record<string, string> = {
  customer_name: "admin.customers.audit.field.customer",
  customer_email: "admin.customers.audit.field.email",
  type: "admin.customers.audit.field.record_type",
  status: "admin.customers.audit.field.status",
  previous_status: "admin.customers.audit.field.previous_status",
  new_status: "admin.customers.audit.field.new_status",
  reason: "admin.customers.audit.field.reason",
  is_active: "admin.customers.audit.field.portal_access",
  users_affected: "admin.customers.audit.field.accounts_affected",
  portal_accounts_disabled: "admin.customers.audit.field.accounts_disabled",
  portal_accounts_enabled: "admin.customers.audit.field.accounts_enabled",
  portal_accounts_reactivated: "admin.customers.audit.field.accounts_restored",
};

const AUDIT_VALUE_KEYS: Record<string, string> = {
  active: "admin.customers.audit.value.active",
  inactive: "admin.customers.audit.value.inactive",
  customer: "admin.customers.audit.value.customer",
  lead: "admin.customers.audit.value.lead",
  enabled: "admin.customers.audit.value.enabled",
  disabled: "admin.customers.audit.value.disabled",
};

type AuditTranslator = (key: string) => string;

function getAuditActionLabel(action: string, translate: AuditTranslator) {
  const translationKey = AUDIT_ACTION_KEYS[action];
  return translationKey ? translate(translationKey) : action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAuditValue(key: string, value: unknown, translate: AuditTranslator): string {
  if (key === "is_active") return translate(Number(value) === 1 ? "admin.customers.audit.value.enabled" : "admin.customers.audit.value.disabled");
  if (typeof value === "boolean") return translate(value ? "admin.customers.audit.value.yes" : "admin.customers.audit.value.no");
  if (value === null || value === undefined || value === "") return translate("admin.customers.audit.value.not_provided");
  if (Array.isArray(value)) return value.map((item) => formatAuditValue("", item, translate)).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([nestedKey, nestedValue]) => `${AUDIT_FIELD_KEYS[nestedKey] ? translate(AUDIT_FIELD_KEYS[nestedKey]) : nestedKey}: ${formatAuditValue(nestedKey, nestedValue, translate)}`)
      .join("; ");
  }
  const text = String(value);
  const valueKey = AUDIT_VALUE_KEYS[text.toLowerCase()];
  return valueKey ? translate(valueKey) : text;
}

function getProcessedAuditDetails(details: string, translate: AuditTranslator): Array<{ key: string; label: string; value: string }> {
  if (!details) return [];
  try {
    const parsed = JSON.parse(details);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return [{ key: "details", label: translate("admin.customers.audit.details"), value: formatAuditValue("", parsed, translate) }];
    }
    const entries = Object.entries(parsed as Record<string, unknown>);
    const meaningfulEntries = entries.filter(([key]) => key !== "customer_id");
    return (meaningfulEntries.length > 0 ? meaningfulEntries : entries).map(([key, value]) => ({
      key,
      label: AUDIT_FIELD_KEYS[key] ? translate(AUDIT_FIELD_KEYS[key]) : key
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      value: formatAuditValue(key, value, translate),
    }));
  } catch {
    return [{ key: "details", label: translate("admin.customers.audit.details"), value: details }];
  }
}

export default function CustomersPage() {
  const { currentLanguage, tUi } = useLanguage();
  usePageTitle(tUi("admin.customers.title", currentLanguage));
  const { fetchApi } = useApi();
  const [customers, setCustomers] = useState<CRMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [portalFilter, setPortalFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<AdminPaginationMeta>({ page: 1, page_size: 25, total: 0, total_pages: 1 });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<CRMRecord> | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<CRMRecord | null>(null);

  // Bulk Selection and Invite States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [feedback, setFeedback] = useState<InviteFeedback | null>(null);

  // Audit Logs & Portal Toggle States
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [togglingPortalId, setTogglingPortalId] = useState<string | null>(null);

  // Properties and Links for Viewing Customer
  const [viewingProperties, setViewingProperties] = useState<any[]>([]);
  const [viewingLinks, setViewingLinks] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchCustomerPropertiesAndLinks = async (customerId: string) => {
    try {
      const [pRes, lRes] = await Promise.all([
        fetchApi(`/api/admin/crm/${customerId}/properties`),
        fetchApi(`/api/admin/crm/${customerId}/links`)
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setViewingProperties(Array.isArray(pData) ? pData : []);
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        setViewingLinks(Array.isArray(lData) ? lData : []);
      }
    } catch (e) {
      console.warn("Could not fetch customer properties/links:", e);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const portal = portalFilter === "has_portal" ? "exists" : portalFilter === "no_portal" ? "none" : "all";
      const params = new URLSearchParams({ search, status: statusFilter, portal, page: String(page), page_size: "25" });
      const res = await fetchApi(`/api/admin/crm/customer?${params}`);
      if (res.ok) {
        const body = await res.json();
        const data = body.items || [];
        setCustomers(data);
        setPagination(body.pagination);
        // If details modal is open, refresh viewing customer data reactively
        if (viewingCustomer) {
          const fresh = data.find((c: CRMRecord) => c.id === viewingCustomer.id);
          if (fresh) setViewingCustomer(fresh);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async (customerId: string) => {
    setLoadingAuditLogs(true);
    try {
      const res = await fetchApi(`/api/admin/crm/customers/${customerId}/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  useEffect(() => {
    if (viewingCustomer?.id) {
      fetchAuditLogs(viewingCustomer.id);
      fetchCustomerPropertiesAndLinks(viewingCustomer.id);
    } else {
      setAuditLogs([]);
      setShowAuditLogs(false);
      setViewingProperties([]);
      setViewingLinks([]);
    }
  }, [viewingCustomer?.id]);

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, portalFilter, page]);

  useEffect(() => { setPage(1); }, [search, statusFilter, portalFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm(tUi("admin.customers.confirm_delete", currentLanguage))) return;
    try {
      await fetchApi(`/api/admin/crm/${id}`, { method: "DELETE" });
      setSelectedIds(prev => prev.filter(item => item !== id));
      fetchCustomers();
    } catch (e) {
      console.error(e);
    }
  };

  const isPortalAccount = (customer: CRMRecord) => {
    return Boolean(
      customer.has_portal_account === 1 || 
      customer.has_portal_account === true || 
      Boolean(customer.portal_user_id)
    );
  };

  const isPortalDisabled = (customer: CRMRecord) => {
    return customer.status === 'inactive' || customer.portal_user_is_active === 0;
  };

  const handleTogglePortalAccess = async (customer: CRMRecord, enable: boolean) => {
    let reason = "";
    if (!enable) {
      const input = prompt("Reason for disabling portal access (e.g. Inactive status, contract suspended):", "Manual admin action");
      if (input === null) return;
      reason = input || "Manual admin action";
    }

    try {
      setTogglingPortalId(customer.id);
      const res = await fetchApi(`/api/admin/crm/customers/${customer.id}/portal-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: enable, reason })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update portal access");
      }
      await fetchCustomers();
      fetchAuditLogs(customer.id);
      setFeedback({
        type: "success",
        title: enable ? "Portal Access Enabled" : "Portal Access Disabled",
        message: enable 
          ? `Portal access has been re-enabled for ${customer.name} (${customer.email}).`
          : `Portal access has been revoked for ${customer.name}. User will be blocked from logging in.`,
        recipient: customer.email || undefined
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        title: "Portal Access Update Failed",
        message: err.message || "Failed to toggle portal access"
      });
    } finally {
      setTogglingPortalId(null);
    }
  };

  const handleBulkStatusChange = async (newStatus: 'active' | 'inactive' | 'churned') => {
    if (selectedIds.length === 0) return;
    const confirmMsg = newStatus === 'inactive'
      ? `Are you sure you want to mark ${selectedIds.length} customer(s) as INACTIVE?\n\nThis will automatically DISABLE all linked client portal user accounts and terminate active sessions.`
      : `Change status of ${selectedIds.length} customer(s) to '${newStatus}'?`;
    if (!confirm(confirmMsg)) return;

    try {
      setIsBulkSending(true);
      const res = await fetchApi(`/api/admin/crm/customers/bulk-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          status: newStatus,
          re_enable_portal: newStatus === 'active'
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update customer statuses");
      }
      const data = await res.json();
      await fetchCustomers();
      setSelectedIds([]);
      setFeedback({
        type: "success",
        title: "Bulk Status Updated",
        message: `Successfully updated ${data.updated} customer(s) to '${newStatus}'. ${data.portals_disabled ? `(${data.portals_disabled} portal account(s) auto-disabled).` : ''}`
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        title: "Bulk Update Failed",
        message: err.message || "Failed to update customer statuses"
      });
    } finally {
      setIsBulkSending(false);
    }
  };

  const filteredCustomers = customers;

  // Calculate selection and eligibility
  const eligibleSelectedCustomers = filteredCustomers.filter(
    c => selectedIds.includes(c.id) && !isPortalAccount(c) && Boolean(c.email && c.email.trim())
  );

  const allVisibleSelected = filteredCustomers.length > 0 && filteredCustomers.every(c => selectedIds.includes(c.id));
  const someVisibleSelected = filteredCustomers.some(c => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      // Unselect all visible
      const visibleIdSet = new Set(filteredCustomers.map(c => c.id));
      setSelectedIds(prev => prev.filter(id => !visibleIdSet.has(id)));
    } else {
      // Select all visible
      const visibleIds = filteredCustomers.map(c => c.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Send single portal invite
  const handleSendPortalInvite = async (customer: CRMRecord) => {
    if (!customer.email || !customer.email.trim()) {
      alert(tUi("admin.customers.no_email_warning", currentLanguage) || "Customer has no email address registered.");
      return;
    }

    setSendingInviteId(customer.id);
    try {
      const res = await fetchApi(`/api/admin/crm/customers/${customer.id}/send-portal-invite`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          title: tUi("admin.customers.invite_dialog_title", currentLanguage) || "Portal Invitation Dispatched",
          message: data.message || `Invitation successfully sent to ${customer.email}`,
          recipient: customer.email,
          simulated: data.simulated,
          expiresAt: data.expiresAt
        });
        fetchCustomers();
      } else {
        setFeedback({
          type: "error",
          title: tUi("admin.customers.invite_failed", currentLanguage) || "Failed to Send Invitation",
          message: data.error || "An error occurred while generating the portal invitation link.",
          recipient: customer.email
        });
      }
    } catch (e: any) {
      console.error("Failed to send invite:", e);
      setFeedback({
        type: "error",
        title: tUi("admin.customers.invite_failed", currentLanguage) || "Failed to Send Invitation",
        message: e?.message || "Failed to contact email dispatch service.",
        recipient: customer.email
      });
    } finally {
      setSendingInviteId(null);
    }
  };

  // Send bulk portal invites
  const handleBulkInvite = async () => {
    if (eligibleSelectedCustomers.length === 0) {
      alert("None of the selected customers are eligible (must have a valid email and not already have a portal account).");
      return;
    }

    const confirmMsg = (tUi("admin.customers.bulk_invite_confirm", currentLanguage) || "Send portal invitation emails to {count} selected customer(s)?")
      .replace("{count}", String(eligibleSelectedCustomers.length));

    if (!confirm(confirmMsg)) return;

    setIsBulkSending(true);
    try {
      const res = await fetchApi(`/api/admin/crm/customers/bulk-portal-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_ids: eligibleSelectedCustomers.map(c => c.id)
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const successMsg = (tUi("admin.customers.bulk_invite_success", currentLanguage) || "Successfully dispatched {sent} portal invitation email(s).")
          .replace("{sent}", String(data.sent_count));
        
        setFeedback({
          type: "success",
          title: tUi("admin.customers.invite_dialog_title", currentLanguage) || "Bulk Invitations Dispatched",
          message: successMsg,
          details: data.results
        });
        setSelectedIds([]);
        fetchCustomers();
      } else {
        setFeedback({
          type: "error",
          title: tUi("admin.customers.invite_failed", currentLanguage) || "Bulk Invite Failed",
          message: data.error || "Failed to process bulk invitations."
        });
      }
    } catch (e: any) {
      console.error("Bulk invite error:", e);
      setFeedback({
        type: "error",
        title: tUi("admin.customers.invite_failed", currentLanguage) || "Bulk Invite Error",
        message: e?.message || "Server error while processing bulk invites."
      });
    } finally {
      setIsBulkSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case 'inactive': return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case 'churned': return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return tUi("admin.customers.status_active", currentLanguage);
      case 'inactive': return tUi("admin.customers.status_inactive", currentLanguage);
      case 'churned': return tUi("admin.customers.status_churned", currentLanguage);
      default: return status.toUpperCase();
    }
  };

  if (loading && customers.length === 0) return <AdminListSkeleton title={tUi("admin.customers.title", currentLanguage)} />;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader title={tUi("admin.customers.title", currentLanguage)} subtitle={tUi("admin.customers.subtitle", currentLanguage)} />
        <Button onClick={() => { setEditingCustomer({ status: 'active', property_address: '', advertisement_link: '' }); setIsModalOpen(true); }} className="gap-2">
          <Plus size={16} /> {tUi("admin.customers.add_customer", currentLanguage)}
        </Button>
      </div>

      {/* Real-time Feedback Banner */}
      {feedback && (
        <div className={cn(
          "p-4 rounded-xl border flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200",
          feedback.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200" 
            : feedback.type === "error"
            ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200"
            : "bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-200"
        )}>
          <div className="flex items-start gap-3">
            {feedback.type === "success" ? (
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={20} />
            ) : feedback.type === "error" ? (
              <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={20} />
            ) : (
              <Info className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
            )}
            <div className="space-y-1">
              <div className="font-semibold text-sm flex items-center gap-2">
                <span>{feedback.title}</span>
                {feedback.simulated && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Preview / Mock Logged
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90 leading-relaxed">{feedback.message}</p>
              {feedback.recipient && (
                <div className="text-xs font-mono opacity-80 pt-0.5">
                  Recipient: <span className="font-semibold">{feedback.recipient}</span>
                  {feedback.expiresAt && <span className="ml-3">Expires: {new Date(feedback.expiresAt).toLocaleString()}</span>}
                </div>
              )}
              {feedback.details && feedback.details.length > 0 && (
                <div className="mt-2 text-xs space-y-1 max-h-36 overflow-y-auto bg-background/50 p-2.5 rounded-lg border border-border/50">
                  {feedback.details.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 py-0.5 border-b border-border/20 last:border-0 font-mono">
                      <span>{item.name} ({item.email || "No Email"})</span>
                      <span className={item.success ? "text-emerald-600 font-semibold" : "text-rose-500 font-semibold"}>
                        {item.success ? (item.simulated ? "Simulated" : "Dispatched") : item.error}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => setFeedback(null)} 
            className="text-muted-text hover:text-text p-1 rounded hover:bg-muted/40 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" size={18} />
          <Input placeholder={tUi("admin.customers.search_placeholder", currentLanguage)} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          {/* Status Filter */}
          <select 
            className="h-[38px] px-3 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{tUi("admin.customers.status_all", currentLanguage)}</option>
            <option value="active">{tUi("admin.customers.status_active", currentLanguage)}</option>
            <option value="inactive">{tUi("admin.customers.status_inactive", currentLanguage)}</option>
            <option value="churned">{tUi("admin.customers.status_churned", currentLanguage)}</option>
          </select>

          {/* Portal Account Filter */}
          <select 
            className="h-[38px] px-3 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={portalFilter}
            onChange={(e) => setPortalFilter(e.target.value)}
          >
            <option value="all">{tUi("admin.customers.portal_filter_all", currentLanguage) || "All Portal Status"}</option>
            <option value="has_portal">{tUi("admin.customers.portal_filter_has", currentLanguage) || "With Portal Account"}</option>
            <option value="no_portal">{tUi("admin.customers.portal_filter_none", currentLanguage) || "Without Portal Account"}</option>
          </select>
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 bg-primary/10 border border-primary/25 rounded-xl flex items-center justify-between gap-3 flex-wrap animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2.5 text-sm font-medium text-text">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {selectedIds.length}
            </span>
            <span>
              {(tUi("admin.customers.selected_count", currentLanguage) || "{count} selected ({eligible} invite-eligible)")
                .replace("{count}", String(selectedIds.length))
                .replace("{eligible}", String(eligibleSelectedCustomers.length))}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Inactive Action */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleBulkStatusChange('inactive')}
              disabled={isBulkSending}
              className="text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 border-amber-500/30 gap-1.5"
              title="Mark as Inactive and auto-disable all associated client portal accounts"
            >
              <UserX size={14} className="text-amber-600 dark:text-amber-400" />
              <span>Mark Inactive</span>
            </Button>

            {/* Bulk Active Action */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleBulkStatusChange('active')}
              disabled={isBulkSending}
              className="text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/30 gap-1.5"
            >
              <UserCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Mark Active</span>
            </Button>

            <Button 
              size="sm" 
              onClick={handleBulkInvite} 
              disabled={isBulkSending || eligibleSelectedCustomers.length === 0}
              className="gap-1.5 shadow-sm"
              title={eligibleSelectedCustomers.length === 0 ? "No selected customer is eligible without portal account & with email" : undefined}
            >
              {isBulkSending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              <span>
                {isBulkSending
                  ? (tUi("admin.customers.sending_invite", currentLanguage) || "Sending Invites...")
                  : (tUi("admin.customers.bulk_invite", currentLanguage) || "Send Invites ({count})").replace("{count}", String(eligibleSelectedCustomers.length))}
              </span>
            </Button>

            <Button variant="secondary" size="sm" onClick={() => setSelectedIds([])}>
              {tUi("admin.customers.clear_selection", currentLanguage) || "Clear"}
            </Button>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="p-4 w-10 text-center">
                  <button 
                    onClick={toggleSelectAll} 
                    className="text-muted-text hover:text-text p-1 rounded transition-colors"
                    title={tUi("admin.customers.select_all", currentLanguage) || "Select all"}
                  >
                    {allVisibleSelected ? (
                      <CheckSquare size={17} className="text-primary" />
                    ) : someVisibleSelected ? (
                      <div className="w-4 h-4 rounded border-2 border-primary bg-primary/20 flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-primary" />
                      </div>
                    ) : (
                      <Square size={17} />
                    )}
                  </button>
                </th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.customers.th_customer", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.customers.th_status", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.customers.th_property_address", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.customers.th_advertisement_link", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.customers.th_source", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.customers.th_since", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider text-right">{tUi("admin.customers.th_actions", currentLanguage)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map((customer) => {
                const hasPortal = isPortalAccount(customer);
                const portalDisabled = hasPortal && isPortalDisabled(customer);
                const isSelected = selectedIds.includes(customer.id);
                const isSendingThis = sendingInviteId === customer.id;
                const isTogglingThis = togglingPortalId === customer.id;
                const hasValidEmail = Boolean(customer.email && customer.email.trim());

                return (
                  <tr 
                    key={customer.id} 
                    className={cn(
                      "transition-colors",
                      isSelected
                        ? "bg-primary/10 hover:bg-primary/15"
                        : hasPortal 
                        ? "bg-primary/[0.025] hover:bg-primary/[0.06] dark:bg-primary/[0.04] dark:hover:bg-primary/[0.08]" 
                        : "hover:bg-background/50"
                    )}
                  >
                    <td className="p-4 w-10 text-center">
                      <button 
                        onClick={() => toggleSelectOne(customer.id)} 
                        className="text-muted-text hover:text-text p-1 rounded transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare size={17} className="text-primary" />
                        ) : (
                          <Square size={17} />
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-text flex items-center gap-2 flex-wrap">
                        <span>{customer.name}</span>
                        {/* PORTAL ACCESS BADGES */}
                        {hasPortal && (
                          portalDisabled ? (
                            <span 
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25 shadow-xs" 
                              title={customer.portal_access_disabled_reason ? `Portal Disabled: ${customer.portal_access_disabled_reason}` : "Portal Access Disabled (Customer Inactive)"}
                            >
                              <ShieldAlert size={11} className="shrink-0" />
                              <span>Portal Disabled</span>
                            </span>
                          ) : (
                            <span 
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shadow-xs" 
                              title="Active Client Portal Account"
                            >
                              <ShieldCheck size={11} className="shrink-0" />
                              <span>Portal Active</span>
                            </span>
                          )
                        )}
                      </div>
                      <div className="text-sm text-muted-text mt-1 space-y-0.5">
                        {customer.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className={hasPortal ? (portalDisabled ? "text-rose-500 shrink-0" : "text-emerald-500 shrink-0") : "shrink-0"} /> 
                            <span className={hasPortal ? "font-medium text-text/90" : ""}>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && <div className="flex items-center gap-1.5"><Phone size={12} /> {customer.phone}</div>}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", getStatusColor(customer.status))}>
                        {getStatusLabel(customer.status)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-text max-w-xs">
                      {customer.property_address ? (
                        <div className="space-y-1">
                          <span title={customer.property_address} className="inline-flex items-center gap-1 text-text text-xs">
                            <MapPin size={13} className="text-muted-text shrink-0" />
                            <span className="truncate max-w-[170px]">{customer.property_address}</span>
                          </span>
                          {customer.properties_count && customer.properties_count > 1 && (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary px-1.5 py-0.2 rounded-full">
                                <Building size={11} />
                                <span>+{customer.properties_count - 1} more</span>
                              </span>
                            </div>
                          )}
                        </div>
                      ) : customer.properties_count && customer.properties_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          <Building size={13} />
                          <span>{customer.properties_count} properties</span>
                        </span>
                      ) : (
                        <span className="text-muted-text text-xs">-</span>
                      )}
                    </td>
                    <td className="p-4 text-sm whitespace-nowrap">
                      {customer.advertisement_link ? (
                        <div className="space-y-1">
                          <a
                            href={customer.advertisement_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover hover:underline bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors"
                            title={customer.advertisement_link}
                          >
                            <span>{tUi("admin.customers.view_advert", currentLanguage)}</span>
                            <ExternalLink size={11} />
                          </a>
                          {customer.links_count && customer.links_count > 1 && (
                            <div className="text-[11px] text-muted-text">
                              +{customer.links_count - 1} more links
                            </div>
                          )}
                        </div>
                      ) : customer.links_count && customer.links_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <Globe size={13} />
                          <span>{customer.links_count} links</span>
                        </span>
                      ) : (
                        <span className="text-muted-text text-xs">-</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-text">
                      {customer.source || '-'}
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-muted-text">
                      {new Date(customer.updated_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* MANUAL PORTAL INVITATION BUTTON */}
                      {!hasPortal && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleSendPortalInvite(customer)}
                          disabled={!hasValidEmail || isSendingThis}
                          className="text-primary hover:bg-primary/10 hover:border-primary/30 gap-1.5 px-2.5"
                          title={
                            !hasValidEmail 
                              ? (tUi("admin.customers.no_email_warning", currentLanguage) || "Customer has no email address registered")
                              : (tUi("admin.customers.send_invite_tooltip", currentLanguage) || "Send personalized single-use activation magic link to customer's email")
                          }
                        >
                          {isSendingThis ? (
                            <Loader2 size={14} className="animate-spin text-primary" />
                          ) : (
                            <Send size={14} className="text-primary" />
                          )}
                          <span className="text-xs font-medium hidden sm:inline">
                            {tUi("admin.customers.send_invite", currentLanguage) || "Send Invite"}
                          </span>
                        </Button>
                      )}

                      <Link to={`/admin/customers/${customer.id}`} className="inline-flex h-8 items-center rounded-md border border-border px-2 text-xs font-medium text-primary hover:bg-primary/10" title="Customer 360">360</Link>
                      <Button variant="secondary" size="sm" onClick={() => setViewingCustomer(customer)} title={tUi("admin.customers.view_details", currentLanguage)}>
                        <Eye size={16} />
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => { setEditingCustomer(customer); setIsModalOpen(true); }} title={tUi("admin.customers.edit_customer", currentLanguage)}>
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(customer.id)} title={tUi("admin.customers.confirm_delete", currentLanguage)}>
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-text">
                    {tUi("admin.customers.no_match", currentLanguage)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination meta={pagination} onPageChange={setPage} />
      </div>

      {/* Details View Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-xl shadow-2xl flex flex-col my-auto border-border animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-text">{tUi("admin.customers.details_title", currentLanguage)}</h3>
                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getStatusColor(viewingCustomer.status))}>
                  {getStatusLabel(viewingCustomer.status)}
                </span>
              </div>
              <button onClick={() => setViewingCustomer(null)} className="text-muted-text hover:text-text transition-colors p-1.5 rounded-lg hover:bg-muted/40">
                <X size={20} />
              </button>
            </div>

            <CardContent className="p-5 sm:p-6 space-y-4 text-sm max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.customers.field_name", currentLanguage)}</div>
                <div className="text-base font-semibold text-text">{viewingCustomer.name}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.customers.field_email", currentLanguage)}</div>
                  <div className="text-text font-medium">{viewingCustomer.email || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.customers.field_phone", currentLanguage)}</div>
                  <div className="text-text">{viewingCustomer.phone || '-'}</div>
                </div>
              </div>

              {/* CLIENT PORTAL ACCESS & CONTROL PANEL */}
              <div className="p-4 bg-background/70 border border-border rounded-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-primary" />
                    <span className="text-xs font-bold text-text uppercase tracking-wider">
                      Client Portal Account & Security
                    </span>
                  </div>
                  {isPortalAccount(viewingCustomer) && (
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                      isPortalDisabled(viewingCustomer)
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    )}>
                      {isPortalDisabled(viewingCustomer) ? "Access Disabled" : "Access Active"}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-5 h-5 rounded flex items-center justify-center border transition-colors",
                      isPortalAccount(viewingCustomer)
                        ? (isPortalDisabled(viewingCustomer) ? "bg-rose-500 text-white border-rose-500" : "bg-primary text-primary-foreground border-primary")
                        : "bg-muted/40 text-transparent border-border"
                    )}>
                      {isPortalAccount(viewingCustomer) && <Check size={13} strokeWidth={3} />}
                    </div>
                    <span className={cn(
                      "text-xs font-semibold",
                      isPortalAccount(viewingCustomer)
                        ? (isPortalDisabled(viewingCustomer) ? "text-rose-600 dark:text-rose-400" : "text-primary")
                        : "text-muted-text"
                    )}>
                      {isPortalAccount(viewingCustomer)
                        ? (isPortalDisabled(viewingCustomer) ? "Portal Account Disabled" : "Active Portal Account Linked")
                        : tUi("admin.customers.portal_account_no", currentLanguage) || "No Portal Account"}
                    </span>
                  </div>

                  {isPortalAccount(viewingCustomer) && viewingCustomer.email && (
                    <Link
                      to={`/admin/clients?search=${encodeURIComponent(viewingCustomer.email)}`}
                      className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md transition-colors"
                    >
                      <span>{tUi("admin.customers.view_portal_user", currentLanguage) || "View in Client Portal"}</span>
                      <ExternalLink size={11} />
                    </Link>
                  )}
                </div>

                {isPortalAccount(viewingCustomer) && (
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    {viewingCustomer.portal_user_id && (
                      <div className="text-[11px] text-muted-text flex items-center gap-1.5 font-mono">
                        <span>Portal User ID:</span>
                        <span className="text-text font-semibold">{viewingCustomer.portal_user_id}</span>
                      </div>
                    )}

                    {isPortalDisabled(viewingCustomer) && (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <ShieldAlert size={14} className="text-rose-600 dark:text-rose-400" />
                          <span>Portal login is currently blocked</span>
                        </div>
                        {viewingCustomer.portal_access_disabled_reason && (
                          <p className="text-[11px] opacity-90">Reason: {viewingCustomer.portal_access_disabled_reason}</p>
                        )}
                        {viewingCustomer.portal_access_disabled_at && (
                          <p className="text-[10px] opacity-75">Disabled at: {new Date(viewingCustomer.portal_access_disabled_at).toLocaleString()}</p>
                        )}
                      </div>
                    )}

                    {/* MANUAL TOGGLE BUTTON */}
                    <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                      <p className="text-[11px] text-muted-text max-w-xs">
                        {isPortalDisabled(viewingCustomer)
                          ? "Re-enable access to restore portal authentication and features for this customer."
                          : "Explicitly revoke portal access without deleting the customer record."}
                      </p>

                      <Button
                        size="sm"
                        variant={isPortalDisabled(viewingCustomer) ? "primary" : "secondary"}
                        disabled={togglingPortalId === viewingCustomer.id}
                        onClick={() => handleTogglePortalAccess(viewingCustomer, isPortalDisabled(viewingCustomer))}
                        className={cn(
                          "gap-1.5 text-xs shadow-xs",
                          !isPortalDisabled(viewingCustomer) && "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/40"
                        )}
                      >
                        {togglingPortalId === viewingCustomer.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : isPortalDisabled(viewingCustomer) ? (
                          <ShieldCheck size={13} />
                        ) : (
                          <ShieldAlert size={13} />
                        )}
                        <span>
                          {isPortalDisabled(viewingCustomer) ? "Enable Portal Access" : "Disable Portal Access"}
                        </span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* MANUAL PORTAL INVITE BUTTON IN MODAL */}
                {!isPortalAccount(viewingCustomer) && (
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[11px] text-muted-text leading-relaxed max-w-xs">
                      Send a secure single-use magic link for client activation (valid for 48 hours).
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleSendPortalInvite(viewingCustomer)}
                      disabled={!viewingCustomer.email || sendingInviteId === viewingCustomer.id}
                      className="gap-1.5 shadow-xs"
                    >
                      {sendingInviteId === viewingCustomer.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      <span>{tUi("admin.customers.send_invite", currentLanguage) || "Send Portal Invite"}</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* AUDIT LOGS EXPANDABLE ACCORDION */}
              <div className="p-4 bg-background/50 border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History size={15} className="text-muted-text" />
                    <span className="text-xs font-semibold text-text uppercase tracking-wider">
                      {tUi("admin.customers.audit.title", currentLanguage)} ({auditLogs.length})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAuditLogs(!showAuditLogs)}
                    className="text-xs h-7 px-2"
                  >
                    {showAuditLogs
                      ? tUi("admin.customers.audit.hide_history", currentLanguage)
                      : tUi("admin.customers.audit.view_history", currentLanguage)}
                  </Button>
                </div>

                {showAuditLogs && (
                  <div className="space-y-2 pt-2 pr-1 border-t border-border/50 max-h-96 overflow-y-auto">
                    {loadingAuditLogs && (
                      <div className="flex items-center justify-center py-4 text-muted-text gap-2 text-xs">
                        <Loader2 size={14} className="animate-spin" />
                        <span>{tUi("admin.customers.audit.loading", currentLanguage)}</span>
                      </div>
                    )}
                    {!loadingAuditLogs && auditLogs.length === 0 && (
                      <p className="text-xs text-muted-text italic py-2 text-center">
                        {tUi("admin.customers.audit.empty", currentLanguage)}
                      </p>
                    )}
                    {!loadingAuditLogs && auditLogs.map((log) => {
                      const translateAudit = (key: string) => tUi(key, currentLanguage);
                      const processedDetails = getProcessedAuditDetails(log.details, translateAudit);
                      return (
                      <div key={log.id} className="p-3 rounded-lg bg-surface border border-border/60 text-xs space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-1 font-semibold text-primary text-[11px]">
                            {getAuditActionLabel(log.action, translateAudit)}
                          </span>
                          <span className="text-[10px] text-muted-text">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <div className="text-[11px] text-muted-text flex items-center justify-between gap-2 flex-wrap">
                          <span>{tUi("admin.customers.audit.performed_by", currentLanguage)}: <span className="text-text font-medium">{log.actor_email || log.actor_id || tUi("admin.customers.audit.system", currentLanguage)}</span></span>
                          {log.ip_address && <span className="text-[10px] opacity-75">{tUi("admin.customers.audit.ip_address", currentLanguage)}: {log.ip_address}</span>}
                        </div>
                        {processedDetails.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 bg-background/65 p-2.5 rounded-lg border border-border/40">
                            {processedDetails.map((detail, index) => (
                              <div key={`${detail.key}-${index}`} className={cn("min-w-0", detail.key === "reason" && "sm:col-span-2")}>
                                <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-text/75">{detail.label}</div>
                                <div className="mt-0.5 text-[11px] leading-relaxed text-text break-words">{detail.value}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                )}
              </div>

              {/* Properties Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-xs text-muted-text uppercase font-semibold flex items-center gap-1.5">
                  <Building size={14} className="text-primary" />
                  <span>{tUi("admin.customers.field_property_address", currentLanguage)} ({viewingProperties.length || (viewingCustomer.property_address ? 1 : 0)})</span>
                </div>

                {viewingProperties.length > 0 ? (
                  <div className="space-y-2">
                    {viewingProperties.map((p, idx) => (
                      <div key={p.id || idx} className="p-2.5 rounded-lg bg-surface border border-border flex items-start justify-between gap-2">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="text-xs font-semibold text-text">{p.property_name || `Property ${idx + 1}`}</div>
                          <div className="text-xs text-muted-text flex items-center gap-1">
                            <MapPin size={12} className="text-primary shrink-0" />
                            <span className="truncate">{p.address}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(p.address, p.id || String(idx))}
                            className="p-1 text-muted-text hover:text-text rounded hover:bg-muted/40"
                            title={tUi("client.home.copy_address")}
                          >
                            {copiedId === (p.id || String(idx)) ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-muted-text hover:text-primary rounded hover:bg-muted/40"
                            title="View on Maps"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : viewingCustomer.property_address ? (
                  <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-text flex items-center gap-1 truncate">
                      <MapPin size={12} className="text-primary shrink-0" />
                      <span className="truncate">{viewingCustomer.property_address}</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewingCustomer.property_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-muted-text hover:text-primary"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ) : (
                  <span className="text-muted-text italic text-xs">-</span>
                )}
              </div>

              {/* Links Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-xs text-muted-text uppercase font-semibold flex items-center gap-1.5">
                  <Globe size={14} className="text-primary" />
                  <span>{tUi("admin.customers.field_advertisement_link", currentLanguage)} ({viewingLinks.length || (viewingCustomer.advertisement_link ? 1 : 0)})</span>
                </div>

                {viewingLinks.length > 0 ? (
                  <div className="space-y-2">
                    {viewingLinks.map((l, idx) => (
                      <div key={l.id || idx} className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between gap-2">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="text-xs font-semibold text-text">{l.label || `Listing Link ${idx + 1}`}</div>
                          <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                            {l.url}
                          </a>
                        </div>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-primary hover:bg-primary/10 rounded"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : viewingCustomer.advertisement_link ? (
                  <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between gap-2">
                    <a
                      href={viewingCustomer.advertisement_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium break-all text-xs"
                    >
                      <span>{viewingCustomer.advertisement_link}</span>
                    </a>
                    <a
                      href={viewingCustomer.advertisement_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-primary"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ) : (
                  <span className="text-muted-text italic text-xs">-</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                <div className="space-y-1">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.customers.field_source", currentLanguage)}</div>
                  <div className="text-text">{viewingCustomer.source || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.customers.field_owner", currentLanguage)}</div>
                  <div className="text-text">{viewingCustomer.owner_id || '-'}</div>
                </div>
              </div>

              {viewingCustomer.notes && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.customers.field_notes", currentLanguage)}</div>
                  <div className="text-text bg-background/50 p-3 rounded-lg border border-border whitespace-pre-wrap">{viewingCustomer.notes}</div>
                </div>
              )}
            </CardContent>

            <div className="p-4 sm:p-5 border-t border-border flex justify-end gap-2 bg-surface/50 rounded-b-xl">
              <Button variant="secondary" onClick={() => setViewingCustomer(null)}>
                {tUi("admin.customers.cancel", currentLanguage) || "Close"}
              </Button>
              <Button onClick={() => { const customerToEdit = viewingCustomer; setViewingCustomer(null); setEditingCustomer(customerToEdit); setIsModalOpen(true); }}>
                <Edit2 size={15} className="mr-1.5" />
                {tUi("admin.customers.edit_customer", currentLanguage)}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      <CustomerModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
        }}
        initialData={editingCustomer}
        onSaved={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
          fetchCustomers();
        }}
      />
    </div>
  );
}
