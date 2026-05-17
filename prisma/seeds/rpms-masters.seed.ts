import { PrismaClient } from '@prisma/client';

export async function seedRpmsMasters(prisma: PrismaClient) {
  const agencies = [
    { code: 'DST', name: 'Department of Science & Technology' },
    { code: 'UGC', name: 'University Grants Commission' },
    { code: 'ICSSR', name: 'ICSSR' },
    { code: 'INDUSTRY', name: 'Industry / Corporate' },
    { code: 'UNIV', name: 'University Internal Grant' },
  ];

  for (const agency of agencies) {
    await prisma.fundingAgency.upsert({
      where: { code: agency.code },
      update: { name: agency.name, is_active: true },
      create: { ...agency, is_active: true },
    });
  }

  const categories: {
    code: string;
    name: string;
    display_order: number;
    heads: { code: string; name: string; display_order: number }[];
  }[] = [
    {
      code: 'PERSONNEL',
      name: 'Personnel',
      display_order: 1,
      heads: [
        { code: 'PI_SALARY', name: 'PI salary / honorarium', display_order: 1 },
        { code: 'RESEARCH_STAFF', name: 'Research staff', display_order: 2 },
        { code: 'PROJECT_FELLOW', name: 'Project fellow / scholar', display_order: 3 },
      ],
    },
    {
      code: 'EQUIPMENT',
      name: 'Equipment',
      display_order: 2,
      heads: [
        { code: 'MAJOR_EQUIP', name: 'Major equipment', display_order: 1 },
        { code: 'MINOR_EQUIP', name: 'Minor equipment / accessories', display_order: 2 },
      ],
    },
    {
      code: 'CONSUMABLES',
      name: 'Consumables',
      display_order: 3,
      heads: [
        { code: 'LAB_CONSUMABLES', name: 'Laboratory consumables', display_order: 1 },
        { code: 'FIELD_SUPPLIES', name: 'Field / survey supplies', display_order: 2 },
      ],
    },
    {
      code: 'TRAVEL',
      name: 'Travel',
      display_order: 4,
      heads: [
        { code: 'DOMESTIC_TRAVEL', name: 'Domestic travel', display_order: 1 },
        { code: 'INTERNATIONAL_TRAVEL', name: 'International travel', display_order: 2 },
      ],
    },
    {
      code: 'OVERHEADS',
      name: 'Overheads & misc.',
      display_order: 5,
      heads: [
        { code: 'INST_OVERHEAD', name: 'Institutional overhead', display_order: 1 },
        { code: 'CONTINGENCY', name: 'Contingency', display_order: 2 },
      ],
    },
  ];

  for (const cat of categories) {
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

    for (const head of cat.heads) {
      await prisma.budgetHead.upsert({
        where: {
          budget_category_id_code: {
            budget_category_id: category.id,
            code: head.code,
          },
        },
        update: {
          name: head.name,
          display_order: head.display_order,
          is_active: true,
        },
        create: {
          budget_category_id: category.id,
          code: head.code,
          name: head.name,
          display_order: head.display_order,
          is_active: true,
        },
      });
    }
  }

  console.log('RPMS funding agencies and budget masters seeded');
}
