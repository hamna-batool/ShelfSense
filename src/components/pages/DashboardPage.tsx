/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Boxes,
  AlertTriangle,
  Clock,
  ShoppingCart,
  TrendingDown,
  ArrowRight,
  Package,
  CheckCircle,
  Truck,
  ShieldAlert,
} from 'lucide-react';
import {
  calculateDaysLeft,
  calculateDaysOfCover,
  formatPKR,
  getStatusBandColor,
  isAtRiskOfExpiringUnsold,
  isSlowMoving,
} from '../../utils/rulesEngine';
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
import { ProductCategory } from '../../types';

export const DashboardPage: React.FC = () => {
  const { state, alerts, setActivePage, dispatch, showToast } = useApp();

  // Metrics computation
  const totalStockValue = state.batches.reduce((sum, b) => {
    const prod = state.products.find((p) => p.sku === b.sku);
    return sum + b.qty * (prod ? prod.unitCost : 0);
  }, 0);

  const batchesIn7Days = state.batches.filter((b) => {
    const dl = calculateDaysLeft(b.expiryDate, state.today);
    return dl >= 0 && dl <= 7;
  });

  const batchesIn30Days = state.batches.filter((b) => {
    const dl = calculateDaysLeft(b.expiryDate, state.today);
    return dl > 7 && dl <= 30;
  });

  const batchesIn60Days = state.batches.filter((b) => {
    const dl = calculateDaysLeft(b.expiryDate, state.today);
    return dl > 30 && dl <= 60;
  });

  const expiredBatches = state.batches.filter((b) => {
    const dl = calculateDaysLeft(b.expiryDate, state.today);
    return dl < 0;
  });

  const expiredValue = expiredBatches.reduce((sum, b) => {
    const prod = state.products.find((p) => p.sku === b.sku);
    return sum + b.qty * (prod ? prod.unitCost : 0);
  }, 0);

  // Slow moving stock computation
  let slowMovingValue = 0;
  let slowMovingCount = 0;
  state.products.forEach((prod) => {
    const skuBatches = state.batches.filter(
      (b) => b.sku === prod.sku && b.qualityStatus === 'Released'
    );
    const totalQty = skuBatches.reduce((acc, b) => acc + b.qty, 0);
    const { days } = calculateDaysOfCover(totalQty, prod.avgDailySales);
    if (isSlowMoving(days, state.slowMoverThresholdDays)) {
      slowMovingCount++;
      slowMovingValue += totalQty * prod.unitCost;
    }
  });

  const pendingApprovals = state.purchaseRequests.filter(
    (pr) => pr.status === 'Pending approval'
  );

  const holdBatches = state.batches.filter((b) => b.qualityStatus === 'Hold');

  // Chart 1: Expiry Timeline by Week (Next 12 weeks)
  const timelineData: Array<{
    week: string;
    critical: number;
    warning: number;
    safe: number;
  }> = [];

  for (let w = 1; w <= 12; w++) {
    const startDay = (w - 1) * 7;
    const endDay = w * 7;
    let critical = 0;
    let warning = 0;
    let safe = 0;

    state.batches.forEach((b) => {
      const dl = calculateDaysLeft(b.expiryDate, state.today);
      if (dl >= startDay && dl < endDay) {
        if (dl <= 14) critical++;
        else if (dl <= 45) warning++;
        else safe++;
      }
    });

    timelineData.push({
      week: `Wk ${w}`,
      critical,
      warning,
      safe,
    });
  }

  // Chart 2: Stock Value by Category (Donut)
  const categoryValues: Partial<Record<ProductCategory, number>> = {};
  state.batches.forEach((b) => {
    const prod = state.products.find((p) => p.sku === b.sku);
    if (prod) {
      const val = b.qty * prod.unitCost;
      categoryValues[prod.category] = (categoryValues[prod.category] || 0) + val;
    }
  });

  const pieData = Object.entries(categoryValues).map(([name, value]) => ({
    name,
    value,
  }));

  const PIE_COLORS = [
    '#059669', // Emerald
    '#2563EB', // Blue
    '#D97706', // Amber
    '#7C3AED', // Violet
    '#DC2626', // Red
    '#0891B2', // Cyan
    '#EA580C', // Orange
    '#4B5563', // Gray
  ];

  // Chart 3: Write-offs by Month (Bar)
  const writeOffByMonth: Record<string, number> = {};
  state.writeOffs.forEach((wo) => {
    const m = wo.date.substring(0, 7);
    writeOffByMonth[m] = (writeOffByMonth[m] || 0) + wo.value;
  });
  const writeOffData = Object.entries(writeOffByMonth)
    .sort()
    .map(([month, val]) => ({
      month: month.replace('2026-', 'M'),
      value: val,
    }));

  // Top 10 At-Risk SKUs
  const atRiskSkus = state.products
    .map((prod) => {
      const skuBatches = state.batches.filter((b) => b.sku === prod.sku);
      const earliestBatch = [...skuBatches].sort(
        (a, b) =>
          calculateDaysLeft(a.expiryDate, state.today) -
          calculateDaysLeft(b.expiryDate, state.today)
      )[0];

      const daysLeft = earliestBatch
        ? calculateDaysLeft(earliestBatch.expiryDate, state.today)
        : 999;
      const usableStock = skuBatches
        .filter(
          (b) =>
            b.qualityStatus === 'Released' &&
            calculateDaysLeft(b.expiryDate, state.today) >= 0
        )
        .reduce((sum, b) => sum + b.qty, 0);

      const { days: coverDays } = calculateDaysOfCover(
        usableStock,
        prod.avgDailySales
      );
      const atRisk = isAtRiskOfExpiringUnsold(coverDays, daysLeft);

      const riskScore =
        (daysLeft < 30 ? (30 - daysLeft) * 10 : 0) +
        (atRisk ? 50 : 0) +
        (daysLeft < 0 ? 100 : 0);

      return {
        sku: prod.sku,
        name: prod.name,
        category: prod.category,
        daysLeft,
        coverDays,
        usableStock,
        unit: prod.unit,
        riskScore,
        earliestBatchNo: earliestBatch ? earliestBatch.batchNo : '—',
      };
    })
    .filter((item) => item.daysLeft < 60 || item.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10);

  // Top urgent items needing attention today
  const urgentAlerts = alerts.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Plant Operations Dashboard
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Real-time expiry horizon and inventory risk overview · Multan, Pakistan
          </p>
        </div>

        {/* Role perspective banner */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">View mode:</span>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {state.role} Perspective
          </span>
        </div>
      </div>

      {/* Role-Specific Guidance Callout */}
      {state.role === 'Quality' && (
        <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-sky-700 dark:text-sky-400" />
            <div>
              <div className="text-xs font-bold text-sky-900 dark:text-sky-200">
                QA Laboratory View Active: {holdBatches.length} Batches under Quality Hold
              </div>
              <div className="text-[11px] text-sky-700 dark:text-sky-400">
                You have exclusive clearance to update Hold batches to Released or Rejected with audit notes.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActivePage('inventory', { filterSeverity: undefined })}
            className="px-3 py-1.5 text-xs font-semibold bg-sky-700 hover:bg-sky-800 text-white rounded-lg transition-colors"
          >
            Review QA Holds
          </button>
        </div>
      )}

      {state.role === 'Procurement' && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Procurement Reorder Alert: {pendingApprovals.length} Requisitions Awaiting Approval
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400">
                Review automated reorder quantities with projected shelf-life expiry deductions.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActivePage('purchasing')}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded-lg transition-colors"
          >
            Review Purchases
          </button>
        </div>
      )}

      {state.role === 'Warehouse' && (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Warehouse Floor Dispatch View
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Ensure all picks strictly follow FEFO rules. Batches on Quality Hold are blocked from dispatch.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActivePage('fefo')}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg transition-colors"
          >
            Open Dispatch Desk
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Stock Value */}
        <button
          onClick={() => setActivePage('inventory')}
          className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left hover:border-emerald-500 transition-all group"
        >
          <div className="flex items-center justify-between text-neutral-400 group-hover:text-emerald-600 mb-2">
            <Boxes className="w-4 h-4" />
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            Total Inventory
          </div>
          <div className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono mt-0.5 truncate">
            {formatPKR(totalStockValue)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            {state.batches.length} batches in stock
          </div>
        </button>

        {/* Expiring in 7 Days */}
        <button
          onClick={() => setActivePage('alerts', { filterWindow: '7' })}
          className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left hover:border-rose-500 transition-all group"
        >
          <div className="flex items-center justify-between text-rose-500 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/60 rounded text-rose-700 dark:text-rose-400">
              Urgent
            </span>
          </div>
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            Expiring &le; 7 Days
          </div>
          <div className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5">
            {batchesIn7Days.length}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            Immediate dispatch need
          </div>
        </button>

        {/* Expiring in 30 Days */}
        <button
          onClick={() => setActivePage('alerts', { filterWindow: '30' })}
          className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left hover:border-orange-500 transition-all group"
        >
          <div className="flex items-center justify-between text-orange-500 mb-2">
            <Clock className="w-4 h-4" />
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            Expiring 8–30 Days
          </div>
          <div className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400 font-mono mt-0.5">
            {batchesIn30Days.length}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            Below retail chain spec
          </div>
        </button>

        {/* Expiring in 60 Days */}
        <button
          onClick={() => setActivePage('alerts', { filterWindow: '60' })}
          className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left hover:border-amber-500 transition-all group"
        >
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <Package className="w-4 h-4" />
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            Expiring 31–60 Days
          </div>
          <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
            {batchesIn60Days.length}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            Monitor dispatch queue
          </div>
        </button>

        {/* Expired Stock Value */}
        <button
          onClick={() => setActivePage('inventory', { filterSeverity: 'Expired' })}
          className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left hover:border-rose-600 transition-all group"
        >
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <TrendingDown className="w-4 h-4" />
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            Expired Stock
          </div>
          <div className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5 truncate">
            {formatPKR(expiredValue)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            {expiredBatches.length} batch(es) to write off
          </div>
        </button>

        {/* Slow-Moving Stock Value */}
        <button
          onClick={() => setActivePage('slow_moving')}
          className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left hover:border-purple-500 transition-all group"
        >
          <div className="flex items-center justify-between text-purple-500 mb-2">
            <Clock className="w-4 h-4" />
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            Slow-Moving Stock
          </div>
          <div className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono mt-0.5 truncate">
            {formatPKR(slowMovingValue)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            {slowMovingCount} SKU(s) &gt;{state.slowMoverThresholdDays}d cover
          </div>
        </button>

        {/* Pending Purchases */}
        <button
          onClick={() => setActivePage('purchasing')}
          className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left hover:border-sky-500 transition-all group"
        >
          <div className="flex items-center justify-between text-sky-500 mb-2">
            <ShoppingCart className="w-4 h-4" />
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            Purchase Approvals
          </div>
          <div className="text-base sm:text-lg font-bold text-sky-600 dark:text-sky-400 font-mono mt-0.5">
            {pendingApprovals.length}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            Pending management signoff
          </div>
        </button>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Expiry Timeline (Next 12 Weeks) */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Expiry Horizon by Week (Next 12 Weeks)
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Weekly batch expiry counts projected from {state.today}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                Critical (&le;14d)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                Warning (15-45d)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                Safe (&gt;45d)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <XAxis dataKey="week" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: state.darkMode ? '#171717' : '#ffffff',
                    borderColor: state.darkMode ? '#262626' : '#e5e5e5',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} name="Critical (<=14d)" />
                <Bar dataKey="warning" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} name="Warning (15-45d)" />
                <Bar dataKey="safe" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Safe (>45d)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Inventory Value by Category */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Stock Valuation by Category
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 mb-4">
            Total carrying cost distribution across product lines
          </p>

          <div className="h-56 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatPKR(Number(value))}
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
      </div>

      {/* Secondary Row: Needs Attention Today + Write-Off History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention Today List */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>Needs Attention Today</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                  {urgentAlerts.length} Action Items
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Highest priority batches flagged by deterministic rules engine
              </p>
            </div>
            <button
              onClick={() => setActivePage('alerts')}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View All Alerts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {urgentAlerts.map((alert) => {
              const { badgeBg, label } = getStatusBandColor(alert.daysLeft);

              return (
                <div
                  key={alert.id}
                  className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0">
                      <Package className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {alert.productName}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-500">
                          {alert.batchNo}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium border ${badgeBg}`}
                        >
                          {label}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2 mt-1">
                        <span>Loc: {alert.location}</span>
                        <span>·</span>
                        <span>Qty: {alert.qty} {alert.unit}</span>
                        <span>·</span>
                        <span className="font-mono">{formatPKR(alert.value)}</span>
                        <span>·</span>
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          Suggested: {alert.suggestedAction}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* One-click quick actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => {
                        setActivePage('fefo');
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      Prioritise FEFO
                    </button>
                    <button
                      onClick={() => {
                        showToast(
                          'info',
                          'Alert Acknowledged',
                          `Batch ${alert.batchNo} assigned to ${state.role} desk for monitoring.`
                        );
                      }}
                      className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded-lg transition-colors"
                      title="Acknowledge alert"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Write-offs by Month Chart */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Write-Off Trends (PKR)
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Monthly historical financial losses
              </p>
            </div>
            <button
              onClick={() => setActivePage('finance')}
              className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
            >
              Finance Log &rarr;
            </button>
          </div>

          <div className="h-56 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={writeOffData}>
                <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => formatPKR(Number(value))}
                  contentStyle={{
                    backgroundColor: state.darkMode ? '#171717' : '#ffffff',
                    borderColor: state.darkMode ? '#262626' : '#e5e5e5',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" fill="#dc2626" radius={[4, 4, 0, 0]} name="Loss (PKR)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 10 At-Risk SKUs Table */}
      <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Top 10 At-Risk SKUs (Expiry vs Daily Consumption)
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Ranked by risk score: days of cover exceeds remaining batch shelf life
            </p>
          </div>
          <button
            onClick={() => setActivePage('slow_moving')}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Open Slow Movers Analysis &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-semibold">
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Earliest Batch</th>
                <th className="py-2.5 px-3 text-right">Days Left</th>
                <th className="py-2.5 px-3 text-right">Usable Stock</th>
                <th className="py-2.5 px-3 text-right">Days of Cover</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {atRiskSkus.map((item) => {
                const isOverHorizon = item.coverDays > item.daysLeft;

                return (
                  <tr
                    key={item.sku}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-medium text-neutral-700 dark:text-neutral-300">
                      {item.sku}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-neutral-900 dark:text-neutral-100">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500">
                      {item.category}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-600 dark:text-neutral-400">
                      {item.earliestBatchNo}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      <span
                        className={
                          item.daysLeft < 0
                            ? 'text-rose-600 font-bold'
                            : item.daysLeft <= 30
                            ? 'text-orange-600 font-semibold'
                            : 'text-neutral-700 dark:text-neutral-300'
                        }
                      >
                        {item.daysLeft < 0 ? `Expired (${item.daysLeft}d)` : `${item.daysLeft}d`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                      {item.usableStock} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                      {item.coverDays.toFixed(1)} days
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isOverHorizon ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                          At Risk of Expiring Unsold
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                          Approaching Limit
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
