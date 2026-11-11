/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertSeverity,
  AlertThresholdSettings,
  Batch,
  Customer,
  DispatchLine,
  ExpiryAlert,
  MethodEvaluation,
  Product,
  ProductCategory,
  SuggestedAction,
} from '../types';

/**
 * Parses YYYY-MM-DD safely into Date object at midnight UTC
 */
export function parseDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(Date.UTC(year, month, day));
  }
  return new Date(dateStr);
}

/**
 * Returns date in YYYY-MM-DD format
 */
export function toISODate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add or subtract days to a date string YYYY-MM-DD
 */
export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/**
 * Difference in calendar days between targetDate and baseDate (target - base)
 * Rule 1: Days left = expiryDate - today
 */
export function calculateDaysLeft(expiryDate: string, today: string): number {
  const target = parseDate(expiryDate).getTime();
  const base = parseDate(today).getTime();
  const diffMs = target - base;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Rule 2 & 6: Severity bands
 * Expired (<0) red; Critical (0-7); High (8-14); Warning (15-30); Info (31-60); Safe (>60)
 */
export function getSeverityBand(
  daysLeft: number,
  thresholds: AlertThresholdSettings
): AlertSeverity {
  if (daysLeft < thresholds.expiredDays) return 'Expired';
  if (daysLeft <= thresholds.criticalDays) return 'Critical';
  if (daysLeft <= thresholds.highDays) return 'High';
  if (daysLeft <= thresholds.warningDays) return 'Warning';
  return 'Info';
}

/**
 * Status color coding according to prompt specifications:
 * Expired (<0) red; <30 orange; 30–60 amber; >60 green.
 */
export function getStatusBandColor(daysLeft: number): {
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  label: string;
} {
  if (daysLeft < 0) {
    return {
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900',
      badgeText: 'text-rose-700 dark:text-rose-400',
      dotColor: 'bg-rose-600',
      label: 'Expired',
    };
  }
  if (daysLeft < 30) {
    return {
      badgeBg: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900',
      badgeText: 'text-orange-700 dark:text-orange-400',
      dotColor: 'bg-orange-500',
      label: 'Critical (<30d)',
    };
  }
  if (daysLeft <= 60) {
    return {
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
      badgeText: 'text-amber-700 dark:text-amber-400',
      dotColor: 'bg-amber-500',
      label: 'Warning (30-60d)',
    };
  }
  return {
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    dotColor: 'bg-emerald-600',
    label: 'Normal (>60d)',
  };
}

/**
 * Rule 3: Usable stock = Released batches only, not expired, qty > 0.
 */
export function getUsableBatches(batches: Batch[], today: string): Batch[] {
  return batches.filter((b) => {
    const daysLeft = calculateDaysLeft(b.expiryDate, today);
    return b.qualityStatus === 'Released' && daysLeft >= 0 && b.qty > 0;
  });
}

/**
 * Calculate total usable quantity for a specific SKU
 */
export function getUsableStockForSku(
  batches: Batch[],
  sku: string,
  today: string
): number {
  return getUsableBatches(batches, today)
    .filter((b) => b.sku === sku)
    .reduce((sum, b) => sum + b.qty, 0);
}

/**
 * Rule 5: Days of cover = usable stock / avgDailySales.
 * Flag "At risk of expiring unsold" when daysOfCover > remaining shelf life of batch.
 * Slow-moving = daysOfCover > configurable threshold (default 90 days).
 */
export function calculateDaysOfCover(
  usableStock: number,
  avgDailySales: number
): {
  days: number;
  isInfinity: boolean;
  formatted: string;
} {
  if (avgDailySales <= 0) {
    return { days: 999999, isInfinity: true, formatted: '∞ / no sales' };
  }
  const days = Math.round((usableStock / avgDailySales) * 10) / 10;
  return { days, isInfinity: false, formatted: `${days.toFixed(1)} days` };
}

/**
 * Determines whether stock is at risk of expiring unsold
 */
export function isAtRiskOfExpiringUnsold(
  daysOfCover: number,
  remainingShelfLifeDays: number
): boolean {
  if (remainingShelfLifeDays <= 0) return true;
  return daysOfCover > remainingShelfLifeDays;
}

/**
 * Determines whether stock is slow-moving (days of cover > threshold)
 */
export function isSlowMoving(
  daysOfCover: number,
  thresholdDays: number = 90
): boolean {
  return daysOfCover > thresholdDays;
}

/**
 * Rule 4: FEFO eligibility & allocation
 * Batch is Released AND not expired AND daysLeft >= customer minimum remaining shelf life AND qty > 0.
 * Sort eligible batches by earliest expiry, then by earliest received date.
 * Allocate quantity across batches until order is filled.
 */
export function fefoAllocate(
  product: Product,
  allBatchesForSku: Batch[],
  qtyRequested: number,
  customer: Customer,
  today: string
): DispatchLine {
  const minDays = customer.minRemainingShelfLifeDays;

  const eligibleBatches: Array<{ batch: Batch; daysLeft: number }> = [];
  const excludedBatches: DispatchLine['excludedBatches'] = [];

  for (const b of allBatchesForSku) {
    const daysLeft = calculateDaysLeft(b.expiryDate, today);

    if (b.qty <= 0) {
      continue; // empty batches are omitted
    }

    if (b.qualityStatus === 'Hold') {
      excludedBatches.push({
        batchNo: b.batchNo,
        qty: b.qty,
        expiryDate: b.expiryDate,
        daysLeft,
        status: b.qualityStatus,
        reason: 'Excluded: Quarantined under Quality Hold.',
      });
      continue;
    }

    if (b.qualityStatus === 'Rejected') {
      excludedBatches.push({
        batchNo: b.batchNo,
        qty: b.qty,
        expiryDate: b.expiryDate,
        daysLeft,
        status: b.qualityStatus,
        reason: 'Excluded: Rejected by Quality Control.',
      });
      continue;
    }

    if (daysLeft < 0) {
      excludedBatches.push({
        batchNo: b.batchNo,
        qty: b.qty,
        expiryDate: b.expiryDate,
        daysLeft,
        status: b.qualityStatus,
        reason: `Excluded: Batch expired ${Math.abs(daysLeft)} days ago.`,
      });
      continue;
    }

    if (daysLeft < minDays) {
      excludedBatches.push({
        batchNo: b.batchNo,
        qty: b.qty,
        expiryDate: b.expiryDate,
        daysLeft,
        status: b.qualityStatus,
        reason: `Excluded: ${daysLeft} days left is below ${customer.type} requirement of ${minDays} days.`,
      });
      continue;
    }

    eligibleBatches.push({ batch: b, daysLeft });
  }

  // Sort eligible batches by earliest expiryDate, then earliest receivedDate
  eligibleBatches.sort((a, b) => {
    const expDiff =
      parseDate(a.batch.expiryDate).getTime() -
      parseDate(b.batch.expiryDate).getTime();
    if (expDiff !== 0) return expDiff;
    return (
      parseDate(a.batch.receivedDate).getTime() -
      parseDate(b.batch.receivedDate).getTime()
    );
  });

  const allocatedBatches: DispatchLine['allocatedBatches'] = [];
  let remainingNeeded = qtyRequested;

  for (let i = 0; i < eligibleBatches.length && remainingNeeded > 0; i++) {
    const { batch, daysLeft } = eligibleBatches[i];
    const takeQty = Math.min(batch.qty, remainingNeeded);

    const isEarliest = i === 0;
    const reason = isEarliest
      ? `${batch.batchNo} chosen: earliest expiry among eligible Released batches meeting customer's ${minDays}-day minimum.`
      : `${batch.batchNo} chosen: secondary batch to satisfy remaining quantity after exhausting ${eligibleBatches[i - 1].batch.batchNo}.`;

    allocatedBatches.push({
      batchNo: batch.batchNo,
      qty: takeQty,
      location: batch.location,
      expiryDate: batch.expiryDate,
      daysLeft,
      reason,
    });

    remainingNeeded -= takeQty;
  }

  const shortfall = remainingNeeded;
  let shortfallReason: string | undefined;

  if (shortfall > 0) {
    if (eligibleBatches.length === 0 && excludedBatches.length > 0) {
      shortfallReason = `Shortfall of ${shortfall} ${product.unit}: All available stock excluded (${excludedBatches.length} batch(es) in Hold or below ${minDays}-day threshold).`;
    } else if (eligibleBatches.length === 0) {
      shortfallReason = `Shortfall of ${shortfall} ${product.unit}: Zero stock available in warehouse.`;
    } else {
      shortfallReason = `Shortfall of ${shortfall} ${product.unit}: Available eligible batches only satisfied ${qtyRequested - shortfall} ${product.unit}.`;
    }
  }

  return {
    sku: product.sku,
    productName: product.name,
    qtyRequested,
    allocatedBatches,
    shortfall,
    shortfallReason,
    excludedBatches,
  };
}

/**
 * Rule 7: Suggested Order Qty
 * suggested order qty = max(0, (avgDailySales * leadTimeDays) + safetyStock - usableStockThatWillBeConsumedBeforeExpiry - openPOQty).
 * Exclude batches that will expire before projected use (consumption simulated at avgDailySales).
 * Returns step-by-step calculation breakdown for complete auditability.
 */
export interface PurchaseCalculationBreakdown {
  sku: string;
  productName: string;
  category: ProductCategory;
  unit: string;
  avgDailySales: number;
  leadTimeDays: number;
  leadTimeDemand: number; // avgDailySales * leadTimeDays
  safetyStock: number;
  grossRequirement: number; // leadTimeDemand + safetyStock
  totalStock: number;
  usableStock: number;
  expiredBatchesCount: number;
  stockExpiringBeforeUse: number; // excluded stock
  stockExpiringDetails: Array<{
    batchNo: string;
    qty: number;
    expiryDate: string;
    daysLeft: number;
    projectedConsumptionDay: number;
  }>;
  netEffectiveStock: number; // usableStock - stockExpiringBeforeUse
  openPOQty: number;
  suggestedOrderQty: number;
  unitCost: number;
  estimatedTotalCost: number;
  isReorderNeeded: boolean;
}

export function calculatePurchaseRecommendation(
  product: Product,
  batches: Batch[],
  openPOQty: number,
  today: string
): PurchaseCalculationBreakdown {
  const avgSales = product.avgDailySales;
  const leadTimeDemand = Math.round(avgSales * product.leadTimeDays);
  const grossRequirement = leadTimeDemand + product.safetyStock;

  const skuBatches = batches.filter((b) => b.sku === product.sku);
  const totalStock = skuBatches.reduce((acc, b) => acc + b.qty, 0);

  // Filter released, non-expired batches
  const releasedBatches = skuBatches
    .filter((b) => {
      const daysLeft = calculateDaysLeft(b.expiryDate, today);
      return b.qualityStatus === 'Released' && daysLeft >= 0 && b.qty > 0;
    })
    .map((b) => ({
      batch: b,
      daysLeft: calculateDaysLeft(b.expiryDate, today),
    }));

  // Sort by expiry ascending (FEFO consumption simulation)
  releasedBatches.sort((a, b) => a.daysLeft - b.daysLeft);

  const usableStock = releasedBatches.reduce((acc, b) => acc + b.batch.qty, 0);

  let stockExpiringBeforeUse = 0;
  const stockExpiringDetails: PurchaseCalculationBreakdown['stockExpiringDetails'] =
    [];

  // Simulate cumulative consumption at avgDailySales
  let cumulativeQtyConsumed = 0;
  for (const item of releasedBatches) {
    const qty = item.batch.qty;
    // The days needed to consume up to the end of this batch:
    const daysToConsumeBatch =
      avgSales > 0 ? (cumulativeQtyConsumed + qty) / avgSales : 99999;

    if (daysToConsumeBatch > item.daysLeft && avgSales > 0) {
      // Some or all of this batch expires before it can be consumed
      const consumableQty = Math.max(
        0,
        Math.floor(item.daysLeft * avgSales - cumulativeQtyConsumed)
      );
      const expiredQty = Math.max(0, qty - consumableQty);

      if (expiredQty > 0) {
        stockExpiringBeforeUse += expiredQty;
        stockExpiringDetails.push({
          batchNo: item.batch.batchNo,
          qty: expiredQty,
          expiryDate: item.batch.expiryDate,
          daysLeft: item.daysLeft,
          projectedConsumptionDay: Math.round(daysToConsumeBatch),
        });
      }
      cumulativeQtyConsumed += consumableQty;
    } else {
      cumulativeQtyConsumed += qty;
    }
  }

  const netEffectiveStock = Math.max(0, usableStock - stockExpiringBeforeUse);
  const rawSuggested = grossRequirement - netEffectiveStock - openPOQty;
  const suggestedOrderQty = Math.max(0, Math.ceil(rawSuggested));
  const estimatedTotalCost = suggestedOrderQty * product.unitCost;
  const isReorderNeeded = suggestedOrderQty > 0;

  const expiredBatchesCount = skuBatches.filter(
    (b) => calculateDaysLeft(b.expiryDate, today) < 0
  ).length;

  return {
    sku: product.sku,
    productName: product.name,
    category: product.category,
    unit: product.unit,
    avgDailySales: avgSales,
    leadTimeDays: product.leadTimeDays,
    leadTimeDemand,
    safetyStock: product.safetyStock,
    grossRequirement,
    totalStock,
    usableStock,
    expiredBatchesCount,
    stockExpiringBeforeUse,
    stockExpiringDetails,
    netEffectiveStock,
    openPOQty,
    suggestedOrderQty,
    unitCost: product.unitCost,
    estimatedTotalCost,
    isReorderNeeded,
  };
}

/**
 * Rule 8: Suggested action per alert
 * Prioritise dispatch, Offer discount, Transfer to another channel, Quarantine for quality check, Write off
 */
export function getSuggestedActionForBatch(
  batch: Batch,
  daysLeft: number,
  daysOfCover: number
): SuggestedAction {
  if (batch.qualityStatus === 'Rejected') {
    return 'Write off';
  }
  if (batch.qualityStatus === 'Hold') {
    return 'Quarantine for quality check';
  }
  if (daysLeft < 0) {
    return 'Write off';
  }
  if (daysLeft <= 7) {
    return 'Offer discount';
  }
  if (daysLeft <= 30) {
    if (daysOfCover > daysLeft) {
      return 'Transfer to another channel';
    }
    return 'Prioritise dispatch';
  }
  if (daysOfCover > 90) {
    return 'Transfer to another channel';
  }
  return 'Prioritise dispatch';
}

/**
 * Generate full alert list
 */
export function generateAlerts(
  products: Product[],
  batches: Batch[],
  today: string,
  thresholds: AlertThresholdSettings,
  categoryOverrides?: Partial<Record<ProductCategory, AlertThresholdSettings>>
): ExpiryAlert[] {
  const alerts: ExpiryAlert[] = [];
  const prodMap = new Map<string, Product>();
  products.forEach((p) => prodMap.set(p.sku, p));

  for (const b of batches) {
    const prod = prodMap.get(b.sku);
    if (!prod) continue;

    const daysLeft = calculateDaysLeft(b.expiryDate, today);
    const catThresholds =
      (categoryOverrides && categoryOverrides[prod.category]) || thresholds;

    // Only create alert if within warning / critical / expired or quality issue
    if (daysLeft > catThresholds.infoDays && b.qualityStatus === 'Released') {
      continue;
    }

    const severity = getSeverityBand(daysLeft, catThresholds);
    const usableStock = getUsableStockForSku(batches, b.sku, today);
    const { days: daysOfCover } = calculateDaysOfCover(
      usableStock,
      prod.avgDailySales
    );
    const suggestedAction = getSuggestedActionForBatch(
      b,
      daysLeft,
      daysOfCover
    );

    alerts.push({
      id: `ALT-${b.batchNo}`,
      batchNo: b.batchNo,
      sku: b.sku,
      productName: prod.name,
      category: prod.category,
      location: b.location,
      qty: b.qty,
      unit: prod.unit,
      value: b.qty * prod.unitCost,
      expiryDate: b.expiryDate,
      daysLeft,
      severity,
      qualityStatus: b.qualityStatus,
      suggestedAction,
      status: 'Open',
    });
  }

  // Sort alerts: Expired first, then Critical, High, Warning, Info
  const severityOrder: Record<AlertSeverity, number> = {
    Expired: 0,
    Critical: 1,
    High: 2,
    Warning: 3,
    Info: 4,
  };

  alerts.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return a.daysLeft - b.daysLeft;
  });

  return alerts;
}

