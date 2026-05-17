import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRoles } from '../../middleware/authorize.middleware';
import {
  requireReadAccess,
  requireWriteAccess,
} from '../../middleware/permissions.middleware';
import { ROLE_CODES } from '../../constants/roles';
import {
  bulkCreate,
  create,
  getById,
  getMine,
  list,
  remove,
  update,
} from './employee.controller';

const router = Router();

router.use(authenticate);

router.get('/', requireReadAccess, list);
router.get(
  '/me',
  requireRoles(ROLE_CODES.EMPLOYEE, ROLE_CODES.RESEARCHER),
  getMine
);
router.post('/bulk', requireWriteAccess, bulkCreate);
router.get('/:id', requireReadAccess, getById);
router.post('/', requireWriteAccess, create);
router.put('/:id', requireWriteAccess, update);
router.delete('/:id', requireWriteAccess, remove);

export default router;
