import { Request, Response } from 'express';
import * as exportService from './proposal-export.service';
import type { CreateProposalExportInput } from './proposal-export.types';

const getUserId = (req: Request) => (req as Request & { userId?: string }).userId!;
const getRoles = (req: Request) =>
  ((req as Request & { roles?: string[] }).roles ?? []) as string[];

const getRouteId = (req: Request): string | null => {
  const raw = req.params.id;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (Array.isArray(raw) && raw[0]) return raw[0];
  return null;
};

export const createExport = async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateProposalExportInput;
    const projectIds = Array.isArray(body.projectIds)
      ? body.projectIds
      : typeof body.projectIds === 'string'
        ? [body.projectIds]
        : body.scope === 'single' && typeof req.body?.projectId === 'string'
          ? [req.body.projectId]
          : [];

    const job = await exportService.createProposalExportJob(
      getUserId(req),
      getRoles(req),
      {
        format: body.format,
        scope: body.scope ?? 'all',
        projectIds,
      }
    );

    res.status(202).json(job);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const listExports = async (req: Request, res: Response) => {
  try {
    const limit =
      typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 20;
    const jobs = await exportService.listProposalExportJobsForUser(
      getUserId(req),
      Number.isFinite(limit) ? limit : 20
    );
    res.json(jobs);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const getExport = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid export id' });
      return;
    }

    const job = await exportService.getProposalExportJobForUser(getUserId(req), id);
    if (!job) {
      res.status(404).json({ message: 'Export job not found' });
      return;
    }

    res.json(job);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const downloadExport = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid export id' });
      return;
    }

    const file = await exportService.getProposalExportDownload(getUserId(req), id);
    if (!file) {
      res.status(404).json({ message: 'Export job not found' });
      return;
    }

    res.download(file.absolutePath, file.fileName, {
      headers: { 'Content-Type': file.mimeType },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error';
    const status = message.includes('not ready') ? 409 : 400;
    res.status(status).json({ message });
  }
};
