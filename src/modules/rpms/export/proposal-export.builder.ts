import fs from 'fs/promises';
import path from 'path';
import ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';

export type ExportProject = Prisma.ResearchProjectGetPayload<{
  include: {
    project_type: true;
    department_ou: { select: { id: true; code: true; name: true } };
    funding_agency: true;
    funding_agencies: {
      include: { funding_agency: { select: { id: true; code: true; name: true } } };
    };
    approval_committee: {
      include: { organization_unit: { select: { id: true; name: true } } };
    };
    team_members: {
      include: {
        employee: {
          select: { id: true; employee_code: true; employee_name: true };
        };
      };
    };
    clearances: true;
    budget_years: {
      include: {
        lines: {
          include: {
            funding_agency: { select: { id: true; code: true; name: true } };
            budget_category_ref: { select: { id: true; code: true; name: true } };
            budget_head_ref: { select: { id: true; code: true; name: true } };
          };
        };
      };
    };
    pi_user: {
      select: {
        username: true;
        employee: { select: { employee_code: true; employee_name: true } };
      };
    };
  };
}>;

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const piLabel = (project: ExportProject) => {
  const emp = project.pi_user?.employee;
  if (emp?.employee_name) {
    return emp.employee_code
      ? `${emp.employee_name} (${emp.employee_code})`
      : emp.employee_name;
  }
  return project.pi_user?.username ?? '';
};

const fundingAgenciesLabel = (project: ExportProject) => {
  const fromJunction = project.funding_agencies
    .map((fa) => fa.funding_agency.name)
    .filter(Boolean);
  if (fromJunction.length) return fromJunction.join(', ');
  return project.funding_agency?.name ?? '';
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  REVISION_REQUESTED: 'Revision requested',
  SUBMITTED_TO_COMMITTEE: 'Submitted to committee',
  UNDER_COMMITTEE_REVIEW: 'Under committee review',
  COMMITTEE_APPROVED: 'Approved',
  COMMITTEE_REJECTED: 'Rejected',
};

export const buildProposalSummaryRows = (projects: ExportProject[]) =>
  projects.map((p) => ({
    project_code: p.project_code,
    title: p.title,
    status: statusLabels[p.status] ?? p.status,
    project_type: p.project_type?.name ?? '',
    department: p.department_ou.name,
    pi: piLabel(p),
    funding_agencies: fundingAgenciesLabel(p),
    funding_type: p.funding_type ?? '',
    start_date: formatDate(p.tentative_start_date),
    end_date: formatDate(p.tentative_end_date),
    submitted_at: formatDate(p.submitted_at),
    updated_at: formatDate(p.updated_at),
    sections_complete: [
      p.section_basic_complete ? 'Basic' : null,
      p.section_infrastructure_complete ? 'Infrastructure' : null,
      p.section_clearance_complete ? 'Clearances' : null,
      p.section_budget_complete ? 'Budget' : null,
    ]
      .filter(Boolean)
      .join(', '),
  }));

const writeJsonExport = async (filePath: string, projects: ExportProject[]) => {
  const payload = projects.map((project) => ({
    ...project,
    tentative_start_date: formatDate(project.tentative_start_date),
    tentative_end_date: formatDate(project.tentative_end_date),
    submitted_at: project.submitted_at?.toISOString() ?? null,
    created_at: project.created_at.toISOString(),
    updated_at: project.updated_at.toISOString(),
    budget_years: project.budget_years.map((year) => ({
      ...year,
      lines: year.lines.map((line) => ({
        ...line,
        amount: Number(line.amount),
      })),
    })),
  }));
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
};

