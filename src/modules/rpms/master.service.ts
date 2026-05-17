import prisma from '../../config/prisma';
import { cached } from '../../cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../cache/cache-keys';
import {
  invalidateBudgetMasterCaches,
  invalidateFundingAgencyCaches,
} from '../../cache/invalidation';

const masterCodePattern = /^[A-Z0-9_]+$/;

const normalizeCode = (code: string) => code.trim().toUpperCase();

const assertMasterCode = (code: string) => {
  const normalized = normalizeCode(code);
  if (!masterCodePattern.test(normalized)) {
    throw new Error('Code must use uppercase letters, numbers, and underscores only');
  }
  return normalized;
};

export const listFundingAgencies = async (activeOnly = false) =>
  cached(cacheKeys.fundingAgencies(activeOnly), CACHE_TTL.masters, () =>
    prisma.fundingAgency.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: { name: 'asc' },
    })
  );

export const createFundingAgency = async (data: {
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
}) => {
  const code = assertMasterCode(data.code);
  const created = await prisma.fundingAgency.create({
    data: {
      code,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      is_active: data.is_active ?? true,
    },
  });
  await invalidateFundingAgencyCaches();
  return created;
};

export const updateFundingAgency = async (
  id: string,
  data: {
    code?: string;
    name?: string;
    description?: string | null;
    is_active?: boolean;
  }
) => {
  const updated = await prisma.fundingAgency.update({
    where: { id },
    data: {
      code: data.code ? assertMasterCode(data.code) : undefined,
      name: data.name?.trim(),
      description: data.description,
      is_active: data.is_active,
    },
  });
  await invalidateFundingAgencyCaches();
  return updated;
};

export const deleteFundingAgency = async (id: string) => {
  const inUse = await prisma.researchProject.count({
    where: {
      OR: [
        { funding_agency_id: id },
        { funding_agencies: { some: { funding_agency_id: id } } },
      ],
    },
  });
  let result;
  if (inUse > 0) {
    result = await prisma.fundingAgency.update({
      where: { id },
      data: { is_active: false },
    });
  } else {
    result = await prisma.fundingAgency.delete({ where: { id } });
  }
  await invalidateFundingAgencyCaches();
  return result;
};

export const listBudgetCategories = async (activeOnly = false) =>
  cached(cacheKeys.budgetCategories(activeOnly), CACHE_TTL.masters, () =>
    prisma.budgetCategory.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
      include: {
        heads: {
          where: activeOnly ? { is_active: true } : undefined,
          orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
        },
      },
    })
  );

const nextCategoryDisplayOrder = async () => {
  const last = await prisma.budgetCategory.findFirst({
    orderBy: { display_order: 'desc' },
    select: { display_order: true },
  });
  return (last?.display_order ?? 0) + 1;
};

const nextHeadDisplayOrder = async (budgetCategoryId: string) => {
  const last = await prisma.budgetHead.findFirst({
    where: { budget_category_id: budgetCategoryId },
    orderBy: { display_order: 'desc' },
    select: { display_order: true },
  });
  return (last?.display_order ?? 0) + 1;
};

export const createBudgetCategory = async (data: {
  code: string;
  name: string;
  description?: string | null;
  display_order?: number;
  is_active?: boolean;
}) => {
  const code = assertMasterCode(data.code);
  const displayOrder =
    data.display_order ?? (await nextCategoryDisplayOrder());
  const created = await prisma.budgetCategory.create({
    data: {
      code,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      display_order: displayOrder,
      is_active: data.is_active ?? true,
    },
    include: { heads: true },
  });
  await invalidateBudgetMasterCaches();
  return created;
};

export const updateBudgetCategory = async (
  id: string,
  data: {
    code?: string;
    name?: string;
    description?: string | null;
    display_order?: number;
    is_active?: boolean;
  }
) => {
  const updated = await prisma.budgetCategory.update({
    where: { id },
    data: {
      code: data.code ? assertMasterCode(data.code) : undefined,
      name: data.name?.trim(),
      description: data.description,
      display_order: data.display_order,
      is_active: data.is_active,
    },
    include: { heads: { orderBy: [{ display_order: 'asc' }, { name: 'asc' }] } },
  });
  await invalidateBudgetMasterCaches();
  return updated;
};

export const deleteBudgetCategory = async (id: string) => {
  const inUse = await prisma.projectBudgetLine.count({
    where: { budget_category_id: id },
  });
  let result;
  if (inUse > 0) {
    result = await prisma.budgetCategory.update({
      where: { id },
      data: { is_active: false },
    });
  } else {
    await prisma.budgetHead.deleteMany({ where: { budget_category_id: id } });
    result = await prisma.budgetCategory.delete({ where: { id } });
  }
  await invalidateBudgetMasterCaches();
  return result;
};

export const createBudgetHead = async (data: {
  budget_category_id: string;
  code: string;
  name: string;
  description?: string | null;
  display_order?: number;
  is_active?: boolean;
}) => {
  const code = assertMasterCode(data.code);
  const category = await prisma.budgetCategory.findUnique({
    where: { id: data.budget_category_id },
  });
  if (!category) {
    throw new Error('Budget category not found');
  }
  const displayOrder =
    data.display_order ?? (await nextHeadDisplayOrder(data.budget_category_id));
  const created = await prisma.budgetHead.create({
    data: {
      budget_category_id: data.budget_category_id,
      code,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      display_order: displayOrder,
      is_active: data.is_active ?? true,
    },
    include: { budget_category: true },
  });
  await invalidateBudgetMasterCaches();
  return created;
};

export const updateBudgetHead = async (
  id: string,
  data: {
    code?: string;
    name?: string;
    description?: string | null;
    display_order?: number;
    is_active?: boolean;
  }
) => {
  const updated = await prisma.budgetHead.update({
    where: { id },
    data: {
      code: data.code ? assertMasterCode(data.code) : undefined,
      name: data.name?.trim(),
      description: data.description,
      display_order: data.display_order,
      is_active: data.is_active,
    },
    include: { budget_category: true },
  });
  await invalidateBudgetMasterCaches();
  return updated;
};

export const deleteBudgetHead = async (id: string) => {
  const inUse = await prisma.projectBudgetLine.count({
    where: { budget_head_id: id },
  });
  let result;
  if (inUse > 0) {
    result = await prisma.budgetHead.update({
      where: { id },
      data: { is_active: false },
    });
  } else {
    result = await prisma.budgetHead.delete({ where: { id } });
  }
  await invalidateBudgetMasterCaches();
  return result;
};

export const getActiveBudgetHeads = () =>
  cached(cacheKeys.budgetHeadsActive, CACHE_TTL.masters, () =>
    prisma.budgetHead.findMany({
      where: { is_active: true, budget_category: { is_active: true } },
      include: { budget_category: true },
      orderBy: [
        { budget_category: { display_order: 'asc' } },
        { display_order: 'asc' },
        { name: 'asc' },
      ],
    })
  );
