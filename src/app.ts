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


const app = express();

const frontendOrigin = process.env.FRONTEND_URL ?? 'http://localhost:5173';

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/roles', roleRoutes);
app.use('/org-unit-types', orgUnitTypeRoutes);
app.use('/org-unit-type-hierarchies', orgUnitTypeHierarchyRoutes);
app.use('/organization-units', organizationUnitRoutes);
app.use('/employees', employeeRoutes);


app.get('/', (_req, res) => {
  res.send('RPMS API Running');
});

export default app;