import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import prisma from '../../config/prisma';
import { getUserProfile } from '../users/user.service';

type AccessTokenPayload = {
  userId: string;
  username: string;
};

const getAccessSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

const createRefreshTokenValue = () => crypto.randomBytes(48).toString('hex');

const getRefreshExpiryDate = () => {
  const days = Number(process.env.REFRESH_TOKEN_MAX_AGE_DAYS ?? 7);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

export const signAccessToken = (userId: string, username: string) => {
  const options: SignOptions = {
    expiresIn: (process.env.ACCESS_TOKEN_EXPIRES ?? '15m') as SignOptions['expiresIn'],
  };

  return jwt.sign(
    { userId, username } satisfies AccessTokenPayload,
    getAccessSecret(),
    options
  );
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, getAccessSecret()) as AccessTokenPayload;
};

export const persistRefreshToken = async (userId: string, rawRefreshToken: string) => {
  const expiresAt = getRefreshExpiryDate();

  await prisma.refreshToken.create({
    data: {
      user_id: userId,
      token_hash: hashToken(rawRefreshToken),
      expires_at: expiresAt,
    },
  });

  return rawRefreshToken;
};

export const revokeRefreshTokenByValue = async (rawRefreshToken: string | undefined) => {
  if (!rawRefreshToken) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: {
      token_hash: hashToken(rawRefreshToken),
      revoked_at: null,
    },
    data: { revoked_at: new Date() },
  });
};

export const revokeAllUserRefreshTokens = async (userId: string) => {
  await prisma.refreshToken.updateMany({
    where: { user_id: userId, revoked_at: null },
    data: { revoked_at: new Date() },
  });
};

const findValidRefreshRecord = async (rawRefreshToken: string) => {
  const record = await prisma.refreshToken.findFirst({
    where: {
      token_hash: hashToken(rawRefreshToken),
      revoked_at: null,
      expires_at: { gt: new Date() },
    },
    include: {
      user: {
        select: { id: true, username: true, is_active: true },
      },
    },
  });

  if (!record?.user.is_active) {
    return null;
  }

  return record;
};

export type AuthSessionResult = {
  accessToken: string;
  refreshToken: string;
  user: NonNullable<Awaited<ReturnType<typeof getUserProfile>>>;
};

export const createAuthSession = async (
  userId: string,
  username: string
): Promise<AuthSessionResult> => {
  const profile = await getUserProfile(userId);

  if (!profile || profile.roles.length === 0) {
    throw new Error('User has no active roles assigned');
  }

  const accessToken = signAccessToken(userId, username);
  const rawRefresh = createRefreshTokenValue();
  await persistRefreshToken(userId, rawRefresh);

  return {
    accessToken,
    refreshToken: rawRefresh,
    user: profile,
  };
};

export const rotateAuthSession = async (
  rawRefreshToken: string
): Promise<AuthSessionResult> => {
  const record = await findValidRefreshRecord(rawRefreshToken);

  if (!record) {
    throw new Error('Invalid or expired refresh token');
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revoked_at: new Date() },
  });

  return createAuthSession(record.user.id, record.user.username);
};
