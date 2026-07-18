import React, { useEffect, useState } from 'react';
import { AlertTriangle, Shield, TrendingDown, CheckCircle } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import { fetchLeakageAlerts, fetchLeakageSummary, fetchUnbilledWork, resolveAlert, acknowledgeAlert } from '../api';
import type { LeakageAlert, LeakageSummary, UnbilledWork } from '../types';

const formatCurrency = (value: number): string => {
  if (value >= 10000000) return `Rs. ${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `Rs. ${(value / 100000).toFixed(1)} L`;
  return `Rs. ${value.toLocaleString('en-IN')}`;
};

const Leakage: React.FC = () => {
  const [alerts, setAlerts] = useState<LeakageAlert[]>([]);
  const [summary, setSummary] = useState<LeakageSummary | null>(null);
  const [unbilled, setUnbilled] = useState<UnbilledWork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [a, s, u] = await Promise.all([
          fetchLeakageAlerts(), fetchLeakageSummary(), fetchUnbilledWork()
        ]);
        setAlerts(a);
        setSummary(s);
        setUnbilled(u);
      } catch { /* mock returned */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await resolveAlert(id, 'Resolved from UI');
      setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'resolved' as const } : a));
    } catch { /* handle */ }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'acknowledged' as const } : a));
    } catch { /* handle */ }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <MetricCard key={i} label="" value="" icon={AlertTriangle} loading />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Metrics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Detected" value={formatCurrency(summary.total_detected)} icon={AlertTriangle} iconColor="text-red-600" />
          <MetricCard label="Open Amount" value={formatCurrency(summary.open_amount)} icon={TrendingDown} iconColor="text-amber-600" />
          <MetricCard label="Recovered" value={formatCurrency(summary.recovered_amount)} icon={CheckCircle} />
          <MetricCard label="Recovery Rate" value={`${summary.recovery_rate}%`} icon={Shield} />
        </div>
      )}

      {/* Monthly Leakage Highlight */}
      {summary && (
        <div className="card border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Monthly Revenue Leakage</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.monthly_leakage)}/month</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Annualized Impact</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.annualized_leakage)}/year</p>
            </div>
          </div>
        </div>
      )}

      {/* Leakage by Type */}
      {summary && (
        <div className="card">
          <h3 className="card-header">Leakage by Type</h3>
          <div className="space-y-4">
            {summary.by_type.map(item => (
              <div key={item.type} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700">{item.type}</div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${item.percentage}%` }}></div>
                  </div>
                </div>
                <div className="w-24 text-sm text-right font-medium">{formatCurrency(item.amount)}</div>
                <div className="w-12 text-xs text-right text-gray-500">{item.percentage}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Table */}
      <div className="card">
        <h3 className="card-header">Leakage Alerts ({alerts.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">Client</th>
                <th className="table-header">Type</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Severity</th>
                <th className="table-header">Days Open</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(alert => (
                <tr key={alert.id} className="border-b border-gray-50 hover:bg-gray-25">
                  <td className="table-cell font-medium">{alert.client_name}</td>
                  <td className="table-cell">{alert.type}</td>
                  <td className="table-cell font-semibold text-red-600">{formatCurrency(alert.amount)}</td>
                  <td className="table-cell"><StatusBadge status={alert.severity} /></td>
                  <td className="table-cell">{alert.days_open} days</td>
                  <td className="table-cell"><StatusBadge status={alert.status as any} /></td>
                  <td className="table-cell">
                    {alert.status === 'open' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleResolve(alert.id)} className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-medium hover:bg-emerald-100">
                          Resolve
                        </button>
                        <button onClick={() => handleAcknowledge(alert.id)} className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-medium hover:bg-amber-100">
                          Acknowledge
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unbilled Work */}
      <div className="card">
        <h3 className="card-header">Unbilled Work</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">Client</th>
                <th className="table-header">Description</th>
                <th className="table-header">Hours</th>
                <th className="table-header">Est. Value</th>
                <th className="table-header">Days Unbilled</th>
              </tr>
            </thead>
            <tbody>
              {unbilled.map(item => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-25">
                  <td className="table-cell font-medium">{item.client_name}</td>
                  <td className="table-cell">{item.description}</td>
                  <td className="table-cell">{item.hours}h</td>
                  <td className="table-cell font-semibold">{formatCurrency(item.estimated_value)}</td>
                  <td className="table-cell">
                    <span className={`font-medium ${item.days_unbilled > 25 ? 'text-red-600' : 'text-amber-600'}`}>
                      {item.days_unbilled} days
                    </span>
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

export default Leakage;
