/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertSeverity,
  AlertThresholdSettings,
  ExpiryAlert,
  ProductCategory,
  SuggestedAction,
} from '../../types';
import {
  AlertTriangle,
  Sliders,
  CheckCircle2,
  Package,
  MapPin,
  Clock,
  Filter,
  UserCheck,
  Save,
  RotateCcw,
} from 'lucide-react';
import { formatPKR, formatDate } from '../../utils/rulesEngine';

export const ExpiryAlertsPage: React.FC = () => {
  const { state, alerts, updateAlertThresholds, showToast, setActivePage } =
    useApp();

  const [severityFilter, setSeverityFilter] = useState<string>(
    state.pageFilterParams?.filterSeverity || 'ALL'
  );
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Local alert states for Acknowledged / Resolved / AssignedTo
  const [alertStatusMap, setAlertStatusMap] = useState<
    Record<string, { status: 'Open' | 'Acknowledged' | 'Resolved'; assignedTo?: string }>
  >({});

  // Thresholds edit drawer / form
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [globalThresholds, setGlobalThresholds] =
    useState<AlertThresholdSettings>(state.alertThresholds);
  const [targetCatOverride, setTargetCatOverride] =
    useState<ProductCategory>('Sauces');
  const [catCriticalDays, setCatCriticalDays] = useState(10);
  const [catHighDays, setCatHighDays] = useState(20);
  const [catWarningDays, setCatWarningDays] = useState(45);
  const [catInfoDays, setCatInfoDays] = useState(75);

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

  const suggestedActions: SuggestedAction[] = [
    'Prioritise dispatch',
    'Offer discount',
    'Transfer to another channel',
    'Quarantine for quality check',
    'Write off',
    'Monitor',
  ];

  const handleAcknowledge = (id: string) => {
    setAlertStatusMap((prev) => ({
      ...prev,
      [id]: {
        status: 'Acknowledged',
        assignedTo: prev[id]?.assignedTo || `${state.role} Officer`,
      },
    }));
    showToast('success', 'Alert Acknowledged', 'Status marked as acknowledged and logged to user.');
  };

  const handleResolve = (id: string) => {
    setAlertStatusMap((prev) => ({
      ...prev,
      [id]: {
        status: 'Resolved',
        assignedTo: prev[id]?.assignedTo || `${state.role} Officer`,
      },
    }));
    showToast('info', 'Alert Resolved', 'Batch marked as resolved.');
  };

  const handleAssign = (id: string, assignedTo: string) => {
    setAlertStatusMap((prev) => ({
      ...prev,
      [id]: {
        status: prev[id]?.status || 'Open',
        assignedTo,
      },
    }));
    showToast('info', 'Assigned', `Alert assigned to ${assignedTo}.`);
  };

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedOverrides = {
      ...state.categoryThresholdOverrides,
      [targetCatOverride]: {
        expiredDays: 0,
        criticalDays: catCriticalDays,
        highDays: catHighDays,
        warningDays: catWarningDays,
        infoDays: catInfoDays,
      },
    };

    updateAlertThresholds(globalThresholds, updatedOverrides);
    setThresholdModalOpen(false);
  };

  // Filtered alerts
  const filteredAlerts = alerts.filter((a) => {
    const localState = alertStatusMap[a.id] || { status: a.status };

    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (actionFilter !== 'ALL' && a.suggestedAction !== actionFilter) return false;
    if (selectedCategory !== 'ALL' && a.category !== selectedCategory) return false;
    if (statusFilter !== 'ALL' && localState.status !== statusFilter) return false;

    return true;
  });

  // Group by severity
  const groupedAlerts: Record<AlertSeverity, ExpiryAlert[]> = {
    Expired: [],
    Critical: [],
    High: [],
    Warning: [],
    Info: [],
  };

  filteredAlerts.forEach((a) => {
    groupedAlerts[a.severity].push(a);
  });

  const severityOrder: AlertSeverity[] = [
    'Expired',
    'Critical',
    'High',
    'Warning',
    'Info',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span>Expiry Alerts &amp; Interventions</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-mono">
              {alerts.length} Total
            </span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Rule-based severity classification with category-specific horizon overrides
          </p>
        </div>

        <button
          onClick={() => setThresholdModalOpen(true)}
          className="px-3.5 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 border border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Sliders className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span>Configure Thresholds</span>
        </button>
      </div>

      {/* Threshold Parameters Summary Bar */}
      <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <div className="text-neutral-700 dark:text-neutral-300">
            <strong>Active Global Horizons:</strong> Critical &le; {state.alertThresholds.criticalDays}d · High &le; {state.alertThresholds.highDays}d · Warning &le; {state.alertThresholds.warningDays}d · Info &le; {state.alertThresholds.infoDays}d
          </div>
        </div>
        <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">
          Category overrides active for: <strong>Sauces (Critical: 10d, Warning: 45d)</strong>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Severity filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Severity Band
          </label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-neutral-100"
          >
            <option value="ALL">All Severities</option>
            <option value="Expired">Expired (&lt;0 days)</option>
            <option value="Critical">Critical (0–7 days)</option>
            <option value="High">High (8–14 days)</option>
            <option value="Warning">Warning (15–30 days)</option>
            <option value="Info">Info (31–60 days)</option>
          </select>
        </div>

        {/* Suggested Action Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Suggested Action
          </label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-neutral-100"
          >
            <option value="ALL">All Actions</option>
            {suggestedActions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Product Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-neutral-100"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Resolution Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-neutral-100"
          >
            <option value="ALL">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Grouped Alert Cards List */}
      <div className="space-y-6">
        {severityOrder.map((sev) => {
          const group = groupedAlerts[sev];
          if (group.length === 0) return null;

          const sevColor =
            sev === 'Expired'
              ? 'border-rose-400 text-rose-700 dark:text-rose-400'
              : sev === 'Critical'
              ? 'border-orange-400 text-orange-700 dark:text-orange-400'
              : sev === 'High'
              ? 'border-amber-400 text-amber-700 dark:text-amber-400'
              : 'border-neutral-300 text-neutral-700 dark:text-neutral-300';

          return (
            <div key={sev} className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    sev === 'Expired' ? 'bg-rose-600' :
                    sev === 'Critical' ? 'bg-orange-500' :
                    sev === 'High' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <span className={sevColor}>{sev} Horizon</span>
                  <span className="text-xs text-neutral-400 font-mono">
                    ({group.length} batches)
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.map((alert) => {
                  const local = alertStatusMap[alert.id] || {
                    status: alert.status,
                    assignedTo: alert.assignedTo,
                  };

                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-xl border bg-white dark:bg-neutral-900 shadow-2xs space-y-3 transition-all ${
                        local.status === 'Resolved'
                          ? 'opacity-60 border-neutral-200 dark:border-neutral-800'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                              {alert.productName}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-neutral-500 flex items-center gap-2 mt-0.5">
                            <span>Batch: <strong>{alert.batchNo}</strong></span>
                            <span>·</span>
                            <span>SKU: {alert.sku}</span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            alert.daysLeft < 0
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : alert.daysLeft <= 7
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {alert.daysLeft < 0
                            ? `Expired (${alert.daysLeft}d)`
                            : `${alert.daysLeft}d left`}
                        </span>
                      </div>

                      {/* Stock & Location Metadata */}
                      <div className="grid grid-cols-3 gap-2 p-2 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg text-[11px]">
                        <div>
                          <span className="text-neutral-400">Location:</span>
                          <div className="font-mono font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-neutral-400" />
                            {alert.location}
                          </div>
                        </div>
                        <div>
                          <span className="text-neutral-400">Quantity:</span>
                          <div className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                            {alert.qty} {alert.unit}
                          </div>
                        </div>
                        <div>
                          <span className="text-neutral-400">Valuation:</span>
                          <div className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                            {formatPKR(alert.value)}
                          </div>
                        </div>
                      </div>

                      {/* Suggested Action Bar */}
                      <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="text-amber-900 dark:text-amber-300 font-medium text-[11px]">
                            Recommended Action: <strong>{alert.suggestedAction}</strong>
                          </span>
                        </div>

                        {alert.suggestedAction === 'Prioritise dispatch' && (
                          <button
                            onClick={() => setActivePage('fefo')}
                            className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-[10px] font-semibold transition-colors"
                          >
                            Open FEFO
                          </button>
                        )}
                      </div>

                      {/* Actions & Assignment */}
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                          <UserCheck className="w-3.5 h-3.5" />
                          <select
                            value={local.assignedTo || ''}
                            onChange={(e) => handleAssign(alert.id, e.target.value)}
                            className="bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 text-[11px] text-neutral-700 dark:text-neutral-300"
                          >
                            <option value="">Unassigned</option>
                            <option value="Warehouse Floor">Warehouse Floor</option>
                            <option value="Commercial Sales Desk">Commercial Sales Desk</option>
                            <option value="QA Laboratory">QA Laboratory</option>
                            <option value="Finance Audit">Finance Audit</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          {local.status === 'Open' && (
                            <button
                              onClick={() => handleAcknowledge(alert.id)}
                              className="px-2.5 py-1 text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded transition-colors"
                            >
                              Acknowledge
                            </button>
                          )}
                          {local.status !== 'Resolved' && (
                            <button
                              onClick={() => handleResolve(alert.id)}
                              className="px-2.5 py-1 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 rounded transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                          {local.status === 'Resolved' && (
                            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Resolved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Threshold Configuration Modal */}
      {thresholdModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setThresholdModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Configure Expiry Thresholds
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Update plant-wide default alert horizons and per-category overrides
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveThresholds} className="space-y-4 text-xs">
              {/* Global Defaults */}
              <div className="space-y-3">
                <div className="font-bold text-neutral-900 dark:text-neutral-100">
                  Global Alert Horizons (Days Left)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">
                      Critical Threshold (days):
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={globalThresholds.criticalDays}
                      onChange={(e) =>
                        setGlobalThresholds({
                          ...globalThresholds,
                          criticalDays: parseInt(e.target.value, 10) || 7,
                        })
                      }
                      className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">
                      High Threshold (days):
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={globalThresholds.highDays}
                      onChange={(e) =>
                        setGlobalThresholds({
                          ...globalThresholds,
                          highDays: parseInt(e.target.value, 10) || 14,
                        })
                      }
                      className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">
                      Warning Threshold (days):
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={globalThresholds.warningDays}
                      onChange={(e) =>
                        setGlobalThresholds({
                          ...globalThresholds,
                          warningDays: parseInt(e.target.value, 10) || 30,
                        })
                      }
                      className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">
                      Info Threshold (days):
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={globalThresholds.infoDays}
                      onChange={(e) =>
                        setGlobalThresholds({
                          ...globalThresholds,
                          infoDays: parseInt(e.target.value, 10) || 60,
                        })
                      }
                      className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Per-Category Overrides */}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="font-bold text-neutral-900 dark:text-neutral-100">
                  Category-Specific Override
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-500 mb-1">
                    Select Category to Override:
                  </label>
                  <select
                    value={targetCatOverride}
                    onChange={(e) => setTargetCatOverride(e.target.value as ProductCategory)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">
                      Category Critical (days):
                    </label>
                    <input
                      type="number"
                      value={catCriticalDays}
                      onChange={(e) => setCatCriticalDays(parseInt(e.target.value, 10) || 10)}
                      className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">
                      Category Warning (days):
                    </label>
                    <input
                      type="number"
                      value={catWarningDays}
                      onChange={(e) => setCatWarningDays(parseInt(e.target.value, 10) || 45)}
                      className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setThresholdModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Save &amp; Recalculate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
