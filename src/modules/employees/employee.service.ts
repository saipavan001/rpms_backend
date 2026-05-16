import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';

export type CreateEmployeeInput = {
  employee_code: string;
  employee_name: string;
  email_official: string;
  email_personal?: string;
  phone_number?: string;
  employment_type: string;
  joining_date?: string | Date | null;
  ou_id: string;
  is_active?: boolean;
};

export type UpdateEmployeeInput = {
  employee_code?: string;
  employee_name?: string;
  email_official?: string;
  email_personal?: string | null;
  phone_number?: string | null;
  employment_type?: string;
  joining_date?: string | Date | null;
  ou_id?: string;
  is_active?: boolean;
};

const employeeInclude = {
  organization_unit: {
    select: { id: true, code: true, name: true },
  },
} satisfies Prisma.EmployeeInclude;

const parseJoiningDate = (
  value: string | Date | null | undefined
): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('joining_date must be a valid date');
  }
  return date;
};

export const createEmployee = async (data: CreateEmployeeInput) => {
  return prisma.employee.create({
    data: {
      employee_code: data.employee_code.trim(),
      employee_name: data.employee_name.trim(),
      email_official: data.email_official.trim(),
      email_personal: data.email_personal?.trim() || null,
      phone_number: data.phone_number?.trim() || null,
      employment_type: data.employment_type.trim(),
      joining_date: parseJoiningDate(data.joining_date) ?? null,
      ou_id: data.ou_id,
      is_active: data.is_active ?? true,
    },
    include: employeeInclude,
  });
};

export const getEmployees = async (isActive?: boolean) => {
  const where =
    isActive === undefined ? {} : { is_active: isActive };

  return prisma.employee.findMany({
    where,
    orderBy: { employee_name: 'asc' },
    include: employeeInclude,
  });
};

export const getEmployeeById = async (id: string) => {
  return prisma.employee.findUnique({
    where: { id },
    include: employeeInclude,
  });
};

export const updateEmployee = async (
  id: string,
  data: UpdateEmployeeInput
) => {
  const updateData: Prisma.EmployeeUpdateInput = {};

  if (data.employee_code !== undefined) {
    updateData.employee_code = data.employee_code.trim();
  }
  if (data.employee_name !== undefined) {
    updateData.employee_name = data.employee_name.trim();
  }
  if (data.email_official !== undefined) {
    updateData.email_official = data.email_official.trim();
  }
  if (data.email_personal !== undefined) {
    updateData.email_personal =
      data.email_personal === null ? null : data.email_personal.trim();
  }
  if (data.phone_number !== undefined) {
    updateData.phone_number =
      data.phone_number === null ? null : data.phone_number.trim();
  }
  if (data.employment_type !== undefined) {
    updateData.employment_type = data.employment_type.trim();
  }
  if (data.joining_date !== undefined) {
    updateData.joining_date = parseJoiningDate(data.joining_date) ?? null;
  }
  if (data.ou_id !== undefined) {
    updateData.organization_unit = { connect: { id: data.ou_id } };
  }
  if (data.is_active !== undefined) {
    updateData.is_active = data.is_active;
  }

  return prisma.employee.update({
    where: { id },
    data: updateData,
    include: employeeInclude,
  });
};

export const deleteEmployee = async (id: string) => {
  return prisma.employee.delete({
    where: { id },
    include: employeeInclude,
  });
};

export type BulkCreateEmployeeResult = {
  created: Awaited<ReturnType<typeof createEmployee>>[];
  failed: {
    index: number;
    employee_code: string;
    message: string;
  }[];
};

const getBulkErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Failed to create employee';
};

export const bulkCreateEmployees = async (
  items: CreateEmployeeInput[]
): Promise<BulkCreateEmployeeResult> => {
  const created: BulkCreateEmployeeResult['created'] = [];
  const failed: BulkCreateEmployeeResult['failed'] = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    try {
      const employee = await createEmployee(item);
      created.push(employee);
    } catch (error) {
      failed.push({
        index,
        employee_code: item.employee_code,
        message: getBulkErrorMessage(error),
      });
    }
  }

  return { created, failed };
};
