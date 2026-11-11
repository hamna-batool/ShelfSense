/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Customer,
  DispatchLine,
  DispatchOrder,
  Product,
} from '../../types';
import {
  fefoAllocate,
  formatDate,
  formatPKR,
  calculateDaysLeft,
} from '../../utils/rulesEngine';
import {
  Truck,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

export const FefoDispatchPage: React.FC = () => {
  const { state, confirmDispatch, showToast } = useApp();

  // Selected customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    state.customers[0]?.id || ''
  );

  // Order lines state: Array of { sku: string; qty: number }
  const [orderItems, setOrderItems] = useState<
    Array<{ sku: string; qty: number }>
  >([
    { sku: 'SKU-BIS-01', qty: 90 }, // Demonstrates multi-batch allocation (B-101 has 60, B-102 has 120)
    { sku: 'SKU-SAU-01', qty: 40 },
  ]);

  // Selected batch overrides: Map<lineSku, { batchNo: string; reason: string }>
  const [overrides, setOverrides] = useState<
    Record<string, { batchNo: string; reason: string }>
  >({});

  // Active tab: 'dispatch' or 'override_log'
  const [activeTab, setActiveTab] = useState<'dispatch' | 'override_log'>('dispatch');

  // Expanded excluded panels: Set<sku>
  const [expandedExcluded, setExpandedExcluded] = useState<Set<string>>(new Set());

  const selectedCustomer: Customer | undefined = state.customers.find(
    (c) => c.id === selectedCustomerId
  );

  const toggleExcluded = (sku: string) => {
    setExpandedExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  // Compute FEFO allocation for each line
  const dispatchLines: DispatchLine[] = useMemo(() => {
    if (!selectedCustomer) return [];

    return orderItems.map((item) => {
      const product = state.products.find((p) => p.sku === item.sku);
      if (!product) {
        return {
          sku: item.sku,
          productName: item.sku,
          qtyRequested: item.qty,
          allocatedBatches: [],
          shortfall: item.qty,
          shortfallReason: 'Product not found',
          excludedBatches: [],
        };
      }

      const allBatchesForSku = state.batches.filter((b) => b.sku === item.sku);
      const standardLine = fefoAllocate(
        product,
        allBatchesForSku,
        item.qty,
        selectedCustomer,
        state.today
      );

      // Check if user specified an override for this SKU
      const override = overrides[item.sku];
      if (override && override.batchNo) {
        const targetBatch = allBatchesForSku.find(
          (b) => b.batchNo === override.batchNo
        );
        if (targetBatch) {
          const daysLeft = calculateDaysLeft(targetBatch.expiryDate, state.today);
          // Replace allocation with override batch
          const allocatedQty = Math.min(targetBatch.qty, item.qty);
          const shortfall = Math.max(0, item.qty - allocatedQty);

          return {
            ...standardLine,
            allocatedBatches: [
              {
                batchNo: targetBatch.batchNo,
                qty: allocatedQty,
                location: targetBatch.location,
                expiryDate: targetBatch.expiryDate,
                daysLeft,
                reason: `Manual Override: Picked ${targetBatch.batchNo} instead of automated FEFO recommendation.`,
                isOverridden: true,
                overrideReason: override.reason,
              },
            ],
            shortfall,
            shortfallReason:
              shortfall > 0
                ? `Shortfall of ${shortfall} ${product.unit}: Selected override batch only has ${allocatedQty} units available.`
                : undefined,
          };
        }
      }

      return standardLine;
    });
  }, [orderItems, selectedCustomer, state.products, state.batches, state.today, overrides]);

  const handleAddItem = () => {
    const availableProducts = state.products.filter(
      (p) => !orderItems.some((oi) => oi.sku === p.sku)
    );
    if (availableProducts.length > 0) {
      setOrderItems([...orderItems, { sku: availableProducts[0].sku, qty: 50 }]);
    } else {
      showToast('info', 'All Products Added', 'All catalogue SKUs are currently in the order builder.');
    }
  };

  const handleRemoveItem = (index: number) => {
    const removedSku = orderItems[index].sku;
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
    // Clear any override on removed sku
    const newOverrides = { ...overrides };
    delete newOverrides[removedSku];
    setOverrides(newOverrides);
  };

  const handleUpdateItem = (index: number, sku: string, qty: number) => {
    const updated = [...orderItems];
    updated[index] = { sku, qty: Math.max(1, qty) };
    setOrderItems(updated);
  };

  const handleSetOverride = (sku: string, batchNo: string, reason: string) => {
    setOverrides((prev) => ({
      ...prev,
      [sku]: { batchNo, reason },
    }));
  };

  const handleClearOverride = (sku: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[sku];
      return next;
    });
  };

  // Validate dispatch confirmation
  const handleConfirmDispatch = () => {
    if (!selectedCustomer) return;
    if (orderItems.length === 0) {
      showToast('warning', 'Empty Order', 'Please add at least one line item to dispatch.');
      return;
    }

    // Check if any override is missing a reason (Test 4 Requirement)
    for (const [sku, ovr] of Object.entries(overrides)) {
      if (ovr.batchNo && (!ovr.reason || ovr.reason.trim().length < 5)) {
        showToast(
          'error',
          'Override Reason Required',
          `An explicit operational reason (minimum 5 characters) is required for manually overriding FEFO on SKU ${sku}.`
        );
        return;
      }
    }

    // Check if any stock allocated
    const totalAllocated = dispatchLines.reduce(
      (sum, l) => sum + l.allocatedBatches.reduce((s, ab) => s + ab.qty, 0),
      0
    );

    if (totalAllocated === 0) {
      showToast(
        'error',
        'Zero Allocation',
        'Cannot dispatch an order with zero allocated quantity across all line items.'
      );
      return;
    }

    // Total value
    let totalValue = 0;
    dispatchLines.forEach((l) => {
      const prod = state.products.find((p) => p.sku === l.sku);
      const lineCost = (prod?.unitPrice || 0) * l.allocatedBatches.reduce((acc, b) => acc + b.qty, 0);
      totalValue += lineCost;
    });

    const newOrder: DispatchOrder = {
      id: `ORD-${Date.now()}`,
      orderNumber: `DSP-${Math.floor(8820 + state.orders.length + 1)}`,
      date: state.today,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerType: selectedCustomer.type,
      minShelfLifeDays: selectedCustomer.minRemainingShelfLifeDays,
      lines: dispatchLines,
      status: 'Dispatched',
      totalValue,
      dispatchedBy: `${state.role} Lead`,
    };

    const ok = confirmDispatch(newOrder);
    if (ok) {
      // Reset builder
      setOrderItems([{ sku: 'SKU-BIS-01', qty: 50 }]);
      setOverrides({});
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span>FEFO Dispatch Desk</span>
            <span className="text-xs px-2 py-0.5 font-normal rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
              Contract Enforced
            </span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Automated First-Expired, First-Out allocation with customer minimum shelf-life contract gates
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'dispatch'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            Dispatch Builder
          </button>
          <button
            onClick={() => setActiveTab('override_log')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'override_log'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <span>Override Audit Log</span>
            <span className="px-1.5 py-0.2 bg-neutral-200 dark:bg-neutral-600 rounded-full text-[10px] font-mono">
              {state.overrideLogs.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'override_log' ? (
        /* Override Log View */
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                FEFO Manual Override Audit Trail
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Every deviation from automated FEFO recommendation requires an operational justification
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-semibold bg-neutral-50 dark:bg-neutral-800/40">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Order Ref</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Standard FEFO</th>
                  <th className="py-2.5 px-3">Chosen Batch</th>
                  <th className="py-2.5 px-3">Authorizing User</th>
                  <th className="py-2.5 px-3">Mandatory Operational Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {state.overrideLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-400">
                      No FEFO overrides logged. Full automated compliance observed.
                    </td>
                  </tr>
                ) : (
                  state.overrideLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="py-2.5 px-3 font-mono text-neutral-500">
                        {log.date}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-800 dark:text-neutral-200">
                        {log.orderNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-neutral-600 dark:text-neutral-400">
                        {log.sku}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-neutral-500">
                        {log.defaultBatchNo}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                        {log.chosenBatchNo}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300">
                        {log.userName}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-300 italic max-w-xs">
                        &quot;{log.reason}&quot;
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Dispatch Builder View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Customer Selector & Order Items (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Step 1: Customer Selection */}
            <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
              <label className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                1. Select Destination Customer
              </label>

              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setOverrides({}); // reset overrides on customer change
                }}
                className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {state.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type} · {c.city})
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Contract Channel:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedCustomer.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Minimum Remaining Shelf Life:</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                      {selectedCustomer.minRemainingShelfLifeDays} days
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 pt-1 leading-relaxed">
                    {selectedCustomer.type === 'Retail chain' && (
                      <span className="text-amber-700 dark:text-amber-400">
                        Modern trade strict policy: batches with &lt;60 days remaining will be rejected at bay.
                      </span>
                    )}
                    {selectedCustomer.type === 'Export' && (
                      <span className="text-sky-700 dark:text-sky-400">
                        Export transit buffer: requires &ge;120 days shelf life for border clearance.
                      </span>
                    )}
                    {selectedCustomer.type === 'Wholesaler' && (
                      <span className="text-neutral-600 dark:text-neutral-400">
                        Local wholesale trade: accepts high-velocity goods with &ge;30 days shelf life.
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Step 2: Line Items */}
            <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  2. Order Lines ({orderItems.length})
                </label>
                <button
                  onClick={handleAddItem}
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </button>
              </div>

              <div className="space-y-3">
                {orderItems.map((item, idx) => {
                  const product = state.products.find((p) => p.sku === item.sku);

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/60 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-neutral-400 font-mono">
                          Line #{idx + 1}
                        </span>
                        {orderItems.length > 1 && (
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                            title="Remove line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <select
                            value={item.sku}
                            onChange={(e) =>
                              handleUpdateItem(idx, e.target.value, item.qty)
                            }
                            className="w-full p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 font-semibold text-xs"
                          >
                            {state.products.map((p) => (
                              <option key={p.sku} value={p.sku}>
                                {p.sku} — {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-neutral-500 shrink-0">
                            Quantity ({product?.unit || 'carton'}):
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              handleUpdateItem(
                                idx,
                                item.sku,
                                parseInt(e.target.value, 10) || 1
                              )
                            }
                            className="w-24 p-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100 text-right"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: FEFO Pick List & Excluded Batches (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    Generated FEFO Pick List
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Warehouse picking schedule with plain-English eligibility audit
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOverrides({})}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
                    title="Reset all manual overrides to pure FEFO"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Line items pick list */}
              <div className="space-y-4">
                {dispatchLines.map((line) => {
                  const product = state.products.find((p) => p.sku === line.sku);
                  const isExcludedOpen = expandedExcluded.has(line.sku);
                  const allBatchesForSku = state.batches.filter((b) => b.sku === line.sku);
                  const currentOverride = overrides[line.sku];

                  return (
                    <div
                      key={line.sku}
                      className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-850/40 space-y-3"
                    >
                      {/* Line header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-neutral-100 text-xs flex items-center gap-2">
                            <span>{line.productName}</span>
                            <span className="font-mono text-neutral-400 text-[11px]">
                              ({line.sku})
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            Order Demand: <strong>{line.qtyRequested}</strong> {product?.unit}
                          </div>
                        </div>

                        {/* Shortfall Badge */}
                        {line.shortfall > 0 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                            Shortfall: {line.shortfall} {product?.unit}
                          </span>
                        )}
                      </div>

                      {/* Allocated Batches (Picks) */}
                      {line.allocatedBatches.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                            Recommended Picks:
                          </div>

                          {line.allocatedBatches.map((ab, pickIdx) => (
                            <div
                              key={ab.batchNo}
                              className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                                ab.isOverridden
                                  ? 'bg-amber-50/70 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800'
                                  : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                                    {ab.batchNo}
                                  </span>
                                  <span className="flex items-center gap-1 font-mono text-neutral-500 text-[11px]">
                                    <MapPin className="w-3 h-3 text-neutral-400" />
                                    {ab.location}
                                  </span>
                                  {ab.isOverridden && (
                                    <span className="px-1.5 py-0.2 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded text-[10px] font-bold">
                                      Manual Override
                                    </span>
                                  )}
                                </div>

                                <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                                  Pick {ab.qty} {product?.unit}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-mono">
                                <span>Expiry: {formatDate(ab.expiryDate)}</span>
                                <span>·</span>
                                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                                  {ab.daysLeft} days remaining
                                </span>
                              </div>

                              {/* Plain-English Reason per Pick */}
                              <div className="text-[11px] text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-750 p-2 rounded-md border border-neutral-150 dark:border-neutral-700">
                                <strong>Logic:</strong> {ab.reason}
                              </div>

                              {ab.isOverridden && ab.overrideReason && (
                                <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 p-2 rounded-md">
                                  <strong>Logged Reason:</strong> &quot;{ab.overrideReason}&quot;
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-400">
                          {line.shortfallReason || 'No eligible batches available in warehouse.'}
                        </div>
                      )}

                      {/* Manual Override Control Accordion */}
                      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-750">
                        {currentOverride ? (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-amber-700 dark:text-amber-400 font-medium">
                              Override active on this line (Batch {currentOverride.batchNo})
                            </span>
                            <button
                              onClick={() => handleClearOverride(line.sku)}
                              className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                            >
                              Revert to FEFO
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs">
                            <details className="group">
                              <summary className="cursor-pointer text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1 select-none">
                                <span>Staff Override: Choose alternate batch</span>
                                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                              </summary>
                              <div className="mt-2 p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-2">
                                <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-2 rounded">
                                  <strong>Warning:</strong> Selecting an alternate batch skips an earlier-expiring batch. An operational audit reason is strictly required.
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-bold text-neutral-500 mb-0.5">
                                      Select Alternate Batch:
                                    </label>
                                    <select
                                      id={`override-batch-${line.sku}`}
                                      className="w-full p-1.5 bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-xs font-mono"
                                    >
                                      {allBatchesForSku.map((b) => (
                                        <option key={b.batchNo} value={b.batchNo}>
                                          {b.batchNo} ({b.qty} {product?.unit} · Exp: {b.expiryDate} · {b.qualityStatus})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-neutral-500 mb-0.5">
                                      Required Operational Reason:
                                    </label>
                                    <input
                                      type="text"
                                      id={`override-reason-${line.sku}`}
                                      placeholder="e.g. Pallet physically blocked by machinery..."
                                      className="w-full p-1.5 bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-xs"
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-end pt-1">
                                  <button
                                    onClick={() => {
                                      const bSelect = document.getElementById(
                                        `override-batch-${line.sku}`
                                      ) as HTMLSelectElement;
                                      const rInput = document.getElementById(
                                        `override-reason-${line.sku}`
                                      ) as HTMLInputElement;

                                      if (!rInput.value || rInput.value.trim().length < 5) {
                                        showToast(
                                          'error',
                                          'Reason Required',
                                          'An override without an explicit reason cannot be confirmed.'
                                        );
                                        return;
                                      }

                                      handleSetOverride(
                                        line.sku,
                                        bSelect.value,
                                        rInput.value.trim()
                                      );
                                    }}
                                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold transition-colors"
                                  >
                                    Apply Override
                                  </button>
                                </div>
                              </div>
                            </details>
                          </div>
                        )}
                      </div>

                      {/* Collapsible Excluded Batches Panel */}
                      {line.excludedBatches.length > 0 && (
                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-750">
                          <button
                            onClick={() => toggleExcluded(line.sku)}
                            className="w-full flex items-center justify-between text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 select-none"
                          >
                            <span className="flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span>
                                {line.excludedBatches.length} batch(es) excluded for this customer
                              </span>
                            </span>
                            {isExcludedOpen ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {isExcludedOpen && (
                            <div className="mt-2 space-y-1.5 animate-in fade-in">
                              {line.excludedBatches.map((ex) => (
                                <div
                                  key={ex.batchNo}
                                  className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1 border border-neutral-200 dark:border-neutral-700"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                                      {ex.batchNo}
                                    </span>
                                    <span className="text-neutral-500">
                                      ({ex.qty} {product?.unit})
                                    </span>
                                    <span className="font-mono text-neutral-400">
                                      Exp: {formatDate(ex.expiryDate)}
                                    </span>
                                  </div>
                                  <div className="text-rose-700 dark:text-rose-400 font-medium">
                                    {ex.reason}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Confirm Dispatch CTA */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Ready to Execute Dispatch?
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Stock will be immediately deducted from warehouse inventory balances.
                  </div>
                </div>

                <button
                  onClick={handleConfirmDispatch}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Dispatch &amp; Deduct Stock</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
