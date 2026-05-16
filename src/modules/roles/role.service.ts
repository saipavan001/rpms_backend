import prisma from '../../config/prisma';
import { ROLE_CODES } from '../../constants/roles';

export const getAssignableRoles = async () => {
  return prisma.role.findMany({
    where: {
      is_active: true,
      code: { not: ROLE_CODES.SUPER_ADMIN },
    },
    orderBy: { name: 'asc' },
  });
};

export const getRolesByCodes = async (codes: string[]) => {
  return prisma.role.findMany({
    where: {
      code: { in: codes },
      is_active: true,
    },
  });
};
