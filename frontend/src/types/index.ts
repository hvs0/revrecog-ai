// Dashboard Types
export interface DashboardMetrics {
  total_contract_value: number;
  monthly_revenue: number;
  revenue_leakage: number;
  active_clients: number;
  net_margin_avg: number;
  open_alerts: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  cost: number;
  margin_pct: number;
}

export interface AccountMargin {
  client_name: string;
  margin_pct: number;
  revenue: number;
}

export interface BillingBreakdown {
  model: string;
  value: number;
  percentage: number;
}

export interface DashboardAlert {
  id: string;
  date: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  client: string;
  status: 'open' | 'acknowledged' | 'resolved';
}

export interface DashboardData {
  metrics: DashboardMetrics;
  monthly_trends: MonthlyTrend[];
  top_accounts: AccountMargin[];
  bottom_accounts: AccountMargin[];
  billing_breakdown: BillingBreakdown[];
  recent_alerts: DashboardAlert[];
}

// Client Types
export interface Client {
  id: string;
  name: string;
  industry: string;
  geography: string;
  billing_model: string;
  monthly_revenue: number;
  monthly_cost: number;
  net_margin_pct: number;
  status: 'healthy' | 'warning' | 'critical';
  contract_value: number;
  start_date: string;
  ai_recommendation?: string;
}

export interface ClientDetail {
  client: Client;
  contracts: Contract[];
  invoices: Invoice[];
  monthly_data: MonthlyTrend[];
  leakage_alerts: LeakageAlert[];
}

// Contract Types
export interface Contract {
  id: string;
  client_name: string;
  client_id: string;
  billing_model: string;
  value: number;
  start_date: string;
  end_date: string;
  payment_terms: string;
  asc606_step: number;
  asc606_step_name: string;
  status: 'active' | 'pending' | 'completed' | 'expired';
}

export interface Asc606Summary {
  total_contracts: number;
  compliance_rate: number;
  step_distribution: { step: number; name: string; count: number }[];
}

// Invoice Types
export interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_id: string;
  amount: number;
  issued_date: string;
  due_date: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  payment_date?: string;
  contract_id?: string;
}

export interface InvoiceSummary {
  total_invoiced: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  count_total: number;
  count_paid: number;
  count_pending: number;
  count_overdue: number;
  collection_rate: number;
}

// Leakage Types
export interface LeakageAlert {
  id: string;
  client_name: string;
  type: string;
  amount: number;
  severity: 'critical' | 'warning' | 'info';
  days_open: number;
  status: 'open' | 'acknowledged' | 'resolved';
  description: string;
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface LeakageSummary {
  total_detected: number;
  open_amount: number;
  recovered_amount: number;
  recovery_rate: number;
  monthly_leakage: number;
  annualized_leakage: number;
  by_type: { type: string; amount: number; count: number; percentage: number }[];
}

export interface UnbilledWork {
  id: string;
  client_name: string;
  description: string;
  hours: number;
  estimated_value: number;
  days_unbilled: number;
}

// Revenue Types
export interface RevenueRecord {
  month: string;
  recognized: number;
  deferred: number;
  unbilled: number;
  total: number;
}

export interface RevenueByClient {
  client_name: string;
  recognized: number;
  deferred: number;
  unbilled: number;
  compliance_status: 'compliant' | 'review_needed' | 'non_compliant';
}

// Admin Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'finance' | 'manager' | 'viewer';
  status: 'active' | 'inactive';
  last_login: string;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
  description: string;
  category: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  user_name: string;
  timestamp: string;
  details: string;
}
