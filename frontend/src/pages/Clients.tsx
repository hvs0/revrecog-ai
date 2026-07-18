import React, { useEffect, useState } from 'react';
import { Plus, Download, Search, X, Trash2, Edit, Lightbulb } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { fetchClients, createClient, updateClient, deleteClient } from '../api';
import type { Client } from '../types';

const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'Rs. 0';
  if (value >= 10000000) return `Rs. ${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `Rs. ${(value / 100000).toFixed(1)} L`;
  return `Rs. ${value.toLocaleString('en-IN')}`;
};

const getMarginColor = (margin: number): string => {
  if (margin > 15) return 'text-emerald-600';
  if (margin >= 12) return 'text-amber-600';
  return 'text-red-600';
};

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterGeo, setFilterGeo] = useState('');
  const [filterBilling, setFilterBilling] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', industry: '', geography: '', billing_model: 'T&M',
    monthly_revenue: 0, monthly_cost: 0, contract_value: 0,
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch { /* mock data already returned */ }
    finally { setLoading(false); }
  };

  const industries = [...new Set(clients.map(c => c.industry).filter(Boolean))];
  const geographies = [...new Set(clients.map(c => c.geography).filter(Boolean))];
  const billingModels = [...new Set(clients.map(c => c.billing_model).filter(Boolean))];

  const filtered = clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterIndustry && c.industry !== filterIndustry) return false;
    if (filterGeo && c.geography !== filterGeo) return false;
    if (filterBilling && c.billing_model !== filterBilling) return false;
    return true;
  });

  const handleSave = async () => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData as any);
      } else {
        await createClient(formData as any);
      }
      await loadClients();
    } catch { /* handle error */ }
    setShowModal(false);
    setEditingClient(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClient(id);
      setClients(clients.filter(c => c.id !== id));
    } catch { /* handle error */ }
    setDeleteConfirm(null);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name, industry: client.industry, geography: client.geography,
      billing_model: client.billing_model, monthly_revenue: client.monthly_revenue,
      monthly_cost: client.monthly_cost, contract_value: client.contract_value,
    });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingClient(null);
    setFormData({ name: '', industry: '', geography: '', billing_model: 'T&M', monthly_revenue: 0, monthly_cost: 0, contract_value: 0 });
    setShowModal(true);
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-lg"></div>)}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" placeholder="Search clients..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">All Industries</option>
            {industries.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={filterGeo} onChange={e => setFilterGeo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">All Geographies</option>
            {geographies.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filterBilling} onChange={e => setFilterBilling(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">All Billing Models</option>
            {billingModels.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Client
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Client Table */}
      <div className="card">
        <h3 className="card-header">Client Profitability ({filtered.length} clients)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">Client</th>
                <th className="table-header">Industry</th>
                <th className="table-header">Geography</th>
                <th className="table-header">Billing Model</th>
                <th className="table-header">Monthly Revenue</th>
                <th className="table-header">Monthly Cost</th>
                <th className="table-header">Net Margin %</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => (
                <React.Fragment key={client.id}>
                  <tr className="border-b border-gray-50 hover:bg-gray-25">
                    <td className="table-cell font-medium">{client.name}</td>
                    <td className="table-cell">{client.industry}</td>
                    <td className="table-cell">{client.geography}</td>
                    <td className="table-cell">{client.billing_model}</td>
                    <td className="table-cell">{formatCurrency(client.monthly_revenue)}</td>
                    <td className="table-cell">{formatCurrency(client.monthly_cost)}</td>
                    <td className="table-cell">
                      <span className={`font-bold ${getMarginColor(client.net_margin_pct)}`}>
                        {client.net_margin_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="table-cell"><StatusBadge status={client.status} /></td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(client)} className="p-1 hover:bg-gray-100 rounded"><Edit className="w-4 h-4 text-gray-500" /></button>
                        <button onClick={() => setDeleteConfirm(client.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                  {client.ai_recommendation && (
                    <tr className="bg-amber-50/50">
                      <td colSpan={9} className="px-4 py-2">
                        <div className="flex items-center gap-2 text-sm text-amber-800">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          <span className="font-medium">AI Recommendation:</span> {client.ai_recommendation}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Delete Client?</h3>
            <p className="text-sm text-gray-600 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingClient ? 'Edit Client' : 'Add Client'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <input type="text" value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geography</label>
                  <input type="text" value={formData.geography} onChange={e => setFormData({ ...formData, geography: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Model</label>
                <select value={formData.billing_model} onChange={e => setFormData({ ...formData, billing_model: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="T&M">T&M</option>
                  <option value="Milestone">Milestone</option>
                  <option value="Retainer">Retainer</option>
                  <option value="Performance">Performance</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Revenue</label>
                  <input type="number" value={formData.monthly_revenue} onChange={e => setFormData({ ...formData, monthly_revenue: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Cost</label>
                  <input type="number" value={formData.monthly_cost} onChange={e => setFormData({ ...formData, monthly_cost: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Value</label>
                <input type="number" value={formData.contract_value} onChange={e => setFormData({ ...formData, contract_value: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;

