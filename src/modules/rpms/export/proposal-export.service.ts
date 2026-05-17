import fs from 'fs/promises';
import path from 'path';
import {
  ProposalExportFormat,
  ProposalExportScope,
  ProposalExportStatus,
} from '@prisma/client';
import prisma from '../../../config/prisma';
import { isBullMqAvailable } from '../../../queues/bull-connection';
import { getProposalExportQueue } from '../../../queues/proposal-export.queue';
import {
  assertUserCanAccessProject,
  fetchProjectsForExport,
} from '../project.service';
import {
  buildExportFileName,
  writeProposalExportFile,
  type ExportProject,
} from './proposal-export.builder';
import {
  CreateProposalExportInput,
  parseExportFormat,
  parseExportScope,
  type ProposalExportJobView,
} from './proposal-export.types';

const EXPORTS_DIR =
  process.env.EXPORTS_DIR?.trim() || path.join(process.cwd(), 'exports');

const toApiFormat = (format: ProposalExportFormat): 'xlsx' | 'json' =>
  format === ProposalExportFormat.JSON ? 'json' : 'xlsx';

const toJobView = (job: {
  id: string;
  status: ProposalExportStatus;
  format: ProposalExportFormat;
  scope: ProposalExportScope;
  project_ids: string[];
  file_name: string | null;
  file_size: number | null;
  error_message: string | null;
  created_at: Date;
  completed_at: Date | null;
  file_path: string | null;
}): ProposalExportJobView => ({
  id: job.id,
  status: job.status,
  format: job.format,
  scope: job.scope,
  project_ids: job.project_ids,
  file_name: job.file_name,
  file_size: job.file_size,
  error_message: job.error_message,
  created_at: job.created_at,
  completed_at: job.completed_at,
  download_ready:
    job.status === ProposalExportStatus.COMPLETED && Boolean(job.file_path),
});

const resolveProjectIds = async (
  userId: string,
  roles: string[],
  scope: ProposalExportScope,
  projectIds: string[]
) => {
  if (scope === ProposalExportScope.SINGLE) {
    if (projectIds.length !== 1) {
      throw new Error('Exactly one project id is required for single export');
    }
    await assertUserCanAccessProject(userId, roles, projectIds[0]);
    return projectIds;
  }

  if (scope === ProposalExportScope.SELECTED) {
    if (!projectIds.length) {
      throw new Error('Select at least one proposal to export');
    }
    for (const id of projectIds) {
      await assertUserCanAccessProject(userId, roles, id);
    }
    return projectIds;
  }

  const visible = await fetchProjectsForExport(userId, roles);
  if (!visible.length) {
    throw new Error('No proposals available to export');
  }
  return visible.map((p) => p.id);
};

export const createProposalExportJob = async (
  userId: string,
  roles: string[],
  input: CreateProposalExportInput
) => {
  if (!isBullMqAvailable()) {
    const hint = process.env.REDIS_URL?.trim()
      ? 'Redis is configured but not connected. Start Redis and restart the API.'
      : 'Set REDIS_URL in .env (e.g. redis://localhost:6379), start Redis, and restart the API.';
    throw new Error(`Export queue is unavailable. ${hint}`);
  }

  const scope = parseExportScope(input.scope);
  const format = parseExportFormat(input.format);
  const rawIds = Array.isArray(input.projectIds)
    ? [...new Set(input.projectIds.filter((id) => typeof id === 'string' && id))]
    : [];

  const projectIds = await resolveProjectIds(userId, roles, scope, rawIds);

  const job = await prisma.proposalExportJob.create({
    data: {
      user_id: userId,
      format,
      scope,
      project_ids: projectIds,
      status: ProposalExportStatus.PENDING,
    },
  });

  const bullJob = await getProposalExportQueue().add(
    'export',
    { dbJobId: job.id },
    { jobId: job.id }
  );

  await prisma.proposalExportJob.update({
    where: { id: job.id },
    data: { bull_job_id: bullJob.id },
  });

  return toJobView(job);
};

export const getProposalExportJobForUser = async (userId: string, jobId: string) => {
  const job = await prisma.proposalExportJob.findFirst({
    where: { id: jobId, user_id: userId },
  });

  if (!job) {
    return null;
  }

  return toJobView(job);
};

export const listProposalExportJobsForUser = async (
  userId: string,
  limit = 20
) => {
  const jobs = await prisma.proposalExportJob.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: Math.min(limit, 50),
  });

  return jobs.map(toJobView);
};

export const getProposalExportDownload = async (userId: string, jobId: string) => {
  const job = await prisma.proposalExportJob.findFirst({
    where: { id: jobId, user_id: userId },
  });

  if (!job) {
    return null;
  }

  if (job.status !== ProposalExportStatus.COMPLETED || !job.file_path || !job.file_name) {
    throw new Error('Export file is not ready for download');
  }

  const absolutePath = path.resolve(job.file_path);
  const exportsRoot = path.resolve(EXPORTS_DIR);
  if (!absolutePath.startsWith(exportsRoot)) {
    throw new Error('Invalid export file path');
  }

  await fs.access(absolutePath);

  return {
    absolutePath,
    fileName: job.file_name,
    mimeType:
      job.format === ProposalExportFormat.JSON
        ? 'application/json'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};

export const processProposalExportJob = async (dbJobId: string) => {
  const job = await prisma.proposalExportJob.findUnique({ where: { id: dbJobId } });
  if (!job) {
    throw new Error('Export job not found');
  }

  await prisma.proposalExportJob.update({
    where: { id: dbJobId },
    data: {
      status: ProposalExportStatus.PROCESSING,
      error_message: null,
    },
  });

  try {
    const roles = await prisma.userRole.findMany({
      where: { user_id: job.user_id, is_active: true },
      include: { role: { select: { code: true } } },
    });
    const roleCodes = roles.map((r) => r.role.code);

    const projects = (await fetchProjectsForExport(
      job.user_id,
      roleCodes,
      job.project_ids.length ? job.project_ids : undefined
    )) as ExportProject[];

    if (!projects.length) {
      throw new Error('No proposals found for export');
    }

    const format = toApiFormat(job.format);
    const fileName = buildExportFileName(
      format,
      job.scope.toLowerCase(),
      projects.map((p) => p.project_code)
    );
    const filePath = path.join(EXPORTS_DIR, job.user_id, `${dbJobId}-${fileName}`);

    await writeProposalExportFile(format, filePath, projects);
    const stat = await fs.stat(filePath);

    await prisma.proposalExportJob.update({
      where: { id: dbJobId },
      data: {
        status: ProposalExportStatus.COMPLETED,
        file_name: fileName,
        file_path: filePath,
        file_size: stat.size,
        completed_at: new Date(),
        error_message: null,
      },
    });

    return { fileName, filePath, fileSize: stat.size };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    await prisma.proposalExportJob.update({
      where: { id: dbJobId },
      data: {
        status: ProposalExportStatus.FAILED,
        error_message: message,
        completed_at: new Date(),
      },
    });
    throw error;
  }
};

export const getExportsDirectory = () => EXPORTS_DIR;
