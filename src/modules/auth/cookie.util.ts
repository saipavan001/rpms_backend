import type { CookieOptions, Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

const isProduction = process.env.NODE_ENV === 'production';

const baseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  // Production: frontend and API are on different domains — need SameSite=None + Secure.
  sameSite: isProduction ? 'none' : 'lax',
});

export const getAccessTokenCookieOptions = (): CookieOptions => {
  const maxAgeMinutes = Number(process.env.ACCESS_TOKEN_MAX_AGE_MINUTES ?? 15);

  return {
    ...baseCookieOptions(),
    path: '/',
    maxAge: maxAgeMinutes * 60 * 1000,
  };
};

export const getRefreshTokenCookieOptions = (): CookieOptions => {
  const maxAgeDays = Number(process.env.REFRESH_TOKEN_MAX_AGE_DAYS ?? 7);

  return {
    ...baseCookieOptions(),
    // Path "/" so cookies work with Vite /api proxy and direct API calls.
    path: '/',
    maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
  };
};

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
) => {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, getAccessTokenCookieOptions());
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, getRefreshTokenCookieOptions());
};

export const clearAuthCookies = (res: Response) => {
  const accessOpts = getAccessTokenCookieOptions();
  const refreshOpts = getRefreshTokenCookieOptions();

  res.clearCookie(ACCESS_TOKEN_COOKIE, {
    path: accessOpts.path,
    httpOnly: true,
    secure: accessOpts.secure,
    sameSite: accessOpts.sameSite,
  });

  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    path: refreshOpts.path,
    httpOnly: true,
    secure: refreshOpts.secure,
    sameSite: refreshOpts.sameSite,
  });
};
