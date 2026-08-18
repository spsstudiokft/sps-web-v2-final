export type User = {
  id: string;
  email: string;
  password_hash: string;
  role?: string;
  is_active?: number;
  property_address?: string | null;
  advertisement_link?: string | null;
  created_at: string;
};

export type Client = {
  id: string;
  email: string;
  role: string;
  is_active: number;
  property_address?: string | null;
  advertisement_link?: string | null;
  project_count?: number;
  projects?: { id: string; name: string }[];
  created_at: string;
};

export type CRMRecord = {
  id: string;
  type: 'lead' | 'customer';
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  notes: string;
  owner_id: string;
  property_address?: string | null;
  advertisement_link?: string | null;
  has_portal_account?: boolean | number;
  portal_user_id?: string | null;
  portal_user_is_active?: number | null;
  created_at: string;
  updated_at: string;
};

export type Setting = {
  key: string;
  value: string;
};

export type Category = {
  id: string;
  name: string;
  sort_order: number;
};

export type Service = {
  id: string;
  title: string;
  description: string | null;
  icon?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  link_text?: string | null;
  is_published: number;
  sort_order: number;
  created_at: string;
  updated_at?: string;
};

export type FAQCategory = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  parent_id?: string | null;
  is_published: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  faq_count?: number;
  parent_name?: string | null;
};

export type FAQItem = {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  category_id?: string | null;
  is_published: number;
  sort_order: number;
  created_at: string;
  updated_at?: string;
};

export type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  item_type?: 'image' | 'drone_video' | 'interior_video' | string | null;
  media_type?: 'image' | 'video';
  media_url?: string | null;
  thumbnail_url?: string | null;
  image_urls: string; // JSON array string
  target_url: string | null;
  is_featured: number;
  is_published: number;
  sort_order: number;
  keywords?: string | null;
  created_at: string;
  updated_at?: string;
  projects?: Array<{ id: string; name: string }>;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  client_id: string | null;
  client_email?: string | null;
  keywords?: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  property_address?: string;
  message: string;
  is_read: number;
  status?: string;
  notes?: string;
  customer_id?: string | null;
  is_archived?: number;
  archived_at?: string | null;
  archived_by?: string | null;
  unarchived_at?: string | null;
  unarchived_by?: string | null;
  created_at: string;
};

export type BudgetEntryType = 'income' | 'outcome';
export type BudgetStatus = 'planned' | 'confirmed' | 'pending' | 'rejected';
export type BudgetPeriodStatus = 'on_track' | 'over_budget' | 'in_progress' | 'planned' | 'reviewed' | 'closed';

export interface BudgetEntry {
  id: string;
  owner_admin_id: string;
  owner_name?: string;
  owner_email?: string;
  owner_workspace?: string;
  owner_role?: string;
  type: BudgetEntryType;
  amount: number;
  currency: string;
  date: string;
  category?: string;
  status: BudgetStatus;
  description?: string;
  color_code?: string;
  created_at: string;
  updated_at: string;
  isOwner?: boolean;
}

