import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Receipt,
  AlertTriangle,
  IndianRupee,
  Settings,
  Menu,
  X,
  ChevronLeft,
  Activity,
  Upload,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/data', label: 'Data Portal', icon: Upload },
  { path: '/clients', label: 'Profitability', icon: Building2 },
  { path: '/contracts', label: 'Contracts', icon: FileText },
  { path: '/invoices', label: 'Invoices', icon: Receipt },
  { path: '/leakage', label: 'Leakage', icon: AlertTriangle },
  { path: '/revenue', label: 'Revenue', icon: IndianRupee },
  { path: '/admin', label: 'Admin', icon: Settings },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const current = navItems.find((item) => item.path === location.pathname);
    return current?.label || 'Dashboard';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out bg-gradient-to-b from-primary-800 to-primary-900
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className={`flex items-center h-16 px-4 border-b border-white/10 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-900" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white leading-tight">RevRecog AI</h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">by Finmark.ai</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-900" />
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {!sidebarCollapsed && (
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-xs font-bold text-primary-900">
                DA
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Demo Admin</p>
                <p className="text-xs text-gray-400 truncate">Finance Team</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h2>
              <p className="text-xs text-gray-500">RevRecog AI + ClientMargin360 • Finmark.ai</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-medium text-emerald-700">System Online</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
