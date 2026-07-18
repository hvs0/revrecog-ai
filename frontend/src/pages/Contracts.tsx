import React, { useEffect, useState } from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { fetchContracts, fetchAsc606Summary } from '../api';
import type { Contract, Asc606Summary } from '../types';

const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'Rs. 0';
  if (value >= 10000000) return `Rs. ${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `Rs. ${(value / 100000).toFixed(1)} L`;
  return `Rs. ${value.toLocaleString('en-IN')}`;
};

const ASC606_STEPS = [
  { step: 1, name: 'Identify Contract' },
  { step: 2, name: 'Identify Obligations' },
  { step: 3, name: 'Determine Price' },
  { step: 4, name: 'Allocate Price' },
  { step: 5, name: 'Recognize Revenue' },
];

const Contracts: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [asc606, setAsc606] = useState<Asc606Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, a] = await Promise.all([fetchContracts(), fetchAsc606Summary()]);
        setContracts(c);
        setAsc606(a);
      } catch { /* mock data returned */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-lg"></div>)}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ASC 606 Workflow */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-header mb-0">ASC 606 Revenue Recognition Workflow</h3>
          {asc606 && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-700">{asc606.compliance_rate}% Compliant</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-6">
          {ASC606_STEPS.map((s, i) => {
            const count = asc606?.step_distribution.find(d => d.step === s.step)?.count || 0;
            return (
              <React.Fragment key={s.step}>
                <div className="flex flex-col items-center text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${count > 0 ? 'bg-primary-800 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {s.step}
                  </div>
                  <p className="text-xs font-medium mt-2 max-w-[100px]">{s.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{count} contracts</p>
                </div>
                {i < 4 && (
                  <div className="flex-1 h-0.5 bg-gray-200 mx-2 relative top-[-12px]">
                    <div className="h-full bg-primary-800" style={{ width: count > 0 ? '100%' : '0%' }}></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Contracts Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-header mb-0">Contracts ({contracts.length})</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Contract
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">Contract ID</th>
                <th className="table-header">Client</th>
                <th className="table-header">Billing Model</th>
                <th className="table-header">Value</th>
                <th className="table-header">Start</th>
                <th className="table-header">End</th>
                <th className="table-header">Payment Terms</th>
                <th className="table-header">ASC606 Step</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(contract => (
                <tr key={contract.id} className="border-b border-gray-50 hover:bg-gray-25">
                  <td className="table-cell font-mono text-xs">{contract.id}</td>
                  <td className="table-cell font-medium">{contract.client_name}</td>
                  <td className="table-cell">{contract.billing_model}</td>
                  <td className="table-cell">{formatCurrency(contract.value)}</td>
                  <td className="table-cell whitespace-nowrap">{contract.start_date}</td>
                  <td className="table-cell whitespace-nowrap">{contract.end_date}</td>
                  <td className="table-cell">{contract.payment_terms}</td>
                  <td className="table-cell">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-800 rounded text-xs font-medium">
                      Step {contract.asc606_step}: {contract.asc606_step_name}
                    </span>
                  </td>
                  <td className="table-cell">
                    <StatusBadge status={contract.status === 'active' ? 'healthy' : contract.status === 'pending' ? 'warning' : 'info'} />
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

export default Contracts;

