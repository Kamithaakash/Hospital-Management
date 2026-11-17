import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { RoleBadge } from '../components/RoleBadge.js';
import { Item, Alert, SupplyRequest, PurchaseOrder } from '../types/index.js';
import {
  Package,
  AlertTriangle,
  Clock,
  CheckCircle,
  Truck,
  QrCode,
  FileText,
  ShieldAlert,
  ArrowUpRight,
  TrendingDown,
  Layers,
  Boxes,
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
  alerts,
  requests,
  purchaseOrders,
  onOpenQRScanner,
  onNavigateTab,
}) => {
  const { user } = useAuth();

  // Metrics calculations
  const totalItems = items.length;
  const lowStockItems = items.filter((i) => i.stockStatus === 'LOW_STOCK');
  const outOfStockItems = items.filter((i) => i.stockStatus === 'OUT_OF_STOCK');
  const expiringSoonCount = items.filter((i) => i.hasExpiringSoon).length;
  const expiredCount = items.filter((i) => i.hasExpired).length;

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const approvedRequests = requests.filter((r) => r.status === 'APPROVED');
  const openPOs = purchaseOrders.filter((po) => po.status === 'OPEN');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-slate-900 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Hemas Hospital, Thalawathugoda
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.fullName}
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Housekeeping supply management dashboard. Track stock levels, active requests, and item dispatches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <RoleBadge role={user?.role || 'ADMIN'} size="md" />
          <button
            onClick={onOpenQRScanner}
            className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-xs flex items-center gap-2 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan QR Code</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Items
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{totalItems}</div>
            <div className="text-xs text-slate-500 mt-0.5">Active catalog items</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Low Stock Items
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600">{lowStockItems.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {outOfStockItems.length > 0 ? `${outOfStockItems.length} out of stock` : 'At or below reorder level'}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Expiry Alerts
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600">
              {expiringSoonCount + expiredCount}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {expiredCount > 0 ? `${expiredCount} expired batches` : 'Batches expiring within 30 days'}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Actions
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-sky-700">
              {pendingRequests.length + openPOs.length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {pendingRequests.length} requests, {openPOs.length} open POs
            </div>
          </div>
        </div>
      </div>

      {/* Simple Quick Actions Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Quick Actions
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('items')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
          >
            Browse Inventory
          </button>
          <button
            onClick={() => onNavigateTab('requests')}
            className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold transition-colors"
          >
            {user?.role === 'HOUSEKEEPING_SUPERVISOR'
              ? 'New / My Requests'
              : user?.role === 'MANAGER'
              ? `Review Requests (${pendingRequests.length})`
              : user?.role === 'STORES_STAFF'
              ? `Issue Approved (${approvedRequests.length})`
              : 'Supply Requests'}
          </button>
          <button
            onClick={() => onNavigateTab('procurement')}
            className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors"
          >
            {user?.role === 'STORES_STAFF'
              ? `Verify PO Deliveries (${openPOs.length})`
              : `Purchase Orders (${openPOs.length})`}
          </button>
          <button
            onClick={() => onNavigateTab('reports')}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-colors"
          >
            Reports & CSV Export
          </button>
        </div>
      </div>

      {/* Role-Specific Workspaces */}
      {user?.role === 'HOUSEKEEPING_SUPERVISOR' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-600" />
                Recent Supply Requests
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                {requests.length} Requests
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {requests.slice(0, 3).map((req) => (
                <div key={req.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {req.requestCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          req.urgency === 'URGENT'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {req.urgency}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{req.targetArea}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{req.purpose}</p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      req.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : req.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Ward Supply Watchlist
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Items at or near reorder thresholds:
            </p>
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Location: {item.storageLocation}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-700">
                      {item.totalStock} {item.unit}
                    </span>
                    <div className="text-[11px] text-slate-400">Reorder Level: {item.reorderPoint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {user?.role === 'MANAGER' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-700" />
                Requests Awaiting Approval
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and approve supply requests submitted by housekeeping supervisors.
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-800">
              {pendingRequests.length} Pending
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All submitted supply requests have been reviewed.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{req.requestCode}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.urgency === 'URGENT'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {req.urgency}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Requested by {req.requestedBy.fullName}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-700">Area: {req.targetArea}</p>
                  <p className="text-xs text-slate-600 mt-0.5">Purpose: {req.purpose}</p>

                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Requested Items ({req.items.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {req.items.map((it) => (
                        <span
                          key={it.id}
                          className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 font-medium text-slate-800"
                        >
                          {it.item.name}: <strong>{it.requestedQty} {it.item.unit}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {user?.role === 'STORES_STAFF' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Boxes className="w-5 h-5 text-slate-700" />
                Approved Requests Ready for Issue
              </h3>
              <button
                onClick={onOpenQRScanner}
                className="text-xs px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-medium flex items-center gap-1 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
                Scan Item
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Approved requests ready for physical issue from stores:
            </p>
            <div className="space-y-3">
              {approvedRequests.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                  No approved requests pending issue.
                </div>
              ) : (
                approvedRequests.map((req) => (
                  <div key={req.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="font-semibold text-sm text-slate-900">{req.requestCode}</div>
                    <div className="text-xs text-slate-500">{req.targetArea}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-slate-700" />
              Incoming Deliveries to Inspect
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Pending vendor shipments awaiting verification and batch check-in:
            </p>
            <div className="space-y-3">
              {openPOs.map((po) => (
                <div
                  key={po.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{po.poNumber}</div>
                    <div className="text-xs text-slate-500">{po.supplierName}</div>
                    <div className="text-[11px] text-slate-400">
                      {po.items.length} line items ordered
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded bg-sky-100 text-sky-800">
                    {po.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {user?.role === 'PROCUREMENT_STAFF' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-slate-700" />
              Low-Stock Items for Reorder
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Stock items currently at or below minimum threshold:
            </p>
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">SKU: {item.sku} • {item.category}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-rose-600">
                      {item.totalStock} {item.unit}
                    </span>
                    <div className="text-[11px] text-slate-500">Reorder Level: {item.reorderPoint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-slate-700" />
              Active Purchase Orders
            </h3>
            <div className="space-y-3">
              {purchaseOrders.map((po) => (
                <div key={po.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{po.poNumber}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                      {po.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Supplier: {po.supplierName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Items: {po.items.map((i) => `${i.item.name} (${i.orderedQty})`).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stock Catalog Preview Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Housekeeping Inventory Overview
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current available stock with batch counts and storage location
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('items')}
            className="text-xs font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1"
          >
            <span>View Full Catalog</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3 px-4">Item SKU & Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4 text-center">Batches</th>
                <th className="py-3 px-4 text-right">Available Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {items.slice(0, 7).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-xs font-mono text-slate-400">{item.sku}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">{item.storageLocation}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-xs font-semibold text-slate-700">
                      {item.batchCount || 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {item.totalStock} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        item.stockStatus === 'IN_STOCK'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.stockStatus === 'LOW_STOCK'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {item.stockStatus?.replace('_', ' ')}
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
