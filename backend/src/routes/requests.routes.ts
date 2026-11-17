import { Router } from 'express';
import {
  getRequests,
  createRequest,
  reviewRequest,
  issueRequest,
  cancelRequest,
} from '../controllers/requests.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.get('/', authenticate, getRequests);

// Only Housekeeping Supervisor and Admin can submit supply requests (FR-3.1)
router.post(
  '/',
  authenticate,
  requireRole(['HOUSEKEEPING_SUPERVISOR', 'ADMIN']),
  createRequest
);

// Only Responsible Manager and Admin can approve/reject supply requests (FR-3.3)
router.patch(
  '/:id/review',
  authenticate,
  requireRole(['MANAGER', 'ADMIN']),
  reviewRequest
);

// Only Stores Staff and Admin can issue approved supplies via FEFO (FR-3.4, FR-5.3)
router.post(
  '/:id/issue',
  authenticate,
  requireRole(['STORES_STAFF', 'ADMIN']),
  issueRequest
);

// Housekeeping Supervisor (owner) or Admin can cancel pending/draft requests (FR-3.5)
router.patch(
  '/:id/cancel',
  authenticate,
  requireRole(['HOUSEKEEPING_SUPERVISOR', 'ADMIN']),
  cancelRequest
);

export default router;
