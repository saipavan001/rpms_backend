import { READ_ACCESS_ROLES, WRITE_ACCESS_ROLES } from '../constants/roles';
import { requireRoles } from './authorize.middleware';

export const requireReadAccess = requireRoles(...READ_ACCESS_ROLES);
export const requireWriteAccess = requireRoles(...WRITE_ACCESS_ROLES);
