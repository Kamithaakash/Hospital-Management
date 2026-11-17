import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { deductStockFEFO, getStartOfToday, recordAuditLog } from '../services/inventory.service.js';

export async function getRequests(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    const { status } = req.query;

    const whereClause: any = {};

    // Housekeeping Supervisor sees requests they submitted
    if (user?.role === 'HOUSEKEEPING_SUPERVISOR') {
      whereClause.requestedById = user.userId;
    }

    if (status && status !== 'ALL') {
      whereClause.status = String(status);
    }

    const requests = await prisma.supplyRequest.findMany({
      where: whereClause,
      include: {
        requestedBy: {
          select: { fullName: true, role: true, department: true },
        },
        reviewedBy: {
          select: { fullName: true, role: true },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                sku: true,
                name: true,
                category: true,
                unit: true,
                storageLocation: true,
                batches: {
                  where: {
                    remainingQty: { gt: 0 },
                    status: { not: 'EXPIRED' },
                  },
                  select: { remainingQty: true, expiryDate: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const today = getStartOfToday();

    // Enrich with live stock availability check (FR-3.2)
    const enrichedRequests = requests.map((reqItem) => {
      let allFulfillable = true;
      const itemsWithStock = reqItem.items.map((line) => {
        const availableStock = line.item.batches
          .filter((b) => !b.expiryDate || new Date(b.expiryDate) >= today)
          .reduce((sum, b) => sum + b.remainingQty, 0);

        const targetQty = line.approvedQty > 0 ? line.approvedQty - line.issuedQty : line.requestedQty;
        const canFulfill = availableStock >= targetQty;
        if (!canFulfill) allFulfillable = false;

        const { batches, ...itemRest } = line.item;
        return {
          ...line,
          item: itemRest,
          availableStock,
          canFulfillFromStores: canFulfill,
        };
      });

      return {
        ...reqItem,
        items: itemsWithStock,
        fulfillmentCheck: allFulfillable ? 'CAN_FULFILL_FROM_STORES' : 'REQUIRES_PROCUREMENT',
      };
    });

    return res.status(200).json({
      success: true,
      requests: enrichedRequests,
    });
  } catch (error: any) {
    console.error('getRequests error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving requests.' });
  }
}

export async function createRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { targetArea, purpose, urgency, items, notes, isDraft } = req.body;

    if (!targetArea || !purpose || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Target area, purpose, and at least one item are required.',
      });
    }

    // Generate unique sequential request code
    const count = await prisma.supplyRequest.count();
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const requestCode = `REQ-${dateStr}-${String(count + 1).padStart(3, '0')}`;
    const initialStatus = isDraft ? 'DRAFT' : 'PENDING';

    const newRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.supplyRequest.create({
        data: {
          requestCode,
          requestedById: userId,
          targetArea: targetArea.trim(),
          purpose: purpose.trim(),
          urgency: urgency || 'NORMAL',
          status: initialStatus,
          notes: notes?.trim(),
          items: {
            create: items.map((it: any) => ({
              itemId: it.itemId,
              requestedQty: Number(it.requestedQty) || 1,
              approvedQty: 0,
              issuedQty: 0,
            })),
          },
        },
        include: {
          items: {
            include: { item: true },
          },
        },
      });

      if (!isDraft) {
        await tx.alert.create({
          data: {
            alertType: 'APPROVAL_NEEDED',
            targetRole: 'MANAGER',
            referenceId: created.id,
            referenceType: 'SUPPLY_REQUEST',
            message: `New supply request ${requestCode} submitted for "${targetArea}" requires review.`,
            severity: urgency === 'URGENT' ? 'CRITICAL' : 'INFO',
          },
        });
      }

      await recordAuditLog(tx, {
        actorId: userId,
        action: 'SUBMIT_REQUEST',
        entityType: 'SUPPLY_REQUEST',
        entityId: created.id,
        afterData: { requestCode, status: initialStatus, targetArea },
      });

      return created;
    });

    return res.status(201).json({
      success: true,
      message: isDraft ? 'Supply request saved as draft.' : 'Supply request submitted successfully.',
      request: newRequest,
    });
  } catch (error: any) {
    console.error('createRequest error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating request.' });
  }
}

