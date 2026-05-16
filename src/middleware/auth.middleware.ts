import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';

type AccessTokenPayload = {
  userId: string;
  username: string;
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT secret is not configured',
      });
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    ) as AccessTokenPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        is_active: true,
        user_roles: {
          where: { is_active: true, role: { is_active: true } },
          select: { role: { select: { code: true } } },
        },
      },
    });

    if (!user?.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive user',
      });
    }

    const roles = user.user_roles.map((assignment) => assignment.role.code);

    if (roles.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User has no active roles assigned',
      });
    }

    req.userId = user.id;
    req.username = user.username;
    req.roles = roles;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};
