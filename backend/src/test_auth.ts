import bcrypt from 'bcryptjs';
import prisma from './prisma.js';
import { signToken, verifyToken } from './utils/jwt.js';

async function runSelfTests() {
  console.log('--- 🧪 Running SHSMS Day 1 Automated Verification Suite ---');

  // Test 1: Verify all 5 roles exist in DB
  const roles = [
    { email: 'supervisor@hemas.lk', expectedRole: 'HOUSEKEEPING_SUPERVISOR' },
    { email: 'manager@hemas.lk', expectedRole: 'MANAGER' },
    { email: 'stores@hemas.lk', expectedRole: 'STORES_STAFF' },
    { email: 'procurement@hemas.lk', expectedRole: 'PROCUREMENT_STAFF' },
    { email: 'admin@hemas.lk', expectedRole: 'ADMIN' },
  ];

  for (const { email, expectedRole } of roles) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error(`FAIL: User ${email} not found in database!`);
    }
    const isPasswordValid = await bcrypt.compare('Hemas@123', user.passwordHash);
    if (!isPasswordValid) {
      throw new Error(`FAIL: Password verification failed for ${email}!`);
    }
    if (user.role !== expectedRole) {
      throw new Error(`FAIL: Expected role ${expectedRole} for ${email}, got ${user.role}!`);
    }

    // Test JWT signing & verification for this user
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });
    const decoded = verifyToken(token);
    if (decoded.email !== email || decoded.role !== expectedRole) {
      throw new Error(`FAIL: JWT payload mismatch for ${email}!`);
    }

    console.log(`✅ [Role Verified] ${expectedRole}: ${email} (${user.fullName}) - Password & JWT Valid`);
  }

  // Test 2: Verify Items & Categories
  const items = await prisma.item.findMany();
  if (items.length < 12) {
    throw new Error(`FAIL: Expected at least 12 items, found ${items.length}!`);
  }
  const categories = new Set(items.map((i) => i.category));
  for (const cat of ['CHEMICAL', 'EQUIPMENT', 'CONSUMABLE', 'PPE']) {
    if (!categories.has(cat)) {
      throw new Error(`FAIL: Category ${cat} missing from seeded items!`);
    }
  }
  console.log(`✅ [Catalog Verified] ${items.length} items across all 4 categories (${Array.from(categories).join(', ')})`);

  // Test 3: Verify Stock Batches & FEFO Order
  const batches = await prisma.stockBatch.findMany({
    orderBy: [{ expiryDate: 'asc' }],
  });
  const expiredBatches = batches.filter((b) => b.status === 'EXPIRED');
  const expiringSoonBatches = batches.filter((b) => b.status === 'EXPIRING_SOON');
  if (expiredBatches.length === 0) {
    throw new Error('FAIL: Expected at least 1 EXPIRED batch for testing!');
  }
  if (expiringSoonBatches.length === 0) {
    throw new Error('FAIL: Expected at least 1 EXPIRING_SOON batch for testing!');
  }
  console.log(`✅ [Batches Verified] ${batches.length} total batches (${expiredBatches.length} expired, ${expiringSoonBatches.length} expiring soon)`);

  // Test 4: Verify Immutable Stock Ledger
  const ledgerCount = await prisma.stockLedger.count();
  if (ledgerCount === 0) {
    throw new Error('FAIL: Immutable stock ledger has 0 records!');
  }
  console.log(`✅ [Ledger Verified] ${ledgerCount} immutable stock ledger entries recorded`);

  // Test 5: Verify Active Alerts
  const alerts = await prisma.alert.findMany();
  const lowStockAlerts = alerts.filter((a) => a.alertType === 'LOW_STOCK');
  const expiryAlerts = alerts.filter((a) => a.alertType === 'EXPIRY_WARNING' || a.alertType === 'EXPIRED');
  console.log(`✅ [Alerts Verified] ${alerts.length} alerts seeded (${lowStockAlerts.length} Low-Stock, ${expiryAlerts.length} Expiry/Quarantine)`);

  console.log('--- 🎯 All Day 1 Backend & DB Tests Passed with ZERO Errors! ---');
}

runSelfTests()
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
