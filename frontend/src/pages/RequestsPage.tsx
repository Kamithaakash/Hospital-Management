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
} from 'lucide-react';

interface RequestsPageProps {
  requests: SupplyRequest[];
  items: Item[];
  onRefresh: () => void;
}

export const RequestsPage: React.FC<RequestsPageProps> = ({ requests, items, onRefresh }) => {
  const { hasRole } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
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
      PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
      APPROVED: 'bg-sky-50 text-sky-800 border-sky-200',
      PARTIALLY_ISSUED: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      FULFILLED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
      CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
      DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return (
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${styles[status] || styles.PENDING}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Supply Requests & FEFO Issuance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit ward requests (FR-3.1), review approvals (FR-3.3), and issue via FEFO (FR-5.3).
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
            className="px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Supply Request</span>
          </button>
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

      {/* Status Filter */}
      <div className="flex flex-wrap gap-1.5 bg-white p-3 rounded-xl border border-slate-200">
        {['ALL', 'PENDING', 'APPROVED', 'PARTIALLY_ISSUED', 'FULFILLED', 'REJECTED'].map((st) => (
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

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            No supply requests found for this filter.
          </div>
        ) : (
          filteredRequests.map((reqItem: any) => (
            <div
              key={reqItem.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {reqItem.requestCode}
                    </span>
                    {statusBadge(reqItem.status)}
                    {reqItem.urgency === 'URGENT' && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white">
                        URGENT
                      </span>
                    )}
                    {reqItem.fulfillmentCheck === 'REQUIRES_PROCUREMENT' &&
                      (reqItem.status === 'PENDING' || reqItem.status === 'APPROVED') && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Stock Shortfall — Needs Procurement
                        </span>
                      )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>Area:</strong> {reqItem.targetArea} &bull; <strong>Purpose:</strong>{' '}
                    {reqItem.purpose} &bull; <strong>By:</strong> {reqItem.requestedBy?.fullName}
                  </p>
                  {reqItem.rejectionReason && (
                    <p className="text-xs text-rose-700 mt-1 font-medium">
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
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
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
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
                      >
                        Partial Approve
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => setRejectTarget(reqItem)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1"
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
                        className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold flex items-center gap-1"
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
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                      >
                        Cancel
                      </button>
                    )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100">
                      <th className="py-1.5 font-semibold">Item</th>
                      <th className="py-1.5 font-semibold">Requested</th>
                      <th className="py-1.5 font-semibold">Approved</th>
                      <th className="py-1.5 font-semibold">Issued</th>
                      <th className="py-1.5 font-semibold">Store Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reqItem.items.map((li: any) => {
                      const avail = li.availableStock ?? items.find((i) => i.id === li.itemId)?.totalStock ?? 0;
                      return (
                        <tr key={li.id}>
                          <td className="py-2 font-medium text-slate-800">
                            {li.item?.name}{' '}
                            <span className="text-slate-400 font-mono">({li.item?.sku})</span>
                          </td>
                          <td className="py-2">
                            {li.requestedQty} {li.item?.unit}
                          </td>
                          <td className="py-2">
                            {li.approvedQty} {li.item?.unit}
                          </td>
                          <td className="py-2 font-semibold text-sky-700">
                            {li.issuedQty} {li.item?.unit}
                          </td>
                          <td className="py-2">
                            <span
                              className={`font-semibold ${
                                avail >= li.requestedQty ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {avail} {li.item?.unit}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Request Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Submit Supply Request</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Ward / Hospital Area
                </label>
                <input
                  required
                  value={targetArea}
                  onChange={(e) => setTargetArea(e.target.value)}
                  placeholder="e.g., ICU Ward 3, OPD Surgical Unit"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose</label>
                  <input
                    required
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Daily disinfection"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as 'NORMAL' | 'URGENT')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Requested Items</label>
                  <button
                    type="button"
                    onClick={() =>
                      setLineItems([...lineItems, { itemId: items[0]?.id || '', requestedQty: 1 }])
                    }
                    className="text-xs font-semibold text-sky-700 hover:underline"
                  >
                    + Add Line
                  </button>
                </div>
                {lineItems.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={line.itemId}
                      onChange={(e) => {
                        const copy = [...lineItems];
                        copy[idx].itemId = e.target.value;
                        setLineItems(copy);
                      }}
                      className="flex-1 px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
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
                      className="w-20 px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-semibold bg-sky-700 hover:bg-sky-800 text-white rounded-lg"
                >
                  {isBusy ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partial Approve Modal */}
      {partialTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Partial Approval — {partialTarget.requestCode}
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
                <div key={li.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs">
                    <div className="font-semibold text-slate-900">{li.item?.name}</div>
                    <div className="text-slate-500">Requested: {li.requestedQty} {li.item?.unit}</div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={li.requestedQty}
                    value={partialQtys[li.id] ?? li.requestedQty}
                    onChange={(e) =>
                      setPartialQtys({ ...partialQtys, [li.id]: Number(e.target.value) })
                    }
                    className="w-20 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPartialTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Confirm Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Reject Request {rejectTarget.requestCode}
            </h3>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Rejection Reason (FR-3.3)
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide reason for rejection..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FEFO Issue Modal */}
      {issueTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  FEFO Stock Issuance — {issueTarget.requestCode}
                </h3>
                <p className="text-xs text-slate-500">
                  Earliest-expiring active batches are automatically selected first (FR-5.3).
                </p>
              </div>
              <button onClick={() => setIssueTarget(null)} className="text-slate-400 hover:text-slate-600">
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
                  <div key={li.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{li.item?.name}</div>
                        <div className="text-[11px] text-slate-500">
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
                        className="w-24 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                      />
                    </div>
                    {fefoBatch ? (
                      <div className="text-[11px] text-sky-800 bg-sky-50 border border-sky-200 px-2 py-1 rounded flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
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
                      <div className="text-[11px] text-rose-700 font-medium">
                        No active non-expired batches available in store.
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIssueTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-semibold bg-sky-700 hover:bg-sky-800 text-white rounded-lg"
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
