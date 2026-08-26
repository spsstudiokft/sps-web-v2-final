import { useLanguage } from "../../../contexts/LanguageContext";
import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  UploadCloud, 
  FileText, 
  Trash2, 
  Link as LinkIcon, 
  DollarSign, 
  Calendar, 
  User, 
  AlertCircle, 
  Check, 
  RotateCcw,
  CreditCard,
  Building2,
  Paperclip
} from "lucide-react";
import { PaymentRequest, PaymentRequestAttachment } from "../../../types";
import { PaymentRequestCategoryOption } from "./PaymentRequestCategoriesModal";

interface PaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestToEdit?: PaymentRequest | null;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  defaultCurrency?: string;
  token: string | null;
  onSuccess: (message: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  categories?: PaymentRequestCategoryOption[];
}

export function PaymentRequestModal({
  isOpen,
  onClose,
  requestToEdit,
  currentUserId,
  currentUserName,
  currentUserEmail,
  defaultCurrency = "USD",
  token,
  onSuccess,
  showToast,
  categories = []
}: PaymentRequestModalProps) {
  const { tUi } = useLanguage();
  const isEditing = !!requestToEdit;
  const isResubmitting = requestToEdit && (requestToEdit.status === "denied" || requestToEdit.status === "on_hold");

  const [title, setTitle] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [category, setCategory] = useState<string>("general");
  const [description, setDescription] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [beneficiaryName, setBeneficiaryName] = useState<string>("");
  const [beneficiaryAccount, setBeneficiaryAccount] = useState<string>("");

  // Linking state
  const [linkType, setLinkType] = useState<"none" | "budget_entry" | "invoice">("none");
  const [linkedBudgetEntryId, setLinkedBudgetEntryId] = useState<string>("");
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [availableBudgetEntries, setAvailableBudgetEntries] = useState<any[]>([]);
  const [availableInvoices, setAvailableInvoices] = useState<any[]>([]);

  // Attachments state
  const [attachments, setAttachments] = useState<PaymentRequestAttachment[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch available links
  useEffect(() => {
    if (!isOpen || !token) return;

    const fetchLinks = async () => {
      try {
        const res = await fetch("/api/admin/payment-requests/links-lookup", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableBudgetEntries(data.budgetEntries || []);
          setAvailableInvoices(data.invoices || []);
        }
      } catch (err) {
        console.warn("Failed to fetch links lookup", err);
      }
    };

    fetchLinks();
    void fetch("/api/admin/projects", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.ok ? res.json() : [])
      .then((rows) => setProjects(Array.isArray(rows) ? rows : []))
      .catch(() => setProjects([]));
  }, [isOpen, token]);

  // Initialize form state
  useEffect(() => {
    if (requestToEdit) {
      setTitle(requestToEdit.title || "");
      setAmount(requestToEdit.amount ? requestToEdit.amount.toString() : "");
      setCurrency(requestToEdit.currency || defaultCurrency);
      setCategory(requestToEdit.category || "general");
      setDescription(requestToEdit.description || "");
      setDueDate(requestToEdit.due_date || "");
      setPaymentMethod(requestToEdit.payment_method || "bank_transfer");
      setBeneficiaryName(requestToEdit.beneficiary_name || "");
      setBeneficiaryAccount(requestToEdit.beneficiary_account || "");
      setLinkType((requestToEdit.link_type as any) || (requestToEdit.linked_budget_entry_id ? "budget_entry" : requestToEdit.linked_invoice_id ? "invoice" : "none"));
      setLinkedBudgetEntryId(requestToEdit.linked_budget_entry_id || "");
      setLinkedInvoiceId(requestToEdit.linked_invoice_id || "");
      setProjectId(requestToEdit.project_id || "");
      setAttachments(requestToEdit.attachments || []);
    } else {
      setTitle("");
      setAmount("");
      setCurrency(defaultCurrency);
      setCategory("contractor");
      setDescription("");
      setDueDate("");
      setPaymentMethod("bank_transfer");
      setBeneficiaryName("");
      setBeneficiaryAccount("");
      setLinkType("none");
      setLinkedBudgetEntryId("");
      setLinkedInvoiceId("");
      setProjectId("");
      setAttachments([]);
    }
    setErrorMsg(null);
  }, [requestToEdit, isOpen, defaultCurrency]);

  if (!isOpen) return null;

  // File Upload Handler
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !token) return;

    setIsUploading(true);
    setErrorMsg(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/admin/payment-requests/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to upload file");
        }

        const data = await res.json();
        if (data.file) {
          setAttachments((prev) => [...prev, data.file]);
        }
      } catch (err: any) {
        showToast(err.message || "Failed to upload attachment", "error");
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const numAmount = parseFloat(amount);
    if (!title.trim()) {
      setErrorMsg("Please enter a subject / title for this payment request.");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter a valid positive payment amount.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      title: title.trim(),
      amount: numAmount,
      currency: currency.toUpperCase(),
      category,
      description: description.trim(),
      link_type: linkType,
      linked_budget_entry_id: linkType === "budget_entry" && linkedBudgetEntryId ? linkedBudgetEntryId : null,
      linked_invoice_id: linkType === "invoice" && linkedInvoiceId ? linkedInvoiceId : null,
      project_id: projectId || null,
      due_date: dueDate,
      payment_method: paymentMethod,
      beneficiary_name: beneficiaryName.trim(),
      beneficiary_account: beneficiaryAccount.trim(),
      attachments
    };

    try {
      const url = isEditing
        ? `/api/admin/payment-requests/${requestToEdit.id}`
        : `/api/admin/payment-requests`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save payment request");
      }

      onSuccess(
        isResubmitting
          ? "Payment request successfully resubmitted for Superadmin review"
          : isEditing
          ? "Payment request updated successfully"
          : `Payment request ${data.request_number || ""} submitted for review`
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
          <div>
            <h2 className="text-base font-bold text-text flex items-center gap-2">
              {isResubmitting ? (
                <>
                  <RotateCcw className="w-5 h-5 text-amber-500" />
                  <span>Resubmit Payment Request ({requestToEdit.request_number})</span>
                </>
              ) : isEditing ? (
                <>
                  <FileText className="w-5 h-5 text-primary" />
                  <span>Edit Payment Request ({requestToEdit.request_number})</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span>{tUi("admin.payment_requests.new")}</span>
                </>
              )}
            </h2>
            <p className="text-xs text-muted-text mt-0.5">
              Submit an expense, contractor reimbursement, or vendor payout for Superadmin approval.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Requester Info Strip */}
        <div className="px-6 py-2.5 bg-primary/5 border-b border-border/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span className="text-muted-text">Requester:</span>
            <span className="font-semibold text-text">{currentUserName || currentUserEmail}</span>
            <span className="text-muted-text">({currentUserEmail})</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
            Routes to Superadmin
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Previous Denial Note (if resubmitting) */}
          {isResubmitting && requestToEdit.review_notes && (
            <div className="p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Superadmin Reviewer Feedback:</span>
              </div>
              <p className="text-text italic">"{requestToEdit.review_notes}"</p>
            </div>
          )}

          {/* 1. Subject / Purpose */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Request Title / Purpose <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Drone Pilot Contractor Fee - Sunset Beach Shoot, Studio Backdrop Paper"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* 2. Amount & Currency & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                {tUi("admin.budget.table.th_amount")}<span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                {tUi("admin.extra_services.field_currency")}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="HUF">HUF (Ft)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="CHF">CHF (Fr)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Expense Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Reason & Justification */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Description & Business Justification
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, project reference, breakdown of deliverables, or reason for this expenditure..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </div>

          {/* 4. Link Reference Section */}
          <div className="p-3.5 bg-surface-hover/40 border border-border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-primary" />
                <span>Link to Existing System Record (Optional)</span>
              </label>
              <div className="flex items-center gap-1">
                {[
                  { id: "none", label: "None" },
                  { id: "budget_entry", label: "Budget Entry" },
                  { id: "invoice", label: "Client Invoice" }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setLinkType(t.id as any)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      linkType === t.id
                        ? "bg-primary text-white"
                        : "bg-surface text-muted-text hover:text-text"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {linkType === "budget_entry" && (
              <div>
                <select
                  value={linkedBudgetEntryId}
                  onChange={(e) => setLinkedBudgetEntryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Select linked Budget Entry --</option>
                  {availableBudgetEntries.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.date}] {b.description} ({b.amount} {b.currency} • {b.type})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-text mt-1">
                  Upon approval, this budget entry will automatically be synchronized and confirmed.
                </p>
              </div>
            )}

            {linkType === "invoice" && (
              <div>
                <select
                  value={linkedInvoiceId}
                  onChange={(e) => setLinkedInvoiceId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Select linked Client Invoice --</option>
                  {availableInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} – {inv.client_name} ({inv.total_amount} {inv.currency})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 5. Payment Details (Due Date, Beneficiary, Method) */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">{tUi("admin.budget.modal.linked_project")}<span className="font-normal text-muted-text">{tUi("admin.budget.optional")}</span></label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">{tUi("admin.budget.modal.no_project")}</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Target Payment Due Date
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Preferred Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="bank_transfer">Direct Bank Transfer / Wire</option>
                <option value="credit_card_reimbursement">Credit Card Reimbursement</option>
                <option value="revolut">Revolut / Fintech</option>
                <option value="paypal">PayPal</option>
                <option value="cash">Petty Cash</option>
                <option value="other">Other Method</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Payee / Beneficiary Name
              </label>
              <input
                type="text"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="e.g. John Doe, Adorama Camera Inc."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Payee Account / IBAN / Email
              </label>
              <input
                type="text"
                value={beneficiaryAccount}
                onChange={(e) => setBeneficiaryAccount(e.target.value)}
                placeholder="IBAN, account #, or PayPal email"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary font-mono text-[11px]"
              />
            </div>
          </div>

          {/* 6. Attachments (Receipts, Vendor Invoices, PDFs) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-text">
              Attachments (Receipts, Invoices, Proof of Purchase)
            </label>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-surface-hover/20 hover:bg-surface-hover/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf,image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <UploadCloud className="w-6 h-6 text-primary mx-auto mb-1" />
              <div className="text-xs font-medium text-text">
                Click or drag & drop receipts or vendor invoices here
              </div>
              <div className="text-[10px] text-muted-text mt-0.5">
                PDF, JPG, PNG, WEBP up to 30MB
              </div>
              {isUploading && (
                <div className="text-xs text-primary font-medium mt-2 animate-pulse">
                  Uploading files...
                </div>
              )}
            </div>

            {/* Uploaded Files List */}
            {attachments.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2 bg-surface-hover/60 border border-border rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-text font-medium truncate max-w-xs">{att.name}</span>
                      {att.size && (
                        <span className="text-[10px] text-muted-text">
                          ({(att.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline font-medium px-2 py-0.5"
                      >
                        {tUi("admin.clients.view")}</a>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="p-1 text-muted-text hover:text-rose-500 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-hover/30 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-muted-text hover:text-text rounded-lg transition-colors cursor-pointer"
          >
            {tUi("admin.clients.cancel")}</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            className="px-5 py-2 text-xs font-semibold bg-primary text-white hover:bg-primary/90 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : isResubmitting ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resubmit Request</span>
              </>
            ) : isEditing ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{tUi("admin.clients.save_changes")}</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Submit for Approval</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
