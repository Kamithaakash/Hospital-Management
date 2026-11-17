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
  Package,
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-700" />
            <span>Item Catalog & Batches</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Current inventory levels, FEFO batch expiry dates, and storage locations.
          </p>
        </div>

        {hasRole(['STORES_STAFF', 'ADMIN']) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all self-start sm:self-auto active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Item</span>
          </button>
        )}
      </div>

      {/* Glassmorphic Filter and Search Bar */}
      <div className="glass-card p-4 rounded-3xl relative overflow-hidden flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'glass-pill text-slate-700 hover:bg-white'
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
            className="glass-input w-full pl-9 pr-3 py-1.5 text-xs rounded-xl focus:outline-hidden"
          />
        </div>
      </div>

      {/* Glassmorphic Items List Table */}
      <div className="glass-card rounded-3xl overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-white/60">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Item SKU & Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4 text-right">Available Stock</th>
                <th className="py-3 px-4 text-center">Reorder Level</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40 text-sm">
              {filteredItems.map((item) => {
                const isExpanded = expandedItemId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`hover:bg-white/50 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-sky-500/10' : ''
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
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-xs font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{item.sku}</span>
                          {item.tracksExpiry && (
                            <span className="text-[10px] text-teal-800 bg-teal-500/15 border border-teal-400/30 px-1.5 py-0.5 rounded-full font-sans font-semibold">
                              Expiry Tracked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2.5 py-1 rounded-xl glass-pill text-slate-700 font-semibold">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-600">{item.storageLocation}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        {item.totalStock}{' '}
                        <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-medium text-slate-500">
                        {item.reorderPoint} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            item.stockStatus === 'IN_STOCK'
                              ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-400/30'
                              : item.stockStatus === 'LOW_STOCK'
                              ? 'bg-amber-500/15 text-amber-800 border border-amber-400/30'
                              : 'bg-rose-500/15 text-rose-800 border border-rose-400/30'
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
                              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 glass-pill hover:bg-emerald-500/20 border-emerald-400/30 rounded-xl transition-all"
                              title="Receive New Batch"
                            >
                              + Receive
                            </button>
                          )}
                          <button
                            onClick={() => setActiveQRItem(item)}
                            className="p-1.5 rounded-xl glass-pill hover:bg-white text-slate-600 hover:text-slate-900 transition-all"
                            title="View & Print QR Code"
                          >
                            <QrCode className="w-4 h-4 text-sky-700" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Batch Details Drawer */}
                    {isExpanded && (
                      <tr className="bg-sky-50/20 border-b border-white/60">
                        <td colSpan={8} className="p-4 pl-12">
                          <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Batches ({item.batches?.length || 0})
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                Sorted by earliest expiry date first
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
                                      className={`p-3.5 rounded-2xl border text-xs relative backdrop-blur-md transition-all ${
                                        isExpired
                                          ? 'bg-rose-500/10 border-rose-300/40 text-rose-950'
                                          : isFirstCandidate
                                          ? 'bg-emerald-500/10 border-emerald-400/50 ring-2 ring-emerald-500/20'
                                          : 'glass-pill text-slate-800'
                                      }`}
                                    >
                                      {isFirstCandidate && (
                                        <span className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                          Earliest Expiry
                                        </span>
                                      )}
                                      <div className="font-bold text-slate-900 flex items-center justify-between">
                                        <span>Batch: {batch.batchNumber}</span>
                                        <span
                                          className={`font-extrabold ${
                                            isExpired
                                              ? 'text-rose-700'
                                              : 'text-slate-900'
                                          }`}
                                        >
                                          {batch.remainingQty} / {batch.initialQty} {item.unit}
                                        </span>
                                      </div>

                                      <div className="mt-2 space-y-0.5 text-slate-600 font-medium">
                                        <div>
                                          Expiry:{' '}
                                          <strong
                                            className={
                                              isExpired
                                                ? 'text-rose-600 font-bold'
                                                : batch.status === 'EXPIRING_SOON'
                                                ? 'text-amber-600 font-bold'
                                                : 'text-slate-800 font-semibold'
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

                                      <div className="mt-2.5 pt-2 border-t border-white/60 flex items-center justify-between">
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isExpired
                                              ? 'bg-rose-500/20 text-rose-800'
                                              : batch.status === 'EXPIRING_SOON'
                                              ? 'bg-amber-500/20 text-amber-800'
                                              : 'bg-emerald-500/20 text-emerald-800'
                                          }`}
                                        >
                                          {batch.status}
                                        </span>
                                        {isExpired && batch.remainingQty > 0 && hasRole(['STORES_STAFF', 'ADMIN']) && (
                                          <button
                                            onClick={async () => {
                                              const reason = window.prompt(
                                                `Enter formal disposal/wastage reason for batch ${batch.batchNumber}:`,
                                                'Expired - Quarantined and disposed per hospital infection control policy'
                                              );
                                              if (!reason) return;
                                              try {
                                                await api.disposeBatch(batch.id, reason);
                                                onRefresh();
                                              } catch (err: any) {
                                                alert(err.message || 'Failed to dispose batch.');
                                              }
                                            }}
                                            className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-rose-700 hover:bg-rose-800 text-white shadow-xs"
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

      {/* Glassmorphic Receive Stock Modal */}
      {receiveTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/60 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Receive Stock — {receiveTarget.name}
              </h3>
              <button onClick={() => setReceiveTarget(null)} className="text-slate-400 hover:text-slate-700">
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
              className="space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quantity ({receiveTarget.unit}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={recQty}
                    onChange={(e) => setRecQty(Number(e.target.value))}
                    className="glass-input w-full px-3 py-2 text-sm rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Batch Number
                  </label>
                  <input
                    value={recBatchNo}
                    onChange={(e) => setRecBatchNo(e.target.value)}
                    placeholder="Auto if blank"
                    className="glass-input w-full px-3 py-2 text-sm rounded-xl font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expiry Date {receiveTarget.tracksExpiry ? '*' : '(Optional)'}
                </label>
                <input
                  type="date"
                  required={receiveTarget.tracksExpiry}
                  value={recExpiry}
                  onChange={(e) => setRecExpiry(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <input
                  value={recNotes}
                  onChange={(e) => setRecNotes(e.target.value)}
                  placeholder="Optional receipt notes"
                  className="glass-input w-full px-3 py-2 text-sm rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/60">
                <button
                  type="button"
                  onClick={() => setReceiveTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 glass-pill hover:bg-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-md"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Glassmorphic QR Code Label Modal */}
      {activeQRItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveQRItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div id="printable-label" className="text-center p-5 bg-white/95 rounded-2xl border border-slate-300 shadow-sm">
              <div className="text-[11px] font-bold tracking-widest uppercase text-slate-800 border-b border-slate-200 pb-1 mb-3">
                HEMAS HOSPITAL &bull; THALAWATHUGODA
              </div>
              <h3 className="font-bold text-slate-900 text-base leading-tight mb-1">
                {activeQRItem.name}
              </h3>
              <div className="text-xs font-mono font-medium text-slate-600 mb-3">
                {activeQRItem.sku}
              </div>

              <div className="flex justify-center my-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                <QRCodeSVG value={activeQRItem.qrCodeValue} size={150} level="H" />
              </div>

              <div className="text-xs text-slate-600 space-y-0.5 mt-2">
                <div>
                  Location: <strong>{activeQRItem.storageLocation}</strong>
                </div>
                <div>
                  Category: <strong>{activeQRItem.category}</strong> &bull; Unit: <strong>{activeQRItem.unit}</strong>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  {activeQRItem.qrCodeValue}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={handlePrintLabel}
                className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Label</span>
              </button>
              <button
                onClick={() => setActiveQRItem(null)}
                className="py-2.5 px-3 rounded-xl glass-pill text-slate-600 hover:bg-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glassmorphic Add New Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Housekeeping Item</h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Enter item details to register in hospital inventory and generate its QR code.
            </p>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-900 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateItem} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Item Code / SKU *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HEM-CHM-005"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="glass-input w-full text-xs p-2.5 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value as ItemCategory)}
                    className="glass-input w-full text-xs p-2.5 rounded-xl"
                  >
                    <option value="CHEMICAL">CHEMICAL</option>
                    <option value="EQUIPMENT">EQUIPMENT</option>
                    <option value="CONSUMABLE">CONSUMABLE</option>
                    <option value="PPE">PPE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Surface Disinfectant Tablets"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="glass-input w-full text-xs p-2.5 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit of Measure *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Bottles, Liters, Boxes..."
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="glass-input w-full text-xs p-2.5 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Storage Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Rack / Room location"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="glass-input w-full text-xs p-2.5 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Minimum Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(Number(e.target.value))}
                    className="glass-input w-full text-xs p-2.5 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reorder Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newROP}
                    onChange={(e) => setNewROP(Number(e.target.value))}
                    className="glass-input w-full text-xs p-2.5 rounded-xl"
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
                <label htmlFor="tracksExpiry" className="text-xs text-slate-700 font-medium">
                  Track batch-level expiry date (Required for chemicals and medical consumables)
                </label>
              </div>

              <div className="mt-5 pt-3 border-t border-white/60 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 glass-pill hover:bg-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 disabled:opacity-50"
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
