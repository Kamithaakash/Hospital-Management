import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  checkAndTriggerLowStockAlert,
  deductStockFEFO,
  getItemTotalAvailableQty,
  getStartOfToday,
  recordAuditLog,
  resolveLowStockAlertsIfReplenished,
} from '../services/inventory.service.js';

export async function getItems(req: AuthenticatedRequest, res: Response) {
  try {
    const { category, search } = req.query;

    const whereClause: any = {};
    if (category && category !== 'ALL') {
      whereClause.category = String(category);
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: String(search) } },
        { sku: { contains: String(search) } },
        { storageLocation: { contains: String(search) } },
      ];
    }

    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        batches: {
          orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();

    const itemsWithMetrics = items.map((item) => {
      // Calculate total available quantity (only active / expiring_soon non-expired batches)
      const usableBatches = item.batches.filter((b) => {
        const isExpired = b.expiryDate && new Date(b.expiryDate) < now;
        return !isExpired && b.status !== 'EXPIRED' && b.remainingQty > 0;
      });

      const totalUsableStock = usableBatches.reduce((acc, b) => acc + b.remainingQty, 0);
      const totalAllStock = item.batches.reduce((acc, b) => acc + b.remainingQty, 0);

      const hasExpiringSoon = item.batches.some(
        (b) => b.status === 'EXPIRING_SOON' && b.remainingQty > 0
      );
      const hasExpired = item.batches.some(
        (b) => (b.status === 'EXPIRED' || (b.expiryDate && new Date(b.expiryDate) < now)) && b.remainingQty > 0
      );

      let stockStatus = 'IN_STOCK';
      if (totalUsableStock === 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (totalUsableStock <= item.reorderPoint) {
        stockStatus = 'LOW_STOCK';
      }

      return {
        ...item,
        totalStock: totalUsableStock,
        totalAllStock,
        stockStatus,
        hasExpiringSoon,
        hasExpired,
        batchCount: item.batches.length,
      };
    });

    return res.status(200).json({
      success: true,
      items: itemsWithMetrics,
    });
  } catch (error: any) {
    console.error('getItems error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving items.' });
  }
}

export async function getItemById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const now = new Date();

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        batches: {
          orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
        },
        ledgerEntries: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            performedBy: {
              select: { fullName: true, role: true },
            },
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const totalStock = item.batches
      .filter((b) => {
        const isExpired = b.expiryDate && new Date(b.expiryDate) < now;
        return !isExpired && b.status !== 'EXPIRED' && b.remainingQty > 0;
      })
      .reduce((acc, b) => acc + b.remainingQty, 0);

    return res.status(200).json({
      success: true,
      item: {
        ...item,
        totalStock,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error retrieving item.' });
  }
}

export async function getItemByQR(req: AuthenticatedRequest, res: Response) {
  try {
    const { code } = req.params;
    const decodedCode = decodeURIComponent(code).trim();
    const now = new Date();

    // Support both QR payload (SHSMS:ITEM:HEM-CHM-001) and raw SKU (HEM-CHM-001)
    const item = await prisma.item.findFirst({
      where: {
        OR: [
          { qrCodeValue: decodedCode },
          { sku: decodedCode },
          { qrCodeValue: `SHSMS:ITEM:${decodedCode}` },
        ],
      },
      include: {
        batches: {
          orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `No item found matching QR code / SKU "${decodedCode}".`,
      });
    }

    const totalStock = item.batches
      .filter((b) => {
        const isExpired = b.expiryDate && new Date(b.expiryDate) < now;
        return !isExpired && b.status !== 'EXPIRED' && b.remainingQty > 0;
      })
      .reduce((acc, b) => acc + b.remainingQty, 0);

    return res.status(200).json({
      success: true,
      item: {
        ...item,
        totalStock,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error during QR lookup.' });
  }
}

export async function createItem(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      sku,
      name,
      description,
      category,
      unit,
      storageLocation,
      minStockLevel,
      reorderPoint,
      tracksExpiry,
    } = req.body;

    if (!sku || !name || !category || !unit || !storageLocation) {
      return res.status(400).json({
        success: false,
        message: 'Missing mandatory fields: SKU, Name, Category, Unit, and Storage Location.',
      });
    }

    const existingSku = await prisma.item.findUnique({
      where: { sku: sku.trim().toUpperCase() },
    });
    if (existingSku) {
      return res.status(409).json({
        success: false,
        message: `An item with SKU "${sku}" already exists.`,
      });
    }

    const qrCodeValue = `SHSMS:ITEM:${sku.trim().toUpperCase()}`;

    const newItem = await prisma.item.create({
      data: {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim(),
        category,
        unit,
        storageLocation: storageLocation.trim(),
        minStockLevel: Number(minStockLevel) || 0,
        reorderPoint: Number(reorderPoint) || 0,
        tracksExpiry: Boolean(tracksExpiry),
        qrCodeValue,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Item registered successfully.',
      item: newItem,
    });
  } catch (error: any) {
    console.error('createItem error:', error);
    return res.status(500).json({ success: false, message: 'Server error registering item.' });
  }
}

export async function getItemBatches(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const now = new Date();

    // FEFO order: earliest expiry date first; nulls last, then receivedDate asc
    const batches = await prisma.stockBatch.findMany({
      where: { itemId: id },
      orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
    });

    // Tag each batch with FEFO status
    let fefoRecommendedFound = false;
    const annotatedBatches = batches.map((b) => {
      const isExpired = b.expiryDate && new Date(b.expiryDate) < now;
      const isExpiringSoon =
        !isExpired &&
        b.expiryDate &&
        new Date(b.expiryDate).getTime() - now.getTime() <= 30 * 24 * 60 * 60 * 1000;

      let fefoStatus = 'ELIGIBLE';
      if (isExpired) {
        fefoStatus = 'BLOCKED_EXPIRED';
      } else if (b.remainingQty === 0) {
        fefoStatus = 'DEPLETED';
      } else if (!fefoRecommendedFound) {
        fefoStatus = 'FEFO_RECOMMENDED';
        fefoRecommendedFound = true;
      }

      return {
        ...b,
        isExpired,
        isExpiringSoon,
        fefoStatus,
      };
    });

    return res.status(200).json({
      success: true,
      batches: annotatedBatches,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error retrieving batches.' });
  }
}

export async function updateItem(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, category, unit, storageLocation, minStockLevel, reorderPoint, tracksExpiry } = req.body;

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.item.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name: String(name).trim() } : {}),
          ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
          ...(category !== undefined ? { category } : {}),
          ...(unit !== undefined ? { unit: String(unit).trim() } : {}),
          ...(storageLocation !== undefined ? { storageLocation: String(storageLocation).trim() } : {}),
          ...(minStockLevel !== undefined ? { minStockLevel: Number(minStockLevel) } : {}),
          ...(reorderPoint !== undefined ? { reorderPoint: Number(reorderPoint) } : {}),
          ...(tracksExpiry !== undefined ? { tracksExpiry: Boolean(tracksExpiry) } : {}),
        },
      });

      await recordAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'UPDATE_ITEM',
        entityType: 'ITEM',
        entityId: id,
        beforeData: existing,
        afterData: item,
      });

      await checkAndTriggerLowStockAlert(tx, id);
      await resolveLowStockAlertsIfReplenished(tx, id);

      return item;
    });

    return res.status(200).json({
      success: true,
      message: 'Item updated successfully.',
      item: updated,
    });
  } catch (error: any) {
    console.error('updateItem error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating item.' });
  }
}

