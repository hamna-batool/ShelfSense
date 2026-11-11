/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  Users,
  Warehouse,
  ShoppingCart,
  TrendingUp,
  ShieldCheck,
  FileText,
  Save,
  CheckCircle2,
  BookOpen,
  Briefcase,
} from 'lucide-react';

interface RoleProfile {
  role: UserRole;
  title: string;
  icon: any;
  responsibilities: string[];
  dataUsed: string[];
}

export const RolesNotesPage: React.FC = () => {
  const { state, dispatch, showToast, setRole } = useApp();

  const [notesState, setNotesState] = useState<Record<UserRole, string>>(
    state.interviewNotes
  );

  const profiles: RoleProfile[] = [
    {
      role: 'Warehouse',
      title: 'Warehouse & Inventory Operations',
      icon: Warehouse,
      responsibilities: [
        'Physical pallet receiving, unload inspection, and bin location tagging.',
        'Executing FEFO pick lists for sales dispatches without skipping early-expiring pallets.',
        'Quarantining suspect damaged goods and maintaining physical security in WH1, WH2, and WH3 cold store.',
      ],
      dataUsed: [
        'Batch numbers, aisle-shelf bin coordinates, physical count vs ERP bin cards, expiry dates.',
      ],
    },
    {
      role: 'Procurement',
      title: 'Raw Material Procurement Desk',
      icon: ShoppingCart,
      responsibilities: [
        'Reordering sugar, flour, cocoa, oil, and packaging materials to prevent production stoppages.',
        'Supplier price negotiation, MOQ adherence, and vendor delivery schedule tracking.',
        'Auditing open purchase requests against factory daily consumption velocity.',
      ],
      dataUsed: [
        'Days of cover, lead time demand, usable stock before expiry, open PO balances, supplier quotations.',
      ],
    },
    {
      role: 'Sales',
      title: 'Commercial & Modern Trade Sales',
      icon: TrendingUp,
      responsibilities: [
        'Securing orders from modern retail chains (Metro, Imtiaz, Chase Up) and regional distributors.',
        'Ensuring dispatched batches strictly comply with customer-specific remaining shelf-life SLAs.',
        'Offering promotional discount clearances on batches entering 30-day critical windows.',
      ],
      dataUsed: [
        'Customer contract minimum days (30d, 45d, 60d, 120d), finished good inventory, expiry calendars.',
      ],
    },
    {
      role: 'Quality',
      title: 'Quality Assurance & Food Safety Lab',
      icon: ShieldCheck,
      responsibilities: [
        'Sampling raw ingredients and finished goods for microbial count, moisture, and sensory testing.',
        'Sole authority to transition batches between Hold, Released, and Condemned / Rejected.',
        'Enforcing Pakistan Standards and Quality Control Authority (PSQCA) compliance.',
      ],
      dataUsed: [
        'Certificate of Analysis (COA), lab sample logs, shelf-life deviation flags, quarantine records.',
      ],
    },
    {
      role: 'Finance',
      title: 'Finance & Cost Accounting',
      icon: FileText,
      responsibilities: [
        'Authorizing formal inventory write-offs and recognizing fiscal scrap debits.',
        'Performing three-way invoice verification matching Vendor Bill, Purchase Order, and Receiving GRN.',
        'Monthly balance sheet stock valuation across raw ingredients, packaging, and finished goods.',
      ],
      dataUsed: [
        'Standard unit costs, purchase order ledgers, write-off cause breakdown, general ledger entries.',
      ],
    },
    {
      role: 'Manager',
      title: 'General Management & Plant Operations',
      icon: Briefcase,
      responsibilities: [
        'Plant-wide oversight of production capacity, stockout risks, and working capital utilization.',
        'Final signoff on purchase requisitions and policy threshold overrides.',
        'Cross-functional alignment across procurement, quality, sales, and warehouse logistics.',
      ],
      dataUsed: [
        'Executive KPIs, total value at risk, demand forecast models, research impact metrics.',
      ],
    },
  ];

  const handleSaveNote = (role: UserRole) => {
    dispatch({
      type: 'SAVE_INTERVIEW_NOTE',
      role,
      note: notesState[role],
    });
    showToast(
      'success',
      'Interview Notes Saved',
      `Field observations for ${role} role saved to local storage.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <span>Roles, Responsibilities &amp; Qualitative Interview Notes</span>
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Role governance framework with editable field research notes for Multan food cluster interviews
        </p>
      </div>

      {/* Mandatory Label Notice */}
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-start gap-3">
        <BookOpen className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1">
          <div className="font-bold text-emerald-900 dark:text-emerald-300">
            Duties to be confirmed through interviews
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            The role responsibilities and operational workflows represented below represent the preliminary system model. The editable text areas below are intended for researchers to record qualitative findings during on-site interviews with factory personnel in Multan.
          </p>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {profiles.map((p) => {
          const Icon = p.icon;
          const isActive = state.role === p.role;

          return (
            <div
              key={p.role}
              className={`p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                isActive
                  ? 'bg-emerald-50/20 dark:bg-emerald-950/15 border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/30'
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <div className="space-y-3">
                {/* Header of role */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <span>{p.title}</span>
                      </h3>
                      <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                        {p.role} Role
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setRole(p.role)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      isActive
                        ? 'bg-emerald-800 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                    }`}
                  >
                    {isActive ? 'Active View' : 'Switch Perspective'}
                  </button>
                </div>

                {/* Core Responsibilities */}
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-neutral-800 dark:text-neutral-200 text-[11px] uppercase tracking-wider text-neutral-400">
                    Documented Responsibilities:
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                    {p.responsibilities.map((r, rIdx) => (
                      <li key={rIdx}>{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Data They Use */}
                <div className="space-y-1 text-xs pt-1">
                  <div className="font-bold text-[11px] uppercase tracking-wider text-neutral-400">
                    Primary Data Inputs Used:
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg text-[11px] text-neutral-700 dark:text-neutral-300 font-mono">
                    {p.dataUsed.join(' ')}
                  </div>
                </div>

                {/* Editable Interview Findings (Saved locally) */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                      Interview findings &amp; field observations:
                    </label>
                    <span className="text-[10px] text-neutral-400 italic">
                      Duties to be confirmed through interviews
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={notesState[p.role] || ''}
                    onChange={(e) =>
                      setNotesState({
                        ...notesState,
                        [p.role]: e.target.value,
                      })
                    }
                    placeholder={`Enter qualitative notes recorded during interview with ${p.role} staff...`}
                    className="w-full p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 resize-none font-mono leading-relaxed"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => handleSaveNote(p.role)}
                  className="px-3.5 py-1.5 bg-neutral-800 dark:bg-neutral-700 hover:bg-neutral-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Interview Notes</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
