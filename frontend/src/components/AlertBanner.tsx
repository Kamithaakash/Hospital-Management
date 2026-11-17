import React from 'react';
import { Alert } from '../types/index.js';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';
import { api } from '../services/api.js';

interface AlertBannerProps {
  alerts: Alert[];
  onAlertResolved?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onAlertResolved }) => {
  if (!alerts || alerts.length === 0) return null;

  const handleResolve = async (id: string) => {
    try {
      await api.resolveAlert(id);
      if (onAlertResolved) onAlertResolved();
    } catch (e) {
      console.error('Failed to resolve alert', e);
    }
  };

  return (
    <div className="space-y-2 mb-6">
      {alerts.slice(0, 3).map((alert) => {
        const isCritical = alert.severity === 'CRITICAL';
        const isWarning = alert.severity === 'WARNING';

        return (
          <div
            key={alert.id}
            className={`flex items-start justify-between p-3.5 rounded-lg border shadow-sm transition-all ${
              isCritical
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : isWarning
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-sky-50 border-sky-200 text-sky-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {isCritical ? (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isCritical
                        ? 'bg-rose-200/80 text-rose-800'
                        : isWarning
                        ? 'bg-amber-200/80 text-amber-800'
                        : 'bg-sky-200/80 text-sky-800'
                    }`}
                  >
                    {alert.alertType.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(alert.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm font-medium mt-1 text-slate-800">{alert.message}</p>
              </div>
            </div>

            <button
              onClick={() => handleResolve(alert.id)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded bg-white/60 hover:bg-white border border-slate-200 transition-colors"
              title="Acknowledge & Mark Resolved"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Acknowledge</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
