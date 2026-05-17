import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRoles } from '../../middleware/authorize.middleware';
import {
  RPMS_COMMITTEE_ROLES,
  RPMS_RESEARCHER_ROLES,
  RPMS_SETTINGS_ROLES,
} from '../../constants/roles';
import {
  createExport,
  downloadExport,
  getExport,
  listExports,
} from './export/proposal-export.controller';
import {
  createBudgetCategory,
  createBudgetHead,
  createFundingAgency,
  createProject,
  deleteBudgetCategory,
  deleteBudgetHead,
  deleteFundingAgency,
  deleteProject,
  getEligibleCommitteeUsers,
  getPreview,
  getProject,
  initializeBudget,
  listBudgetCategories,
  listCommitteeRoles,
  listCommittees,
  listFundingAgencies,
  listMasters,
  listProjects,
  approveProject,
  rejectProject,
  requestRevision,
  setCommitteeMembers,
  submitProject,
  updateBasic,
  updateBudget,
  updateBudgetCategory,
  updateBudgetHead,
  updateClearances,
  updateFundingAgency,
  updateInfrastructure,
  upsertCommittee,
} from './rpms.controller';

const router = Router();

router.use(authenticate);

router.get('/masters', requireRoles(...RPMS_RESEARCHER_ROLES), listMasters);

router.get(
  '/settings/committee-roles',
  requireRoles(...RPMS_SETTINGS_ROLES),
  listCommitteeRoles
);
router.get(
  '/settings/committees',
  requireRoles(...RPMS_SETTINGS_ROLES),
  listCommittees
);
router.get(
  '/settings/eligible-committee-users',
  requireRoles(...RPMS_SETTINGS_ROLES),
  getEligibleCommitteeUsers
);
router.post(
  '/settings/committees',
  requireRoles(...RPMS_SETTINGS_ROLES),
  upsertCommittee
);
router.put(
  '/settings/committees/:id/members',
  requireRoles(...RPMS_SETTINGS_ROLES),
  setCommitteeMembers
);

router.get(
  '/settings/funding-agencies',
  requireRoles(...RPMS_SETTINGS_ROLES),
  listFundingAgencies
);
router.post(
  '/settings/funding-agencies',
  requireRoles(...RPMS_SETTINGS_ROLES),
  createFundingAgency
);
router.patch(
  '/settings/funding-agencies/:id',
  requireRoles(...RPMS_SETTINGS_ROLES),
  updateFundingAgency
);
router.delete(
  '/settings/funding-agencies/:id',
  requireRoles(...RPMS_SETTINGS_ROLES),
  deleteFundingAgency
);

router.get(
  '/settings/budget-categories',
  requireRoles(...RPMS_SETTINGS_ROLES),
  listBudgetCategories
);
router.post(
  '/settings/budget-categories',
  requireRoles(...RPMS_SETTINGS_ROLES),
  createBudgetCategory
);
router.patch(
  '/settings/budget-categories/:id',
  requireRoles(...RPMS_SETTINGS_ROLES),
  updateBudgetCategory
);
router.delete(
  '/settings/budget-categories/:id',
  requireRoles(...RPMS_SETTINGS_ROLES),
  deleteBudgetCategory
);

router.post(
  '/settings/budget-heads',
  requireRoles(...RPMS_SETTINGS_ROLES),
  createBudgetHead
);
router.patch(
  '/settings/budget-heads/:id',
  requireRoles(...RPMS_SETTINGS_ROLES),
  updateBudgetHead
);
router.delete(
  '/settings/budget-heads/:id',
  requireRoles(...RPMS_SETTINGS_ROLES),
  deleteBudgetHead
);

router.get('/exports', requireRoles(...RPMS_RESEARCHER_ROLES), listExports);
router.post('/exports', requireRoles(...RPMS_RESEARCHER_ROLES), createExport);
router.get('/exports/:id', requireRoles(...RPMS_RESEARCHER_ROLES), getExport);
router.get(
  '/exports/:id/download',
  requireRoles(...RPMS_RESEARCHER_ROLES),
  downloadExport
);

router.get('/projects', requireRoles(...RPMS_RESEARCHER_ROLES), listProjects);
router.post('/projects', requireRoles(...RPMS_RESEARCHER_ROLES), createProject);
router.get('/projects/:id', requireRoles(...RPMS_RESEARCHER_ROLES), getProject);
router.delete('/projects/:id', requireRoles(...RPMS_RESEARCHER_ROLES), deleteProject);
router.patch('/projects/:id/basic', requireRoles(...RPMS_RESEARCHER_ROLES), updateBasic);
router.patch(
  '/projects/:id/infrastructure',
  requireRoles(...RPMS_RESEARCHER_ROLES),
  updateInfrastructure
);
router.patch(
  '/projects/:id/clearances',
  requireRoles(...RPMS_RESEARCHER_ROLES),
  updateClearances
);
router.post(
  '/projects/:id/budget/initialize',
  requireRoles(...RPMS_RESEARCHER_ROLES),
  initializeBudget
);
router.patch('/projects/:id/budget', requireRoles(...RPMS_RESEARCHER_ROLES), updateBudget);
router.get('/projects/:id/preview', requireRoles(...RPMS_RESEARCHER_ROLES), getPreview);
router.post('/projects/:id/export', requireRoles(...RPMS_RESEARCHER_ROLES), (req, res) => {
  const raw = req.params.id;
  const projectId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  req.body = {
    scope: 'single',
    format: req.body?.format ?? 'xlsx',
    projectIds: projectId ? [projectId] : [],
  };
  return createExport(req, res);
});
router.post('/projects/:id/submit', requireRoles(...RPMS_RESEARCHER_ROLES), submitProject);

router.post(
  '/projects/:id/approve',
  requireRoles(...RPMS_COMMITTEE_ROLES),
  approveProject
);
router.post(
  '/projects/:id/reject',
  requireRoles(...RPMS_COMMITTEE_ROLES),
  rejectProject
);
router.post(
  '/projects/:id/request-revision',
  requireRoles(...RPMS_COMMITTEE_ROLES),
  requestRevision
);

export default router;
