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
      OPEN: 'bg-sky-50 text-sky-800 border-sky-200',
      PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-800 border-amber-200',
      VERIFIED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      DISCREPANCY_FLAGGED: 'bg-rose-50 text-rose-800 border-rose-200',
    };
    return (
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${styles[status] || styles.OPEN}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Purchase Orders & Delivery Verification
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create supplier POs (FR-4.1) and inspect incoming deliveries against POs (FR-4.2 – FR-4.4).
          </p>
        </div>

        {hasRole(['PROCUREMENT_STAFF', 'ADMIN']) && (
          <div className="flex flex-wrap gap-2">
            {lowStockItems.length > 0 && (
              <button
                onClick={() => openNewPOModal(true)}
                className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Reorder Low-Stock ({lowStockItems.length})</span>
              </button>
            )}
            <button
              onClick={() => openNewPOModal(false)}
              className="px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-medium text-xs shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
          </div>
        )}
      </div>

      {actionMsg && (
        <div
          className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-between ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="p-0.5 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-1.5 bg-white p-3 rounded-xl border border-slate-200">
        {['ALL', 'OPEN', 'PARTIALLY_RECEIVED', 'DISCREPANCY_FLAGGED', 'VERIFIED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === st
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* PO Cards */}
      <div className="space-y-4">
        {filteredPOs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            No purchase orders found.
          </div>
        ) : (
          filteredPOs.map((po) => (
            <div key={po.id} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-700" />
                    <span className="font-mono font-bold text-sm text-slate-900">{po.poNumber}</span>
                    {poBadge(po.status)}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>Supplier:</strong> {po.supplierName} &bull;{' '}
                    <strong>Expected:</strong>{' '}
                    {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'Not set'} &bull;{' '}
                    <strong>Created by:</strong> {po.createdBy?.fullName}
                  </p>
                </div>

                {po.status !== 'VERIFIED' && hasRole(['STORES_STAFF', 'ADMIN']) && (
                  <button
                    onClick={() => openInspectModal(po)}
                    className="px-3.5 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold flex items-center gap-1.5 self-start md:self-auto"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Inspect & Verify Delivery</span>
                  </button>
                )}
              </div>

              {/* Compact Item Chips + Expandable Details */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {po.items.map((pi) => (
                    <span
                      key={pi.id}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-800"
                    >
                      <strong>{pi.item?.name}:</strong> {pi.orderedQty} {pi.item?.unit}
                      <span className="ml-1.5 text-[11px] font-semibold text-emerald-700">
                        [Accepted: {pi.receivedQty}]
                      </span>
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedPoId(expandedPoId === po.id ? null : po.id)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
                >
                  {expandedPoId === po.id ? 'Hide Details' : 'Full Details'}
                </button>
              </div>

              {expandedPoId === po.id && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-100">
                          <th className="py-1.5 font-semibold">Item</th>
                          <th className="py-1.5 font-semibold">Ordered Qty</th>
                          <th className="py-1.5 font-semibold">Accepted (Good) Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {po.items.map((pi) => (
                          <tr key={pi.id}>
                            <td className="py-2 font-medium text-slate-800">
                              {pi.item?.name}{' '}
                              <span className="text-slate-400 font-mono">({pi.item?.sku})</span>
                            </td>
                            <td className="py-2">
                              {pi.orderedQty} {pi.item?.unit}
                            </td>
                            <td className="py-2 font-semibold text-emerald-700">
                              {pi.receivedQty} {pi.item?.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {po.deliveries && po.deliveries.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                      <div className="text-[11px] font-bold text-slate-600 uppercase">
                        Inspection History
                      </div>
                      {po.deliveries.map((d: any) => (
                        <div key={d.id} className="text-xs text-slate-700 flex flex-wrap gap-2">
                          <span>{new Date(d.verifiedAt).toLocaleString()}:</span>
                          <span className="font-semibold">
                            Received {d.receivedQty} (Accepted: {d.acceptedQty}) — {d.condition}
                          </span>
                          {d.discrepancyNote && (
                            <span className="text-rose-700 font-medium">
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

      {/* Create PO Modal */}
      {showNewPOModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create Purchase Order</h3>
              <button onClick={() => setShowNewPOModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePO} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier Name
                  </label>
                  <input
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Lanka MedChem Supplies"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Order Items</label>
                  <button
                    type="button"
                    onClick={() =>
                      setPoItems([...poItems, { itemId: items[0]?.id || '', orderedQty: 10 }])
                    }
                    className="text-xs font-semibold text-sky-700 hover:underline"
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
                      className="flex-1 px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
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
                      className="w-24 px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                    {poItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Optional delivery instructions"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPOModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-semibold bg-sky-700 hover:bg-sky-800 text-white rounded-lg"
                >
                  {isBusy ? 'Creating...' : 'Create PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Verification Modal */}
      {inspectPO && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delivery Inspection — {inspectPO.poNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Only GOOD condition units are added to usable stock (FR-4.4). Shortages or damages
                  trigger alerts to Procurement & Management (FR-4.3).
                </p>
              </div>
              <button onClick={() => setInspectPO(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              {deliveryLines.map((line, idx) => {
                const hasDiscrepancy =
                  line.receivedQty !== line.orderedQty || line.condition !== 'GOOD';
                return (
                  <div key={line.poItemId} className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{line.itemName}</span>
                      <span className="text-xs font-semibold text-slate-600">
                        Ordered: {line.orderedQty} {line.unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
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
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Condition
                        </label>
                        <select
                          value={line.condition}
                          onChange={(e) => {
                            const copy = [...deliveryLines];
                            copy[idx].condition = e.target.value as any;
                            setDeliveryLines(copy);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="GOOD">GOOD</option>
                          <option value="DAMAGED">DAMAGED</option>
                          <option value="DEFECTIVE">DEFECTIVE</option>
                          <option value="WRONG_ITEM">WRONG_ITEM</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
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
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
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
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    {hasDiscrepancy && (
                      <div>
                        <label className="block text-[11px] font-semibold text-rose-700 mb-1">
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
                          className="w-full px-2.5 py-1.5 text-xs border border-rose-300 rounded-lg bg-white"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInspectPO(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-semibold bg-sky-700 hover:bg-sky-800 text-white rounded-lg"
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
