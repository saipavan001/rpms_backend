const PREFIX = 'erp:v1';

export const CACHE_TTL = {
  masters: 300,
  committees: 300,
  orgStructure: 600,
  roles: 600,
  project: 60,
  projectPreview: 60,
  projectList: 30,
} as const;

export const cacheKeys = {
  rpmsMasters: `${PREFIX}:rpms:masters`,
  fundingAgencies: (activeOnly: boolean) =>
    `${PREFIX}:masters:funding-agencies:${activeOnly ? 'active' : 'all'}`,
  budgetCategories: (activeOnly: boolean) =>
    `${PREFIX}:masters:budget-categories:${activeOnly ? 'active' : 'all'}`,
  budgetHeadsActive: `${PREFIX}:masters:budget-heads:active`,
  committeeRoles: `${PREFIX}:rpms:committee-roles`,
  committees: `${PREFIX}:rpms:committees`,
  committeeByOu: (ouId: string) => `${PREFIX}:rpms:committee:ou:${ouId}`,
  orgUnits: (activeFilter: string) => `${PREFIX}:org-units:${activeFilter}`,
  orgUnit: (id: string) => `${PREFIX}:org-unit:${id}`,
  orgUnitTypes: (activeFilter: string) => `${PREFIX}:org-unit-types:${activeFilter}`,
  orgUnitType: (id: string) => `${PREFIX}:org-unit-type:${id}`,
  assignableRoles: `${PREFIX}:roles:assignable`,
  rolesByCodes: (codesKey: string) => `${PREFIX}:roles:codes:${codesKey}`,
  project: (id: string) => `${PREFIX}:rpms:project:${id}`,
  projectPreview: (id: string) => `${PREFIX}:rpms:project:${id}:preview`,
  projectsForUser: (userId: string, rolesKey: string) =>
    `${PREFIX}:rpms:projects:user:${userId}:${rolesKey}`,
} as const;

export const CACHE_PREFIXES = {
  fundingAgencies: `${PREFIX}:masters:funding-agencies:`,
  budgetCategories: `${PREFIX}:masters:budget-categories:`,
  committees: `${PREFIX}:rpms:committee`,
  orgUnits: `${PREFIX}:org-units:`,
  orgUnitTypes: `${PREFIX}:org-unit-types:`,
  roles: `${PREFIX}:roles:`,
  projectLists: `${PREFIX}:rpms:projects:user:`,
} as const;
