import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';

export type CreateOrganizationUnitInput = {
  code: string;
  name: string;
  short_name?: string;
  description?: string;
  ou_type_id: string;
  parent_ou_id?: string | null;
  is_active?: boolean;
};

export type UpdateOrganizationUnitInput = {
  code?: string;
  name?: string;
  short_name?: string | null;
  description?: string | null;
  ou_type_id?: string;
  parent_ou_id?: string | null;
  is_active?: boolean;
};

const organizationUnitInclude = {
  ou_type: {
    select: { id: true, code: true, name: true },
  },
  parent_ou: {
    select: { id: true, code: true, name: true },
  },
} satisfies Prisma.OrganizationUnitInclude;

export const createOrganizationUnit = async (
  data: CreateOrganizationUnitInput
) => {
  return prisma.organizationUnit.create({
    data: {
      code: data.code.trim(),
      name: data.name.trim(),
      short_name: data.short_name?.trim() || null,
      description: data.description?.trim() || null,
      ou_type_id: data.ou_type_id,
      parent_ou_id: data.parent_ou_id ?? null,
      is_active: data.is_active ?? true,
    },
    include: organizationUnitInclude,
  });
};

export const getOrganizationUnits = async (isActive?: boolean) => {
  const where =
    isActive === undefined ? {} : { is_active: isActive };

  return prisma.organizationUnit.findMany({
    where,
    orderBy: { name: 'asc' },
    include: organizationUnitInclude,
  });
};

export const getOrganizationUnitById = async (id: string) => {
  return prisma.organizationUnit.findUnique({
    where: { id },
    include: organizationUnitInclude,
  });
};

export const updateOrganizationUnit = async (
  id: string,
  data: UpdateOrganizationUnitInput
) => {
  const updateData: Prisma.OrganizationUnitUpdateInput = {};

  if (data.code !== undefined) {
    updateData.code = data.code.trim();
  }
  if (data.name !== undefined) {
    updateData.name = data.name.trim();
  }
  if (data.short_name !== undefined) {
    updateData.short_name =
      data.short_name === null ? null : data.short_name.trim();
  }
  if (data.description !== undefined) {
    updateData.description =
      data.description === null ? null : data.description.trim();
  }
  if (data.ou_type_id !== undefined) {
    updateData.ou_type = { connect: { id: data.ou_type_id } };
  }
  if (data.parent_ou_id !== undefined) {
    updateData.parent_ou =
      data.parent_ou_id === null
        ? { disconnect: true }
        : { connect: { id: data.parent_ou_id } };
  }
  if (data.is_active !== undefined) {
    updateData.is_active = data.is_active;
  }

  return prisma.organizationUnit.update({
    where: { id },
    data: updateData,
    include: organizationUnitInclude,
  });
};

export const deleteOrganizationUnit = async (id: string) => {
  return prisma.organizationUnit.delete({
    where: { id },
    include: organizationUnitInclude,
  });
};
