import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  requireReadAccess,
  requireWriteAccess,
} from '../../middleware/permissions.middleware';
import {
  bulkCreate,
  create,
  getById,
  list,
  remove,
  update,
} from './employee.controller';

const router = Router();

router.use(authenticate);

router.get('/', requireReadAccess, list);
router.post('/bulk', requireWriteAccess, bulkCreate);
router.get('/:id', requireReadAccess, getById);
router.post('/', requireWriteAccess, create);
router.put('/:id', requireWriteAccess, update);
router.delete('/:id', requireWriteAccess, remove);

export default router;
