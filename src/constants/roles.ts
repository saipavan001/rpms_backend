export const ROLE_CODES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE',
  GUEST: 'GUEST',
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

/** Org/employee modules — EMPLOYEE uses welcome portal only (no module APIs). */
export const READ_ACCESS_ROLES: RoleCode[] = [
  ROLE_CODES.SUPER_ADMIN,
  ROLE_CODES.ADMIN,
  ROLE_CODES.GUEST,
];

export const WRITE_ACCESS_ROLES: RoleCode[] = [
  ROLE_CODES.SUPER_ADMIN,
  ROLE_CODES.ADMIN,
];
