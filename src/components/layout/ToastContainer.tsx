/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp, ToastItem } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { state, dispatch } = useApp();

  if (state.toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4"
      aria-live="polite"
    >
      {state.toasts.map((toast: ToastItem) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        const icon = isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : isWarning ? (
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
        ) : isError ? (
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
        ) : (
          <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
        );

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
            role="status"
          >
            {icon}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {toast.title}
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => dispatch({ type: 'REMOVE_TOAST', id: toast.id })}
              className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
