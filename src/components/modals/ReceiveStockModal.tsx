/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Batch, QualityStatus } from '../../types';
import { X, Plus, AlertCircle } from 'lucide-react';
import { addDays, parseDate } from '../../utils/rulesEngine';

interface ReceiveStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiveStockModal: React.FC<ReceiveStockModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { state, addBatch, showToast } = useApp();

  const [sku, setSku] = useState(state.products[0]?.sku || '');
  const [batchNo, setBatchNo] = useState(`B-${Date.now().toString().slice(-4)}`);
  const [qty, setQty] = useState(100);
  const [location, setLocation] = useState('WH1-A-01');
  const [mfgDate, setMfgDate] = useState(addDays(state.today, -10));
  const [expiryDate, setExpiryDate] = useState(addDays(state.today, 180));
  const [qualityStatus, setQualityStatus] = useState<QualityStatus>('Released');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedProduct = state.products.find((p) => p.sku === sku);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations:
    if (!sku) {
      setError('Please select a product SKU.');
      return;
    }

    if (!batchNo.trim()) {
      setError('Please enter a batch number.');
      return;
    }

    // Unique batch number check
    const existing = state.batches.find(
      (b) => b.batchNo.toLowerCase() === batchNo.trim().toLowerCase()
    );
    if (existing) {
      setError(`Batch number "${batchNo}" already exists in the system. Batches must be globally unique.`);
      return;
    }

    if (qty <= 0) {
      setError('Quantity received must be strictly greater than 0.');
      return;
    }

    const mfgTime = parseDate(mfgDate).getTime();
    const expTime = parseDate(expiryDate).getTime();

    if (expTime <= mfgTime) {
      setError('Expiry date must occur strictly after the date of manufacture.');
      return;
    }

    // Shelf life sanity check
    if (selectedProduct) {
      const actualShelfDays = Math.round((expTime - mfgTime) / (1000 * 60 * 60 * 24));
      if (actualShelfDays > selectedProduct.shelfLifeDays * 1.5) {
        showToast(
          'warning',
          'Shelf Life Anomaly',
          `Selected shelf life (${actualShelfDays} days) is significantly higher than standard product master shelf life (${selectedProduct.shelfLifeDays} days). Logged with QA note.`
        );
      }
    }

    const newBatch: Batch = {
      batchNo: batchNo.trim(),
      sku,
      qty,
      location: location.trim(),
      mfgDate,
      expiryDate,
      receivedDate: state.today,
      qualityStatus,
      note: note.trim() || undefined,
      initialQty: qty,
    };

    const success = addBatch(newBatch);
    if (success) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Receive Stock / Add Batch
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Log newly produced or received pallet inventory to Multan warehouse
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Product SKU */}
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Select Product SKU *
            </label>
            <select
              value={sku}
              onChange={(e) => {
                const newSku = e.target.value;
                setSku(newSku);
                const p = state.products.find((prod) => prod.sku === newSku);
                if (p) {
                  setExpiryDate(addDays(mfgDate, p.shelfLifeDays));
                }
              }}
              className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {state.products.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.sku} — {p.name} ({p.category})
                </option>
              ))}
            </select>
          </div>

          {/* Batch Number & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Batch Number *
              </label>
              <input
                type="text"
                required
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="e.g. B-125"
                className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Warehouse Location *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. WH1-A-04"
                className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
              />
            </div>
          </div>

          {/* Qty & Quality Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Received Quantity ({selectedProduct ? selectedProduct.unit : 'unit'}) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
                className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Initial Quality Status
              </label>
              <select
                value={qualityStatus}
                onChange={(e) => setQualityStatus(e.target.value as QualityStatus)}
                className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              >
                <option value="Released">Released (Available for FEFO)</option>
                <option value="Hold">Hold (Pending QA lab clearance)</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Manufacturing & Expiry Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Manufacture Date *
              </label>
              <input
                type="date"
                required
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Internal Receiving Notes / Pallet ID
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Received from production line 2; pallet seal intact."
              className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
