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

  const reportTabs: Array<{ id: ReportTab; label: string; fr: string }> = [
    { id: 'stock-availability', label: 'Stock Availability', fr: 'FR-6.1' },
    { id: 'consumption', label: 'Monthly Consumption', fr: 'FR-6.2' },
    { id: 'shortages', label: 'Shortages & Alerts', fr: 'FR-6.3' },
    { id: 'procurement-performance', label: 'Procurement & Delivery', fr: 'FR-6.4' },
    { id: 'wastage', label: 'Material Wastage', fr: 'FR-6.5' },
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

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-700" />
            <span>Management & Operational Reports</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time inventory, consumption, shortages, procurement performance, and wastage (FR-6).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={rows.length === 0}
            className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white p-2 rounded-xl border border-slate-200 print:hidden">
        {reportTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveReport(t.id)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeReport === t.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label} <span className="opacity-60 ml-1">({t.fr})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-end gap-4 print:hidden">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
          >
            <option value="ALL">All Categories</option>
            <option value="CHEMICAL">Cleaning Chemicals</option>
            <option value="EQUIPMENT">Cleaning Equipment</option>
            <option value="CONSUMABLE">Consumables</option>
            <option value="PPE">PPE</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>
        <button
          onClick={loadReport}
          className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-900">
            Hemas Hospital, Thalawathugoda —{' '}
            {reportTabs.find((t) => t.id === activeReport)?.label}
          </div>
          <div className="text-xs text-slate-500">{rows.length} records</div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">Generating report...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No data found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-2.5 font-semibold whitespace-nowrap">
                      {col.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {columns.map((col) => {
                      const val = row[col];
                      const display =
                        val === null || val === undefined
                          ? '-'
                          : typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)
                          ? new Date(val).toLocaleString()
                          : String(val);
                      return (
                        <td key={col} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
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
