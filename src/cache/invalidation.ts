import { cacheDel, cacheDelByPrefix } from './cache.service';
import { CACHE_PREFIXES, cacheKeys } from './cache-keys';

export const invalidateRpmsMasters = async () => {
  await cacheDel(cacheKeys.rpmsMasters);
};

export const invalidateFundingAgencyCaches = async () => {
  await Promise.all([
    cacheDelByPrefix(CACHE_PREFIXES.fundingAgencies),
    invalidateRpmsMasters(),
  ]);
};

export const invalidateBudgetMasterCaches = async () => {
  await Promise.all([
    cacheDelByPrefix(CACHE_PREFIXES.budgetCategories),
    cacheDel(cacheKeys.budgetHeadsActive),
    invalidateRpmsMasters(),
  ]);
};

export const invalidateCommitteeCaches = async (ouId?: string) => {
  const tasks = [
    cacheDel(cacheKeys.committeeRoles),
    cacheDel(cacheKeys.committees),
    cacheDelByPrefix(CACHE_PREFIXES.committees),
  ];
  if (ouId) {
    tasks.push(cacheDel(cacheKeys.committeeByOu(ouId)));
  }
  await Promise.all(tasks);
};

export const invalidateOrgUnitCaches = async (id?: string) => {
  const tasks = [cacheDelByPrefix(CACHE_PREFIXES.orgUnits), invalidateRpmsMasters()];
  if (id) {
    tasks.push(cacheDel(cacheKeys.orgUnit(id)));
  }
  await Promise.all(tasks);
};

export const invalidateOrgUnitTypeCaches = async (id?: string) => {
  const tasks = [cacheDelByPrefix(CACHE_PREFIXES.orgUnitTypes)];
  if (id) {
    tasks.push(cacheDel(cacheKeys.orgUnitType(id)));
  }
  await Promise.all(tasks);
};

export const invalidateRoleCaches = async () => {
  await cacheDelByPrefix(CACHE_PREFIXES.roles);
};

export const invalidateProjectListCaches = async () => {
  await cacheDelByPrefix(CACHE_PREFIXES.projectLists);
};

export const invalidateProjectCaches = async (projectId: string) => {
  await Promise.all([
    cacheDel(cacheKeys.project(projectId)),
    cacheDel(cacheKeys.projectPreview(projectId)),
    invalidateProjectListCaches(),
  ]);
};
