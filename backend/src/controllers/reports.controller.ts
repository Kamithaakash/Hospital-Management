import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getStartOfToday } from '../services/inventory.service.js';

function parseDateRange(startDate?: unknown, endDate?: unknown) {
  const start = startDate ? new Date(String(startDate)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(String(endDate)) : new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * FR-6.1 Real-Time Stock Availability Report
 */
export async function getStockAvailabilityReport(req: AuthenticatedRequest, res: Response) {
  try {
    const { category } = req.query;
    const today = getStartOfToday();

    const items = await prisma.item.findMany({
      where: category && category !== 'ALL' ? { category: String(category) } : undefined,
      include: {
        batches: {
          where: { remainingQty: { gt: 0 } },
          orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });

    const rows = items.map((item) => {
      const usableBatches = item.batches.filter(
        (b) => b.status !== 'EXPIRED' && (!b.expiryDate || new Date(b.expiryDate) >= today)
      );
      const expiredBatches = item.batches.filter(
        (b) => b.status === 'EXPIRED' || (b.expiryDate && new Date(b.expiryDate) < today)
      );

      const availableQty = usableBatches.reduce((s, b) => s + b.remainingQty, 0);
      const expiredQty = expiredBatches.reduce((s, b) => s + b.remainingQty, 0);

      let status = 'IN_STOCK';
      if (availableQty === 0) status = 'OUT_OF_STOCK';
      else if (availableQty <= item.reorderPoint) status = 'LOW_STOCK';

      return {
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        unit: item.unit,
        storageLocation: item.storageLocation,
        availableQty,
        expiredQty,
        minStockLevel: item.minStockLevel,
        reorderPoint: item.reorderPoint,
        status,
        activeBatchCount: usableBatches.length,
        earliestExpiry: usableBatches.find((b) => b.expiryDate)?.expiryDate || null,
      };
    });

    return res.status(200).json({ success: true, report: rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error generating availability report.' });
  }
}

/**
 * FR-6.2 Monthly / Date-Range Consumption Report
 */
export async function getConsumptionReport(req: AuthenticatedRequest, res: Response) {
  try {
    const { startDate, endDate, category } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);

    const ledgerEntries = await prisma.stockLedger.findMany({
      where: {
        movementType: 'ISSUE',
        createdAt: { gte: start, lte: end },
        ...(category && category !== 'ALL' ? { item: { category: String(category) } } : {}),
      },
      include: {
        item: { select: { sku: true, name: true, category: true, unit: true } },
        performedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate by item
    const byItemMap = new Map<string, any>();
    for (const entry of ledgerEntries) {
      const qty = Math.abs(entry.quantityChange);
      const existing = byItemMap.get(entry.itemId);
      if (existing) {
        existing.totalConsumed += qty;
        existing.issueCount += 1;
      } else {
        byItemMap.set(entry.itemId, {
          itemId: entry.itemId,
          sku: entry.item.sku,
          name: entry.item.name,
          category: entry.item.category,
          unit: entry.item.unit,
          totalConsumed: qty,
          issueCount: 1,
        });
      }
    }

    return res.status(200).json({
      success: true,
      report: Array.from(byItemMap.values()),
      transactions: ledgerEntries.map((e) => ({
        id: e.id,
        date: e.createdAt,
        sku: e.item.sku,
        itemName: e.item.name,
        category: e.item.category,
        quantity: Math.abs(e.quantityChange),
        unit: e.item.unit,
        performedBy: e.performedBy.fullName,
        notes: e.notes,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error generating consumption report.' });
  }
}

/**
 * FR-6.3 Stock Shortages & Emergency Procurement Report
 */
export async function getShortagesReport(req: AuthenticatedRequest, res: Response) {
  try {
    const { startDate, endDate, category } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);

    const alerts = await prisma.alert.findMany({
      where: {
        alertType: 'LOW_STOCK',
        createdAt: { gte: start, lte: end },
        ...(category && category !== 'ALL' ? { item: { category: String(category) } } : {}),
      },
      include: {
        item: { select: { sku: true, name: true, category: true, unit: true, reorderPoint: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = alerts.map((a) => ({
      alertId: a.id,
      date: a.createdAt,
      sku: a.item?.sku || '-',
      itemName: a.item?.name || 'Supply Request Shortage',
      category: a.item?.category || '-',
      severity: a.severity,
      message: a.message,
      status: a.isResolved ? 'RESOLVED' : 'ACTIVE',
      resolvedAt: a.resolvedAt,
    }));

    return res.status(200).json({ success: true, report: rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error generating shortages report.' });
  }
}

/**
 * FR-6.4 Procurement & Delivery Performance Report
 */
export async function getProcurementPerformanceReport(req: AuthenticatedRequest, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);

    const pos = await prisma.purchaseOrder.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: {
        items: true,
        deliveries: true,
        createdBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = pos.map((po) => {
      const totalOrdered = po.items.reduce((s, i) => s + i.orderedQty, 0);
      const totalAccepted = po.items.reduce((s, i) => s + i.receivedQty, 0);
      const discrepancyCount = po.deliveries.filter((d) => d.condition !== 'GOOD' || d.discrepancyNote).length;
      const latestDelivery = po.deliveries.length
        ? po.deliveries.reduce((latest, d) => (d.verifiedAt > latest ? d.verifiedAt : latest), po.deliveries[0].verifiedAt)
        : null;

      let deliveryTimeliness = 'PENDING';
      if (latestDelivery && po.expectedDate) {
        deliveryTimeliness = latestDelivery <= po.expectedDate ? 'ON_TIME' : 'DELAYED';
      } else if (latestDelivery) {
        deliveryTimeliness = 'DELIVERED';
      }

      return {
        poId: po.id,
        poNumber: po.poNumber,
        supplierName: po.supplierName,
        createdBy: po.createdBy.fullName,
        createdAt: po.createdAt,
        expectedDate: po.expectedDate,
        status: po.status,
        totalOrdered,
        totalAccepted,
        discrepancyCount,
        deliveryTimeliness,
      };
    });

    return res.status(200).json({ success: true, report: rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error generating procurement report.' });
  }
}

/**
 * FR-6.5 Material Wastage Report
 */
export async function getWastageReport(req: AuthenticatedRequest, res: Response) {
  try {
    const { startDate, endDate, category } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);

    const wastageEntries = await prisma.stockLedger.findMany({
      where: {
        movementType: 'WASTAGE',
        createdAt: { gte: start, lte: end },
        ...(category && category !== 'ALL' ? { item: { category: String(category) } } : {}),
      },
      include: {
        item: { select: { sku: true, name: true, category: true, unit: true } },
        batch: { select: { batchNumber: true, expiryDate: true } },
        performedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const damagedDeliveries = await prisma.deliveryVerification.findMany({
      where: {
        condition: { not: 'GOOD' },
        verifiedAt: { gte: start, lte: end },
        ...(category && category !== 'ALL' ? { item: { category: String(category) } } : {}),
      },
      include: {
        item: { select: { sku: true, name: true, category: true, unit: true } },
        purchaseOrder: { select: { poNumber: true, supplierName: true } },
        verifiedBy: { select: { fullName: true } },
      },
      orderBy: { verifiedAt: 'desc' },
    });

    const rows = [
      ...wastageEntries.map((w) => ({
        id: w.id,
        date: w.createdAt,
        source: 'BATCH_DISPOSAL',
        sku: w.item.sku,
        itemName: w.item.name,
        category: w.item.category,
        quantity: Math.abs(w.quantityChange),
        unit: w.item.unit,
        reference: w.batch?.batchNumber || '-',
        reason: w.notes || 'Expired / Wastage disposal',
        recordedBy: w.performedBy.fullName,
      })),
      ...damagedDeliveries.map((d) => ({
        id: d.id,
        date: d.verifiedAt,
        source: `DELIVERY_${d.condition}`,
        sku: d.item.sku,
        itemName: d.item.name,
        category: d.item.category,
        quantity: d.receivedQty,
        unit: d.item.unit,
        reference: d.purchaseOrder.poNumber,
        reason: d.discrepancyNote || `Rejected delivery (${d.condition})`,
        recordedBy: d.verifiedBy.fullName,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.status(200).json({ success: true, report: rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error generating wastage report.' });
  }
}
