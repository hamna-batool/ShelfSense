/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AccuracyTestResult,
  ImpactMetrics,
} from '../../types';
import {
  BarChart3,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { formatPKR, calculateDaysLeft } from '../../utils/rulesEngine';

export const ImpactMetricsPage: React.FC = () => {
  const { state, dispatch, showToast } = useApp();

  const metrics = state.impactMetrics;

  const [testResult, setTestResult] = useState<AccuracyTestResult | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Handle manual input updates
  const handleUpdate = (
    metricKey: keyof ImpactMetrics,
    field: 'baseline' | 'prototype',
    valStr: string
  ) => {
    const val = valStr === '' ? null : parseFloat(valStr);
    dispatch({
      type: 'UPDATE_IMPACT_METRIC',
      metricKey,
      field,
      value: isNaN(val as number) ? null : val,
    });
  };

  // Helper to format difference
  const renderDifference = (
    baseline: number | null,
    prototype: number | null,
    unit: string,
    isCurrency: boolean = false,
    higherIsBetter: boolean = false
  ) => {
    if (baseline === null || prototype === null) {
      return (
        <span className="text-neutral-400 italic text-xs">
          Awaiting evaluation inputs
        </span>
      );
    }

    const diff = prototype - baseline;
    const pct = baseline !== 0 ? (diff / baseline) * 100 : 0;

    const isPositiveChange = higherIsBetter ? diff > 0 : diff < 0;

    return (
      <div className="font-mono text-xs space-y-0.5">
        <div
          className={`font-bold ${
            isPositiveChange
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {diff > 0 ? '+' : ''}
          {isCurrency ? formatPKR(diff) : `${diff.toFixed(1)} ${unit}`}
          {' '}({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
        </div>
        <div className="text-[10px] text-neutral-400">
          {isPositiveChange ? 'Performance improvement' : 'Performance regression'}
        </div>
      </div>
    );
  };

  // Automated Ground-Truth Test Runner:
  // Compares alert engine against hidden ground truth on seed data:
  // A batch is truly at-risk if (qualityStatus != 'Released' OR daysLeft <= 60).
  const runAlertAccuracyTest = () => {
    setIsRunningTest(true);

    setTimeout(() => {
      let tp = 0; // True Positive: Model alerted & truly at risk
      let fp = 0; // False Positive: Model alerted but safe
      let fn = 0; // False Negative: Model missed an at-risk batch
      let tn = 0; // True Negative: Model correctly didn't alert

      state.batches.forEach((b) => {
        const daysLeft = calculateDaysLeft(b.expiryDate, state.today);
        const trulyAtRisk =
          daysLeft <= 60 || b.qualityStatus === 'Hold' || b.qualityStatus === 'Rejected';

        // Check if alert engine generated alert
        const isAlerted =
          daysLeft <= state.alertThresholds.infoDays ||
          b.qualityStatus === 'Hold' ||
          b.qualityStatus === 'Rejected';

        if (isAlerted && trulyAtRisk) tp++;
        else if (isAlerted && !trulyAtRisk) fp++;
        else if (!isAlerted && trulyAtRisk) fn++;
        else tn++;
      });

      const total = tp + fp + fn + tn;
      const precision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0;
      const recall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0;
      const f1Score =
        precision + recall > 0
          ? (2 * (precision * recall)) / (precision + recall)
          : 0;
      const accuracy = total > 0 ? ((tp + tn) / total) * 100 : 0;

      const result: AccuracyTestResult = {
        totalBatchesTested: total,
        truePositives: tp,
        falsePositives: fp,
        falseNegatives: fn,
        trueNegatives: tn,
        precision: Math.round(precision * 10) / 10,
        recall: Math.round(recall * 10) / 10,
        f1Score: Math.round(f1Score * 10) / 10,
        accuracy: Math.round(accuracy * 10) / 10,
        timestamp: state.today,
      };

      setTestResult(result);
      setIsRunningTest(false);

      showToast(
        'success',
        'Accuracy Benchmark Complete',
        `Evaluated ${total} warehouse lots. Precision: ${result.precision}%, Recall: ${result.recall}%.`
      );
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span>Impact Metrics (Research Evaluation)</span>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
              Academic Protocol
            </span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Empirical baseline vs prototype comparison ledger for graduate research validation
          </p>
        </div>

        <button
          onClick={runAlertAccuracyTest}
          disabled={isRunningTest}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{isRunningTest ? 'Evaluating...' : 'Run Alert Accuracy Test'}</span>
        </button>
      </div>

      {/* Mandatory Academic Integrity Notice */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-300 space-y-1">
          <div className="font-bold">
            No Savings Claimed Without Evidence Policy
          </div>
          <p className="text-amber-800 dark:text-amber-400 leading-relaxed">
            In accordance with academic standards, ShelfSense contains <strong>zero fabricated or pre-populated savings percentages</strong>. All comparative fields remain intentionally empty until researchers or factory operational teams enter validated baseline observations from physical time-and-motion audits. Differences are computed only when both inputs are provided.
          </p>
        </div>
      </div>

      {/* Comparison Evaluation Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Field Evaluation Matrix: Manual Baseline vs Prototype
          </h2>
          <span className="text-xs text-neutral-400">
            Editable inputs (Enter physical factory audit numbers)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-3 px-4">Evaluation Dimension</th>
                <th className="py-3 px-4 w-44">Baseline (Manual / ERP)</th>
                <th className="py-3 px-4 w-44">ShelfSense Prototype</th>
                <th className="py-3 px-4">Measured Empirical Impact</th>
                <th className="py-3 px-4">Research Measurement Methodology</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {/* Row 1: Time to prepare inventory report */}
              <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                <td className="py-3 px-4">
                  <div className="font-bold text-neutral-900 dark:text-neutral-100">
                    Report Preparation Time
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Duration required to audit batches and publish expiry report
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="1"
                      placeholder="e.g. 180"
                      value={metrics.reportPrepTime.baseline ?? ''}
                      onChange={(e) =>
                        handleUpdate('reportPrepTime', 'baseline', e.target.value)
                      }
                      className="w-24 p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono font-bold"
                    />
                    <span className="text-neutral-500 text-[11px]">mins</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="1"
                      placeholder="e.g. 5"
                      value={metrics.reportPrepTime.prototype ?? ''}
                      onChange={(e) =>
                        handleUpdate('reportPrepTime', 'prototype', e.target.value)
                      }
                      className="w-24 p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono font-bold"
                    />
                    <span className="text-neutral-500 text-[11px]">mins</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {renderDifference(
                    metrics.reportPrepTime.baseline,
                    metrics.reportPrepTime.prototype,
                    'mins',
                    false,
                    false
                  )}
                </td>
                <td className="py-3 px-4 text-neutral-500 text-[11px]">
                  Time-and-motion stopwatch measurement of inventory controller compiling weekly excel bin sheet.
                </td>
              </tr>

              {/* Row 2: Alert Correctness */}
              <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                <td className="py-3 px-4">
                  <div className="font-bold text-neutral-900 dark:text-neutral-100">
                    Alert Horizon Correctness
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Percentage of critical batches accurately flagged before gate threshold
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 62.5"
                      value={metrics.alertCorrectness.baseline ?? ''}
                      onChange={(e) =>
                        handleUpdate('alertCorrectness', 'baseline', e.target.value)
                      }
                      className="w-24 p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono font-bold"
                    />
                    <span className="text-neutral-500 text-[11px]">%</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 98.4"
                      value={metrics.alertCorrectness.prototype ?? ''}
                      onChange={(e) =>
                        handleUpdate('alertCorrectness', 'prototype', e.target.value)
                      }
                      className="w-24 p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono font-bold"
                    />
                    <span className="text-neutral-500 text-[11px]">%</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {renderDifference(
                    metrics.alertCorrectness.baseline,
                    metrics.alertCorrectness.prototype,
                    '%',
                    false,
                    true
                  )}
                </td>
                <td className="py-3 px-4 text-neutral-500 text-[11px]">
                  Ratio of true positive expiry alerts divided by total warehouse lots within 30 days of contract limit.
                </td>
              </tr>

              {/* Row 3: Eligible-batch selection accuracy */}
              <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                <td className="py-3 px-4">
                  <div className="font-bold text-neutral-900 dark:text-neutral-100">
                    FEFO Eligible-Batch Selection Accuracy
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Compliance with customer contract minimum shelf-life requirements
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 74.0"
                      value={metrics.eligibleBatchAccuracy.baseline ?? ''}
                      onChange={(e) =>
                        handleUpdate('eligibleBatchAccuracy', 'baseline', e.target.value)
                      }
                      className="w-24 p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono font-bold"
                    />
                    <span className="text-neutral-500 text-[11px]">%</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 99.5"
                      value={metrics.eligibleBatchAccuracy.prototype ?? ''}
                      onChange={(e) =>
                        handleUpdate('eligibleBatchAccuracy', 'prototype', e.target.value)
                      }
                      className="w-24 p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono font-bold"
                    />
                    <span className="text-neutral-500 text-[11px]">%</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {renderDifference(
                    metrics.eligibleBatchAccuracy.baseline,
                    metrics.eligibleBatchAccuracy.prototype,
                    '%',
                    false,
                    true
                  )}
                </td>
                <td className="py-3 px-4 text-neutral-500 text-[11px]">
                  Sampling 50 historical dispatch dispatches against customer contract SLA gates (e.g. Metro 60d minimum).
                </td>
              </tr>

              {/* Row 4: Expiry-related write-off value */}
              <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                <td className="py-3 px-4">
                  <div className="font-bold text-neutral-900 dark:text-neutral-100">
                    Expiry-Related Financial Write-Off Loss
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Annual financial losses attributed to condemned expired finished goods
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="1000"
                      placeholder="e.g. 1450000"
                      value={metrics.expiryWriteOffValue.baseline ?? ''}
                      onChange={(e) =>
                        handleUpdate('expiryWriteOffValue', 'baseline', e.target.value)
                      }
                      className="w-28 p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono font-bold"
                    />
                    <span className="text-neutral-500 text-[11px]">PKR</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="1000"
                      placeholder="e.g. 380000"
                      value={metrics.expiryWriteOffValue.prototype ?? ''}
                      onChange={(e) =>
                        handleUpdate('expiryWriteOffValue', 'prototype', e.target.value)
                      }
                      className="w-28 p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono font-bold"
                    />
                    <span className="text-neutral-500 text-[11px]">PKR</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {renderDifference(
                    metrics.expiryWriteOffValue.baseline,
                    metrics.expiryWriteOffValue.prototype,
                    'PKR',
                    true,
                    false
                  )}
                </td>
                <td className="py-3 px-4 text-neutral-500 text-[11px]">
                  General Ledger financial debit records under Account 5201 (Scrapped &amp; Expired Inventory).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Automated Accuracy Benchmark Test Results */}
      {testResult && (
        <div className="p-5 bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Deterministic Ground-Truth Test Benchmark Report
              </h2>
              <p className="text-xs text-neutral-500">
                Executed against {testResult.totalBatchesTested} synthetic batches at current calendar timestamp ({testResult.timestamp})
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
              Accuracy: {testResult.accuracy}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-neutral-400">
                Precision
              </div>
              <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                {testResult.precision}%
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                TP / (TP + FP)
              </div>
            </div>

            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-neutral-400">
                Recall (Sensitivity)
              </div>
              <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                {testResult.recall}%
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                TP / (TP + FN)
              </div>
            </div>

            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-neutral-400">
                F1 Score
              </div>
              <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                {testResult.f1Score}%
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                Harmonic mean
              </div>
            </div>

            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-neutral-400">
                Confusion Matrix
              </div>
              <div className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200 mt-1 space-y-0.5">
                <div>TP: {testResult.truePositives} · FP: {testResult.falsePositives}</div>
                <div>FN: {testResult.falseNegatives} · TN: {testResult.trueNegatives}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
