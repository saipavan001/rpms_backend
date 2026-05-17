import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import {
  bulkCreateEmployees,
  createEmployee,
  CreateEmployeeInput,
  deleteEmployee,
  getEmployeeById,
  getEmployeeForUser,
  getEmployees,
  updateEmployee,
} from './employee.service';

const getRouteId = (req: Request): string | null => {
  const id = req.params.id;
  if (typeof id === 'string' && id.trim()) {
    return id;
  }
  return null;
};

const parseIsActiveQuery = (value: unknown): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error('is_active must be "true" or "false"');
};

const handlePrismaError = (error: unknown, res: Response) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const field =
        Array.isArray(target) && target.length > 0
          ? String(target[0])
          : 'field';

      return res.status(409).json({
        success: false,
        message: `An employee with this ${field} already exists`,
      });
    }
    if (error.code === 'P2003' || error.code === 'P2014') {
      return res.status(409).json({
        success: false,
        message:
          'Cannot complete this action because of related records or invalid references',
      });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }
  }

  if (error instanceof Error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

const validateEmployeeInput = (
  input: Partial<CreateEmployeeInput>
): string | null => {
  if (
    !input.employee_code?.trim() ||
    !input.employee_name?.trim() ||
    !input.email_official?.trim() ||
    !input.employment_type?.trim() ||
    !input.ou_id?.trim()
  ) {
    return 'employee_code, employee_name, email_official, employment_type, and ou_id are required';
  }

  return null;
};

export const bulkCreate = async (req: Request, res: Response) => {
  try {
    const { employees } = req.body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'employees must be a non-empty array',
      });
    }

    const normalized: CreateEmployeeInput[] = [];

    for (let index = 0; index < employees.length; index++) {
      const item = employees[index];
      const validationError = validateEmployeeInput(item);

      if (validationError) {
        return res.status(400).json({
          success: false,
          message: `Row ${index + 1}: ${validationError}`,
        });
      }

      normalized.push({
        employee_code: item.employee_code,
        employee_name: item.employee_name,
        email_official: item.email_official,
        email_personal: item.email_personal,
        phone_number: item.phone_number,
        employment_type: item.employment_type,
        joining_date: item.joining_date,
        ou_id: item.ou_id,
        is_active: item.is_active,
      });
    }

    const result = await bulkCreateEmployees(normalized);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const {
      employee_code,
      employee_name,
      email_official,
      email_personal,
      phone_number,
      employment_type,
      joining_date,
      ou_id,
      is_active,
    } = req.body;

    const validationError = validateEmployeeInput({
      employee_code,
      employee_name,
      email_official,
      employment_type,
      ou_id,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const result = await createEmployee({
      employee_code,
      employee_name,
      email_official,
      email_personal,
      phone_number,
      employment_type,
      joining_date,
      ou_id,
      is_active,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const isActive = parseIsActiveQuery(req.query.is_active);
    const result = await getEmployees(isActive);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

export const getMine = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId?: string }).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const result = await getEmployeeForUser(userId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No employee record linked to your account',
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee id',
      });
    }

    const result = await getEmployeeById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const {
      employee_code,
      employee_name,
      email_official,
      email_personal,
      phone_number,
      employment_type,
      joining_date,
      ou_id,
      is_active,
    } = req.body;

    if (
      employee_code === undefined &&
      employee_name === undefined &&
      email_official === undefined &&
      email_personal === undefined &&
      phone_number === undefined &&
      employment_type === undefined &&
      joining_date === undefined &&
      ou_id === undefined &&
      is_active === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update',
      });
    }

    if (employee_code !== undefined && !String(employee_code).trim()) {
      return res.status(400).json({
        success: false,
        message: 'employee_code cannot be empty',
      });
    }

    if (employee_name !== undefined && !String(employee_name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'employee_name cannot be empty',
      });
    }

    if (email_official !== undefined && !String(email_official).trim()) {
      return res.status(400).json({
        success: false,
        message: 'email_official cannot be empty',
      });
    }

    if (employment_type !== undefined && !String(employment_type).trim()) {
      return res.status(400).json({
        success: false,
        message: 'employment_type cannot be empty',
      });
    }

    if (ou_id !== undefined && !String(ou_id).trim()) {
      return res.status(400).json({
        success: false,
        message: 'ou_id cannot be empty',
      });
    }

    const id = getRouteId(req);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee id',
      });
    }

    const result = await updateEmployee(id, {
      employee_code,
      employee_name,
      email_official,
      email_personal,
      phone_number,
      employment_type,
      joining_date,
      ou_id,
      is_active,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const id = getRouteId(req);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee id',
      });
    }

    const result = await deleteEmployee(id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};
