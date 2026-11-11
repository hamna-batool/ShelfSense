/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  AlertTriangle,
  Clock,
  ShoppingCart,
  TrendingUp,
  FileText,
  BarChart3,
  GitBranch,
  Users,
  X,
  Factory,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onCloseMobile,
}) => {
  const { state, alerts, setActivePage } = useApp();

  const urgentAlertsCount = alerts.filter(
    (a) => a.severity === 'Critical' || a.severity === 'High' || a.severity === 'Expired'
  ).length;

  const pendingPurchasesCount = state.purchaseRequests.filter(
    (pr) => pr.status === 'Pending approval'
  ).length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      primaryFor: ['Manager'],
    },
    {
      id: 'inventory',
      label: 'Batch Inventory',
      icon: Boxes,
      badge: `${state.batches.length}`,
      primaryFor: ['Warehouse', 'Quality'],
    },
    {
      id: 'fefo',
      label: 'FEFO Dispatch',
      icon: Truck,
      badge: null,
      primaryFor: ['Warehouse', 'Sales'],
    },
    {
      id: 'alerts',
      label: 'Expiry Alerts',
      icon: AlertTriangle,
      badge: urgentAlertsCount > 0 ? `${urgentAlertsCount}` : null,
      badgeColor: 'bg-rose-500 text-white',
      primaryFor: ['Warehouse', 'Quality', 'Sales'],
    },
    {
      id: 'slow_moving',
      label: 'Slow-Moving Stock',
      icon: Clock,
      badge: null,
      primaryFor: ['Sales', 'Procurement'],
    },
    {
      id: 'purchasing',
      label: 'Purchase Reorder',
      icon: ShoppingCart,
      badge: pendingPurchasesCount > 0 ? `${pendingPurchasesCount}` : null,
      badgeColor: 'bg-amber-500 text-white',
      primaryFor: ['Procurement', 'Manager'],
    },
    {
      id: 'forecast',
      label: 'Demand Forecast',
      icon: TrendingUp,
      badge: 'Stat',
      primaryFor: ['Sales', 'Procurement'],
    },
    {
      id: 'finance',
      label: 'Write-offs & Finance',
      icon: FileText,
      badge: null,
      primaryFor: ['Finance'],
    },
    {
      id: 'impact',
      label: 'Impact Metrics',
      icon: BarChart3,
      badge: 'Research',
      primaryFor: ['Manager'],
    },
    {
      id: 'workflow',
      label: 'Workflow Map',
      icon: GitBranch,
      badge: null,
      primaryFor: [],
    },
    {
      id: 'roles',
      label: 'Roles & Interviews',
      icon: Users,
      badge: null,
      primaryFor: [],
    },
  ];

  const handleNavClick = (id: string) => {
    setActivePage(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-neutral-900 text-neutral-300 flex flex-col border-r border-neutral-800 transition-transform duration-200 ease-in-out shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center text-white shadow-xs">
              <Factory className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                ShelfSense
              </div>
              <div className="text-[10px] text-neutral-400 font-mono">
                Multan Plant Ops
              </div>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 text-neutral-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Role Indicator Pill */}
        <div className="px-4 pt-3 pb-2">
          <div className="p-2.5 rounded-xl bg-neutral-800/60 border border-neutral-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                Active Perspective
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                {state.role} Mode
              </span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-mono">
              Role Focus
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 text-xs">
          {navItems.map((item) => {
            const isActive = state.activePage === item.id;
            const isEmphasized = item.primaryFor.includes(state.role);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-all group ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs font-semibold'
                    : isEmphasized
                    ? 'text-neutral-200 hover:bg-neutral-800/80 hover:text-white'
                    : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-white'
                        : isEmphasized
                        ? 'text-emerald-400 group-hover:text-emerald-300'
                        : 'text-neutral-400 group-hover:text-neutral-300'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded-md shrink-0 ${
                      item.badgeColor
                        ? item.badgeColor
                        : isActive
                        ? 'bg-emerald-950 text-emerald-200'
                        : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Status / Factory info */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950/60 text-[11px] text-neutral-400 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Warehouse:</span>
            <span className="text-neutral-200 font-mono">WH1, WH2, WH3 Cold</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Currency:</span>
            <span className="text-neutral-200 font-mono">PKR (Pakistani Rupee)</span>
          </div>
        </div>
      </aside>
    </>
  );
};
