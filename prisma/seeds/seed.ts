import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { seedRpmsMasters } from './rpms-masters.seed';

const prisma = new PrismaClient();

async function main() {

  const superAdminRole = await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: {},
    create: {
      code: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'Full system access including user management',
      is_active: true,
    },
  });

  await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      code: 'ADMIN',
      name: 'Administrator',
      description: 'Manage org structure and employees',
      is_active: true,
    },
  });

  await prisma.role.upsert({
    where: { code: 'EMPLOYEE' },
    update: {},
    create: {
      code: 'EMPLOYEE',
      name: 'Employee',
      description: 'Employee portal welcome page only (module access coming later)',
      is_active: true,
    },
  });

  await prisma.role.upsert({
    where: { code: 'GUEST' },
    update: {},
    create: {
      code: 'GUEST',
      name: 'Guest',
      description: 'Read-only administrative access (no employee link)',
      is_active: true,
    },
  });

  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Create Super Admin User
  const superAdminUser = await prisma.user.upsert({
    where: {
      username: 'superadmin'
    },
    update: {},
    create: {
      username: 'superadmin',
      password_hash: hashedPassword,
      is_active: true
    }
  });

  // Assign SUPER_ADMIN role
  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: superAdminUser.id,
        role_id: superAdminRole.id
      }
    },
    update: {},
    create: {
      user_id: superAdminUser.id,
      role_id: superAdminRole.id,
      is_active: true
    }
  });

  await seedRpmsMasters(prisma);

  console.log('Roles and Super Admin seeded successfully');
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });