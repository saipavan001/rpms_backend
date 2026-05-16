import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireSuperAdmin } from '../../middleware/authorize.middleware';
import {
  bulkCreate,
  create,
  getById,
  list,
  remove,
  update,
} from './employee.controller';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/', list);
router.post('/bulk', bulkCreate);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