export interface BudgetAdminSettings {
  id?: string;
  admin_id: string;
  default_color: string;
  default_currency: string;
  monthly_target_income: number;
  monthly_budget_cap: number;
  period_status: BudgetPeriodStatus;
  period_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetAdminItem {
  id: string;
  email: string;
  name: string;
  role: string;
  workspace: string;
  defaultColor: string;
  defaultCurrency: string;
  periodStatus: string;
  entryCount: number;
  totalIncome: number;
  totalOutcome: number;
  net: number;
  isSelf: boolean;
}

export interface BudgetAuditLog {
  id: string;
  entryId?: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'settings_update';
  performedById: string;
  performedByName?: string;
  performedByEmail?: string;
  performerRole?: string;
  details?: any;
  createdAt: string;
}

export interface BudgetSummary {
  totalIncome: number;
  totalOutcome: number;
  netBalance: number;
  confirmedIncome: number;
  confirmedOutcome: number;
  confirmedNet: number;
  plannedIncome: number;
  plannedOutcome: number;
  pendingIncome: number;
  pendingOutcome: number;
  rejectedIncome: number;
  rejectedOutcome: number;
  profitMargin: number;
  totalEntries: number;
  monthlyBreakdown: {
    month: string;
    income: number;
    outcome: number;
    net: number;
  }[];
  categoryBreakdown: {
    incomes: { category: string; amount: number; count: number; color?: string }[];
    outcomes: { category: string; amount: number; count: number; color?: string }[];
  };
  adminBreakdown?: {
    adminId: string;
    adminName: string;
    adminEmail: string;
    adminRole: string;
    adminColor: string;
    totalIncome: number;
    totalOutcome: number;
    net: number;
    entryCount: number;
    confirmedIncome: number;
    confirmedOutcome: number;
  }[];
  targets?: {
    monthlyTargetIncome: number;
    monthlyBudgetCap: number;
    periodStatus: BudgetPeriodStatus;
    periodNotes: string;
    incomeProgress: number;
    budgetUsed: number;
  };
}

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  total: number;
  sort_order?: number;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_reference?: string;
  notes?: string;
  recorded_by_id?: string;
  recorded_by_name?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  budget_entry_id?: string | null;
  owner_admin_id: string;
  client_id?: string | null;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_address?: string;
  property_address?: string;
  issue_date: string;
  due_date: string;
  currency: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  payment_terms: string;
  notes?: string;
  payment_method_instructions?: string;
  payment_link?: string;
  sent_at?: string | null;
  viewed_at?: string | null;
  paid_at?: string | null;
  archived_at?: string | null;
  last_reminder_sent_at?: string | null;
  access_token: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
  owner_name?: string;
  owner_email?: string;
  linked_budget_entry?: {
    id: string;
    description: string;
    amount: number;
    status: string;
  };
}

export interface InvoiceSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  collectionRate: number;
  totalCount: number;
  draftCount: number;
  sentCount: number;
  viewedCount: number;
  paidCount: number;
  overdueCount: number;
  cancelledCount: number;
  recentInvoices?: Invoice[];
  clientBreakdown?: {
    client_name: string;
    client_email: string;
    total_invoiced: number;
    total_paid: number;
    total_due: number;
    invoice_count: number;
  }[];
}

export type PaymentRequestStatus = 'pending' | 'approved' | 'denied' | 'on_hold' | 'resubmitted' | 'paid';

export interface PaymentRequestAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  mime_type?: string;
  uploaded_at?: string;
}

export interface PaymentRequestActionHistory {
  id: string;
  action: 'created' | 'approved' | 'denied' | 'on_hold' | 'resubmitted' | 'edited' | 'paid' | 'comment';
  actor_id: string;
  actor_name: string;
  actor_email?: string;
  actor_role?: string;
  timestamp: string;
  note?: string;
}

export interface PaymentRequest {
  id: string;
  request_number: string;
  requester_id: string;
  requester_name: string;
  requester_email: string;
  requester_avatar?: string;
  requester_role?: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  description?: string;
  status: PaymentRequestStatus;
  link_type?: 'none' | 'budget_entry' | 'invoice' | 'expense';
  linked_budget_entry_id?: string | null;
  linked_invoice_id?: string | null;
  due_date?: string;
  payment_method?: string;
  beneficiary_name?: string;
  beneficiary_account?: string;
  attachments?: PaymentRequestAttachment[];
  reviewed_by_id?: string | null;
  reviewed_by_name?: string;
  reviewed_by_email?: string;
  reviewed_at?: string | null;
  review_notes?: string;
  action_history?: PaymentRequestActionHistory[];
  created_at: string;
  updated_at: string;
  linked_budget_entry?: {
    id: string;
    description: string;
    amount: number;
    currency?: string;
    status: string;
    type?: string;
  };
  linked_invoice?: {
    id: string;
    invoice_number: string;
    client_name: string;
    total_amount: number;
    currency?: string;
    status: string;
  };
}

export interface PaymentRequestSummary {
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  deniedCount: number;
  onHoldCount: number;
  totalPendingAmount: number;
  totalApprovedAmount: number;
  totalDeniedAmount: number;
}
