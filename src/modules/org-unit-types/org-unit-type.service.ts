import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';
import { cached } from '../../cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../cache/cache-keys';
import { invalidateOrgUnitTypeCaches } from '../../cache/invalidation';

const orgUnitTypesFilterKey = (isActive?: boolean) =>
  isActive === undefined ? 'all' : isActive ? 'active' : 'inactive';

export type CreateOrgUnitTypeInput = {
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
};

export type UpdateOrgUnitTypeInput = {
  code?: string;
  name?: string;
  description?: string | null;
  is_active?: boolean;
};

export const createOrgUnitType = async (data: CreateOrgUnitTypeInput) => {
  const created = await prisma.organizationUnitType.create({
    data: {
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      is_active: data.is_active ?? true,
    },
  });
  await invalidateOrgUnitTypeCaches();
  return created;
};

export const getOrgUnitTypes = async (isActive?: boolean) => {
  const where =
    isActive === undefined ? {} : { is_active: isActive };

  return cached(
    cacheKeys.orgUnitTypes(orgUnitTypesFilterKey(isActive)),
    CACHE_TTL.orgStructure,
    () =>
      prisma.organizationUnitType.findMany({
        where,
        orderBy: { name: 'asc' },
      })
  );
};

export const getOrgUnitTypeById = async (id: string) => {
  return cached(cacheKeys.orgUnitType(id), CACHE_TTL.orgStructure, () =>
    prisma.organizationUnitType.findUnique({
      where: { id },
    })
  );
};

export const updateOrgUnitType = async (
  id: string,
  data: UpdateOrgUnitTypeInput
) => {
  const updateData: Prisma.OrganizationUnitTypeUpdateInput = {};

  if (data.code !== undefined) {
    updateData.code = data.code.trim();
  }
  if (data.name !== undefined) {
    updateData.name = data.name.trim();
  }
  if (data.description !== undefined) {
    updateData.description =
      data.description === null ? null : data.description.trim();
  }
  if (data.is_active !== undefined) {
    updateData.is_active = data.is_active;
  }

  const updated = await prisma.organizationUnitType.update({
    where: { id },
    data: updateData,
  });
  await invalidateOrgUnitTypeCaches(id);
  return updated;
};

export const deleteOrgUnitType = async (id: string) => {
  const deleted = await prisma.organizationUnitType.delete({
    where: { id },
  });
  await invalidateOrgUnitTypeCaches(id);
  return deleted;
};
