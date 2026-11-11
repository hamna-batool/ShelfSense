/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Batch, ProductCategory, QualityStatus } from '../../types';
import {
  calculateDaysLeft,
  formatDate,
  formatPKR,
  getStatusBandColor,
} from '../../utils/rulesEngine';
import {
  Search,
  Plus,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MapPin,
  X,
} from 'lucide-react';
import { ReceiveStockModal } from '../modals/ReceiveStockModal';
import { BatchDetailDrawer } from '../modals/BatchDetailDrawer';
import { NewWriteOffModal } from '../modals/NewWriteOffModal';

export const BatchInventoryPage: React.FC = () => {
  const { state, showToast } = useApp();

  const [search, setSearch] = useState(state.pageFilterParams?.searchQuery || '');
  const [categoryFilter, setCategoryFilter] = useState<string>(
    state.pageFilterParams?.filterCategory || 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [expiryWindowFilter, setExpiryWindowFilter] = useState<string>(
    state.pageFilterParams?.filterWindow || 'ALL'
  );

  const [sortField, setSortField] = useState<
    'expiryDate' | 'daysLeft' | 'qty' | 'value' | 'batchNo' | 'sku'
  >('expiryDate');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [writeOffBatch, setWriteOffBatch] = useState<Batch | null>(null);

  // Distinct locations
  const locations = useMemo(() => {
    const set = new Set<string>();
    state.batches.forEach((b) => set.add(b.location));
    return Array.from(set).sort();
  }, [state.batches]);

  // Distinct categories
  const categories: ProductCategory[] = [
    'Biscuits',
    'Wafers',
    'Confectionery',
    'Pasta',
    'Sauces',
    'Snacks',
    'Ingredients',
    'Packaging',
  ];

  // Filtering & Sorting
  const filteredBatches = useMemo(() => {
    return state.batches.filter((b) => {
      const prod = state.products.find((p) => p.sku === b.sku);
      const daysLeft = calculateDaysLeft(b.expiryDate, state.today);

      // Search match
      if (search) {
        const q = search.toLowerCase();
        const matchesSku = b.sku.toLowerCase().includes(q);
        const matchesBatch = b.batchNo.toLowerCase().includes(q);
        const matchesLoc = b.location.toLowerCase().includes(q);
        const matchesName = prod?.name.toLowerCase().includes(q);
        if (!matchesSku && !matchesBatch && !matchesLoc && !matchesName) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'ALL' && prod?.category !== categoryFilter) {
        return false;
      }

      // Quality Status filter
      if (statusFilter !== 'ALL' && b.qualityStatus !== statusFilter) {
        return false;
      }

      // Location filter
      if (locationFilter !== 'ALL' && b.location !== locationFilter) {
        return false;
      }

      // Expiry window filter
      if (expiryWindowFilter === 'EXPIRED' && daysLeft >= 0) return false;
      if (expiryWindowFilter === '7' && (daysLeft < 0 || daysLeft > 7)) return false;
      if (expiryWindowFilter === '30' && (daysLeft < 0 || daysLeft > 30)) return false;
      if (expiryWindowFilter === '60' && (daysLeft < 0 || daysLeft > 60)) return false;
      if (expiryWindowFilter === 'SAFE' && daysLeft <= 60) return false;

      return true;
    });
  }, [
    state.batches,
    state.products,
    state.today,
    search,
    categoryFilter,
    statusFilter,
    locationFilter,
    expiryWindowFilter,
  ]);

  const sortedBatches = useMemo(() => {
    return [...filteredBatches].sort((a, b) => {
      const prodA = state.products.find((p) => p.sku === a.sku);
      const prodB = state.products.find((p) => p.sku === b.sku);
      const valA = a.qty * (prodA?.unitCost || 0);
      const valB = b.qty * (prodB?.unitCost || 0);
      const daysLeftA = calculateDaysLeft(a.expiryDate, state.today);
      const daysLeftB = calculateDaysLeft(b.expiryDate, state.today);

      let result = 0;
      if (sortField === 'expiryDate') {
        result = a.expiryDate.localeCompare(b.expiryDate);
      } else if (sortField === 'daysLeft') {
        result = daysLeftA - daysLeftB;
      } else if (sortField === 'qty') {
        result = a.qty - b.qty;
      } else if (sortField === 'value') {
        result = valA - valB;
      } else if (sortField === 'batchNo') {
        result = a.batchNo.localeCompare(b.batchNo);
      } else if (sortField === 'sku') {
        result = a.sku.localeCompare(b.sku);
      }

      return sortAsc ? result : -result;
    });
  }, [filteredBatches, sortField, sortAsc, state.products, state.today]);

  // Pagination
  const totalPages = Math.ceil(sortedBatches.length / pageSize) || 1;
  const paginatedBatches = sortedBatches.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (
    field: 'expiryDate' | 'daysLeft' | 'qty' | 'value' | 'batchNo' | 'sku'
  ) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = [
      'Batch No',
      'SKU',
      'Product Name',
      'Category',
      'Quantity',
      'Unit',
      'Location',
      'Mfg Date',
      'Expiry Date',
      'Days Left',
      'Quality Status',
      'Unit Cost (PKR)',
      'Total Value (PKR)',
    ];

    const rows = sortedBatches.map((b) => {
      const prod = state.products.find((p) => p.sku === b.sku);
      const daysLeft = calculateDaysLeft(b.expiryDate, state.today);
      const unitCost = prod?.unitCost || 0;
      return [
        b.batchNo,
        b.sku,
        `"${(prod?.name || '').replace(/"/g, '""')}"`,
        prod?.category || '',
        b.qty,
        prod?.unit || 'carton',
        b.location,
        b.mfgDate,
        b.expiryDate,
        daysLeft,
        b.qualityStatus,
        unitCost,
        b.qty * unitCost,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ShelfSense_Batch_Inventory_${state.today}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(
      'success',
      'CSV Exported',
      `Exported ${sortedBatches.length} batch records.`
    );
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setLocationFilter('ALL');
    setExpiryWindowFilter('ALL');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Batch Inventory
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Physical pallet lots with explicit FEFO expiry tracking and QA clearance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 border border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsReceiveModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Receive Stock</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search batch, SKU, name..."
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Expiry Window Filter */}
          <div>
            <select
              value={expiryWindowFilter}
              onChange={(e) => {
                setExpiryWindowFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none"
            >
              <option value="ALL">All Expiry Windows</option>
              <option value="EXPIRED">Already Expired (&lt;0 days)</option>
              <option value="7">Expiring within 7 Days</option>
              <option value="30">Expiring within 30 Days</option>
              <option value="60">Expiring within 60 Days</option>
              <option value="SAFE">Safe Horizon (&gt;60 Days)</option>
            </select>
          </div>

          {/* Quality Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none"
            >
              <option value="ALL">All QA Statuses</option>
              <option value="Released">Released Only</option>
              <option value="Hold">Under Quality Hold</option>
              <option value="Rejected">Rejected Only</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none"
            >
              <option value="ALL">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset */}
        <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <span>
              Showing <strong>{filteredBatches.length}</strong> of{' '}
              <strong>{state.batches.length}</strong> batches
            </span>
          </div>

          {(search ||
            categoryFilter !== 'ALL' ||
            statusFilter !== 'ALL' ||
            locationFilter !== 'ALL' ||
            expiryWindowFilter !== 'ALL') && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold select-none">
                <th
                  onClick={() => handleSort('batchNo')}
                  className="py-3 px-3 cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Batch No</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sku')}
                  className="py-3 px-3 cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>SKU</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Product Name</th>
                <th
                  onClick={() => handleSort('qty')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Qty</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">Mfg Date</th>
                <th
                  onClick={() => handleSort('expiryDate')}
                  className="py-3 px-3 cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Expiry Date</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('daysLeft')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Days Left</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Quality Status</th>
                <th
                  onClick={() => handleSort('value')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Value (PKR)</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {paginatedBatches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-neutral-400">
                    No batch inventory records matched your filters.
                  </td>
                </tr>
              ) : (
                paginatedBatches.map((b) => {
                  const prod = state.products.find((p) => p.sku === b.sku);
                  const daysLeft = calculateDaysLeft(b.expiryDate, state.today);
                  const { badgeBg, label } = getStatusBandColor(daysLeft);
                  const value = b.qty * (prod?.unitCost || 0);

                  return (
                    <tr
                      key={b.batchNo}
                      onClick={() => setSelectedBatch(b)}
                      className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors ${
                        daysLeft < 0
                          ? 'bg-rose-50/30 dark:bg-rose-950/20'
                          : daysLeft <= 30
                          ? 'bg-orange-50/20 dark:bg-orange-950/10'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {b.batchNo}
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-500">
                        {b.sku}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {prod?.name || b.sku}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {prod?.category}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
                        {b.qty} <span className="font-normal text-neutral-400 text-[11px]">{prod?.unit}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-700 dark:text-neutral-300">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                          {b.location}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-500 tabular-nums">
                        {formatDate(b.mfgDate)}
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-700 dark:text-neutral-300 tabular-nums">
                        {formatDate(b.expiryDate)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-mono tabular-nums text-[10px] font-semibold border ${badgeBg}`}
                        >
                          {daysLeft < 0 ? `${daysLeft}d` : `${daysLeft}d left`}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            b.qualityStatus === 'Released'
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : b.qualityStatus === 'Hold'
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {b.qualityStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
                        {formatPKR(value)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between text-xs text-neutral-500">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedBatches.length)} of{' '}
            {sortedBatches.length} entries
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="p-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-neutral-700 dark:text-neutral-300">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="p-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals & Drawers */}
      <ReceiveStockModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
      />

      <BatchDetailDrawer
        batch={selectedBatch}
        onClose={() => setSelectedBatch(null)}
        onOpenWriteOff={(b) => setWriteOffBatch(b)}
      />

      <NewWriteOffModal
        batch={writeOffBatch}
        isOpen={!!writeOffBatch}
        onClose={() => setWriteOffBatch(null)}
      />
    </div>
  );
};
