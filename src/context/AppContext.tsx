/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import {
  generateMonthlySales,
  generateSeedBatches,
  INITIAL_TODAY,
  resetRng,
  SEED_CUSTOMERS,
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_PURCHASE_REQUESTS,
  SEED_SUPPLIER_QUOTATIONS,
  SEED_WRITE_OFFS,
} from '../data/seedData';
import {
  AlertSeverity,
  AlertThresholdSettings,
  Batch,
  Customer,
  DispatchOrder,
  ExpiryAlert,
  ImpactMetrics,
  MonthlySalesHistory,
  OverrideLogEntry,
  Product,
  ProductCategory,
  PurchaseRequest,
  PurchaseRequestStatus,
  QualityStatus,
  SupplierQuotation,
  UserRole,
  WriteOff,
  WriteOffReason,
} from '../types';
import {
  addDays,
  calculateDaysLeft,
  generateAlerts,
} from '../utils/rulesEngine';

const STORAGE_KEY = 'shelfsense_state_v1';

export interface ToastItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

export interface AppState {
  today: string;
  role: UserRole;
  activePage: string;
  pageFilterParams?: {
    filterWindow?: string;
    filterSeverity?: AlertSeverity;
    filterCategory?: ProductCategory;
    searchQuery?: string;
    highlightSku?: string;
  };
  products: Product[];
  batches: Batch[];
  customers: Customer[];
  orders: DispatchOrder[];
  writeOffs: WriteOff[];
  purchaseRequests: PurchaseRequest[];
  quotations: SupplierQuotation[];
  monthlySales: MonthlySalesHistory[];
  overrideLogs: OverrideLogEntry[];
  alertThresholds: AlertThresholdSettings;
  categoryThresholdOverrides: Partial<Record<ProductCategory, AlertThresholdSettings>>;
  slowMoverThresholdDays: number;
  interviewNotes: Record<UserRole, string>;
  impactMetrics: ImpactMetrics;
  darkMode: boolean;
  rulesDrawerOpen: boolean;
  searchModalOpen: boolean;
  toasts: ToastItem[];
}

const DEFAULT_ALERT_THRESHOLDS: AlertThresholdSettings = {
  expiredDays: 0,
  criticalDays: 7,
  highDays: 14,
  warningDays: 30,
  infoDays: 60,
};

const DEFAULT_INTERVIEW_NOTES: Record<UserRole, string> = {
  Warehouse:
    'Warehouse Team (Multan Plant Floor):\n- Needs offline-capable barcode scanning on rugged tablets.\n- Currently relies on manual chalk marks on pallets for batch expiries, causing errors.\n- Requested simplified picklist sorting by physical aisle locations (WH1-A, WH1-B).',
  Procurement:
    'Procurement Team (Raw Materials Desk):\n- Sugar & flour prices fluctuate weekly based on South Punjab mandi arrivals.\n- Requires visibility into usable stock *before* batch expiry so they do not overbuy ingredients.',
  Sales:
    'Sales & Commercial Dispatch:\n- Key struggle: Major modern trade chains (Metro, Imtiaz) reject goods with <60 days remaining shelf life at delivery dock.\n- When dispatches fail at receiving bay, return freight and penalty fines are incurred.',
  Quality:
    'Quality Assurance Laboratory:\n- Manages microbiological, moisture, and sensory release testing.\n- Insists that no batch on Quality Hold can ever be picked by warehouse staff by mistake.',
  Finance:
    'Finance & Cost Accounting:\n- Monthly write-off audits take 3 days of reconciliation between warehouse bin cards and ERP ledgers.\n- Needs transparent categorization between Expired, Damaged, and Quality write-offs.',
  Manager:
    'General Management / Operations Lead:\n- Seeks daily executive overview of expiry value at risk.\n- Requires strict approval gates for POs exceeding PKR 500,000.',
};

const DEFAULT_IMPACT_METRICS: ImpactMetrics = {
  reportPrepTime: { baseline: null, prototype: null },
  alertCorrectness: { baseline: null, prototype: null },
  eligibleBatchAccuracy: { baseline: null, prototype: null },
  expiryWriteOffValue: { baseline: null, prototype: null },
};

