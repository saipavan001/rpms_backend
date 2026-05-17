import { Request, Response } from 'express';
import * as committeeService from './committee.service';
import * as masterService from './master.service';
import * as projectService from './project.service';

const getUserId = (req: Request) => (req as Request & { userId?: string }).userId!;
const getRoles = (req: Request) =>
  ((req as Request & { roles?: string[] }).roles ?? []) as string[];

const getRouteId = (req: Request): string | null => {
  const raw = req.params.id;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (Array.isArray(raw) && raw[0]) return raw[0];
  return null;
};

export const listMasters = async (_req: Request, res: Response) => {
  try {
    const data = await projectService.listMasters();
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const listCommitteeRoles = async (_req: Request, res: Response) => {
  try {
    const data = await committeeService.listCommitteeRoles();
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const listCommittees = async (_req: Request, res: Response) => {
  try {
    const data = await committeeService.listCommittees();
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const getEligibleCommitteeUsers = async (_req: Request, res: Response) => {
  try {
    const data = await committeeService.getAdministrativeUsers();
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const upsertCommittee = async (req: Request, res: Response) => {
  try {
    const data = await committeeService.upsertCommitteeForOu(req.body);
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const setCommitteeMembers = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid committee id' });
      return;
    }
    const data = await committeeService.replaceCommitteeMembers(
      id,
      req.body.members ?? []
    );
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const listProjects = async (req: Request, res: Response) => {
  try {
    const data = await projectService.listProjectsForUser(getUserId(req), getRoles(req));
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const { getUserProfile } = await import('../users/user.service');
    const profile = await getUserProfile(getUserId(req));
    const piEmployeeId =
      typeof req.body?.pi_employee_id === 'string' ? req.body.pi_employee_id : null;
    const data = await projectService.createProjectDraft(
      getUserId(req),
      profile?.employee_id ?? null,
      getRoles(req),
      piEmployeeId
    );
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid project id' });
      return;
    }
    const data = await projectService.getProjectById(id);
    if (!data) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const updateBasic = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid project id' });
      return;
    }
    const data = await projectService.updateProjectBasic(id, req.body, getRoles(req));
    if (!data) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const updateInfrastructure = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid project id' });
      return;
    }
    const data = await projectService.updateProjectInfrastructure(id, req.body);
    if (!data) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const updateClearances = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid project id' });
      return;
    }
    const data = await projectService.updateProjectClearances(
      id,
      req.body.clearances ?? []
    );
    if (!data) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const listFundingAgencies = async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === 'true';
    const data = await masterService.listFundingAgencies(activeOnly);
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const createFundingAgency = async (req: Request, res: Response) => {
  try {
    const data = await masterService.createFundingAgency(req.body);
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const updateFundingAgency = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }
    const data = await masterService.updateFundingAgency(id, req.body);
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const deleteFundingAgency = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }
    const data = await masterService.deleteFundingAgency(id);
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const listBudgetCategories = async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === 'true';
    const data = await masterService.listBudgetCategories(activeOnly);
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const createBudgetCategory = async (req: Request, res: Response) => {
  try {
    const data = await masterService.createBudgetCategory(req.body);
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const updateBudgetCategory = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }
    const data = await masterService.updateBudgetCategory(id, req.body);
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const deleteBudgetCategory = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }
    const data = await masterService.deleteBudgetCategory(id);
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const createBudgetHead = async (req: Request, res: Response) => {
  try {
    const data = await masterService.createBudgetHead(req.body);
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const updateBudgetHead = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }
    const data = await masterService.updateBudgetHead(id, req.body);
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const deleteBudgetHead = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }
    const data = await masterService.deleteBudgetHead(id);
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const initializeBudget = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid project id' });
      return;
    }
    const data = await projectService.initializeProjectBudget(id);
    if (!data) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const updateBudget = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid project id' });
      return;
    }
    const data = await projectService.updateProjectBudget(id, req.body.lines ?? []);
    if (!data) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const getPreview = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid project id' });
      return;
    }
    const data = await projectService.getProjectPreview(id);
    if (!data) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const submitProject = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid project id' });
      return;
    }
    const data = await projectService.submitProjectToCommittee(id, getUserId(req));
    if (!data) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid project id' });
      return;
    }
    const data = await projectService.deleteProject(id, getUserId(req), getRoles(req));
    if (!data) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const approveProject = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid project id' });
      return;
    }
    const data = await projectService.approveProjectByCommittee(
      id,
      getUserId(req),
      getRoles(req),
      req.body.comments ?? null
    );
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const rejectProject = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid project id' });
      return;
    }
    const data = await projectService.rejectProjectByCommittee(
      id,
      getUserId(req),
      getRoles(req),
      req.body.comments ?? ''
    );
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};

export const requestRevision = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      res.status(400).json({ message: 'Invalid project id' });
      return;
    }
    const data = await projectService.requestProjectRevision(
      id,
      getUserId(req),
      getRoles(req),
      req.body.comments ?? ''
    );
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Error' });
  }
};
