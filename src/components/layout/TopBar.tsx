/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  Plus,
  FastForward,
  Bell,
  Search,
  Moon,
  Sun,
  BookOpen,
  RotateCcw,
  UserCheck,
  Menu,
} from 'lucide-react';
import { formatDate } from '../../utils/rulesEngine';
import { UserRole } from '../../types';
import { ResetConfirmModal } from '../modals/ResetConfirmModal';

interface TopBarProps {
  onToggleMobileSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMobileSidebar }) => {
  const {
    state,
    alerts,
    setRole,
    simulateDays,
    resetDemoData,
    dispatch,
    setActivePage,
  } = useApp();

  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Critical + High alert count
  const urgentAlertsCount = alerts.filter(
    (a) => a.severity === 'Critical' || a.severity === 'High' || a.severity === 'Expired'
  ).length;

  const roles: UserRole[] = [
    'Manager',
    'Warehouse',
    'Procurement',
    'Sales',
    'Quality',
    'Finance',
  ];

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle + Brand & Demo Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-emerald-950 dark:text-emerald-400">
                ShelfSense
              </span>
              <span className="hidden lg:inline text-xs text-neutral-400">·</span>
              <span className="hidden lg:inline text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Demo Foods Pvt Ltd
              </span>
            </div>

            {/* Persistent Mandatory Badge */}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
              Demo data – synthetic
            </span>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Calendar Simulation controls */}
          <div className="hidden sm:flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-lg border border-neutral-200 dark:border-neutral-700/60">
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
              <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span className="font-mono tabular-nums">{formatDate(state.today)}</span>
            </div>
            <button
              onClick={() => simulateDays(1)}
              title="Simulate advance by 1 day"
              className="px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-neutral-700 hover:bg-emerald-50 dark:hover:bg-neutral-600 rounded shadow-xs flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>+1 Day</span>
            </button>
            <button
              onClick={() => simulateDays(7)}
              title="Simulate advance by 7 days"
              className="px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-white dark:hover:bg-neutral-700 rounded flex items-center gap-1 transition-colors"
            >
              <FastForward className="w-3 h-3" />
              <span>+7 Days</span>
            </button>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1">
            <UserCheck className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <select
              value={state.role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="bg-transparent text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
              aria-label="Active user role"
            >
              {roles.map((r) => (
                <option key={r} value={r} className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Search */}
          <button
            onClick={() => dispatch({ type: 'SET_SEARCH_MODAL', open: true })}
            className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5"
            title="Search (Ctrl/Cmd+K)"
            aria-label="Global search"
          >
            <Search className="w-4 h-4" />
            <kbd className="hidden md:inline-block text-[10px] font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
              ⌘K
            </kbd>
          </button>

          {/* Notification Bell */}
          <button
            onClick={() => setActivePage('alerts')}
            className="relative p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            title={`${urgentAlertsCount} urgent expiry alerts`}
            aria-label="Expiry alerts notifications"
          >
            <Bell className="w-4 h-4" />
            {urgentAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center font-mono">
                {urgentAlertsCount > 9 ? '9+' : urgentAlertsCount}
              </span>
            )}
          </button>

          {/* How rules work */}
          <button
            onClick={() => dispatch({ type: 'SET_RULES_DRAWER', open: true })}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
            title="Open business rules and formulas documentation"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Rules</span>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
            className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            title={state.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle color theme"
          >
            {state.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={() => setResetModalOpen(true)}
            className="p-2 text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
            title="Reset demo data to initial state"
            aria-label="Reset demo state"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <ResetConfirmModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={resetDemoData}
      />
    </>
  );
};
