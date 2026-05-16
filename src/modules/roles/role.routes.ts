import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireSuperAdmin } from '../../middleware/authorize.middleware';
import { listAssignable } from './role.controller';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/assignable', listAssignable);

export default router;