export async function receiveStock(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { batchNumber, quantity, expiryDate, notes } = req.body;

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be greater than zero.' });
    }

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    if (item.tracksExpiry && !expiryDate) {
      return res.status(400).json({
        success: false,
        message: `Expiry date is required for expiry-tracked item "${item.name}".`,
      });
    }

    const parsedExpiry = expiryDate ? new Date(expiryDate) : null;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let initialStatus = 'ACTIVE';
    if (parsedExpiry) {
      if (parsedExpiry < getStartOfToday()) initialStatus = 'EXPIRED';
      else if (parsedExpiry <= thirtyDaysFromNow) initialStatus = 'EXPIRING_SOON';
    }

    const generatedBatchNo =
      batchNumber && String(batchNumber).trim()
        ? String(batchNumber).trim()
        : `BAT-${item.sku}-${Date.now().toString().slice(-6)}`;

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.stockBatch.create({
        data: {
          itemId: id,
          batchNumber: generatedBatchNo,
          initialQty: qty,
          remainingQty: qty,
          expiryDate: parsedExpiry,
          status: initialStatus,
        },
      });

      const newBalance = await getItemTotalAvailableQty(tx, id);

      await tx.stockLedger.create({
        data: {
          itemId: id,
          batchId: batch.id,
          movementType: 'RECEIPT',
          quantityChange: qty,
          balanceAfter: newBalance,
          referenceType: 'MANUAL_RECEIPT',
          referenceId: batch.id,
          performedById: req.user!.userId,
          notes: notes || `Direct stock receipt: Batch ${generatedBatchNo}`,
        },
      });

      await recordAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'RECEIVE_STOCK',
        entityType: 'STOCK_BATCH',
        entityId: batch.id,
        afterData: batch,
      });

      await resolveLowStockAlertsIfReplenished(tx, id);

      return { batch, newBalance };
    });

    return res.status(201).json({
      success: true,
      message: `Received ${qty} ${item.unit} into batch ${result.batch.batchNumber}.`,
      batch: result.batch,
      totalStock: result.newBalance,
    });
  } catch (error: any) {
    console.error('receiveStock error:', error);
    return res.status(500).json({ success: false, message: 'Server error receiving stock.' });
  }
}

