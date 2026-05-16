import prisma from '../../config/prisma';
import bcrypt from 'bcrypt';
import { ROLE_CODES } from '../../constants/roles';
import { getRolesByCodes } from '../roles/role.service';
import { createAuthSession } from './token.service';

export type EmployeeSignupInput = {
  employee_code: string;
  username: string;
  password: string;
};

export const loginUser = async (username: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !user.is_active) {
    throw new Error('Invalid username or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error('Invalid username or password');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  });

  return createAuthSession(user.id, user.username);
};

export const registerEmployeeAccount = async (input: EmployeeSignupInput) => {
  const employeeCode = input.employee_code.trim();
  const username = input.username.trim();
  const password = input.password;

  if (!employeeCode || !username || !password) {
    throw new Error('Employee code, username, and password are required');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const employee = await prisma.employee.findUnique({
    where: { employee_code: employeeCode },
    select: { id: true, employee_code: true, is_active: true },
  });

  if (!employee) {
    throw new Error(
      'No registered employee found with this employee code. Check the code or contact your administrator.'
    );
  }

  if (!employee.is_active) {
    throw new Error('This employee record is inactive. Contact your administrator.');
  }

  const existingByEmployeeCode = await prisma.user.findFirst({
    where: { employee_id: employee.id },
    select: { id: true },
  });

  if (existingByEmployeeCode) {
    throw new Error('An account already exists for this employee code');
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existingUsername) {
    throw new Error('Username is already taken');
  }

  const roles = await getRolesByCodes([ROLE_CODES.EMPLOYEE]);

  if (roles.length !== 1) {
    throw new Error('Employee registration is not available. Contact your administrator.');
  }

  const password_hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      password_hash,
      employee_id: employee.id,
      is_active: true,
      user_roles: {
        create: {
          role_id: roles[0].id,
          is_active: true,
        },
      },
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  });

  return createAuthSession(user.id, user.username);
};
