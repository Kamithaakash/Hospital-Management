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
    <header className="glass-header sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Hospital Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/images/icon.png"
              alt="Hemas Hospital Logo"
              className="w-10 h-10 object-contain rounded-xl shadow-xs border border-white/60 bg-white/50 p-0.5"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base">Hemas Hospital</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-800 border border-sky-400/20 backdrop-blur-xs">
                  Housekeeping
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Thalawathugoda</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 ${
                currentTab === 'dashboard'
                  ? 'bg-sky-500/15 text-sky-900 border border-sky-500/30 shadow-xs font-semibold backdrop-blur-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent hover:border-white/80'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onTabChange('items')}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 ${
                currentTab === 'items'
                  ? 'bg-sky-500/15 text-sky-900 border border-sky-500/30 shadow-xs font-semibold backdrop-blur-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent hover:border-white/80'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Inventory</span>
            </button>

            <button
              onClick={() => onTabChange('requests')}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 ${
                currentTab === 'requests'
                  ? 'bg-sky-500/15 text-sky-900 border border-sky-500/30 shadow-xs font-semibold backdrop-blur-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent hover:border-white/80'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Requests</span>
            </button>

            <button
              onClick={() => onTabChange('procurement')}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 ${
                currentTab === 'procurement'
                  ? 'bg-sky-500/15 text-sky-900 border border-sky-500/30 shadow-xs font-semibold backdrop-blur-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent hover:border-white/80'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Purchase Orders</span>
            </button>

            <button
              onClick={() => onTabChange('reports')}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 ${
                currentTab === 'reports'
                  ? 'bg-sky-500/15 text-sky-900 border border-sky-500/30 shadow-xs font-semibold backdrop-blur-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent hover:border-white/80'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Reports</span>
            </button>

            <button
              onClick={onOpenQRScanner}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-800 glass-pill hover:bg-white/90 hover:border-sky-300/60 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <QrCode className="w-3.5 h-3.5 text-sky-700" />
              <span>Scan QR</span>
            </button>
          </nav>

          {/* Profile & Controls */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowAlertMenu(!showAlertMenu)}
                className="relative p-2 text-slate-600 hover:text-slate-900 glass-pill hover:bg-white/90 rounded-xl transition-all"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {alerts.length}
                  </span>
                )}
              </button>

              {showAlertMenu && (
                <div className="absolute right-0 mt-2 w-80 glass-modal rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-white/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Notifications ({alerts.length})
                    </span>
                    <button
                      onClick={() => setShowAlertMenu(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-white/40">
                    {alerts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No active alerts at this time.
                      </div>
                    ) : (
                      alerts.map((al) => (
                        <div key={al.id} className="p-3 hover:bg-white/60 transition-colors">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                al.severity === 'CRITICAL' ? 'bg-rose-500 ring-2 ring-rose-200' : 'bg-amber-500 ring-2 ring-amber-200'
                              }`}
                            />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                              {al.alertType.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{al.message}</p>
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
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl glass-pill hover:bg-white/90 text-slate-700 text-xs transition-all shadow-2xs"
              >
                <div className="w-6 h-6 rounded-lg bg-sky-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
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
                <div className="absolute right-0 mt-2 w-64 glass-modal rounded-2xl shadow-xl py-1.5 z-50">
                  <div className="px-3 py-1.5 border-b border-white/60">
                    <span className="text-[11px] font-bold text-slate-600">
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
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-white/70 flex items-center justify-between transition-colors ${
                          user?.email === p.email ? 'bg-white/90 font-semibold ring-1 ring-sky-500/20' : ''
                        }`}
                      >
                        <div>
                          <div className="text-slate-900">{p.name}</div>
                          <div className="text-[10px] text-slate-500">{p.role.replace('_', ' ')}</div>
                        </div>
                        {user?.email === p.email && (
                          <span className="text-[10px] text-sky-700 font-bold px-1.5 py-0.5 rounded bg-sky-50">Active</span>
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
              className="p-2 text-slate-500 hover:text-slate-900 glass-pill hover:bg-rose-50/70 hover:text-rose-700 rounded-xl transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Navigation */}
        <nav className="md:hidden border-t border-white/40 py-2 flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'items', label: 'Inventory' },
            { id: 'requests', label: 'Requests' },
            { id: 'procurement', label: 'Purchase Orders' },
            { id: 'reports', label: 'Reports' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                currentTab === t.id
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'glass-pill text-slate-700 hover:bg-white'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={onOpenQRScanner}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap glass-pill text-sky-800 hover:bg-sky-50 flex items-center gap-1"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
