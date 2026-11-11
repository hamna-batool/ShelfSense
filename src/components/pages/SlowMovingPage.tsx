/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  calculateDaysLeft,
  calculateDaysOfCover,
  formatPKR,
  isAtRiskOfExpiringUnsold,
  isSlowMoving,
} from '../../utils/rulesEngine';
import {
  Clock,
  AlertTriangle,
  TrendingDown,
  Sliders,
  HelpCircle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { ProductCategory } from '../../types';

export const SlowMovingPage: React.FC = () => {
  const { state, dispatch, setActivePage } = useApp();

  const [thresholdDays, setThresholdDays] = useState(
    state.slowMoverThresholdDays
  );
  const [salesWindowDays, setSalesWindowDays] = useState(30);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const categories: ProductCategory[] = [
    'Biscuits',
    'Wafers',
    'Confectionery',
    'Pasta',
    'Sauces',
    'Snacks',
    'Ingredients',
    'Packaging',
  ];

  // Compute slow moving metrics per product
  const productsAnalysis = useMemo(() => {
    return state.products
      .filter((p) => categoryFilter === 'ALL' || p.category === categoryFilter)
      .map((prod) => {
        const skuBatches = state.batches.filter((b) => b.sku === prod.sku);
        const usableBatches = skuBatches.filter(
          (b) =>
            b.qualityStatus === 'Released' &&
            calculateDaysLeft(b.expiryDate, state.today) >= 0
        );

        const usableStock = usableBatches.reduce((acc, b) => acc + b.qty, 0);

        // Find earliest remaining shelf life among usable batches
        const earliestBatch = [...usableBatches].sort(
          (a, b) =>
            calculateDaysLeft(a.expiryDate, state.today) -
            calculateDaysLeft(b.expiryDate, state.today)
        )[0];

        const remainingShelfLife = earliestBatch
          ? calculateDaysLeft(earliestBatch.expiryDate, state.today)
          : 0;

        const { days: daysOfCover, isInfinity, formatted: coverFormatted } =
          calculateDaysOfCover(usableStock, prod.avgDailySales);

        const isSlow = isSlowMoving(daysOfCover, thresholdDays);
        const atRiskOfExpiry =
          usableStock > 0 &&
          isAtRiskOfExpiringUnsold(daysOfCover, remainingShelfLife);

        // Value at risk estimation: if daysOfCover > remainingShelfLife, the excess stock that cannot be sold
        let valueAtRisk = 0;
        let excessUnits = 0;
        if (atRiskOfExpiry && prod.avgDailySales > 0) {
          const sellableUnits = Math.round(
            prod.avgDailySales * remainingShelfLife
          );
          excessUnits = Math.max(0, usableStock - sellableUnits);
          valueAtRisk = excessUnits * prod.unitCost;
        }

        let suggestedAction = 'Normal stock turn';
        if (atRiskOfExpiry) {
          suggestedAction =
            'Offer discount or transfer channel immediately (risk of unsold expiry)';
        } else if (isSlow) {
          suggestedAction =
            'Halt production / Reduce replenishment safety buffer';
        }

        return {
          sku: prod.sku,
          name: prod.name,
          category: prod.category,
          unit: prod.unit,
          unitCost: prod.unitCost,
          avgDailySales: prod.avgDailySales,
          usableStock,
          remainingShelfLife,
          daysOfCover,
          isInfinity,
          coverFormatted,
          isSlow,
          atRiskOfExpiry,
          excessUnits,
          valueAtRisk,
          suggestedAction,
          earliestBatchNo: earliestBatch ? earliestBatch.batchNo : '—',
        };
      });
  }, [
    state.products,
    state.batches,
    state.today,
    thresholdDays,
    categoryFilter,
  ]);

  // Overall totals
  const totalValueAtRisk = productsAnalysis.reduce(
    (sum, p) => sum + p.valueAtRisk,
    0
  );
  const slowMoversCount = productsAnalysis.filter((p) => p.isSlow).length;
  const atRiskCount = productsAnalysis.filter((p) => p.atRiskOfExpiry).length;

  // Scatter chart data: X = Remaining Shelf Life (days), Y = Days of Cover (capped for plotting)
  const scatterData = productsAnalysis
    .filter((p) => p.usableStock > 0 && !p.isInfinity)
    .map((p) => ({
      x: p.remainingShelfLife,
      y: Math.min(250, p.daysOfCover),
      name: p.name,
      sku: p.sku,
      category: p.category,
      atRisk: p.atRiskOfExpiry,
      valueAtRisk: p.valueAtRisk,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span>Slow-Moving Stock &amp; Expiry Risk Horizon</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Days-of-cover evaluation vs batch shelf life: identify inventory projected to expire unsold
          </p>
        </div>

        {/* Value at Risk Banner */}
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-400">
              Estimated Value at Risk
            </div>
            <div className="text-base font-bold text-rose-700 dark:text-rose-300 font-mono">
              {formatPKR(totalValueAtRisk)}
            </div>
            <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80">
              estimate based on current rules
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Parameters Drawer Bar */}
      <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-neutral-400" />
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              Slow-Mover Threshold:
            </span>
            <input
              type="number"
              min="30"
              max="365"
              step="5"
              value={thresholdDays}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 90;
                setThresholdDays(val);
                dispatch({ type: 'UPDATE_SLOW_MOVER_THRESHOLD', days: val });
              }}
              className="w-20 p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded font-mono font-bold text-center"
            />
            <span className="text-neutral-500">days</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Sales Velocity Window:</span>
            <select
              value={salesWindowDays}
              onChange={(e) => setSalesWindowDays(parseInt(e.target.value, 10))}
              className="p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs"
            >
              <option value={30}>Last 30 Days Average</option>
              <option value={60}>Last 60 Days Rolling</option>
              <option value={90}>Last 90 Days Seasonal</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-neutral-500 flex items-center gap-3">
          <span>
            Flagged: <strong>{slowMoversCount}</strong> slow movers
          </span>
          <span>·</span>
          <span className="text-rose-600 font-bold">
            {atRiskCount} at risk of expiring unsold
          </span>
        </div>
      </div>

      {/* Visual Risk Matrix: Scatter Chart (Days of Cover vs Remaining Shelf Life) */}
      <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>Risk Horizon Matrix (Days of Cover vs Remaining Shelf Life)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                At-Risk Zone: Days of Cover &gt; Remaining Shelf Life
              </span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Items plotting above the 45° diagonal cannot be sold at current velocity before expiring
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <XAxis
                type="number"
                dataKey="x"
                name="Remaining Shelf Life"
                unit="d"
                stroke="#888888"
                fontSize={11}
                label={{
                  value: 'Remaining Shelf Life (Days)',
                  position: 'insideBottom',
                  offset: -10,
                  fontSize: 11,
                  fill: '#888888',
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Days of Cover"
                unit="d"
                stroke="#888888"
                fontSize={11}
                label={{
                  value: 'Days of Cover (Stock ÷ Daily Sales)',
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 11,
                  fill: '#888888',
                }}
              />
              <ZAxis range={[60, 200]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg text-xs space-y-1">
                        <div className="font-bold text-neutral-900 dark:text-neutral-100">
                          {data.name}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-500">
                          {data.sku} ({data.category})
                        </div>
                        <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800 space-y-0.5">
                          <div>
                            Remaining Shelf Life:{' '}
                            <strong>{data.x} days</strong>
                          </div>
                          <div>
                            Days of Cover: <strong>{data.y} days</strong>
                          </div>
                          {data.atRisk && (
                            <div className="text-rose-600 font-bold">
                              At Risk of Expiring Unsold! Value: {formatPKR(data.valueAtRisk)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Shaded At-Risk Reference Area */}
              <ReferenceArea
                x1={0}
                x2={100}
                y1={100}
                y2={250}
                fill="#dc2626"
                fillOpacity={0.06}
              />
              <ReferenceLine
                y={thresholdDays}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `Slow Mover Limit (${thresholdDays}d)`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'right',
                }}
              />
              <Scatter
                name="At Risk Stock"
                data={scatterData.filter((d) => d.atRisk)}
                fill="#dc2626"
              />
              <Scatter
                name="Healthy Stock"
                data={scatterData.filter((d) => !d.atRisk)}
                fill="#059669"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Analysis Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Slow-Moving &amp; At-Risk Stock Registry
          </h2>
          <span className="text-xs text-neutral-500">
            Ordered by estimated financial value at risk
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold">
                <th className="py-2.5 px-3">SKU &amp; Product</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Avg Daily Sales</th>
                <th className="py-2.5 px-3 text-right">Usable Stock</th>
                <th className="py-2.5 px-3 text-right">Days of Cover</th>
                <th className="py-2.5 px-3 text-right">Remaining Shelf Life</th>
                <th className="py-2.5 px-3 text-right">Est. Value at Risk</th>
                <th className="py-2.5 px-3">Suggested Intervention</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {productsAnalysis
                .sort((a, b) => b.valueAtRisk - a.valueAtRisk)
                .map((p) => {
                  return (
                    <tr
                      key={p.sku}
                      className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors ${
                        p.atRiskOfExpiry
                          ? 'bg-rose-50/20 dark:bg-rose-950/15'
                          : p.isSlow
                          ? 'bg-amber-50/10'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {p.name}
                        </div>
                        <div className="font-mono text-neutral-400 text-[11px]">
                          {p.sku} · Earliest: {p.earliestBatchNo}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500">{p.category}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                        {p.avgDailySales} {p.unit}/day
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                        {p.usableStock} {p.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        <span
                          className={
                            p.isSlow
                              ? 'text-amber-600 dark:text-amber-400 font-bold'
                              : 'text-neutral-700 dark:text-neutral-300'
                          }
                        >
                          {p.coverFormatted}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        <span
                          className={
                            p.remainingShelfLife <= 30
                              ? 'text-orange-600 font-bold'
                              : 'text-neutral-700 dark:text-neutral-300'
                          }
                        >
                          {p.remainingShelfLife} days
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {p.valueAtRisk > 0 ? (
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {formatPKR(p.valueAtRisk)}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block text-[11px] font-medium ${
                            p.atRiskOfExpiry
                              ? 'text-rose-700 dark:text-rose-400'
                              : p.isSlow
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-neutral-500'
                          }`}
                        >
                          {p.suggestedAction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {p.atRiskOfExpiry ? (
                          <button
                            onClick={() => setActivePage('fefo')}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold transition-colors"
                          >
                            Route FEFO
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setActivePage('inventory', { searchQuery: p.sku })
                            }
                            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 text-[11px] hover:underline"
                          >
                            Inspect
                          </button>
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
