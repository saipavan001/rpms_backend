import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';

export type CreateOrgUnitTypeHierarchyInput = {
  parent_ou_type_id: string;
  child_ou_type_id: string;
  display_order?: number | null;
  is_active?: boolean;
};

export type UpdateOrgUnitTypeHierarchyInput = {
  parent_ou_type_id?: string;
  child_ou_type_id?: string;
  display_order?: number | null;
  is_active?: boolean;
};

const hierarchyInclude = {
  parent_ou_type: {
    select: { id: true, code: true, name: true },
  },
  child_ou_type: {
    select: { id: true, code: true, name: true },
  },
} satisfies Prisma.OrganizationUnitTypeHierarchyInclude;

const assertDistinctTypes = (
  parentId: string,
  childId: string
) => {
  if (parentId === childId) {
    throw new Error('Parent and child organization unit types must be different');
  }
};

export const createOrgUnitTypeHierarchy = async (
  data: CreateOrgUnitTypeHierarchyInput
) => {
  assertDistinctTypes(data.parent_ou_type_id, data.child_ou_type_id);

  return prisma.organizationUnitTypeHierarchy.create({
    data: {
      parent_ou_type_id: data.parent_ou_type_id,
      child_ou_type_id: data.child_ou_type_id,
      display_order: data.display_order ?? null,
      is_active: data.is_active ?? true,
    },
    include: hierarchyInclude,
  });
};

export const getOrgUnitTypeHierarchies = async (isActive?: boolean) => {
  const where =
    isActive === undefined ? {} : { is_active: isActive };

  return prisma.organizationUnitTypeHierarchy.findMany({
    where,
    orderBy: [{ display_order: 'asc' }, { created_at: 'asc' }],
    include: hierarchyInclude,
  });
};

export const getOrgUnitTypeHierarchyById = async (id: string) => {
  return prisma.organizationUnitTypeHierarchy.findUnique({
    where: { id },
    include: hierarchyInclude,
  });
};

export const updateOrgUnitTypeHierarchy = async (
  id: string,
  data: UpdateOrgUnitTypeHierarchyInput
) => {
  const existing = await prisma.organizationUnitTypeHierarchy.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  const parentId = data.parent_ou_type_id ?? existing.parent_ou_type_id;
  const childId = data.child_ou_type_id ?? existing.child_ou_type_id;
  assertDistinctTypes(parentId, childId);

  const updateData: Prisma.OrganizationUnitTypeHierarchyUpdateInput = {};

  if (data.parent_ou_type_id !== undefined) {
    updateData.parent_ou_type = { connect: { id: data.parent_ou_type_id } };
  }
  if (data.child_ou_type_id !== undefined) {
    updateData.child_ou_type = { connect: { id: data.child_ou_type_id } };
  }
  if (data.display_order !== undefined) {
    updateData.display_order = data.display_order;
  }
  if (data.is_active !== undefined) {
    updateData.is_active = data.is_active;
  }

  return prisma.organizationUnitTypeHierarchy.update({
    where: { id },
    data: updateData,
    include: hierarchyInclude,
  });
};

export const deleteOrgUnitTypeHierarchy = async (id: string) => {
  return prisma.organizationUnitTypeHierarchy.delete({
    where: { id },
    include: hierarchyInclude,
  });
};
