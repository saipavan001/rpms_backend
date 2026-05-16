import { Request, Response } from 'express';
import { loginUser, registerEmployeeAccount } from './auth.service';
import { getUserProfile } from '../users/user.service';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const result = await loginUser(username, password);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Invalid username or password';

    res.status(401).json({
      success: false,
      message,
    });
  }
};

export const registerEmployee = async (req: Request, res: Response) => {
  try {
    const { employee_code, username, password } = req.body;

    const result = await registerEmployeeAccount({
      employee_code,
      username,
      password,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Registration failed';

    const status = message.includes('already exists') ||
      message.includes('already taken')
      ? 409
      : 400;

    return res.status(status).json({
      success: false,
      message,
    });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const profile = await getUserProfile(req.userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
