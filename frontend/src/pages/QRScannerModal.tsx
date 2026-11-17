import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api } from '../services/api.js';
import { Item } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { QrCode, X, Search, AlertCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">QR Code Scanner</h3>
            <p className="text-xs text-slate-500">
              Scan item QR code or enter SKU manually
            </p>
          </div>
        </div>

        {/* Camera Scanner Viewport */}
        <div className="my-4 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 p-2">
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
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Lookup'}
          </button>
        </form>

        {/* Lookup Result View */}
        {error && (
          <div className="p-3 mb-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {scannedItem && (
          <div className="p-4 rounded-xl border border-sky-300 bg-sky-50/50 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider bg-sky-200/60 px-2 py-0.5 rounded">
                  {scannedItem.category}
                </span>
                <h4 className="font-bold text-slate-900 text-base mt-1">
                  {scannedItem.name}
                </h4>
                <div className="text-xs font-mono text-slate-500">{scannedItem.sku}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold text-slate-900">
                  {scannedItem.totalStock}
                </div>
                <div className="text-[11px] text-slate-500">{scannedItem.unit} Available</div>
              </div>
            </div>

            <div className="text-xs text-slate-600 pt-2 border-t border-sky-200/60 space-y-1">
              <div>Storage Location: <strong>{scannedItem.storageLocation}</strong></div>
              <div>Reorder Threshold: <strong>{scannedItem.reorderPoint} {scannedItem.unit}</strong></div>
              <div>Minimum Stock: <strong>{scannedItem.minStockLevel} {scannedItem.unit}</strong></div>
            </div>

            {scannedItem.batches && scannedItem.batches.length > 0 && (
              <div className="pt-2 border-t border-sky-200/60">
                <span className="text-[11px] font-bold text-slate-700 block mb-1">
                  Active Batches ({scannedItem.batches.length}):
                </span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {scannedItem.batches.map((b) => (
                    <div
                      key={b.id}
                      className="text-xs p-1.5 rounded bg-white border border-sky-100 flex items-center justify-between"
                    >
                      <span className="font-mono text-slate-800">
                        {b.batchNumber} ({b.remainingQty} {scannedItem.unit})
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'None'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stores Actions (FR-1.4) */}
            {hasRole(['STORES_STAFF', 'ADMIN']) && (
              <div className="pt-3 border-t border-sky-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase">
                  Quick QR Stock Action
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="number"
                    min={1}
                    value={quickQty}
                    onChange={(e) => setQuickQty(Number(e.target.value))}
                    className="w-20 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    placeholder="Qty"
                  />
                  {scannedItem.tracksExpiry && (
                    <input
                      type="date"
                      value={quickExpiry}
                      onChange={(e) => setQuickExpiry(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
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
                    className="px-3 py-1.5 text-xs font-semibold bg-sky-700 hover:bg-sky-800 text-white rounded-lg"
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
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg"
                  >
                    Receive Stock
                  </button>
                </div>
                {actionStatus && (
                  <p className="text-xs font-medium text-emerald-700">{actionStatus}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
