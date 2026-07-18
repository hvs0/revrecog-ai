import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CheckCircle2 } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { fetchRevenueRecognition, fetchRevByClient } from '../api';
import type { RevenueRecord, RevenueByClient } from '../types';

const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'Rs. 0';
  if (value >= 10000000) return `Rs. ${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `Rs. ${(value / 100000).toFixed(1)} L`;
  return `Rs. ${value.toLocaleString('en-IN')}`;
};

const formatCurrencyShort = (value: number): string => {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  return value.toLocaleString('en-IN');
};

const Revenue: React.FC = () => {
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [byClient, setByClient] = useState<RevenueByClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [r, c] = await Promise.all([fetchRevenueRecognition(), fetchRevByClient()]);
        setRecords(r);
        setByClient(c);
      } catch { /* mock returned */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-48 w-full rounded-lg"></div>)}</div>;
  }

  const compliantCount = byClient.filter(c => c.compliance_status === 'compliant').length;
  const complianceRate = byClient.length > 0 ? Math.round((compliantCount / byClient.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ASC 606 Compliance Summary */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">ASC 606 Compliance Summary</h3>
            <p className="text-sm text-gray-500 mt-1">Revenue recognition compliance across all clients</p>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-700">{complianceRate}%</p>
              <p className="text-xs text-gray-500">{compliantCount}/{byClient.length} compliant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Recognition Chart */}
      <div className="card">
        <h3 className="card-header">Monthly Revenue Recognition</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={records}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" fontSize={12} tickLine={false} />
            <YAxis fontSize={12} tickLine={false} tickFormatter={(v) => formatCurrencyShort(v)} />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value)]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Legend />
            <Bar dataKey="recognized" fill="#1F3864" name="Recognized" radius={[2, 2, 0, 0]} />
            <Bar dataKey="deferred" fill="#FFC107" name="Deferred" radius={[2, 2, 0, 0]} />
            <Bar dataKey="unbilled" fill="#EF4444" name="Unbilled" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-Client Table */}
      <div className="card">
        <h3 className="card-header">Revenue Recognition by Client</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">Client</th>
                <th className="table-header">Recognized</th>
                <th className="table-header">Deferred</th>
                <th className="table-header">Unbilled</th>
                <th className="table-header">Total</th>
                <th className="table-header">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {byClient.map(client => (
                <tr key={client.client_name} className="border-b border-gray-50 hover:bg-gray-25">
                  <td className="table-cell font-medium">{client.client_name}</td>
                  <td className="table-cell">{formatCurrency(client.recognized)}</td>
                  <td className="table-cell text-amber-600">{formatCurrency(client.deferred)}</td>
                  <td className="table-cell text-red-600">{formatCurrency(client.unbilled)}</td>
                  <td className="table-cell font-semibold">{formatCurrency(client.recognized + client.deferred + client.unbilled)}</td>
                  <td className="table-cell">
                    <StatusBadge status={
                      client.compliance_status === 'compliant' ? 'healthy' :
                      client.compliance_status === 'review_needed' ? 'warning' : 'critical'
                    } />
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

export default Revenue;


