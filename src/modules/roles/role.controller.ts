import { Request, Response } from 'express';
import { getAssignableRoles } from './role.service';

export const listAssignable = async (_req: Request, res: Response) => {
  try {
    const roles = await getAssignableRoles();
    return res.status(200).json({
      success: true,
      data: roles,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
