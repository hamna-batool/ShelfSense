/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Batch, WriteOffReason } from '../../types';
import { X, AlertTriangle } from 'lucide-react';
import { formatPKR } from '../../utils/rulesEngine';

interface NewWriteOffModalProps {
  batch: Batch | null;
  isOpen: boolean;
  onClose: () => void;
}

export const NewWriteOffModal: React.FC<NewWriteOffModalProps> = ({
  batch,
  isOpen,
  onClose,
}) => {
  const { state, logWriteOff } = useApp();

  const [qty, setQty] = useState(batch?.qty || 1);
  const [reason, setReason] = useState<WriteOffReason>('Expired');
  const [notes, setNotes] = useState('');

  if (!isOpen || !batch) return null;

  const product = state.products.find((p) => p.sku === batch.sku);
  const unitCost = product ? product.unitCost : 0;
  const unit = product ? product.unit : 'unit';
  const totalWriteOffCost = qty * unitCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0 || qty > batch.qty) return;

    const ok = logWriteOff(batch.batchNo, qty, reason, notes);
    if (ok) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Log Stock Write-Off
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Batch {batch.batchNo} · {product?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Quantity to Condemn &amp; Write Off (Max: {batch.qty} {unit}) *
            </label>
            <input
              type="number"
              min="1"
              max={batch.qty}
              required
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
              className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Primary Write-Off Cause *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as WriteOffReason)}
              className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            >
              <option value="Expired">Expired (Past shelf life threshold)</option>
              <option value="Damaged">Damaged (Physical crushing or flood damage)</option>
              <option value="Quality rejection">Quality rejection (Failed micro/sensory lab testing)</option>
              <option value="Returned unsaleable">Returned unsaleable (Customer/Distributor return)</option>
            </select>
          </div>

          {/* Auto-calculated Financial Impact */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/60 space-y-1">
            <div className="text-[11px] text-neutral-500 flex justify-between">
              <span>Unit Standard Cost:</span>
              <span className="font-mono">{formatPKR(unitCost)}</span>
            </div>
            <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex justify-between pt-1 border-t border-neutral-200 dark:border-neutral-700">
              <span>Financial Loss Impact:</span>
              <span className="font-mono text-rose-600 dark:text-rose-400">
                {formatPKR(totalWriteOffCost)}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Audit Notes &amp; Disposal Authorization
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Incineration or organic composting at Multan waste depot."
              className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
            >
              Confirm Write-Off
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
