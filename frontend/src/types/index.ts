export type UserRole =
  | 'HOUSEKEEPING_SUPERVISOR'
  | 'MANAGER'
  | 'STORES_STAFF'
  | 'PROCUREMENT_STAFF'
  | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
}

export type ItemCategory = 'CHEMICAL' | 'EQUIPMENT' | 'CONSUMABLE' | 'PPE';

export interface StockBatch {
  id: string;
  itemId: string;
  batchNumber: string;
  initialQty: number;
  remainingQty: number;
  expiryDate: string | null;
  receivedDate: string;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'DEPLETED';
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  fefoStatus?: 'FEFO_RECOMMENDED' | 'ELIGIBLE' | 'BLOCKED_EXPIRED' | 'DEPLETED';
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: ItemCategory;
  unit: string;
  storageLocation: string;
  minStockLevel: number;
  reorderPoint: number;
  tracksExpiry: boolean;
  qrCodeValue: string;
  batches?: StockBatch[];
  totalStock?: number;
  totalAllStock?: number;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  hasExpiringSoon?: boolean;
  hasExpired?: boolean;
  batchCount?: number;
}

export interface Alert {
  id: string;
  alertType: 'LOW_STOCK' | 'EXPIRY_WARNING' | 'EXPIRED' | 'DISCREPANCY' | 'APPROVAL_NEEDED';
  targetRole: string;
  itemId?: string;
  item?: {
    sku: string;
    name: string;
    category: ItemCategory;
    storageLocation: string;
  };
  referenceId?: string;
  referenceType?: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  isResolved: boolean;
  createdAt: string;
}

export interface RequestItem {
  id: string;
  itemId: string;
  item: Item;
  requestedQty: number;
  approvedQty: number;
  issuedQty: number;
}

export interface SupplyRequest {
  id: string;
  requestCode: string;
  requestedById: string;
  requestedBy: {
    fullName: string;
    role: string;
    department?: string;
  };
  targetArea: string;
  purpose: string;
  urgency: 'NORMAL' | 'URGENT';
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIALLY_ISSUED' | 'FULFILLED' | 'CANCELLED';
  reviewedById?: string;
  reviewedBy?: {
    fullName: string;
    role: string;
  };
  reviewedAt?: string;
  rejectionReason?: string;
  notes?: string;
  items: RequestItem[];
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  itemId: string;
  item: Item;
  orderedQty: number;
  receivedQty: number;
  unitPrice?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  createdById: string;
  createdBy: {
    fullName: string;
    role: string;
  };
  expectedDate?: string;
  status: 'OPEN' | 'PARTIALLY_RECEIVED' | 'VERIFIED' | 'DISCREPANCY_FLAGGED';
  totalCost?: number;
  notes?: string;
  items: PurchaseOrderItem[];
  deliveries?: any[];
  createdAt: string;
}
