const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

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

  await prisma.role.upsert({
    where: { code: 'RESEARCH_ADMIN' },
    update: {},
    create: {
      code: 'RESEARCH_ADMIN',
      name: 'Research Admin',
      description: 'RPMS settings and oversight',
      is_active: true,
    },
  });

  await prisma.role.upsert({
    where: { code: 'RESEARCHER' },
    update: {},
    create: {
      code: 'RESEARCHER',
      name: 'Researcher (PI)',
      description: 'Create and submit research project proposals',
      is_active: true,
    },
  });

  await prisma.role.upsert({
    where: { code: 'COMMITTEE_MEMBER' },
    update: {},
    create: {
      code: 'COMMITTEE_MEMBER',
      name: 'Committee Member',
      description: 'OU approval committee reviewer',
      is_active: true,
    },
  });

  const committeeRoles = [
    ['CHAIR', 'Chair', 1],
    ['DEPARTMENT_REP', 'Department representative', 2],
    ['FINANCE_REP', 'Finance representative', 3],
    ['MEMBER', 'Member', 4],
    ['SECRETARY', 'Secretary', 5],
  ];
  for (const [code, name, order] of committeeRoles) {
    await prisma.committeeRole.upsert({
      where: { code },
      update: { name, display_order: order, is_active: true },
      create: { code, name, display_order: order, is_active: true },
    });
  }

  const projectTypes = [
    ['SPONSORED', 'Sponsored research'],
    ['CONSULTANCY', 'Consultancy'],
    ['INTERNAL', 'Internal grant'],
  ];
  for (const [code, name] of projectTypes) {
    await prisma.projectType.upsert({
      where: { code },
      update: { name, is_active: true },
      create: { code, name, is_active: true },
    });
  }

  const agencies = [
    ['DST', 'Department of Science & Technology'],
    ['UGC', 'UGC'],
    ['INDUSTRY', 'Industry partner'],
  ];
  for (const [code, name] of agencies) {
    await prisma.fundingAgency.upsert({
      where: { code },
      update: { name, is_active: true },
      create: { code, name, is_active: true },
    });
  }

  const budgetCategories = [
    {
      code: 'PERSONNEL',
      name: 'Personnel',
      display_order: 1,
      heads: [
        ['PI_SALARY', 'PI salary / honorarium', 1],
        ['RESEARCH_STAFF', 'Research staff', 2],
        ['PROJECT_FELLOW', 'Project fellow / scholar', 3],
      ],
    },
    {
      code: 'EQUIPMENT',
      name: 'Equipment',
      display_order: 2,
      heads: [
        ['MAJOR_EQUIP', 'Major equipment', 1],
        ['MINOR_EQUIP', 'Minor equipment / accessories', 2],
      ],
    },
    {
      code: 'CONSUMABLES',
      name: 'Consumables',
      display_order: 3,
      heads: [
        ['LAB_CONSUMABLES', 'Laboratory consumables', 1],
        ['FIELD_SUPPLIES', 'Field / survey supplies', 2],
      ],
    },
    {
      code: 'TRAVEL',
      name: 'Travel',
      display_order: 4,
      heads: [
        ['DOMESTIC_TRAVEL', 'Domestic travel', 1],
        ['INTERNATIONAL_TRAVEL', 'International travel', 2],
      ],
    },
    {
      code: 'OVERHEADS',
      name: 'Overheads & misc.',
      display_order: 5,
      heads: [
        ['INST_OVERHEAD', 'Institutional overhead', 1],
        ['CONTINGENCY', 'Contingency', 2],
      ],
    },
  ];

  for (const cat of budgetCategories) {
    const category = await prisma.budgetCategory.upsert({
      where: { code: cat.code },
      update: {
        name: cat.name,
        display_order: cat.display_order,
        is_active: true,
      },
      create: {
        code: cat.code,
        name: cat.name,
        display_order: cat.display_order,
        is_active: true,
      },
    });

    for (const [headCode, headName, headOrder] of cat.heads) {
      await prisma.budgetHead.upsert({
        where: {
          budget_category_id_code: {
            budget_category_id: category.id,
            code: headCode,
          },
        },
        update: {
          name: headName,
          display_order: headOrder,
          is_active: true,
        },
        create: {
          budget_category_id: category.id,
          code: headCode,
          name: headName,
          display_order: headOrder,
          is_active: true,
        },
      });
    }
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const superAdminUser = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      password_hash: hashedPassword,
      is_active: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: superAdminUser.id,
        role_id: superAdminRole.id,
      },
    },
    update: {},
    create: {
      user_id: superAdminUser.id,
      role_id: superAdminRole.id,
      is_active: true,
    },
  });

  console.log('Roles and Super Admin seeded successfully');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