const addSummarySheet = (workbook: ExcelJS.Workbook, projects: ExportProject[]) => {
  const sheet = workbook.addWorksheet('Proposals');
  sheet.columns = [
    { header: 'Code', key: 'project_code', width: 14 },
    { header: 'Title', key: 'title', width: 36 },
    { header: 'Status', key: 'status', width: 22 },
    { header: 'Type', key: 'project_type', width: 18 },
    { header: 'Department', key: 'department', width: 22 },
    { header: 'PI', key: 'pi', width: 24 },
    { header: 'Funding agencies', key: 'funding_agencies', width: 28 },
    { header: 'Funding type', key: 'funding_type', width: 16 },
    { header: 'Start', key: 'start_date', width: 12 },
    { header: 'End', key: 'end_date', width: 12 },
    { header: 'Submitted', key: 'submitted_at', width: 12 },
    { header: 'Updated', key: 'updated_at', width: 12 },
    { header: 'Sections complete', key: 'sections_complete', width: 28 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRows(buildProposalSummaryRows(projects));
};

const addDetailSheets = (workbook: ExcelJS.Workbook, project: ExportProject) => {
  const safeName = project.project_code.replace(/[\\/*?:[\]]/g, '-').slice(0, 28);

  const basic = workbook.addWorksheet(`${safeName} Basic`);
  basic.addRows([
    ['Code', project.project_code],
    ['Title', project.title],
    ['Status', statusLabels[project.status] ?? project.status],
    ['Type', project.project_type?.name ?? ''],
    ['Department', project.department_ou.name],
    ['PI', piLabel(project)],
    ['Abstract', project.abstract ?? ''],
    ['Keywords', project.keywords ?? ''],
    ['Funding agencies', fundingAgenciesLabel(project)],
    ['Funding type', project.funding_type ?? ''],
    ['Grant reference', project.grant_reference ?? ''],
    ['Start date', formatDate(project.tentative_start_date)],
    ['End date', formatDate(project.tentative_end_date)],
    ['Committee', project.approval_committee?.name ?? ''],
  ]);

  const team = workbook.addWorksheet(`${safeName} Team`);
  team.columns = [
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Designation', key: 'designation', width: 22 },
  ];
  team.getRow(1).font = { bold: true };
  team.addRows(
    project.team_members.map((m) => ({
      role: m.role,
      name: m.employee?.employee_name ?? m.member_name ?? '',
      designation: m.designation ?? '',
    }))
  );

  const clearances = workbook.addWorksheet(`${safeName} Clearances`);
  clearances.columns = [
    { header: 'Type', key: 'clearance_type', width: 22 },
    { header: 'Required', key: 'is_required', width: 10 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Committee', key: 'committee_name', width: 22 },
    { header: 'Application #', key: 'application_number', width: 16 },
  ];
  clearances.getRow(1).font = { bold: true };
  clearances.addRows(
    project.clearances.map((c) => ({
      clearance_type: c.clearance_type,
      is_required: c.is_required ? 'Yes' : 'No',
      status: c.status,
      committee_name: c.committee_name ?? '',
      application_number: c.application_number ?? '',
    }))
  );

  const budget = workbook.addWorksheet(`${safeName} Budget`);
  budget.columns = [
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Agency', key: 'agency', width: 22 },
    { header: 'Category', key: 'category', width: 22 },
    { header: 'Head', key: 'head', width: 22 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Justification', key: 'justification', width: 36 },
  ];
  budget.getRow(1).font = { bold: true };
  const budgetRows = project.budget_years.flatMap((year) =>
    year.lines.map((line) => ({
      year: year.label ?? `Year ${year.year_index}`,
      agency: line.funding_agency?.name ?? '',
      category: line.budget_category_ref?.name ?? line.budget_category ?? '',
      head: line.budget_head_ref?.name ?? line.budget_head ?? '',
      amount: Number(line.amount),
      justification: line.justification ?? '',
    }))
  );
  budget.addRows(budgetRows);
};

const writeXlsxExport = async (filePath: string, projects: ExportProject[]) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'UNIFY RPMS';
  workbook.created = new Date();

  addSummarySheet(workbook, projects);

  if (projects.length === 1) {
    addDetailSheets(workbook, projects[0]);
  }

  await workbook.xlsx.writeFile(filePath);
};

export const writeProposalExportFile = async (
  format: 'xlsx' | 'json',
  filePath: string,
  projects: ExportProject[]
) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  if (format === 'json') {
    await writeJsonExport(filePath, projects);
    return;
  }

  await writeXlsxExport(filePath, projects);
};

export const buildExportFileName = (
  format: 'xlsx' | 'json',
  scope: string,
  projectCodes: string[]
) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ext = format === 'json' ? 'json' : 'xlsx';
  if (scope === 'single' && projectCodes[0]) {
    return `proposal-${projectCodes[0]}-${stamp}.${ext}`;
  }
  if (scope === 'selected' && projectCodes.length) {
    return `proposals-selected-${projectCodes.length}-${stamp}.${ext}`;
  }
  return `proposals-export-${stamp}.${ext}`;
};
