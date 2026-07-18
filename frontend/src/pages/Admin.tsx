import React, { useEffect, useState } from 'react';
import { Users, Settings, FileText, Database, Plus, RotateCcw, Download } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { fetchUsers, createUser, fetchSettings, updateSetting, fetchAuditLog, resetDatabase } from '../api';
import type { User, Setting, AuditLogEntry } from '../types';

type TabId = 'users' | 'settings' | 'audit' | 'system';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingSettingKey, setEditingSettingKey] = useState<string | null>(null);
  const [editingSettingValue, setEditingSettingValue] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'viewer' as const });

  useEffect(() => {
    const load = async () => {
      try {
        const [u, s, a] = await Promise.all([fetchUsers(), fetchSettings(), fetchAuditLog()]);
        setUsers(u);
        setSettings(s);
        setAuditLog(a);
      } catch { /* mock returned */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleCreateUser = async () => {
    try {
      await createUser(newUser as any);
      const u = await fetchUsers();
      setUsers(u);
    } catch { /* handle */ }
    setShowUserModal(false);
    setNewUser({ name: '', email: '', role: 'viewer' });
  };

  const handleUpdateSetting = async (key: string) => {
    try {
      await updateSetting(key, editingSettingValue);
      setSettings(settings.map(s => s.key === key ? { ...s, value: editingSettingValue } : s));
    } catch { /* handle */ }
    setEditingSettingKey(null);
  };

  const handleReset = async () => {
    if (window.confirm('Reset database? This cannot be undone.')) {
      try { await resetDatabase(); } catch { /* handle */ }
    }
  };

  const tabs = [
    { id: 'users' as TabId, label: 'Users', icon: Users },
    { id: 'settings' as TabId, label: 'Settings', icon: Settings },
    { id: 'audit' as TabId, label: 'Audit Log', icon: FileText },
    { id: 'system' as TabId, label: 'System', icon: Database },
  ];

  if (loading) {
    return <div className="animate-pulse space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-lg"></div>)}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-800 text-primary-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="card-header mb-0">Users ({users.length})</h3>
            <button onClick={() => setShowUserModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-25">
                    <td className="table-cell font-medium">{user.name}</td>
                    <td className="table-cell">{user.email}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'finance' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'manager' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="table-cell"><StatusBadge status={user.status === 'active' ? 'healthy' : 'critical'} /></td>
                    <td className="table-cell text-sm">{new Date(user.last_login).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card">
          <h3 className="card-header">System Settings</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Key</th>
                  <th className="table-header">Value</th>
                  <th className="table-header">Description</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {settings.map(setting => (
                  <tr key={setting.key} className="border-b border-gray-50 hover:bg-gray-25">
                    <td className="table-cell font-mono text-xs">{setting.key}</td>
                    <td className="table-cell">
                      {editingSettingKey === setting.key ? (
                        <input
                          type="text" value={editingSettingValue}
                          onChange={e => setEditingSettingValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleUpdateSetting(setting.key)}
                          className="px-2 py-1 border border-primary-300 rounded text-sm w-24"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium">{setting.value}</span>
                      )}
                    </td>
                    <td className="table-cell text-sm text-gray-600">{setting.description}</td>
                    <td className="table-cell"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{setting.category}</span></td>
                    <td className="table-cell">
                      {editingSettingKey === setting.key ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateSetting(setting.key)} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs">Save</button>
                          <button onClick={() => setEditingSettingKey(null)} className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingSettingKey(setting.key); setEditingSettingValue(setting.value); }} className="px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs">Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="card">
          <h3 className="card-header">Audit Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Action</th>
                  <th className="table-header">Entity</th>
                  <th className="table-header">User</th>
                  <th className="table-header">Details</th>
                  <th className="table-header">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map(entry => (
                  <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-25">
                    <td className="table-cell">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        entry.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                        entry.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                        entry.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="table-cell">{entry.entity}</td>
                    <td className="table-cell font-medium">{entry.user_name}</td>
                    <td className="table-cell text-sm text-gray-600 max-w-xs truncate">{entry.details}</td>
                    <td className="table-cell whitespace-nowrap text-sm">{new Date(entry.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="card">
          <h3 className="card-header">System Management</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Database</p>
              <p className="text-xs text-gray-500 mt-1">SQLite • RevRecog AI + ClientMargin360</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm hover:bg-red-100">
                <RotateCcw className="w-4 h-4" /> Reset Database
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg text-sm hover:bg-primary-100">
                <Download className="w-4 h-4" /> Export Clients
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg text-sm hover:bg-primary-100">
                <Download className="w-4 h-4" /> Export Invoices
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg text-sm hover:bg-primary-100">
                <Download className="w-4 h-4" /> Export Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as any })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="admin">Admin</option>
                  <option value="finance">Finance</option>
                  <option value="manager">Manager</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowUserModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreateUser} className="px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
