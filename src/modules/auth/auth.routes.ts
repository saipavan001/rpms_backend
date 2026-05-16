import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { login, logout, me, refresh, registerEmployee } from './auth.controller';

const router = Router();

router.post('/login', login);
router.post('/register/employee', registerEmployee);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;
