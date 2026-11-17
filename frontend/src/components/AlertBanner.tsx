import React, { useState } from 'react';
import { Alert } from '../types/index.js';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../services/api.js';

interface AlertBannerProps {
  alerts: Alert[];
  onAlertResolved?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onAlertResolved }) => {
  const [expanded, setExpanded] = useState(false);

  if (!alerts || alerts.length === 0) return null;

  const handleResolve = async (id: string) => {
    try {
      await api.resolveAlert(id);
      if (onAlertResolved) onAlertResolved();
    } catch (e) {
      console.error('Failed to resolve alert', e);
    }
  };

  const visibleAlerts = expanded ? alerts : alerts.slice(0, 1);

  return (
    <div className="mb-5 space-y-2 print:hidden">
      {visibleAlerts.map((alert) => {
        const isCritical = alert.severity === 'CRITICAL';
        const isWarning = alert.severity === 'WARNING';

        return (
          <div
            key={alert.id}
            className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border text-xs backdrop-blur-xl transition-all shadow-xs ${
              isCritical
                ? 'bg-rose-500/10 border-rose-300/40 text-rose-950 shadow-rose-500/5'
                : isWarning
                ? 'bg-amber-500/10 border-amber-300/40 text-amber-950 shadow-amber-500/5'
                : 'bg-sky-500/10 border-sky-300/40 text-sky-950 shadow-sky-500/5'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isCritical ? (
                <div className="w-6 h-6 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                </div>
              ) : isWarning ? (
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-sky-600" />
                </div>
              )}
              <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-lg glass-pill text-slate-800 shrink-0">
                {alert.alertType.replace('_', ' ')}
              </span>
              <span className="font-semibold text-slate-800 truncate">{alert.message}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {alerts.length > 1 && alert.id === alerts[0].id && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="px-2.5 py-1 rounded-xl glass-pill hover:bg-white text-slate-700 font-semibold flex items-center gap-1 transition-all text-xs"
                >
                  <span>{expanded ? 'Hide' : `+${alerts.length - 1} more`}</span>
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                onClick={() => handleResolve(alert.id)}
                className="px-2.5 py-1 rounded-xl glass-pill hover:bg-emerald-500/20 hover:border-emerald-500/40 text-slate-800 hover:text-emerald-900 font-semibold flex items-center gap-1 transition-all text-xs"
                title="Acknowledge & Dismiss"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
