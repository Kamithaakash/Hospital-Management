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
    <div className="space-y-5">
      {/* Compact Header & Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-slate-900">
              {user?.fullName}
            </h1>
            <RoleBadge role={user?.role || 'ADMIN'} size="sm" />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hemas Hospital, Thalawathugoda &bull; Smart Housekeeping Supply Management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenQRScanner}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </button>
          <button
            onClick={() => onNavigateTab('requests')}
            className="px-3.5 py-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Requests ({pendingRequests.length + approvedRequests.length})</span>
          </button>
          <button
            onClick={() => onNavigateTab('procurement')}
            className="px-3.5 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>POs ({openPOs.length})</span>
          </button>
          <button
            onClick={() => onNavigateTab('reports')}
            className="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {/* 4 Clickable KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigateTab('items')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Catalog Items</span>
            <Package className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalItems}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Click to browse inventory</div>
        </button>

        <button
          onClick={() => onNavigateTab('items')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-300 shadow-2xs transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Low / Out of Stock</span>
            <TrendingDown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{lowStockItems.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {outOfStockItems.length > 0 ? `${outOfStockItems.length} out of stock` : 'At or below reorder point'}
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('items')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-rose-300 shadow-2xs transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Expiry Watch</span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            {expiringSoonCount + expiredCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {expiredCount} expired &bull; {expiringSoonCount} expiring soon
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('requests')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-sky-300 shadow-2xs transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Active Workflows</span>
            <FileText className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-sky-700 mt-2">
            {pendingRequests.length + approvedRequests.length + openPOs.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {pendingRequests.length} pending &bull; {approvedRequests.length} to issue &bull; {openPOs.length} POs
          </div>
        </button>
      </div>

      {/* Clean 2-Column Operational View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Active Tasks for Current Role */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {user?.role === 'MANAGER'
                    ? 'Requests Awaiting Approval'
                    : user?.role === 'STORES_STAFF'
                    ? 'Ready for FEFO Issue & PO Verification'
                    : user?.role === 'PROCUREMENT_STAFF'
                    ? 'Active Purchase Orders'
                    : 'Recent Supply Requests'}
                </h2>
                <p className="text-xs text-slate-500">
                  Priority items requiring action
                </p>
              </div>
              <button
                onClick={() =>
                  onNavigateTab(user?.role === 'PROCUREMENT_STAFF' ? 'procurement' : 'requests')
                }
                className="text-xs font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1"
              >
                <span>Open Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {user?.role === 'PROCUREMENT_STAFF' ? (
                purchaseOrders.slice(0, 4).map((po) => (
                  <div key={po.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {po.poNumber}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                          {po.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {po.supplierName} &bull; {po.items.length} item(s)
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigateTab('procurement')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      View PO
                    </button>
                  </div>
                ))
              ) : (
                requests.slice(0, 4).map((req) => (
                  <div key={req.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {req.requestCode}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            req.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : req.status === 'APPROVED'
                              ? 'bg-sky-100 text-sky-800'
                              : req.status === 'FULFILLED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {req.status}
                        </span>
                        {req.urgency === 'URGENT' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white">
                            URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {req.targetArea} &bull; {req.items.length} item(s)
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigateTab('requests')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800"
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Attention Needed (Low Stock & Expiry)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Items below reorder threshold or with expiring/expired batches
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('items')}
                className="text-xs font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1"
              >
                <span>All Items ({items.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {watchlistItems.slice(0, 5).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-900 truncate">
                      {item.name}{' '}
                      <span className="font-mono text-[11px] text-slate-400">({item.sku})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span>{item.storageLocation}</span>
                      {item.hasExpired && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-semibold text-[10px]">
                          Expired Batch
                        </span>
                      )}
                      {item.hasExpiringSoon && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">
                          Expiring Soon
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-bold ${
                        item.stockStatus === 'OUT_OF_STOCK'
                          ? 'text-rose-600'
                          : item.stockStatus === 'LOW_STOCK'
                          ? 'text-amber-600'
                          : 'text-slate-800'
                      }`}
                    >
                      {item.totalStock} {item.unit}
                    </div>
                    <div className="text-[10px] text-slate-400">ROP: {item.reorderPoint}</div>
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
