import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import {
  createOrgUnitType,
  deleteOrgUnitType,
  getOrgUnitTypeById,
  getOrgUnitTypes,
  updateOrgUnitType,
} from './org-unit-type.service';

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
        message: 'An organization unit type with this code already exists',
      });
    }
    if (error.code === 'P2003' || error.code === 'P2014') {
      return res.status(409).json({
        success: false,
        message:
          'Cannot delete this organization unit type because it is referenced by other records',
      });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Organization unit type not found',
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
    const { code, name, description, is_active } = req.body;

    if (!code?.trim() || !name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'code and name are required',
      });
    }

    const result = await createOrgUnitType({
      code,
      name,
      description,
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
    const result = await getOrgUnitTypes(isActive);

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
        message: 'Invalid organization unit type id',
      });
    }

    const result = await getOrgUnitTypeById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Organization unit type not found',
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
    const { code, name, description, is_active } = req.body;

    if (
      code === undefined &&
      name === undefined &&
      description === undefined &&
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

    const id = getRouteId(req);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization unit type id',
      });
    }

    const result = await updateOrgUnitType(id, {
      code,
      name,
      description,
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
        message: 'Invalid organization unit type id',
      });
    }

    const result = await deleteOrgUnitType(id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};
