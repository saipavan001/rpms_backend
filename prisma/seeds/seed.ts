import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {

  // Create SUPER_ADMIN role
  const superAdminRole = await prisma.role.upsert({
    where: {
      code: 'SUPER_ADMIN'
    },
    update: {},
    create: {
      code: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'System Super Administrator',
      is_active: true
    }
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

  console.log('Super Admin Seeded Successfully');
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });