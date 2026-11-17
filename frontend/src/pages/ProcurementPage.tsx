import React, { useState } from 'react';
import { Item, PurchaseOrder } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  Plus,
  Truck,
  ClipboardCheck,
  AlertTriangle,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface ProcurementPageProps {
  purchaseOrders: PurchaseOrder[];
  items: Item[];
  onRefresh: () => void;
}

interface DeliveryLineState {
  poItemId: string;
  itemId: string;
  itemName: string;
  unit: string;
  orderedQty: number;
  tracksExpiry: boolean;
  receivedQty: number;
  condition: 'GOOD' | 'DAMAGED' | 'DEFECTIVE' | 'WRONG_ITEM';
  batchNumber: string;
  expiryDate: string;
  discrepancyNote: string;
}

export const ProcurementPage: React.FC<ProcurementPageProps> = ({
  purchaseOrders,
  items,
  onRefresh,
}) => {
  const { hasRole } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [showNewPOModal, setShowNewPOModal] = useState(false);
  const [inspectPO, setInspectPO] = useState<PurchaseOrder | null>(null);
  const [deliveryLines, setDeliveryLines] = useState<DeliveryLineState[]>([]);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Create PO form state
  const [supplierName, setSupplierName] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<Array<{ itemId: string; orderedQty: number }>>([
    { itemId: items[0]?.id || '', orderedQty: 10 },
  ]);

  const lowStockItems = items.filter(
    (i) => i.stockStatus === 'LOW_STOCK' || i.stockStatus === 'OUT_OF_STOCK'
  );

  const filteredPOs = purchaseOrders.filter(
    (po) => statusFilter === 'ALL' || po.status === statusFilter
  );

  const openNewPOModal = (prefillLowStock = false) => {
    if (prefillLowStock && lowStockItems.length > 0) {
      setPoItems(
        lowStockItems.map((it) => ({
          itemId: it.id,
          orderedQty: Math.max(10, (it.reorderPoint || 10) * 2 - (it.totalStock || 0)),
        }))
      );
    } else if (poItems.length === 0 || !poItems[0].itemId) {
      setPoItems([{ itemId: items[0]?.id || '', orderedQty: 10 }]);
    }
    setShowNewPOModal(true);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    setActionMsg(null);
    try {
      const res = await api.createPurchaseOrder({
        supplierName,
        expectedDate: expectedDate || undefined,
        notes: poNotes,
        items: poItems.filter((i) => i.itemId && i.orderedQty > 0),
      });
      setActionMsg({ type: 'success', text: res.message || 'Purchase order created.' });
      setShowNewPOModal(false);
      setSupplierName('');
      setExpectedDate('');
      setPoNotes('');
      onRefresh();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setIsBusy(false);
    }
  };

  const openInspectModal = (po: PurchaseOrder) => {
    const lines: DeliveryLineState[] = po.items.map((pi: any) => {
      const catalogItem = items.find((i) => i.id === pi.itemId);
      const tracksExpiry = Boolean(pi.item?.tracksExpiry ?? catalogItem?.tracksExpiry);
      return {
        poItemId: pi.id,
        itemId: pi.itemId,
        itemName: pi.item?.name || 'Item',
        unit: pi.item?.unit || 'Units',
        orderedQty: pi.orderedQty,
        tracksExpiry,
        receivedQty: Math.max(0, pi.orderedQty - (pi.receivedQty || 0)),
        condition: 'GOOD',
        batchNumber: '',
        expiryDate: '',
        discrepancyNote: '',
      };
    });
    setDeliveryLines(lines);
    setInspectPO(po);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectPO) return;
    setIsBusy(true);
    setActionMsg(null);
    try {
      const payload = deliveryLines.map((l) => ({
        poItemId: l.poItemId,
        itemId: l.itemId,
        receivedQty: Number(l.receivedQty),
        condition: l.condition,
        batchNumber: l.batchNumber || undefined,
        expiryDate: l.expiryDate || undefined,
        discrepancyNote: l.discrepancyNote || undefined,
      }));
      const res = await api.verifyDelivery(inspectPO.id, payload);
      setActionMsg({
        type: res.hasAnyDiscrepancy ? 'error' : 'success',
        text: res.message,
      });
      setInspectPO(null);
      onRefresh();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setIsBusy(false);
    }
  };

  const poBadge = (status: string) => {
    const styles: Record<string, string> = {
      OPEN: 'bg-sky-500/15 text-sky-900 border-sky-400/30',
      PARTIALLY_RECEIVED: 'bg-amber-500/15 text-amber-900 border-amber-400/30',
      VERIFIED: 'bg-emerald-500/15 text-emerald-900 border-emerald-400/30',
      DISCREPANCY_FLAGGED: 'bg-rose-500/15 text-rose-900 border-rose-400/30',
    };
    return (
      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-xs ${styles[status] || styles.OPEN}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-700" />
            <span>Purchase Orders & Delivery Verification</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create supplier purchase orders and inspect incoming deliveries.
          </p>
        </div>

        {hasRole(['PROCUREMENT_STAFF', 'ADMIN']) && (
          <div className="flex flex-wrap gap-2">
            {lowStockItems.length > 0 && (
              <button
                onClick={() => openNewPOModal(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Reorder Low-Stock ({lowStockItems.length})</span>
              </button>
            )}
            <button
              onClick={() => openNewPOModal(false)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
          </div>
        )}
      </div>

      {actionMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold backdrop-blur-md flex items-center justify-between shadow-xs ${
            actionMsg.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-900'
              : 'bg-rose-500/15 border-rose-400/30 text-rose-900'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="p-0.5 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Glassmorphic Filter Bar */}
      <div className="flex items-center gap-1.5 glass-card p-2.5 sm:p-3 rounded-2xl relative overflow-hidden overflow-x-auto no-scrollbar">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        {['ALL', 'OPEN', 'PARTIALLY_RECEIVED', 'DISCREPANCY_FLAGGED', 'VERIFIED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all active:scale-95 ${
              statusFilter === st
                ? 'bg-slate-900 text-white shadow-xs'
                : 'glass-pill text-slate-800 hover:bg-white/90'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* PO Cards */}
      <div className="space-y-4">
        {filteredPOs.length === 0 ? (
          <div className="glass-card rounded-2xl sm:rounded-3xl p-8 sm:p-10 text-center text-sm text-slate-600 font-semibold">
            No purchase orders found.
          </div>
        ) : (
          filteredPOs.map((po) => (
            <div key={po.id} className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden space-y-3 sm:space-y-4 shadow-xs">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/30 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-700" />
                    <span className="font-mono font-extrabold text-sm text-slate-900">{po.poNumber}</span>
                    {poBadge(po.status)}
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    <strong>Supplier:</strong> {po.supplierName} &bull;{' '}
                    <strong>Expected:</strong>{' '}
                    {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'Not set'} &bull;{' '}
                    <strong>Created by:</strong> {po.createdBy?.fullName}
                  </p>
                </div>

                {po.status !== 'VERIFIED' && hasRole(['STORES_STAFF', 'ADMIN']) && (
                  <button
                    onClick={() => openInspectModal(po)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all self-start md:self-auto"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Inspect & Verify Delivery</span>
                  </button>
                )}
              </div>

              {/* Items chips + Expand */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {po.items.map((pi) => (
                    <span
                      key={pi.id}
                      className="text-xs px-2.5 py-1 rounded-xl glass-pill font-medium text-slate-800"
                    >
                      <strong>{pi.item?.name}:</strong> {pi.orderedQty} {pi.item?.unit}
                      <span className="ml-1.5 text-[11px] font-bold text-emerald-700">
                        [Accepted: {pi.receivedQty}]
                      </span>
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedPoId(expandedPoId === po.id ? null : po.id)}
                  className="text-xs font-bold text-sky-700 hover:text-sky-900 glass-pill px-2.5 py-1 rounded-xl"
                >
                  {expandedPoId === po.id ? 'Hide Details' : 'Full Details & History'}
                </button>
              </div>

              {expandedPoId === po.id && (
                <div className="space-y-3 pt-3 border-t border-white/60">
                  <div className="overflow-x-auto p-4 rounded-2xl bg-white/60 border border-white/80">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-200/60">
                          <th className="py-1.5 font-bold">Item</th>
                          <th className="py-1.5 font-bold">Ordered Qty</th>
                          <th className="py-1.5 font-bold">Accepted (Good) Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {po.items.map((pi) => (
                          <tr key={pi.id}>
                            <td className="py-2 font-medium text-slate-900">
                              {pi.item?.name}{' '}
                              <span className="text-slate-400 font-mono">({pi.item?.sku})</span>
                            </td>
                            <td className="py-2 font-medium">
                              {pi.orderedQty} {pi.item?.unit}
                            </td>
                            <td className="py-2 font-bold text-emerald-700">
                              {pi.receivedQty} {pi.item?.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {po.deliveries && po.deliveries.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white/60 border border-white/80 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Inspection History
                      </div>
                      {po.deliveries.map((d: any) => (
                        <div key={d.id} className="text-xs text-slate-700 flex flex-wrap gap-2">
                          <span>{new Date(d.verifiedAt).toLocaleString()}:</span>
                          <span className="font-semibold">
                            Received {d.receivedQty} (Accepted: {d.acceptedQty}) &bull; {d.condition}
                          </span>
                          {d.discrepancyNote && (
                            <span className="text-rose-700 font-semibold">
                              Note: {d.discrepancyNote}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Glassmorphic Create PO Modal */}
      {showNewPOModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/30 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create Purchase Order</h3>
              <button onClick={() => setShowNewPOModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePO} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supplier Name *
                  </label>
                  <input
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Lanka MedChem Supplies"
                    className="glass-input w-full px-3 py-2 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="glass-input w-full px-3 py-2 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Order Items</label>
                  <button
                    type="button"
                    onClick={() =>
                      setPoItems([...poItems, { itemId: items[0]?.id || '', orderedQty: 10 }])
                    }
                    className="text-xs font-bold text-sky-700 hover:underline"
                  >
                    + Add Line
                  </button>
                </div>
                {poItems.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={line.itemId}
                      onChange={(e) => {
                        const copy = [...poItems];
                        copy[idx].itemId = e.target.value;
                        setPoItems(copy);
                      }}
                      className="glass-input flex-1 px-3 py-2 text-xs rounded-xl"
                    >
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} ({it.sku})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={line.orderedQty}
                      onChange={(e) => {
                        const copy = [...poItems];
                        copy[idx].orderedQty = Number(e.target.value);
                        setPoItems(copy);
                      }}
                      className="glass-input w-24 px-2.5 py-2 text-xs rounded-xl font-bold"
                    />
                    {poItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/15 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <input
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Optional delivery instructions"
                  className="glass-input w-full px-3 py-2 text-xs rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/60">
                <button
                  type="button"
                  onClick={() => setShowNewPOModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 glass-pill hover:bg-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20"
                >
                  {isBusy ? 'Creating...' : 'Create PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Glassmorphic Delivery Verification Modal */}
      {inspectPO && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-modal rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-white/30 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delivery Inspection — {inspectPO.poNumber}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Only verified units in good condition are added to usable stock. Shortages or damages
                  trigger automatic discrepancy alerts to Procurement & Management.
                </p>
              </div>
              <button onClick={() => setInspectPO(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              {deliveryLines.map((line, idx) => {
                const hasDiscrepancy =
                  line.receivedQty !== line.orderedQty || line.condition !== 'GOOD';
                return (
                  <div key={line.poItemId} className="p-4 rounded-2xl glass-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{line.itemName}</span>
                      <span className="text-xs font-semibold text-slate-600">
                        Ordered: {line.orderedQty} {line.unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Received Qty
                        </label>
                        <input
                          type="number"
                          min={0}
                          required
                          value={line.receivedQty}
                          onChange={(e) => {
                            const copy = [...deliveryLines];
                            copy[idx].receivedQty = Number(e.target.value);
                            setDeliveryLines(copy);
                          }}
                          className="glass-input w-full px-2.5 py-1.5 text-xs rounded-xl font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Condition
                        </label>
                        <select
                          value={line.condition}
                          onChange={(e) => {
                            const copy = [...deliveryLines];
                            copy[idx].condition = e.target.value as any;
                            setDeliveryLines(copy);
                          }}
                          className="glass-input w-full px-2.5 py-1.5 text-xs rounded-xl"
                        >
                          <option value="GOOD">GOOD</option>
                          <option value="DAMAGED">DAMAGED</option>
                          <option value="DEFECTIVE">DEFECTIVE</option>
                          <option value="WRONG_ITEM">WRONG_ITEM</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Batch Number
                        </label>
                        <input
                          value={line.batchNumber}
                          onChange={(e) => {
                            const copy = [...deliveryLines];
                            copy[idx].batchNumber = e.target.value;
                            setDeliveryLines(copy);
                          }}
                          placeholder="Auto if blank"
                          className="glass-input w-full px-2.5 py-1.5 text-xs rounded-xl font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Expiry Date {line.tracksExpiry && line.condition === 'GOOD' ? '*' : ''}
                        </label>
                        <input
                          type="date"
                          required={line.tracksExpiry && line.condition === 'GOOD' && line.receivedQty > 0}
                          value={line.expiryDate}
                          onChange={(e) => {
                            const copy = [...deliveryLines];
                            copy[idx].expiryDate = e.target.value;
                            setDeliveryLines(copy);
                          }}
                          className="glass-input w-full px-2.5 py-1.5 text-xs rounded-xl"
                        />
                      </div>
                    </div>

                    {hasDiscrepancy && (
                      <div>
                        <label className="block text-[11px] font-bold text-rose-700 mb-1">
                          Mandatory Discrepancy Note (Shortage / Damage) *
                        </label>
                        <input
                          required
                          value={line.discrepancyNote}
                          onChange={(e) => {
                            const copy = [...deliveryLines];
                            copy[idx].discrepancyNote = e.target.value;
                            setDeliveryLines(copy);
                          }}
                          placeholder="Describe shortage, damage, or wrong item..."
                          className="glass-input w-full px-2.5 py-1.5 text-xs rounded-xl border-rose-400/50"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end gap-2 pt-3 border-t border-white/60">
                <button
                  type="button"
                  onClick={() => setInspectPO(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 glass-pill hover:bg-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20"
                >
                  {isBusy ? 'Verifying...' : 'Submit Delivery Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
