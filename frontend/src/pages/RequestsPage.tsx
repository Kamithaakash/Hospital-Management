import React, { useState } from 'react';
import { Item, SupplyRequest } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  Plus,
  CheckCircle2,
  XCircle,
  PackageCheck,
  AlertCircle,
  Clock,
  Trash2,
  X,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface RequestsPageProps {
  requests: SupplyRequest[];
  items: Item[];
  onRefresh: () => void;
}

export const RequestsPage: React.FC<RequestsPageProps> = ({ requests, items, onRefresh }) => {
  const { hasRole } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<SupplyRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [partialTarget, setPartialTarget] = useState<SupplyRequest | null>(null);
  const [partialQtys, setPartialQtys] = useState<Record<string, number>>({});
  const [issueTarget, setIssueTarget] = useState<SupplyRequest | null>(null);
  const [issueQuantities, setIssueQuantities] = useState<Record<string, number>>({});
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // New request form state
  const [targetArea, setTargetArea] = useState('');
  const [purpose, setPurpose] = useState('');
  const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [lineItems, setLineItems] = useState<Array<{ itemId: string; requestedQty: number }>>([
    { itemId: items[0]?.id || '', requestedQty: 1 },
  ]);

  const filteredRequests = requests.filter(
    (r) => statusFilter === 'ALL' || r.status === statusFilter
  );

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    setActionMsg(null);
    try {
      const validLines = lineItems.filter((l) => l.itemId && l.requestedQty > 0);
      if (validLines.length === 0) throw new Error('Select at least one item and quantity.');
      const res = await api.createRequest({
        targetArea,
        purpose,
        urgency,
        items: validLines,
      });
      setActionMsg({ type: 'success', text: res.message || 'Supply request submitted.' });
      setShowNewModal(false);
      setTargetArea('');
      setPurpose('');
      setLineItems([{ itemId: items[0]?.id || '', requestedQty: 1 }]);
      onRefresh();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to submit request.' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleApprove = async (reqItem: SupplyRequest) => {
    setIsBusy(true);
    setActionMsg(null);
    try {
      const res = await api.reviewRequest(reqItem.id, {
        decision: 'APPROVE',
        items: reqItem.items.map((li) => ({ id: li.id, approvedQty: li.requestedQty })),
      });
      setActionMsg({ type: 'success', text: res.message });
      onRefresh();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    setIsBusy(true);
    setActionMsg(null);
    try {
      const res = await api.reviewRequest(rejectTarget.id, {
        decision: 'REJECT',
        rejectionReason,
      });
      setActionMsg({ type: 'success', text: res.message });
      setRejectTarget(null);
      setRejectionReason('');
      onRefresh();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setIsBusy(false);
    }
  };

  const openIssueModal = (reqItem: SupplyRequest) => {
    const defaults: Record<string, number> = {};
    for (const li of reqItem.items) {
      const remaining = Math.max(0, li.approvedQty - li.issuedQty);
      const itemInfo = items.find((i) => i.id === li.itemId);
      const avail = itemInfo?.totalStock ?? 0;
      defaults[li.id] = Math.min(remaining, avail);
    }
    setIssueQuantities(defaults);
    setIssueTarget(reqItem);
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTarget) return;
    setIsBusy(true);
    setActionMsg(null);
    try {
      const payload = issueTarget.items
        .map((li) => ({
          requestItemId: li.id,
          issueQty: Number(issueQuantities[li.id] || 0),
        }))
        .filter((x) => x.issueQty > 0);

      const res = await api.issueRequest(issueTarget.id, payload);
      setActionMsg({ type: 'success', text: res.message });
      setIssueTarget(null);
      onRefresh();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancel = async (id: string) => {
    setIsBusy(true);
    setActionMsg(null);
    try {
      const res = await api.cancelRequest(id);
      setActionMsg({ type: 'success', text: res.message });
      onRefresh();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setIsBusy(false);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-500/15 text-amber-900 border-amber-400/30',
      APPROVED: 'bg-sky-500/15 text-sky-900 border-sky-400/30',
      PARTIALLY_ISSUED: 'bg-indigo-500/15 text-indigo-900 border-indigo-400/30',
      FULFILLED: 'bg-emerald-500/15 text-emerald-900 border-emerald-400/30',
      REJECTED: 'bg-rose-500/15 text-rose-900 border-rose-400/30',
      CANCELLED: 'bg-slate-200/60 text-slate-700 border-slate-300/60',
      DRAFT: 'bg-slate-200/60 text-slate-700 border-slate-300/60',
    };
    return (
      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-xs ${styles[status] || styles.PENDING}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-700" />
            <span>Supply Requests & FEFO Issuance</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Submit ward supply requests, review approvals, and dispatch stock.
          </p>
        </div>

        {hasRole(['HOUSEKEEPING_SUPERVISOR', 'ADMIN']) && (
          <button
            onClick={() => {
              if (lineItems.length === 0 || !lineItems[0].itemId) {
                setLineItems([{ itemId: items[0]?.id || '', requestedQty: 1 }]);
              }
              setShowNewModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 self-start sm:self-auto active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Supply Request</span>
          </button>
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

      {/* Glassmorphic Status Filter */}
      <div className="flex flex-wrap gap-1.5 glass-card p-3 rounded-2xl relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        {['ALL', 'PENDING', 'APPROVED', 'PARTIALLY_ISSUED', 'FULFILLED', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              statusFilter === st
                ? 'bg-slate-900 text-white shadow-xs'
                : 'glass-pill text-slate-700 hover:bg-white'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 text-center text-sm text-slate-500 font-medium">
            No supply requests found for this filter.
          </div>
        ) : (
          filteredRequests.map((reqItem: any) => (
            <div
              key={reqItem.id}
              className="glass-card rounded-3xl p-6 relative overflow-hidden space-y-4 shadow-xs"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/30 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      Request #{reqItem.requestCode.replace(/^REQ-/, '')}
                    </span>
                    {statusBadge(reqItem.status)}
                    {reqItem.urgency === 'URGENT' && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                        URGENT
                      </span>
                    )}
                    {reqItem.fulfillmentCheck === 'REQUIRES_PROCUREMENT' &&
                      (reqItem.status === 'PENDING' || reqItem.status === 'APPROVED') && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-900 border border-amber-400/30 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-700" />
                          Stock Shortfall — Needs Procurement
                        </span>
                      )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    <strong>Area:</strong> {reqItem.targetArea} &bull; <strong>Purpose:</strong>{' '}
                    {reqItem.purpose} &bull; <strong>Requested By:</strong> {reqItem.requestedBy?.fullName}
                  </p>
                  {reqItem.rejectionReason && (
                    <p className="text-xs text-rose-700 mt-1 font-semibold">
                      Rejection Reason: {reqItem.rejectionReason}
                    </p>
                  )}
                </div>

                {/* Role Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {reqItem.status === 'PENDING' && hasRole(['MANAGER', 'ADMIN']) && (
                    <>
                      <button
                        disabled={isBusy}
                        onClick={() => handleApprove(reqItem)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-all active:scale-[0.98]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve Full
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => {
                          const map: Record<string, number> = {};
                          reqItem.items.forEach((li: any) => {
                            map[li.id] = li.requestedQty;
                          });
                          setPartialQtys(map);
                          setPartialTarget(reqItem);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
                      >
                        Partial Approve
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => setRejectTarget(reqItem)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-all active:scale-[0.98]"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  )}

                  {(reqItem.status === 'APPROVED' || reqItem.status === 'PARTIALLY_ISSUED') &&
                    hasRole(['STORES_STAFF', 'ADMIN']) && (
                      <button
                        disabled={isBusy}
                        onClick={() => openIssueModal(reqItem)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        Issue Stock (FEFO)
                      </button>
                    )}

                  {(reqItem.status === 'PENDING' || reqItem.status === 'DRAFT') &&
                    hasRole(['HOUSEKEEPING_SUPERVISOR', 'ADMIN']) && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleCancel(reqItem.id)}
                        className="px-3 py-1.5 rounded-xl glass-pill text-slate-700 hover:bg-white text-xs font-semibold transition-all"
                      >
                        Cancel
                      </button>
                    )}
                </div>
              </div>

              {/* Items chips + Expand details */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {reqItem.items.map((li: any) => {
                    const avail =
                      li.availableStock ?? items.find((i) => i.id === li.itemId)?.totalStock ?? 0;
                    return (
                      <span
                        key={li.id}
                        className="text-xs px-2.5 py-1 rounded-xl glass-pill font-medium text-slate-800"
                      >
                        {li.item?.name}: <strong>{li.requestedQty}</strong>
                        {li.approvedQty !== null && li.approvedQty !== undefined && (
                          <span className="text-slate-500 font-normal">
                            {' '}
                            (Appr: {li.approvedQty}, Issued: {li.issuedQty})
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>

                <button
                  onClick={() => setExpandedId(expandedId === reqItem.id ? null : reqItem.id)}
                  className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 glass-pill px-2.5 py-1 rounded-xl"
                >
                  <span>{expandedId === reqItem.id ? 'Hide Details' : 'Details & Audit'}</span>
                  {expandedId === reqItem.id ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
              </div>

              {/* Expandable audit drawer */}
              {expandedId === reqItem.id && (
                <div className="mt-3 p-4 rounded-2xl bg-white/60 border border-white/80 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Line Item Breakdown
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200/60 text-slate-500">
                          <th className="py-2 px-2">Item</th>
                          <th className="py-2 px-2">Requested</th>
                          <th className="py-2 px-2">Approved</th>
                          <th className="py-2 px-2">Issued</th>
                          <th className="py-2 px-2">Available in Store</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reqItem.items.map((li: any) => {
                          const catalogItem = items.find((i) => i.id === li.itemId);
                          return (
                            <tr key={li.id}>
                              <td className="py-2 px-2 font-medium text-slate-900">
                                {li.item?.name}
                              </td>
                              <td className="py-2 px-2 font-semibold">{li.requestedQty}</td>
                              <td className="py-2 px-2 text-sky-700 font-semibold">
                                {li.approvedQty ?? '—'}
                              </td>
                              <td className="py-2 px-2 text-emerald-700 font-semibold">
                                {li.issuedQty}
                              </td>
                              <td className="py-2 px-2">
                                <span
                                  className={`font-semibold ${
                                    (catalogItem?.totalStock ?? 0) < li.requestedQty
                                      ? 'text-amber-600'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  {catalogItem?.totalStock ?? 0} {catalogItem?.unit}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Glassmorphic New Request Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-white/30 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                New Housekeeping Supply Request
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Hospital Area *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ward 3B, ICU, OPD"
                    value={targetArea}
                    onChange={(e) => setTargetArea(e.target.value)}
                    className="glass-input w-full px-3 py-2 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Urgency *</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="glass-input w-full px-3 py-2 text-xs rounded-xl"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent (Priority IPC)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Purpose / Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily ward sanitization & replenishment"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-white/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Requested Items</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLineItems([...lineItems, { itemId: items[0]?.id || '', requestedQty: 1 }])
                    }
                    className="text-xs text-sky-700 font-bold hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                {lineItems.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={line.itemId}
                      onChange={(e) => {
                        const copy = [...lineItems];
                        copy[idx].itemId = e.target.value;
                        setLineItems(copy);
                      }}
                      className="glass-input flex-1 px-3 py-2 text-xs rounded-xl"
                    >
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} (Avail: {it.totalStock ?? 0} {it.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={line.requestedQty}
                      onChange={(e) => {
                        const copy = [...lineItems];
                        copy[idx].requestedQty = Number(e.target.value);
                        setLineItems(copy);
                      }}
                      className="glass-input w-20 px-2.5 py-2 text-xs rounded-xl font-bold"
                    />
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/15 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/60">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 glass-pill hover:bg-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20"
                >
                  {isBusy ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Glassmorphic Partial Approve Modal */}
      {partialTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Partial Approval — Request #{partialTarget.requestCode.replace(/^REQ-/, '')}
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsBusy(true);
                setActionMsg(null);
                try {
                  const res = await api.reviewRequest(partialTarget.id, {
                    decision: 'APPROVE',
                    items: partialTarget.items.map((li) => ({
                      id: li.id,
                      approvedQty: Number(partialQtys[li.id] ?? 0),
                    })),
                  });
                  setActionMsg({ type: 'success', text: res.message });
                  setPartialTarget(null);
                  onRefresh();
                } catch (err: any) {
                  setActionMsg({ type: 'error', text: err.message });
                } finally {
                  setIsBusy(false);
                }
              }}
              className="space-y-3"
            >
              {partialTarget.items.map((li) => (
                <div key={li.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl glass-pill">
                  <div className="text-xs">
                    <div className="font-bold text-slate-900">{li.item?.name}</div>
                    <div className="text-slate-500 font-medium">Requested: {li.requestedQty} {li.item?.unit}</div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={li.requestedQty}
                    value={partialQtys[li.id] ?? li.requestedQty}
                    onChange={(e) =>
                      setPartialQtys({ ...partialQtys, [li.id]: Number(e.target.value) })
                    }
                    className="glass-input w-20 px-2.5 py-1.5 text-xs rounded-xl font-bold"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-3 border-t border-white/60">
                <button
                  type="button"
                  onClick={() => setPartialTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 glass-pill hover:bg-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md"
                >
                  Confirm Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Glassmorphic Reject Reason Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Reject Request #{rejectTarget.requestCode.replace(/^REQ-/, '')}
            </h3>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide reason for rejection..."
                  className="glass-input w-full px-3 py-2 text-sm rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/60">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 glass-pill hover:bg-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Glassmorphic FEFO Issue Modal */}
      {issueTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/30 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Stock Issuance — Request #{issueTarget.requestCode.replace(/^REQ-/, '')}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Earliest-expiring active batches are automatically prioritized.
                </p>
              </div>
              <button onClick={() => setIssueTarget(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4">
              {issueTarget.items.map((li) => {
                const catalogItem = items.find((i) => i.id === li.itemId);
                const fefoBatch = catalogItem?.batches?.find(
                  (b) => b.remainingQty > 0 && b.status !== 'EXPIRED'
                );
                const maxRemaining = li.approvedQty - li.issuedQty;

                return (
                  <div key={li.id} className="p-3.5 rounded-2xl glass-card space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{li.item?.name}</div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Remaining Approved: {maxRemaining} {li.item?.unit} &bull; Store Stock:{' '}
                          {catalogItem?.totalStock ?? 0}
                        </div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={maxRemaining}
                        value={issueQuantities[li.id] ?? 0}
                        onChange={(e) =>
                          setIssueQuantities({
                            ...issueQuantities,
                            [li.id]: Number(e.target.value),
                          })
                        }
                        className="glass-input w-24 px-2.5 py-1.5 text-xs rounded-xl font-bold"
                      />
                    </div>
                    {fefoBatch ? (
                      <div className="text-[11px] text-sky-900 bg-sky-500/15 border border-sky-400/30 px-2.5 py-1 rounded-xl flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                        <span>
                          <strong>Recommended (FEFO):</strong> Batch {fefoBatch.batchNumber} (Qty:{' '}
                          {fefoBatch.remainingQty}
                          {fefoBatch.expiryDate
                            ? `, Exp: ${new Date(fefoBatch.expiryDate).toLocaleDateString()}`
                            : ', No Expiry'}
                          )
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-rose-700 font-semibold px-2">
                        No active non-expired batches available in store.
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end gap-2 pt-3 border-t border-white/60">
                <button
                  type="button"
                  onClick={() => setIssueTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 glass-pill hover:bg-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20"
                >
                  {isBusy ? 'Issuing...' : 'Confirm FEFO Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