export async function issueStockDirect(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { quantity, purpose, selectedBatchId, overrideReason } = req.body;
    const qty = Number(quantity);

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const deduction = await deductStockFEFO(tx, {
        itemId: id,
        quantity: qty,
        userId: req.user!.userId,
        referenceType: 'QR_DIRECT_ISSUE',
        referenceId: id,
        notes: purpose ? `Direct Issue: ${purpose}` : 'Direct QR Scan Issue',
        selectedBatchId,
        overrideReason,
      });

      await recordAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'ISSUE_STOCK',
        entityType: 'ITEM',
        entityId: id,
        afterData: { quantity: qty, purpose, ...deduction },
      });

      return deduction;
    });

    return res.status(200).json({
      success: true,
      message: `Issued ${qty} ${item.unit} of ${item.name} via FEFO.`,
      ...result,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Server error issuing stock.',
    });
  }
}

export async function adjustStock(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { batchId, quantityChange, reason } = req.body;
    const delta = Number(quantityChange);

    if (!delta || !reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Both non-zero quantityChange and adjustment reason are required.',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.stockBatch.findUnique({ where: { id: batchId } });
      if (!batch || batch.itemId !== id) {
        throw Object.assign(new Error('Batch not found for this item.'), { statusCode: 404 });
      }

      const newQty = batch.remainingQty + delta;
      if (newQty < 0) {
        throw Object.assign(new Error('Adjustment would result in negative batch quantity.'), { statusCode: 400 });
      }

      const updatedBatch = await tx.stockBatch.update({
        where: { id: batchId },
        data: {
          remainingQty: newQty,
          status: newQty === 0 ? 'DEPLETED' : batch.status === 'DEPLETED' ? 'ACTIVE' : batch.status,
        },
      });

      const newBalance = await getItemTotalAvailableQty(tx, id);

      await tx.stockLedger.create({
        data: {
          itemId: id,
          batchId,
          movementType: 'ADJUSTMENT',
          quantityChange: delta,
          balanceAfter: newBalance,
          referenceType: 'MANUAL_ADJUSTMENT',
          referenceId: batchId,
          performedById: req.user!.userId,
          notes: String(reason).trim(),
        },
      });

      await recordAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'ADJUST_STOCK',
        entityType: 'STOCK_BATCH',
        entityId: batchId,
        beforeData: { remainingQty: batch.remainingQty },
        afterData: { remainingQty: newQty, reason },
      });

      if (delta < 0) {
        await checkAndTriggerLowStockAlert(tx, id);
      } else {
        await resolveLowStockAlertsIfReplenished(tx, id);
      }

      return { updatedBatch, newBalance };
    });

    return res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully.',
      batch: result.updatedBatch,
      totalStock: result.newBalance,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Server error adjusting stock.' });
  }
}

export async function getItemLedger(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const entries = await prisma.stockLedger.findMany({
      where: { itemId: id },
      include: {
        batch: { select: { batchNumber: true, expiryDate: true } },
        performedBy: { select: { fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.status(200).json({ success: true, ledger: entries });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error retrieving stock ledger.' });
  }
}

export async function disposeBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const { batchId } = req.params;
    const { reason } = req.body;

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        message: 'A formal disposal or wastage reason is required.',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.stockBatch.findUnique({
        where: { id: batchId },
        include: { item: true },
      });

      if (!batch) {
        throw Object.assign(new Error('Batch not found.'), { statusCode: 404 });
      }
      if (batch.remainingQty <= 0) {
        throw Object.assign(new Error('Batch has no remaining quantity to dispose.'), { statusCode: 400 });
      }

      const disposedQty = batch.remainingQty;

      const updatedBatch = await tx.stockBatch.update({
        where: { id: batchId },
        data: {
          remainingQty: 0,
          status: 'DEPLETED',
        },
      });

      const newBalance = await getItemTotalAvailableQty(tx, batch.itemId);

      await tx.stockLedger.create({
        data: {
          itemId: batch.itemId,
          batchId: batch.id,
          movementType: 'WASTAGE',
          quantityChange: -disposedQty,
          balanceAfter: newBalance,
          referenceType: 'EXPIRY_DISPOSAL',
          referenceId: batch.id,
          performedById: req.user!.userId,
          notes: `Disposed (${batch.status}): ${String(reason).trim()}`,
        },
      });

      // Resolve any EXPIRED / EXPIRY_WARNING alerts for this batch
      await tx.alert.updateMany({
        where: {
          referenceId: batch.id,
          referenceType: 'STOCK_BATCH',
          isResolved: false,
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      });

      await recordAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'DISPOSE_BATCH',
        entityType: 'STOCK_BATCH',
        entityId: batch.id,
        beforeData: { remainingQty: disposedQty, status: batch.status },
        afterData: { remainingQty: 0, status: 'DEPLETED', reason },
      });

      await checkAndTriggerLowStockAlert(tx, batch.itemId);

      return { updatedBatch, disposedQty, item: batch.item, newBalance };
    });

    return res.status(200).json({
      success: true,
      message: `Disposed ${result.disposedQty} ${result.item.unit} from batch ${result.updatedBatch.batchNumber} and logged to wastage.`,
      batch: result.updatedBatch,
      totalStock: result.newBalance,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Server error disposing batch.' });
  }
}
