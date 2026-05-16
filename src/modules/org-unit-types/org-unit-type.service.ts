import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';

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
  return prisma.organizationUnitType.create({
    data: {
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      is_active: data.is_active ?? true,
    },
  });
};

export const getOrgUnitTypes = async (isActive?: boolean) => {
  const where =
    isActive === undefined ? {} : { is_active: isActive };

  return prisma.organizationUnitType.findMany({
    where,
    orderBy: { name: 'asc' },
  });
};

export const getOrgUnitTypeById = async (id: string) => {
  return prisma.organizationUnitType.findUnique({
    where: { id },
  });
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

  return prisma.organizationUnitType.update({
    where: { id },
    data: updateData,
  });
};

export const deleteOrgUnitType = async (id: string) => {
  return prisma.organizationUnitType.delete({
    where: { id },
  });
};
