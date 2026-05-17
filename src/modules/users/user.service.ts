import prisma from '../../config/prisma';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { ROLE_CODES } from '../../constants/roles';
import { getRolesByCodes } from '../roles/role.service';
import {
  invalidateProjectListCaches,
  invalidateRpmsMasters,
} from '../../cache/invalidation';

const userInclude = {
  employee: {
    select: {
      id: true,
      employee_code: true,
      employee_name: true,
      email_official: true,
    },
  },
  user_roles: {
    where: { is_active: true },
    include: {
      role: {
        select: { id: true, code: true, name: true },
      },
    },
  },
} satisfies Prisma.UserInclude;

export type CreateUserInput = {
  username: string;
  password: string;
  employee_id?: string | null;
  role_codes: string[];
  is_active?: boolean;
};

export type UpdateUserInput = {
  username?: string;
  password?: string;
  employee_id?: string | null;
  role_codes?: string[];
  is_active?: boolean;
};

const LINKED_EMPLOYEE_ROLE_CODES: string[] = [
  ROLE_CODES.ADMIN,
  ROLE_CODES.EMPLOYEE,
  ROLE_CODES.RESEARCHER,
];

const ADMINISTRATIVE_ONLY_ROLE_CODES: string[] = [
  ROLE_CODES.ADMIN,
  ROLE_CODES.GUEST,
  ROLE_CODES.RESEARCH_ADMIN,
  ROLE_CODES.COMMITTEE_MEMBER,
];

const assertValidRoleCodes = async (
  roleCodes: string[],
  employeeId: string | null | undefined
) => {
  const uniqueCodes = [...new Set(roleCodes)];

  if (!uniqueCodes.length) {
    return [];
  }

  if (uniqueCodes.includes(ROLE_CODES.SUPER_ADMIN)) {
    throw new Error('SUPER_ADMIN role cannot be assigned through this API');
  }

  if (uniqueCodes.includes(ROLE_CODES.GUEST) && uniqueCodes.length > 1) {
    throw new Error('Guest account cannot be combined with other roles');
  }

  const roles = await getRolesByCodes(uniqueCodes);

  if (roles.length !== uniqueCodes.length) {
    throw new Error('One or more role codes are invalid or inactive');
  }

  if (employeeId) {
    if (uniqueCodes.includes(ROLE_CODES.GUEST)) {
      throw new Error('Guest accounts cannot be linked to an employee');
    }
    if (uniqueCodes.includes(ROLE_CODES.COMMITTEE_MEMBER)) {
      throw new Error(
        'Committee member role requires an administrative login without employee link'
      );
    }
    const invalid = uniqueCodes.filter((code) => !LINKED_EMPLOYEE_ROLE_CODES.includes(code));
    if (invalid.length) {
      throw new Error(
        `Not allowed for employee-linked accounts: ${invalid.join(', ')}`
      );
    }
  } else {
    const needsEmployee = uniqueCodes.filter(
      (code) => code === ROLE_CODES.EMPLOYEE || code === ROLE_CODES.RESEARCHER
    );
    if (needsEmployee.length) {
      throw new Error(
        'Employee and researcher roles require a linked employee record'
      );
    }
    const invalid = uniqueCodes.filter(
      (code) => !ADMINISTRATIVE_ONLY_ROLE_CODES.includes(code)
    );
    if (invalid.length) {
      throw new Error(`Invalid administrative role: ${invalid.join(', ')}`);
    }
  }

  return roles;
};

const assertEmployeeAvailable = async (
  employeeId: string | null | undefined,
  excludeUserId?: string
) => {
  if (!employeeId) {
    return;
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      employee_id: employeeId,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true, username: true },
  });

  if (existingUser) {
    throw new Error('This employee already has a user account');
  }
};

export const getUsers = async () => {
  return prisma.user.findMany({
    orderBy: { created_at: 'desc' },
    include: userInclude,
  });
};

export const getUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    include: userInclude,
  });
};

export const createUser = async (data: CreateUserInput) => {
  await assertEmployeeAvailable(data.employee_id);
  const roles = await assertValidRoleCodes(data.role_codes, data.employee_id);

  const password_hash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      username: data.username.trim(),
      password_hash,
      employee_id: data.employee_id ?? null,
      is_active: data.is_active ?? true,
      ...(roles.length
        ? {
            user_roles: {
              create: roles.map((role) => ({
                role_id: role.id,
                is_active: true,
              })),
            },
          }
        : {}),
    },
    include: userInclude,
  });
  await invalidateRpmsMasters();
  await invalidateProjectListCaches();
  return user;
};

