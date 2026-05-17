import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes';
import orgUnitTypeRoutes from './modules/org-unit-types/org-unit-type.routes';
import orgUnitTypeHierarchyRoutes from './modules/org-unit-type-hierarchies/org-unit-type-hierarchy.routes';
import organizationUnitRoutes from './modules/organization-units/organization-unit.routes';
import employeeRoutes from './modules/employees/employee.routes';
import userRoutes from './modules/users/user.routes';
import roleRoutes from './modules/roles/role.routes';
import auditLogRoutes from './modules/audit-log/audit-log.routes';
import rpmsRoutes from './modules/rpms/rpms.routes';
import { auditMiddleware } from './middleware/audit.middleware';
import { isRedisEnabled } from './config/redis';


const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter((origin): origin is string => Boolean(origin));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(auditMiddleware);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/roles', roleRoutes);
app.use('/org-unit-types', orgUnitTypeRoutes);
app.use('/org-unit-type-hierarchies', orgUnitTypeHierarchyRoutes);
app.use('/organization-units', organizationUnitRoutes);
app.use('/employees', employeeRoutes);
app.use('/audit-logs', auditLogRoutes);
app.use('/rpms', rpmsRoutes);


app.get('/', (_req, res) => {
  res.send('UNIFY API Running');
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    cache: isRedisEnabled() ? 'redis' : 'disabled',
    export_queue: isRedisEnabled() ? 'ready' : 'unavailable',
  });
});

export default app;