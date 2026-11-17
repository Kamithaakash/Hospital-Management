import { Prisma } from '@prisma/client';

type TxClient = Prisma.TransactionClient;

export function getStartOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Record an immutable audit log entry for accountability (NFR).
 */
export async function recordAuditLog(
  tx: TxClient,
  params: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeData?: unknown;
    afterData?: unknown;
  }
) {
  await tx.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeData: params.beforeData !== undefined ? JSON.stringify(params.beforeData) : null,
      afterData: params.afterData !== undefined ? JSON.stringify(params.afterData) : null,
    },
  });
}

/**
 * Compute total active, non-expired available quantity for an item.
 */
export async function getItemTotalAvailableQty(tx: TxClient, itemId: string): Promise<number> {
  const today = getStartOfToday();
  const batches = await tx.stockBatch.findMany({
    where: {
      itemId,
      remainingQty: { gt: 0 },
      status: { not: 'EXPIRED' },
      OR: [{ expiryDate: null }, { expiryDate: { gte: today } }],
    },
    select: { remainingQty: true },
  });

  return batches.reduce((sum, b) => sum + b.remainingQty, 0);
}

/**
 * Check item stock against reorderPoint and create deduplicated LOW_STOCK alerts
 * targeting both HOUSEKEEPING_SUPERVISOR and PROCUREMENT_STAFF (FR-2.2, FR-2.3, FR-2.4).
 */
export async function checkAndTriggerLowStockAlert(tx: TxClient, itemId: string): Promise<number> {
  const item = await tx.item.findUnique({ where: { id: itemId } });
  if (!item) return 0;

  const totalQty = await getItemTotalAvailableQty(tx, itemId);

  if (totalQty <= item.reorderPoint) {
    const targetRoles = ['HOUSEKEEPING_SUPERVISOR', 'PROCUREMENT_STAFF'] as const;
    const isOut = totalQty === 0;
    const severity = isOut || totalQty <= item.minStockLevel ? 'CRITICAL' : 'WARNING';
    const message = isOut
      ? `OUT OF STOCK: ${item.name} (${item.sku}) has 0 ${item.unit} available. Immediate procurement required.`
      : `Low Stock: ${item.name} (${item.sku}) has ${totalQty} ${item.unit} remaining (Reorder Point: ${item.reorderPoint} ${item.unit}).`;

    for (const targetRole of targetRoles) {
      const existing = await tx.alert.findFirst({
        where: {
          alertType: 'LOW_STOCK',
          targetRole,
          itemId,
          isResolved: false,
        },
      });

      if (!existing) {
        await tx.alert.create({
          data: {
            alertType: 'LOW_STOCK',
            targetRole,
            itemId,
            referenceId: itemId,
            referenceType: 'ITEM',
            message,
            severity,
          },
        });
      }
    }
  }

  return totalQty;
}

/**
 * Resolve active LOW_STOCK alerts if stock has been replenished above reorderPoint (FR-2.4).
 */