export const setUserRoles = async (id: string, role_codes: string[]) => {
  const existing = await prisma.user.findUnique({
    where: { id },
    include: {
      user_roles: {
        include: { role: { select: { code: true } } },
      },
    },
  });

  if (!existing) {
    return null;
  }

  const isSuperAdmin = existing.user_roles.some(
    (ur) => ur.role.code === ROLE_CODES.SUPER_ADMIN && ur.is_active
  );

  if (isSuperAdmin) {
    throw new Error('Cannot change roles for a SUPER_ADMIN user');
  }

  const roles = await assertValidRoleCodes(role_codes, existing.employee_id);
  if (!roles.length) {
    throw new Error('At least one role is required');
  }

  await prisma.userRole.deleteMany({ where: { user_id: id } });
  await prisma.userRole.createMany({
    data: roles.map((role) => ({
      user_id: id,
      role_id: role.id,
      is_active: true,
    })),
  });

  await invalidateRpmsMasters();
  await invalidateProjectListCaches();
  return getUserById(id);
};

export const updateUser = async (id: string, data: UpdateUserInput) => {
  const existing = await prisma.user.findUnique({
    where: { id },
    include: {
      user_roles: {
        include: { role: { select: { code: true } } },
      },
    },
  });

  if (!existing) {
    return null;
  }

  const isSuperAdmin = existing.user_roles.some(
    (ur) => ur.role.code === ROLE_CODES.SUPER_ADMIN && ur.is_active
  );

  if (data.employee_id !== undefined) {
    await assertEmployeeAvailable(data.employee_id, id);
  }

  const nextEmployeeId =
    data.employee_id !== undefined ? data.employee_id : existing.employee_id;

  if (data.role_codes) {
    if (isSuperAdmin) {
      throw new Error('Cannot change roles for a SUPER_ADMIN user');
    }
    await assertValidRoleCodes(data.role_codes, nextEmployeeId);
  }

  const updateData: Prisma.UserUpdateInput = {};

  if (data.username !== undefined) {
    updateData.username = data.username.trim();
  }
  if (data.password) {
    updateData.password_hash = await bcrypt.hash(data.password, 10);
  }
  if (data.employee_id !== undefined) {
    updateData.employee =
      data.employee_id === null
        ? { disconnect: true }
        : { connect: { id: data.employee_id } };
  }
  if (data.is_active !== undefined) {
    updateData.is_active = data.is_active;
  }

  if (data.role_codes && !isSuperAdmin) {
    const roles = await getRolesByCodes(data.role_codes);
    await prisma.userRole.deleteMany({ where: { user_id: id } });
    await prisma.userRole.createMany({
      data: roles.map((role) => ({
        user_id: id,
        role_id: role.id,
        is_active: true,
      })),
    });
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    include: userInclude,
  });
  await invalidateRpmsMasters();
  await invalidateProjectListCaches();
  return user;
};

export const deleteUser = async (id: string) => {
  const existing = await prisma.user.findUnique({
    where: { id },
    include: {
      user_roles: {
        where: { is_active: true },
        include: { role: { select: { code: true } } },
      },
    },
  });

  if (!existing) {
    return null;
  }

  const isSuperAdmin = existing.user_roles.some(
    (ur) => ur.role.code === ROLE_CODES.SUPER_ADMIN
  );

  if (isSuperAdmin) {
    const superAdminCount = await prisma.userRole.count({
      where: {
        is_active: true,
        role: { code: ROLE_CODES.SUPER_ADMIN, is_active: true },
      },
    });

    if (superAdminCount <= 1) {
      throw new Error('Cannot delete the last SUPER_ADMIN user');
    }
  }

  await prisma.userRole.deleteMany({ where: { user_id: id } });

  const deleted = await prisma.user.delete({
    where: { id },
    include: userInclude,
  });
  await invalidateRpmsMasters();
  await invalidateProjectListCaches();
  return deleted;
};

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      employee_id: true,
      is_active: true,
      employee: {
        select: {
          id: true,
          employee_code: true,
          employee_name: true,
        },
      },
      user_roles: {
        where: { is_active: true, role: { is_active: true } },
        select: {
          role: { select: { code: true, name: true } },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    employee_id: user.employee_id,
    is_active: user.is_active,
    employee: user.employee,
    roles: user.user_roles.map((ur) => ur.role.code),
    role_names: user.user_roles.map((ur) => ur.role.name),
  };
};
