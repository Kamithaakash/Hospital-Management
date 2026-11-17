import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { RoleBadge } from './RoleBadge.js';
import { Alert } from '../types/index.js';
import {
  Bell,
  LogOut,
  ChevronDown,
  Layers,
  ClipboardList,
  QrCode,
  FileText,
  Truck,
  BarChart3,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  alerts: Alert[];
  onOpenQRScanner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  alerts,
  onOpenQRScanner,
}) => {
  const { user, logout, quickSwitchUser } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showAlertMenu, setShowAlertMenu] = useState(false);

  const staffList = [
    { name: 'Priyani Fernando', role: 'HOUSEKEEPING_SUPERVISOR', email: 'supervisor@hemas.lk' },
    { name: 'Dr. Anura Perera', role: 'MANAGER', email: 'manager@hemas.lk' },
    { name: 'Kamal Jayawardena', role: 'STORES_STAFF', email: 'stores@hemas.lk' },
    { name: 'Dilshan Silva', role: 'PROCUREMENT_STAFF', email: 'procurement@hemas.lk' },
    { name: 'System Admin', role: 'ADMIN', email: 'admin@hemas.lk' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Hospital Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/images/icon.png"
              alt="Hemas Hospital Logo"
              className="w-10 h-10 object-contain rounded-xl shadow-2xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base">Hemas Hospital</span>
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                  Housekeeping
                </span>
              </div>
              <p className="text-xs text-slate-500">Thalawathugoda</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'dashboard'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onTabChange('items')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'items'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Inventory</span>
            </button>

            <button
              onClick={() => onTabChange('requests')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'requests'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Requests</span>
            </button>

            <button
              onClick={() => onTabChange('procurement')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'procurement'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>POs</span>
            </button>

            <button
              onClick={() => onTabChange('reports')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'reports'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </button>

            <button
              onClick={onOpenQRScanner}
              className="px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 border border-slate-200"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan QR</span>
            </button>
          </nav>

          {/* Profile & Controls */}
          <div className="flex items-center gap-2.5">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowAlertMenu(!showAlertMenu)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {alerts.length}
                  </span>
                )}
              </button>

              {showAlertMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      Notifications ({alerts.length})
                    </span>
                    <button
                      onClick={() => setShowAlertMenu(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {alerts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No active alerts at this time.
                      </div>
                    ) : (
                      alerts.map((al) => (
                        <div key={al.id} className="p-3 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                al.severity === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                            />
                            <span className="text-[11px] font-bold uppercase text-slate-700">
                              {al.alertType.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{al.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile / Account Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                  {user?.fullName.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-semibold text-slate-900 leading-tight">{user?.fullName}</div>
                  <div className="text-[10px] text-slate-500 leading-none">
                    {user?.role.replace('_', ' ')}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Switch Staff Account
                    </span>
                  </div>
                  <div className="py-1">
                    {staffList.map((p) => (
                      <button
                        key={p.email}
                        onClick={() => {
                          quickSwitchUser(p.email);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between transition-colors ${
                          user?.email === p.email ? 'bg-slate-50 font-semibold' : ''
                        }`}
                      >
                        <div>
                          <div className="text-slate-800">{p.name}</div>
                          <div className="text-[10px] text-slate-400">{p.role.replace('_', ' ')}</div>
                        </div>
                        {user?.email === p.email && (
                          <span className="text-[10px] text-sky-700 font-medium">Active</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Navigation */}
        <nav className="md:hidden border-t border-slate-100 py-2 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'items', label: 'Inventory' },
            { id: 'requests', label: 'Requests' },
            { id: 'procurement', label: 'POs' },
            { id: 'reports', label: 'Reports' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                currentTab === t.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={onOpenQRScanner}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
