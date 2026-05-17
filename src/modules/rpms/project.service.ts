import prisma from '../../config/prisma';
import { ClearanceStatus, Prisma, ResearchProjectStatus } from '@prisma/client';
import {
  DELETABLE_PROJECT_STATUSES,
  EDITABLE_PROJECT_STATUSES,
  RESEARCH_PROJECT_STATUS,
} from '../../constants/rpms';
import { RPMS_PI_ASSIGN_ROLES } from '../../constants/roles';
import {
  computeBudgetYears,
  generateProjectCode,
  resolvePiFromEmployeeId,
  seedDefaultClearances,
  seedPiTeamMember,
  syncProjectBudgetStructure,
} from './rpms.helpers';
import { getActiveBudgetHeads } from './master.service';
import { assertUserCanReviewProject, resolveCommitteeForOu } from './committee.service';
import { cached } from '../../cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../cache/cache-keys';
import {
  invalidateProjectCaches,
  invalidateProjectListCaches,
} from '../../cache/invalidation';

const projectInclude = {
  project_type: true,
  department_ou: { select: { id: true, code: true, name: true } },
  funding_agency: true,
  funding_agencies: {
    orderBy: { funding_agency: { name: 'asc' as const } },
    include: {
      funding_agency: { select: { id: true, code: true, name: true } },
    },
  },
  approval_committee: {
    include: {
      organization_unit: { select: { id: true, name: true } },
    },
  },
  team_members: {
    include: {
      employee: {
        select: { id: true, employee_code: true, employee_name: true },
      },
    },
  },
  clearances: { orderBy: { clearance_type: 'asc' as const } },
  budget_years: {
    orderBy: { year_index: 'asc' as const },
    include: {
      lines: {
        orderBy: [
          { funding_agency_id: 'asc' },
          { budget_category: 'asc' },
          { budget_head: 'asc' },
        ],
        include: {
          funding_agency: { select: { id: true, code: true, name: true } },
          budget_category_ref: { select: { id: true, code: true, name: true } },
          budget_head_ref: { select: { id: true, code: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.ResearchProjectInclude;

const assertEditable = (status: ResearchProjectStatus) => {
  if (!EDITABLE_PROJECT_STATUSES.includes(status as (typeof EDITABLE_PROJECT_STATUSES)[number])) {
    throw new Error('Project cannot be edited in its current status');
  }
};

const loadProjectById = async (id: string) =>
  prisma.researchProject.findUnique({
    where: { id },
    include: projectInclude,
  });

const refreshProjectAfterWrite = async (id: string) => {
  await invalidateProjectCaches(id);
  return loadProjectById(id);
};

const rolesCacheKey = (roles: string[]) => [...roles].sort().join(',');

export const listProjectsForUser = async (userId: string, roles: string[]) =>
  cached(
    cacheKeys.projectsForUser(userId, rolesCacheKey(roles)),
    CACHE_TTL.projectList,
    async () => {
      const isResearcherOnly =
        roles.includes('RESEARCHER') &&
        !roles.some((r) =>
          ['SUPER_ADMIN', 'ADMIN', 'RESEARCH_ADMIN', 'COMMITTEE_MEMBER'].includes(r)
        );

      if (isResearcherOnly) {
        return prisma.researchProject.findMany({
          where: { pi_user_id: userId },
          orderBy: { updated_at: 'desc' },
          include: projectInclude,
        });
      }

      const isCommitteeOnly =
        roles.includes('COMMITTEE_MEMBER') &&
        !roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'RESEARCH_ADMIN'].includes(r));

      if (isCommitteeOnly) {
        return prisma.researchProject.findMany({
          where: {
            approval_committee: {
              members: { some: { user_id: userId, is_active: true } },
            },
          },
          orderBy: { updated_at: 'desc' },
          include: projectInclude,
        });
      }

      return prisma.researchProject.findMany({
        orderBy: { updated_at: 'desc' },
        include: projectInclude,
      });
    }
  );

export const getProjectById = async (id: string) =>
  cached(cacheKeys.project(id), CACHE_TTL.project, () => loadProjectById(id));

export const createProjectDraft = async (
  actorUserId: string,
  actorEmployeeId: string | null,
  actorRoles: string[],
  requestedPiEmployeeId?: string | null
) => {
  const canAssignPi = actorRoles.some((r) =>
    RPMS_PI_ASSIGN_ROLES.includes(r as (typeof RPMS_PI_ASSIGN_ROLES)[number])
  );

  let piUserId = actorUserId;
  let piEmployeeId = actorEmployeeId;

  if (requestedPiEmployeeId) {
    if (!canAssignPi) {
      throw new Error('Only administrators can create a proposal for another PI');
    }
    const resolved = await resolvePiFromEmployeeId(requestedPiEmployeeId);
    piUserId = resolved.piUserId;
    piEmployeeId = resolved.piEmployeeId;
  } else if (!piEmployeeId && !canAssignPi) {
    throw new Error('Your account must be linked to an employee record to create a proposal');
  }

  const code = await generateProjectCode();
  const departmentOuId = await getDefaultOuId(piEmployeeId);
  const project = await prisma.researchProject.create({
    data: {
      project_code: code,
      title: 'Untitled proposal',
      department_ou_id: departmentOuId,
      pi_user_id: piUserId,
      pi_employee_id: piEmployeeId,
      status: RESEARCH_PROJECT_STATUS.DRAFT,
    },
    include: projectInclude,
  });
  await seedDefaultClearances(project.id);
  await seedPiTeamMember(project.id, piEmployeeId, piUserId);
  await invalidateProjectListCaches();
  return refreshProjectAfterWrite(project.id);
};

const getDefaultOuId = async (employeeId: string | null) => {
  if (employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { ou_id: true },
    });
    if (emp) return emp.ou_id;
  }
  const ou = await prisma.organizationUnit.findFirst({
    where: { is_active: true },
    orderBy: { name: 'asc' },
  });
  if (!ou) throw new Error('No organization unit configured');
  return ou.id;
};

const canAssignProjectPi = (roles: string[]) =>
  roles.some((r) =>
    RPMS_PI_ASSIGN_ROLES.includes(r as (typeof RPMS_PI_ASSIGN_ROLES)[number])
  );

export const updateProjectBasic = async (
  id: string,
  data: {
    title?: string;
    project_type_id?: string | null;
    department_ou_id?: string;
    abstract?: string | null;
    keywords?: string | null;
    tentative_start_date?: string | null;
    tentative_end_date?: string | null;
    funding_agency_id?: string | null;
    funding_agency_ids?: string[];
    funding_type?: string | null;
    sponsorship_details?: string | null;
    grant_reference?: string | null;
    include_budget_estimate?: boolean;
    pi_employee_id?: string | null;
    co_pi_employee_ids?: string[];
    team_members?: {
      role: string;
      employee_id?: string | null;
      member_name?: string | null;
      designation?: string | null;
    }[];
  },
  actorRoles: string[] = []
) => {
  const project = await loadProjectById(id);
  if (!project) return null;
  assertEditable(project.status);

  const assignPi = canAssignProjectPi(actorRoles);
  let piUserId = project.pi_user_id;
  let piEmployeeId = project.pi_employee_id;

  if (data.pi_employee_id !== undefined && data.pi_employee_id !== project.pi_employee_id) {
    if (!assignPi) {
      throw new Error('Only administrators can change the principal investigator');
    }
    if (!data.pi_employee_id) {
      throw new Error('Principal investigator is required');
    }
    const resolved = await resolvePiFromEmployeeId(data.pi_employee_id);
    piUserId = resolved.piUserId;
    piEmployeeId = resolved.piEmployeeId;
  }

  let teamRows: {
    role: Prisma.ProjectTeamMemberCreateManyInput['role'];
    employee_id: string | null;
    member_name: string | null;
    designation: string | null;
  }[] = [];

  if (data.co_pi_employee_ids !== undefined || data.pi_employee_id !== undefined) {
    const coIds = (data.co_pi_employee_ids ?? []).filter(
      (eid) => eid && eid !== piEmployeeId
    );
    if (!piEmployeeId) {
      throw new Error('Principal investigator is required');
    }
    teamRows = [
      { role: 'PI', employee_id: piEmployeeId, member_name: null, designation: null },
      ...coIds.map((employee_id) => ({
        role: 'CO_PI' as const,
        employee_id,
        member_name: null,
        designation: null,
      })),
    ];
  } else if (data.team_members) {
    const piRow = data.team_members.find((m) => m.role === 'PI');
    if (piRow?.employee_id) {
      if (!assignPi && piRow.employee_id !== project.pi_employee_id) {
        throw new Error('You cannot change the principal investigator on this proposal');
      }
      if (assignPi && piRow.employee_id !== project.pi_employee_id) {
        const resolved = await resolvePiFromEmployeeId(piRow.employee_id);
        piUserId = resolved.piUserId;
        piEmployeeId = resolved.piEmployeeId;
      }
    }
    teamRows = data.team_members.map((m) => ({
      role: m.role as Prisma.ProjectTeamMemberCreateManyInput['role'],
      employee_id: m.employee_id ?? null,
      member_name: m.member_name ?? null,
      designation: m.designation ?? null,
    }));
  }

  if (teamRows.length) {
    await prisma.projectTeamMember.deleteMany({ where: { project_id: id } });
    await prisma.projectTeamMember.createMany({
      data: teamRows.map((m) => ({
        project_id: id,
        role: m.role,
        employee_id: m.employee_id,
        member_name: m.member_name,
        designation: m.designation,
      })),
    });
  }

  let fundingAgencyIds: string[] | undefined;
  if (data.funding_agency_ids !== undefined) {
    fundingAgencyIds = [...new Set(data.funding_agency_ids.filter(Boolean))];
    await prisma.projectFundingAgency.deleteMany({ where: { project_id: id } });
    if (fundingAgencyIds.length) {
      await prisma.projectFundingAgency.createMany({
        data: fundingAgencyIds.map((funding_agency_id) => ({
          project_id: id,
          funding_agency_id,
        })),
      });
    }
  } else if (data.funding_agency_id !== undefined && data.funding_agency_id) {
    fundingAgencyIds = [data.funding_agency_id];
    await prisma.projectFundingAgency.deleteMany({ where: { project_id: id } });
    await prisma.projectFundingAgency.create({
      data: { project_id: id, funding_agency_id: data.funding_agency_id },
    });
  }

  const resolvedFundingAgencyId =
    fundingAgencyIds !== undefined
      ? fundingAgencyIds[0] ?? null
      : data.funding_agency_id;

  const previousAgencyIds = project.funding_agencies
    .map((link) => link.funding_agency_id)
    .sort()
    .join(',');
  const nextAgencyIds = (fundingAgencyIds ?? project.funding_agencies.map((l) => l.funding_agency_id))
    .slice()
    .sort()
    .join(',');
  const agenciesChanged =
    fundingAgencyIds !== undefined && previousAgencyIds !== nextAgencyIds;

  const includeBudget = data.include_budget_estimate ?? project.include_budget_estimate;

  if (
    includeBudget &&
    fundingAgencyIds !== undefined &&
    fundingAgencyIds.length === 0
  ) {
    throw new Error(
      'Select at least one funding agency when budget estimate is included'
    );
  }

  const departmentOuId =
    data.department_ou_id ??
    (piEmployeeId && piEmployeeId !== project.pi_employee_id
      ? (await prisma.employee.findUnique({
          where: { id: piEmployeeId },
          select: { ou_id: true },
        }))?.ou_id
      : undefined) ??
    project.department_ou_id;

  await prisma.researchProject.update({
    where: { id },
    data: {
      title: data.title,
      project_type_id: data.project_type_id,
      department_ou_id: departmentOuId,
      abstract: data.abstract,
      keywords: data.keywords,
      tentative_start_date: data.tentative_start_date
        ? new Date(data.tentative_start_date)
        : undefined,
      tentative_end_date: data.tentative_end_date
        ? new Date(data.tentative_end_date)
        : undefined,
      funding_agency_id: resolvedFundingAgencyId,
      funding_type: data.funding_type,
      sponsorship_details: data.sponsorship_details,
      grant_reference: data.grant_reference,
      include_budget_estimate: includeBudget,
      pi_user_id: piUserId,
      pi_employee_id: piEmployeeId,
      section_basic_complete: Boolean(
        data.title &&
          departmentOuId &&
          data.tentative_start_date &&
          data.tentative_end_date &&
          piEmployeeId
      ),
      section_budget_complete: !includeBudget,
    },
  });

  const startDate = data.tentative_start_date
    ? new Date(data.tentative_start_date)
    : project.tentative_start_date;
  const endDate = data.tentative_end_date
    ? new Date(data.tentative_end_date)
    : project.tentative_end_date;
  const datesChanged =
    (data.tentative_start_date &&
      project.tentative_start_date?.toISOString().slice(0, 10) !==
        data.tentative_start_date) ||
    (data.tentative_end_date &&
      project.tentative_end_date?.toISOString().slice(0, 10) !==
        data.tentative_end_date);

  if (includeBudget && startDate && endDate && (datesChanged || agenciesChanged)) {
    await syncProjectBudgetStructure(id);
  }

  return refreshProjectAfterWrite(id);
};

export const initializeProjectBudget = async (id: string) => {
  const project = await loadProjectById(id);
  if (!project) return null;
  assertEditable(project.status);

  if (!project.include_budget_estimate) {
    throw new Error('Budget estimate is not included for this project');
  }
  if (!project.tentative_start_date || !project.tentative_end_date) {
    throw new Error('Set project dates before entering budget');
  }

  if (!project.budget_years.length) {
    await syncProjectBudgetStructure(id);
  }

  return refreshProjectAfterWrite(id);
};

export const updateProjectInfrastructure = async (
  id: string,
  data: {
    infrastructure_required: boolean;
    laboratory_requirements?: string | null;
    equipment_requirements?: string | null;
    workspace_requirements?: string | null;
    computing_requirements?: string | null;
    university_support_notes?: string | null;
  }
) => {
  const project = await loadProjectById(id);
  if (!project) return null;
  assertEditable(project.status);

  const complete = !data.infrastructure_required || Boolean(data.university_support_notes);

  await prisma.researchProject.update({
    where: { id },
    data: {
      ...data,
      section_infrastructure_complete: complete,
    },
  });

  return refreshProjectAfterWrite(id);
};

export const updateProjectClearances = async (
  id: string,
  clearances: {
    clearance_type: string;
    is_required: boolean;
    committee_name?: string | null;
    application_number?: string | null;
    status: string;
    approval_date?: string | null;
    notes?: string | null;
  }[]
) => {
  const project = await loadProjectById(id);
  if (!project) return null;
  assertEditable(project.status);

  for (const c of clearances) {
    await prisma.projectClearance.upsert({
      where: {
        project_id_clearance_type: {
          project_id: id,
          clearance_type: c.clearance_type,
        },
      },
      create: {
        project_id: id,
        clearance_type: c.clearance_type,
        is_required: c.is_required,
        committee_name: c.committee_name ?? null,
        application_number: c.application_number ?? null,
        status: c.status as ClearanceStatus,
        approval_date: c.approval_date ? new Date(c.approval_date) : null,
        notes: c.notes ?? null,
      },
      update: {
        is_required: c.is_required,
        committee_name: c.committee_name ?? null,
        application_number: c.application_number ?? null,
        status: c.status as ClearanceStatus,
        approval_date: c.approval_date ? new Date(c.approval_date) : null,
        notes: c.notes ?? null,
      },
    });
  }

  await prisma.researchProject.update({
    where: { id },
    data: { section_clearance_complete: true },
  });

  return refreshProjectAfterWrite(id);
};

export const updateProjectBudget = async (
  id: string,
  lines: {
    year_index: number;
    funding_agency_id?: string | null;
    budget_head_id?: string | null;
    budget_category?: string;
    budget_head?: string;
    amount: number;
    justification?: string | null;
  }[]
) => {
  const project = await loadProjectById(id);
  if (!project) return null;
  assertEditable(project.status);

  if (!project.include_budget_estimate) {
    throw new Error('Budget estimate is not included for this project');
  }
  if (!project.tentative_start_date || !project.tentative_end_date) {
    throw new Error('Set project dates before entering budget');
  }

  const heads = await getActiveBudgetHeads();
  const headById = new Map(heads.map((h) => [h.id, h]));

  const agencyLinks = await prisma.projectFundingAgency.findMany({
    where: { project_id: id },
    select: { funding_agency_id: true },
  });
  const agencyIds = agencyLinks.map((link) => link.funding_agency_id);

  if (!agencyIds.length) {
    throw new Error('Select at least one funding agency before entering the budget');
  }

  await prisma.projectBudgetYear.deleteMany({ where: { project_id: id } });
  const years = computeBudgetYears(
    project.tentative_start_date,
    project.tentative_end_date
  );

  for (const y of years) {
    const yearRow = await prisma.projectBudgetYear.create({
      data: {
        project_id: id,
        year_index: y.year_index,
        label: y.label,
        period_start: y.period_start,
        period_end: y.period_end,
      },
    });

    const yearLines = lines.filter((l) => l.year_index === y.year_index);
    const rows: Prisma.ProjectBudgetLineCreateManyInput[] = [];

    for (const agencyId of agencyIds) {
      const agencyYearLines = yearLines.filter(
        (l) => l.funding_agency_id === agencyId
      );

      if (agencyYearLines.length > 0) {
        for (const l of agencyYearLines) {
          const head = l.budget_head_id ? headById.get(l.budget_head_id) : null;
          if (l.budget_head_id && !head) {
            throw new Error('Invalid budget head selected');
          }
          rows.push({
            budget_year_id: yearRow.id,
            funding_agency_id: agencyId,
            budget_category_id: head?.budget_category_id ?? null,
            budget_head_id: head?.id ?? null,
            budget_category: head?.budget_category.name ?? l.budget_category ?? 'General',
            budget_head: head?.name ?? l.budget_head ?? 'Line item',
            amount: l.amount,
            justification: l.justification ?? null,
          });
        }
      } else {
        for (const head of heads) {
          rows.push({
            budget_year_id: yearRow.id,
            funding_agency_id: agencyId,
            budget_category_id: head.budget_category_id,
            budget_head_id: head.id,
            budget_category: head.budget_category.name,
            budget_head: head.name,
            amount: 0,
            justification: null,
          });
        }
      }
    }

    if (rows.length) {
      await prisma.projectBudgetLine.createMany({ data: rows });
    }
  }

  await prisma.researchProject.update({
    where: { id },
    data: { section_budget_complete: true },
  });

  return refreshProjectAfterWrite(id);
};

export const getProjectPreview = async (id: string) =>
  cached(cacheKeys.projectPreview(id), CACHE_TTL.projectPreview, async () => {
    const project = await loadProjectById(id);
    if (!project) return null;

    const committee =
      project.department_ou_id
        ? await resolveCommitteeForOu(project.department_ou_id)
        : null;

    return { project, resolved_committee: committee };
  });

export const submitProjectToCommittee = async (id: string, actorUserId: string) => {
  const project = await loadProjectById(id);
  if (!project) return null;

  if (!EDITABLE_PROJECT_STATUSES.includes(project.status as (typeof EDITABLE_PROJECT_STATUSES)[number])) {
    throw new Error('Project cannot be submitted in its current status');
  }

  if (
    !project.section_basic_complete ||
    !project.section_infrastructure_complete ||
    !project.section_clearance_complete ||
    !project.section_budget_complete
  ) {
    throw new Error('Complete all required sections before submit');
  }

  const committee = await resolveCommitteeForOu(project.department_ou_id);
  if (!committee) {
    throw new Error(
      'No approval committee configured for the selected department. Contact research admin.'
    );
  }

  const fromStatus = project.status;

  await prisma.researchProject.update({
    where: { id },
    data: {
      status: RESEARCH_PROJECT_STATUS.UNDER_COMMITTEE_REVIEW,
      approval_committee_id: committee.id,
      submitted_at: new Date(),
      revision_notes: null,
    },
  });

  await prisma.projectStatusHistory.create({
    data: {
      project_id: id,
      from_status: fromStatus,
      to_status: RESEARCH_PROJECT_STATUS.UNDER_COMMITTEE_REVIEW,
      actor_user_id: actorUserId,
      comments: `Submitted to ${committee.name}`,
    },
  });

  return refreshProjectAfterWrite(id);
};

const recordCommitteeDecision = async (
  id: string,
  actorUserId: string,
  toStatus: (typeof RESEARCH_PROJECT_STATUS)[keyof typeof RESEARCH_PROJECT_STATUS],
  comments: string | null,
  roles: string[]
) => {
  const project = await assertUserCanReviewProject(id, actorUserId, roles);
  const fromStatus = project.status;

  await prisma.researchProject.update({
    where: { id },
    data: {
      status: toStatus,
      revision_notes:
        toStatus === RESEARCH_PROJECT_STATUS.REVISION_REQUESTED
          ? comments
          : null,
    },
  });

  await prisma.projectStatusHistory.create({
    data: {
      project_id: id,
      from_status: fromStatus,
      to_status: toStatus,
      actor_user_id: actorUserId,
      comments: comments ?? undefined,
    },
  });

  return refreshProjectAfterWrite(id);
};

export const approveProjectByCommittee = async (
  id: string,
  actorUserId: string,
  roles: string[],
  comments?: string | null
) =>
  recordCommitteeDecision(
    id,
    actorUserId,
    RESEARCH_PROJECT_STATUS.COMMITTEE_APPROVED,
    comments?.trim() || 'Approved by committee',
    roles
  );

export const rejectProjectByCommittee = async (
  id: string,
  actorUserId: string,
  roles: string[],
  comments: string
) => {
  if (!comments.trim()) {
    throw new Error('Rejection comments are required');
  }
  return recordCommitteeDecision(
    id,
    actorUserId,
    RESEARCH_PROJECT_STATUS.COMMITTEE_REJECTED,
    comments.trim(),
    roles
  );
};

export const requestProjectRevision = async (
  id: string,
  actorUserId: string,
  roles: string[],
  comments: string
) => {
  if (!comments.trim()) throw new Error('Revision comments are required');

  return recordCommitteeDecision(
    id,
    actorUserId,
    RESEARCH_PROJECT_STATUS.REVISION_REQUESTED,
    comments.trim(),
    roles
  );
};

export const listMasters = async () =>
  cached(cacheKeys.rpmsMasters, CACHE_TTL.masters, async () => {
  const [projectTypes, fundingAgencies, budgetCategories, organizationUnits, teamEmployees] =
    await Promise.all([
      prisma.projectType.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } }),
      prisma.fundingAgency.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } }),
      prisma.budgetCategory.findMany({
        where: { is_active: true },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
        include: {
          heads: {
            where: { is_active: true },
            orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
          },
        },
      }),
      prisma.organizationUnit.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true },
      }),
      prisma.employee.findMany({
        where: { is_active: true },
        orderBy: { employee_name: 'asc' },
        select: {
          id: true,
          employee_code: true,
          employee_name: true,
          ou_id: true,
          user: { select: { id: true, username: true, is_active: true } },
        },
      }),
    ]);

  const teamEmployeesForPi = teamEmployees
    .filter((e) => e.user?.is_active)
    .map((e) => ({
      id: e.id,
      employee_code: e.employee_code,
      employee_name: e.employee_name,
      ou_id: e.ou_id,
      username: e.user?.username ?? null,
    }));

  return {
    projectTypes,
    fundingAgencies,
    budgetCategories,
    organizationUnits,
    teamEmployees: teamEmployeesForPi,
  };
});

