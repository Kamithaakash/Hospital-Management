import { Router } from 'express';
import {
  getStockAvailabilityReport,
  getConsumptionReport,
  getShortagesReport,
  getProcurementPerformanceReport,
  getWastageReport,
} from '../controllers/reports.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/stock-availability', authenticate, getStockAvailabilityReport);
router.get('/consumption', authenticate, getConsumptionReport);
router.get('/shortages', authenticate, getShortagesReport);
router.get('/procurement-performance', authenticate, getProcurementPerformanceReport);
router.get('/wastage', authenticate, getWastageReport);

export default router;
