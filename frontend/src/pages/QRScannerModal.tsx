import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api } from '../services/api.js';
import { Item } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { QrCode, X, Search, AlertCircle, Sparkles } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStockUpdated?: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onStockUpdated,
}) => {
  const { hasRole } = useAuth();
  const [manualCode, setManualCode] = useState('');
  const [scannedItem, setScannedItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [quickQty, setQuickQty] = useState<number>(1);
  const [quickExpiry, setQuickExpiry] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
      setScannedItem(null);
      setError(null);
      setManualCode('');
      return;
    }

    const timeout = setTimeout(() => {
      const container = document.getElementById('qr-reader');
      if (container && !scannerRef.current) {
        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            handleLookup(decodedText);
          },
          () => {
            // ignore scan frames
          }
        );

        scannerRef.current = scanner;
      }
    }, 200);

    return () => {
      clearTimeout(timeout);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleLookup = async (code: string) => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getItemByQR(code);
      setScannedItem(res.item);
    } catch (err: any) {
      setError(err.message || `No item found matching "${code}".`);
      setScannedItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleLookup(manualCode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-700 flex items-center justify-center shadow-xs">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">QR Code Scanner</h3>
            <p className="text-xs text-slate-500 font-medium">
              Scan physical item QR label or enter SKU code manually
            </p>
          </div>
        </div>

        {/* Camera Scanner Viewport */}
        <div className="my-4 glass-card rounded-2xl overflow-hidden p-2">
          <div id="qr-reader" className="w-full"></div>
        </div>

        {/* Manual Fallback Input */}
        <form onSubmit={handleManualSubmit} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Or enter SKU (e.g. HEM-CHM-001)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="glass-input w-full pl-9 pr-3 py-2 text-xs rounded-xl font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold disabled:opacity-50 shadow-xs transition-all active:scale-[0.98]"
          >
            {loading ? 'Searching...' : 'Lookup'}
          </button>
        </form>

        {/* Lookup Result View */}
        {error && (
          <div className="p-3 mb-3 rounded-2xl bg-rose-500/15 border border-rose-400/30 text-rose-900 text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {scannedItem && (
          <div className="p-5 rounded-2xl glass-card space-y-3.5 border-sky-400/40 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-sky-900 uppercase tracking-wider bg-sky-500/15 border border-sky-400/30 px-2.5 py-0.5 rounded-full">
                  {scannedItem.category}
                </span>
                <h4 className="font-bold text-slate-900 text-base mt-1.5">
                  {scannedItem.name}
                </h4>
                <div className="text-xs font-mono text-slate-500 mt-0.5">{scannedItem.sku}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-slate-900">
                  {scannedItem.totalStock}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">{scannedItem.unit} Available</div>
              </div>
            </div>

            <div className="text-xs text-slate-600 pt-2 border-t border-white/60 space-y-1 font-medium">
              <div>Storage Location: <strong className="text-slate-800">{scannedItem.storageLocation}</strong></div>
              <div>Reorder Threshold: <strong className="text-slate-800">{scannedItem.reorderPoint} {scannedItem.unit}</strong></div>
              <div>Minimum Stock: <strong className="text-slate-800">{scannedItem.minStockLevel} {scannedItem.unit}</strong></div>
            </div>

            {scannedItem.batches && scannedItem.batches.length > 0 && (
              <div className="pt-2 border-t border-white/60">
                <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                  Active Batches ({scannedItem.batches.length}):
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {scannedItem.batches.map((b) => (
                    <div
                      key={b.id}
                      className="text-xs p-2 rounded-xl glass-pill flex items-center justify-between"
                    >
                      <span className="font-mono text-slate-900 font-semibold">
                        {b.batchNumber} ({b.remainingQty} {scannedItem.unit})
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'None'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stores Actions (FR-1.4) */}
            {hasRole(['STORES_STAFF', 'ADMIN']) && (
              <div className="pt-3 border-t border-white/60 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Quick QR Stock Action
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="number"
                    min={1}
                    value={quickQty}
                    onChange={(e) => setQuickQty(Number(e.target.value))}
                    className="glass-input w-20 px-2.5 py-1.5 text-xs rounded-xl font-bold"
                    placeholder="Qty"
                  />
                  {scannedItem.tracksExpiry && (
                    <input
                      type="date"
                      value={quickExpiry}
                      onChange={(e) => setQuickExpiry(e.target.value)}
                      className="glass-input px-2.5 py-1.5 text-xs rounded-xl"
                      title="Expiry date for stock receipt"
                    />
                  )}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      setError(null);
                      setActionStatus(null);
                      setLoading(true);
                      try {
                        const res = await api.issueStockDirect(scannedItem.id, {
                          quantity: quickQty,
                          purpose: 'QR Scan Direct Issue',
                        });
                        setActionStatus(res.message);
                        const refreshed = await api.getItemByQR(scannedItem.sku);
                        setScannedItem(refreshed.item);
                        onStockUpdated?.();
                      } catch (err: any) {
                        setError(err.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all"
                  >
                    Issue (FEFO)
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      setError(null);
                      setActionStatus(null);
                      setLoading(true);
                      try {
                        const res = await api.receiveStock(scannedItem.id, {
                          quantity: quickQty,
                          expiryDate: quickExpiry || undefined,
                          notes: 'QR Scan Direct Receipt',
                        });
                        setActionStatus(res.message);
                        const refreshed = await api.getItemByQR(scannedItem.sku);
                        setScannedItem(refreshed.item);
                        onStockUpdated?.();
                      } catch (err: any) {
                        setError(err.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-md shadow-emerald-700/20 active:scale-[0.98] transition-all"
                  >
                    Receive Stock
                  </button>
                </div>
                {actionStatus && (
                  <p className="text-xs font-semibold text-emerald-700 mt-1">{actionStatus}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
