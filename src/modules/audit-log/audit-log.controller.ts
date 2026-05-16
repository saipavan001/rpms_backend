import { Request, Response } from 'express';
import { listAuditLogs } from './audit-log.service';

export const list = async (req: Request, res: Response) => {
  try {
    const limit =
      req.query.limit !== undefined
        ? Number.parseInt(String(req.query.limit), 10)
        : undefined;

    const result = await listAuditLogs({
      limit: Number.isNaN(limit) ? undefined : limit,
      cursor:
        typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
      userId:
        typeof req.query.user_id === 'string' ? req.query.user_id : undefined,
      action:
        typeof req.query.action === 'string' ? req.query.action : undefined,
      entityType:
        typeof req.query.entity_type === 'string'
          ? req.query.entity_type
          : undefined,
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
    });

    return res.status(200).json({
      success: true,
      data: {
        items: result.items,
        next_cursor: result.nextCursor,
        has_more: result.hasMore,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to load audit logs';

    return res.status(400).json({
      success: false,
      message,
    });
  }
};
