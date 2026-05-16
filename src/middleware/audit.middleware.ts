import { Request, Response, NextFunction } from 'express';
import { buildAuditSummary, resolveAuditFromRequest } from '../modules/audit-log/audit-path.util';
import { enqueueAuditLog } from '../modules/audit-log/audit-log.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const getClientIp = (req: Request) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  return req.ip ?? null;
};

const shouldSkipPath = (path: string) => path === '/' || path.startsWith('/health');

export const auditMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const path = req.baseUrl + req.path;

  if (shouldSkipPath(path)) {
    next();
    return;
  }

  res.on('finish', () => {
    const match = resolveAuditFromRequest(req.method, path);
    if (!match) {
      return;
    }

    const summary = buildAuditSummary({
      action: match.action,
      entityType: match.entityType,
      entityId: match.entityId,
      username: req.username,
      httpMethod: req.method,
      httpPath: path,
      statusCode: res.statusCode,
    });

    enqueueAuditLog({
      action: match.action,
      userId: req.userId,
      username: req.username,
      roleCodes: req.roles,
      entityType: match.entityType,
      entityId: match.entityId,
      httpMethod: req.method,
      httpPath: path,
      statusCode: res.statusCode,
      ipAddress: getClientIp(req),
      userAgent:
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : null,
      summary,
      metadata: {
        query: req.query,
      },
    });
  });

  next();
};
