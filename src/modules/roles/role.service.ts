import prisma from '../../config/prisma';
import { ROLE_CODES } from '../../constants/roles';
import { cached } from '../../cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../cache/cache-keys';

export const getAssignableRoles = async () =>
  cached(cacheKeys.assignableRoles, CACHE_TTL.roles, () =>
    prisma.role.findMany({
      where: {
        is_active: true,
        code: { not: ROLE_CODES.SUPER_ADMIN },
      },
      orderBy: { name: 'asc' },
    })
  );

export const getRolesByCodes = async (codes: string[]) => {
  const uniqueSorted = [...new Set(codes)].sort().join(',');
  return cached(cacheKeys.rolesByCodes(uniqueSorted), CACHE_TTL.roles, () =>
    prisma.role.findMany({
      where: {
        code: { in: codes },
        is_active: true,
      },
    })
  );
};
