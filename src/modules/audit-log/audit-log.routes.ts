import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireSuperAdmin } from '../../middleware/authorize.middleware';
import { list } from './audit-log.controller';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/', list);

export default router;
