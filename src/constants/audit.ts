export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  BULK_CREATE: 'BULK_CREATE',
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_REGISTER: 'AUTH_REGISTER',
  AUTH_REFRESH: 'AUTH_REFRESH',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_ENTITY_TYPES = {
  USER: 'User',
  EMPLOYEE: 'Employee',
  ORG_UNIT_TYPE: 'OrganizationUnitType',
  ORG_UNIT_TYPE_HIERARCHY: 'OrganizationUnitTypeHierarchy',
  ORGANIZATION_UNIT: 'OrganizationUnit',
  AUTH: 'Auth',
  AUDIT_LOG: 'AuditLog',
} as const;
