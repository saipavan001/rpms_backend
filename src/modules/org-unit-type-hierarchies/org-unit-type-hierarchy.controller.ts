import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import {
  createOrgUnitTypeHierarchy,
  deleteOrgUnitTypeHierarchy,
  getOrgUnitTypeHierarchyById,
  getOrgUnitTypeHierarchies,
  updateOrgUnitTypeHierarchy,
} from './org-unit-type-hierarchy.service';

const getRouteId = (req: Request): string | null => {
  const id = req.params.id;
  if (typeof id === 'string' && id.trim()) {
    return id;
  }
  return null;
};

const parseIsActiveQuery = (value: unknown): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error('is_active must be "true" or "false"');
};

const parseDisplayOrder = (value: unknown): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error('display_order must be an integer');
  }

  return parsed;
};

const handlePrismaError = (error: unknown, res: Response) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message:
          'A hierarchy relation between these parent and child types already exists',
      });
    }
    if (error.code === 'P2003' || error.code === 'P2014') {
      return res.status(409).json({
        success: false,
        message:
          'Cannot complete this action because of related records or invalid references',
      });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Organization unit type hierarchy not found',
      });
    }
  }

  if (error instanceof Error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

export const create = async (req: Request, res: Response) => {
  try {
    const { parent_ou_type_id, child_ou_type_id, display_order, is_active } =
      req.body;

    if (!parent_ou_type_id?.trim() || !child_ou_type_id?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'parent_ou_type_id and child_ou_type_id are required',
      });
    }

    const result = await createOrgUnitTypeHierarchy({
      parent_ou_type_id,
      child_ou_type_id,
      display_order: parseDisplayOrder(display_order),
      is_active,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const isActive = parseIsActiveQuery(req.query.is_active);
    const result = await getOrgUnitTypeHierarchies(isActive);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization unit type hierarchy id',
      });
    }

    const result = await getOrgUnitTypeHierarchyById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Organization unit type hierarchy not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { parent_ou_type_id, child_ou_type_id, display_order, is_active } =
      req.body;

    if (
      parent_ou_type_id === undefined &&
      child_ou_type_id === undefined &&
      display_order === undefined &&
      is_active === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update',
      });
    }

    if (parent_ou_type_id !== undefined && !String(parent_ou_type_id).trim()) {
      return res.status(400).json({
        success: false,
        message: 'parent_ou_type_id cannot be empty',
      });
    }

    if (child_ou_type_id !== undefined && !String(child_ou_type_id).trim()) {
      return res.status(400).json({
        success: false,
        message: 'child_ou_type_id cannot be empty',
      });
    }

    const id = getRouteId(req);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization unit type hierarchy id',
      });
    }

    const result = await updateOrgUnitTypeHierarchy(id, {
      parent_ou_type_id,
      child_ou_type_id,
      display_order: parseDisplayOrder(display_order),
      is_active,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Organization unit type hierarchy not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization unit type hierarchy id',
      });
    }

    const result = await deleteOrgUnitTypeHierarchy(id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};
