/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, X, Box, Package, MapPin, Users, ArrowRight } from 'lucide-react';
import { calculateDaysLeft, formatPKR } from '../../utils/rulesEngine';

export const GlobalSearchModal: React.FC = () => {
  const { state, dispatch, setActivePage } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        dispatch({ type: 'SET_SEARCH_MODAL', open: !state.searchModalOpen });
      }
      if (e.key === 'Escape' && state.searchModalOpen) {
        dispatch({ type: 'SET_SEARCH_MODAL', open: false });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.searchModalOpen, dispatch]);

  if (!state.searchModalOpen) return null;

  const q = query.toLowerCase().trim();

  // Matched products
  const matchedProducts = q
    ? state.products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
        )
        .slice(0, 5)
    : [];

  // Matched batches
  const matchedBatches = q
    ? state.batches
        .filter(
          (b) =>
            b.batchNo.toLowerCase().includes(q) ||
            b.sku.toLowerCase().includes(q) ||
            b.location.toLowerCase().includes(q)
        )
        .slice(0, 5)
    : [];

  // Matched customers
  const matchedCustomers = q
    ? state.customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q) ||
            c.type.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const handleSelectProduct = (sku: string) => {
    dispatch({ type: 'SET_SEARCH_MODAL', open: false });
    setActivePage('inventory', { searchQuery: sku });
  };

  const handleSelectBatch = (batchNo: string) => {
    dispatch({ type: 'SET_SEARCH_MODAL', open: false });
    setActivePage('inventory', { searchQuery: batchNo });
  };

  const handleSelectCustomer = () => {
    dispatch({ type: 'SET_SEARCH_MODAL', open: false });
    setActivePage('fefo');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={() => dispatch({ type: 'SET_SEARCH_MODAL', open: false })}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKUs, product names, batch numbers, locations, customers..."
            className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!q && (
            <div className="text-center py-8 text-neutral-400 text-xs">
              Type at least one character to search across products, batches, locations, and customers.
            </div>
          )}

          {q &&
            matchedProducts.length === 0 &&
            matchedBatches.length === 0 &&
            matchedCustomers.length === 0 && (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 text-xs">
                No matching records found for &quot;{query}&quot;.
              </div>
            )}

          {/* Products */}
          {matchedProducts.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2 px-2">
                Products ({matchedProducts.length})
              </div>
              <div className="space-y-1">
                {matchedProducts.map((p) => (
                  <button
                    key={p.sku}
                    onClick={() => handleSelectProduct(p.sku)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-md">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono">{p.sku}</span>
                          <span>·</span>
                          <span>{p.category}</span>
                          <span>·</span>
                          <span>{p.unitCost > 0 ? formatPKR(p.unitCost) : 'Ingredient'}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Batches */}
          {matchedBatches.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2 px-2">
                Batches &amp; Locations ({matchedBatches.length})
              </div>
              <div className="space-y-1">
                {matchedBatches.map((b) => {
                  const daysLeft = calculateDaysLeft(b.expiryDate, state.today);
                  return (
                    <button
                      key={b.batchNo}
                      onClick={() => handleSelectBatch(b.batchNo)}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 rounded-md">
                          <Box className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                            <span className="font-mono">{b.batchNo}</span>
                            <span className="text-[11px] font-normal text-neutral-500">({b.sku})</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              daysLeft < 0 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                              daysLeft <= 30 ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' :
                              'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                            }`}>
                              {daysLeft < 0 ? `Expired (${daysLeft}d)` : `${daysLeft}d left`}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-neutral-400" />
                              {b.location}
                            </span>
                            <span>·</span>
                            <span>Qty: {b.qty}</span>
                            <span>·</span>
                            <span>Status: {b.qualityStatus}</span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customers */}
          {matchedCustomers.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2 px-2">
                Customers ({matchedCustomers.length})
              </div>
              <div className="space-y-1">
                {matchedCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={handleSelectCustomer}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-md">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                          <span>{c.type}</span>
                          <span>·</span>
                          <span>Min: {c.minRemainingShelfLifeDays} days</span>
                          <span>·</span>
                          <span>{c.city}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-[11px] text-neutral-500 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span>Press <kbd className="px-1 py-0.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded">ESC</kbd> to close</span>
          </div>
          <span>Multan Facility Inventory Index</span>
        </div>
      </div>
    </div>
  );
};
