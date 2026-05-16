import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import {
  createOrganizationUnit,
  deleteOrganizationUnit,
  getOrganizationUnitById,
  getOrganizationUnits,
  updateOrganizationUnit,
} from './organization-unit.service';

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

const handlePrismaError = (error: unknown, res: Response) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'An organization unit with this code already exists',
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
        message: 'Organization unit not found',
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
    const {
      code,
      name,
      short_name,
      description,
      ou_type_id,
      parent_ou_id,
      is_active,
    } = req.body;

    if (!code?.trim() || !name?.trim() || !ou_type_id?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'code, name, and ou_type_id are required',
      });
    }

    const result = await createOrganizationUnit({
      code,
      name,
      short_name,
      description,
      ou_type_id,
      parent_ou_id,
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
    const result = await getOrganizationUnits(isActive);

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
        message: 'Invalid organization unit id',
      });
    }

    const result = await getOrganizationUnitById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Organization unit not found',
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
    const {
      code,
      name,
      short_name,
      description,
      ou_type_id,
      parent_ou_id,
      is_active,
    } = req.body;

    if (
      code === undefined &&
      name === undefined &&
      short_name === undefined &&
      description === undefined &&
      ou_type_id === undefined &&
      parent_ou_id === undefined &&
      is_active === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update',
      });
    }

    if (code !== undefined && !String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: 'code cannot be empty',
      });
    }

    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'name cannot be empty',
      });
    }

    if (ou_type_id !== undefined && !String(ou_type_id).trim()) {
      return res.status(400).json({
        success: false,
        message: 'ou_type_id cannot be empty',
      });
    }

    const id = getRouteId(req);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization unit id',
      });
    }

    const result = await updateOrganizationUnit(id, {
      code,
      name,
      short_name,
      description,
      ou_type_id,
      parent_ou_id,
      is_active,
    });

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
        message: 'Invalid organization unit id',
      });
    }

    const result = await deleteOrganizationUnit(id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};
