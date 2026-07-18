import React, { useEffect, useState, useCallback } from 'react';
import { Upload, FileText, Clock, CheckCircle, AlertTriangle, Plus, Trash2, Eye, RefreshCw } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

const API = '/api/data';

interface ExtractedInvoice {
  invoice_number?: string;
  client_name?: string;
  client_id?: number;
  amount?: number;
  tax_amount?: number;
  total_amount?: number;
  date?: string;
  due_date?: string;
  po_number?: string;
  confidence?: number;
  items?: Array<{ description: string; quantity: number; rate: number; amount: number }>;
}

interface ChangeLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  description: string;
  user: string;
  timestamp: string;
}

const DataPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual' | 'changes'>('upload');
  const [uploadType, setUploadType] = useState<'invoice' | 'contract' | 'timesheet'>('invoice');
  const [extractedData, setExtractedData] = useState<ExtractedInvoice | null>(null);
  const [uploading, setUploading] = useState(false);
  const [changes, setChanges] = useState<ChangeLog[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    loadChanges();
    loadClients();
  }, []);

  const loadChanges = async () => {
    try {
      const res = await fetch(`${API}/changes?limit=30`);
      const data = await res.json();
      setChanges(data.changes || []);
    } catch { /* fallback */ }
  };

  const loadClients = async () => {
    try {
      const res = await fetch('/api/clients/');
      const data = await res.json();
      setClients((data.clients || data || []).map((c: any) => ({ id: c.id, name: c.name })));
    } catch { /* fallback */ }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setExtractedData(null);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/upload/${uploadType}`, { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok) {
        setExtractedData(data.extracted_data);
        setMessage({ type: 'success', text: `File processed! Confidence: ${data.extracted_data?.confidence || 0}%` });
      } else {
        setMessage({ type: 'error', text: data.detail || 'Upload failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Upload failed - check server connection' });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmInvoice = async () => {
    if (!extractedData) return;

    const formData = new FormData();
    formData.append('invoice_number', extractedData.invoice_number || `INV-${Date.now()}`);
    formData.append('client_id', String(extractedData.client_id || 1));
    formData.append('amount', String(extractedData.amount || 0));
    formData.append('tax_amount', String(extractedData.tax_amount || 0));
    formData.append('total_amount', String(extractedData.total_amount || 0));
    formData.append('issue_date', extractedData.date || new Date().toISOString().split('T')[0]);
    formData.append('due_date', extractedData.due_date || '');
    formData.append('po_number', extractedData.po_number || '');

    try {
      const res = await fetch(`${API}/confirm/invoice`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Invoice ${data.invoice_number} saved to database!` });
        setExtractedData(null);
        loadChanges();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Save failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Save failed' });
    }
  };

  const tabs = [
    { id: 'upload' as const, label: 'Upload & Extract', icon: Upload },
    { id: 'manual' as const, label: 'Manual Entry', icon: Plus },
    { id: 'changes' as const, label: 'Change History', icon: Clock },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Upload invoices, contracts, timesheets • Auto-extract • Track all changes</p>
        </div>
        <button onClick={loadChanges} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white text-primary-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Upload Type Selection */}
          <div className="card">
            <h3 className="card-header">What are you uploading?</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'invoice' as const, label: 'Invoice', desc: 'PDF/Image → Extract amount, client, dates, GST' },
                { id: 'contract' as const, label: 'Contract', desc: 'PDF → Extract billing model, value, terms' },
                { id: 'timesheet' as const, label: 'Timesheet', desc: 'CSV → Import billable hours/activities' },
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setUploadType(type.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${uploadType === type.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <p className="font-medium text-gray-900">{type.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{type.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* File Drop Zone */}
          <div className="card">
            <h3 className="card-header">Upload File</h3>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all">
              <Upload className="w-10 h-10 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700">
                {uploading ? 'Processing...' : 'Click to upload or drag & drop'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {uploadType === 'invoice' ? 'PDF, PNG, JPG (Invoice)' :
                 uploadType === 'contract' ? 'PDF (Contract document)' :
                 'CSV (employee, type, qty, rate, desc, date)'}
              </p>
              <input
                type="file"
                className="hidden"
                accept={uploadType === 'timesheet' ? '.csv,.txt' : '.pdf,.png,.jpg,.jpeg'}
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Extracted Data Preview */}
          {extractedData && (
            <div className="card border-2 border-emerald-200 bg-emerald-50/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">
                  Extracted Data (Confidence: {extractedData.confidence}%)
                </h3>
                <button
                  onClick={handleConfirmInvoice}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  ✓ Confirm & Save to Database
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Invoice #', value: extractedData.invoice_number },
                  { label: 'Client', value: extractedData.client_name },
                  { label: 'Amount', value: extractedData.amount ? `Rs. ${extractedData.amount.toLocaleString('en-IN')}` : '-' },
                  { label: 'Tax (GST)', value: extractedData.tax_amount ? `Rs. ${extractedData.tax_amount.toLocaleString('en-IN')}` : '-' },
                  { label: 'Total', value: extractedData.total_amount ? `Rs. ${extractedData.total_amount.toLocaleString('en-IN')}` : '-' },
                  { label: 'Date', value: extractedData.date },
                  { label: 'Due Date', value: extractedData.due_date },
                  { label: 'PO Number', value: extractedData.po_number },
                ].map((field, i) => (
                  <div key={i} className="bg-white p-3 rounded-lg border border-emerald-100">
                    <p className="text-xs text-gray-500">{field.label}</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{field.value || '—'}</p>
                  </div>
                ))}
              </div>

              {extractedData.items && extractedData.items.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Line Items</p>
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-500 border-b">
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Rate</th>
                      <th className="text-right py-2">Amount</th>
                    </tr></thead>
                    <tbody>
                      {extractedData.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-2">{item.description}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">Rs. {item.rate.toLocaleString('en-IN')}</td>
                          <td className="text-right font-medium">Rs. {item.amount.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          <ManualEntryForm clients={clients} onSuccess={() => { loadChanges(); setMessage({ type: 'success', text: 'Entry saved!' }); }} />
        </div>
      )}

      {/* Change History Tab */}
      {activeTab === 'changes' && (
        <div className="card">
          <h3 className="card-header">Change History (All Modifications Tracked)</h3>
          {changes.length === 0 ? (
            <p className="text-sm text-gray-500">No changes recorded yet. Upload or edit data to see tracking.</p>
          ) : (
            <div className="space-y-2">
              {changes.map(log => (
                <div key={log.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${log.action === 'create' ? 'bg-emerald-500' : log.action === 'delete' ? 'bg-red-500' : log.action === 'upload' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{log.description}</p>
                    <p className="text-xs text-gray-500">{log.entity_type} • {log.user}</p>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : ''}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${log.action === 'create' ? 'bg-emerald-100 text-emerald-700' : log.action === 'delete' ? 'bg-red-100 text-red-700' : log.action === 'upload' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {log.action}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// MANUAL ENTRY FORM COMPONENT
// ============================================================

const ManualEntryForm: React.FC<{ clients: Array<{ id: number; name: string }>; onSuccess: () => void }> = ({ clients, onSuccess }) => {
  const [entryType, setEntryType] = useState<'billable' | 'payment' | 'invoice'>('billable');
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let url = '';
    const formData = new FormData();

    if (entryType === 'billable') {
      url = '/api/data/entry/billable';
      formData.append('client_id', form.client_id || '1');
      formData.append('activity_type', form.activity_type || 'hours');
      formData.append('description', form.description || '');
      formData.append('quantity', form.quantity || '0');
      formData.append('rate', form.rate || '0');
      formData.append('employee_name', form.employee_name || '');
      formData.append('date', form.date || new Date().toISOString().split('T')[0]);
    } else if (entryType === 'payment') {
      url = '/api/data/entry/payment';
      formData.append('invoice_id', form.invoice_id || '1');
      formData.append('amount', form.amount || '0');
      formData.append('payment_method', form.payment_method || 'Bank Transfer');
      formData.append('reference_number', form.reference_number || '');
      formData.append('payment_date', form.payment_date || new Date().toISOString().split('T')[0]);
    } else {
      url = '/api/data/confirm/invoice';
      formData.append('invoice_number', form.invoice_number || `INV-${Date.now()}`);
      formData.append('client_id', form.client_id || '1');
      formData.append('amount', form.amount || '0');
      formData.append('tax_amount', form.tax_amount || '0');
      formData.append('total_amount', form.total_amount || '0');
      formData.append('issue_date', form.issue_date || new Date().toISOString().split('T')[0]);
      formData.append('due_date', form.due_date || '');
      formData.append('po_number', form.po_number || '');
    }

    try {
      const res = await fetch(url, { method: 'POST', body: formData });
      if (res.ok) {
        setForm({});
        onSuccess();
      }
    } catch { /* handle */ }
    setSaving(false);
  };

  return (
    <div className="card">
      <h3 className="card-header">Manual Data Entry</h3>

      {/* Entry Type */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'billable' as const, label: 'Billable Activity' },
          { id: 'payment' as const, label: 'Record Payment' },
          { id: 'invoice' as const, label: 'Create Invoice' },
        ].map(t => (
          <button key={t.id} onClick={() => setEntryType(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${entryType === t.id ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {entryType === 'billable' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Client</label>
                <select value={form.client_id || ''} onChange={e => setForm({ ...form, client_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Activity Type</label>
                <select value={form.activity_type || 'hours'} onChange={e => setForm({ ...form, activity_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="hours">Hours</option>
                  <option value="calls">Calls</option>
                  <option value="meetings">Meetings</option>
                  <option value="deliverables">Deliverables</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Quantity</label>
                <input type="number" step="0.1" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Rate (Rs.)</label>
                <input type="number" step="0.01" value={form.rate || ''} onChange={e => setForm({ ...form, rate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Employee</label>
                <input type="text" value={form.employee_name || ''} onChange={e => setForm({ ...form, employee_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
                <input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
              <input type="text" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </>
        )}

        {entryType === 'payment' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Invoice ID</label>
              <input type="number" value={form.invoice_id || ''} onChange={e => setForm({ ...form, invoice_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Amount (Rs.)</label>
              <input type="number" step="0.01" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Payment Method</label>
              <select value={form.payment_method || 'Bank Transfer'} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option>Bank Transfer</option><option>NEFT</option><option>RTGS</option><option>UPI</option><option>Cheque</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Reference #</label>
              <input type="text" value={form.reference_number || ''} onChange={e => setForm({ ...form, reference_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
              <input type="date" value={form.payment_date || ''} onChange={e => setForm({ ...form, payment_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        )}

        {entryType === 'invoice' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Invoice Number</label>
              <input type="text" value={form.invoice_number || ''} onChange={e => setForm({ ...form, invoice_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Client</label>
              <select value={form.client_id || ''} onChange={e => setForm({ ...form, client_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required>
                <option value="">Select...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Amount (Rs.)</label>
              <input type="number" step="0.01" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Tax/GST (Rs.)</label>
              <input type="number" step="0.01" value={form.tax_amount || ''} onChange={e => setForm({ ...form, tax_amount: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Total (Rs.)</label>
              <input type="number" step="0.01" value={form.total_amount || ''} onChange={e => setForm({ ...form, total_amount: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Issue Date</label>
              <input type="date" value={form.issue_date || ''} onChange={e => setForm({ ...form, issue_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Due Date</label>
              <input type="date" value={form.due_date || ''} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">PO Number</label>
              <input type="text" value={form.po_number || ''} onChange={e => setForm({ ...form, po_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-primary-800 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : `Save ${entryType === 'billable' ? 'Activity' : entryType === 'payment' ? 'Payment' : 'Invoice'}`}
        </button>
      </form>
    </div>
  );
};

export default DataPortal;