export const deleteProject = async (
  id: string,
  actorUserId: string,
  actorRoles: string[]
) => {
  const project = await loadProjectById(id);
  if (!project) return null;

  if (
    !DELETABLE_PROJECT_STATUSES.includes(
      project.status as (typeof DELETABLE_PROJECT_STATUSES)[number]
    )
  ) {
    throw new Error('Only draft proposals can be deleted');
  }

  const canDeleteAny = canAssignProjectPi(actorRoles);
  const isPi = project.pi_user_id === actorUserId;

  if (!isPi && !canDeleteAny) {
    throw new Error('You do not have permission to delete this proposal');
  }

  await prisma.researchProject.delete({ where: { id } });
  await invalidateProjectCaches(id);

  return { id: project.id, project_code: project.project_code };
};

export const exportProjectInclude = {
  ...projectInclude,
  pi_user: {
    select: {
      username: true,
      employee: { select: { employee_code: true, employee_name: true } },
    },
  },
} satisfies Prisma.ResearchProjectInclude;

export const buildProjectListWhereForUser = (
  userId: string,
  roles: string[]
): Prisma.ResearchProjectWhereInput => {
  const isResearcherOnly =
    roles.includes('RESEARCHER') &&
    !roles.some((r) =>
      ['SUPER_ADMIN', 'ADMIN', 'RESEARCH_ADMIN', 'COMMITTEE_MEMBER'].includes(r)
    );

  if (isResearcherOnly) {
    return { pi_user_id: userId };
  }

  const isCommitteeOnly =
    roles.includes('COMMITTEE_MEMBER') &&
    !roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'RESEARCH_ADMIN'].includes(r));

  if (isCommitteeOnly) {
    return {
      approval_committee: {
        members: { some: { user_id: userId, is_active: true } },
      },
    };
  }

  return {};
};

export const fetchProjectsForExport = async (
  userId: string,
  roles: string[],
  projectIds?: string[]
) => {
  const accessWhere = buildProjectListWhereForUser(userId, roles);
  const where: Prisma.ResearchProjectWhereInput = projectIds?.length
    ? { AND: [accessWhere, { id: { in: projectIds } }] }
    : accessWhere;

  return prisma.researchProject.findMany({
    where,
    orderBy: { updated_at: 'desc' },
    include: exportProjectInclude,
  });
};

export const assertUserCanAccessProject = async (
  userId: string,
  roles: string[],
  projectId: string
) => {
  const project = await prisma.researchProject.findFirst({
    where: {
      id: projectId,
      ...buildProjectListWhereForUser(userId, roles),
    },
    select: { id: true },
  });

  if (!project) {
    throw new Error('Proposal not found or access denied');
  }
};
