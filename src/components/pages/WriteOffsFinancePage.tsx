/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatPKR, formatDate } from '../../utils/rulesEngine';
import {
  FileText,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  DollarSign,
  TrendingDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { WriteOffReason } from '../../types';
import { NewWriteOffModal } from '../modals/NewWriteOffModal';

export const WriteOffsFinancePage: React.FC = () => {
  const { state, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'writeoffs' | 'valuation' | 'invoices'>('writeoffs');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');

  // Modal to log new write-off directly
  const [modalBatch, setModalBatch] = useState<typeof state.batches[0] | null>(null);

  // Total write-off losses
  const totalWriteOffValue = state.writeOffs.reduce((sum, w) => sum + w.value, 0);

  // Filtered write-offs
  const filteredWriteOffs = state.writeOffs.filter((w) => {
    if (reasonFilter !== 'ALL' && w.reason !== reasonFilter) return false;
    return true;
  });

  // Write-offs by reason
  const writeOffByReason: Record<string, number> = {};
  state.writeOffs.forEach((wo) => {
    writeOffByReason[wo.reason] = (writeOffByReason[wo.reason] || 0) + wo.value;
  });
  const reasonChartData = Object.entries(writeOffByReason).map(([reason, value]) => ({
    name: reason,
    value,
  }));

  const REASON_COLORS = ['#dc2626', '#f59e0b', '#7c3aed', '#0284c7'];

  // Monthly breakdown
  const writeOffByMonth: Record<string, number> = {};
  state.writeOffs.forEach((wo) => {
    const m = wo.date.substring(0, 7);
    writeOffByMonth[m] = (writeOffByMonth[m] || 0) + wo.value;
  });
  const monthlyChartData = Object.entries(writeOffByMonth)
    .sort()
    .map(([month, val]) => ({
      month: month.replace('2026-', 'M'),
      loss: val,
    }));

  // Stock valuation by category
  const valuationByCategory: Record<string, { totalQty: number; totalCost: number; unit: string }> = {};
  state.batches.forEach((b) => {
    const prod = state.products.find((p) => p.sku === b.sku);
    if (prod) {
      if (!valuationByCategory[prod.category]) {
        valuationByCategory[prod.category] = { totalQty: 0, totalCost: 0, unit: prod.unit };
      }
      valuationByCategory[prod.category].totalQty += b.qty;
      valuationByCategory[prod.category].totalCost += b.qty * prod.unitCost;
    }
  });

  // Simulated Invoice Verification Checklist (Matched vs Mismatched POs)
  const simulatedInvoices = [
    {
      invNo: 'INV-CFM-981',
      supplier: 'Chenab Flour Mills Khanewal',
      poNumber: 'PO-8809',
      date: '2026-11-04',
      billedQty: 180,
      receivedQty: 180,
      unitPriceBilled: 5400,
      unitPriceAgreed: 5400,
      totalAmount: 972000,
      status: 'Matched',
      notes: 'Three-way match verified against warehouse GRN #4412.',
    },
    {
      invNo: 'INV-CSM-420',
      supplier: 'Chashma Sugar Mills Multan',
      poNumber: 'PO-8812',
      date: '2026-11-07',
      billedQty: 120,
      receivedQty: 120,
      unitPriceBilled: 7200,
      unitPriceAgreed: 7200,
      totalAmount: 864000,
      status: 'Matched',
      notes: 'Approved for 30-day net electronic payment.',
    },
    {
      invNo: 'INV-HOM-109',
      supplier: 'Habib Oil Mills Karachi Depot',
      poNumber: 'PO-8815',
      date: '2026-11-09',
      billedQty: 140,
      receivedQty: 135,
      unitPriceBilled: 6850,
      unitPriceAgreed: 6800,
      totalAmount: 959000,
      status: 'Mismatched',
      notes: 'Price variance: Invoiced at PKR 6,850/tin vs PO contract price PKR 6,800/tin. 5 tins missing in transit.',
    },
    {
      invNo: 'INV-TPF-882',
      supplier: 'Tri-Pack Films Karachi',
      poNumber: 'PO-8818',
      date: '2026-11-03',
      billedQty: 50,
      receivedQty: 50,
      unitPriceBilled: 14500,
      unitPriceAgreed: 14500,
      totalAmount: 725000,
      status: 'Matched',
      notes: 'QA seal test certificates attached.',
    },
    {
      invNo: 'INV-PKG-331',
      supplier: 'Packages Ltd Lahore',
      poNumber: 'PO-8820',
      date: '2026-11-10',
      billedQty: 60,
      receivedQty: 60,
      unitPriceBilled: 8750,
      unitPriceAgreed: 8500,
      totalAmount: 525000,
      status: 'Mismatched',
      notes: 'Freight surcharge of PKR 250/pack added without prior purchase amendment.',
    },
  ];

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = [
      'Write-Off ID',
      'Date',
      'Batch No',
      'SKU',
      'Product Name',
      'Category',
      'Quantity',
      'Unit',
      'Loss Value (PKR)',
      'Reason',
      'Approved By',
      'Notes',
    ];

    const rows = state.writeOffs.map((w) => [
      w.id,
      w.date,
      w.batchNo,
      w.sku,
      `"${w.productName.replace(/"/g, '""')}"`,
      w.category,
      w.qty,
      w.unit,
      w.value,
      w.reason,
      w.approvedBy,
      `"${(w.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ShelfSense_WriteOffs_Finance_${state.today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'CSV Exported', `Exported ${state.writeOffs.length} write-off records.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span>Write-offs &amp; Financial Governance</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Loss accounting, category asset valuation, and three-way purchase invoice reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              if (state.batches.length > 0) {
                setModalBatch(state.batches[0]);
              }
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Log Write-Off</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-neutral-400">
            Total Recognized Loss (Fiscal Year)
          </div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
            {formatPKR(totalWriteOffValue)}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Across {state.writeOffs.length} write-off condemnation events
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-neutral-400">
            Primary Loss Cause
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
            Expiry Depletion
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {formatPKR(writeOffByReason['Expired'] || 0)} written off as expired
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-neutral-400">
            Invoice Discrepancies
          </div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
            2 Mismatches
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Pending supplier credit note adjustments
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 w-fit">
        <button
          onClick={() => setActiveTab('writeoffs')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'writeoffs'
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          Write-Offs Register
        </button>
        <button
          onClick={() => setActiveTab('valuation')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'valuation'
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          Stock Valuation by Category
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'invoices'
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          Invoice Verification Checklist
        </button>
      </div>

      {activeTab === 'writeoffs' && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loss by Reason (Donut) */}
            <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Write-Off Losses by Reason
              </h2>
              <p className="text-xs text-neutral-500 mb-4">
                Proportion of financial condemnation by root cause
              </p>
              <div className="h-56 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reasonChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {reasonChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={REASON_COLORS[index % REASON_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => formatPKR(Number(v))}
                      contentStyle={{
                        backgroundColor: state.darkMode ? '#171717' : '#ffffff',
                        borderColor: state.darkMode ? '#262626' : '#e5e5e5',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Trend Bar */}
            <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Monthly Loss Progression (PKR)
              </h2>
              <p className="text-xs text-neutral-500 mb-4">
                Aggregated financial write-offs logged by fiscal period
              </p>
              <div className="h-56 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData}>
                    <XAxis dataKey="month" stroke="#888888" fontSize={11} />
                    <YAxis
                      stroke="#888888"
                      fontSize={10}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v: any) => formatPKR(Number(v))}
                      contentStyle={{
                        backgroundColor: state.darkMode ? '#171717' : '#ffffff',
                        borderColor: state.darkMode ? '#262626' : '#e5e5e5',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="loss" fill="#dc2626" radius={[4, 4, 0, 0]} name="Loss (PKR)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Write-Off Audit Log
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  className="p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs"
                >
                  <option value="ALL">All Reasons</option>
                  <option value="Expired">Expired Only</option>
                  <option value="Damaged">Damaged Only</option>
                  <option value="Quality rejection">Quality rejection</option>
                  <option value="Returned unsaleable">Returned unsaleable</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Batch &amp; SKU</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-right">Condemned Qty</th>
                    <th className="py-2.5 px-3 text-right">Financial Loss</th>
                    <th className="py-2.5 px-3">Cause / Reason</th>
                    <th className="py-2.5 px-3">Approved By</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredWriteOffs.map((w) => (
                    <tr key={w.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="py-2.5 px-3 font-mono text-neutral-500">
                        {formatDate(w.date)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-800 dark:text-neutral-200">
                        {w.batchNo}
                        <div className="text-[10px] font-normal text-neutral-400">{w.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-neutral-900 dark:text-neutral-100">
                        {w.productName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-800 dark:text-neutral-200">
                        {w.qty} {w.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatPKR(w.value)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {w.reason}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300">
                        {w.approvedBy}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500 text-[11px] max-w-xs">
                        {w.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'valuation' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Warehouse Stock Valuation Ledger (by Product Line)
              </h2>
              <p className="text-xs text-neutral-500">
                Carrying inventory asset value evaluated against actual standard cost
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Physical Quantity</th>
                  <th className="py-2.5 px-3 text-right">Carrying Asset Value (PKR)</th>
                  <th className="py-2.5 px-3 text-right">% of Warehouse Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {Object.entries(valuationByCategory).map(([cat, data]) => {
                  const totalWhCost = Object.values(valuationByCategory).reduce((acc, c) => acc + c.totalCost, 0);
                  const pct = totalWhCost > 0 ? (data.totalCost / totalWhCost) * 100 : 0;

                  return (
                    <tr key={cat} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="py-2.5 px-3 font-semibold text-neutral-900 dark:text-neutral-100">
                        {cat}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                        {data.totalQty.toLocaleString()} {data.unit}s
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {formatPKR(data.totalCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                        {pct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Three-Way Purchase Invoice Reconciliation Checklist
              </h2>
              <p className="text-xs text-neutral-500">
                Verifies Supplier Invoices against Approved Purchase Orders (PO) and Warehouse Goods Received Notes (GRN)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                  <th className="py-2.5 px-3">Invoice &amp; PO</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3 text-right">Billed vs Received Qty</th>
                  <th className="py-2.5 px-3 text-right">Invoiced Rate</th>
                  <th className="py-2.5 px-3 text-right">Agreed PO Rate</th>
                  <th className="py-2.5 px-3 text-right">Total Invoice (PKR)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Audit Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {simulatedInvoices.map((inv) => {
                  const isMatched = inv.status === 'Matched';

                  return (
                    <tr
                      key={inv.invNo}
                      className={
                        !isMatched
                          ? 'bg-amber-50/30 dark:bg-amber-950/20'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                      }
                    >
                      <td className="py-2.5 px-3 font-mono">
                        <div className="font-bold text-neutral-900 dark:text-neutral-100">
                          {inv.invNo}
                        </div>
                        <div className="text-[11px] text-neutral-400">{inv.poNumber}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-neutral-800 dark:text-neutral-200">
                        {inv.supplier}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        <span className={inv.billedQty !== inv.receivedQty ? 'text-rose-600 font-bold' : ''}>
                          {inv.billedQty} / {inv.receivedQty}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatPKR(inv.unitPriceBilled)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-500">
                        {formatPKR(inv.unitPriceAgreed)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {formatPKR(inv.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isMatched ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle className="w-3 h-3" />
                            Matched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            <XCircle className="w-3 h-3" />
                            Mismatched
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-300 text-[11px] max-w-xs">
                        {inv.notes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Write Off Modal */}
      <NewWriteOffModal
        batch={modalBatch}
        isOpen={!!modalBatch}
        onClose={() => setModalBatch(null)}
      />
    </div>
  );
};
