import cron from 'node-cron';
import prisma from '../prisma.js';

export async function runExpiryCheckJob() {
  console.log('[Cron Job]: Running daily inventory expiry and FEFO status check...');
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  try {
    // 1. Identify Expired Batches
    const expiredBatches = await prisma.stockBatch.findMany({
      where: {
        expiryDate: { lt: now },
        remainingQty: { gt: 0 },
        status: { not: 'EXPIRED' },
      },
      include: { item: true },
    });

    for (const batch of expiredBatches) {
      await prisma.stockBatch.update({
        where: { id: batch.id },
        data: { status: 'EXPIRED' },
      });

      // Deduplicate alert check
      const existingAlert = await prisma.alert.findFirst({
        where: {
          alertType: 'EXPIRED',
          itemId: batch.itemId,
          referenceId: batch.id,
          isResolved: false,
        },
      });

      if (!existingAlert) {
        await prisma.alert.create({
          data: {
            alertType: 'EXPIRED',
            targetRole: 'STORES_STAFF',
            itemId: batch.itemId,
            referenceId: batch.id,
            referenceType: 'STOCK_BATCH',
            message: `CRITICAL: Batch ${batch.batchNumber} of ${batch.item.name} (${batch.remainingQty} ${batch.item.unit}) has EXPIRED. Quarantined from issuance. Dispose immediately.`,
            severity: 'CRITICAL',
          },
        });
      }
    }

    // 2. Identify Batches Expiring Soon (within 30 days)
    const expiringSoonBatches = await prisma.stockBatch.findMany({
      where: {
        expiryDate: { gte: now, lte: thirtyDaysFromNow },
        remainingQty: { gt: 0 },
        status: 'ACTIVE',
      },
      include: { item: true },
    });

    for (const batch of expiringSoonBatches) {
      await prisma.stockBatch.update({
        where: { id: batch.id },
        data: { status: 'EXPIRING_SOON' },
      });

      const daysLeft = Math.ceil(
        (new Date(batch.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // FR-5.2: Notify Housekeeping Supervisors, Stores Staff, and Procurement Staff
      for (const targetRole of ['HOUSEKEEPING_SUPERVISOR', 'STORES_STAFF', 'PROCUREMENT_STAFF'] as const) {
        const existingAlert = await prisma.alert.findFirst({
          where: {
            alertType: 'EXPIRY_WARNING',
            targetRole,
            itemId: batch.itemId,
            referenceId: batch.id,
            isResolved: false,
          },
        });

        if (!existingAlert) {
          await prisma.alert.create({
            data: {
              alertType: 'EXPIRY_WARNING',
              targetRole,
              itemId: batch.itemId,
              referenceId: batch.id,
              referenceType: 'STOCK_BATCH',
              message: `Approaching Expiry (${daysLeft}d): Batch ${batch.batchNumber} of ${batch.item.name} (${batch.remainingQty} ${batch.item.unit}) expires in ${daysLeft} days. Prioritize via FEFO.`,
              severity: daysLeft <= 7 ? 'CRITICAL' : 'WARNING',
            },
          });
        }
      }
    }

    console.log(
      `[Cron Job Completed]: ${expiredBatches.length} batches quarantined to EXPIRED, ${expiringSoonBatches.length} marked EXPIRING_SOON.`
    );
  } catch (error) {
    console.error('[Cron Job Error]: Failed to run expiry check:', error);
  }
}

export function initExpiryCron() {
  // Run once on startup, then daily at midnight: '0 0 * * *'
  runExpiryCheckJob();
  cron.schedule('0 0 * * *', () => {
    runExpiryCheckJob();
  });
  console.log('[Cron Scheduler]: Expiry monitoring scheduled for daily midnight run.');
}
