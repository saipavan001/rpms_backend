import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

export const requireRoles = (...roleCodes: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const assignment = await prisma.userRole.findFirst({
        where: {
          user_id: req.userId,
          is_active: true,
          role: {
            code: { in: roleCodes },
            is_active: true,
          },
        },
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to perform this action',
        });
      }

      next();
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
};

export const requireSuperAdmin = requireRoles('SUPER_ADMIN');
