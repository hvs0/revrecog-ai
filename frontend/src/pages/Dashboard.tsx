import React, { useEffect, useState } from 'react';
import {
  IndianRupee,
  Receipt,
  Percent,
  Building2,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import { fetchDashboard } from '../api';
import type { DashboardData } from '../types';

const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'Rs. 0';
  if (value >= 10000000) {
    return `Rs. ${(value / 10000000).toFixed(1)} Cr`;
  }
  if (value >= 100000) {
    return `Rs. ${(value / 100000).toFixed(1)} L`;
  }
  return `Rs. ${value.toLocaleString('en-IN')}`;
};

const formatCurrencyShort = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '0';
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  return value.toLocaleString('en-IN');
};

const COLORS = ['#1F3864', '#2D5AA0', '#4A90D9', '#FFC107', '#FF8F00'];

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchDashboard();
        setData(result);
      } catch (error) {
        console.warn('API unavailable, using mock data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MetricCard key={i} label="" value="" icon={IndianRupee} loading />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, monthly_trends, top_accounts, bottom_accounts, billing_breakdown, recent_alerts } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Total Contract Value"
          value={formatCurrency(metrics.total_contract_value)}
          trend={5.2}
          icon={FileText}
        />
        <MetricCard
          label="Monthly Revenue"
          value={formatCurrency(metrics.monthly_revenue)}
          trend={3.8}
          icon={IndianRupee}
        />
        <MetricCard
          label="Revenue Leakage"
          value={`${formatCurrency(metrics.revenue_leakage)}/mo`}
          trend={-2.1}
          icon={AlertTriangle}
          iconColor="text-red-600"
        />
        <MetricCard
          label="Active Clients"
          value={metrics.active_clients.toString()}
          trend={2}
          icon={Building2}
        />
        <MetricCard
          label="Net Margin Avg"
          value={`${metrics.net_margin_avg}%`}
          trend={0.8}
          icon={Percent}
        />
        <MetricCard
          label="Open Alerts"
          value={metrics.open_alerts.toString()}
          trend={-5}
          icon={Receipt}
          iconColor="text-amber-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Cost Trend */}
        <div className="card lg:col-span-2">
          <h3 className="card-header">Monthly Revenue vs Cost Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthly_trends}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1F3864" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1F3864" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" fontSize={12} tickLine={false} />
              <YAxis fontSize={12} tickLine={false} tickFormatter={(v) => formatCurrencyShort(v)} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value)]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#1F3864" fill="url(#colorRevenue)" strokeWidth={2} name="Revenue" />
              <Area type="monotone" dataKey="cost" stroke="#EF4444" fill="url(#colorCost)" strokeWidth={2} name="Cost" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Billing Model Breakdown */}
        <div className="card">
          <h3 className="card-header">Billing Model Breakdown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={billing_breakdown}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="percentage"
                nameKey="model"
                label={({ model, percentage }) => `${model}: ${percentage}%`}
                labelLine={false}
                fontSize={10}
              >
                {billing_breakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value}%`, name]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top/Bottom Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="card-header">Top 5 Clients by Margin</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Client</th>
                  <th className="table-header">Revenue</th>
                  <th className="table-header">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {top_accounts.map((acc, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-25">
                    <td className="table-cell font-medium">{acc.client_name}</td>
                    <td className="table-cell">{formatCurrency(acc.revenue)}</td>
                    <td className="table-cell">
                      <span className="text-emerald-600 font-semibold">{acc.margin_pct.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="card-header">Bottom 5 Clients by Margin</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Client</th>
                  <th className="table-header">Revenue</th>
                  <th className="table-header">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {bottom_accounts.map((acc, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-25">
                    <td className="table-cell font-medium">{acc.client_name}</td>
                    <td className="table-cell">{formatCurrency(acc.revenue)}</td>
                    <td className="table-cell">
                      <span className="text-red-600 font-semibold">{acc.margin_pct.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="card">
        <h3 className="card-header">Recent Alerts</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">Date</th>
                <th className="table-header">Type</th>
                <th className="table-header">Severity</th>
                <th className="table-header">Message</th>
                <th className="table-header">Client</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent_alerts.map((alert) => (
                <tr key={alert.id} className="border-b border-gray-50 hover:bg-gray-25">
                  <td className="table-cell whitespace-nowrap">{alert.date}</td>
                  <td className="table-cell font-medium">{alert.type}</td>
                  <td className="table-cell">
                    <StatusBadge status={alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info'} />
                  </td>
                  <td className="table-cell max-w-xs truncate">{alert.message}</td>
                  <td className="table-cell">{alert.client}</td>
                  <td className="table-cell">
                    <StatusBadge status={alert.status as any} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Saving Banner */}
      <div className="bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl p-6 text-center shadow-lg">
        <p className="text-primary-900 font-bold text-lg">
          💰 SAVING POTENTIAL: Rs. 3-6 Cr/year + Rs. 9-15 Cr leakage recovery
        </p>
        <p className="text-primary-800 text-sm mt-1">
          Powered by RevRecog AI + ClientMargin360 • Finmark.ai
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
