import { Request, Response } from 'express';
import { loginUser, registerEmployeeAccount } from './auth.service';
import { clearAuthCookies, REFRESH_TOKEN_COOKIE, setAuthCookies } from './cookie.util';
import {
  revokeSessionsByRefreshToken,
  rotateAuthSession,
} from './token.service';
import { getUserProfile } from '../users/user.service';

const sendAuthResponse = (
  res: Response,
  status: number,
  session: Awaited<ReturnType<typeof loginUser>>
) => {
  setAuthCookies(res, session.accessToken, session.refreshToken);

  return res.status(status).json({
    success: true,
    data: { user: session.user },
  });
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const session = await loginUser(username, password);
    return sendAuthResponse(res, 200, session);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Invalid username or password';

    return res.status(401).json({
      success: false,
      message,
    });
  }
};

export const registerEmployee = async (req: Request, res: Response) => {
  try {
    const { employee_code, username, password } = req.body;

    const session = await registerEmployeeAccount({
      employee_code,
      username,
      password,
    });

    return sendAuthResponse(res, 201, session);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Registration failed';

    const status =
      message.includes('already exists') || message.includes('already taken')
        ? 409
        : 400;

    return res.status(status).json({
      success: false,
      message,
    });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as
      | string
      | undefined;

    if (!rawRefreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    const session = await rotateAuthSession(rawRefreshToken);
    return sendAuthResponse(res, 200, session);
  } catch {
    clearAuthCookies(res);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as
      | string
      | undefined;

    await revokeSessionsByRefreshToken(rawRefreshToken);
    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch {
    clearAuthCookies(res);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
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
