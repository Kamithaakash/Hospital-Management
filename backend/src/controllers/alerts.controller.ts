import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getAlerts(req: AuthenticatedRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const { isResolved } = req.query;

    const whereClause: any = {};

    // Filter by role: Admin and Manager see all; others see their targeted alerts + ALL
    if (userRole && userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      whereClause.OR = [{ targetRole: userRole }, { targetRole: 'ALL' }];
    }

    if (isResolved !== undefined) {
      whereClause.isResolved = isResolved === 'true';
    } else {
      whereClause.isResolved = false; // default to unresolved alerts
    }

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      include: {
        item: {
          select: { sku: true, name: true, category: true, storageLocation: true },
        },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });

    const counts = {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
      warning: alerts.filter((a) => a.severity === 'WARNING').length,
      info: alerts.filter((a) => a.severity === 'INFO').length,
    };

    return res.status(200).json({
      success: true,
      counts,
      alerts,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error retrieving alerts.' });
  }
}

export async function resolveAlert(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Alert marked as resolved.',
      alert: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error resolving alert.' });
  }
}
