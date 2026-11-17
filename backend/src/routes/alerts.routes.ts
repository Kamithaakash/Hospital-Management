import { Router } from 'express';
import { getAlerts, resolveAlert } from '../controllers/alerts.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getAlerts);
router.patch('/:id/resolve', authenticate, resolveAlert);

export default router;
