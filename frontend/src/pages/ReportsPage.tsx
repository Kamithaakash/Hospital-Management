import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { BarChart3, Download, Printer, RefreshCw } from 'lucide-react';

type ReportTab =
  | 'stock-availability'
  | 'consumption'
  | 'shortages'
  | 'procurement-performance'
  | 'wastage';

export const ReportsPage: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportTab>('stock-availability');
  const [category, setCategory] = useState('ALL');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reportTabs: Array<{ id: ReportTab; label: string }> = [
    { id: 'stock-availability', label: 'Stock Availability' },
    { id: 'consumption', label: 'Monthly Consumption' },
    { id: 'shortages', label: 'Shortages & Alerts' },
    { id: 'procurement-performance', label: 'Procurement & Delivery' },
    { id: 'wastage', label: 'Material Wastage' },
  ];

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const res = await api.getReport(activeReport, { startDate, endDate, category });
      setRows(res.report || []);
    } catch (err) {
      console.error('Report load failed:', err);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeReport, category, startDate, endDate]);

  const exportCSV = () => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shsms-${activeReport}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns =
    rows.length > 0
      ? Object.keys(rows[0]).filter((k) => k !== 'id' && !k.endsWith('Id'))
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-700" />
            <span>Management & Operational Reports</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time inventory levels, consumption tracking, shortage alerts, and procurement performance.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={exportCSV}
            disabled={rows.length === 0}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 active:scale-[0.98] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl glass-pill hover:bg-white/90 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Glassmorphic Report Tabs */}
      <div className="flex items-center gap-1.5 glass-card p-2 sm:p-2.5 rounded-2xl relative overflow-hidden overflow-x-auto no-scrollbar print:hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        {reportTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveReport(t.id)}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all active:scale-95 ${
              activeReport === t.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'glass-pill text-slate-800 hover:bg-white/90'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Glassmorphic Filters */}
      <div className="glass-card p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden flex flex-wrap items-end gap-3 sm:gap-4 print:hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        <div className="w-full sm:w-auto">
          <label className="block text-[11px] font-bold text-slate-800 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="glass-input w-full sm:w-auto px-3 py-2 text-xs rounded-xl font-medium"
          >
            <option value="ALL">All Categories</option>
            <option value="CHEMICAL">Cleaning Chemicals</option>
            <option value="EQUIPMENT">Cleaning Equipment</option>
            <option value="CONSUMABLE">Consumables</option>
            <option value="PPE">PPE</option>
          </select>
        </div>
        <div className="flex-1 sm:flex-initial">
          <label className="block text-[11px] font-bold text-slate-800 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="glass-input w-full px-3 py-2 text-xs rounded-xl font-medium"
          />
        </div>
        <div className="flex-1 sm:flex-initial">
          <label className="block text-[11px] font-bold text-slate-800 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="glass-input w-full px-3 py-2 text-xs rounded-xl font-medium"
          />
        </div>
        <button
          onClick={loadReport}
          className="w-full sm:w-auto px-4 py-2 text-xs font-bold glass-pill hover:bg-white/90 text-slate-800 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
        >
          <RefreshCw className="w-3.5 h-3.5 text-sky-700" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Glassmorphic Report Table */}
      <div className="glass-card rounded-2xl sm:rounded-3xl overflow-hidden relative shadow-xs">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        <div className="p-3.5 sm:p-4 border-b border-white/30 flex items-center justify-between gap-2">
          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
            Hemas Hospital Thalawathugoda &bull;{' '}
            {reportTabs.find((t) => t.id === activeReport)?.label}
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-slate-700 glass-pill px-2.5 py-0.5 rounded-full shrink-0">
            {rows.length} records
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-500 font-medium">Generating report...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500 font-medium">
            No data found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="min-w-[640px] w-full text-left text-xs">
              <thead className="bg-white/30 backdrop-blur-md border-b border-white/40 text-slate-800 uppercase text-[11px]">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 font-bold whitespace-nowrap">
                      {col.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-white/60 transition-colors">
                    {columns.map((col) => {
                      const val = row[col];
                      const display =
                        val === null || val === undefined
                          ? '-'
                          : typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)
                          ? new Date(val).toLocaleString()
                          : String(val);
                      return (
                        <td key={col} className="px-4 py-2.5 text-slate-800 whitespace-nowrap font-medium">
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