export async function reviewRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { decision, rejectionReason, items } = req.body; // decision: 'APPROVE' | 'REJECT'

    if (decision !== 'APPROVE' && decision !== 'REJECT') {
      return res.status(400).json({
        success: false,
        message: 'Decision must be either APPROVE or REJECT.',
      });
    }

    if (decision === 'REJECT' && (!rejectionReason || !String(rejectionReason).trim())) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is mandatory when rejecting a request (FR-3.3).',
      });
    }

    const existing = await prisma.supplyRequest.findUnique({
      where: { id },
      include: { items: { include: { item: true } } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supply request not found.' });
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Only PENDING requests can be reviewed (current status: ${existing.status}).`,
      });
    }

    const today = getStartOfToday();

    const updated = await prisma.$transaction(async (tx) => {
      if (decision === 'REJECT') {
        const rejected = await tx.supplyRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            reviewedById: req.user!.userId,
            reviewedAt: new Date(),
            rejectionReason: String(rejectionReason).trim(),
          },
          include: { items: { include: { item: true } } },
        });

        await tx.alert.updateMany({
          where: { referenceId: id, referenceType: 'SUPPLY_REQUEST', isResolved: false },
          data: { isResolved: true, resolvedAt: new Date() },
        });

        await recordAuditLog(tx, {
          actorId: req.user!.userId,
          action: 'REJECT_REQUEST',
          entityType: 'SUPPLY_REQUEST',
          entityId: id,
          beforeData: { status: existing.status },
          afterData: { status: 'REJECTED', rejectionReason },
        });

        return { request: rejected, routing: 'REJECTED' };
      }

      // APPROVE (full or partial per line item)
      const approvalMap = new Map<string, number>();
      if (Array.isArray(items)) {
        for (const it of items) {
          approvalMap.set(it.id, Number(it.approvedQty));
        }
      }

      let needsProcurement = false;
      let hasAvailableForStores = false;

      for (const line of existing.items) {
        const approvedQty = approvalMap.has(line.id)
          ? Math.max(0, Math.min(line.requestedQty, approvalMap.get(line.id)!))
          : line.requestedQty;

        await tx.requestItem.update({
          where: { id: line.id },
          data: { approvedQty },
        });

        // Check live stock for routing (FR-3.4)
        const activeBatches = await tx.stockBatch.findMany({
          where: {
            itemId: line.itemId,
            remainingQty: { gt: 0 },
            status: { not: 'EXPIRED' },
            OR: [{ expiryDate: null }, { expiryDate: { gte: today } }],
          },
          select: { remainingQty: true },
        });
        const available = activeBatches.reduce((s, b) => s + b.remainingQty, 0);

        if (approvedQty > 0) {
          if (available > 0) hasAvailableForStores = true;
          if (available < approvedQty) needsProcurement = true;
        }
      }

      const approved = await tx.supplyRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedById: req.user!.userId,
          reviewedAt: new Date(),
        },
        include: { items: { include: { item: true } } },
      });

      // Resolve Manager's APPROVAL_NEEDED alert
      await tx.alert.updateMany({
        where: { referenceId: id, referenceType: 'SUPPLY_REQUEST', targetRole: 'MANAGER', isResolved: false },
        data: { isResolved: true, resolvedAt: new Date() },
      });

      // Route to Stores Staff if any stock is available
      if (hasAvailableForStores) {
        await tx.alert.create({
          data: {
            alertType: 'APPROVAL_NEEDED',
            targetRole: 'STORES_STAFF',
            referenceId: id,
            referenceType: 'SUPPLY_REQUEST',
            message: `Approved request ${existing.requestCode} for "${existing.targetArea}" is ready for FEFO issuance.`,
            severity: existing.urgency === 'URGENT' ? 'CRITICAL' : 'INFO',
          },
        });
      }

      // Route to Procurement Staff if stock is insufficient/out of stock (FR-3.4)
      if (needsProcurement) {
        await tx.alert.create({
          data: {
            alertType: 'LOW_STOCK',
            targetRole: 'PROCUREMENT_STAFF',
            referenceId: id,
            referenceType: 'SUPPLY_REQUEST',
            message: `Approved request ${existing.requestCode} requires procurement due to insufficient store stock.`,
            severity: 'WARNING',
          },
        });
      }

      await recordAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'APPROVE_REQUEST',
        entityType: 'SUPPLY_REQUEST',
        entityId: id,
        beforeData: { status: existing.status },
        afterData: { status: 'APPROVED', needsProcurement },
      });

      return {
        request: approved,
        routing: needsProcurement ? 'STORES_AND_PROCUREMENT' : 'STORES_READY',
      };
    });

    return res.status(200).json({
      success: true,
      message:
        decision === 'APPROVE'
          ? `Request ${existing.requestCode} approved and routed.`
          : `Request ${existing.requestCode} rejected.`,
      ...updated,
    });
  } catch (error: any) {
    console.error('reviewRequest error:', error);
    return res.status(500).json({ success: false, message: 'Server error reviewing request.' });
  }
}

export async function issueRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { items } = req.body; // [{ requestItemId, issueQty, selectedBatchId?, overrideReason? }]

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item quantity to issue is required.',
      });
    }

    const request = await prisma.supplyRequest.findUnique({
      where: { id },
      include: { items: { include: { item: true } } },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Supply request not found.' });
    }

    if (request.status !== 'APPROVED' && request.status !== 'PARTIALLY_ISSUED') {
      return res.status(400).json({
        success: false,
        message: `Only APPROVED or PARTIALLY_ISSUED requests can be issued (current: ${request.status}).`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const issueSummaries = [];

      for (const lineInput of items) {
        const qtyToIssue = Number(lineInput.issueQty);
        if (!qtyToIssue || qtyToIssue <= 0) continue;

        const reqLine = request.items.find((ri) => ri.id === lineInput.requestItemId);
        if (!reqLine) {
          throw Object.assign(new Error(`Request line item ${lineInput.requestItemId} not found.`), { statusCode: 404 });
        }

        const remainingToApprove = reqLine.approvedQty - reqLine.issuedQty;
        if (qtyToIssue > remainingToApprove) {
          throw Object.assign(
            new Error(
              `Cannot issue ${qtyToIssue} of ${reqLine.item.name}; only ${remainingToApprove} remaining approved.`
            ),
            { statusCode: 400 }
          );
        }

        const deduction = await deductStockFEFO(tx, {
          itemId: reqLine.itemId,
          quantity: qtyToIssue,
          userId: req.user!.userId,
          referenceType: 'SUPPLY_REQUEST',
          referenceId: request.id,
          notes: `Issued for ${request.requestCode} (${request.targetArea})`,
          selectedBatchId: lineInput.selectedBatchId,
          overrideReason: lineInput.overrideReason,
        });

        await tx.requestItem.update({
          where: { id: reqLine.id },
          data: { issuedQty: reqLine.issuedQty + qtyToIssue },
        });

        issueSummaries.push({
          itemName: reqLine.item.name,
          issuedQty: qtyToIssue,
          ...deduction,
        });
      }

      if (issueSummaries.length === 0) {
        throw Object.assign(new Error('No valid positive quantities provided for issuance.'), { statusCode: 400 });
      }

      // Check if all approved quantities are now fulfilled
      const refreshedItems = await tx.requestItem.findMany({ where: { requestId: request.id } });
      const allFulfilled = refreshedItems.every((ri) => ri.issuedQty >= ri.approvedQty);
      const newStatus = allFulfilled ? 'FULFILLED' : 'PARTIALLY_ISSUED';

      const updatedRequest = await tx.supplyRequest.update({
        where: { id: request.id },
        data: { status: newStatus },
        include: { items: { include: { item: true } } },
      });

      if (allFulfilled) {
        await tx.alert.updateMany({
          where: { referenceId: request.id, referenceType: 'SUPPLY_REQUEST', targetRole: 'STORES_STAFF', isResolved: false },
          data: { isResolved: true, resolvedAt: new Date() },
        });
      }

      await recordAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'ISSUE_STOCK',
        entityType: 'SUPPLY_REQUEST',
        entityId: request.id,
        beforeData: { status: request.status },
        afterData: { status: newStatus, issueSummaries },
      });

      return { request: updatedRequest, issueSummaries };
    });

    return res.status(200).json({
      success: true,
      message: `Supplies issued via FEFO. Request status: ${result.request.status}.`,
      ...result,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Server error issuing supplies.',
    });
  }
}

export async function cancelRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.supplyRequest.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supply request not found.' });
    }

    if (req.user!.role === 'HOUSEKEEPING_SUPERVISOR' && existing.requestedById !== req.user!.userId) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own requests.' });
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a request with status ${existing.status}.`,
      });
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      const updated = await tx.supplyRequest.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await tx.alert.updateMany({
        where: { referenceId: id, referenceType: 'SUPPLY_REQUEST', isResolved: false },
        data: { isResolved: true, resolvedAt: new Date() },
      });

      await recordAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'CANCEL_REQUEST',
        entityType: 'SUPPLY_REQUEST',
        entityId: id,
        beforeData: { status: existing.status },
        afterData: { status: 'CANCELLED' },
      });

      return updated;
    });

    return res.status(200).json({
      success: true,
      message: `Request ${existing.requestCode} cancelled.`,
      request: cancelled,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error cancelling request.' });
  }
}
