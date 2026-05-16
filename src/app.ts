import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import orgUnitTypeRoutes from './modules/org-unit-types/org-unit-type.routes';
import orgUnitTypeHierarchyRoutes from './modules/org-unit-type-hierarchies/org-unit-type-hierarchy.routes';
import organizationUnitRoutes from './modules/organization-units/organization-unit.routes';
import employeeRoutes from './modules/employees/employee.routes';


const app = express();

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/org-unit-types', orgUnitTypeRoutes);
app.use('/org-unit-type-hierarchies', orgUnitTypeHierarchyRoutes);
app.use('/organization-units', organizationUnitRoutes);
app.use('/employees', employeeRoutes);


app.get('/', (_req, res) => {
  res.send('RPMS API Running');
});

export default app;