function getInitialState(): AppState {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          toasts: [],
          rulesDrawerOpen: false,
          searchModalOpen: false,
        };
      }
    } catch {
      // ignore parse error and fallback
    }
  }

  return {
    today: INITIAL_TODAY,
    role: 'Manager',
    activePage: 'dashboard',
    products: SEED_PRODUCTS,
    batches: generateSeedBatches(INITIAL_TODAY),
    customers: SEED_CUSTOMERS,
    orders: SEED_ORDERS,
    writeOffs: SEED_WRITE_OFFS,
    purchaseRequests: SEED_PURCHASE_REQUESTS,
    quotations: SEED_SUPPLIER_QUOTATIONS,
    monthlySales: generateMonthlySales(),
    overrideLogs: [
      {
        id: 'OVR-01',
        date: '2026-11-04',
        orderNumber: 'DSP-8802',
        sku: 'SKU-BIS-01',
        defaultBatchNo: 'B-101',
        chosenBatchNo: 'B-104',
        reason: 'Customer requested secondary warehouse location WH1-A-04 closer to loading bay.',
        userName: 'Zahid Malik (Picker)',
      },
    ],
    alertThresholds: DEFAULT_ALERT_THRESHOLDS,
    categoryThresholdOverrides: {
      Sauces: {
        expiredDays: 0,
        criticalDays: 10,
        highDays: 20,
        warningDays: 45,
        infoDays: 75,
      },
    },
    slowMoverThresholdDays: 90,
    interviewNotes: DEFAULT_INTERVIEW_NOTES,
    impactMetrics: DEFAULT_IMPACT_METRICS,
    darkMode: false,
    rulesDrawerOpen: false,
    searchModalOpen: false,
    toasts: [],
  };
}

