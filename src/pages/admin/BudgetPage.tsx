import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  DollarSign, 
  Plus, 
  Download, 
  Settings2, 
  History, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Trash2, 
  X,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  CreditCard,
  Send,
  Receipt,
  Layers,
  BarChart2
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { 
  BudgetEntry, 
  BudgetSummary, 
  BudgetAdminItem, 
  BudgetAdminSettings, 
  BudgetStatus,
  Invoice,
  InvoiceSummary,
  InvoiceStatus
} from "../../types";
import { PageHeader } from "../../components/admin/PageHeader";
import { Button } from "../../components/ui/Button";
import { BudgetStatsCards } from "../../components/admin/budget/BudgetStatsCards";
import { BudgetChartSection } from "../../components/admin/budget/BudgetChartSection";
import { BudgetFilterBar } from "../../components/admin/budget/BudgetFilterBar";
import { BudgetTable } from "../../components/admin/budget/BudgetTable";
import { BudgetKanbanView } from "../../components/admin/budget/BudgetKanbanView";
import { BudgetEntryModal } from "../../components/admin/budget/BudgetEntryModal";
import { BudgetSettingsModal } from "../../components/admin/budget/BudgetSettingsModal";
import { BudgetAuditLogsModal } from "../../components/admin/budget/BudgetAuditLogsModal";
import { SuperadminConsolidatedBanner } from "../../components/admin/budget/SuperadminConsolidatedBanner";

// Invoice Subcomponents
import { InvoiceStatsCards } from "../../components/admin/invoices/InvoiceStatsCards";
import { InvoiceFilterBar } from "../../components/admin/invoices/InvoiceFilterBar";
import { InvoiceTable } from "../../components/admin/invoices/InvoiceTable";
import { InvoiceFormModal } from "../../components/admin/invoices/InvoiceFormModal";
import { InvoiceViewModal } from "../../components/admin/invoices/InvoiceViewModal";
import { SendInvoiceModal } from "../../components/admin/invoices/SendInvoiceModal";
import { RecordPaymentModal } from "../../components/admin/invoices/RecordPaymentModal";
import { InvoiceReportingSection } from "../../components/admin/invoices/InvoiceReportingSection";
import { PaymentRequestsSection } from "../../components/admin/payment-requests/PaymentRequestsSection";
import { normalizeAdminRole } from "../../lib/adminPermissions";
import { AdminPagination, AdminPaginationMeta } from "../../components/admin/AdminPagination";

