import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';

export type UserRole =
  | 'HOUSEKEEPING_SUPERVISOR'
  | 'MANAGER'
  | 'STORES_STAFF'
  | 'PROCUREMENT_STAFF'
  | 'ADMIN';

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to access this resource.',
      });
    }

    const userRole = req.user.role as UserRole;

    // ADMIN has full operational access across all hospital functions
    if (userRole === 'ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role "${userRole}" is not authorized for this operation.`,
        requiredRoles: allowedRoles,
      });
    }

    return next();
  };
}