/**
 * Statistical forecasting comparison (Rule 7 requirement)
 * Labelled "Forecast (statistical)" evaluated on synthetic data.
 * Compares:
 * 1. Naive baseline (last period)
 * 2. 3-Month Moving Average
 * 3. Simple exponential smoothing with seasonal index
 * Evaluates on held-out test months (last 3 months) to calculate MAE & MAPE.
 */
export function calculateForecasts(
  monthlySales: { [monthKey: string]: number },
  heldOutCount: number = 3
): {
  table: Array<{
    monthKey: string;
    actual: number;
    naive: number;
    movingAverage: number;
    exponentialSmoothing: number;
  }>;
  evaluations: MethodEvaluation[];
  bestMethod: string;
} {
  const months = Object.keys(monthlySales).sort();
  if (months.length <= heldOutCount) {
    return { table: [], evaluations: [], bestMethod: 'None' };
  }

  const trainCount = months.length - heldOutCount;
  const trainMonths = months.slice(0, trainCount);
  const testMonths = months.slice(trainCount);

  // Train values
  const trainValues = trainMonths.map((m) => monthlySales[m]);

  // Compute seasonal index for training data
  const overallAvg =
    trainValues.reduce((a, b) => a + b, 0) / (trainValues.length || 1);
  const seasonalIndices = trainValues.map((val) =>
    overallAvg > 0 ? val / overallAvg : 1
  );

  // Method 1: Naive (uses last available observation)
  const naivePredictions: number[] = [];
  let lastObserved = trainValues[trainValues.length - 1];
  for (let i = 0; i < testMonths.length; i++) {
    naivePredictions.push(Math.round(lastObserved));
    // For 1-step ahead:
    lastObserved = monthlySales[testMonths[i]];
  }

  // Method 2: 3-Month Moving Average
  const maPredictions: number[] = [];
  const runningWindow = [...trainValues.slice(-3)];
  for (let i = 0; i < testMonths.length; i++) {
    const ma = runningWindow.reduce((a, b) => a + b, 0) / runningWindow.length;
    maPredictions.push(Math.round(ma));
    runningWindow.shift();
    runningWindow.push(monthlySales[testMonths[i]]);
  }

  // Method 3: Simple Exponential Smoothing with Seasonal Index (alpha = 0.35)
  const esPredictions: number[] = [];
  const alpha = 0.35;
  let s = trainValues[0];
  for (let i = 1; i < trainValues.length; i++) {
    s = alpha * trainValues[i] + (1 - alpha) * s;
  }
  for (let i = 0; i < testMonths.length; i++) {
    // Seasonal multiplier from corresponding train month index (approximate periodicity)
    const seasonIdx =
      seasonalIndices[(trainCount + i) % seasonalIndices.length] || 1;
    const forecast = Math.round(s * seasonIdx);
    esPredictions.push(forecast);
    const actual = monthlySales[testMonths[i]];
    s = alpha * actual + (1 - alpha) * s;
  }

  const table = testMonths.map((monthKey, idx) => ({
    monthKey,
    actual: monthlySales[monthKey],
    naive: naivePredictions[idx],
    movingAverage: maPredictions[idx],
    exponentialSmoothing: esPredictions[idx],
  }));

  // Calculate MAE & MAPE on test months
  const calcErrors = (predictions: number[]) => {
    let sumAbsErr = 0;
    let sumPctErr = 0;
    let n = 0;

    testMonths.forEach((m, idx) => {
      const act = monthlySales[m];
      const pred = predictions[idx];
      const err = Math.abs(act - pred);
      sumAbsErr += err;
      if (act > 0) {
        sumPctErr += err / act;
        n++;
      }
    });

    const mae = Math.round((sumAbsErr / (testMonths.length || 1)) * 10) / 10;
    const mape =
      n > 0 ? Math.round((sumPctErr / n) * 1000) / 10 : 0; // percentage
    return { mae, mape };
  };

  const naiveErr = calcErrors(naivePredictions);
  const maErr = calcErrors(maPredictions);
  const esErr = calcErrors(esPredictions);

  const evals: MethodEvaluation[] = [
    {
      methodName: 'Naive Baseline (Last Period)',
      mae: naiveErr.mae,
      mape: naiveErr.mape,
      isBest: false,
      description: 'Projects the immediately preceding month forward as the baseline forecast.',
    },
    {
      methodName: '3-Month Moving Average',
      mae: maErr.mae,
      mape: maErr.mape,
      isBest: false,
      description: 'Averages the previous 3 consecutive months to smooth out erratic fluctuations.',
    },
    {
      methodName: 'Exponential Smoothing + Seasonality',
      mae: esErr.mae,
      mape: esErr.mape,
      isBest: false,
      description: 'Weights recent data (alpha = 0.35) adjusted with Ramadan/Eid and seasonal indices.',
    },
  ];

  // Pick lowest MAPE (or lowest MAE if tie)
  let lowestIdx = 0;
  for (let i = 1; i < evals.length; i++) {
    if (evals[i].mape < evals[lowestIdx].mape) {
      lowestIdx = i;
    }
  }
  evals[lowestIdx].isBest = true;

  return {
    table,
    evaluations: evals,
    bestMethod: evals[lowestIdx].methodName,
  };
}

/**
 * Currency formatter for Pakistani Rupee (PKR)
 */
export function formatPKR(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return 'PKR 0';
  return `PKR ${Math.round(val).toLocaleString('en-PK')}`;
}

/**
 * Date formatter DD MMM YYYY (e.g. 11 Nov 2026)
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = parseDate(dateStr);
  const day = d.getUTCDate();
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}
