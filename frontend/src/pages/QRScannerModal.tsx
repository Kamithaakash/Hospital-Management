import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { api } from '../services/api.js';
import { Item } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { QrCode, X, Search, AlertCircle, Camera, CameraOff, RotateCcw } from 'lucide-react';

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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [quickQty, setQuickQty] = useState<number>(1);
  const [quickExpiry, setQuickExpiry] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const lastScannedRef = useRef<string | null>(null);

  const stopCamera = async () => {
    const instance = html5QrRef.current;
    if (!instance) {
      setIsCameraActive(false);
      return;
    }
    try {
      if (instance.isScanning) {
        await instance.stop();
      }
      instance.clear();
    } catch {
      // ignore cleanup errors if stream already stopped
    } finally {
      html5QrRef.current = null;
      if (isMountedRef.current) {
        setIsCameraActive(false);
        setIsStartingCamera(false);
      }
    }
  };

  const startCamera = async () => {
    if (isStartingCamera || html5QrRef.current?.isScanning) return;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Camera access requires HTTPS (or localhost). On mobile over HTTP, use the manual SKU lookup below.'
      );
      return;
    }

    const container = document.getElementById('qr-reader');
    if (!container) return;

    setCameraError(null);
    setIsStartingCamera(true);
    lastScannedRef.current = null;

    try {
      const qr = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false,
      });
      html5QrRef.current = qr;

      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(160, Math.min(240, Math.floor(minEdge * 0.72)));
          return { width: size, height: size };
        },
        disableFlip: false,
      };

      const onScanSuccess = async (decodedText: string) => {
        const cleaned = decodedText.trim();
        if (!cleaned || lastScannedRef.current === cleaned) return;
        lastScannedRef.current = cleaned;

        // Pause/stop camera immediately after a valid scan so mobile doesn't re-trigger 10x/sec
        await stopCamera();
        if (isMountedRef.current) {
          setManualCode(cleaned);
          handleLookup(cleaned);
        }
      };

      try {
        // Prefer rear camera on mobile without forcing unsupported aspectRatio constraints
        await qr.start({ facingMode: 'environment' }, config, onScanSuccess, () => {});
      } catch {
        // Fallback to first available camera (e.g. desktop webcam or front camera)
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          throw new Error('No camera device found on this device.');
        }
        await qr.start(cameras[0].id, config, onScanSuccess, () => {});
      }

      if (isMountedRef.current) {
        // Ensure iOS Safari plays video inline without opening fullscreen player
        const videoEl = document.querySelector('#qr-reader video') as HTMLVideoElement | null;
        if (videoEl) {
          videoEl.setAttribute('playsinline', 'true');
          videoEl.setAttribute('muted', 'true');
          videoEl.playsInline = true;
          videoEl.muted = true;
        }
        setIsCameraActive(true);
      } else {
        await stopCamera();
      }
    } catch (err: any) {
      await stopCamera();
      if (isMountedRef.current) {
        setCameraError(
          err?.message || 'Unable to access camera. Check browser camera permissions or enter SKU manually.'
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsStartingCamera(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (!isOpen) {
      stopCamera();
      setScannedItem(null);
      setError(null);
      setCameraError(null);
      setActionStatus(null);
      setManualCode('');
      lastScannedRef.current = null;
      return;
    }

    const timer = setTimeout(() => {
      if (isMountedRef.current && isOpen) {
        startCamera();
      }
    }, 250);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen]);

  const handleLookup = async (code: string) => {
    if (!code) return;
    setLoading(true);
    setError(null);
    setActionStatus(null);
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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="glass-modal rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative max-h-[92dvh] overflow-y-auto">
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
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

        {/* Camera Controls */}
        <div className="flex items-center justify-between gap-2 mt-3 mb-2">
          <span className="text-[11px] font-semibold text-slate-600">
            {isStartingCamera
              ? 'Starting camera...'
              : isCameraActive
              ? 'Camera active — point at QR code'
              : 'Camera paused'}
          </span>
          <div className="flex items-center gap-2">
            {isCameraActive ? (
              <button
                type="button"
                onClick={stopCamera}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1"
              >
                <CameraOff className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isStartingCamera}
                onClick={startCamera}
                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                {scannedItem ? <RotateCcw className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{scannedItem ? 'Scan Again' : 'Start Camera'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Camera Scanner Viewport */}
        <div className="mb-4 glass-card rounded-2xl overflow-hidden p-2 bg-slate-950/5 min-h-[240px] flex items-center justify-center">
          <div id="qr-reader" className="w-full" />
        </div>

        {cameraError && (
          <div className="p-3 mb-3 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-900 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{cameraError}</span>
          </div>
        )}

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

            {scannedItem.batches && scannedItem.batches.filter((b) => b.remainingQty > 0).length > 0 && (
              <div className="pt-2 border-t border-white/60">
                <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                  Active Batches ({scannedItem.batches.filter((b) => b.remainingQty > 0).length}):
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {scannedItem.batches
                    .filter((b) => b.remainingQty > 0)
                    .map((b) => (
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

            {/* Quick Stores Actions */}
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
