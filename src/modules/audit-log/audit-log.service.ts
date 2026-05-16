import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';

export type RecordAuditInput = {
  action: string;
  userId?: string | null;
  username?: string | null;
  roleCodes?: string[] | null;
  entityType?: string | null;
  entityId?: string | null;
  httpMethod?: string | null;
  httpPath?: string | null;
  statusCode?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  summary?: string | null;
  metadata?: Prisma.InputJsonValue;
};

const MAX_USER_AGENT_LENGTH = 512;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const truncate = (value: string | null | undefined, max: number) => {
  if (!value) {
    return null;
  }
  return value.length > max ? value.slice(0, max) : value;
};

const writeAuditLog = async (input: RecordAuditInput) => {
  await prisma.auditLog.create({
    data: {
      user_id: input.userId ?? null,
      username: input.username ?? null,
      role_codes: input.roleCodes?.length ? input.roleCodes.join(',') : null,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      http_method: input.httpMethod ?? null,
      http_path: input.httpPath ?? null,
      status_code: input.statusCode ?? null,
      ip_address: input.ipAddress ?? null,
      user_agent: truncate(input.userAgent, MAX_USER_AGENT_LENGTH),
      summary: truncate(input.summary, 500),
      metadata: input.metadata ?? undefined,
    },
  });
};

/**
 * Non-blocking audit write — does not delay the HTTP response.
 * Failures are logged only; never thrown to the caller.
 */
export const enqueueAuditLog = (input: RecordAuditInput) => {
  setImmediate(() => {
    writeAuditLog(input).catch((error) => {
      console.error('[audit-log] Failed to persist event:', error);
    });
  });
};

export type ListAuditLogsQuery = {
  limit?: number;
  cursor?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
};

const parseCursor = (cursor: string) => {
  const separatorIndex = cursor.indexOf('|');
  if (separatorIndex === -1) {
    return null;
  }

  const createdAt = new Date(cursor.slice(0, separatorIndex));
  const id = cursor.slice(separatorIndex + 1);

  if (Number.isNaN(createdAt.getTime()) || !id) {
    return null;
  }

  return { createdAt, id };
};

const encodeCursor = (createdAt: Date, id: string) =>
  `${createdAt.toISOString()}|${id}`;

export const listAuditLogs = async (query: ListAuditLogsQuery) => {
  const limit = Math.min(
    Math.max(query.limit ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );

  const where: Prisma.AuditLogWhereInput = {};

  if (query.userId) {
    where.user_id = query.userId;
  }
  if (query.action) {
    where.action = query.action;
  }
  if (query.entityType) {
    where.entity_type = query.entityType;
  }

  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (query.from) {
    const from = new Date(query.from);
    if (!Number.isNaN(from.getTime())) {
      createdAtFilter.gte = from;
    }
  }
  if (query.to) {
    const to = new Date(query.to);
    if (!Number.isNaN(to.getTime())) {
      createdAtFilter.lte = to;
    }
  }
  if (Object.keys(createdAtFilter).length > 0) {
    where.created_at = createdAtFilter;
  }

  const cursorParsed = query.cursor ? parseCursor(query.cursor) : null;
  if (query.cursor && !cursorParsed) {
    throw new Error('Invalid cursor');
  }

  const items = await prisma.auditLog.findMany({
    where: cursorParsed
      ? {
          ...where,
          OR: [
            { created_at: { lt: cursorParsed.createdAt } },
            {
              created_at: cursorParsed.createdAt,
              id: { lt: cursorParsed.id },
            },
          ],
        }
      : where,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });

  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const last = pageItems[pageItems.length - 1];

  return {
    items: pageItems,
    nextCursor:
      hasMore && last ? encodeCursor(last.created_at, last.id) : null,
    hasMore,
  };
};
