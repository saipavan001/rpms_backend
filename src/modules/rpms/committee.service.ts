import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';
import { cached } from '../../cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../cache/cache-keys';
import { invalidateCommitteeCaches } from '../../cache/invalidation';
import { getAdministrativeUsers } from './rpms.helpers';

const committeeInclude = {
  organization_unit: { select: { id: true, code: true, name: true } },
  members: {
    where: { is_active: true },
    orderBy: { display_order: 'asc' as const },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          employee: {
            select: { employee_code: true, employee_name: true },
          },
        },
      },
      committee_role: { select: { id: true, code: true, name: true } },
    },
  },
} satisfies Prisma.ApprovalCommitteeInclude;

export const listCommitteeRoles = () =>
  cached(cacheKeys.committeeRoles, CACHE_TTL.committees, () =>
    prisma.committeeRole.findMany({
      where: { is_active: true },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
    })
  );

export const listCommittees = () =>
  cached(cacheKeys.committees, CACHE_TTL.committees, () =>
    prisma.approvalCommittee.findMany({
      orderBy: { name: 'asc' },
      include: committeeInclude,
    })
  );

export const getCommitteeByOuId = (ouId: string) =>
  cached(cacheKeys.committeeByOu(ouId), CACHE_TTL.committees, () =>
    prisma.approvalCommittee.findUnique({
      where: { ou_id: ouId },
      include: committeeInclude,
    })
  );

export const upsertCommitteeForOu = async (data: {
  ou_id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
}) => {
  const committee = await prisma.approvalCommittee.upsert({
    where: { ou_id: data.ou_id },
    create: {
      ou_id: data.ou_id,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      is_active: data.is_active ?? true,
    },
    update: {
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      is_active: data.is_active ?? true,
    },
    include: committeeInclude,
  });
  await invalidateCommitteeCaches(data.ou_id);
  return committee;
};

export const replaceCommitteeMembers = async (
  committeeId: string,
  members: {
    user_id: string;
    committee_role_id: string;
    display_order?: number;
    review_sequence?: number | null;
  }[]
) => {
  const adminIds = new Set((await getAdministrativeUsers()).map((u) => u.id));
  for (const m of members) {
    if (!adminIds.has(m.user_id)) {
      throw new Error('Only administrative users can be committee members');
    }
  }

  await prisma.$transaction([
    prisma.approvalCommitteeMember.deleteMany({ where: { committee_id: committeeId } }),
    prisma.approvalCommitteeMember.createMany({
      data: members.map((m, i) => ({
        committee_id: committeeId,
        user_id: m.user_id,
        committee_role_id: m.committee_role_id,
        display_order: m.display_order ?? i + 1,
        review_sequence: m.review_sequence ?? null,
        is_active: true,
      })),
    }),
  ]);

  const committee = await prisma.approvalCommittee.findUnique({
    where: { id: committeeId },
    include: committeeInclude,
  });
  if (committee) {
    await invalidateCommitteeCaches(committee.ou_id);
  }
  return committee;
};

export const resolveCommitteeForOu = (ouId: string) =>
  prisma.approvalCommittee.findFirst({
    where: { ou_id: ouId, is_active: true },
    include: { organization_unit: { select: { id: true, name: true } } },
  });

export const isCommitteeReviewerRole = (roles: string[]) =>
  roles.some((r) =>
    ['SUPER_ADMIN', 'ADMIN', 'RESEARCH_ADMIN', 'COMMITTEE_MEMBER'].includes(r)
  );

export const assertUserCanReviewProject = async (
  projectId: string,
  userId: string,
  roles: string[]
) => {
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    include: {
      approval_committee: {
        include: {
          members: { where: { is_active: true } },
        },
      },
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  const reviewable = ['SUBMITTED_TO_COMMITTEE', 'UNDER_COMMITTEE_REVIEW'];
  if (!reviewable.includes(project.status)) {
    throw new Error('This proposal is not awaiting a committee decision');
  }

  const isOverrideReviewer = roles.some((r) =>
    ['SUPER_ADMIN', 'ADMIN', 'RESEARCH_ADMIN'].includes(r)
  );

  if (!isOverrideReviewer) {
    const committeeId = project.approval_committee_id;
    if (!committeeId) {
      throw new Error('No approval committee is assigned to this proposal');
    }
    const isMember = project.approval_committee?.members.some(
      (m) => m.user_id === userId
    );
    if (!isMember) {
      throw new Error('You are not a member of this proposal’s approval committee');
    }
  }

  return project;
};

export { getAdministrativeUsers };
