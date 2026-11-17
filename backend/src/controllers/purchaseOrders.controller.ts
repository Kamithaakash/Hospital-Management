import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  getItemTotalAvailableQty,
  getStartOfToday,
  recordAuditLog,
  resolveLowStockAlertsIfReplenished,
} from '../services/inventory.service.js';

export async function getPurchaseOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const { status } = req.query;
    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = String(status);
    }

    const pos = await prisma.purchaseOrder.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: { fullName: true, role: true },
        },
        items: {
          include: {
            item: {
              select: { sku: true, name: true, category: true, unit: true, tracksExpiry: true },
            },
          },
        },
        deliveries: {
          include: {
            verifiedBy: {
              select: { fullName: true, role: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      purchaseOrders: pos,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error retrieving POs.' });
  }
}

export async function createPurchaseOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { supplierName, expectedDate, items, notes, totalCost } = req.body;

    if (!supplierName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name and at least one line item are required.',
      });
    }

    const count = await prisma.purchaseOrder.count();
    const year = new Date().getFullYear();
    const poNumber = `PO-${year}-${String(count + 1).padStart(3, '0')}`;

    const newPO = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierName: supplierName.trim(),
        createdById: userId!,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        status: 'OPEN',
        totalCost: totalCost ? Number(totalCost) : null,
        notes: notes?.trim(),
        items: {
          create: items.map((it: any) => ({
            itemId: it.itemId,
            orderedQty: Number(it.orderedQty) || 1,
            unitPrice: it.unitPrice ? Number(it.unitPrice) : null,
          })),
        },
      },
      include: {
        items: {
          include: { item: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Purchase order created successfully.',
      purchaseOrder: newPO,
    });
  } catch (error: any) {
    console.error('createPurchaseOrder error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating PO.' });
  }
}

