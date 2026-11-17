import { Router } from 'express';
import {
  getItems,
  getItemById,
  getItemByQR,
  createItem,
  updateItem,
  getItemBatches,
  receiveStock,
  issueStockDirect,
  adjustStock,
  getItemLedger,
  disposeBatch,
} from '../controllers/items.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// All authenticated hospital staff can browse items
router.get('/', authenticate, getItems);

// Lookup item by scanned QR code payload or SKU
router.get('/qr/:code', authenticate, getItemByQR);

// Dispose expired/damaged batch (FR-5.4)
router.post('/batches/:batchId/dispose', authenticate, requireRole(['STORES_STAFF', 'ADMIN']), disposeBatch);

// Fetch item details
router.get('/:id', authenticate, getItemById);

// Fetch item batches sorted by FEFO (expiryDate ASC)
router.get('/:id/batches', authenticate, getItemBatches);

// Fetch item stock ledger history (FR-1.5)
router.get('/:id/ledger', authenticate, getItemLedger);

// Register new item (Stores Staff & Admin only per FR-1.1)
router.post('/', authenticate, requireRole(['STORES_STAFF', 'ADMIN']), createItem);

// Update item thresholds/details (FR-1.1, FR-2.1)
router.patch('/:id', authenticate, requireRole(['STORES_STAFF', 'ADMIN']), updateItem);

// Direct stock receipt, FEFO issue, and manual adjustment (FR-1.2, FR-1.4, FR-5.3)
router.post('/:id/receive', authenticate, requireRole(['STORES_STAFF', 'ADMIN']), receiveStock);
router.post('/:id/issue', authenticate, requireRole(['STORES_STAFF', 'ADMIN']), issueStockDirect);
router.post('/:id/adjust', authenticate, requireRole(['STORES_STAFF', 'ADMIN']), adjustStock);

export default router;
