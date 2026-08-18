import { useState, useEffect, useCallback } from "react";
import { CRMRecord, ClientProperty, ClientLink } from "../../lib/types";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { cn } from "../../lib/utils";
import { useLanguage } from "../../contexts/LanguageContext";
import { useApi } from "../../hooks/useApi";
import { ClientPropertyLinksManager } from "./ClientPropertyLinksManager";
import { 
  X, 
  AlertTriangle, 
  UserCheck, 
  ArrowRight,
  Sparkles,
  Loader2,
  Check,
  KeyRound,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";

export interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (savedCustomer: CRMRecord) => void;
  initialData?: Partial<CRMRecord> | null;
  linkedContactId?: string | null;
  onOpenExistingCustomer?: (customer: CRMRecord) => void;
}

export function CustomerModal({
  isOpen,
  onClose,
  onSaved,
  initialData,
  linkedContactId,
  onOpenExistingCustomer
}: CustomerModalProps) {
  const { currentLanguage, tUi } = useLanguage();
  const { fetchApi } = useApi();

  const [formData, setFormData] = useState<Partial<CRMRecord>>({
    status: 'active',
    property_address: '',
    advertisement_link: '',
    notes: '',
    source: '',
    owner_id: ''
  });

  const [properties, setProperties] = useState<Partial<ClientProperty>[]>([]);
  const [links, setLinks] = useState<Partial<ClientLink>[]>([]);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Duplicate email detection
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<CRMRecord | null>(null);

  // Portal Account live detection state
  const [hasPortalAccount, setHasPortalAccount] = useState<boolean>(false);
  const [portalUserId, setPortalUserId] = useState<string | null>(null);
  const [portalUserIsActive, setPortalUserIsActive] = useState<number | null>(null);
  const [portalDisabledReason, setPortalDisabledReason] = useState<string | null>(null);
  const [portalDisabledAt, setPortalDisabledAt] = useState<string | null>(null);
  const [reEnablePortal, setReEnablePortal] = useState<boolean>(true);
  const [checkingPortal, setCheckingPortal] = useState(false);

  const checkPortalStatus = useCallback(async (emailToCheck: string) => {
    const trimmed = emailToCheck.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setHasPortalAccount(false);
      setPortalUserId(null);
      setPortalUserIsActive(null);
      setPortalDisabledReason(null);
      setPortalDisabledAt(null);
      return;
    }

    try {
      setCheckingPortal(true);
      const res = await fetchApi(`/api/admin/crm/check-portal?email=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        setHasPortalAccount(Boolean(data.has_portal_account));
        setPortalUserId(data.portal_user?.id || null);
        setPortalUserIsActive(data.portal_user ? data.portal_user.is_active : null);
        setPortalDisabledReason(data.portal_user?.portal_access_disabled_reason || null);
        setPortalDisabledAt(data.portal_user?.portal_access_disabled_at || null);
      }
    } catch (err) {
      console.warn("Failed to check portal status:", err);
    } finally {
      setCheckingPortal(false);
    }
  }, [fetchApi]);

  const loadPropertiesAndLinks = useCallback(async (crmId: string) => {
    try {
      const [pRes, lRes] = await Promise.all([
        fetchApi(`/api/admin/crm/${crmId}/properties`),
        fetchApi(`/api/admin/crm/${crmId}/links`)
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData) && pData.length > 0) {
          setProperties(pData);
        }
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        if (Array.isArray(lData) && lData.length > 0) {
          setLinks(lData);
        }
      }
    } catch (e) {
      console.warn("Could not load customer properties/links:", e);
    }
  }, [fetchApi]);

  useEffect(() => {
    if (isOpen) {
      const initial = initialData || {};
      const initialHasPortal = Boolean(
        initial.has_portal_account === 1 || 
        initial.has_portal_account === true || 
        Boolean(initial.portal_user_id)
      );

      setFormData({
        id: initial.id,
        name: initial.name || '',
        email: initial.email || '',
        phone: initial.phone || '',
        property_address: initial.property_address || '',
        advertisement_link: initial.advertisement_link || '',
        status: initial.status || 'active',
        source: initial.source || (linkedContactId ? 'Website Contact Form' : ''),
        owner_id: initial.owner_id || '',
        notes: initial.notes || '',
      });

      // Initialize properties
      if (initial.properties && initial.properties.length > 0) {
        setProperties(initial.properties);
      } else if (initial.property_address && initial.property_address.trim()) {
        setProperties([{
          id: crypto.randomUUID(),
          property_name: "Primary Property",
          address: initial.property_address.trim(),
          sort_order: 0
        }]);
      } else {
        setProperties([]);
      }

      // Initialize links
      if (initial.links && initial.links.length > 0) {
        setLinks(initial.links);
      } else if (initial.advertisement_link && initial.advertisement_link.trim()) {
        setLinks([{
          id: crypto.randomUUID(),
          label: "Main Listing / Ad Link",
          url: initial.advertisement_link.trim(),
          sort_order: 0
        }]);
      } else {
        setLinks([]);
      }

      setErrorMessage("");
      setExistingCustomer(null);
      setHasPortalAccount(initialHasPortal);
      setPortalUserId(initial.portal_user_id || null);
      setPortalUserIsActive(initial.portal_user_is_active !== undefined ? initial.portal_user_is_active : null);
      setPortalDisabledReason(initial.portal_access_disabled_reason || null);
      setPortalDisabledAt(initial.portal_access_disabled_at || null);
      setReEnablePortal(true);

      if (initial.id) {
        loadPropertiesAndLinks(initial.id);
      } else if (initial.email) {
        checkDuplicateEmail(initial.email);
        checkPortalStatus(initial.email);
      }
    }
  }, [isOpen, initialData, linkedContactId, checkPortalStatus, loadPropertiesAndLinks]);

  const checkDuplicateEmail = async (emailToCheck: string) => {
    const trimmed = emailToCheck.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setExistingCustomer(null);
      return;
    }

    try {
      setCheckingEmail(true);
      const res = await fetchApi(`/api/admin/crm/check-email?email=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.exists && data.customer) {
          if (formData.id && formData.id === data.customer.id) {
            setExistingCustomer(null);
          } else {
            setExistingCustomer(data.customer);
          }
        } else {
          setExistingCustomer(null);
        }

        if (data.has_portal_account !== undefined) {
          setHasPortalAccount(Boolean(data.has_portal_account));
          setPortalUserId(data.portal_user?.id || null);
        }
      }
    } catch (err) {
      console.warn("Failed to check duplicate email", err);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailChange = (newEmail: string) => {
    setFormData(prev => ({ ...prev, email: newEmail }));
    if (newEmail.includes("@") && newEmail.length > 3) {
      if (!formData.id && newEmail.length > 5) {
        checkDuplicateEmail(newEmail);
      }
      checkPortalStatus(newEmail);
    } else {
      setExistingCustomer(null);
      setHasPortalAccount(false);
      setPortalUserId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setErrorMessage(tUi("admin.customers.field_name", currentLanguage) + " is required");
      return;
    }

    const cleanProperties = properties
      .map(p => ({
        property_name: p.property_name?.trim() || "Property",
        address: p.address?.trim() || "",
        metadata: p.metadata
      }))
      .filter(p => p.address.length > 0);

    const cleanLinks = links
      .map(l => ({
        label: l.label?.trim() || "Listing Link",
        url: l.url?.trim() || "",
        metadata: l.metadata
      }))
      .filter(l => l.url.length > 0);

    const primaryAddress = cleanProperties.length > 0 ? cleanProperties[0].address : null;
    const primaryLink = cleanLinks.length > 0 ? cleanLinks[0].url : null;

    setErrorMessage("");

    try {
      setSaving(true);
      const payload = {
        ...formData,
        name: formData.name.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        property_address: primaryAddress,
        advertisement_link: primaryLink,
        properties: cleanProperties,
        links: cleanLinks,
        source: formData.source?.trim() || null,
        owner_id: formData.owner_id?.trim() || null,
        notes: formData.notes?.trim() || null,
        type: 'customer',
        status: formData.status || 'active',
        re_enable_portal: reEnablePortal,
        linked_contact_id: linkedContactId || null,
      };

      let savedRecord: CRMRecord;

      if (formData.id) {
        const res = await fetchApi(`/api/admin/crm/${formData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update customer");
        }
        const data = await res.json();
        savedRecord = data.record || ({ ...payload, id: formData.id, has_portal_account: hasPortalAccount ? 1 : 0, portal_user_id: portalUserId } as CRMRecord);
      } else {
        const res = await fetchApi(`/api/admin/crm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to create customer");
        }
        const data = await res.json();
        savedRecord = data.record || ({ ...payload, id: data.id, has_portal_account: hasPortalAccount ? 1 : 0, portal_user_id: portalUserId } as CRMRecord);
      }

      onClose();
      if (onSaved) {
        onSaved(savedRecord);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = Boolean(formData.id);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl shadow-2xl max-h-[94vh] flex flex-col my-auto border-border animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-text">
                {isEditing 
                  ? tUi("admin.customers.modal_title_edit", currentLanguage) 
                  : tUi("admin.customers.modal_title_add", currentLanguage)}
              </h3>
              {linkedContactId && !isEditing && (
                <p className="text-xs text-muted-text flex items-center gap-1 mt-0.5">
                  <Sparkles size={12} className="text-primary" />
                  <span>Prefilled from contact submission</span>
                </p>
              )}
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-muted-text hover:text-text transition-colors p-1.5 rounded-lg hover:bg-muted/40"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <CardContent className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 rounded-lg text-xs font-medium text-rose-800 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* DUPLICATE CUSTOMER WARNING BANNER */}
          {existingCustomer && !isEditing && (
            <div className="bg-amber-500/10 border border-amber-500/30 dark:bg-amber-950/30 dark:border-amber-700/50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md shrink-0 mt-0.5">
                  <AlertTriangle size={17} />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-text">
                    {tUi("admin.submissions.customer_exists_warning", currentLanguage) || "A customer with this email already exists"}
                  </div>
                  <p className="text-xs text-muted-text leading-relaxed">
                    Customer <strong>{existingCustomer.name}</strong> is already registered with email <span className="font-mono text-text">{existingCustomer.email}</span>.
                  </p>
                </div>
              </div>
              
              {onOpenExistingCustomer && (
                <div className="pt-1 flex items-center justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenExistingCustomer(existingCustomer);
                    }}
                    className="flex items-center gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                  >
                    <span>{tUi("admin.submissions.view_existing_customer", currentLanguage) || "Open Existing Customer"}</span>
                    <ArrowRight size={13} />
                  </Button>
                </div>
              )}
            </div>
          )}

          <form id="customer-modal-form" onSubmit={handleSave} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-text uppercase tracking-wider block">
                {tUi("admin.customers.field_name", currentLanguage)} <span className="text-rose-500">*</span>
              </label>
              <Input 
                required 
                placeholder="e.g. John Doe"
                value={formData.name || ''} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              />
            </div>
            
            {/* Email and Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-text uppercase tracking-wider block">
                    {tUi("admin.customers.field_email", currentLanguage)}
                  </label>
                  {(checkingEmail || checkingPortal) && (
                    <span className="text-[11px] text-muted-text flex items-center gap-1">
                      <Loader2 size={11} className="animate-spin text-primary" />
                      Checking...
                    </span>
                  )}
                </div>
                <Input 
                  type="email" 
                  placeholder="john@example.com"
                  value={formData.email || ''} 
                  onChange={(e) => handleEmailChange(e.target.value)} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-text uppercase tracking-wider block">
                  {tUi("admin.customers.field_phone", currentLanguage)}
                </label>
                <Input 
                  type="tel" 
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone || ''} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                />
              </div>
            </div>

            {/* READ-ONLY FIELD: HAS PORTAL ACCOUNT & STATUS */}
            <div className="p-3.5 bg-background/60 border border-border rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound size={15} className="text-primary" />
                  <label className="text-xs font-semibold text-text">
                    {tUi("admin.customers.has_portal_account", currentLanguage)}
                  </label>
                  <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-text border border-border">
                    Read-Only
                  </span>
                </div>
                {checkingPortal && (
                  <Loader2 size={13} className="animate-spin text-primary" />
                )}
              </div>

              <div className="flex items-center justify-between pt-0.5 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center border transition-colors",
                    hasPortalAccount 
                      ? (portalUserIsActive === 0 ? "bg-rose-500 text-white border-rose-500" : "bg-primary text-primary-foreground border-primary")
                      : "bg-muted/40 text-transparent border-border"
                  )}>
                    {hasPortalAccount && <Check size={13} strokeWidth={3} />}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    hasPortalAccount 
                      ? (portalUserIsActive === 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-primary font-semibold") 
                      : "text-muted-text"
                  )}>
                    {hasPortalAccount 
                      ? (portalUserIsActive === 0 ? "Portal Account Disabled" : tUi("admin.customers.portal_account_yes", currentLanguage))
                      : tUi("admin.customers.portal_account_no", currentLanguage)}
                  </span>
                </div>

                {hasPortalAccount && portalUserId && (
                  <span className="text-[11px] font-mono text-muted-text bg-surface px-2 py-0.5 rounded border border-border">
                    ID: {portalUserId.slice(0, 8)}...
                  </span>
                )}
              </div>

              {hasPortalAccount && portalUserIsActive === 0 && (
                <div className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 rounded-lg p-2.5 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-rose-600 dark:text-rose-400" />
                    <span>Portal Access is currently Disabled</span>
                  </div>
                  {portalDisabledReason && (
                    <p className="text-[11px] opacity-90">Reason: {portalDisabledReason}</p>
                  )}
                  {portalDisabledAt && (
                    <p className="text-[10px] opacity-75">Disabled at: {new Date(portalDisabledAt).toLocaleString()}</p>
                  )}
                </div>
              )}

              <p className="text-[11px] text-muted-text leading-relaxed">
                {tUi("admin.customers.has_portal_account_desc", currentLanguage)} (automatically matched by email address).
              </p>
            </div>

            {/* UNLIMITED PROPERTIES & LISTING LINKS MANAGER */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-text uppercase tracking-wider block">
                Properties & Listing Links (Unlimited)
              </label>
              <ClientPropertyLinksManager
                properties={properties}
                links={links}
                onChangeProperties={setProperties}
                onChangeLinks={setLinks}
              />
            </div>

            {/* Status and Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-text uppercase tracking-wider block">
                  {tUi("admin.customers.field_status", currentLanguage)}
                </label>
                <select 
                  className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={formData.status || 'active'} 
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">{tUi("admin.customers.status_active", currentLanguage)}</option>
                  <option value="inactive">{tUi("admin.customers.status_inactive", currentLanguage)}</option>
                  <option value="churned">{tUi("admin.customers.status_churned", currentLanguage)}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-text uppercase tracking-wider block">
                  {tUi("admin.customers.field_source", currentLanguage)}
                </label>
                <Input 
                  placeholder={tUi("admin.customers.field_source_placeholder", currentLanguage)} 
                  value={formData.source || ''} 
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })} 
                />
              </div>
            </div>

            {/* AUTOMATIC PORTAL DISABLE WARNING / RE-ENABLE OPTION */}
            {formData.status === 'inactive' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-xs text-amber-950 dark:text-amber-200">
                <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                  <ShieldAlert size={16} className="shrink-0" />
                  <span>Automatic Portal Access Enforcement</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Setting this customer to <strong>Inactive</strong> will automatically disable their client portal user account, revoke login permissions, and immediately terminate any active authentication sessions.
                </p>
              </div>
            )}

            {formData.status === 'active' && hasPortalAccount && (initialData?.status === 'inactive' || portalUserIsActive === 0) && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck size={16} className="shrink-0" />
                  <span>Re-enable Portal Access</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-text text-xs">
                  <input
                    type="checkbox"
                    checked={reEnablePortal}
                    onChange={(e) => setReEnablePortal(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Re-activate portal login for this customer account upon saving</span>
                </label>
              </div>
            )}

            {/* Owner / Assignee */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-text uppercase tracking-wider block">
                {tUi("admin.customers.field_owner", currentLanguage)}
              </label>
              <Input 
                placeholder={tUi("admin.customers.field_owner_placeholder", currentLanguage)} 
                value={formData.owner_id || ''} 
                onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })} 
              />
            </div>

            {/* Internal Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-text uppercase tracking-wider block">
                {tUi("admin.customers.field_notes", currentLanguage)}
              </label>
              <textarea 
                className="w-full h-24 bg-surface border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors text-text"
                placeholder="Private notes about customer requirements, billing, or background..."
                value={formData.notes || ''} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
              />
            </div>
          </form>
        </CardContent>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 bg-surface/50 rounded-b-xl">
          <Button 
            type="button"
            variant="secondary" 
            onClick={onClose}
            disabled={saving}
          >
            {tUi("admin.customers.cancel", currentLanguage)}
          </Button>
          <Button 
            form="customer-modal-form" 
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>{tUi("admin.customers.save_customer", currentLanguage)}</span>
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
