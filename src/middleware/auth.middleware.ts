import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { ACCESS_TOKEN_COOKIE } from '../modules/auth/cookie.util';
import { verifyAccessToken } from '../modules/auth/token.service';

const extractAccessToken = (req: Request): string | null => {
  const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (typeof cookieToken === 'string' && cookieToken.trim()) {
    return cookieToken.trim();
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const headerToken = authHeader.slice(7).trim();
    if (headerToken) {
      return headerToken;
    }
  }

  return null;
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractAccessToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const payload = verifyAccessToken(token);

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
