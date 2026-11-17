import { Router } from 'express';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  verifyDelivery,
} from '../controllers/purchaseOrders.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.get('/', authenticate, getPurchaseOrders);

// Procurement Staff and Admin create Purchase Orders (FR-4.1)
router.post(
  '/',
  authenticate,
  requireRole(['PROCUREMENT_STAFF', 'ADMIN']),
  createPurchaseOrder
);

// Stores Staff and Admin inspect & verify incoming deliveries against PO (FR-4.2 - FR-4.4)
router.post(
  '/:id/verify-delivery',
  authenticate,
  requireRole(['STORES_STAFF', 'ADMIN']),
  verifyDelivery
);

export default router;