type Action =
  | { type: 'SET_ROLE'; role: UserRole }
  | { type: 'SET_PAGE'; page: string; params?: AppState['pageFilterParams'] }
  | { type: 'SIMULATE_DAYS'; count: number }
  | { type: 'ADD_BATCH'; batch: Batch }
  | {
      type: 'UPDATE_BATCH_STATUS';
      batchNo: string;
      status: QualityStatus;
      reason: string;
      user: string;
    }
  | { type: 'UPDATE_BATCH_NOTE'; batchNo: string; note: string }
  | {
      type: 'LOG_WRITE_OFF';
      batchNo: string;
      qty: number;
      reason: WriteOffReason;
      notes?: string;
      approvedBy: string;
    }
  | { type: 'CONFIRM_DISPATCH'; order: DispatchOrder }
  | {
      type: 'LOG_OVERRIDE';
      entry: Omit<OverrideLogEntry, 'id' | 'date'>;
    }
  | {
      type: 'CREATE_PURCHASE_REQUEST';
      sku: string;
      qty: number;
      supplier?: string;
      notes?: string;
    }
  | {
      type: 'UPDATE_PURCHASE_STATUS';
      id: string;
      status: PurchaseRequestStatus;
      comment: string;
      approvedBy: string;
    }
  | {
      type: 'UPDATE_ALERT_STATUS';
      alertId: string;
      status: 'Open' | 'Acknowledged' | 'Resolved';
      assignedTo?: string;
    }
  | {
      type: 'UPDATE_THRESHOLDS';
      global: AlertThresholdSettings;
      categoryOverrides?: Partial<Record<ProductCategory, AlertThresholdSettings>>;
    }
  | { type: 'UPDATE_SLOW_MOVER_THRESHOLD'; days: number }
  | { type: 'SAVE_INTERVIEW_NOTE'; role: UserRole; note: string }
  | {
      type: 'UPDATE_IMPACT_METRIC';
      metricKey: keyof ImpactMetrics;
      field: 'baseline' | 'prototype';
      value: number | null;
    }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_RULES_DRAWER'; open: boolean }
  | { type: 'SET_SEARCH_MODAL'; open: boolean }
  | { type: 'ADD_TOAST'; toast: Omit<ToastItem, 'id'> }
  | { type: 'REMOVE_TOAST'; id: string }
  | { type: 'RESET_DEMO_DATA' };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, role: action.role };

    case 'SET_PAGE':
      return {
        ...state,
        activePage: action.page,
        pageFilterParams: action.params,
      };

    case 'SIMULATE_DAYS': {
      const newToday = addDays(state.today, action.count);

      // Simulate slight realistic daily sales consumption on released healthy stock
      // so the inventory dynamics change visibly when simulated
      const updatedBatches = state.batches.map((b) => {
        const daysLeft = calculateDaysLeft(b.expiryDate, newToday);
        if (b.qualityStatus === 'Released' && daysLeft > 15 && b.qty > 5) {
          // Decrement by 1 or 2 units to simulate daily consumption
          const dailyDeduct = Math.min(2 * action.count, Math.floor(b.qty * 0.05));
          if (dailyDeduct > 0 && b.qty - dailyDeduct >= 5) {
            return { ...b, qty: b.qty - dailyDeduct };
          }
        }
        return b;
      });

      return {
        ...state,
        today: newToday,
        batches: updatedBatches,
      };
    }

    case 'ADD_BATCH':
      return {
        ...state,
        batches: [action.batch, ...state.batches],
      };

    case 'UPDATE_BATCH_STATUS': {
      const updated = state.batches.map((b) => {
        if (b.batchNo === action.batchNo) {
          return {
            ...b,
            qualityStatus: action.status,
            holdReason:
              action.status === 'Hold' || action.status === 'Rejected'
                ? action.reason
                : undefined,
            note: `Status set to ${action.status} by ${action.user}: ${action.reason}`,
          };
        }
        return b;
      });
      return { ...state, batches: updated };
    }

    case 'UPDATE_BATCH_NOTE': {
      const updated = state.batches.map((b) => {
        if (b.batchNo === action.batchNo) {
          return { ...b, note: action.note };
        }
        return b;
      });
      return { ...state, batches: updated };
    }

    case 'LOG_WRITE_OFF': {
      const targetBatch = state.batches.find((b) => b.batchNo === action.batchNo);
      if (!targetBatch) return state;

      const product = state.products.find((p) => p.sku === targetBatch.sku);
      const unitCost = product ? product.unitCost : 1000;
      const unit = product ? product.unit : 'unit';
      const productName = product ? product.name : targetBatch.sku;
      const category = product ? product.category : 'Biscuits';
      const writeOffVal = action.qty * unitCost;

      const newRecord: WriteOff = {
        id: `WO-${Date.now().toString().slice(-4)}`,
        date: state.today,
        batchNo: targetBatch.batchNo,
        sku: targetBatch.sku,
        productName,
        category,
        qty: action.qty,
        unit,
        value: writeOffVal,
        reason: action.reason,
        approvedBy: action.approvedBy,
        notes: action.notes,
      };

      // Deduct quantity from batch
      const updatedBatches = state.batches
        .map((b) => {
          if (b.batchNo === action.batchNo) {
            const rem = Math.max(0, b.qty - action.qty);
            return { ...b, qty: rem };
          }
          return b;
        })
        .filter((b) => b.qty > 0); // remove if zero

      return {
        ...state,
        batches: updatedBatches,
        writeOffs: [newRecord, ...state.writeOffs],
      };
    }

    case 'CONFIRM_DISPATCH': {
      // Deduct all allocated quantities from batches
      const deductMap = new Map<string, number>();
      action.order.lines.forEach((line) => {
        line.allocatedBatches.forEach((ab) => {
          const curr = deductMap.get(ab.batchNo) || 0;
          deductMap.set(ab.batchNo, curr + ab.qty);
        });
      });

      const updatedBatches = state.batches
        .map((b) => {
          const deduct = deductMap.get(b.batchNo);
          if (deduct) {
            return { ...b, qty: Math.max(0, b.qty - deduct) };
          }
          return b;
        })
        .filter((b) => b.qty > 0);

      // Check for any overrides logged in this order
      const newOverrides: OverrideLogEntry[] = [];
      action.order.lines.forEach((line) => {
        line.allocatedBatches.forEach((ab) => {
          if (ab.isOverridden && ab.overrideReason) {
            newOverrides.push({
              id: `OVR-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              date: state.today,
              orderNumber: action.order.orderNumber,
              sku: line.sku,
              defaultBatchNo: 'Auto-FEFO',
              chosenBatchNo: ab.batchNo,
              reason: ab.overrideReason,
              userName: action.order.dispatchedBy,
            });
          }
        });
      });

      return {
        ...state,
        batches: updatedBatches,
        orders: [action.order, ...state.orders],
        overrideLogs: [...newOverrides, ...state.overrideLogs],
      };
    }

    case 'LOG_OVERRIDE': {
      const entry: OverrideLogEntry = {
        ...action.entry,
        id: `OVR-${Date.now()}`,
        date: state.today,
      };
      return {
        ...state,
        overrideLogs: [entry, ...state.overrideLogs],
      };
    }

    case 'CREATE_PURCHASE_REQUEST': {
      const product = state.products.find((p) => p.sku === action.sku);
      if (!product) return state;

      const newPr: PurchaseRequest = {
        id: `PR-${Date.now()}`,
        prNumber: `PR-${900 + state.purchaseRequests.length + 1}`,
        sku: product.sku,
        productName: product.name,
        category: product.category,
        requestedQty: action.qty,
        unit: product.unit,
        estimatedCost: action.qty * product.unitCost,
        date: state.today,
        status: 'Draft',
        requestedBy: `${state.role} User`,
        suggestedSupplier: action.supplier || product.supplier,
        auditTrail: [
          {
            date: state.today,
            action: 'Created Draft',
            user: `${state.role} User`,
            notes: action.notes || 'Created via Purchase Recommendations module',
          },
        ],
      };

      return {
        ...state,
        purchaseRequests: [newPr, ...state.purchaseRequests],
      };
    }

    case 'UPDATE_PURCHASE_STATUS': {
      const updated = state.purchaseRequests.map((pr) => {
        if (pr.id === action.id) {
          const trailEntry = {
            date: state.today,
            action: `Status changed to ${action.status}`,
            user: action.approvedBy,
            notes: action.comment,
          };
          return {
            ...pr,
            status: action.status,
            approverComment: action.comment,
            approvedBy: action.approvedBy,
            poCreated: action.status === 'Approved' ? true : pr.poCreated,
            auditTrail: [...pr.auditTrail, trailEntry],
          };
        }
        return pr;
      });
      return { ...state, purchaseRequests: updated };
    }

    case 'UPDATE_ALERT_STATUS': {
      // Alert states can be recorded in local map or transiently
      return state;
    }

    case 'UPDATE_THRESHOLDS':
      return {
        ...state,
        alertThresholds: action.global,
        categoryThresholdOverrides: action.categoryOverrides || state.categoryThresholdOverrides,
      };

    case 'UPDATE_SLOW_MOVER_THRESHOLD':
      return {
        ...state,
        slowMoverThresholdDays: action.days,
      };

    case 'SAVE_INTERVIEW_NOTE':
      return {
        ...state,
        interviewNotes: {
          ...state.interviewNotes,
          [action.role]: action.note,
        },
      };

    case 'UPDATE_IMPACT_METRIC':
      return {
        ...state,
        impactMetrics: {
          ...state.impactMetrics,
          [action.metricKey]: {
            ...state.impactMetrics[action.metricKey],
            [action.field]: action.value,
          },
        },
      };

    case 'TOGGLE_DARK_MODE': {
      const next = !state.darkMode;
      if (typeof document !== 'undefined') {
        if (next) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return { ...state, darkMode: next };
    }

    case 'SET_RULES_DRAWER':
      return { ...state, rulesDrawerOpen: action.open };

    case 'SET_SEARCH_MODAL':
      return { ...state, searchModalOpen: action.open };

    case 'ADD_TOAST': {
      const newToast: ToastItem = {
        ...action.toast,
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      return { ...state, toasts: [...state.toasts, newToast] };
    }

    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };

    case 'RESET_DEMO_DATA': {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      resetRng(42);
      return {
        today: INITIAL_TODAY,
        role: 'Manager',
        activePage: 'dashboard',
        products: SEED_PRODUCTS,
        batches: generateSeedBatches(INITIAL_TODAY),
        customers: SEED_CUSTOMERS,
        orders: SEED_ORDERS,
        writeOffs: SEED_WRITE_OFFS,
        purchaseRequests: SEED_PURCHASE_REQUESTS,
        quotations: SEED_SUPPLIER_QUOTATIONS,
        monthlySales: generateMonthlySales(),
        overrideLogs: [
          {
            id: 'OVR-01',
            date: '2026-11-04',
            orderNumber: 'DSP-8802',
            sku: 'SKU-BIS-01',
            defaultBatchNo: 'B-101',
            chosenBatchNo: 'B-104',
            reason: 'Customer requested secondary warehouse location WH1-A-04 closer to loading bay.',
            userName: 'Zahid Malik (Picker)',
          },
        ],
        alertThresholds: DEFAULT_ALERT_THRESHOLDS,
        categoryThresholdOverrides: {
          Sauces: {
            expiredDays: 0,
            criticalDays: 10,
            highDays: 20,
            warningDays: 45,
            infoDays: 75,
          },
        },
        slowMoverThresholdDays: 90,
        interviewNotes: DEFAULT_INTERVIEW_NOTES,
        impactMetrics: DEFAULT_IMPACT_METRICS,
        darkMode: false,
        rulesDrawerOpen: false,
        searchModalOpen: false,
        toasts: [
          {
            id: `toast-${Date.now()}`,
            type: 'info',
            title: 'Demo Data Reset',
            message: 'All inventory, orders, purchase requests, and rules restored to initial state.',
          },
        ],
      };
    }

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  alerts: ExpiryAlert[];
  // Helper dispatchers with role permission checks
  setRole: (role: UserRole) => void;
  setActivePage: (page: string, params?: AppState['pageFilterParams']) => void;
  simulateDays: (count: number) => void;
  addBatch: (batch: Batch) => boolean;
  updateBatchQualityStatus: (
    batchNo: string,
    status: QualityStatus,
    reason: string
  ) => boolean;
  logWriteOff: (
    batchNo: string,
    qty: number,
    reason: WriteOffReason,
    notes?: string
  ) => boolean;
  confirmDispatch: (order: DispatchOrder) => boolean;
  createPurchaseRequest: (
    sku: string,
    qty: number,
    supplier?: string,
    notes?: string
  ) => boolean;
  updatePurchaseStatus: (
    id: string,
    status: PurchaseRequestStatus,
    comment: string
  ) => boolean;
  updateAlertThresholds: (
    global: AlertThresholdSettings,
    categoryOverrides?: Partial<Record<ProductCategory, AlertThresholdSettings>>
  ) => void;
  resetDemoData: () => void;
  showToast: (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    message: string
  ) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);

  // Sync dark mode class on mount and changes
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  // Persist state to localStorage (omit volatile UI state)
  useEffect(() => {
    try {
      const { rulesDrawerOpen, searchModalOpen, toasts, ...persisted } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // storage quota or private browsing
    }
  }, [state]);

  // Derived current alerts computed through pure business rules engine
  const alerts = React.useMemo(() => {
    return generateAlerts(
      state.products,
      state.batches,
      state.today,
      state.alertThresholds,
      state.categoryThresholdOverrides
    );
  }, [
    state.products,
    state.batches,
    state.today,
    state.alertThresholds,
    state.categoryThresholdOverrides,
  ]);

  const showToast = (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    message: string
  ) => {
    dispatch({ type: 'ADD_TOAST', toast: { type, title, message } });
  };

  const setRole = (role: UserRole) => {
    dispatch({ type: 'SET_ROLE', role });
    showToast(
      'info',
      `Switched to ${role} Role`,
      `Permissions and navigation view adjusted for ${role}.`
    );
  };

  const setActivePage = (
    page: string,
    params?: AppState['pageFilterParams']
  ) => {
    dispatch({ type: 'SET_PAGE', page, params });
  };

  const simulateDays = (count: number) => {
    dispatch({ type: 'SIMULATE_DAYS', count });
    showToast(
      'success',
      `Simulated +${count} Day${count > 1 ? 's' : ''}`,
      `Advanced calendar to ${addDays(state.today, count)}. Recalculated expiry bands and simulated sales consumption.`
    );
  };

  const addBatch = (batch: Batch): boolean => {
    if (state.role === 'Sales') {
      showToast(
        'warning',
        'Permission Denied',
        'Sales role cannot receive or create warehouse batches.'
      );
      return false;
    }
    dispatch({ type: 'ADD_BATCH', batch });
    showToast(
      'success',
      'Batch Received',
      `Batch ${batch.batchNo} (${batch.qty} units) logged to location ${batch.location}.`
    );
    return true;
  };

  const updateBatchQualityStatus = (
    batchNo: string,
    status: QualityStatus,
    reason: string
  ): boolean => {
    // Only Quality and Manager roles can change Hold -> Released or Rejected
    if (state.role !== 'Quality' && state.role !== 'Manager') {
      showToast(
        'error',
        'Permission Denied',
        `Role "${state.role}" is not authorized to alter Quality Status. Only Quality Assurance or General Manager can release or hold batches.`
      );
      return false;
    }

    if (!reason || reason.trim().length < 5) {
      showToast(
        'warning',
        'Audit Reason Required',
        'You must provide an explicit explanation (minimum 5 characters) for QA status changes.'
      );
      return false;
    }

    dispatch({
      type: 'UPDATE_BATCH_STATUS',
      batchNo,
      status,
      reason,
      user: `${state.role} User`,
    });

    showToast(
      'success',
      'Quality Status Updated',
      `Batch ${batchNo} marked as ${status}. Audit reason logged.`
    );
    return true;
  };

  const logWriteOff = (
    batchNo: string,
    qty: number,
    reason: WriteOffReason,
    notes?: string
  ): boolean => {
    if (state.role !== 'Finance' && state.role !== 'Manager' && state.role !== 'Quality') {
      showToast(
        'error',
        'Permission Denied',
        `Role "${state.role}" cannot execute inventory write-offs. Requires Finance, Quality or Manager authorization.`
      );
      return false;
    }

    dispatch({
      type: 'LOG_WRITE_OFF',
      batchNo,
      qty,
      reason,
      notes,
      approvedBy: `${state.role} User`,
    });

    showToast(
      'success',
      'Write-Off Recorded',
      `${qty} units of batch ${batchNo} written off under reason: ${reason}.`
    );
    return true;
  };

  const confirmDispatch = (order: DispatchOrder): boolean => {
    if (state.role !== 'Warehouse' && state.role !== 'Manager' && state.role !== 'Sales') {
      showToast(
        'error',
        'Permission Denied',
        `Role "${state.role}" is not authorized to execute warehouse dispatches.`
      );
      return false;
    }

    dispatch({ type: 'CONFIRM_DISPATCH', order });
    showToast(
      'success',
      'Dispatch Confirmed',
      `Order ${order.orderNumber} for ${order.customerName} successfully dispatched. Stock balances updated.`
    );
    return true;
  };

  const createPurchaseRequest = (
    sku: string,
    qty: number,
    supplier?: string,
    notes?: string
  ): boolean => {
    dispatch({ type: 'CREATE_PURCHASE_REQUEST', sku, qty, supplier, notes });
    showToast(
      'success',
      'Purchase Request Created',
      `Draft requisition submitted for ${qty} units. Forwarded for approval.`
    );
    return true;
  };

  const updatePurchaseStatus = (
    id: string,
    status: PurchaseRequestStatus,
    comment: string
  ): boolean => {
    // Only Manager and Procurement roles can approve/reject
    if (state.role !== 'Manager' && state.role !== 'Procurement') {
      showToast(
        'error',
        'Permission Denied',
        `Role "${state.role}" cannot approve purchase requests. Only Manager or Procurement roles have signing authorization.`
      );
      return false;
    }

    if ((status === 'Approved' || status === 'Rejected') && (!comment || comment.trim().length < 3)) {
      showToast(
        'warning',
        'Approver Comment Required',
        'Please enter a comment or justification before approving or rejecting this requisition.'
      );
      return false;
    }

    dispatch({
      type: 'UPDATE_PURCHASE_STATUS',
      id,
      status,
      comment,
      approvedBy: `${state.role} User`,
    });

    showToast(
      status === 'Approved' ? 'success' : 'warning',
      `Requisition ${status}`,
      `Purchase request has been marked ${status}. Audit trail updated.`
    );
    return true;
  };

  const updateAlertThresholds = (
    global: AlertThresholdSettings,
    categoryOverrides?: Partial<Record<ProductCategory, AlertThresholdSettings>>
  ) => {
    dispatch({ type: 'UPDATE_THRESHOLDS', global, categoryOverrides });
    showToast(
      'success',
      'Thresholds Saved',
      'Expiry alert parameters updated. System recalculated all warning bands.'
    );
  };

  const resetDemoData = () => {
    dispatch({ type: 'RESET_DEMO_DATA' });
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        alerts,
        setRole,
        setActivePage,
        simulateDays,
        addBatch,
        updateBatchQualityStatus,
        logWriteOff,
        confirmDispatch,
        createPurchaseRequest,
        updatePurchaseStatus,
        updateAlertThresholds,
        resetDemoData,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
