import React, { useEffect, useState } from 'react';
import { IndianRupee, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import { fetchInvoices, fetchInvoiceSummary, markInvoicePaid } from '../api';
import type { Invoice, InvoiceSummary } from '../types';

const formatCurrency = (value: number): string => {
  if (value >= 10000000) return `Rs. ${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `Rs. ${(value / 100000).toFixed(1)} L`;
  return `Rs. ${value.toLocaleString('en-IN')}`;
};

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [inv, sum] = await Promise.all([fetchInvoices(), fetchInvoiceSummary()]);
        setInvoices(inv);
        setSummary(sum);
      } catch { /* mock returned */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleMarkPaid = async (id: string) => {
    try {
      await markInvoicePaid(id);
      setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: 'paid' as const, payment_date: new Date().toISOString().split('T')[0] } : inv));
    } catch { /* handle */ }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <MetricCard key={i} label="" value="" icon={IndianRupee} loading />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Invoiced" value={formatCurrency(summary.total_invoiced)} icon={IndianRupee} trend={4.2} />
          <MetricCard label="Paid" value={`${formatCurrency(summary.total_paid)} (${summary.count_paid})`} icon={CheckCircle} />
          <MetricCard label="Pending" value={`${formatCurrency(summary.total_pending)} (${summary.count_pending})`} icon={Clock} iconColor="text-amber-600" />
          <MetricCard label="Overdue" value={`${formatCurrency(summary.total_overdue)} (${summary.count_overdue})`} icon={AlertCircle} iconColor="text-red-600" />
        </div>
      )}

      {/* Collection Rate */}
      {summary && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Collection Rate</h3>
              <p className="text-2xl font-bold text-gray-900">{summary.collection_rate}%</p>
            </div>
            <div className="w-48 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${summary.collection_rate}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-header mb-0">Invoices ({invoices.length})</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">Invoice #</th>
                <th className="table-header">Client</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Issued</th>
                <th className="table-header">Due Date</th>
                <th className="table-header">Status</th>
                <th className="table-header">Payment Date</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-25">
                  <td className="table-cell font-mono text-xs">{inv.invoice_number}</td>
                  <td className="table-cell font-medium">{inv.client_name}</td>
                  <td className="table-cell">{formatCurrency(inv.amount)}</td>
                  <td className="table-cell whitespace-nowrap">{inv.issued_date}</td>
                  <td className="table-cell whitespace-nowrap">{inv.due_date}</td>
                  <td className="table-cell">
                    <StatusBadge status={inv.status === 'paid' ? 'healthy' : inv.status === 'pending' ? 'warning' : inv.status === 'overdue' ? 'critical' : 'info'} />
                  </td>
                  <td className="table-cell">{inv.payment_date || '-'}</td>
                  <td className="table-cell">
                    {inv.status !== 'paid' && (
                      <button
                        onClick={() => handleMarkPaid(inv.id)}
                        className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-medium hover:bg-emerald-100"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Invoices;
