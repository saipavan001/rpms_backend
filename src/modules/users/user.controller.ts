import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from './user.service';

const getRouteId = (req: Request): string | null => {
  const id = req.params.id;
  if (typeof id === 'string' && id.trim()) {
    return id;
  }
  return null;
};

const sanitizeUser = (user: Awaited<ReturnType<typeof getUsers>>[number]) => ({
  id: user.id,
  username: user.username,
  employee_id: user.employee_id,
  is_active: user.is_active,
  last_login_at: user.last_login_at,
  created_at: user.created_at,
  updated_at: user.updated_at,
  employee: user.employee,
  roles: user.user_roles.map((ur) => ({
    id: ur.role.id,
    code: ur.role.code,
    name: ur.role.name,
  })),
});

const handleError = (error: unknown, res: Response) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Username already exists',
      });
    }
    if (error.code === 'P2003' || error.code === 'P2014') {
      return res.status(409).json({
        success: false,
        message: 'Invalid employee or role reference',
      });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
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

export const list = async (_req: Request, res: Response) => {
  try {
    const users = await getUsers();
    return res.status(200).json({
      success: true,
      data: users.map(sanitizeUser),
    });
  } catch (error) {
    return handleError(error, res);
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id',
      });
    }

    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: sanitizeUser(user),
    });
  } catch (error) {
    return handleError(error, res);
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const { username, password, employee_id, role_codes, is_active } = req.body;

    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'username and password are required',
      });
    }

    if (!Array.isArray(role_codes) || role_codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'role_codes must be a non-empty array',
      });
    }

    const user = await createUser({
      username,
      password,
      employee_id: employee_id || null,
      role_codes,
      is_active,
    });

    return res.status(201).json({
      success: true,
      data: sanitizeUser(user),
    });
  } catch (error) {
    return handleError(error, res);
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { username, password, employee_id, role_codes, is_active } = req.body;

    const id = getRouteId(req);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id',
      });
    }

    const user = await updateUser(id, {
      username,
      password,
      employee_id,
      role_codes,
      is_active,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: sanitizeUser(user),
    });
  } catch (error) {
    return handleError(error, res);
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id',
      });
    }

    const user = await deleteUser(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: sanitizeUser(user),
    });
  } catch (error) {
    return handleError(error, res);
  }
};
