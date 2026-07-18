import axios from 'axios';
import type {
  DashboardData,
  Client,
  ClientDetail,
  Contract,
  Asc606Summary,
  Invoice,
  InvoiceSummary,
  LeakageAlert,
  LeakageSummary,
  UnbilledWork,
  RevenueRecord,
  RevenueByClient,
  User,
  Setting,
  AuditLogEntry,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// ===== MOCK DATA =====

const mockDashboard: DashboardData = {
  metrics: {
    total_contract_value: 2575000000,
    monthly_revenue: 215000000,
    revenue_leakage: 17000000,
    active_clients: 18,
    net_margin_avg: 19.1,
    open_alerts: 42,
  },
  monthly_trends: [
    { month: 'Jan', revenue: 195000000, cost: 158000000, margin_pct: 19.0 },
    { month: 'Feb', revenue: 202000000, cost: 163000000, margin_pct: 19.3 },
    { month: 'Mar', revenue: 210000000, cost: 170000000, margin_pct: 19.0 },
    { month: 'Apr', revenue: 208000000, cost: 167000000, margin_pct: 19.7 },
    { month: 'May', revenue: 215000000, cost: 172000000, margin_pct: 20.0 },
    { month: 'Jun', revenue: 218000000, cost: 175000000, margin_pct: 19.7 },
    { month: 'Jul', revenue: 215000000, cost: 174000000, margin_pct: 19.1 },
  ],
  top_accounts: [
    { client_name: 'Reliance Retail', margin_pct: 28.5, revenue: 42000000 },
    { client_name: 'HDFC Bank', margin_pct: 26.2, revenue: 35000000 },
    { client_name: 'Tata Motors', margin_pct: 24.8, revenue: 31000000 },
    { client_name: 'Bharti Airtel', margin_pct: 23.1, revenue: 28000000 },
    { client_name: 'Infosys BPO', margin_pct: 21.5, revenue: 25000000 },
  ],
  bottom_accounts: [
    { client_name: 'StartupXYZ', margin_pct: 4.2, revenue: 3200000 },
    { client_name: 'EduTech Ltd', margin_pct: 7.8, revenue: 5500000 },
    { client_name: 'RegionalTel', margin_pct: 9.1, revenue: 6800000 },
    { client_name: 'SmallRetail', margin_pct: 10.5, revenue: 4200000 },
    { client_name: 'HealthPlus', margin_pct: 11.2, revenue: 7100000 },
  ],
  billing_breakdown: [
    { model: 'T&M', value: 85000000, percentage: 39.5 },
    { model: 'Milestone', value: 52000000, percentage: 24.2 },
    { model: 'Retainer', value: 43000000, percentage: 20.0 },
    { model: 'Performance', value: 22000000, percentage: 10.2 },
    { model: 'Hybrid', value: 13000000, percentage: 6.1 },
  ],
  recent_alerts: [
    { id: '1', date: '2026-07-18', type: 'Unbilled Work', severity: 'critical', message: 'Rs. 45L unbilled for Tata Motors - 32 days', client: 'Tata Motors', status: 'open' },
    { id: '2', date: '2026-07-17', type: 'Margin Drop', severity: 'warning', message: 'StartupXYZ margin dropped to 4.2%', client: 'StartupXYZ', status: 'open' },
    { id: '3', date: '2026-07-16', type: 'Contract Expiry', severity: 'warning', message: 'HDFC Bank contract expires in 30 days', client: 'HDFC Bank', status: 'acknowledged' },
    { id: '4', date: '2026-07-15', type: 'Payment Overdue', severity: 'critical', message: 'Invoice #INV-2026-089 overdue by 15 days', client: 'RegionalTel', status: 'open' },
    { id: '5', date: '2026-07-14', type: 'Rate Variance', severity: 'info', message: 'Billing rate 8% below contract for Airtel', client: 'Bharti Airtel', status: 'resolved' },
  ],
};

const mockClients: Client[] = [
  { id: '1', name: 'Reliance Retail', industry: 'Retail', geography: 'West India', billing_model: 'T&M', monthly_revenue: 42000000, monthly_cost: 30000000, net_margin_pct: 28.5, status: 'healthy', contract_value: 500000000, start_date: '2024-01-15', ai_recommendation: undefined },
  { id: '2', name: 'HDFC Bank', industry: 'BFSI', geography: 'West India', billing_model: 'Retainer', monthly_revenue: 35000000, monthly_cost: 25800000, net_margin_pct: 26.2, status: 'healthy', contract_value: 420000000, start_date: '2023-06-01', ai_recommendation: undefined },
  { id: '3', name: 'Tata Motors', industry: 'Automotive', geography: 'West India', billing_model: 'Milestone', monthly_revenue: 31000000, monthly_cost: 23300000, net_margin_pct: 24.8, status: 'healthy', contract_value: 370000000, start_date: '2024-03-10', ai_recommendation: undefined },
  { id: '4', name: 'Bharti Airtel', industry: 'Telecom', geography: 'North India', billing_model: 'Performance', monthly_revenue: 28000000, monthly_cost: 21500000, net_margin_pct: 23.1, status: 'healthy', contract_value: 335000000, start_date: '2023-09-15', ai_recommendation: undefined },
  { id: '5', name: 'Infosys BPO', industry: 'IT Services', geography: 'South India', billing_model: 'T&M', monthly_revenue: 25000000, monthly_cost: 19600000, net_margin_pct: 21.5, status: 'healthy', contract_value: 300000000, start_date: '2024-02-01', ai_recommendation: undefined },
  { id: '6', name: 'StartupXYZ', industry: 'Technology', geography: 'South India', billing_model: 'T&M', monthly_revenue: 3200000, monthly_cost: 3065000, net_margin_pct: 4.2, status: 'critical', contract_value: 38000000, start_date: '2025-06-01', ai_recommendation: 'Renegotiate rates or reduce scope. Current margin unsustainable.' },
  { id: '7', name: 'EduTech Ltd', industry: 'Education', geography: 'North India', billing_model: 'Milestone', monthly_revenue: 5500000, monthly_cost: 5070000, net_margin_pct: 7.8, status: 'critical', contract_value: 66000000, start_date: '2025-01-15', ai_recommendation: 'Review milestone pricing. Consider switching to T&M model.' },
  { id: '8', name: 'RegionalTel', industry: 'Telecom', geography: 'East India', billing_model: 'Retainer', monthly_revenue: 6800000, monthly_cost: 6180000, net_margin_pct: 9.1, status: 'critical', contract_value: 81000000, start_date: '2024-11-01', ai_recommendation: 'Payment delays impacting margin. Enforce payment terms.' },
];

const mockContracts: Contract[] = [
  { id: 'CON-001', client_name: 'Reliance Retail', client_id: '1', billing_model: 'T&M', value: 500000000, start_date: '2024-01-15', end_date: '2026-01-14', payment_terms: 'Net 30', asc606_step: 5, asc606_step_name: 'Revenue Recognized', status: 'active' },
  { id: 'CON-002', client_name: 'HDFC Bank', client_id: '2', billing_model: 'Retainer', value: 420000000, start_date: '2023-06-01', end_date: '2026-08-31', payment_terms: 'Net 45', asc606_step: 4, asc606_step_name: 'Allocate Price', status: 'active' },
  { id: 'CON-003', client_name: 'Tata Motors', client_id: '3', billing_model: 'Milestone', value: 370000000, start_date: '2024-03-10', end_date: '2026-03-09', payment_terms: 'Net 60', asc606_step: 3, asc606_step_name: 'Determine Price', status: 'active' },
  { id: 'CON-004', client_name: 'Bharti Airtel', client_id: '4', billing_model: 'Performance', value: 335000000, start_date: '2023-09-15', end_date: '2025-09-14', payment_terms: 'Net 30', asc606_step: 5, asc606_step_name: 'Revenue Recognized', status: 'active' },
  { id: 'CON-005', client_name: 'Infosys BPO', client_id: '5', billing_model: 'T&M', value: 300000000, start_date: '2024-02-01', end_date: '2026-01-31', payment_terms: 'Net 30', asc606_step: 5, asc606_step_name: 'Revenue Recognized', status: 'active' },
  { id: 'CON-006', client_name: 'StartupXYZ', client_id: '6', billing_model: 'T&M', value: 38000000, start_date: '2025-06-01', end_date: '2026-05-31', payment_terms: 'Net 15', asc606_step: 2, asc606_step_name: 'Identify Obligations', status: 'active' },
];

const mockInvoices: Invoice[] = [
  { id: 'INV-001', invoice_number: 'INV-2026-101', client_name: 'Reliance Retail', client_id: '1', amount: 42000000, issued_date: '2026-07-01', due_date: '2026-07-31', status: 'pending' },
  { id: 'INV-002', invoice_number: 'INV-2026-102', client_name: 'HDFC Bank', client_id: '2', amount: 35000000, issued_date: '2026-06-15', due_date: '2026-07-30', status: 'paid', payment_date: '2026-07-10' },
  { id: 'INV-003', invoice_number: 'INV-2026-089', client_name: 'RegionalTel', client_id: '8', amount: 6800000, issued_date: '2026-06-01', due_date: '2026-07-01', status: 'overdue' },
  { id: 'INV-004', invoice_number: 'INV-2026-103', client_name: 'Tata Motors', client_id: '3', amount: 31000000, issued_date: '2026-07-05', due_date: '2026-09-03', status: 'pending' },
  { id: 'INV-005', invoice_number: 'INV-2026-098', client_name: 'Bharti Airtel', client_id: '4', amount: 28000000, issued_date: '2026-06-20', due_date: '2026-07-20', status: 'paid', payment_date: '2026-07-18' },
];

const mockInvoiceSummary: InvoiceSummary = {
  total_invoiced: 215000000, total_paid: 142000000, total_pending: 55000000, total_overdue: 18000000,
  count_total: 24, count_paid: 16, count_pending: 5, count_overdue: 3, collection_rate: 88.5,
};

const mockLeakageAlerts: LeakageAlert[] = [
  { id: 'LA-001', client_name: 'Tata Motors', type: 'Unbilled Work', amount: 4500000, severity: 'critical', days_open: 32, status: 'open', description: 'Consulting hours not invoiced for Q2 sprint', created_at: '2026-06-15' },
  { id: 'LA-002', client_name: 'StartupXYZ', type: 'Rate Variance', amount: 1200000, severity: 'warning', days_open: 15, status: 'open', description: 'Billing rate 12% below contracted rate', created_at: '2026-07-02' },
  { id: 'LA-003', client_name: 'Bharti Airtel', type: 'Scope Creep', amount: 3200000, severity: 'warning', days_open: 22, status: 'acknowledged', description: 'Additional deliverables not covered in SOW', created_at: '2026-06-25' },
  { id: 'LA-004', client_name: 'RegionalTel', type: 'Late Payment', amount: 6800000, severity: 'critical', days_open: 45, status: 'open', description: 'Invoice overdue impacting cash flow', created_at: '2026-06-01' },
  { id: 'LA-005', client_name: 'EduTech Ltd', type: 'Milestone Delay', amount: 2800000, severity: 'warning', days_open: 18, status: 'open', description: 'Milestone 3 delivered but not invoiced', created_at: '2026-06-30' },
];

const mockLeakageSummary: LeakageSummary = {
  total_detected: 52000000, open_amount: 18500000, recovered_amount: 33500000, recovery_rate: 64.4,
  monthly_leakage: 17000000, annualized_leakage: 204000000,
  by_type: [
    { type: 'Unbilled Work', amount: 18000000, count: 12, percentage: 34.6 },
    { type: 'Rate Variance', amount: 12000000, count: 8, percentage: 23.1 },
    { type: 'Scope Creep', amount: 9500000, count: 6, percentage: 18.3 },
    { type: 'Late Payment', amount: 8000000, count: 5, percentage: 15.4 },
    { type: 'Milestone Delay', amount: 4500000, count: 4, percentage: 8.6 },
  ],
};

const mockUnbilledWork: UnbilledWork[] = [
  { id: 'UB-001', client_name: 'Tata Motors', description: 'Sprint 12 consulting hours', hours: 240, estimated_value: 4500000, days_unbilled: 32 },
  { id: 'UB-002', client_name: 'Bharti Airtel', description: 'Network optimization extras', hours: 160, estimated_value: 3200000, days_unbilled: 22 },
  { id: 'UB-003', client_name: 'EduTech Ltd', description: 'Platform migration support', hours: 120, estimated_value: 2800000, days_unbilled: 18 },
];

const mockRevenueRecords: RevenueRecord[] = [
  { month: 'Jan', recognized: 180000000, deferred: 25000000, unbilled: 8000000, total: 213000000 },
  { month: 'Feb', recognized: 188000000, deferred: 22000000, unbilled: 7000000, total: 217000000 },
  { month: 'Mar', recognized: 195000000, deferred: 20000000, unbilled: 9000000, total: 224000000 },
  { month: 'Apr', recognized: 192000000, deferred: 23000000, unbilled: 10000000, total: 225000000 },
  { month: 'May', recognized: 200000000, deferred: 18000000, unbilled: 8000000, total: 226000000 },
  { month: 'Jun', recognized: 205000000, deferred: 15000000, unbilled: 12000000, total: 232000000 },
  { month: 'Jul', recognized: 198000000, deferred: 20000000, unbilled: 11000000, total: 229000000 },
];

const mockRevByClient: RevenueByClient[] = [
  { client_name: 'Reliance Retail', recognized: 42000000, deferred: 5000000, unbilled: 2000000, compliance_status: 'compliant' },
  { client_name: 'HDFC Bank', recognized: 35000000, deferred: 3000000, unbilled: 0, compliance_status: 'compliant' },
  { client_name: 'Tata Motors', recognized: 26500000, deferred: 4500000, unbilled: 4500000, compliance_status: 'review_needed' },
  { client_name: 'Bharti Airtel', recognized: 28000000, deferred: 2000000, unbilled: 3200000, compliance_status: 'review_needed' },
  { client_name: 'Infosys BPO', recognized: 25000000, deferred: 0, unbilled: 0, compliance_status: 'compliant' },
  { client_name: 'StartupXYZ', recognized: 2800000, deferred: 400000, unbilled: 600000, compliance_status: 'non_compliant' },
];

const mockUsers: User[] = [
  { id: '1', name: 'Rajesh Kumar', email: 'rajesh@denave.com', role: 'admin', status: 'active', last_login: '2026-07-18T10:30:00', created_at: '2024-01-01' },
  { id: '2', name: 'Priya Sharma', email: 'priya@denave.com', role: 'finance', status: 'active', last_login: '2026-07-18T09:15:00', created_at: '2024-03-15' },
  { id: '3', name: 'Amit Patel', email: 'amit@denave.com', role: 'manager', status: 'active', last_login: '2026-07-17T16:45:00', created_at: '2024-06-01' },
  { id: '4', name: 'Sneha Gupta', email: 'sneha@denave.com', role: 'viewer', status: 'inactive', last_login: '2026-06-20T14:00:00', created_at: '2025-01-10' },
];

const mockSettings: Setting[] = [
  { key: 'leakage_threshold', value: '5', description: 'Revenue leakage alert threshold (%)', category: 'Alerts', updated_at: '2026-07-01' },
  { key: 'margin_warning', value: '12', description: 'Margin warning threshold (%)', category: 'Alerts', updated_at: '2026-07-01' },
  { key: 'margin_critical', value: '8', description: 'Margin critical threshold (%)', category: 'Alerts', updated_at: '2026-07-01' },
  { key: 'invoice_reminder_days', value: '7', description: 'Days before due date to send reminder', category: 'Invoicing', updated_at: '2026-06-15' },
  { key: 'asc606_auto_check', value: 'true', description: 'Auto-validate ASC 606 compliance', category: 'Revenue', updated_at: '2026-05-20' },
];

const mockAuditLog: AuditLogEntry[] = [
  { id: '1', action: 'UPDATE', entity: 'Client', entity_id: '6', user_name: 'Rajesh Kumar', timestamp: '2026-07-18T10:30:00', details: 'Updated margin threshold for StartupXYZ' },
  { id: '2', action: 'CREATE', entity: 'Invoice', entity_id: 'INV-005', user_name: 'Priya Sharma', timestamp: '2026-07-17T14:20:00', details: 'Created invoice INV-2026-103 for Tata Motors' },
  { id: '3', action: 'RESOLVE', entity: 'LeakageAlert', entity_id: 'LA-010', user_name: 'Amit Patel', timestamp: '2026-07-16T11:00:00', details: 'Resolved rate variance alert for Airtel' },
  { id: '4', action: 'LOGIN', entity: 'User', entity_id: '1', user_name: 'Rajesh Kumar', timestamp: '2026-07-18T10:00:00', details: 'User logged in' },
];

// ===== API FUNCTIONS =====

// Dashboard
export const fetchDashboard = async (): Promise<DashboardData> => {
  try {
    const [metrics, snapshot, trends, billing, alerts] = await Promise.all([
      api.get('/dashboard/metrics'),
      api.get('/dashboard/profitability-snapshot'),
      api.get('/dashboard/monthly-trends'),
      api.get('/dashboard/billing-breakdown'),
      api.get('/dashboard/alerts-summary'),
    ]);
    const m = metrics.data;
    return {
      metrics: {
        total_contract_value: m.total_contract_value || 0,
        monthly_revenue: m.monthly_revenue || 0,
        revenue_leakage: m.open_leakage_amount || m.revenue_leakage || 0,
        active_clients: m.active_clients || m.total_clients || 0,
        net_margin_avg: m.net_margin_pct || m.avg_client_margin || m.net_margin_avg || 0,
        open_alerts: m.open_alerts_count || m.open_alerts || 0,
      },
      monthly_trends: trends.data.trends || trends.data || [],
      top_accounts: snapshot.data.top_accounts || [],
      bottom_accounts: snapshot.data.bottom_accounts || [],
      billing_breakdown: billing.data.breakdown || billing.data || [],
      recent_alerts: alerts.data.alerts || alerts.data.recent_alerts || [],
    };
  } catch {
    return mockDashboard;
  }
};

// Clients
export const fetchClients = async (): Promise<Client[]> => {
  try {
    const res = await api.get('/clients');
    const data = res.data.clients || res.data;
    return Array.isArray(data) ? data : [];
  } catch {
    return mockClients;
  }
};

export const fetchClientDetail = async (id: string): Promise<ClientDetail> => {
  const res = await api.get(`/clients/${id}`);
  return res.data;
};

export const createClient = async (data: Partial<Client>): Promise<Client> => {
  const res = await api.post('/clients', data);
  return res.data;
};

export const updateClient = async (id: string, data: Partial<Client>): Promise<Client> => {
  const res = await api.put(`/clients/${id}`, data);
  return res.data;
};

export const deleteClient = async (id: string): Promise<void> => {
  await api.delete(`/clients/${id}`);
};

// Contracts
export const fetchContracts = async (): Promise<Contract[]> => {
  try {
    const res = await api.get('/contracts');
    const data = res.data.contracts || res.data;
    return Array.isArray(data) ? data : [];
  } catch {
    return mockContracts;
  }
};

export const fetchAsc606Summary = async (): Promise<Asc606Summary> => {
  try {
    const res = await api.get('/contracts/asc606-summary');
    return res.data;
  } catch {
    return { total_contracts: 6, compliance_rate: 83.3, step_distribution: [
      { step: 1, name: 'Identify Contract', count: 0 },
      { step: 2, name: 'Identify Obligations', count: 1 },
      { step: 3, name: 'Determine Price', count: 1 },
      { step: 4, name: 'Allocate Price', count: 1 },
      { step: 5, name: 'Recognize Revenue', count: 3 },
    ]};
  }
};

// Invoices
export const fetchInvoices = async (): Promise<Invoice[]> => {
  try {
    const res = await api.get('/invoices');
    const data = res.data.invoices || res.data;
    return Array.isArray(data) ? data : [];
  } catch {
    return mockInvoices;
  }
};

export const fetchInvoiceSummary = async (): Promise<InvoiceSummary> => {
  try {
    const res = await api.get('/invoices/summary');
    return res.data;
  } catch {
    return mockInvoiceSummary;
  }
};

export const markInvoicePaid = async (id: string): Promise<void> => {
  await api.post(`/invoices/${id}/mark-paid`);
};

// Leakage
export const fetchLeakageAlerts = async (): Promise<LeakageAlert[]> => {
  try {
    const res = await api.get('/leakage/');
    const data = res.data.alerts || res.data;
    return Array.isArray(data) ? data : [];
  } catch {
    return mockLeakageAlerts;
  }
};

export const fetchLeakageSummary = async (): Promise<LeakageSummary> => {
  try {
    const res = await api.get('/leakage/summary');
    return res.data;
  } catch {
    return mockLeakageSummary;
  }
};

export const fetchUnbilledWork = async (): Promise<UnbilledWork[]> => {
  try {
    const res = await api.get('/leakage/unbilled');
    const data = res.data.by_client || res.data.items || res.data;
    return Array.isArray(data) ? data : [];
  } catch {
    return mockUnbilledWork;
  }
};

export const resolveAlert = async (id: string, notes: string): Promise<void> => {
  await api.put(`/leakage/alerts/${id}/resolve`, { notes });
};

export const acknowledgeAlert = async (id: string): Promise<void> => {
  await api.put(`/leakage/alerts/${id}/acknowledge`);
};

// Revenue
export const fetchRevenueRecognition = async (): Promise<RevenueRecord[]> => {
  try {
    const res = await api.get('/revenue/recognition');
    return res.data.records || res.data;
  } catch {
    return mockRevenueRecords;
  }
};

export const fetchRevByClient = async (): Promise<RevenueByClient[]> => {
  try {
    const res = await api.get('/revenue/by-client');
    return res.data.clients || res.data;
  } catch {
    return mockRevByClient;
  }
};

// Admin
export const fetchUsers = async (): Promise<User[]> => {
  try {
    const res = await api.get('/admin/users');
    return res.data.users || res.data;
  } catch {
    return mockUsers;
  }
};

export const createUser = async (data: Partial<User>): Promise<User> => {
  const res = await api.post('/admin/users', data);
  return res.data;
};

export const fetchSettings = async (): Promise<Setting[]> => {
  try {
    const res = await api.get('/admin/settings');
    return res.data.settings || res.data;
  } catch {
    return mockSettings;
  }
};

export const updateSetting = async (key: string, value: string): Promise<void> => {
  await api.put(`/admin/settings/${key}`, { value });
};

export const fetchAuditLog = async (): Promise<AuditLogEntry[]> => {
  try {
    const res = await api.get('/admin/audit-log');
    return res.data.entries || res.data;
  } catch {
    return mockAuditLog;
  }
};

export const resetDatabase = async (): Promise<void> => {
  await api.post('/admin/reset-database');
};

export default api;
