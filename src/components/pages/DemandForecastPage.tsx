/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateForecasts } from '../../utils/rulesEngine';
import {
  TrendingUp,
  Award,
  AlertCircle,
  HelpCircle,
  BarChart2,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

export const DemandForecastPage: React.FC = () => {
  const { state } = useApp();

  // Select finished product (exclude raw materials / packaging for sales demand forecasting)
  const finishedProducts = useMemo(() => {
    return state.products.filter(
      (p) => p.category !== 'Ingredients' && p.category !== 'Packaging'
    );
  }, [state.products]);

  const [selectedSku, setSelectedSku] = useState<string>(
    finishedProducts[0]?.sku || 'SKU-BIS-01'
  );

  const selectedProduct = state.products.find((p) => p.sku === selectedSku);

  // Retrieve 12 months sales data for selected product
  const productSales = useMemo(() => {
    const entry = state.monthlySales.find((ms) => ms.sku === selectedSku);
    return entry ? entry.monthlySales : {};
  }, [state.monthlySales, selectedSku]);

  // Run statistical forecast comparison
  const forecastResults = useMemo(() => {
    return calculateForecasts(productSales, 3);
  }, [productSales]);

  // Build full 12-month visual timeline chart data
  const months = Object.keys(productSales).sort();
  const testStartIndex = months.length - 3;

  const timelineChartData = months.map((monthKey, idx) => {
    const actual = productSales[monthKey];
    const isTest = idx >= testStartIndex;

    // Find test row if in held-out window
    const testMatch = forecastResults.table.find((t) => t.monthKey === monthKey);

    return {
      monthKey,
      monthLabel: monthKey.replace('2025-', "'25-").replace('2026-', "'26-"),
      actual,
      naive: testMatch ? testMatch.naive : null,
      movingAverage: testMatch ? testMatch.movingAverage : null,
      exponentialSmoothing: testMatch ? testMatch.exponentialSmoothing : null,
      isTest,
    };
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span>Forecast (statistical)</span>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
              Evaluated on synthetic data
            </span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Statistical benchmark comparing Naive, Moving Average, and Seasonal Exponential Smoothing on held-out test data
          </p>
        </div>

        {/* Product Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-neutral-500 shrink-0">
            Finished Good:
          </label>
          <select
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            className="p-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none"
          >
            {finishedProducts.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.sku} — {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mandatory Non-Negotiable Academic Disclaimer */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-300 space-y-1">
          <div className="font-bold">
            Academic Research Evaluation Notice
          </div>
          <p className="text-amber-800 dark:text-amber-400 leading-relaxed">
            <strong>Evaluated on synthetic data. Not evidence of real-world accuracy.</strong> This module illustrates statistical backtesting rigor: 9 months of synthetic sales history are used to fit baseline models, and the final 3 months are held out as an unseen test set to evaluate Mean Absolute Error (MAE) and Mean Absolute Percentage Error (MAPE).
          </p>
        </div>
      </div>

      {/* Model Verdict Cards (Acceptance Test 6: MAE/MAPE on held-out months & Best Method) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {forecastResults.evaluations.map((evalItem) => {
          return (
            <div
              key={evalItem.methodName}
              className={`p-5 rounded-2xl border transition-all relative ${
                evalItem.isBest
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 shadow-xs'
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              {evalItem.isBest && (
                <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white shadow-2xs">
                  <Award className="w-3 h-3" />
                  Better Method
                </div>
              )}

              <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                {evalItem.methodName}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-4 h-8 leading-relaxed">
                {evalItem.description}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-200/80 dark:border-neutral-750">
                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-400">
                    MAE (Holdout)
                  </div>
                  <div className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-0.5">
                    {evalItem.mae} <span className="text-xs font-normal text-neutral-400">{selectedProduct?.unit}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-400">
                    MAPE (Error %)
                  </div>
                  <div className={`text-lg font-bold font-mono mt-0.5 ${
                    evalItem.isBest ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-900 dark:text-neutral-100'
                  }`}>
                    {evalItem.mape}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Line Chart (12 Months History + 3 Month Hold-Out Forecasts) */}
      <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              12-Month Sales History &amp; Out-of-Sample Forecast Evaluation
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              First 9 months: Training history · Last 3 months: Held-out test evaluation against model projections
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineChartData}>
              <XAxis dataKey="monthLabel" stroke="#888888" fontSize={11} />
              <YAxis stroke="#888888" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: state.darkMode ? '#171717' : '#ffffff',
                  borderColor: state.darkMode ? '#262626' : '#e5e5e5',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {/* Vertical line marking train vs held-out window */}
              <ReferenceLine
                x={timelineChartData[testStartIndex]?.monthLabel}
                stroke="#6366f1"
                strokeDasharray="3 3"
                label={{
                  value: 'Held-Out Window (Test Set)',
                  position: 'insideTopLeft',
                  fill: '#6366f1',
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Historical Sales"
                stroke="#171717"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="naive"
                name="Naive Baseline (Last Period)"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="movingAverage"
                name="3-Month Moving Average"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="exponentialSmoothing"
                name="Exponential Smoothing + Seasonal Index"
                stroke="#059669"
                strokeWidth={2.5}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast vs Actual Detailed Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Held-Out Test Set: Forecast vs Actual Comparison Table
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Unit values across held-out evaluation months
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2.5 px-3">Held-Out Month</th>
                <th className="py-2.5 px-3 text-right">Actual Synthetic Sales</th>
                <th className="py-2.5 px-3 text-right">Naive Baseline</th>
                <th className="py-2.5 px-3 text-right">3-Month Moving Avg</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-800 dark:text-emerald-400">
                  Exp. Smoothing + Seasonality
                </th>
                <th className="py-2.5 px-3 text-center">Lowest Absolute Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {forecastResults.table.map((row) => {
                const errNaive = Math.abs(row.actual - row.naive);
                const errMA = Math.abs(row.actual - row.movingAverage);
                const errES = Math.abs(row.actual - row.exponentialSmoothing);

                const minErr = Math.min(errNaive, errMA, errES);
                const winner =
                  minErr === errES
                    ? 'Exp. Smoothing'
                    : minErr === errMA
                    ? 'Moving Avg'
                    : 'Naive';

                return (
                  <tr key={row.monthKey} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    <td className="py-2.5 px-3 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                      {row.monthKey}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                      {row.actual.toLocaleString()} {selectedProduct?.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                      {row.naive.toLocaleString()} ({errNaive > 0 ? `Δ${errNaive}` : '0'})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                      {row.movingAverage.toLocaleString()} ({errMA > 0 ? `Δ${errMA}` : '0'})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {row.exponentialSmoothing.toLocaleString()} ({errES > 0 ? `Δ${errES}` : '0'})
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
                        {winner} (Δ{minErr})
                      </span>
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
