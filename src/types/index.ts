/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProductCategory =
  | 'Biscuits'
  | 'Wafers'
  | 'Confectionery'
  | 'Pasta'
  | 'Sauces'
  | 'Snacks'
  | 'Ingredients'
  | 'Packaging';

export type QualityStatus = 'Released' | 'Hold' | 'Rejected';

export type AlertSeverity = 'Expired' | 'Critical' | 'High' | 'Warning' | 'Info';

export type UserRole =
  | 'Manager'
  | 'Warehouse'
  | 'Procurement'
  | 'Sales'
  | 'Quality'
  | 'Finance';

export type CustomerType =
  | 'Retail chain'
  | 'Wholesaler'
  | 'Distributor'
  | 'Export';

export interface Product {
  sku: string;
  name: string;
  category: ProductCategory;
  unit: string;
  shelfLifeDays: number;
  unitCost: number; // in PKR
  unitPrice: number; // in PKR
  avgDailySales: number;
  leadTimeDays: number;
  safetyStock: number;
  supplier: string;
  description?: string;
}

export interface Batch {
  batchNo: string;
  sku: string;
  qty: number;
  location: string;
  mfgDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  receivedDate: string; // YYYY-MM-DD
  qualityStatus: QualityStatus;
  note?: string;
  holdReason?: string;
  initialQty?: number;
}

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  minRemainingShelfLifeDays: number;
  city: string;
  contact?: string;
}

export interface AllocatedBatch {
  batchNo: string;
  qty: number;
  location: string;
  expiryDate: string;
  daysLeft: number;
  reason: string;
  isOverridden?: boolean;
  overrideReason?: string;
}

export interface ExcludedBatch {
  batchNo: string;
  qty: number;
  expiryDate: string;
  daysLeft: number;
  status: QualityStatus;
  reason: string;
}

export interface DispatchLine {
  sku: string;
  productName: string;
  qtyRequested: number;
  allocatedBatches: AllocatedBatch[];
  shortfall: number;
  shortfallReason?: string;
  excludedBatches: ExcludedBatch[];
}

export interface DispatchOrder {
  id: string;
  orderNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerType: CustomerType;
  minShelfLifeDays: number;
  lines: DispatchLine[];
  status: 'Draft' | 'Confirmed' | 'Dispatched';
  totalValue: number;
  dispatchedBy: string;
  notes?: string;
}

export interface OverrideLogEntry {
  id: string;
  date: string;
  orderNumber: string;
  sku: string;
  defaultBatchNo: string;
  chosenBatchNo: string;
  reason: string;
  userName: string;
}

export type WriteOffReason =
  | 'Expired'
  | 'Damaged'
  | 'Quality rejection'
  | 'Returned unsaleable';

export interface WriteOff {
  id: string;
  date: string;
  batchNo: string;
  sku: string;
  productName: string;
  category: ProductCategory;
  qty: number;
  unit: string;
  value: number; // in PKR
  reason: WriteOffReason;
  approvedBy: string;
  notes?: string;
}

export type PurchaseRequestStatus =
  | 'Draft'
  | 'Pending approval'
  | 'Approved'
  | 'Rejected';

export interface AuditTrailEntry {
  date: string;
  action: string;
  user: string;
  notes?: string;
}

export interface PurchaseRequest {
  id: string;
  prNumber: string;
  sku: string;
  productName: string;
  category: ProductCategory;
  requestedQty: number;
  unit: string;
  estimatedCost: number;
  date: string;
  status: PurchaseRequestStatus;
  requestedBy: string;
  approverComment?: string;
  approvedBy?: string;
  auditTrail: AuditTrailEntry[];
  suggestedSupplier?: string;
  poCreated?: boolean;
}

export interface SupplierQuotation {
  id: string;
  sku: string;
  supplier: string;
  city: string;
  pricePerUnit: number; // PKR
  leadTimeDays: number;
  moq: number;
  paymentTerms: string;
  qualityRating: number; // e.g. 4.8 / 5.0
  notes: string;
}

export interface AlertThresholdSettings {
  expiredDays: number; // < 0
  criticalDays: number; // default 7
  highDays: number; // default 14
  warningDays: number; // default 30
  infoDays: number; // default 60
}

export type SuggestedAction =
  | 'Prioritise dispatch'
  | 'Offer discount'
  | 'Transfer to another channel'
  | 'Quarantine for quality check'
  | 'Write off'
  | 'Monitor';

export interface ExpiryAlert {
  id: string;
  batchNo: string;
  sku: string;
  productName: string;
  category: ProductCategory;
  location: string;
  qty: number;
  unit: string;
  value: number;
  expiryDate: string;
  daysLeft: number;
  severity: AlertSeverity;
  qualityStatus: QualityStatus;
  suggestedAction: SuggestedAction;
  status: 'Open' | 'Acknowledged' | 'Resolved';
  assignedTo?: string;
  acknowledgedAt?: string;
}

export interface MonthlySalesHistory {
  sku: string;
  monthlySales: { [monthKey: string]: number }; // e.g. "2025-12": 1450
}

export interface ForecastResult {
  monthKey: string;
  actual: number;
  naive: number;
  movingAverage: number;
  exponentialSmoothing: number;
}

export interface MethodEvaluation {
  methodName: string;
  mae: number;
  mape: number;
  isBest: boolean;
  description: string;
}

export interface ImpactMetrics {
  reportPrepTime: { baseline: number | null; prototype: number | null };
  alertCorrectness: { baseline: number | null; prototype: number | null };
  eligibleBatchAccuracy: { baseline: number | null; prototype: number | null };
  expiryWriteOffValue: { baseline: number | null; prototype: number | null };
}

export interface AccuracyTestResult {
  totalBatchesTested: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  timestamp: string;
}
