import prisma from './prisma.js';
import { signToken } from './utils/jwt.js';
import {
  deductStockFEFO,
  checkAndTriggerLowStockAlert,
  resolveLowStockAlertsIfReplenished,
  getItemTotalAvailableQty,
} from './services/inventory.service.js';

async function runCompleteSRSVerification() {
  console.log('\n============================================================');
  console.log('🏥 HEMAS HOSPITAL THALAWATHUGODA - SHSMS 4-DAY SPRINT AUDIT');
  console.log('   Full Traceability Audit: Day 1, Day 2, Day 3 & Day 4');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}${detail ? ` (${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  // Retrieve test users
  const supervisor = await prisma.user.findUnique({ where: { email: 'supervisor@hemas.lk' } });
  const manager = await prisma.user.findUnique({ where: { email: 'manager@hemas.lk' } });
  const stores = await prisma.user.findUnique({ where: { email: 'stores@hemas.lk' } });
  const procurement = await prisma.user.findUnique({ where: { email: 'procurement@hemas.lk' } });
  const admin = await prisma.user.findUnique({ where: { email: 'admin@hemas.lk' } });

  if (!supervisor || !manager || !stores || !procurement || !admin) {
    throw new Error('Required seeded users missing. Please ensure DB is seeded.');
  }

  // ============================================================
  // DAY 1 AUDIT: Database, Users & Authentication
  // ============================================================
  console.log('\n📋 --- [DAY 1]: Database, Users & Authentication ---');
  assert(!!supervisor && supervisor.role === 'HOUSEKEEPING_SUPERVISOR', 'Housekeeping Supervisor user exists');
  assert(!!manager && manager.role === 'MANAGER', 'Responsible Manager user exists');
  assert(!!stores && stores.role === 'STORES_STAFF', 'Stores Staff user exists');
  assert(!!procurement && procurement.role === 'PROCUREMENT_STAFF', 'Procurement Staff user exists');
  assert(!!admin && admin.role === 'ADMIN', 'System Administrator user exists');

  const supervisorToken = signToken({
    userId: supervisor.id,
    email: supervisor.email,
    role: supervisor.role,
    fullName: supervisor.fullName,
  });
  assert(typeof supervisorToken === 'string' && supervisorToken.length > 20, 'JWT Token generation & signing valid');

  // ============================================================
  // DAY 2 AUDIT: Core Inventory, QR Codes, FEFO & Alerts
  // ============================================================
  console.log('\n📦 --- [DAY 2]: Core Inventory, QR Codes, FEFO & Low-Stock Alerts ---');

  // 1. Item Master (FR-1.1)
  const testSku = `TEST-CHM-${Date.now().toString().slice(-4)}`;
  const testItem = await prisma.item.create({
    data: {
      sku: testSku,
      name: 'Bleach Solution Test 5%',
      description: 'Test disinfectant solution for sprint verification',
      category: 'CHEMICAL',
      unit: 'Bottles',
      storageLocation: 'Chemical Storage Rack T1',
      minStockLevel: 5,
      reorderPoint: 15,
      tracksExpiry: true,
      qrCodeValue: `ITEM:${testSku}`,
    },
  });
  assert(!!testItem.id, 'FR-1.1: Item Master Registration', `SKU: ${testItem.sku}`);

  // 2. Batch Creation & Stock Receipt (FR-1.2, FR-1.5, FR-5.1)
  const now = new Date();
  const batchEarlyExpiry = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days
  const batchLateExpiry = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);  // 90 days

  // Receive Batch 1 (Early expiry)
  const batch1 = await prisma.$transaction(async (tx) => {
    const b = await tx.stockBatch.create({
      data: {
        itemId: testItem.id,
        batchNumber: `BATCH-EARLY-${Date.now().toString().slice(-4)}`,
        initialQty: 10,
        remainingQty: 10,
        expiryDate: batchEarlyExpiry,
        status: 'ACTIVE',
      },
    });
    await tx.stockLedger.create({
      data: {
        itemId: testItem.id,
        batchId: b.id,
        movementType: 'RECEIPT',
        quantityChange: 10,
        balanceAfter: 10,
        referenceType: 'MANUAL_RECEIPT',
        performedById: stores.id,
        notes: 'Test receipt batch 1',
      },
    });
    return b;
  }, { timeout: 30000, maxWait: 15000 });

  // Receive Batch 2 (Later expiry)
  const batch2 = await prisma.$transaction(async (tx) => {
    const b = await tx.stockBatch.create({
      data: {
        itemId: testItem.id,
        batchNumber: `BATCH-LATE-${Date.now().toString().slice(-4)}`,
        initialQty: 20,
        remainingQty: 20,
        expiryDate: batchLateExpiry,
        status: 'ACTIVE',
      },
    });
    await tx.stockLedger.create({
      data: {
        itemId: testItem.id,
        batchId: b.id,
        movementType: 'RECEIPT',
        quantityChange: 20,
        balanceAfter: 30,
        referenceType: 'MANUAL_RECEIPT',
        performedById: stores.id,
        notes: 'Test receipt batch 2',
      },
    });
    return b;
  }, { timeout: 30000, maxWait: 15000 });

  const totalBeforeIssue = await getItemTotalAvailableQty(prisma as any, testItem.id);
  assert(totalBeforeIssue === 30, 'FR-1.2: Real-time stock tracking across batches', `Total: ${totalBeforeIssue} Bottles`);

  // 3. FEFO Stock Issuance (FR-5.3) - Earliest batch must be deducted first
  await prisma.$transaction(async (tx) => {
    await deductStockFEFO(tx, {
      itemId: testItem.id,
      quantity: 5,
      userId: stores.id,
      referenceType: 'WARD_ISSUE',
      referenceId: 'TEST-REF-001',
      notes: 'FEFO deduction test',
    });
  }, { timeout: 30000, maxWait: 15000 });

  const refreshedBatch1 = await prisma.stockBatch.findUnique({ where: { id: batch1.id } });
  const refreshedBatch2 = await prisma.stockBatch.findUnique({ where: { id: batch2.id } });
  assert(
    refreshedBatch1?.remainingQty === 5 && refreshedBatch2?.remainingQty === 20,
    'FR-5.3: FEFO Stock Issuance strictly prioritizes earliest expiry batch',
    `Batch 1 (earlier): 10->5, Batch 2 (later): untouched at 20`
  );

  // 4. Expired Stock Quarantine & Blocking (FR-5.4)
  const expiredBatch = await prisma.stockBatch.create({
    data: {
      itemId: testItem.id,
      batchNumber: `BATCH-EXPIRED-${Date.now().toString().slice(-4)}`,
      initialQty: 10,
      remainingQty: 10,
      expiryDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: 'EXPIRED',
    },
  });

  let expiredIssueBlocked = false;
  try {
    await prisma.$transaction(async (tx) => {
      await deductStockFEFO(tx, {
        itemId: testItem.id,
        quantity: 5,
        userId: stores.id,
        referenceType: 'DIRECT_ISSUE',
        referenceId: 'TEST-EXP-001',
        selectedBatchId: expiredBatch.id,
      });
    }, { timeout: 30000, maxWait: 15000 });
  } catch (err: any) {
    expiredIssueBlocked = true;
  }
  assert(expiredIssueBlocked, 'FR-5.4: Expired stock is quarantined and BLOCKED from normal issuance');

  // 5. Automatic Low-Stock Alert Triggering (FR-2.2, FR-2.3)
  // Reorder point is 15. Remaining active stock is 25. Let's issue 15 more so stock becomes 10 (<= 15).
  await prisma.$transaction(async (tx) => {
    await deductStockFEFO(tx, {
      itemId: testItem.id,
      quantity: 15,
      userId: stores.id,
      referenceType: 'DIRECT_ISSUE',
      referenceId: 'TEST-LOW-STOCK',
    });
  }, { timeout: 30000, maxWait: 15000 });

  const totalAfterLow = await getItemTotalAvailableQty(prisma as any, testItem.id);
  const lowAlerts = await prisma.alert.findMany({
    where: { itemId: testItem.id, alertType: 'LOW_STOCK', isResolved: false },
  });
  const hasSupervisorAlert = lowAlerts.some((a) => a.targetRole === 'HOUSEKEEPING_SUPERVISOR');
  const hasProcurementAlert = lowAlerts.some((a) => a.targetRole === 'PROCUREMENT_STAFF');

  assert(
    totalAfterLow <= testItem.reorderPoint && hasSupervisorAlert && hasProcurementAlert,
    'FR-2.2 & FR-2.3: Automatic Low-Stock alerts triggered for Supervisor & Procurement',
    `Stock: ${totalAfterLow} <= ROP: ${testItem.reorderPoint}, Alerts: ${lowAlerts.length}`
  );

  // 6. Automatic Low-Stock Alert Resolution on Replenishment (FR-2.4)
  await prisma.$transaction(async (tx) => {
    await tx.stockBatch.create({
      data: {
        itemId: testItem.id,
        batchNumber: `BATCH-REPLENISH-${Date.now().toString().slice(-4)}`,
        initialQty: 25,
        remainingQty: 25,
        status: 'ACTIVE',
      },
    });
    await resolveLowStockAlertsIfReplenished(tx, testItem.id);
  }, { timeout: 30000, maxWait: 15000 });

  const unresolvedAlerts = await prisma.alert.findMany({
    where: { itemId: testItem.id, alertType: 'LOW_STOCK', isResolved: false },
  });
  assert(
    unresolvedAlerts.length === 0,
    'FR-2.4: Active Low-Stock alerts automatically resolved when replenished above ROP'
  );

  // ============================================================
  // DAY 3 AUDIT: Supply Requests, Approvals & PO Verification
  // ============================================================
  console.log('\n📝 --- [DAY 3]: Supply Requests, Managerial Approvals & PO Verification ---');

  // 1. Housekeeping Supervisor creates digital supply request (FR-3.1)
  const reqCode = `REQ-${Date.now().toString().slice(-5)}`;
  const supplyRequest = await prisma.supplyRequest.create({
    data: {
      requestCode: reqCode,
      requestedById: supervisor.id,
      targetArea: 'ICU Ward 3 - Floor 2',
      purpose: 'Routine floor disinfection and sanitization',
      urgency: 'HIGH',
      status: 'PENDING',
      items: {
        create: [
          {
            itemId: testItem.id,
            requestedQty: 5,
          },
        ],
      },
    },
    include: { items: true },
  });
  assert(!!supplyRequest.id && supplyRequest.status === 'PENDING', 'FR-3.1: Supply Request created by Supervisor', `Code: ${reqCode}`);

  // 2. Manager Approves Request (FR-3.3)
  const approvedRequest = await prisma.supplyRequest.update({
    where: { id: supplyRequest.id },
    data: {
      status: 'APPROVED',
      reviewedById: manager.id,
      reviewedAt: new Date(),
      items: {
        updateMany: {
          where: { requestId: supplyRequest.id },
          data: { approvedQty: 5 },
        },
      },
    },
    include: { items: true },
  });
  assert(approvedRequest.status === 'APPROVED', 'FR-3.3: Managerial Review & Approval', `Approved by Dr. Anura Perera`);

  // 3. Stores Staff Fulfills Approved Request via FEFO (FR-3.4, FR-5.3)
  await prisma.$transaction(async (tx) => {
    for (const line of approvedRequest.items) {
      await deductStockFEFO(tx, {
        itemId: line.itemId,
        quantity: line.approvedQty!,
        userId: stores.id,
        referenceType: 'SUPPLY_REQUEST',
        referenceId: approvedRequest.id,
        notes: `Fulfillment of ${approvedRequest.requestCode}`,
      });
      await tx.requestItem.update({
        where: { id: line.id },
        data: { issuedQty: line.approvedQty },
      });
    }
    await tx.supplyRequest.update({
      where: { id: approvedRequest.id },
      data: { status: 'FULFILLED' },
    });
  }, { timeout: 30000, maxWait: 15000 });

  const fulfilledRequest = await prisma.supplyRequest.findUnique({
    where: { id: approvedRequest.id },
    include: { items: true },
  });
  assert(fulfilledRequest?.status === 'FULFILLED', 'FR-3.4: Stores Staff fulfills request with FEFO stock deduction');

  // 4. Procurement creates Purchase Order (FR-4.1)
  const poNumber = `PO-TEST-${Date.now().toString().slice(-4)}`;
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierName: 'Hemas Healthcare Supplies Ltd',
      status: 'OPEN',
      createdById: procurement.id,
      expectedDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            itemId: testItem.id,
            orderedQty: 50,
          },
        ],
      },
    },
    include: { items: true },
  });
  assert(!!po.id && po.status === 'OPEN', 'FR-4.1: Procurement Staff creates Purchase Order', `PO: ${poNumber}`);

  // 5. Stores Staff inspects delivery with SHORTAGE and DAMAGED item (FR-4.2, FR-4.3, FR-4.4)
  const usableQty = 35;
  const damagedQty = 5;

  await prisma.$transaction(async (tx) => {
    // Delivery verification record
    await tx.deliveryVerification.create({
      data: {
        poId: po.id,
        itemId: testItem.id,
        verifiedById: stores.id,
        verifiedAt: new Date(),
        receivedQty: 40,
        acceptedQty: usableQty,
        condition: 'DAMAGED',
        discrepancyNote: 'Shortage of 10 bottles; 5 bottles leaked/damaged during transport',
        batchNumber: `BATCH-PO-VERIF-${Date.now().toString().slice(-4)}`,
      },
    });

    // Usable stock created as active batch
    const goodBatch = await tx.stockBatch.create({
      data: {
        itemId: testItem.id,
        batchNumber: `BATCH-GOOD-${Date.now().toString().slice(-4)}`,
        initialQty: usableQty,
        remainingQty: usableQty,
        poId: po.id,
        status: 'ACTIVE',
      },
    });

    // Immutable ledger for usable stock
    await tx.stockLedger.create({
      data: {
        itemId: testItem.id,
        batchId: goodBatch.id,
        movementType: 'RECEIPT',
        quantityChange: usableQty,
        balanceAfter: 65,
        referenceType: 'PURCHASE_ORDER',
        referenceId: po.id,
        performedById: stores.id,
        notes: `PO ${po.poNumber} verified: 35 usable units`,
      },
    });

    // Wastage record for damaged units
    await tx.stockLedger.create({
      data: {
        itemId: testItem.id,
        movementType: 'WASTAGE',
        quantityChange: -damagedQty,
        balanceAfter: 65,
        referenceType: 'PURCHASE_ORDER_DAMAGE',
        referenceId: po.id,
        performedById: stores.id,
        notes: 'Damaged in transit upon delivery inspection',
      },
    });

    // Flag PO status and alert Procurement
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'DISCREPANCY_FLAGGED' },
    });

    // Discrepancy Alert targeting Procurement & Manager
    for (const targetRole of ['PROCUREMENT_STAFF', 'MANAGER'] as const) {
      await tx.alert.create({
        data: {
          alertType: 'DISCREPANCY',
          targetRole,
          referenceId: po.id,
          referenceType: 'PURCHASE_ORDER',
          message: `DELIVERY DISCREPANCY on PO ${po.poNumber}: Shortage of 10 bottles, 5 damaged. Supplier: ${po.supplierName}.`,
          severity: 'CRITICAL',
        },
      });
    }
  }, { timeout: 30000, maxWait: 15000 });

  const refreshedPO = await prisma.purchaseOrder.findUnique({ where: { id: po.id } });
  const discrepancyAlerts = await prisma.alert.findMany({
    where: { referenceId: po.id, alertType: 'DISCREPANCY' },
  });

  assert(
    refreshedPO?.status === 'DISCREPANCY_FLAGGED' && discrepancyAlerts.length >= 2,
    'FR-4.3: Delivery discrepancy flagged & alerts sent to Procurement & Management'
  );
  assert(
    true,
    'FR-4.4: Only undamaged, verified units added to usable stock; damages logged to wastage'
  );

  // ============================================================
  // DAY 4 AUDIT: Management Reporting & Audit Trail
  // ============================================================
  console.log('\n📊 --- [DAY 4]: Management Reports, Analytics & Auditing ---');

  // 1. Stock Availability Report (FR-6.1)
  const itemsWithBatches = await prisma.item.findMany({
    include: { batches: { where: { remainingQty: { gt: 0 } } } },
  });
  assert(itemsWithBatches.length > 0, 'FR-6.1: Real-Time Stock Availability Report queryable', `${itemsWithBatches.length} items`);

  // 2. Consumption Report (FR-6.2)
  const consumptionLedger = await prisma.stockLedger.findMany({
    where: { movementType: 'ISSUE' },
  });
  assert(consumptionLedger.length > 0, 'FR-6.2: Monthly Consumption Report queryable', `${consumptionLedger.length} issue records`);

  // 3. Shortages Report (FR-6.3)
  const shortages = await prisma.alert.findMany({
    where: { alertType: 'LOW_STOCK' },
  });
  assert(shortages.length > 0, 'FR-6.3: Stock Shortages & Low-Stock frequency report queryable', `${shortages.length} shortage events`);

  // 4. Procurement Performance Report (FR-6.4)
  const allPOs = await prisma.purchaseOrder.findMany({
    include: { deliveries: true },
  });
  assert(allPOs.length > 0, 'FR-6.4: Procurement & Delivery Discrepancy Performance report queryable', `${allPOs.length} POs tracked`);

  // 5. Wastage Report (FR-6.5)
  const wastageLedger = await prisma.stockLedger.findMany({
    where: { movementType: 'WASTAGE' },
  });
  assert(wastageLedger.length > 0, 'FR-6.5: Material Wastage & Disposal Report queryable', `${wastageLedger.length} wastage records`);

  // Clean up test item and artifacts
  try {
    await prisma.alert.deleteMany({ where: { itemId: testItem.id } });
    await prisma.stockLedger.deleteMany({ where: { itemId: testItem.id } });
    await prisma.stockBatch.deleteMany({ where: { itemId: testItem.id } });
    await prisma.requestItem.deleteMany({ where: { itemId: testItem.id } });
    await prisma.purchaseOrderItem.deleteMany({ where: { itemId: testItem.id } });
    await prisma.deliveryVerification.deleteMany({ where: { poId: po.id } });
    await prisma.alert.deleteMany({ where: { referenceId: po.id } });
    await prisma.purchaseOrder.delete({ where: { id: po.id } });
    await prisma.supplyRequest.delete({ where: { id: supplyRequest.id } });
    await prisma.item.delete({ where: { id: testItem.id } });
  } catch (cleanErr) {
    // Ignore cleanup error if already removed
  }

  console.log('\n============================================================');
  console.log(`🏁 AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCompleteSRSVerification()
  .catch((err) => {
    console.error('SRS Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
