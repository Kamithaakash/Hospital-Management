import { Router } from 'express';
import { login, getMe, logout, getDemoAccounts } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.get('/demo-accounts', getDemoAccounts);

export default router;
