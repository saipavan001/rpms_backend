import {
  ProposalExportFormat,
  ProposalExportScope,
  ProposalExportStatus,
} from '@prisma/client';

export type CreateProposalExportInput = {
  format?: 'xlsx' | 'json';
  scope: 'all' | 'selected' | 'single';
  projectIds?: string[];
};

export type ProposalExportJobView = {
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
  download_ready: boolean;
};

export const parseExportFormat = (value: unknown): ProposalExportFormat => {
  if (typeof value === 'string' && value.toLowerCase() === 'json') {
    return ProposalExportFormat.JSON;
  }
  return ProposalExportFormat.XLSX;
};

export const parseExportScope = (value: unknown): ProposalExportScope => {
  if (value === 'single') return ProposalExportScope.SINGLE;
  if (value === 'selected') return ProposalExportScope.SELECTED;
  return ProposalExportScope.ALL;
};
