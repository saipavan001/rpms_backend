import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../../constants/audit';

type RouteMatch = {
  entityType: string;
  entityId?: string;
  action: string;
};

const MUTATING_METHOD_ACTION: Record<string, string> = {
  POST: AUDIT_ACTIONS.CREATE,
  PUT: AUDIT_ACTIONS.UPDATE,
  PATCH: AUDIT_ACTIONS.UPDATE,
  DELETE: AUDIT_ACTIONS.DELETE,
};

const RESOURCE_ROUTES: Array<{
  prefix: string;
  entityType: string;
  bulk?: boolean;
}> = [
  { prefix: '/users', entityType: AUDIT_ENTITY_TYPES.USER },
  { prefix: '/employees', entityType: AUDIT_ENTITY_TYPES.EMPLOYEE, bulk: true },
  { prefix: '/org-unit-types', entityType: AUDIT_ENTITY_TYPES.ORG_UNIT_TYPE },
  {
    prefix: '/org-unit-type-hierarchies',
    entityType: AUDIT_ENTITY_TYPES.ORG_UNIT_TYPE_HIERARCHY,
  },
  { prefix: '/organization-units', entityType: AUDIT_ENTITY_TYPES.ORGANIZATION_UNIT },
  { prefix: '/audit-logs', entityType: AUDIT_ENTITY_TYPES.AUDIT_LOG },
];

const parseResourceRoute = (method: string, path: string): RouteMatch | null => {
  const normalized = path.split('?')[0];

  for (const route of RESOURCE_ROUTES) {
    if (!normalized.startsWith(route.prefix)) {
      continue;
    }

    const remainder = normalized.slice(route.prefix.length);
    const segments = remainder.split('/').filter(Boolean);
    const entityId = segments[0];

    if (route.bulk && normalized.endsWith('/bulk')) {
      return {
        entityType: route.entityType,
        action: AUDIT_ACTIONS.BULK_CREATE,
      };
    }

    let action = MUTATING_METHOD_ACTION[method] ?? method;

    if (method === 'POST' && entityId) {
      action = AUDIT_ACTIONS.UPDATE;
    }

    return {
      entityType: route.entityType,
      entityId,
      action,
    };
  }

  return null;
};

const parseAuthRoute = (method: string, path: string): RouteMatch | null => {
  if (!path.startsWith('/auth')) {
    return null;
  }

  if (method === 'POST' && path === '/auth/login') {
    return { entityType: AUDIT_ENTITY_TYPES.AUTH, action: AUDIT_ACTIONS.AUTH_LOGIN };
  }
  if (method === 'POST' && path === '/auth/logout') {
    return { entityType: AUDIT_ENTITY_TYPES.AUTH, action: AUDIT_ACTIONS.AUTH_LOGOUT };
  }
  if (method === 'POST' && path === '/auth/register/employee') {
    return {
      entityType: AUDIT_ENTITY_TYPES.AUTH,
      action: AUDIT_ACTIONS.AUTH_REGISTER,
    };
  }
  if (method === 'POST' && path === '/auth/refresh') {
    return { entityType: AUDIT_ENTITY_TYPES.AUTH, action: AUDIT_ACTIONS.AUTH_REFRESH };
  }

  return null;
};

export const resolveAuditFromRequest = (
  method: string,
  path: string
): RouteMatch | null => {
  const upperMethod = method.toUpperCase();

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
    return null;
  }

  return parseAuthRoute(upperMethod, path) ?? parseResourceRoute(upperMethod, path);
};

export const buildAuditSummary = (input: {
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  username?: string | null;
  httpMethod?: string | null;
  httpPath?: string | null;
  statusCode?: number | null;
}) => {
  const actor = input.username ?? 'Anonymous';
  const target = input.entityType
    ? `${input.entityType}${input.entityId ? ` (${input.entityId})` : ''}`
    : input.httpPath ?? 'resource';

  return `${actor} — ${input.action} ${target} — ${input.httpMethod ?? ''} ${input.statusCode ?? ''}`.trim();
};
