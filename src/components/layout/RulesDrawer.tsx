/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  BookOpen,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const RulesDrawer: React.FC = () => {
  const { state, dispatch } = useApp();

  if (!state.rulesDrawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={() => dispatch({ type: 'SET_RULES_DRAWER', open: false })}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 h-full shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                How Rules Work
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Explicit mathematical definitions and deterministic business logic
              </p>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_RULES_DRAWER', open: false })}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition-colors"
            aria-label="Close rules drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm text-neutral-700 dark:text-neutral-300">
          {/* Academic Notice */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl">
            <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300">
              <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              Academic Integrity & Explicit Rule Policy
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-400 mt-1 leading-relaxed">
              All inventory allocations, expiry severity classifications, days-of-cover calculations, and purchase recommendations are evaluated through deterministic algorithms. They are <strong>never</strong> labeled as &quot;AI&quot;. Only statistical time-series forecasting uses heuristic projection models.
            </p>
          </div>

          {/* Rule 1 & 2: Days Left & Color Severity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
              <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              1 & 2. Days Left & Expiry Status Classification
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-lg font-mono text-xs text-neutral-800 dark:text-neutral-200">
              Days Left = calendarDays(batch.expiryDate - systemToday)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30">
                <div className="font-bold text-rose-700 dark:text-rose-400">Expired</div>
                <div className="text-neutral-600 dark:text-neutral-400 mt-0.5">&lt; 0 days</div>
              </div>
              <div className="p-2.5 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
                <div className="font-bold text-orange-700 dark:text-orange-400">Critical</div>
                <div className="text-neutral-600 dark:text-neutral-400 mt-0.5">0 – 30 days</div>
              </div>
              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                <div className="font-bold text-amber-700 dark:text-amber-400">Warning</div>
                <div className="text-neutral-600 dark:text-neutral-400 mt-0.5">31 – 60 days</div>
              </div>
              <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="font-bold text-emerald-700 dark:text-emerald-400">Normal</div>
                <div className="text-neutral-600 dark:text-neutral-400 mt-0.5">&gt; 60 days</div>
              </div>
            </div>
          </div>

          {/* Rule 3: Usable Stock */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              3. Usable Stock Definition
            </div>
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Stock is strictly defined as <strong>Usable</strong> only when all three conditions are satisfied:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
              <li>Quality Status is exactly <span className="font-semibold text-emerald-700 dark:text-emerald-400">Released</span> (batches on &apos;Hold&apos; or &apos;Rejected&apos; are excluded).</li>
              <li>Batch has not expired (<span className="font-semibold">Days Left &ge; 0</span>).</li>
              <li>Quantity in batch &gt; 0.</li>
            </ul>
          </div>

          {/* Rule 4: FEFO Dispatch */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
              <RotateCcw className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              4. FEFO (First-Expired, First-Out) Dispatch Logic
            </div>
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              When an order line is submitted, the algorithm filters all batches for that SKU and tests each against customer contract requirements:
            </p>
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-lg text-xs space-y-1.5 font-mono text-neutral-800 dark:text-neutral-200">
              <div>Eligible = Released AND notExpired AND (DaysLeft &ge; customer.minDays) AND (qty &gt; 0)</div>
              <div>Sort = ORDER BY expiryDate ASC, receivedDate ASC</div>
              <div>Allocate = GREEDY fill until qtyRequested is satisfied</div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Customer contract minimum shelf life thresholds enforced in Multan:
              <br />· <strong>Retail Chain (Metro, Imtiaz):</strong> 60 days minimum.
              <br />· <strong>Distributor (Chenab, South Punjab):</strong> 45 days minimum.
              <br />· <strong>Wholesaler (Ghalla Mandi):</strong> 30 days minimum.
              <br />· <strong>Export (Kabul, GCC):</strong> 120 days minimum.
            </p>
          </div>

          {/* Rule 5: Days of Cover */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
              <Calculator className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              5. Days of Cover &amp; Expiry Risk Horizon
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-lg font-mono text-xs text-neutral-800 dark:text-neutral-200">
              Days of Cover = UsableStock &divide; AvgDailySales
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              · <strong>At risk of expiring unsold:</strong> Triggered whenever <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded font-mono">Days of Cover &gt; Remaining Shelf Life</code> of the earliest batch.
              <br />· <strong>Slow-moving:</strong> Flagged when <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded font-mono">Days of Cover &gt; Configurable Threshold</code> (Default: 90 days).
            </p>
          </div>

          {/* Rule 7: Suggested Order Quantity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
              <AlertTriangle className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              7. Purchase Reorder Formula &amp; Excluded Stock
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-lg text-xs font-mono space-y-1 text-neutral-800 dark:text-neutral-200">
              <div>Suggested Order Qty = MAX(0, (AvgDailySales &times; LeadTimeDays) + SafetyStock - UsableStockBeforeExpiry - OpenPOQty)</div>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              <strong>Key innovation:</strong> Unlike standard static ERP MRP, ShelfSense simulates day-by-day consumption at <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded font-mono">AvgDailySales</code>. Any batch projected to reach its expiry date before daily consumption can deplete it is subtracted from usable stock so you do not under-order!
            </p>
          </div>

          {/* Suggested Actions per Alert */}
          <div className="space-y-2">
            <div className="font-bold text-neutral-900 dark:text-neutral-100">
              8. Suggested Interventions
            </div>
            <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <div>· <strong>Prioritise dispatch:</strong> Route batch to nearest wholesaler with relaxed shelf life.</div>
              <div>· <strong>Offer discount:</strong> 15-25% promo rebate to clear high-velocity items.</div>
              <div>· <strong>Transfer channel:</strong> Reallocate from modern retail chains to traditional general trade.</div>
              <div>· <strong>Quarantine:</strong> Lab micro-testing for borderline QA batches.</div>
              <div>· <strong>Write off:</strong> Formally condemn condemned or expired goods with finance approval.</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 flex justify-end">
          <button
            onClick={() => dispatch({ type: 'SET_RULES_DRAWER', open: false })}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
