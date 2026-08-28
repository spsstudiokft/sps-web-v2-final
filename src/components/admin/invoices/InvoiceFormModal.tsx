import { useLanguage } from "../../../contexts/LanguageContext";
import React, { useState, useEffect } from "react";
import { 
  X, 
  Plus, 
  Trash2, 
  FileText, 
  Calendar, 
  User, 
  DollarSign, 
  Percent, 
  Link as LinkIcon,
  Layers,
  HelpCircle,
  Building,
  Mail,
  Phone,
  CreditCard,
  Check
} from "lucide-react";
import { Invoice, InvoiceItem, BudgetEntry } from "../../../types";
import { Button } from "../../ui/Button";
import { formatConfiguredCurrency } from "../../../lib/currency";

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: any) => Promise<void>;
  editingInvoice?: Invoice | null;
  budgetEntryToConvert?: BudgetEntry | null;
  budgetEntries?: BudgetEntry[];
  currency?: string;
  clientsLookup?: any[];
  initialData?: Partial<Invoice> | null;
  showToast: (message: string, type?: "success" | "error") => void;
}

interface FormLineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
}

export function InvoiceFormModal({
  isOpen,
  onClose,
  onSave,
  editingInvoice,
  budgetEntryToConvert,
  budgetEntries = [],
  currency = "USD",
  clientsLookup = [],
  initialData = null,
  showToast
}: InvoiceFormModalProps) {
  const { tUi } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [projectId, setProjectId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [projects, setProjects] = useState<Array<{ id: string; name: string; client_id?: string | null }>>([]);
  const [clientProperties, setClientProperties] = useState<Array<{ id: string; property_name?: string; address: string }>>([]);
  const [selectedCurrency, setSelectedCurrency] = useState(currency || "USD");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const [status, setStatus] = useState<string>("draft");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState("Payment is due within 14 days of invoice issue date.");
  const [notes, setNotes] = useState("");
  const [paymentMethodInstructions, setPaymentMethodInstructions] = useState(
    "Please send payment via bank transfer to SPS Studio or use the instant payment link provided."
  );
  const [paymentLink, setPaymentLink] = useState("");
  const [budgetEntryId, setBudgetEntryId] = useState<string>("");
  const [createBudgetEntry, setCreateBudgetEntry] = useState(false);

  // Line items
  const [items, setItems] = useState<FormLineItem[]>([
    {
      description: "Real Estate Photography & Visual Media Production",
      quantity: 1,
      unit_price: 350,
      tax_rate: 0,
      total: 350
    }
  ]);

  // Fetch next sequential invoice number if creating fresh
  useEffect(() => {
    if (!isOpen) return;

    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.invoice_number);
      setClientId(editingInvoice.client_id || "");
      setClientName(editingInvoice.client_name);
      setClientEmail(editingInvoice.client_email);
      setClientPhone(editingInvoice.client_phone || "");
      setClientAddress(editingInvoice.client_address || "");
      setPropertyAddress(editingInvoice.property_address || "");
      setProjectId(editingInvoice.project_id || "");
      setPropertyId(editingInvoice.property_id || "");
      setSelectedCurrency(editingInvoice.currency || currency);
      setIssueDate(editingInvoice.issue_date);
      setDueDate(editingInvoice.due_date);
      setStatus(editingInvoice.status);
      setTaxRate(Number(editingInvoice.tax_rate || 0));
      setDiscountAmount(Number(editingInvoice.discount_amount || 0));
      setPaymentTerms(editingInvoice.payment_terms || "");
      setNotes(editingInvoice.notes || "");
      setPaymentMethodInstructions(editingInvoice.payment_method_instructions || "");
      setPaymentLink(editingInvoice.payment_link || "");
      setBudgetEntryId(editingInvoice.budget_entry_id || "");
      setCreateBudgetEntry(false);

      if (editingInvoice.items && editingInvoice.items.length > 0) {
        setItems(
          editingInvoice.items.map((it) => ({
            id: it.id,
            description: it.description,
            quantity: Number(it.quantity || 1),
            unit_price: Number(it.unit_price || 0),
            tax_rate: Number(it.tax_rate || 0),
            total: Number(it.total || 0)
          }))
        );
      }
    } else if (budgetEntryToConvert) {
      // Pre-fill from converted budget entry
      setInvoiceNumber("");
      fetchNextNumber();
      setBudgetEntryId(budgetEntryToConvert.id);
      setSelectedCurrency(budgetEntryToConvert.currency || currency);
      setIssueDate(budgetEntryToConvert.date || new Date().toISOString().split("T")[0]);
      setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
      setNotes(`Generated from cashflow record: ${budgetEntryToConvert.description}`);
      setCreateBudgetEntry(false);
      setItems([
        {
          description: budgetEntryToConvert.description || "Real Estate Media Production",
          quantity: 1,
          unit_price: Number(budgetEntryToConvert.amount || 0),
          tax_rate: 0,
          total: Number(budgetEntryToConvert.amount || 0)
        }
      ]);
    } else if (initialData) {
      setInvoiceNumber("");
      fetchNextNumber();
      setClientId(initialData.client_id || "");
      setClientName(initialData.client_name || "");
      setClientEmail(initialData.client_email || "");
      setClientPhone(initialData.client_phone || "");
      setClientAddress(initialData.client_address || "");
      setPropertyAddress(initialData.property_address || "");
      setProjectId(initialData.project_id || "");
      setPropertyId(initialData.property_id || "");
      setSelectedCurrency(initialData.currency || currency);
      setIssueDate(initialData.issue_date || new Date().toISOString().split("T")[0]);
      setDueDate(initialData.due_date || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
      setStatus(initialData.status || "draft");
      setItems(initialData.items?.length ? initialData.items.map((item) => ({ ...item, quantity: Number(item.quantity || 1), unit_price: Number(item.unit_price || 0), tax_rate: Number(item.tax_rate || 0), total: Number(item.total || 0) })) : [{ description: initialData.notes || "Real Estate Media Production", quantity: 1, unit_price: Number(initialData.total_amount || 0), tax_rate: 0, total: Number(initialData.total_amount || 0) }]);
    } else {
      // Clean new invoice
      resetForm();
      fetchNextNumber();
    }
  }, [isOpen, editingInvoice, budgetEntryToConvert, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
    void fetch("/api/admin/projects", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.ok ? res.json() : [])
      .then((rows) => setProjects(Array.isArray(rows) ? rows : []))
      .catch(() => setProjects([]));
  }, [isOpen]);

  useEffect(() => {
    if (!clientId) { setClientProperties([]); return; }
    const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
    void fetch(`/api/admin/clients/${clientId}/properties`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.ok ? res.json() : [])
      .then((rows) => setClientProperties(Array.isArray(rows) ? rows : []))
      .catch(() => setClientProperties([]));
  }, [clientId]);

  const resetForm = () => {
    setInvoiceNumber("");
    setClientId("");
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setClientAddress("");
    setPropertyAddress("");
    setProjectId("");
    setPropertyId("");
    setSelectedCurrency(currency || "USD");
    setIssueDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
    setStatus("draft");
    setTaxRate(0);
    setDiscountAmount(0);
    setPaymentTerms("Payment is due within 14 days of invoice issue date.");
    setNotes("");
    setPaymentMethodInstructions(
      "Please send payment via bank transfer to SPS Studio or use the instant payment link provided."
    );
    setPaymentLink("");
    setBudgetEntryId("");
    setCreateBudgetEntry(true);
    setItems([
      {
        description: "Real Estate Photography & Visual Media Production",
        quantity: 1,
        unit_price: 350,
        tax_rate: 0,
        total: 350
      }
    ]);
  };

  const fetchNextNumber = async () => {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/invoices/next-number", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setInvoiceNumber(data.nextInvoiceNumber);
      }
    } catch (e) {
      console.error("Failed to fetch next number", e);
    }
  };

  const handleClientSelect = (cEmail: string) => {
    const found = clientsLookup.find((c) => c.email.toLowerCase() === cEmail.toLowerCase());
    if (found) {
      setClientId(found.id || "");
      setClientName(found.name || "");
      setClientEmail(found.email || "");
      setClientPhone(found.phone || "");
      setProjectId("");
      setPropertyId("");
      if (found.property_address && !propertyAddress) {
        setPropertyAddress(found.property_address);
      }
    }
  };

  // Line item handlers
  const handleItemChange = (index: number, field: keyof FormLineItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === "quantity" || field === "unit_price") {
      const qty = field === "quantity" ? Number(value) : item.quantity;
      const price = field === "unit_price" ? Number(value) : item.unit_price;
      item[field] = Number(value);
      item.total = Math.round(qty * price * 100) / 100;
    } else {
      (item as any)[field] = value;
    }

    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: "",
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
        total: 0
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      showToast("Invoice must contain at least one line item", "error");
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Calculations
  const subtotal = items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  const taxAmount = (subtotal * Number(taxRate || 0)) / 100;
  const totalAmount = Math.max(0, subtotal + taxAmount - Number(discountAmount || 0));

  const formatMoney = (val: number) => formatConfiguredCurrency(val, selectedCurrency || "USD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim()) {
      showToast("Client name and email are required", "error");
      return;
    }

    if (items.some((it) => !it.description.trim())) {
      showToast("All line items must have a valid description", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        invoice_number: invoiceNumber,
        client_id: clientId || null,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        client_address: clientAddress.trim(),
        property_address: propertyAddress.trim(),
        project_id: projectId || null,
        property_id: propertyId || null,
        issue_date: issueDate,
        due_date: dueDate,
        currency: selectedCurrency,
        status,
        tax_rate: Number(taxRate || 0),
        discount_amount: Number(discountAmount || 0),
        payment_terms: paymentTerms,
        notes: notes,
        payment_method_instructions: paymentMethodInstructions,
        payment_link: paymentLink,
        budget_entry_id: budgetEntryId || null,
        create_budget_entry: createBudgetEntry,
        items
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error("Save invoice error:", err);
      showToast(err.message || "Failed to save invoice", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text font-heading">
                {editingInvoice ? `Edit Invoice: ${editingInvoice.invoice_number}` : "Create New Invoice"}
              </h2>
              <p className="text-xs text-muted-text">
                Generate professional invoice with line items, tax, and automated payment request links.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-text hover:text-text p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Basic Information & Client Reference */}
          <div className="bg-background/60 border border-border rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              1. Client & Reference Details
            </h3>

            {/* Quick Client Autocomplete dropdown */}
            {clientsLookup.length > 0 && !editingInvoice && (
              <div>
                <label className="block text-[11px] font-semibold text-muted-text mb-1">
                  Quick Select Existing Client / Lead:
                </label>
                <select
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Choose from existing CRM contacts or enter manually below --</option>
                  {clientsLookup.map((c) => (
                    <option key={c.id || c.email} value={c.email}>
                      {c.name} ({c.email}) {c.property_address ? `· ${c.property_address}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">
                  Invoice Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-2026-0001"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-mono text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">
                  Client Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">
                  Client Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Linked Project (Optional)</label>
                <select value={projectId} disabled={!clientId} onChange={(e) => setProjectId(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60">
                  <option value="">{tUi("admin.budget.modal.no_project")}</option>
                  {projects.filter((project) => project.client_id === clientId).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Normalized Property (Optional)</label>
                <select value={propertyId} disabled={!clientId} onChange={(e) => {
                  const nextId = e.target.value;
                  setPropertyId(nextId);
                  const property = clientProperties.find((item) => item.id === nextId);
                  if (property) setPropertyAddress(property.address);
                }} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60">
                  <option value="">-- No property linked --</option>
                  {clientProperties.map((property) => <option key={property.id} value={property.id}>{property.property_name || property.address}{property.property_name ? ` · ${property.address}` : ""}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">
                  Client Phone (Optional)
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-text mb-1">
                  Property Address (if linked to listing)
                </label>
                <input
                  type="text"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="e.g. 742 Evergreen Terrace, Beverly Hills, CA"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dates, Currency & Cashflow Link */}
          <div className="bg-background/60 border border-border rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              2. Invoice Terms, Currency & Cashflow
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">
                  {tUi("admin.extra_services.field_currency")}</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
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
                <label className="block text-[11px] font-semibold text-text mb-1">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="draft">Draft (Unsent)</option>
                  <option value="sent">Sent to Client</option>
                  <option value="paid">Already Paid</option>
                </select>
              </div>
            </div>

            {/* Link to Cashflow / Budget */}
            <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-text">
                    Link with Cashflow / Budget Manager
                  </div>
                  <div className="text-[11px] text-muted-text">
                    Automatically record an income entry in cashflow when this invoice is created or paid.
                  </div>
                </div>
              </div>

              {!editingInvoice && (
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-text bg-surface px-3 py-1.5 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    checked={createBudgetEntry}
                    onChange={(e) => setCreateBudgetEntry(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Create cashflow entry</span>
                </label>
              )}
            </div>
          </div>

          {/* Section 3: Line Items */}
          <div className="bg-background/60 border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" />
                3. Invoice Line Items
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-7 text-xs inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {tUi("admin.portfolio.add_item")}</Button>
            </div>

            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-muted-text uppercase px-2">
                <div className="col-span-6">{tUi("admin.portfolio_form.description")}</div>
                <div className="col-span-2 text-center">Qty / Hrs</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-1 text-right">{tUi("common.total")}</div>
                <div className="col-span-1"></div>
              </div>

              {/* Items List */}
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center bg-surface p-2 rounded-lg border border-border">
                  <div className="col-span-6">
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                      placeholder="e.g. HDR Twilight Photography (25 Photos)"
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded-md text-xs text-center text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded-md text-xs text-right text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="col-span-1 text-right font-semibold text-xs text-text pr-1">
                    {formatMoney(item.total)}
                  </div>

                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-muted-text hover:text-rose-500 p-1 rounded transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal, Tax, Discounts and Grand Total Breakdown */}
            <div className="pt-4 border-t border-border flex flex-col md:flex-row justify-end items-end">
              <div className="w-full md:w-80 space-y-2 text-xs">
                <div className="flex justify-between text-muted-text">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-text">{formatMoney(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-muted-text">
                    <span>Tax (%):</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-16 px-1.5 py-0.5 bg-background border border-border rounded text-xs text-right text-text"
                    />
                  </div>
                  <span className="font-semibold text-text">{formatMoney(taxAmount)}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-muted-text">
                    <span>Discount ({selectedCurrency}):</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="w-20 px-1.5 py-0.5 bg-background border border-border rounded text-xs text-right text-text"
                    />
                  </div>
                  <span className="font-semibold text-rose-500">-{formatMoney(discountAmount)}</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border text-sm font-bold">
                  <span className="text-text font-heading">Total Amount Due:</span>
                  <span className="text-base text-primary font-heading">{formatMoney(totalAmount)}</span>
                </div>
              </div>
            </div>
            {totalAmount === 0 && <p className="text-[11px] text-emerald-700 dark:text-emerald-300">0 összeg: ingyenes vagy természetbeni szolgáltatásként kerül rögzítésre; fizetési kötelezettséget nem hoz létre.</p>}
          </div>

          {/* Section 4: Payment Instructions & Terms */}
          <div className="bg-background/60 border border-border rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5" />
              4. Payment Instructions & Terms
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">
                  Payment Link (Stripe, PayPal, Card checkout, etc.)
                </label>
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
                  <input
                    type="url"
                    value={paymentLink}
                    onChange={(e) => setPaymentLink(e.target.value)}
                    placeholder="https://buy.stripe.com/... or payment gateway URL"
                    className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. Net 14 days"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text mb-1">
                Bank Transfer / Payment Instructions
              </label>
              <textarea
                rows={2}
                value={paymentMethodInstructions}
                onChange={(e) => setPaymentMethodInstructions(e.target.value)}
                placeholder="Bank: Chase | Routing: 123456789 | Account: 987654321 | SPS Studio LLC"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text mb-1">
                Notes / Scope Summary (Included on invoice and payment emails)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Thank you for your business! Drone aerials and HDR media will be delivered within 24h of payment."
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background/50 rounded-b-2xl">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {tUi("admin.clients.cancel")}</Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 min-w-[120px] justify-center"
            >
              {loading ? (
                <span>{tUi("admin.pricing.btn_saving")}</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editingInvoice ? "Save Changes" : "Create Invoice"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
