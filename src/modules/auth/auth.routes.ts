import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { login, me, registerEmployee } from './auth.controller';

const router = Router();

router.post('/login', login);
router.post('/register/employee', registerEmployee);
router.get('/me', authenticate, me);

export default router;
