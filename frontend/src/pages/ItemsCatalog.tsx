import React, { useState } from 'react';
import { Item, ItemCategory, StockBatch } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { QRCodeSVG } from 'qrcode.react';
import {
  Search,
  Filter,
  QrCode,
  Printer,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';
import { api } from '../services/api.js';

interface ItemsCatalogProps {
  items: Item[];
  onRefresh: () => void;
}

export const ItemsCatalog: React.FC<ItemsCatalogProps> = ({ items, onRefresh }) => {
  const { hasRole } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [activeQRItem, setActiveQRItem] = useState<Item | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [receiveTarget, setReceiveTarget] = useState<Item | null>(null);
  const [recBatchNo, setRecBatchNo] = useState('');
  const [recQty, setRecQty] = useState(10);
  const [recExpiry, setRecExpiry] = useState('');
  const [recNotes, setRecNotes] = useState('');

  // New item form state
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState<ItemCategory>('CHEMICAL');
  const [newUnit, setNewUnit] = useState('Bottles');
  const [newLocation, setNewLocation] = useState('Chemical Room Rack C4');
  const [newMinStock, setNewMinStock] = useState(10);
  const [newROP, setNewROP] = useState(25);
  const [newTracksExpiry, setNewTracksExpiry] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['ALL', 'CHEMICAL', 'EQUIPMENT', 'CONSUMABLE', 'PPE'];

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.storageLocation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handlePrintLabel = () => {
    window.print();
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await api.createItem({
        sku: newSku,
        name: newName,
        description: newDesc,
        category: newCat,
        unit: newUnit,
        storageLocation: newLocation,
        minStockLevel: newMinStock,
        reorderPoint: newROP,
        tracksExpiry: newTracksExpiry,
      });
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Item Catalog & Batches
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Current inventory levels, batch expiry dates, and storage locations.
          </p>
        </div>

        {hasRole(['STORES_STAFF', 'ADMIN']) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Item</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {cat === 'ALL' ? 'All Items' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search SKU, name, rack..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-600 focus:border-sky-600"
          />
        </div>
      </div>

      {/* Items List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Item SKU & Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4 text-right">Available Stock</th>
                <th className="py-3 px-4 text-center">Reorder Level</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">QR Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredItems.map((item) => {
                const isExpanded = expandedItemId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isExpanded ? 'bg-sky-50/30' : ''
                        }`}
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                    >
                      <td className="py-3 px-4 text-slate-400 text-center">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-sky-700" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                          <span>{item.sku}</span>
                          {item.tracksExpiry && (
                            <span className="text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded font-sans font-medium">
                              Expiry Tracked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{item.storageLocation}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {item.totalStock}{' '}
                        <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-slate-500">
                        {item.reorderPoint} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.stockStatus === 'IN_STOCK'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.stockStatus === 'LOW_STOCK'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                        >
                          {item.stockStatus?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {hasRole(['STORES_STAFF', 'ADMIN']) && (
                            <button
                              onClick={() => {
                                setRecBatchNo('');
                                setRecQty(10);
                                setRecExpiry('');
                                setRecNotes('');
                                setReceiveTarget(item);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                              title="Receive New Batch"
                            >
                              + Receive
                            </button>
                          )}
                          <button
                            onClick={() => setActiveQRItem(item)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-600 transition-colors"
                            title="View & Print QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Batch Details Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70 border-b border-slate-200">
                        <td colSpan={8} className="p-4 pl-12">
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Batches ({item.batches?.length || 0})
                              </span>
                              <span className="text-xs text-slate-400">
                                Sorted by earliest expiry date
                              </span>
                            </div>

                            {(!item.batches || item.batches.length === 0) ? (
                              <p className="text-xs text-slate-400 py-2">
                                No stock batches recorded yet.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {item.batches.map((batch, idx) => {
                                  const isExpired =
                                    batch.expiryDate && new Date(batch.expiryDate) < new Date();
                                  const isFirstCandidate = idx === 0 && !isExpired && batch.remainingQty > 0;

                                  return (
                                    <div
                                      key={batch.id}
                                      className={`p-3 rounded-lg border text-xs relative ${isExpired
                                          ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                                          : isFirstCandidate
                                            ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-500/20'
                                            : 'bg-slate-50 border-slate-200'
                                        }`}
                                    >
                                      {isFirstCandidate && (
                                        <span className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                                          Earliest Expiry (FEFO)
                                        </span>
                                      )}
                                      <div className="font-bold text-slate-900 flex items-center justify-between">
                                        <span>Batch: {batch.batchNumber}</span>
                                        <span
                                          className={`font-semibold ${isExpired
                                              ? 'text-rose-700'
                                              : 'text-slate-900'
                                            }`}
                                        >
                                          {batch.remainingQty} / {batch.initialQty} {item.unit}
                                        </span>
                                      </div>

                                      <div className="mt-1.5 space-y-0.5 text-slate-600">
                                        <div>
                                          Expiry:{' '}
                                          <strong
                                            className={
                                              isExpired
                                                ? 'text-rose-600'
                                                : batch.status === 'EXPIRING_SOON'
                                                  ? 'text-amber-600'
                                                  : 'text-slate-800'
                                            }
                                          >
                                            {batch.expiryDate
                                              ? new Date(batch.expiryDate).toLocaleDateString()
                                              : 'None'}
                                          </strong>
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                          Received:{' '}
                                          {new Date(batch.receivedDate).toLocaleDateString()}
                                        </div>
                                      </div>

                                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                                        <span
                                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isExpired
                                              ? 'bg-rose-200 text-rose-800'
                                              : batch.status === 'EXPIRING_SOON'
                                                ? 'bg-amber-200 text-amber-800'
                                                : 'bg-emerald-100 text-emerald-800'
                                            }`}
                                        >
                                          {batch.status}
                                        </span>
                                        {isExpired && batch.remainingQty > 0 && hasRole(['STORES_STAFF', 'ADMIN']) && (
                                          <button
                                            onClick={async () => {
                                              const reason = window.prompt(
                                                `Enter formal disposal/wastage reason for batch ${batch.batchNumber}:`,
                                                'Expired - Quarantined and disposed per IPC policy'
                                              );
                                              if (!reason) return;
                                              try {
                                                await api.disposeBatch(batch.id, reason);
                                                onRefresh();
                                              } catch (err: any) {
                                                alert(err.message || 'Failed to dispose batch.');
                                              }
                                            }}
                                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-700 hover:bg-rose-800 text-white"
                                          >
                                            Dispose (Wastage)
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Label Modal */}
      {receiveTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Receive Stock — {receiveTarget.name}
              </h3>
              <button onClick={() => setReceiveTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                try {
                  await api.receiveStock(receiveTarget.id, {
                    batchNumber: recBatchNo || undefined,
                    quantity: recQty,
                    expiryDate: recExpiry || undefined,
                    notes: recNotes || undefined,
                  });
                  setReceiveTarget(null);
                  onRefresh();
                } catch (err: any) {
                  alert(err.message || 'Failed to receive stock.');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity ({receiveTarget.unit}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={recQty}
                    onChange={(e) => setRecQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch Number
                  </label>
                  <input
                    value={recBatchNo}
                    onChange={(e) => setRecBatchNo(e.target.value)}
                    placeholder="Auto if blank"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expiry Date {receiveTarget.tracksExpiry ? '*' : '(Optional)'}
                </label>
                <input
                  type="date"
                  required={receiveTarget.tracksExpiry}
                  value={recExpiry}
                  onChange={(e) => setRecExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  value={recNotes}
                  onChange={(e) => setRecNotes(e.target.value)}
                  placeholder="Optional receipt notes"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReceiveTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Label Modal */}
      {activeQRItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setActiveQRItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div id="printable-label" className="text-center p-4 bg-white rounded-xl border border-slate-300">
              <div className="text-[11px] font-bold tracking-widest uppercase text-slate-800 border-b border-slate-200 pb-1 mb-3">
                HEMAS HOSPITAL • THALAWATHUGODA
              </div>
              <h3 className="font-bold text-slate-900 text-base leading-tight mb-1">
                {activeQRItem.name}
              </h3>
              <div className="text-xs font-mono font-medium text-slate-600 mb-3">
                {activeQRItem.sku}
              </div>

              <div className="flex justify-center my-3 p-3 bg-white border border-slate-200 rounded-lg">
                <QRCodeSVG value={activeQRItem.qrCodeValue} size={150} level="H" />
              </div>

              <div className="text-xs text-slate-600 space-y-0.5 mt-2">
                <div>
                  Location: <strong>{activeQRItem.storageLocation}</strong>
                </div>
                <div>
                  Category: <strong>{activeQRItem.category}</strong> • Unit: <strong>{activeQRItem.unit}</strong>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  {activeQRItem.qrCodeValue}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={handlePrintLabel}
                className="flex-1 py-2 px-3 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Label</span>
              </button>
              <button
                onClick={() => setActiveQRItem(null)}
                className="py-2 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Housekeeping Item</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter item details to register in hospital inventory and generate its QR code.
            </p>

            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateItem} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Item Code / SKU *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HEM-CHM-005"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value as ItemCategory)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="CHEMICAL">CHEMICAL</option>
                    <option value="EQUIPMENT">EQUIPMENT</option>
                    <option value="CONSUMABLE">CONSUMABLE</option>
                    <option value="PPE">PPE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Surface Disinfectant Tablets"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit of Measure *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Bottles, Liters, Boxes..."
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Storage Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Rack / Room location"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Minimum Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(Number(e.target.value))}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reorder Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newROP}
                    onChange={(e) => setNewROP(Number(e.target.value))}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tracksExpiry"
                  checked={newTracksExpiry}
                  onChange={(e) => setNewTracksExpiry(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="tracksExpiry" className="text-xs text-slate-700">
                  Track batch-level expiry date (Required for chemicals and medical consumables)
                </label>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-medium shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