export default function BudgetPage() {
  const { user, token } = useAuth();
  const { currentLanguage, tUi } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditor = normalizeAdminRole(user?.role) === "editor";

  // Tab State: "budget" | "invoices" | "payment-requests"
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"budget" | "invoices" | "payment-requests">(
    isEditor
      ? "payment-requests"
      : tabParam === "invoices"
      ? "invoices"
      : tabParam === "payment-requests" || tabParam === "requests"
      ? "payment-requests"
      : "budget"
  );

  useEffect(() => {
    if (isEditor) {
      setActiveTab("payment-requests");
      if (tabParam !== "payment-requests") setSearchParams({ tab: "payment-requests" }, { replace: true });
    } else if (tabParam === "invoices") {
      setActiveTab("invoices");
    } else if (tabParam === "payment-requests" || tabParam === "requests") {
      setActiveTab("payment-requests");
    } else {
      setActiveTab("budget");
    }
  }, [isEditor, setSearchParams, tabParam]);

  usePageTitle(
    activeTab === "invoices"
      ? tUi("admin.financial.page_title_invoices")
      : activeTab === "payment-requests"
      ? tUi("admin.financial.page_title_requests")
      : tUi("admin.financial.page_title_budget")
  );

  // Keep search params in sync with activeTab
  const handleTabChange = (tab: "budget" | "invoices" | "payment-requests") => {
    if (isEditor && tab !== "payment-requests") return;
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // ----------------------------------------------------
  // Budget State
  // ----------------------------------------------------
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [adminsList, setAdminsList] = useState<BudgetAdminItem[]>([]);
  const [currentSettings, setCurrentSettings] = useState<BudgetAdminSettings | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [currentAdminId, setCurrentAdminId] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters for Budget
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedAdminId, setSelectedAdminId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [budgetPage, setBudgetPage] = useState(1);
  const [budgetPagination, setBudgetPagination] = useState<AdminPaginationMeta>({ page: 1, page_size: 25, total: 0, total_pages: 1 });

  // Modals State for Budget
  const [isEntryModalOpen, setIsEntryModalOpen] = useState<boolean>(false);
  const [entryToEdit, setEntryToEdit] = useState<BudgetEntry | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ----------------------------------------------------
  // Invoices State
  // ----------------------------------------------------
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<boolean>(false);
  const [invoiceRefreshing, setInvoiceRefreshing] = useState<boolean>(false);

  // Filters for Invoices
  const [invoiceSearch, setInvoiceSearch] = useState<string>("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [invoicePeriodFilter, setInvoicePeriodFilter] = useState<string>("all");
  const [invoiceStartDate, setInvoiceStartDate] = useState<string>("");
  const [invoiceEndDate, setInvoiceEndDate] = useState<string>("");
  const [invoiceClientEmailFilter, setInvoiceClientEmailFilter] = useState<string>("");
  const [invoiceClients, setInvoiceClients] = useState<Array<{ id?: string; name?: string; email: string; source?: string }>>([]);
  const [invoiceSelectedAdminId, setInvoiceSelectedAdminId] = useState<string>("all");
  const [invoiceViewMode, setInvoiceViewMode] = useState<"table" | "analytics">("table");
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePagination, setInvoicePagination] = useState<AdminPaginationMeta>({ page: 1, page_size: 25, total: 0, total_pages: 1 });

  // Modals State for Invoices
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState<boolean>(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [initialInvoiceData, setInitialInvoiceData] = useState<Partial<Invoice> | null>(null);

  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<Invoice | null>(null);
  const [isInvoiceViewOpen, setIsInvoiceViewOpen] = useState<boolean>(false);

  const [selectedInvoiceForSend, setSelectedInvoiceForSend] = useState<Invoice | null>(null);
  const [isSendInvoiceModalOpen, setIsSendInvoiceModalOpen] = useState<boolean>(false);

  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState<boolean>(false);

  const [deleteInvoiceConfirmId, setDeleteInvoiceConfirmId] = useState<string | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Helper to compute date range based on period filter for budget
  const resolveDateParams = () => {
    if (periodFilter === "custom") {
      return { start_date: startDate, end_date: endDate };
    }

    const now = new Date();
    if (periodFilter === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      return { start_date: firstDay, end_date: lastDay };
    }

    if (periodFilter === "last_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      return { start_date: firstDay, end_date: lastDay };
    }

    if (periodFilter === "this_quarter") {
      const quarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), (quarter + 1) * 3, 0).toISOString().split("T")[0];
      return { start_date: firstDay, end_date: lastDay };
    }

    if (periodFilter === "this_year") {
      const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];
      return { start_date: firstDay, end_date: lastDay };
    }

    return { start_date: "", end_date: "" };
  };

  // Helper to compute date range for invoices
  const resolveInvoiceDateParams = () => {
    if (invoicePeriodFilter === "custom") {
      return { start_date: invoiceStartDate, end_date: invoiceEndDate };
    }

    const now = new Date();
    if (invoicePeriodFilter === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      return { start_date: firstDay, end_date: lastDay };
    }

    if (invoicePeriodFilter === "last_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      return { start_date: firstDay, end_date: lastDay };
    }

    if (invoicePeriodFilter === "this_quarter") {
      const quarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), (quarter + 1) * 3, 0).toISOString().split("T")[0];
      return { start_date: firstDay, end_date: lastDay };
    }

    if (invoicePeriodFilter === "this_year") {
      const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];
      return { start_date: firstDay, end_date: lastDay };
    }

    return { start_date: "", end_date: "" };
  };

  // ----------------------------------------------------
  // Load Budget Data
  // ----------------------------------------------------
  const fetchData = async (showBackgroundSpinner = false) => {
    if (isEditor) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    try {
      if (showBackgroundSpinner) setIsRefreshing(true);
      else setIsLoading(true);

      const dateParams = resolveDateParams();
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(budgetPage));
      queryParams.set("page_size", "25");

      if (search) queryParams.set("search", search);
      if (typeFilter !== "all") queryParams.set("type", typeFilter);
      if (statusFilter !== "all") queryParams.set("status", statusFilter);
      if (categoryFilter !== "all") queryParams.set("category", categoryFilter);
      if (dateParams.start_date) queryParams.set("start_date", dateParams.start_date);
      if (dateParams.end_date) queryParams.set("end_date", dateParams.end_date);
      if (selectedAdminId !== "all") queryParams.set("admin_id", selectedAdminId);

      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      let configuredCurrency = currentSettings?.default_currency || "USD";
      const settingsRes = await fetch(`/api/admin/budgets/settings`, { headers: authHeaders, cache: "no-store" });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        configuredCurrency = String(settingsData.default_currency || "USD").toUpperCase();
        setCurrentSettings(settingsData);
      }

      const summaryParams = new URLSearchParams(queryParams);
      summaryParams.set("currency", configuredCurrency);

      const entriesRes = await fetch(`/api/admin/budgets?${queryParams.toString()}`, {
        headers: authHeaders,
        cache: "no-store"
      });

      const summaryRes = await fetch(`/api/admin/budgets/summary?${summaryParams.toString()}`, {
        headers: authHeaders,
        cache: "no-store"
      });

      const adminsRes = await fetch(`/api/admin/budgets/admins`, {
        headers: authHeaders,
        cache: "no-store"
      });

      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        setEntries(entriesData.entries || []);
        if (entriesData.pagination) setBudgetPagination(entriesData.pagination);
        setIsSuperAdmin(entriesData.isSuperAdmin || false);
        setCurrentAdminId(entriesData.currentAdminId || user?.id || "");
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAdminsList(Array.isArray(adminsData) ? adminsData : []);
      }

    } catch (error: any) {
      console.error("Failed to load budget data:", error);
      showToast(tUi("admin.budget.toast.load_failed"), "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // ----------------------------------------------------
  // Load Invoices Data
  // ----------------------------------------------------
  const fetchInvoices = async (showBackgroundSpinner = false) => {
    if (isEditor) {
      setInvoiceLoading(false);
      setInvoiceRefreshing(false);
      return;
    }
    try {
      if (showBackgroundSpinner) setInvoiceRefreshing(true);
      else setInvoiceLoading(true);

      const dateParams = resolveInvoiceDateParams();
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(invoicePage));
      queryParams.set("page_size", "25");

      if (invoiceSearch) queryParams.set("search", invoiceSearch);
      if (invoiceClientEmailFilter) queryParams.set("client_email", invoiceClientEmailFilter);
      if (invoiceStatusFilter !== "all") queryParams.set("status", invoiceStatusFilter);
      if (dateParams.start_date) queryParams.set("start_date", dateParams.start_date);
      if (dateParams.end_date) queryParams.set("end_date", dateParams.end_date);
      if (invoiceSelectedAdminId !== "all") queryParams.set("admin_id", invoiceSelectedAdminId);
      const summaryParams = new URLSearchParams(queryParams);
      summaryParams.set("currency", currentSettings?.default_currency || "USD");

      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const [invoicesRes, summaryRes] = await Promise.all([
        fetch(`/api/admin/invoices?${queryParams.toString()}`, { headers: authHeaders }),
        fetch(`/api/admin/invoices/summary?${summaryParams.toString()}`, { headers: authHeaders })
      ]);

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData.items || []);
        if (invoicesData.pagination) setInvoicePagination(invoicesData.pagination);
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setInvoiceSummary(summaryData);
      }
    } catch (error: any) {
      console.error("Failed to load invoices:", error);
      showToast(tUi("admin.invoices.toast.load_failed"), "error");
    } finally {
      setInvoiceLoading(false);
      setInvoiceRefreshing(false);
    }
  };

  // Initial load and budget filter triggers
  useEffect(() => {
    fetchData();
  }, [
    search, 
    typeFilter, 
    statusFilter, 
    categoryFilter, 
    periodFilter, 
    startDate, 
    endDate, 
    selectedAdminId,
    budgetPage
  ]);

  // Invoice filter triggers
  useEffect(() => {
    fetchInvoices();
  }, [
    invoiceSearch,
    invoiceClientEmailFilter,
    invoiceStatusFilter,
    invoicePeriodFilter,
    invoiceStartDate,
    invoiceEndDate,
    invoiceSelectedAdminId,
    currentSettings?.default_currency,
    invoicePage
  ]);

  useEffect(() => { setBudgetPage(1); }, [search, typeFilter, statusFilter, categoryFilter, periodFilter, startDate, endDate, selectedAdminId]);
  useEffect(() => { setInvoicePage(1); }, [invoiceSearch, invoiceClientEmailFilter, invoiceStatusFilter, invoicePeriodFilter, invoiceStartDate, invoiceEndDate, invoiceSelectedAdminId]);

  useEffect(() => {
    if (isEditor) return;
    const loadInvoiceClients = async () => {
      try {
        const response = await fetch("/api/admin/invoices/clients-lookup", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) return;
        const clients = await response.json();
        setInvoiceClients(Array.isArray(clients) ? clients : []);
      } catch {
        setInvoiceClients([]);
      }
    };
    void loadInvoiceClients();
  }, [isEditor, token]);

  // Unique categories list for filter dropdown
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set).sort();
  }, [entries]);

  // ----------------------------------------------------
  // Budget Action Handlers
  // ----------------------------------------------------
  const handleSaveEntry = async (entryData: Partial<BudgetEntry>) => {
    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    if (entryToEdit) {
      const res = await fetch(`/api/admin/budgets/${entryToEdit.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(entryData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update budget entry");
      }

      showToast(tUi("admin.budget.toast.updated"));
    } else {
      const res = await fetch("/api/admin/budgets", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(entryData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create budget entry");
      }

      showToast(tUi("admin.budget.toast.created"));
    }

    setEntryToEdit(null);
    setIsEntryModalOpen(false);
    await fetchData(true);
  };

  const handleQuickStatusChange = async (entryId: string, newStatus: BudgetStatus) => {
    try {
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await fetch(`/api/admin/budgets/${entryId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Permission denied or failed to update status", "error");
        return;
      }

      showToast(`Status updated to ${newStatus}`);
      fetchData(true);
    } catch (e: any) {
      showToast(e.message || "Failed to update status", "error");
    }
  };

  const handleDuplicateEntry = (entry: BudgetEntry) => {
    setEntryToEdit({
      ...entry,
      id: "",
      description: `${entry.description ? entry.description + " " : ""}(Copy)`
    });
    setIsEntryModalOpen(true);
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await fetch(`/api/admin/budgets/${id}`, {
        method: "DELETE",
        headers: authHeaders
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Failed to delete budget entry", "error");
        return;
      }

      showToast(tUi("admin.budget.toast.deleted"));
      setDeleteConfirmId(null);
      fetchData(true);
    } catch (e: any) {
      showToast(e.message || "Failed to delete budget entry", "error");
    }
  };

  const handleSaveSettings = async (settingsData: Partial<BudgetAdminSettings>) => {
    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch("/api/admin/budgets/settings", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify(settingsData)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save budget settings");
    }

    showToast(tUi("admin.budget.toast.settings_saved"));
    fetchData(true);
  };

  // Convert a budget income entry directly into a new Invoice draft
  const handleCreateInvoiceFromBudgetEntry = (entry: BudgetEntry) => {
    const defaultCurrency = entry.currency || currentSettings?.default_currency || "USD";
    const amount = Number(entry.amount) || 0;

    setInitialInvoiceData({
      budget_id: entry.id,
      currency: defaultCurrency,
      issue_date: entry.date || new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      notes: `Generated from budget record #${entry.id}: ${entry.description || ''}`,
      items: [
        {
          id: "item_1",
          description: entry.description || "Real Estate Media Production Services",
          quantity: 1,
          unit_price: amount,
          tax_rate: 0,
          total: amount
        }
      ],
      subtotal: amount,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: amount,
      amount_paid: entry.status === "confirmed" ? amount : 0,
      status: entry.status === "confirmed" ? "paid" : "draft"
    });

    setInvoiceToEdit(null);
    setIsInvoiceFormOpen(true);
    handleTabChange("invoices");
  };

  // ----------------------------------------------------
  // Invoice Action Handlers
  // ----------------------------------------------------
  const handleSaveInvoice = async (formData: any) => {
    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    if (invoiceToEdit && invoiceToEdit.id) {
      const res = await fetch(`/api/admin/invoices/${invoiceToEdit.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update invoice");
      }

      showToast(tUi("admin.invoices.toast.updated"));
    } else {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create invoice");
      }

      showToast(tUi("admin.invoices.toast.created"));
    }

    setIsInvoiceFormOpen(false);
    setInvoiceToEdit(null);
    setInitialInvoiceData(null);
    fetchInvoices(true);
    fetchData(true);
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: "DELETE",
        headers: authHeaders
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Failed to delete invoice", "error");
        return;
      }

      showToast(tUi("admin.invoices.toast.deleted"));
      setDeleteInvoiceConfirmId(null);
      fetchInvoices(true);
    } catch (e: any) {
      showToast(e.message || "Failed to delete invoice", "error");
    }
  };

  const handleDuplicateInvoice = (inv: Invoice) => {
    setInitialInvoiceData({
      client_id: inv.client_id,
      client_name: inv.client_name,
      client_email: inv.client_email,
      client_phone: inv.client_phone,
      client_address: inv.client_address,
      property_id: inv.property_id,
      property_address: inv.property_address,
      currency: inv.currency,
      tax_rate: inv.tax_rate,
      discount_amount: inv.discount_amount,
      notes: inv.notes,
      payment_terms: inv.payment_terms,
      payment_link: inv.payment_link,
      items: (inv.items || []).map((item, idx) => ({
        id: `clone_${idx}`,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        total: item.total
      }))
    });
    setInvoiceToEdit(null);
    setIsInvoiceFormOpen(true);
  };

  const handleQuickInvoiceStatusChange = async (id: string, newStatus: InvoiceStatus) => {
    try {
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await fetch(`/api/admin/invoices/${id}/status`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Failed to update invoice status", "error");
        return;
      }

      showToast(`Invoice marked as ${newStatus}`);
      fetchInvoices(true);
      fetchData(true);
    } catch (e: any) {
      showToast(e.message || "Failed to update status", "error");
    }
  };

  const handleSendPaymentRequest = async (customMessage: string, paymentLinkOverride?: string) => {
    if (!selectedInvoiceForSend) return;

    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(`/api/admin/invoices/${selectedInvoiceForSend.id}/send`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        custom_message: customMessage,
        payment_link: paymentLinkOverride
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to send invoice payment request email");
    }

    fetchInvoices(true);
  };

  const handleRecordPayment = async (paymentData: any) => {
    if (!selectedInvoiceForPayment) return;

    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(`/api/admin/invoices/${selectedInvoiceForPayment.id}/payments`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(paymentData)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to record payment");
    }

    fetchInvoices(true);
    fetchData(true);
  };

  const handleArchiveInvoice = async (invoice: Invoice) => {
    try {
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      const res = await fetch(`/api/admin/invoices/${invoice.id}/archive`, {
        method: "PATCH",
        headers: authHeaders
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Failed to archive invoice", "error");
        return;
      }

      showToast(`Invoice ${invoice.invoice_number} archived successfully`);
      fetchInvoices(true);
      fetchData(true);
    } catch (error: any) {
      showToast(error.message || "Failed to archive invoice", "error");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (entries.length === 0) {
      showToast(tUi("admin.budget.toast.no_export"), "error");
      return;
    }

    const headers = [
      "ID",
      "Date",
      "Type",
      "Amount",
      "Currency",
      "Category",
      "Status",
      "Description",
      "Owner Admin",
      "Color Code",
      "Created At"
    ];

    const rows = entries.map((e) => [
      e.id,
      e.date,
      e.type,
      e.amount,
      e.currency,
      `"${(e.category || "").replace(/"/g, '""')}"`,
      e.status,
      `"${(e.description || "").replace(/"/g, '""')}"`,
      `"${(e.owner_name || "").replace(/"/g, '""')}"`,
      e.color_code || "",
      e.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `budget_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(tUi("admin.budget.toast.exported"));
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-3 ${
          toast.type === "success"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-surface"
            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 bg-surface"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header with Module Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-text font-heading">
              {tUi(activeTab === "budget" ? "admin.financial.title_budget" : "admin.financial.title_billing")}
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
              {tUi("admin.financial.badge")}
            </span>
          </div>
          <p className="text-xs text-muted-text mt-1">
            {activeTab === "budget"
              ? tUi("admin.financial.subtitle_budget")
              : activeTab === "invoices"
              ? tUi("admin.financial.subtitle_invoices")
              : tUi("admin.financial.subtitle_requests")}
          </p>
        </div>

        {/* Tab Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-surface border border-border rounded-xl p-1 shadow-xs">
            {!isEditor && <>
            <button
              type="button"
              onClick={() => handleTabChange("budget")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "budget"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-text hover:text-text hover:bg-surface-hover"
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{tUi("admin.financial.tab_budget")}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("invoices")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "invoices"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-text hover:text-text hover:bg-surface-hover"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{tUi("admin.financial.tab_invoices")}</span>
              {invoices.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === "invoices"
                    ? "bg-white/20 text-white"
                    : "bg-primary/15 text-primary"
                }`}>
                  {invoices.length}
                </span>
              )}
            </button>
            </>}

            <button
              type="button"
              onClick={() => handleTabChange("payment-requests")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "payment-requests"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-text hover:text-text hover:bg-surface-hover"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{tUi("admin.financial.tab_requests")}</span>
            </button>
          </div>

          {activeTab === "budget" ? (
            <Button
              type="button"
              onClick={() => {
                setEntryToEdit(null);
                setIsEntryModalOpen(true);
              }}
              className="flex items-center gap-1.5 cursor-pointer text-xs h-9"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tUi("admin.financial.new_transaction")}</span>
            </Button>
          ) : activeTab === "invoices" ? (
            <Button
              type="button"
              onClick={() => {
                setInvoiceToEdit(null);
                setInitialInvoiceData(null);
                setIsInvoiceFormOpen(true);
              }}
              className="flex items-center gap-1.5 cursor-pointer text-xs h-9"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tUi("admin.financial.create_invoice")}</span>
            </Button>
          ) : null}

          {!isEditor && <Button
            type="button"
            variant="outline"
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 cursor-pointer text-xs h-9"
            title={tUi("admin.financial.currency_help")}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{tUi("admin.financial.currency", { currency: currentSettings?.default_currency || "USD" })}</span>
          </Button>}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: BUDGET & CASHFLOW VIEW */}
      {/* ======================================================== */}
      {activeTab === "budget" && (
        <div className="space-y-6">
          {/* Superadmin Consolidated View Banner (if Superadmin) */}
          {isSuperAdmin && (
            <SuperadminConsolidatedBanner
              admins={adminsList}
              selectedAdminId={selectedAdminId}
              onSelectAdmin={setSelectedAdminId}
              currency={currentSettings?.default_currency || "USD"}
            />
          )}

          {/* Top Metric Stats Cards */}
          <BudgetStatsCards
            summary={summary}
            currency={currentSettings?.default_currency || "USD"}
            isSuperAdmin={isSuperAdmin}
            selectedAdminName={
              selectedAdminId !== "all" 
                ? adminsList.find(a => a.id === selectedAdminId)?.name 
                : undefined
            }
          />

          {/* Charts & Trends Section */}
          <BudgetChartSection
            summary={summary}
            currency={currentSettings?.default_currency || "USD"}
            isSuperAdmin={isSuperAdmin}
          />

          {/* Filter and Control Bar */}
          <BudgetFilterBar
            search={search}
            onSearchChange={setSearch}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            categoriesList={categoriesList}
            periodFilter={periodFilter}
            onPeriodFilterChange={setPeriodFilter}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            selectedAdminId={selectedAdminId}
            onAdminChange={setSelectedAdminId}
            adminsList={adminsList}
            isSuperAdmin={isSuperAdmin}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenNewModal={() => {
              setEntryToEdit(null);
              setIsEntryModalOpen(true);
            }}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            onOpenAuditLogsModal={() => setIsAuditLogsModalOpen(true)}
            onExportCSV={handleExportCSV}
            onRefresh={() => fetchData(true)}
            isRefreshing={isRefreshing}
          />

          {/* View: Table or Kanban Board */}
          {viewMode === "table" ? (
            <BudgetTable
              entries={entries}
              currentAdminId={currentAdminId}
              isSuperAdmin={isSuperAdmin}
              onEdit={(entry) => {
                setEntryToEdit(entry);
                setIsEntryModalOpen(true);
              }}
              onDelete={(id) => setDeleteConfirmId(id)}
              onDuplicate={handleDuplicateEntry}
              onQuickStatusChange={handleQuickStatusChange}
              onCreateInvoice={handleCreateInvoiceFromBudgetEntry}
              currency={currentSettings?.default_currency || "USD"}
              onOpenNewModal={() => {
                setEntryToEdit(null);
                setIsEntryModalOpen(true);
              }}
            />
          ) : (
            <BudgetKanbanView
              entries={entries}
              currentAdminId={currentAdminId}
              isSuperAdmin={isSuperAdmin}
              onEdit={(entry) => {
                setEntryToEdit(entry);
                setIsEntryModalOpen(true);
              }}
              onDelete={(id) => setDeleteConfirmId(id)}
              onQuickStatusChange={handleQuickStatusChange}
              onOpenNewModal={() => {
                setEntryToEdit(null);
                setIsEntryModalOpen(true);
              }}
              currency={currentSettings?.default_currency || "USD"}
            />
          )}
          <AdminPagination meta={budgetPagination} onPageChange={setBudgetPage} />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: INVOICES & PAYMENT REQUESTS VIEW */}
      {/* ======================================================== */}
      {activeTab === "invoices" && (
        <div className="space-y-6">
          {/* Invoice High-Level Stats */}
          <InvoiceStatsCards
            summary={invoiceSummary}
            currency={currentSettings?.default_currency || "USD"}
          />

          {/* Invoice Filter Bar */}
          <InvoiceFilterBar
            search={invoiceSearch}
            onSearchChange={setInvoiceSearch}
            statusFilter={invoiceStatusFilter}
            onStatusChange={setInvoiceStatusFilter}
            periodFilter={invoicePeriodFilter}
            onPeriodChange={setInvoicePeriodFilter}
            startDate={invoiceStartDate}
            onStartDateChange={setInvoiceStartDate}
            endDate={invoiceEndDate}
            onEndDateChange={setInvoiceEndDate}
            onResetFilters={() => {
              setInvoiceSearch("");
              setInvoiceClientEmailFilter("");
              setInvoiceStatusFilter("all");
              setInvoicePeriodFilter("all");
              setInvoiceStartDate("");
              setInvoiceEndDate("");
            }}
            hasActiveFilters={Boolean(invoiceSearch || invoiceClientEmailFilter || invoiceStatusFilter !== "all" || invoicePeriodFilter !== "all" || invoiceStartDate || invoiceEndDate)}
            totalCount={invoices.length}
            clientEmailFilter={invoiceClientEmailFilter}
            onClientEmailChange={setInvoiceClientEmailFilter}
            clients={invoiceClients}
            selectedAdminId={invoiceSelectedAdminId}
            onAdminChange={setInvoiceSelectedAdminId}
            adminsList={adminsList}
            isSuperAdmin={isSuperAdmin}
            viewMode={invoiceViewMode}
            onViewModeChange={setInvoiceViewMode}
            onOpenNewModal={() => {
              setInvoiceToEdit(null);
              setInitialInvoiceData(null);
              setIsInvoiceFormOpen(true);
            }}
            onRefresh={() => fetchInvoices(true)}
            isRefreshing={invoiceRefreshing}
          />

          {/* Invoices View (Table or Intelligence Reporting) */}
          {invoiceViewMode === "table" ? (
            <InvoiceTable
              invoices={invoices}
              currentAdminId={currentAdminId}
              isSuperAdmin={isSuperAdmin}
              onView={(inv) => {
                setSelectedInvoiceForView(inv);
                setIsInvoiceViewOpen(true);
              }}
              onEdit={(inv) => {
                setInvoiceToEdit(inv);
                setInitialInvoiceData(null);
                setIsInvoiceFormOpen(true);
              }}
              onDelete={(id) => setDeleteInvoiceConfirmId(id)}
              onDuplicate={handleDuplicateInvoice}
              onSend={(inv) => {
                setSelectedInvoiceForSend(inv);
                setIsSendInvoiceModalOpen(true);
              }}
              onSendRequest={(inv) => {
                setSelectedInvoiceForSend(inv);
                setIsSendInvoiceModalOpen(true);
              }}
              onRecordPayment={(inv) => {
                setSelectedInvoiceForPayment(inv);
                setIsRecordPaymentModalOpen(true);
              }}
              onArchive={handleArchiveInvoice}
              onQuickStatusChange={handleQuickInvoiceStatusChange}
              currency={currentSettings?.default_currency || "USD"}
              onOpenNewModal={() => {
                setInvoiceToEdit(null);
                setInitialInvoiceData(null);
                setIsInvoiceFormOpen(true);
              }}
              showToast={showToast}
            />
          ) : (
            <InvoiceReportingSection
              summary={invoiceSummary}
              invoices={invoices}
              currency={currentSettings?.default_currency || "USD"}
            />
          )}
          <AdminPagination meta={invoicePagination} onPageChange={setInvoicePage} />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PAYMENT REQUESTS & APPROVAL WORKFLOW */}
      {/* ======================================================== */}
      {activeTab === "payment-requests" && (
        <PaymentRequestsSection
          token={token}
          currency={currentSettings?.default_currency || "USD"}
          isSuperAdmin={isSuperAdmin}
          currentUserId={user?.id || ""}
          currentUserName={user?.name || user?.email?.split("@")[0] || "Coworker"}
          currentUserEmail={user?.email || ""}
          adminsList={adminsList}
          showToast={showToast}
          onBudgetUpdated={() => {
            if (!isEditor) {
              fetchData(true);
              fetchInvoices(true);
            }
          }}
        />
      )}

      {/* ======================================================== */}
      {/* SHARED MODALS */}
      {/* ======================================================== */}

      {/* Delete Budget Entry Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-text mb-1">
              Delete Budget Entry?
            </h3>
            <p className="text-xs text-muted-text mb-5">
              Are you sure you want to delete this financial record? This action will be recorded in the audit trail.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDeleteConfirmId(null)}
              >
                {tUi("admin.clients.cancel")}</Button>
              <button
                type="button"
                onClick={() => handleDeleteEntry(deleteConfirmId)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Dialog */}
      {deleteInvoiceConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-text mb-1">
              Delete Invoice Statement?
            </h3>
            <p className="text-xs text-muted-text mb-5">
              Are you sure you want to permanently delete this invoice and its line items? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDeleteInvoiceConfirmId(null)}
              >
                {tUi("admin.clients.cancel")}</Button>
              <button
                type="button"
                onClick={() => handleDeleteInvoice(deleteInvoiceConfirmId)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
              >
                Delete Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Entry Modal */}
      <BudgetEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => {
          setIsEntryModalOpen(false);
          setEntryToEdit(null);
        }}
        onSave={handleSaveEntry}
        entryToEdit={entryToEdit}
        defaultCurrency={currentSettings?.default_currency || "USD"}
        defaultAdminColor={currentSettings?.default_color || "#3B82F6"}
      />

      {/* Budget Preferences & Targets Modal */}
      <BudgetSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveSettings}
        currentSettings={currentSettings}
      />

      {/* Budget Audit Logs Modal */}
      <BudgetAuditLogsModal
        isOpen={isAuditLogsModalOpen}
        onClose={() => setIsAuditLogsModalOpen(false)}
        token={token}
      />

      {/* Invoice Form Modal */}
      <InvoiceFormModal
        isOpen={isInvoiceFormOpen}
        onClose={() => {
          setIsInvoiceFormOpen(false);
          setInvoiceToEdit(null);
          setInitialInvoiceData(null);
        }}
        onSave={handleSaveInvoice}
        editingInvoice={invoiceToEdit}
        budgetEntries={entries}
        currency={currentSettings?.default_currency || "USD"}
        clientsLookup={invoiceClients}
        initialData={initialInvoiceData}
        showToast={showToast}
      />

      {/* Invoice Preview & Printable PDF Modal */}
      <InvoiceViewModal
        isOpen={isInvoiceViewOpen}
        onClose={() => {
          setIsInvoiceViewOpen(false);
          setSelectedInvoiceForView(null);
        }}
        invoice={selectedInvoiceForView}
        onSend={(inv) => {
          setIsInvoiceViewOpen(false);
          setSelectedInvoiceForSend(inv);
          setIsSendInvoiceModalOpen(true);
        }}
        onSendEmail={(inv) => {
          setIsInvoiceViewOpen(false);
          setSelectedInvoiceForSend(inv);
          setIsSendInvoiceModalOpen(true);
        }}
        onEdit={(inv) => {
          setIsInvoiceViewOpen(false);
          setInvoiceToEdit(inv);
          setInitialInvoiceData(null);
          setIsInvoiceFormOpen(true);
        }}
        onRecordPayment={(inv) => {
          setIsInvoiceViewOpen(false);
          setSelectedInvoiceForPayment(inv);
          setIsRecordPaymentModalOpen(true);
        }}
        showToast={showToast}
      />

      {/* Send Payment Request Email Modal */}
      <SendInvoiceModal
        isOpen={isSendInvoiceModalOpen}
        onClose={() => {
          setIsSendInvoiceModalOpen(false);
          setSelectedInvoiceForSend(null);
        }}
        invoice={selectedInvoiceForSend}
        onSend={handleSendPaymentRequest}
        showToast={showToast}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => {
          setIsRecordPaymentModalOpen(false);
          setSelectedInvoiceForPayment(null);
        }}
        invoice={selectedInvoiceForPayment}
        onRecord={handleRecordPayment}
        showToast={showToast}
      />

    </div>
  );
}