export async function resolveLowStockAlertsIfReplenished(tx: TxClient, itemId: string): Promise<number> {
  const item = await tx.item.findUnique({ where: { id: itemId } });
  if (!item) return 0;

  const totalQty = await getItemTotalAvailableQty(tx, itemId);

  if (totalQty > item.reorderPoint) {
    await tx.alert.updateMany({
      where: {
        alertType: 'LOW_STOCK',
        itemId,
        isResolved: false,
      },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  return totalQty;
}

export interface DeductFEFOParams {
  itemId: string;
  quantity: number;
  userId: string;
  referenceType: string;
  referenceId: string;
  notes?: string;
  selectedBatchId?: string;
  overrideReason?: string;
}

/**
 * Deduct stock using FEFO (First Expired, First Out) inside an existing transaction (FR-5.3, FR-1.5).
 * Blocks expired batches and records immutable StockLedger entries.
 */
export async function deductStockFEFO(tx: TxClient, params: DeductFEFOParams) {
  const { itemId, quantity, userId, referenceType, referenceId, notes, selectedBatchId, overrideReason } = params;

  if (quantity <= 0) {
    throw Object.assign(new Error('Issue quantity must be greater than zero.'), { statusCode: 400 });
  }

  const today = getStartOfToday();

  // If a specific batch was requested, validate it is not expired
  if (selectedBatchId) {
    const chosen = await tx.stockBatch.findUnique({ where: { id: selectedBatchId } });
    if (!chosen || chosen.itemId !== itemId) {
      throw Object.assign(new Error('Selected batch not found for this item.'), { statusCode: 404 });
    }
    if (chosen.status === 'EXPIRED' || (chosen.expiryDate && chosen.expiryDate < today)) {
      throw Object.assign(
        new Error(`Batch ${chosen.batchNumber} is EXPIRED and blocked from issuance (FR-5.4).`),
        { statusCode: 400 }
      );
    }
  }

  // Fetch all active non-expired batches sorted by FEFO (earliest expiry first, nulls last)
  const rawBatches = await tx.stockBatch.findMany({
    where: {
      itemId,
      remainingQty: { gt: 0 },
      status: { not: 'EXPIRED' },
      OR: [{ expiryDate: null }, { expiryDate: { gte: today } }],
    },
    orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
  });

  // Sort so batches with expiryDate come before non-expiring (null) batches
  const activeBatches = [...rawBatches].sort((a, b) => {
    if (a.expiryDate && b.expiryDate) {
      return a.expiryDate.getTime() - b.expiryDate.getTime();
    }
    if (a.expiryDate) return -1;
    if (b.expiryDate) return 1;
    return a.receivedDate.getTime() - b.receivedDate.getTime();
  });

  const totalAvailable = activeBatches.reduce((sum, b) => sum + b.remainingQty, 0);
  if (totalAvailable < quantity) {
    throw Object.assign(
      new Error(`Insufficient active non-expired stock. Requested: ${quantity}, Available: ${totalAvailable}.`),
      { statusCode: 400 }
    );
  }

  // Reorder if a non-FEFO batch was explicitly chosen with overrideReason
  let orderedBatches = activeBatches;
  if (selectedBatchId && activeBatches[0]?.id !== selectedBatchId) {
    if (!overrideReason || !overrideReason.trim()) {
      throw Object.assign(
        new Error('An override reason is required when bypassing the recommended FEFO batch.'),
        { statusCode: 400 }
      );
    }
    const chosen = activeBatches.find((b) => b.id === selectedBatchId);
    if (chosen) {
      orderedBatches = [chosen, ...activeBatches.filter((b) => b.id !== selectedBatchId)];
    }
  }

  let remainingToDeduct = quantity;
  let runningTotalBalance = totalAvailable;
  const deductedBatches: Array<{ batchId: string; batchNumber: string; deductedQty: number; expiryDate: Date | null }> = [];

  for (const batch of orderedBatches) {
    if (remainingToDeduct <= 0) break;

    const deductFromBatch = Math.min(batch.remainingQty, remainingToDeduct);
    const newRemaining = batch.remainingQty - deductFromBatch;
    const newStatus = newRemaining === 0 ? 'DEPLETED' : batch.status;

    await tx.stockBatch.update({
      where: { id: batch.id },
      data: {
        remainingQty: newRemaining,
        status: newStatus,
      },
    });

    runningTotalBalance -= deductFromBatch;
    remainingToDeduct -= deductFromBatch;

    const ledgerNote = [
      notes || `FEFO Issue from batch ${batch.batchNumber}`,
      overrideReason ? `FEFO Override: ${overrideReason}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    await tx.stockLedger.create({
      data: {
        itemId,
        batchId: batch.id,
        movementType: 'ISSUE',
        quantityChange: -deductFromBatch,
        balanceAfter: runningTotalBalance,
        referenceType,
        referenceId,
        performedById: userId,
        notes: ledgerNote,
      },
    });

    deductedBatches.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      deductedQty: deductFromBatch,
      expiryDate: batch.expiryDate,
    });
  }

  await checkAndTriggerLowStockAlert(tx, itemId);

  return {
    deductedBatches,
    remainingItemStock: runningTotalBalance,
  };
}
