import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { RoleBadge } from '../components/RoleBadge.js';
import { Item, Alert, SupplyRequest, PurchaseOrder } from '../types/index.js';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  QrCode,
  FileText,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  BarChart3,
  Sparkles,
} from 'lucide-react';

interface DashboardProps {
  items: Item[];
  alerts: Alert[];
  requests: SupplyRequest[];
  purchaseOrders: PurchaseOrder[];
  onOpenQRScanner: () => void;
  onNavigateTab: (tab: string) => void;
  onRefreshData: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  items,
  requests,
  purchaseOrders,
  onOpenQRScanner,
  onNavigateTab,
}) => {
  const { user } = useAuth();

  const totalItems = items.length;
  const lowStockItems = items.filter(
    (i) => i.stockStatus === 'LOW_STOCK' || i.stockStatus === 'OUT_OF_STOCK'
  );
  const outOfStockItems = items.filter((i) => i.stockStatus === 'OUT_OF_STOCK');
  const expiringSoonCount = items.filter((i) => i.hasExpiringSoon).length;
  const expiredCount = items.filter((i) => i.hasExpired).length;

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const approvedRequests = requests.filter(
    (r) => r.status === 'APPROVED' || r.status === 'PARTIALLY_ISSUED'
  );
  const openPOs = purchaseOrders.filter(
    (po) => po.status === 'OPEN' || po.status === 'PARTIALLY_RECEIVED'
  );

  const watchlistItems = items.filter(
    (i) =>
      i.stockStatus === 'LOW_STOCK' ||
      i.stockStatus === 'OUT_OF_STOCK' ||
      i.hasExpired ||
      i.hasExpiringSoon
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Glassmorphic Header & Quick Actions */}
      <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-5">
        {/* Top specular highlight line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        <div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {user?.fullName}
            </h1>
            <RoleBadge role={user?.role || 'ADMIN'} size="sm" />
          </div>
          <p className="text-xs text-slate-600 font-semibold mt-1">
            Hemas Hospital Thalawathugoda &bull; Smart Housekeeping Supply Management
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={onOpenQRScanner}
            className="px-3 sm:px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/15 active:scale-[0.98] transition-all"
          >
            <QrCode className="w-3.5 h-3.5 text-sky-400" />
            <span>Scan QR</span>
          </button>
          <button
            onClick={() => onNavigateTab('requests')}
            className="px-3 sm:px-3.5 py-2 rounded-xl glass-pill hover:bg-sky-500/20 text-sky-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-sky-700" />
            <span>Requests ({pendingRequests.length + approvedRequests.length})</span>
          </button>
          <button
            onClick={() => onNavigateTab('procurement')}
            className="px-3 sm:px-3.5 py-2 rounded-xl glass-pill hover:bg-amber-500/20 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all"
          >
            <Truck className="w-3.5 h-3.5 text-amber-700" />
            <span>POs ({openPOs.length})</span>
          </button>
          <button
            onClick={() => onNavigateTab('reports')}
            className="px-3 sm:px-3.5 py-2 rounded-xl glass-pill hover:bg-emerald-500/20 text-emerald-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {/* 4 Clickable Glass KPI Summary Cards - 2x2 on Mobile, 4-col on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <button
          onClick={() => onNavigateTab('items')}
          className="text-left glass-card glass-card-interactive p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-400/15 rounded-full blur-2xl group-hover:bg-sky-400/25 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Catalog Items</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-500/15 flex items-center justify-center border border-sky-400/30">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-800" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 sm:mt-3">{totalItems}</div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5 truncate">Active inventory items</div>
        </button>

        <button
          onClick={() => onNavigateTab('items')}
          className="text-left glass-card glass-card-interactive p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/15 rounded-full blur-2xl group-hover:bg-amber-400/25 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Low Stock</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 flex items-center justify-center border border-amber-400/30">
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-2 sm:mt-3">{lowStockItems.length}</div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
            {outOfStockItems.length > 0 ? `${outOfStockItems.length} out of stock` : 'At or below reorder'}
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('items')}
          className="text-left glass-card glass-card-interactive p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-400/15 rounded-full blur-2xl group-hover:bg-rose-400/25 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Expiry Watch</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-500/15 flex items-center justify-center border border-rose-400/30">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-700" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-2 sm:mt-3">
            {expiringSoonCount + expiredCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
            {expiredCount} expired &bull; {expiringSoonCount} soon
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('requests')}
          className="text-left glass-card glass-card-interactive p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/15 rounded-full blur-2xl group-hover:bg-blue-400/25 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Workflows</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500/15 flex items-center justify-center border border-blue-400/30">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-800" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-800 mt-2 sm:mt-3">
            {pendingRequests.length + approvedRequests.length + openPOs.length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
            {pendingRequests.length} pending &bull; {openPOs.length} POs
          </div>
        </button>
      </div>

      {/* Clean 2-Column Operational View with Glass Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: Active Tasks for Current Role */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-white/30">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {user?.role === 'MANAGER'
                    ? 'Requests Awaiting Approval'
                    : user?.role === 'STORES_STAFF'
                    ? 'Ready for Stock Issue & Delivery Verification'
                    : user?.role === 'PROCUREMENT_STAFF'
                    ? 'Active Purchase Orders'
                    : 'Recent Supply Requests'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Priority operational items requiring action
                </p>
              </div>
              <button
                onClick={() =>
                  onNavigateTab(user?.role === 'PROCUREMENT_STAFF' ? 'procurement' : 'requests')
                }
                className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 glass-pill px-2.5 py-1 rounded-xl transition-all"
              >
                <span>Open Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-white/20 mt-2">
              {user?.role === 'PROCUREMENT_STAFF' ? (
                purchaseOrders.slice(0, 4).map((po) => (
                  <div key={po.id} className="py-3 flex items-center justify-between gap-3 hover:bg-white/20 px-2 rounded-xl transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {po.poNumber}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-800 border border-sky-400/20">
                          {po.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {po.supplierName} &bull; {po.items.length} item(s)
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigateTab('procurement')}
                      className="px-3 py-1 text-xs font-semibold rounded-xl glass-pill hover:bg-white text-slate-700 transition-all"
                    >
                      View PO
                    </button>
                  </div>
                ))
              ) : (
                requests.slice(0, 4).map((req) => (
                  <div key={req.id} className="py-3 flex items-center justify-between gap-3 hover:bg-white/20 px-2 rounded-xl transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">
                          Request #{req.requestCode.replace(/^REQ-/, '')}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            req.status === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-900 border border-amber-400/30'
                              : req.status === 'APPROVED'
                              ? 'bg-sky-500/15 text-sky-900 border border-sky-400/30'
                              : req.status === 'FULFILLED'
                              ? 'bg-emerald-500/15 text-emerald-900 border border-emerald-400/30'
                              : 'bg-slate-200/50 text-slate-700'
                          }`}
                        >
                          {req.status}
                        </span>
                        {req.urgency === 'URGENT' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                            URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {req.targetArea} &bull; {req.items.length} item(s)
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigateTab('requests')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl glass-pill hover:bg-sky-500/20 text-sky-900 border-sky-400/30 transition-all"
                    >
                      {req.status === 'PENDING' && user?.role === 'MANAGER'
                        ? 'Review'
                        : req.status === 'APPROVED' && user?.role === 'STORES_STAFF'
                        ? 'Issue FEFO'
                        : 'Open'}
                    </button>
                  </div>
                ))
              )}

              {requests.length === 0 && user?.role !== 'PROCUREMENT_STAFF' && (
                <div className="py-8 text-center text-xs text-slate-400">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  No active requests in queue.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Critical Stock & Expiry Watchlist */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-white/30">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Attention Needed (Low Stock & Expiry)</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Items below reorder threshold or with expiring/expired batches
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('items')}
                className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 glass-pill px-2.5 py-1 rounded-xl transition-all"
              >
                <span>All Items ({items.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-white/20 mt-2">
              {watchlistItems.slice(0, 5).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-white/20 px-2 rounded-xl transition-colors">
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-900 truncate">
                      {item.name}{' '}
                      <span className="font-mono text-[11px] text-slate-400">({item.sku})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="font-medium">{item.storageLocation}</span>
                      {item.hasExpired && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 border border-rose-300/40 font-bold text-[10px]">
                          Expired Batch
                        </span>
                      )}
                      {item.hasExpiringSoon && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 border border-amber-300/40 font-bold text-[10px]">
                          Expiring Soon
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-extrabold ${
                        item.stockStatus === 'OUT_OF_STOCK'
                          ? 'text-rose-600'
                          : item.stockStatus === 'LOW_STOCK'
                          ? 'text-amber-600'
                          : 'text-slate-800'
                      }`}
                    >
                      {item.totalStock} {item.unit}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">Reorder Level: {item.reorderPoint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
