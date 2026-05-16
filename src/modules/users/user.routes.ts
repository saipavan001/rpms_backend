import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireSuperAdmin } from '../../middleware/authorize.middleware';
import { create, getById, list, remove, update } from './user.controller';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/', list);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