export async function verifyDelivery(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { deliveries } = req.body; // [{ poItemId, receivedQty, condition, batchNumber?, expiryDate?, discrepancyNote? }]

    if (!Array.isArray(deliveries) || deliveries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one delivery inspection line is required.',
      });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: { include: { item: true } },
      },
    });

    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    if (po.status === 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: `Purchase order ${po.poNumber} is already fully verified.`,
      });
    }

    const validConditions = ['GOOD', 'DAMAGED', 'DEFECTIVE', 'WRONG_ITEM'];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      let hasAnyDiscrepancy = false;
      const verificationRecords = [];
      const discrepancyMessages: string[] = [];

      for (const line of deliveries) {
        const poLine = po.items.find((pi) => pi.id === line.poItemId || pi.itemId === line.itemId);
        if (!poLine) {
          throw Object.assign(new Error('PO line item not found.'), { statusCode: 404 });
        }

        const receivedQty = Number(line.receivedQty);
        const condition = String(line.condition || 'GOOD').toUpperCase();

        if (isNaN(receivedQty) || receivedQty < 0) {
          throw Object.assign(new Error(`Invalid received quantity for ${poLine.item.name}.`), { statusCode: 400 });
        }
        if (!validConditions.includes(condition)) {
          throw Object.assign(new Error(`Invalid item condition "${condition}".`), { statusCode: 400 });
        }

        const totalReceivedAfter = poLine.receivedQty + (condition === 'GOOD' ? receivedQty : 0);
        const isShortageOrOver = receivedQty !== poLine.orderedQty && totalReceivedAfter !== poLine.orderedQty;
        const isBadCondition = condition !== 'GOOD';
        const lineHasDiscrepancy = isShortageOrOver || isBadCondition;

        if (lineHasDiscrepancy && (!line.discrepancyNote || !String(line.discrepancyNote).trim())) {
          throw Object.assign(
            new Error(
              `Discrepancy note is required for ${poLine.item.name} (Ordered: ${poLine.orderedQty}, Received: ${receivedQty}, Condition: ${condition}).`
            ),
            { statusCode: 400 }
          );
        }

        if (condition === 'GOOD' && receivedQty > 0 && poLine.item.tracksExpiry && !line.expiryDate) {
          throw Object.assign(
            new Error(`Expiry date is required for expiry-tracked item ${poLine.item.name} (FR-5.1).`),
            { statusCode: 400 }
          );
        }

        const acceptedQty = condition === 'GOOD' ? receivedQty : 0;
        const parsedExpiry = line.expiryDate ? new Date(line.expiryDate) : null;
        const batchNumber =
          line.batchNumber && String(line.batchNumber).trim()
            ? String(line.batchNumber).trim()
            : `PO-${po.poNumber}-${poLine.item.sku.slice(-3)}-${Date.now().toString().slice(-4)}`;

        const verification = await tx.deliveryVerification.create({
          data: {
            poId: po.id,
            itemId: poLine.itemId,
            verifiedById: req.user!.userId,
            receivedQty,
            acceptedQty,
            condition,
            batchNumber: acceptedQty > 0 ? batchNumber : null,
            expiryDate: parsedExpiry,
            discrepancyNote: line.discrepancyNote ? String(line.discrepancyNote).trim() : null,
          },
        });
        verificationRecords.push(verification);

        // Only GOOD units are added to usable inventory & StockLedger (FR-4.4)
        if (acceptedQty > 0) {
          let batchStatus = 'ACTIVE';
          if (parsedExpiry) {
            if (parsedExpiry < getStartOfToday()) batchStatus = 'EXPIRED';
            else if (parsedExpiry <= thirtyDaysFromNow) batchStatus = 'EXPIRING_SOON';
          }

          const batch = await tx.stockBatch.create({
            data: {
              itemId: poLine.itemId,
              batchNumber,
              initialQty: acceptedQty,
              remainingQty: acceptedQty,
              expiryDate: parsedExpiry,
              poId: po.id,
              status: batchStatus,
            },
          });

          await tx.purchaseOrderItem.update({
            where: { id: poLine.id },
            data: { receivedQty: poLine.receivedQty + acceptedQty },
          });

          const newBalance = await getItemTotalAvailableQty(tx, poLine.itemId);

          await tx.stockLedger.create({
            data: {
              itemId: poLine.itemId,
              batchId: batch.id,
              movementType: 'RECEIPT',
              quantityChange: acceptedQty,
              balanceAfter: newBalance,
              referenceType: 'PURCHASE_ORDER',
              referenceId: po.id,
              performedById: req.user!.userId,
              notes: `PO ${po.poNumber} verified delivery (${batchNumber})`,
            },
          });

          await resolveLowStockAlertsIfReplenished(tx, poLine.itemId);
        }

        if (lineHasDiscrepancy) {
          hasAnyDiscrepancy = true;
          discrepancyMessages.push(
            `${poLine.item.name}: Ordered ${poLine.orderedQty}, Received ${receivedQty} (${condition}) — ${line.discrepancyNote}`
          );
        }
      }

      // Determine updated PO status
      const updatedPOLines = await tx.purchaseOrderItem.findMany({ where: { poId: po.id } });
      const allOrderedReceived = updatedPOLines.every((li) => li.receivedQty >= li.orderedQty);

      let newPOStatus = 'PARTIALLY_RECEIVED';
      if (hasAnyDiscrepancy) {
        newPOStatus = 'DISCREPANCY_FLAGGED';
      } else if (allOrderedReceived) {
        newPOStatus = 'VERIFIED';
      }

      const updatedPO = await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: newPOStatus },
        include: {
          items: { include: { item: true } },
          deliveries: true,
        },
      });

      // Notify Procurement Staff and Responsible Manager on discrepancy (FR-4.3)
      if (hasAnyDiscrepancy) {
        const alertMsg = `Delivery Discrepancy on ${po.poNumber} (${po.supplierName}): ${discrepancyMessages.join('; ')}`;
        for (const role of ['PROCUREMENT_STAFF', 'MANAGER'] as const) {
          await tx.alert.create({
            data: {
              alertType: 'DISCREPANCY',
              targetRole: role,
              referenceId: po.id,
              referenceType: 'PURCHASE_ORDER',
              message: alertMsg,
              severity: 'CRITICAL',
            },
          });
        }
      }

      await recordAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'VERIFY_DELIVERY',
        entityType: 'PURCHASE_ORDER',
        entityId: po.id,
        beforeData: { status: po.status },
        afterData: { status: newPOStatus, hasAnyDiscrepancy, verificationRecords },
      });

      return { purchaseOrder: updatedPO, hasAnyDiscrepancy };
    });

    return res.status(200).json({
      success: true,
      message: result.hasAnyDiscrepancy
        ? `Delivery inspected for ${po.poNumber} with DISCREPANCIES flagged to Procurement & Management.`
        : `Delivery verified for ${po.poNumber} and added to inventory.`,
      ...result,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Server error verifying delivery.',
    });
  }
}
