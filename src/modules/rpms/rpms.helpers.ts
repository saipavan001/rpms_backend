import prisma from '../../config/prisma';
import { ADMINISTRATIVE_ROLE_CODES } from '../../constants/roles';
import { DEFAULT_CLEARANCE_TYPES } from '../../constants/rpms';
import { getActiveBudgetHeads } from './master.service';

export const generateProjectCode = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.researchProject.count({
    where: {
      project_code: { startsWith: `RPMS-${year}-` },
    },
  });
  return `RPMS-${year}-${String(count + 1).padStart(4, '0')}`;
};

export const getAdministrativeUsers = async () => {
  const users = await prisma.user.findMany({
    where: {
      is_active: true,
      user_roles: {
        some: {
          is_active: true,
          role: {
            is_active: true,
            code: { in: [...ADMINISTRATIVE_ROLE_CODES] },
          },
        },
      },
    },
    orderBy: { username: 'asc' },
    include: {
      employee: {
        select: {
          id: true,
          employee_code: true,
          employee_name: true,
        },
      },
      user_roles: {
        where: { is_active: true },
        include: { role: { select: { code: true, name: true } } },
      },
    },
  });

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    employee: u.employee,
    roles: u.user_roles.map((ur) => ur.role),
  }));
};

export const resolvePiFromEmployeeId = async (employeeId: string) => {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: { select: { id: true, is_active: true } },
    },
  });

  if (!employee) {
    throw new Error('Principal investigator employee not found');
  }
  if (!employee.is_active) {
    throw new Error('Principal investigator employee is inactive');
  }
  if (!employee.user?.is_active) {
    throw new Error(
      'Selected principal investigator must have an active user account linked to their employee record'
    );
  }

  return {
    piUserId: employee.user.id,
    piEmployeeId: employee.id,
    ouId: employee.ou_id,
  };
};

export const seedPiTeamMember = async (
  projectId: string,
  piEmployeeId: string | null,
  piUserId: string
) => {
  if (piEmployeeId) {
    await prisma.projectTeamMember.create({
      data: {
        project_id: projectId,
        role: 'PI',
        employee_id: piEmployeeId,
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: piUserId },
    select: { username: true, employee_id: true },
  });

  await prisma.projectTeamMember.create({
    data: {
      project_id: projectId,
      role: 'PI',
      employee_id: user?.employee_id ?? null,
      member_name: user?.username ?? 'PI',
    },
  });
};

export const seedDefaultClearances = async (projectId: string) => {
  await prisma.projectClearance.createMany({
    data: DEFAULT_CLEARANCE_TYPES.map((clearance_type) => ({
      project_id: projectId,
      clearance_type,
      is_required: false,
      status: 'DRAFT',
    })),
    skipDuplicates: true,
  });
};

const budgetLineKey = (
  yearIndex: number,
  headId: string | null,
  category: string,
  head: string,
  fundingAgencyId: string | null
) =>
  headId
    ? `${yearIndex}:${headId}:${fundingAgencyId ?? ''}`
    : `${yearIndex}:${category}:${head}:${fundingAgencyId ?? ''}`;

export const syncProjectBudgetStructure = async (projectId: string) => {
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    include: {
      funding_agencies: { select: { funding_agency_id: true } },
      budget_years: {
        orderBy: { year_index: 'asc' },
        include: { lines: true },
      },
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }
  if (!project.include_budget_estimate) {
    return;
  }
  if (!project.tentative_start_date || !project.tentative_end_date) {
    throw new Error('Set project dates before building the budget');
  }

  const agencyIds = project.funding_agencies.map((link) => link.funding_agency_id);
  if (!agencyIds.length) {
    await prisma.projectBudgetYear.deleteMany({ where: { project_id: projectId } });
    await prisma.researchProject.update({
      where: { id: projectId },
      data: { section_budget_complete: false },
    });
    return;
  }

  const heads = await getActiveBudgetHeads();
  if (!heads.length) {
    throw new Error('Configure budget categories and heads in RPMS settings first');
  }

  const amountByKey = new Map<
    string,
    { amount: number; justification: string | null }
  >();
  for (const year of project.budget_years) {
    for (const line of year.lines) {
      const key = budgetLineKey(
        year.year_index,
        line.budget_head_id,
        line.budget_category,
        line.budget_head,
        line.funding_agency_id
      );
      amountByKey.set(key, {
        amount: Number(line.amount),
        justification: line.justification,
      });
    }
  }

  const years = computeBudgetYears(
    project.tentative_start_date,
    project.tentative_end_date
  );

  await prisma.projectBudgetYear.deleteMany({ where: { project_id: projectId } });

  for (const y of years) {
    const yearRow = await prisma.projectBudgetYear.create({
      data: {
        project_id: projectId,
        year_index: y.year_index,
        label: y.label,
        period_start: y.period_start,
        period_end: y.period_end,
      },
    });

    const rows = agencyIds.flatMap((agencyId) =>
      heads.map((head) => {
        const key = budgetLineKey(y.year_index, head.id, head.budget_category.name, head.name, agencyId);
        const preserved = amountByKey.get(key);
        return {
          budget_year_id: yearRow.id,
          funding_agency_id: agencyId,
          budget_category_id: head.budget_category_id,
          budget_head_id: head.id,
          budget_category: head.budget_category.name,
          budget_head: head.name,
          amount: preserved?.amount ?? 0,
          justification: preserved?.justification ?? null,
        };
      })
    );

    await prisma.projectBudgetLine.createMany({ data: rows });
  }

  await prisma.researchProject.update({
    where: { id: projectId },
    data: { section_budget_complete: false },
  });
};

export const computeBudgetYears = (start: Date, end: Date) => {
  const years: { year_index: number; label: string; period_start: Date; period_end: Date }[] =
    [];
  let index = 1;
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (cursor <= endDate) {
    const periodStart = new Date(cursor);
    const yearEnd = new Date(periodStart.getFullYear(), 11, 31);
    const periodEnd = yearEnd > endDate ? endDate : yearEnd;
    years.push({
      year_index: index,
      label: `Year ${index}`,
      period_start: periodStart,
      period_end: periodEnd,
    });
    index += 1;
    cursor = new Date(periodStart.getFullYear() + 1, 0, 1);
  }

  return years;
};
