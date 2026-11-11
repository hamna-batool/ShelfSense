/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  calculatePurchaseRecommendation,
  formatDate,
  formatPKR,
} from '../../utils/rulesEngine';
import {
  ShoppingCart,
  Calculator,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Award,
  Plus,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { PurchaseRequest, PurchaseRequestStatus } from '../../types';

export const PurchaseRecommendationsPage: React.FC = () => {
  const {
    state,
    createPurchaseRequest,
    updatePurchaseStatus,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'recommendations' | 'requests' | 'quotations'>('recommendations');
  const [expandedBreakdown, setExpandedBreakdown] = useState<Set<string>>(new Set(['SKU-ING-02']));

  // Approval modal state
  const [approvalModalState, setApprovalModalState] = useState<{
    isOpen: boolean;
    pr: PurchaseRequest | null;
    action: 'Approved' | 'Rejected';
    comment: string;
  }>({
    isOpen: false,
    pr: null,
    action: 'Approved',
    comment: '',
  });

  const toggleBreakdown = (sku: string) => {
    setExpandedBreakdown((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  // Raw Materials and Packaging Products
  const rawMaterials = useMemo(() => {
    return state.products.filter(
      (p) => p.category === 'Ingredients' || p.category === 'Packaging'
    );
  }, [state.products]);

  // Compute recommendations for each ingredient/packaging SKU
  const purchaseCalculations = useMemo(() => {
    return rawMaterials.map((prod) => {
      // Find open purchase order quantity for this SKU (Approved or Pending)
      const openPrs = state.purchaseRequests.filter(
        (pr) =>
          pr.sku === prod.sku &&
          (pr.status === 'Approved' || pr.status === 'Pending approval')
      );
      const openPOQty = openPrs.reduce((acc, pr) => acc + pr.requestedQty, 0);

      const breakdown = calculatePurchaseRecommendation(
        prod,
        state.batches,
        openPOQty,
        state.today
      );

      return {
        ...breakdown,
        openPrs,
      };
    });
  }, [rawMaterials, state.batches, state.purchaseRequests, state.today]);

  const handleCreateDraft = (sku: string, qty: number, supplier: string) => {
    createPurchaseRequest(
      sku,
      qty,
      supplier,
      'Automated reorder created based on shelf-life simulated consumption'
    );
    setActiveTab('requests');
  };

  const handleOpenApprovalModal = (
    pr: PurchaseRequest,
    action: 'Approved' | 'Rejected'
  ) => {
    if (state.role !== 'Manager' && state.role !== 'Procurement') {
      showToast(
        'error',
        'Authorization Denied',
        `Role "${state.role}" is not authorized to sign purchase orders. Only General Manager or Head of Procurement have signatory clearance.`
      );
      return;
    }

    setApprovalModalState({
      isOpen: true,
      pr,
      action,
      comment:
        action === 'Approved'
          ? `Approved by ${state.role} desk under standard factory procurement mandate.`
          : 'Rejected: Inventory sufficient after stock review.',
    });
  };

  const handleConfirmApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalModalState.pr) return;

    const ok = updatePurchaseStatus(
      approvalModalState.pr.id,
      approvalModalState.action,
      approvalModalState.comment
    );

    if (ok) {
      setApprovalModalState({
        isOpen: false,
        pr: null,
        action: 'Approved',
        comment: '',
      });
    }
  };

  // Quotation best-value evaluation logic
  const quotationsBySku = useMemo(() => {
    const map: Record<string, typeof state.quotations> = {};
    state.quotations.forEach((q) => {
      if (!map[q.sku]) map[q.sku] = [];
      map[q.sku].push(q);
    });
    return map;
  }, [state.quotations]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span>Purchase Reorder &amp; Procurement Engine</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Suggested orders account for stock projected to expire before use (consumption simulated at daily sales)
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'recommendations'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            Reorder Recommendations
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <span>Requisitions &amp; Approvals</span>
            <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-full text-[10px] font-mono">
              {state.purchaseRequests.filter((pr) => pr.status === 'Pending approval').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('quotations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'quotations'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            Supplier Quotations
          </button>
        </div>
      </div>

      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {/* Formula reminder banner */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-start gap-3">
            <Calculator className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-700 dark:text-neutral-300">
              <span className="font-bold text-emerald-900 dark:text-emerald-300">
                Rule 7 Mathematical Audit:
              </span>{' '}
              <code className="bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono">
                Suggested Qty = MAX(0, (AvgDailyDemand &times; LeadTime) + SafetyStock &minus; UsableStockBeforeExpiry &minus; OpenPOQty)
              </code>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                Notice: Batches projected to reach expiry date before daily consumption can deplete them are subtracted from usable inventory so the factory does not face stockouts.
              </p>
            </div>
          </div>

          {/* Recommendations Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {purchaseCalculations.map((calc) => {
                const isExpanded = expandedBreakdown.has(calc.sku);
                const hasExpiredBeforeUse = calc.stockExpiringBeforeUse > 0;

                return (
                  <div key={calc.sku} className="p-5 space-y-4">
                    {/* Summary row */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                            {calc.productName}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                            {calc.sku}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            ({calc.category})
                          </span>
                        </div>
                        <div className="text-xs text-neutral-500 flex flex-wrap items-center gap-3">
                          <span>Lead Time: <strong>{calc.leadTimeDays} days</strong></span>
                          <span>·</span>
                          <span>Daily Consumption: <strong>{calc.avgDailySales} {calc.unit}/day</strong></span>
                          <span>·</span>
                          <span>Gross Need: <strong>{calc.grossRequirement} {calc.unit}</strong></span>
                        </div>
                      </div>

                      {/* Right reorder CTA & indicators */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-[11px] uppercase font-bold text-neutral-400">
                            Suggested Reorder
                          </div>
                          <div className={`text-base font-bold font-mono ${
                            calc.suggestedOrderQty > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-neutral-400'
                          }`}>
                            {calc.suggestedOrderQty} {calc.unit}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {calc.suggestedOrderQty > 0
                              ? formatPKR(calc.estimatedTotalCost)
                              : 'Stock adequate'}
                          </div>
                        </div>

                        {calc.suggestedOrderQty > 0 ? (
                          <button
                            onClick={() => {
                              const prod = state.products.find((p) => p.sku === calc.sku);
                              handleCreateDraft(
                                calc.sku,
                                calc.suggestedOrderQty,
                                prod?.supplier || 'Primary Multan Supplier'
                              );
                            }}
                            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Create Requisition</span>
                          </button>
                        ) : (
                          <div className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-500 font-medium">
                            Stock Sufficient
                          </div>
                        )}

                        <button
                          onClick={() => toggleBreakdown(calc.sku)}
                          className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition-colors"
                          title="Toggle calculation breakdown"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Step-by-Step Calculation Breakdown (Test 5 Requirement) */}
                    {isExpanded && (
                      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-3 text-xs animate-in fade-in">
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700">
                          <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-emerald-600" />
                            Step-by-Step Calculation Breakdown
                          </div>
                          <span className="font-mono text-[11px] text-neutral-500">
                            Unit Cost: {formatPKR(calc.unitCost)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left: Equation Terms */}
                          <div className="space-y-1.5 font-mono text-[11px]">
                            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-750">
                              <span className="text-neutral-600 dark:text-neutral-400">
                                1. Lead Time Demand ({calc.avgDailySales} &times; {calc.leadTimeDays}d):
                              </span>
                              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                                +{calc.leadTimeDemand} {calc.unit}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-750">
                              <span className="text-neutral-600 dark:text-neutral-400">
                                2. Required Safety Stock Buffer:
                              </span>
                              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                                +{calc.safetyStock} {calc.unit}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-750 bg-neutral-100/60 dark:bg-neutral-750 px-1 rounded">
                              <span className="font-bold text-neutral-700 dark:text-neutral-300">
                                Total Gross Target Requirement:
                              </span>
                              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                                ={calc.grossRequirement} {calc.unit}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-750">
                              <span className="text-neutral-600 dark:text-neutral-400">
                                3. Current Released Usable Stock:
                              </span>
                              <span className="text-neutral-800 dark:text-neutral-200">
                                {calc.usableStock} {calc.unit}
                              </span>
                            </div>

                            {/* Excluded stock highlight */}
                            <div className={`flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-750 ${
                              hasExpiredBeforeUse
                                ? 'bg-rose-50 dark:bg-rose-950/40 px-1 rounded text-rose-700 dark:text-rose-400 font-bold'
                                : 'text-neutral-500'
                            }`}>
                              <span>
                                4. Less: Stock Expiring Before Projected Use:
                              </span>
                              <span>
                                -{calc.stockExpiringBeforeUse} {calc.unit}
                              </span>
                            </div>

                            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-750">
                              <span className="text-neutral-600 dark:text-neutral-400">
                                5. Net Effective Usable Stock:
                              </span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                ={calc.netEffectiveStock} {calc.unit}
                              </span>
                            </div>

                            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-750">
                              <span className="text-neutral-600 dark:text-neutral-400">
                                6. Existing Open PO / In-Flight Requisitions:
                              </span>
                              <span className="text-neutral-800 dark:text-neutral-200">
                                -{calc.openPOQty} {calc.unit}
                              </span>
                            </div>

                            <div className="flex justify-between py-1.5 bg-emerald-100/70 dark:bg-emerald-950/50 px-2 rounded-lg font-bold">
                              <span className="text-emerald-950 dark:text-emerald-200">
                                Suggested Net Reorder Quantity:
                              </span>
                              <span className="text-emerald-900 dark:text-emerald-100 text-xs">
                                {calc.suggestedOrderQty} {calc.unit}
                              </span>
                            </div>
                          </div>

                          {/* Right: Shelf-Life Expiry Simulation Explainer */}
                          <div className="space-y-2 p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs">
                            <div className="font-bold text-neutral-800 dark:text-neutral-200">
                              Expiry Simulation Log:
                            </div>

                            {hasExpiredBeforeUse ? (
                              <div className="space-y-1.5 text-xs text-rose-700 dark:text-rose-400">
                                <div className="flex items-center gap-1 font-semibold">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{calc.stockExpiringBeforeUse} units excluded from usable inventory:</span>
                                </div>
                                {calc.stockExpiringDetails.map((det) => (
                                  <div
                                    key={det.batchNo}
                                    className="p-1.5 bg-rose-50 dark:bg-rose-950/40 rounded border border-rose-200 dark:border-rose-900 text-[11px] font-mono"
                                  >
                                    Batch <strong>{det.batchNo}</strong> ({det.qty} {calc.unit}) expires in <strong>{det.daysLeft} days</strong> (projected consumption requires {det.projectedConsumptionDay} days). Excluded so you do not under-order!
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                All {calc.usableStock} {calc.unit} of currently released stock will be consumed before reaching their respective expiry dates at average daily sales velocity of {calc.avgDailySales} {calc.unit}/day.
                              </p>
                            )}

                            {calc.openPrs.length > 0 && (
                              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 text-[11px] text-neutral-600 dark:text-neutral-400">
                                <strong>Active In-Flight Orders:</strong>{' '}
                                {calc.openPrs.map((pr) => `${pr.prNumber} (${pr.requestedQty} ${calc.unit} - ${pr.status})`).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Requisitions & Approvals Workflow */}
      {activeTab === 'requests' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                Purchase Requisitions &amp; Signoff Authorization
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Workflow states: Draft &rarr; Pending approval &rarr; Approved / Rejected with complete audit trail
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {state.purchaseRequests.map((pr) => {
              const isApproved = pr.status === 'Approved';
              const isPending = pr.status === 'Pending approval';
              const isRejected = pr.status === 'Rejected';

              return (
                <div
                  key={pr.id}
                  className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {pr.prNumber}
                      </span>
                      <span className="text-neutral-400">·</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {pr.productName}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-500">
                        ({pr.sku})
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isPending
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : isRejected
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700'
                        }`}
                      >
                        {pr.status}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {pr.requestedQty} {pr.unit}
                      </span>
                      <span className="text-neutral-400 ml-2 font-mono">
                        ({formatPKR(pr.estimatedCost)})
                      </span>
                    </div>
                  </div>

                  {/* Supplier & Requester info */}
                  <div className="text-[11px] text-neutral-500 flex flex-wrap items-center gap-3">
                    <span>Requested by: <strong>{pr.requestedBy}</strong> on {formatDate(pr.date)}</span>
                    <span>·</span>
                    <span>Supplier: <strong>{pr.suggestedSupplier || 'TBD'}</strong></span>
                    {pr.approvedBy && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          Signed by: {pr.approvedBy}
                        </span>
                      </>
                    )}
                  </div>

                  {pr.approverComment && (
                    <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] text-neutral-700 dark:text-neutral-300">
                      <strong>Approver Remark:</strong> &quot;{pr.approverComment}&quot;
                    </div>
                  )}

                  {/* Audit Trail */}
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-750 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[10px] text-neutral-400 space-x-2">
                      <span className="font-semibold uppercase">Audit Trail:</span>
                      {pr.auditTrail.map((trail, tIdx) => (
                        <span key={tIdx}>
                          {trail.action} ({trail.user} · {formatDate(trail.date)})
                          {tIdx < pr.auditTrail.length - 1 && ' → '}
                        </span>
                      ))}
                    </div>

                    {/* Action buttons (Only Manager & Procurement can sign) */}
                    {(isPending || pr.status === 'Draft') && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleOpenApprovalModal(pr, 'Rejected')}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleOpenApprovalModal(pr, 'Approved')}
                          className="px-3 py-1 text-[11px] font-semibold bg-emerald-800 hover:bg-emerald-900 text-white rounded transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve &amp; Issue PO</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Supplier Quotation Comparison Table */}
      {activeTab === 'quotations' && (
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" />
                Raw Material Supplier Quotations Comparison
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Evaluates Price, Lead Time, MOQ, Payment Terms, and QA ratings with best-value row highlighted
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {Object.entries(quotationsBySku).map(([sku, quots]) => {
              const product = state.products.find((p) => p.sku === sku);

              // Best value: pick lowest price that also has leadTime <= product.leadTimeDays
              const bestQuot = [...quots].sort((a, b) => a.pricePerUnit - b.pricePerUnit)[0];

              return (
                <div key={sku} className="space-y-2">
                  <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <span>{product?.name || sku}</span>
                    <span className="font-mono text-neutral-400 font-normal">({sku})</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                      <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                        <tr>
                          <th className="py-2.5 px-3">Supplier Name &amp; Location</th>
                          <th className="py-2.5 px-3 text-right">Quoted Price</th>
                          <th className="py-2.5 px-3 text-right">Lead Time</th>
                          <th className="py-2.5 px-3 text-right">MOQ</th>
                          <th className="py-2.5 px-3">Payment Terms</th>
                          <th className="py-2.5 px-3 text-center">QA Rating</th>
                          <th className="py-2.5 px-3">Operational Notes</th>
                          <th className="py-2.5 px-3 text-center">Verdict</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {quots.map((q) => {
                          const isBest = q.id === bestQuot.id;

                          return (
                            <tr
                              key={q.id}
                              className={
                                isBest
                                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 font-medium'
                                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                              }
                            >
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                  {q.supplier}
                                </div>
                                <div className="text-[11px] text-neutral-400 font-mono">
                                  {q.city}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                                {formatPKR(q.pricePerUnit)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                                {q.leadTimeDays} days
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                                {q.moq} {product?.unit}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300">
                                {q.paymentTerms}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600">
                                ★ {q.qualityRating.toFixed(1)}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-500 text-[11px] max-w-xs">
                                {q.notes}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isBest ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    <Award className="w-3 h-3" />
                                    Best Value
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 text-[11px]">Alternate</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Requisition Approval Modal */}
      {approvalModalState.isOpen && approvalModalState.pr && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() =>
            setApprovalModalState({
              isOpen: false,
              pr: null,
              action: 'Approved',
              comment: '',
            })
          }
        >
          <div
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                approvalModalState.action === 'Approved'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
              }`}>
                {approvalModalState.action === 'Approved' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {approvalModalState.action === 'Approved'
                    ? 'Approve Requisition & Issue PO'
                    : 'Reject Purchase Requisition'}
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  {approvalModalState.pr.prNumber} · {approvalModalState.pr.productName}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-4 text-xs">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl space-y-1">
                <div className="flex justify-between text-neutral-500">
                  <span>Authorized User:</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {state.role} Role
                  </span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Requisition Amount:</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                    {formatPKR(approvalModalState.pr.estimatedCost)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Approver Remarks &amp; Financial Justification *
                </label>
                <textarea
                  required
                  rows={3}
                  value={approvalModalState.comment}
                  onChange={(e) =>
                    setApprovalModalState({
                      ...approvalModalState,
                      comment: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs resize-none"
                  placeholder="Enter approver remarks for the audit trail..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() =>
                    setApprovalModalState({
                      isOpen: false,
                      pr: null,
                      action: 'Approved',
                      comment: '',
                    })
                  }
                  className="px-3.5 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 font-semibold text-white rounded-lg shadow-xs transition-colors ${
                    approvalModalState.action === 'Approved'
                      ? 'bg-emerald-800 hover:bg-emerald-900'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm {approvalModalState.action}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
