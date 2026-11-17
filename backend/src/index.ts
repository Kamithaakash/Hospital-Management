import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import itemsRoutes from './routes/items.routes.js';
import alertsRoutes from './routes/alerts.routes.js';
import requestsRoutes from './routes/requests.routes.js';
import purchaseOrdersRoutes from './routes/purchaseOrders.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import { initExpiryCron } from './cron/expiryCheck.js';

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: '*', // Allow all in dev / frontend dev server
    credentials: true,
  })
);
app.use(express.json());

// Request logger in development
app.use((req, res, next) => {
  if (config.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    system: 'Hemas Hospital SHSMS API',
    hospital: 'Hemas Hospital, Thalawathugoda',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/reports', reportsRoutes);

// Global Error Handler
app.use(errorHandler);

// Start server
const server = app.listen(config.PORT, () => {
  console.log('================================================================');
  console.log(`🏥 SHSMS Backend running at: http://localhost:${config.PORT}`);
  console.log(`🏥 Organization: Hemas Hospital, Thalawathugoda`);
  console.log(`🏥 Environment: ${config.NODE_ENV}`);
  console.log('================================================================');

  // Initialize background cron jobs
  initExpiryCron();
});

export default app;
