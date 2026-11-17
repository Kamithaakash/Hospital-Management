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
    <div className="mb-5 space-y-1.5 print:hidden">
      {visibleAlerts.map((alert) => {
        const isCritical = alert.severity === 'CRITICAL';
        const isWarning = alert.severity === 'WARNING';

        return (
          <div
            key={alert.id}
            className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-xs ${
              isCritical
                ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                : isWarning
                ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                : 'bg-sky-50/90 border-sky-200 text-sky-900'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isCritical ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-sky-600 shrink-0" />
              )}
              <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-white/80 border border-current/15 shrink-0">
                {alert.alertType.replace('_', ' ')}
              </span>
              <span className="font-medium truncate">{alert.message}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {alerts.length > 1 && alert.id === alerts[0].id && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="px-2 py-1 rounded-md bg-white/70 hover:bg-white text-slate-700 font-semibold flex items-center gap-1 border border-slate-200/80"
                >
                  <span>{expanded ? 'Hide' : `+${alerts.length - 1} more`}</span>
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
              <button
                onClick={() => handleResolve(alert.id)}
                className="px-2.5 py-1 rounded-md bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-semibold flex items-center gap-1 border border-slate-200 transition-colors"
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
