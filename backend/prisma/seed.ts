import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning up existing database records ---');
  // Order matters for relational integrity
  await prisma.alert.deleteMany();
  await prisma.stockLedger.deleteMany();
  await prisma.deliveryVerification.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.requestItem.deleteMany();
  await prisma.supplyRequest.deleteMany();
  await prisma.stockBatch.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();

  console.log('--- Seeding Users (1 per role) ---');
  const passwordHash = await bcrypt.hash('Hemas@123', 10);

  const supervisor = await prisma.user.create({
    data: {
      fullName: 'Priyani Fernando',
      email: 'supervisor@hemas.lk',
      passwordHash,
      role: 'HOUSEKEEPING_SUPERVISOR',
      department: 'Housekeeping Services',
      isActive: true,
    },
  });

  const manager = await prisma.user.create({
    data: {
      fullName: 'Dr. Anura Perera',
      email: 'manager@hemas.lk',
      passwordHash,
      role: 'MANAGER',
      department: 'Hospital Operations & Administration',
      isActive: true,
    },
  });

  const stores = await prisma.user.create({
    data: {
      fullName: 'Kamal Jayawardena',
      email: 'stores@hemas.lk',
      passwordHash,
      role: 'STORES_STAFF',
      department: 'Central Hospital Stores',
      isActive: true,
    },
  });

  const procurement = await prisma.user.create({
    data: {
      fullName: 'Dilshan Silva',
      email: 'procurement@hemas.lk',
      passwordHash,
      role: 'PROCUREMENT_STAFF',
      department: 'Procurement & Supply Chain',
      isActive: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      fullName: 'System Administrator',
      email: 'admin@hemas.lk',
      passwordHash,
      role: 'ADMIN',
      department: 'IT & Systems Management',
      isActive: true,
    },
  });

  console.log('Created 5 core role users with default password: "Hemas@123"');

  console.log('--- Seeding Items Master (4 categories) ---');
  const itemsData = [
    // 1. Cleaning Chemicals
    {
      sku: 'HEM-CHM-001',
      name: 'Virex II 256 Disinfectant Cleaner',
      description: 'One-step quaternary disinfectant cleaner and deodorant for hospital floors and surfaces',
      category: 'CHEMICAL',
      unit: 'Liters',
      storageLocation: 'Chemical Storage Room Rack C1',
      minStockLevel: 10,
      reorderPoint: 25,
      tracksExpiry: true,
      qrCodeValue: 'SHSMS:ITEM:HEM-CHM-001',
    },
    {
      sku: 'HEM-CHM-002',
      name: 'Sodium Hypochlorite 5% (Hospital Bleach)',
      description: 'Medical grade chlorine disinfectant for blood spill kits and terminal disinfection',
      category: 'CHEMICAL',
      unit: 'Bottles',
      storageLocation: 'Chemical Storage Room Rack C2',
      minStockLevel: 15,
      reorderPoint: 35,
      tracksExpiry: true,
      qrCodeValue: 'SHSMS:ITEM:HEM-CHM-002',
    },
    {
      sku: 'HEM-CHM-003',
      name: 'Multi-Surface Antimicrobial Spray 750ml',
      description: 'Fast-acting spray for high-touch surfaces, bedside rails, and door handles',
      category: 'CHEMICAL',
      unit: 'Bottles',
      storageLocation: 'Chemical Storage Room Rack C3',
      minStockLevel: 20,
      reorderPoint: 40,
      tracksExpiry: true,
      qrCodeValue: 'SHSMS:ITEM:HEM-CHM-003',
    },
    {
      sku: 'HEM-CHM-004',
      name: 'Alcohol Rub Hand Sanitizer 500ml',
      description: '70% Isopropyl alcohol handrub with pump dispenser for ward sanitization points',
      category: 'CHEMICAL',
      unit: 'Bottles',
      storageLocation: 'Main Store Shelf A1',
      minStockLevel: 25,
      reorderPoint: 50,
      tracksExpiry: true,
      qrCodeValue: 'SHSMS:ITEM:HEM-CHM-004',
    },
    // 2. Cleaning Equipment
    {
      sku: 'HEM-EQP-001',
      name: 'Double Bucket Mop Trolley with Downpress Wringer',
      description: 'Color-coded dual bucket system (red/blue) with heavy-duty castors',
      category: 'EQUIPMENT',
      unit: 'Units',
      storageLocation: 'Equipment Bay E1',
      minStockLevel: 2,
      reorderPoint: 4,
      tracksExpiry: false,
      qrCodeValue: 'SHSMS:ITEM:HEM-EQP-001',
    },
    {
      sku: 'HEM-EQP-002',
      name: 'Microfiber Flat Mop System Telescopic',
      description: 'Aluminum handle with 40cm Velcro base for hospital microfiber pads',
      category: 'EQUIPMENT',
      unit: 'Units',
      storageLocation: 'Equipment Bay E2',
      minStockLevel: 5,
      reorderPoint: 10,
      tracksExpiry: false,
      qrCodeValue: 'SHSMS:ITEM:HEM-EQP-002',
    },
    {
      sku: 'HEM-EQP-003',
      name: 'Industrial Wet & Dry Vacuum Cleaner 30L',
      description: 'Stainless steel canister wet & dry vacuum with HEPA filtration',
      category: 'EQUIPMENT',
      unit: 'Units',
      storageLocation: 'Equipment Bay E3',
      minStockLevel: 1,
      reorderPoint: 2,
      tracksExpiry: false,
      qrCodeValue: 'SHSMS:ITEM:HEM-EQP-003',
    },
    // 3. Consumables
    {
      sku: 'HEM-CON-001',
      name: 'Microfiber Cleaning Cloths (10-Pack Color Coded)',
      description: 'High-absorption cloths: Blue (General), Red (Sanitary/Bathrooms), Yellow (Infectious)',
      category: 'CONSUMABLE',
      unit: 'Packs',
      storageLocation: 'Main Store Shelf B2',
      minStockLevel: 15,
      reorderPoint: 30,
      tracksExpiry: false,
      qrCodeValue: 'SHSMS:ITEM:HEM-CON-001',
    },
    {
      sku: 'HEM-CON-002',
      name: 'Biohazard Yellow Clinical Waste Bags 50L (Roll of 50)',
      description: 'Heavy gauge printed infectious clinical waste disposal liners',
      category: 'CONSUMABLE',
      unit: 'Rolls',
      storageLocation: 'Main Store Shelf B3',
      minStockLevel: 20,
      reorderPoint: 45,
      tracksExpiry: false,
      qrCodeValue: 'SHSMS:ITEM:HEM-CON-002',
    },
    {
      sku: 'HEM-CON-003',
      name: 'C-Fold Ultra-Dry Paper Hand Towels (Box of 2400)',
      description: 'Interfolded 2-ply soft paper hand towels for hospital dispenser units',
      category: 'CONSUMABLE',
      unit: 'Boxes',
      storageLocation: 'Main Store Shelf B1',
      minStockLevel: 10,
      reorderPoint: 25,
      tracksExpiry: false,
      qrCodeValue: 'SHSMS:ITEM:HEM-CON-003',
    },
    // 4. PPE
    {
      sku: 'HEM-PPE-001',
      name: 'Nitrile Examination Medical Gloves - Medium (Box of 100)',
      description: 'Powder-free, non-sterile blue nitrile examination gloves, medical grade',
      category: 'PPE',
      unit: 'Boxes',
      storageLocation: 'PPE Store Rack P1',
      minStockLevel: 30,
      reorderPoint: 70, // seeded with 45 units total -> triggers LOW_STOCK!
      tracksExpiry: true,
      qrCodeValue: 'SHSMS:ITEM:HEM-PPE-001',
    },
    {
      sku: 'HEM-PPE-002',
      name: 'N95 Particulate Respirator Masks (Box of 20)',
      description: 'NIOSH approved particulate respirator masks with foam nose seal',
      category: 'PPE',
      unit: 'Boxes',
      storageLocation: 'PPE Store Rack P2',
      minStockLevel: 20,
      reorderPoint: 40,
      tracksExpiry: true,
      qrCodeValue: 'SHSMS:ITEM:HEM-PPE-002',
    },
    {
      sku: 'HEM-PPE-003',
      name: 'Heavy-Duty Chemical Resistant Aprons',
      description: 'Waterproof PVC/rubber bib aprons for chemical dispensing and deep cleaning',
      category: 'PPE',
      unit: 'Units',
      storageLocation: 'PPE Store Rack P3',
      minStockLevel: 5,
      reorderPoint: 12,
      tracksExpiry: false,
      qrCodeValue: 'SHSMS:ITEM:HEM-PPE-003',
    },
    {
      sku: 'HEM-PPE-004',
      name: 'Anti-Fog Splash Protection Face Shields',
      description: 'Full-face coverage transparent visor with adjustable elastic headband',
      category: 'PPE',
      unit: 'Units',
      storageLocation: 'PPE Store Rack P4',
      minStockLevel: 10,
      reorderPoint: 25,
      tracksExpiry: false,
      qrCodeValue: 'SHSMS:ITEM:HEM-PPE-004',
    },
  ];

  const createdItems = new Map<string, any>();
  for (const item of itemsData) {
    const created = await prisma.item.create({ data: item });
    createdItems.set(item.sku, created);
  }
  console.log(`Created ${createdItems.size} items in catalog`);

  console.log('--- Seeding Stock Batches with FEFO & Expiry Scenarios ---');
  const now = new Date();
  const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Define batches:
  // Includes:
  // - Staggered FEFO batches (earliest expiry first)
  // - 1 batch expiring within 8-25 days (triggers EXPIRY_WARNING)
  // - 1 batch expired 15 days ago (triggers EXPIRED / quarantine)
  // - 1 item with total stock below reorder point (triggers LOW_STOCK)
  const batchesData = [
    // Virex II 256: 2 batches (FEFO test)
    {
      sku: 'HEM-CHM-001',
      batchNumber: 'VRX-2026-B01',
      initialQty: 20,
      remainingQty: 12,
      expiryDate: daysFromNow(22), // Expiring in 22 days -> EXPIRING_SOON
      receivedDate: daysFromNow(-60),
      status: 'EXPIRING_SOON',
    },
    {
      sku: 'HEM-CHM-001',
      batchNumber: 'VRX-2026-B02',
      initialQty: 30,
      remainingQty: 30,
      expiryDate: daysFromNow(210), // Expiring in 7 months -> ACTIVE (second in FEFO)
      receivedDate: daysFromNow(-10),
      status: 'ACTIVE',
    },

    // Bleach 5%: 3 batches (Expired + Active FEFO)
    {
      sku: 'HEM-CHM-002',
      batchNumber: 'BLC-2025-X09',
      initialQty: 15,
      remainingQty: 5,
      expiryDate: daysFromNow(-15), // Expired 15 days ago! -> EXPIRED
      receivedDate: daysFromNow(-180),
      status: 'EXPIRED',
    },
    {
      sku: 'HEM-CHM-002',
      batchNumber: 'BLC-2026-A11',
      initialQty: 25,
      remainingQty: 20,
      expiryDate: daysFromNow(50), // Active, 1st FEFO candidate
      receivedDate: daysFromNow(-40),
      status: 'ACTIVE',
    },
    {
      sku: 'HEM-CHM-002',
      batchNumber: 'BLC-2026-A12',
      initialQty: 35,
      remainingQty: 35,
      expiryDate: daysFromNow(160), // Active, 2nd FEFO candidate
      receivedDate: daysFromNow(-5),
      status: 'ACTIVE',
    },

    // Spray 750ml: 1 active batch
    {
      sku: 'HEM-CHM-003',
      batchNumber: 'AMS-2026-08',
      initialQty: 60,
      remainingQty: 55,
      expiryDate: daysFromNow(300),
      receivedDate: daysFromNow(-14),
      status: 'ACTIVE',
    },

    // Hand Sanitizer: 2 batches (1 expiring in 7 days, 1 active)
    {
      sku: 'HEM-CHM-004',
      batchNumber: 'SAN-2026-W03',
      initialQty: 30,
      remainingQty: 10,
      expiryDate: daysFromNow(7), // Expiring in 7 days! Critical warning
      receivedDate: daysFromNow(-90),
      status: 'EXPIRING_SOON',
    },
    {
      sku: 'HEM-CHM-004',
      batchNumber: 'SAN-2026-W04',
      initialQty: 60,
      remainingQty: 60,
      expiryDate: daysFromNow(180),
      receivedDate: daysFromNow(-15),
      status: 'ACTIVE',
    },

    // Equipment (non-expiry)
    {
      sku: 'HEM-EQP-001',
      batchNumber: 'TRL-EQP-2026',
      initialQty: 5,
      remainingQty: 4,
      expiryDate: null,
      receivedDate: daysFromNow(-120),
      status: 'ACTIVE',
    },
    {
      sku: 'HEM-EQP-002',
      batchNumber: 'FLM-EQP-2026',
      initialQty: 15,
      remainingQty: 12,
      expiryDate: null,
      receivedDate: daysFromNow(-90),
      status: 'ACTIVE',
    },
    {
      sku: 'HEM-EQP-003',
      batchNumber: 'VAC-EQP-2026',
      initialQty: 3,
      remainingQty: 3,
      expiryDate: null,
      receivedDate: daysFromNow(-30),
      status: 'ACTIVE',
    },

    // Consumables (non-expiry)
    {
      sku: 'HEM-CON-001',
      batchNumber: 'CLT-2026-C01',
      initialQty: 50,
      remainingQty: 45,
      expiryDate: null,
      receivedDate: daysFromNow(-45),
      status: 'ACTIVE',
    },
    {
      sku: 'HEM-CON-002',
      batchNumber: 'BIO-2026-Y02',
      initialQty: 60,
      remainingQty: 50,
      expiryDate: null,
      receivedDate: daysFromNow(-30),
      status: 'ACTIVE',
    },
    {
      sku: 'HEM-CON-003',
      batchNumber: 'TWL-2026-P01',
      initialQty: 40,
      remainingQty: 35,
      expiryDate: null,
      receivedDate: daysFromNow(-20),
      status: 'ACTIVE',
    },

    // PPE: Nitrile Gloves (LOW STOCK SCENARIO: ROP = 70, remaining = 45!)
    {
      sku: 'HEM-PPE-001',
      batchNumber: 'GLV-2025-MED',
      initialQty: 100,
      remainingQty: 45, // total 45 <= ROP 70 -> LOW_STOCK!
      expiryDate: daysFromNow(240),
      receivedDate: daysFromNow(-120),
      status: 'ACTIVE',
    },
    // N95 Masks: 2 batches (FEFO)
    {
      sku: 'HEM-PPE-002',
      batchNumber: 'N95-2026-01',
      initialQty: 40,
      remainingQty: 25,
      expiryDate: daysFromNow(90),
      receivedDate: daysFromNow(-40),
      status: 'ACTIVE',
    },
    {
      sku: 'HEM-PPE-002',
      batchNumber: 'N95-2026-02',
      initialQty: 50,
      remainingQty: 50,
      expiryDate: daysFromNow(365),
      receivedDate: daysFromNow(-10),
      status: 'ACTIVE',
    },
    // Rubber Aprons
    {
      sku: 'HEM-PPE-003',
      batchNumber: 'APR-2026-01',
      initialQty: 20,
      remainingQty: 18,
      expiryDate: null,
      receivedDate: daysFromNow(-60),
      status: 'ACTIVE',
    },
    // Face Shields
    {
      sku: 'HEM-PPE-004',
      batchNumber: 'FSD-2026-01',
      initialQty: 30,
      remainingQty: 28,
      expiryDate: null,
      receivedDate: daysFromNow(-60),
      status: 'ACTIVE',
    },
  ];

  console.log('--- Writing Batches and Immutable Stock Ledger Entries ---');
  for (const b of batchesData) {
    const item = createdItems.get(b.sku);
    if (!item) continue;

    const batch = await prisma.stockBatch.create({
      data: {
        itemId: item.id,
        batchNumber: b.batchNumber,
        initialQty: b.initialQty,
        remainingQty: b.remainingQty,
        expiryDate: b.expiryDate,
        receivedDate: b.receivedDate,
        status: b.status,
      },
    });

    // Immutable Stock Ledger for initial receipt
    await prisma.stockLedger.create({
      data: {
        itemId: item.id,
        batchId: batch.id,
        movementType: 'RECEIPT',
        quantityChange: b.initialQty,
        balanceAfter: b.initialQty,
        referenceType: 'INITIAL_STOCK',
        referenceId: batch.id,
        performedById: stores.id,
        notes: `Initial stock intake for batch ${b.batchNumber}`,
        createdAt: b.receivedDate,
      },
    });

    // If remaining < initial, record the historical issue
    if (b.initialQty > b.remainingQty) {
      const issued = b.initialQty - b.remainingQty;
      await prisma.stockLedger.create({
        data: {
          itemId: item.id,
          batchId: batch.id,
          movementType: 'ISSUE',
          quantityChange: -issued,
          balanceAfter: b.remainingQty,
          referenceType: 'HISTORICAL_DISPATCH',
          referenceId: batch.id,
          performedById: stores.id,
          notes: `Routine ward replenishment dispatch from batch ${b.batchNumber}`,
          createdAt: daysFromNow(-5),
        },
      });
    }
  }

  console.log('--- Seeding Alerts ---');
  // 1. LOW_STOCK alert for Nitrile Gloves (ROP: 70, Available: 45)
  const nitrileGloves = createdItems.get('HEM-PPE-001');
  await prisma.alert.create({
    data: {
      alertType: 'LOW_STOCK',
      targetRole: 'PROCUREMENT_STAFF',
      itemId: nitrileGloves.id,
      message: `Low Stock Alert: Nitrile Examination Gloves - Medium has 45 Boxes remaining (Reorder Point: 70). Reorder replenishment required.`,
      severity: 'WARNING',
      isResolved: false,
    },
  });
  await prisma.alert.create({
    data: {
      alertType: 'LOW_STOCK',
      targetRole: 'HOUSEKEEPING_SUPERVISOR',
      itemId: nitrileGloves.id,
      message: `Stock Advisory: Nitrile Examination Gloves - Medium is at 45 Boxes (below reorder threshold). Please conserve stock for high-risk procedures.`,
      severity: 'WARNING',
      isResolved: false,
    },
  });

  // 2. EXPIRY_WARNING alert for Hand Sanitizer (expires in 7 days)
  const handSanitizer = createdItems.get('HEM-CHM-004');
  await prisma.alert.create({
    data: {
      alertType: 'EXPIRY_WARNING',
      targetRole: 'STORES_STAFF',
      itemId: handSanitizer.id,
      message: `Approaching Expiry Warning: Alcohol Rub Hand Sanitizer 500ml (Batch SAN-2026-W03, 10 units) expires in 7 days. Prioritize FEFO issuance immediately.`,
      severity: 'CRITICAL',
      isResolved: false,
    },
  });

  // 3. EXPIRED alert for Bleach (expired 15 days ago)
  const bleach = createdItems.get('HEM-CHM-002');
  await prisma.alert.create({
    data: {
      alertType: 'EXPIRED',
      targetRole: 'STORES_STAFF',
      itemId: bleach.id,
      message: `Expired Stock Quarantined: Sodium Hypochlorite 5% (Batch BLC-2025-X09, 5 units) expired on ${daysFromNow(-15).toLocaleDateString()}. Blocked from issuance. Wastage disposal required.`,
      severity: 'CRITICAL',
      isResolved: false,
    },
  });

  console.log('--- Seeding Sample Supply Request (Pending Manager Approval) ---');
  const reqVirex = createdItems.get('HEM-CHM-001');
  const reqCloths = createdItems.get('HEM-CON-001');
  const supplyRequest = await prisma.supplyRequest.create({
    data: {
      requestCode: 'REQ-202611-001',
      requestedById: supervisor.id,
      targetArea: 'ICU Ward 3 & Surgical High Dependency Unit',
      purpose: 'Daily terminal disinfection and weekend deep-clean schedule',
      urgency: 'URGENT',
      status: 'PENDING',
      notes: 'High patient turnover expected this weekend. Urgent supply required.',
      items: {
        create: [
          {
            itemId: reqVirex.id,
            requestedQty: 4,
            approvedQty: 0,
            issuedQty: 0,
          },
          {
            itemId: reqCloths.id,
            requestedQty: 5,
            approvedQty: 0,
            issuedQty: 0,
          },
        ],
      },
    },
  });

  // Alert for Manager: Approval Needed
  await prisma.alert.create({
    data: {
      alertType: 'APPROVAL_NEEDED',
      targetRole: 'MANAGER',
      referenceId: supplyRequest.id,
      referenceType: 'SUPPLY_REQUEST',
      message: `Pending Approval: Housekeeping Supervisor Priyani Fernando submitted urgent Supply Request REQ-202611-001 for ICU Ward 3.`,
      severity: 'INFO',
      isResolved: false,
    },
  });

  console.log('--- Seeding Sample Purchase Order (Ready for Delivery Inspection) ---');
  const poBleach = createdItems.get('HEM-CHM-002');
  const poGloves = createdItems.get('HEM-PPE-001');
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-001',
      supplierName: 'Lanka Health Supplies (Pvt) Ltd',
      createdById: procurement.id,
      expectedDate: daysFromNow(2),
      status: 'OPEN',
      totalCost: 145000.0,
      notes: 'Urgent restocking order for bleach disinfectant and medium nitrile examination gloves',
      items: {
        create: [
          {
            itemId: poBleach.id,
            orderedQty: 50,
            receivedQty: 0,
            unitPrice: 850.0,
          },
          {
            itemId: poGloves.id,
            orderedQty: 100,
            receivedQty: 0,
            unitPrice: 1025.0,
          },
        ],
      },
    },
  });

  console.log('=====================================================');
  console.log('SHSMS Database seeded successfully for Hemas Hospital!');
  console.log('Demo Accounts:');
  console.log('  1. Supervisor:  supervisor@hemas.lk  / Hemas@123');
  console.log('  2. Manager:     manager@hemas.lk     / Hemas@123');
  console.log('  3. Stores:      stores@hemas.lk      / Hemas@123');
  console.log('  4. Procurement: procurement@hemas.lk / Hemas@123');
  console.log('  5. Admin:       admin@hemas.lk       / Hemas@123');
  console.log('=====================================================');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
