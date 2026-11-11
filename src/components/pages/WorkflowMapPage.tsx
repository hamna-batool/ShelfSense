/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Boxes,
  ShieldCheck,
  Warehouse,
  ShoppingCart,
  Truck,
  FileText,
  ArrowRight,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const WorkflowMapPage: React.FC = () => {
  const { setActivePage } = useApp();

  const workflowSteps = [
    {
      stepNumber: '01',
      title: 'Receiving & Inward Gate',
      role: 'Warehouse Team',
      systemFeature: 'Add Batch / Receive Stock with Unique Batch No & Expiry Sanity Gate',
      targetPage: 'inventory',
      icon: Boxes,
      painPoint:
        'Potential pain point (to be validated by interviews): Flour and sugar bags received from mandi arrive with handwritten challans without standard barcode or batch numbers, requiring manual transcription.',
      actions: ['Log Inward Pallets', 'Check Mfg vs Expiry Dates'],
    },
    {
      stepNumber: '02',
      title: 'Quality Release & Quarantine',
      role: 'Quality Assurance Lab',
      systemFeature: 'Hold → Released / Rejected Workflow with Mandatory Reason',
      targetPage: 'inventory',
      icon: ShieldCheck,
      painPoint:
        'Potential pain point (to be validated by interviews): Lab microbiological tests take 48–72 hours; production floor occasionally mixes unreleased pallets with cleared stock before QA approval.',
      actions: ['Inspect Borderline Batches', 'Enforce QA Clearance Gates'],
    },
    {
      stepNumber: '03',
      title: 'Storage & Bin Allocation',
      role: 'Warehouse Supervisors',
      systemFeature: 'Location Mapping (WH1-A, WH2-B, WH3-Cold) & Days-of-Cover Monitoring',
      targetPage: 'slow_moving',
      icon: Warehouse,
      painPoint:
        'Potential pain point (to be validated by interviews): Multan summer heat reaches 48°C; chocolate and cream biscuits in non-temperature controlled zones risk heat bloom if stored beyond 30 days.',
      actions: ['Track Slow-Moving Piles', 'Flag Over-Cover Batches'],
    },
    {
      stepNumber: '04',
      title: 'Purchasing & Material MRP',
      role: 'Procurement Officer & Manager',
      systemFeature: 'Suggested Order Qty Subtracting Stock Expiring Before Projected Consumption',
      targetPage: 'purchasing',
      icon: ShoppingCart,
      painPoint:
        'Potential pain point (to be validated by interviews): Standard MRP formulas order based on total stock, ignoring that 20% of ingredients will expire before consumption, resulting in unexpected stockouts.',
      actions: ['Review Expiry Deductions', 'Approve Signoff Requisitions'],
    },
    {
      stepNumber: '05',
      title: 'FEFO Commercial Dispatch',
      role: 'Dispatch & Sales Team',
      systemFeature: 'Automated FEFO Allocation with Customer Contract Min Shelf-Life Gates',
      targetPage: 'fefo',
      icon: Truck,
      painPoint:
        'Potential pain point (to be validated by interviews): Modern retail chains (Metro, Imtiaz) impose punitive fines and return full trucks if goods have less than 60 days remaining shelf life.',
      actions: ['Generate Clean Pick List', 'Enforce Override Audit Logging'],
    },
    {
      stepNumber: '06',
      title: 'Returns & Write-Off Condemnation',
      role: 'Finance Controller & QA',
      systemFeature: 'Loss Categorization (Expired, Damaged, QA Rejection) & 3-Way Invoice Match',
      targetPage: 'finance',
      icon: FileText,
      painPoint:
        'Potential pain point (to be validated by interviews): Reconciling physical bin scrap counts with finance general ledger takes up to 4 days at month-end closing.',
      actions: ['Approve Scrapped Assets', 'Verify Invoices vs POs'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <span>Factory Workflow Map &amp; Pain Points</span>
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          End-to-end food manufacturing material lifecycle with highlighted operational friction points for field interview validation
        </p>
      </div>

      {/* Visual Workflow Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workflowSteps.map((step) => {
          const Icon = step.icon;

          return (
            <div
              key={step.stepNumber}
              className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col justify-between gap-4 hover:border-emerald-500/60 transition-all shadow-xs group"
            >
              <div className="space-y-3">
                {/* Step badge & Icon */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Step {step.stepNumber}
                  </span>
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 group-hover:text-emerald-600 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {step.title}
                  </h3>
                  <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Primary Role: {step.role}
                  </div>
                </div>

                {/* System feature */}
                <div className="p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/60 text-xs">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">
                    ShelfSense Enabling Feature
                  </div>
                  <div className="font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {step.systemFeature}
                  </div>
                </div>

                {/* Highlighted Pain Point */}
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Interview Hypothesis:</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed italic">
                    {step.painPoint}
                  </p>
                </div>
              </div>

              {/* Navigation Action */}
              <button
                onClick={() => setActivePage(step.targetPage)}
                className="w-full py-2 px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-emerald-700 dark:hover:text-emerald-400 bg-neutral-50 dark:bg-neutral-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-between transition-colors mt-2"
              >
                <span>Open {step.title} Module</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
