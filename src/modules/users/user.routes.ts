import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireSuperAdmin } from '../../middleware/authorize.middleware';
import { assignRoles, create, getById, list, remove, update } from './user.controller';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/', list);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.put('/:id/roles', assignRoles);
router.delete('/:id', remove);

export default router;
