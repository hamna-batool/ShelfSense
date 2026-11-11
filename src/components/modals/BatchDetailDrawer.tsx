/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Batch, QualityStatus } from '../../types';
import {
  X,
  Box,
  MapPin,
  Calendar,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  calculateDaysLeft,
  formatDate,
  formatPKR,
  getStatusBandColor,
} from '../../utils/rulesEngine';

interface BatchDetailDrawerProps {
  batch: Batch | null;
  onClose: () => void;
  onOpenWriteOff: (batch: Batch) => void;
}

export const BatchDetailDrawer: React.FC<BatchDetailDrawerProps> = ({
  batch,
  onClose,
  onOpenWriteOff,
}) => {
  const { state, updateBatchQualityStatus, dispatch, showToast } = useApp();

  const [newStatus, setNewStatus] = useState<QualityStatus>(
    batch?.qualityStatus || 'Released'
  );
  const [statusReason, setStatusReason] = useState('');
  const [editableNote, setEditableNote] = useState(batch?.note || '');

  if (!batch) return null;

  const product = state.products.find((p) => p.sku === batch.sku);
  const daysLeft = calculateDaysLeft(batch.expiryDate, state.today);
  const { badgeBg, label } = getStatusBandColor(daysLeft);
  const totalValue = (product?.unitCost || 0) * batch.qty;

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatus === batch.qualityStatus) return;

    const ok = updateBatchQualityStatus(batch.batchNo, newStatus, statusReason);
    if (ok) {
      setStatusReason('');
    }
  };

  const handleSaveNote = () => {
    dispatch({
      type: 'UPDATE_BATCH_NOTE',
      batchNo: batch.batchNo,
      note: editableNote,
    });
    showToast(
      'success',
      'Note Updated',
      `Internal warehouse comment saved for batch ${batch.batchNo}.`
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-900 h-full shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 rounded-lg">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                  {batch.batchNo}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border ${badgeBg}`}>
                  {label}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {product?.name || batch.sku}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 text-xs text-neutral-700 dark:text-neutral-300">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
              <div className="text-[10px] uppercase font-bold text-neutral-400">
                Quantity on Hand
              </div>
              <div className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono mt-0.5">
                {batch.qty} {product?.unit}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                Valuation: {formatPKR(totalValue)}
              </div>
            </div>

            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
              <div className="text-[10px] uppercase font-bold text-neutral-400">
                Location &amp; Zone
              </div>
              <div className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {batch.location}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                Multan Main Facility
              </div>
            </div>
          </div>

          {/* Dates & Lifespan */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-500" />
              Batch Lifecycle Timestamps
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-neutral-500">Manufactured:</span>
                <div className="font-mono text-neutral-800 dark:text-neutral-200 font-medium">
                  {formatDate(batch.mfgDate)}
                </div>
              </div>
              <div>
                <span className="text-neutral-500">Received at Warehouse:</span>
                <div className="font-mono text-neutral-800 dark:text-neutral-200 font-medium">
                  {formatDate(batch.receivedDate)}
                </div>
              </div>
              <div>
                <span className="text-neutral-500">Expiry Date:</span>
                <div className="font-mono text-neutral-800 dark:text-neutral-200 font-medium">
                  {formatDate(batch.expiryDate)}
                </div>
              </div>
              <div>
                <span className="text-neutral-500">Remaining Horizon:</span>
                <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {daysLeft < 0 ? `Expired (${daysLeft}d)` : `${daysLeft} days`}
                </div>
              </div>
            </div>
          </div>

          {/* Current Quality Status & Audit Reason */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                QA Clearance Status
              </div>
              <span
                className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                  batch.qualityStatus === 'Released'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : batch.qualityStatus === 'Hold'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {batch.qualityStatus}
              </span>
            </div>

            {batch.holdReason && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                <strong>QA Flag:</strong> {batch.holdReason}
              </div>
            )}

            {/* QA Status Change Form */}
            <form onSubmit={handleUpdateStatus} className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                Change QA Status (Quality or Manager role only)
              </label>
              <div className="flex gap-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as QualityStatus)}
                  className="flex-1 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs"
                >
                  <option value="Released">Released (Enable FEFO dispatch)</option>
                  <option value="Hold">Hold (Quarantine in warehouse)</option>
                  <option value="Rejected">Rejected (Condemn batch)</option>
                </select>
              </div>

              {newStatus !== batch.qualityStatus && (
                <div className="space-y-2 animate-in fade-in">
                  <textarea
                    required
                    rows={2}
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Mandatory QA audit reason for this status change..."
                    className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs resize-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Commit QA Status Change
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-neutral-500" />
              Internal Batch Comments
            </div>
            <textarea
              rows={3}
              value={editableNote}
              onChange={(e) => setEditableNote(e.target.value)}
              placeholder="Add warehouse or dispatch comments..."
              className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs resize-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-3 py-1.5 bg-neutral-800 dark:bg-neutral-700 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Save Comment
              </button>
            </div>
          </div>

          {/* Destructive Action: Write Off */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => {
                onClose();
                onOpenWriteOff(batch);
              }}
              className="w-full py-2.5 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Condemn &amp; Write Off Batch Quantity</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
