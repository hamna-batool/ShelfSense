/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-3 px-6 border-t border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm text-xs text-neutral-500 dark:text-neutral-400">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 shrink-0" />
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            Academic prototype – synthetic data – decisions require human approval.
          </span>
        </div>
        <div className="flex items-center gap-3 text-neutral-400 dark:text-neutral-500">
          <span>Multan Food Processing Cluster Case Study</span>
          <span aria-hidden="true">·</span>
          <span>Explicit Business Rules Engine</span>
          <span aria-hidden="true">·</span>
          <span>v1.0-Academic</span>
        </div>
      </div>
    </footer>
  );
};
