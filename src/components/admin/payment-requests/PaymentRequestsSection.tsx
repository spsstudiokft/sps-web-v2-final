import React, { useState, useEffect, useCallback } from "react";
import { 
  Plus, 
  Send, 
  ShieldCheck, 
  Filter, 
  RefreshCw,
  FileCheck,
  AlertCircle,
  FolderCog
} from "lucide-react";
import { 
  PaymentRequest, 
  PaymentRequestSummary, 
  BudgetAdminItem 
} from "../../../types";
import { PaymentRequestsStatsCards } from "./PaymentRequestsStatsCards";
import { PaymentRequestsFilterBar } from "./PaymentRequestsFilterBar";
import { PaymentRequestsTable } from "./PaymentRequestsTable";
import { PaymentRequestModal } from "./PaymentRequestModal";
import { PaymentRequestReviewModal } from "./PaymentRequestReviewModal";
import { PaymentRequestDetailModal } from "./PaymentRequestDetailModal";
import { PaymentRequestCategoriesModal, PaymentRequestCategoryOption } from "./PaymentRequestCategoriesModal";
import { useLanguage } from "../../../contexts/LanguageContext";

interface PaymentRequestsSectionProps {
  token: string | null;
  currency: string;
  isSuperAdmin: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  adminsList: BudgetAdminItem[];
  showToast: (msg: string, type?: "success" | "error") => void;
  onBudgetUpdated?: () => void;
}

export function PaymentRequestsSection({
  token,
  currency,
  isSuperAdmin,
  currentUserId,
  currentUserName,
  currentUserEmail,
  adminsList,
  showToast,
  onBudgetUpdated
}: PaymentRequestsSectionProps) {
  const { tUi } = useLanguage();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [summary, setSummary] = useState<PaymentRequestSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<PaymentRequestCategoryOption[]>([]);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Filters state
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [requesterFilter, setRequesterFilter] = useState<string>("all");
  const [linkFilter, setLinkFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [requestToEdit, setRequestToEdit] = useState<PaymentRequest | null>(null);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [requestToReview, setRequestToReview] = useState<PaymentRequest | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);

  // Fetch summary metrics
  const fetchSummary = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams({ currency: currency || "USD" });
      const res = await fetch(`/api/admin/payment-requests/summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.warn("Failed to fetch payment requests summary", err);
    }
  }, [token, currency]);

  const fetchCategories = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/payment-requests/categories", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("Failed to load payment request categories", error);
    }
  }, [token]);

  // Fetch requests list
  const fetchRequests = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (requesterFilter !== "all") params.append("requester_id", requesterFilter);
      if (linkFilter !== "all") params.append("link_type", linkFilter);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await fetch(`/api/admin/payment-requests?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const loadedRequests = Array.isArray(data) ? data : (data.requests || []);
        setRequests(loadedRequests);
      } else {
        showToast(tUi("admin.payment_requests.load_failed"), "error");
      }
    } catch (err) {
      console.error("Error loading payment requests", err);
      showToast(tUi("admin.payment_requests.load_failed"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [token, search, statusFilter, categoryFilter, requesterFilter, linkFilter, startDate, endDate, showToast]);

  useEffect(() => {
    fetchRequests();
    fetchSummary();
    fetchCategories();
  }, [fetchRequests, fetchSummary, fetchCategories]);

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setRequesterFilter("all");
    setLinkFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const handleOpenCreateModal = () => {
    setRequestToEdit(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (request: PaymentRequest) => {
    setRequestToEdit(request);
    setIsCreateModalOpen(true);
  };

  const handleOpenReview = (request: PaymentRequest) => {
    setRequestToReview(request);
    setIsReviewModalOpen(true);
  };

  const handleOpenDetail = (request: PaymentRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm("Are you sure you want to delete this payment request?")) return;
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/payment-requests/${requestId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        showToast(tUi("admin.payment_requests.deleted"));
        fetchRequests();
        fetchSummary();
      } else {
        const data = await res.json();
        showToast(data.error || tUi("admin.payment_requests.delete_failed"), "error");
      }
    } catch (err: any) {
      showToast(err.message || tUi("admin.payment_requests.delete_failed"), "error");
    }
  };

  const handleSuccess = (msg: string) => {
    showToast(msg);
    fetchRequests();
    fetchSummary();
    if (onBudgetUpdated) onBudgetUpdated();
  };

  return (
    <div className="space-y-5">
      {/* Top Header Row with Action CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-text flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            <span>{tUi("admin.payment_requests.title")}</span>
          </h2>
          <p className="text-xs text-muted-text mt-0.5">
            {isSuperAdmin
              ? tUi("admin.payment_requests.subtitle_admin")
              : tUi("admin.payment_requests.subtitle_user")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => setIsCategoriesModalOpen(true)}
              title={tUi("admin.payment_requests.manage_categories_title")}
              className="px-3 py-2 rounded-lg border border-border text-muted-text hover:text-primary hover:bg-primary/10 transition-colors text-xs font-semibold flex items-center gap-1.5"
            >
              <FolderCog className="w-4 h-4" />
              <span className="hidden md:inline">{tUi("admin.payment_requests.manage_categories")}</span>
            </button>
          )}
          <button
            onClick={() => {
              fetchRequests();
              fetchSummary();
            }}
            title={tUi("admin.payment_requests.refresh")}
            className="p-2 rounded-lg border border-border text-muted-text hover:text-text hover:bg-surface-hover transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{tUi("admin.payment_requests.new")}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards with Quick Interactive Status Filter */}
      <PaymentRequestsStatsCards
        summary={summary}
        currency={currency}
        isSuperAdmin={isSuperAdmin}
        activeStatus={statusFilter}
        onStatusSelect={(status) => setStatusFilter(status)}
      />

      {/* Filter Bar */}
      <PaymentRequestsFilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        requesterFilter={requesterFilter}
        onRequesterFilterChange={setRequesterFilter}
        linkFilter={linkFilter}
        onLinkFilterChange={setLinkFilter}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        adminsList={adminsList}
        isSuperAdmin={isSuperAdmin}
        onResetFilters={handleResetFilters}
        summary={summary}
        categories={categories}
      />

      {/* Requests Table */}
      <PaymentRequestsTable
        requests={requests}
        isLoading={isLoading}
        isSuperAdmin={isSuperAdmin}
        currentUserId={currentUserId}
        currency={currency}
        onView={handleOpenDetail}
        onReview={handleOpenReview}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onOpenCreateModal={handleOpenCreateModal}
      />

      {/* Create / Edit Modal */}
      <PaymentRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        requestToEdit={requestToEdit}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserEmail={currentUserEmail}
        defaultCurrency={currency}
        token={token}
        onSuccess={handleSuccess}
        showToast={showToast}
        categories={categories}
      />

      <PaymentRequestCategoriesModal
        isOpen={isCategoriesModalOpen}
        token={token}
        categories={categories}
        onClose={() => setIsCategoriesModalOpen(false)}
        onChanged={async () => {
          await fetchCategories();
          await fetchRequests();
        }}
        showToast={showToast}
      />

      {/* Superadmin Review Modal */}
      <PaymentRequestReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        request={requestToReview}
        currency={currency}
        token={token}
        onSuccess={handleSuccess}
        showToast={showToast}
      />

      {/* Details & Audit Trail Modal */}
      <PaymentRequestDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        request={selectedRequest}
        currency={currency}
        isSuperAdmin={isSuperAdmin}
        currentUserId={currentUserId}
        onOpenReview={handleOpenReview}
        onOpenEdit={handleOpenEdit}
      />
    </div>
  );
}
