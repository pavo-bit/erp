import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Commencing SSVM Enterprise DB Seed Protocol...");

  // 1. Flush existing mock data (optional based on ENV)
  // For safety in production, we skip aggressive wiping unless specified
  
  // 2. Setup Super Admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@ssvmerp.com' },
    update: {},
    create: {
      email: 'superadmin@ssvmerp.com',
      passwordHash: hashedPassword,
      name: 'System SuperAdmin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('✅ SuperAdmin provisioned:', superAdmin.email);

  // 3. Setup Primary Tenant School
  const school = await prisma.school.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      name: 'SSVM International School (Main Campus)',
      code: 'MAIN',
      address: '123 Education Boulevard, Metropolis',
      phone: '+1 800 555 0199',
      email: 'contact@ssvminternational.edu',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Primary Tenant School provisioned:', school.name);

  // 4. Setup Academic Session
  const session = await prisma.academicSession.upsert({
    where: { schoolId_name: { schoolId: school.id, name: '2026-2027' } },
    update: {},
    create: {
      schoolId: school.id,
      name: '2026-2027',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-05-31'),
      isCurrent: true,
    },
  });
  console.log('✅ Academic Session provisioned:', session.name);

  // 5. Setup CRM Pipeline Stages
  const stage1 = await prisma.pipelineStage.create({
    data: { schoolId: school.id, name: 'Lead Captured', orderIndex: 1 }
  });
  const stage2 = await prisma.pipelineStage.create({
    data: { schoolId: school.id, name: 'Campus Tour Booked', orderIndex: 2 }
  });
  console.log('✅ CRM Pipeline provisioned');

  // 6. Setup Double-Entry Ledger System (Chart of Accounts)
  const cashAccount = await prisma.ledgerAccount.create({
    data: {
      schoolId: school.id,
      code: '1000',
      name: 'Main Operating Cash',
      type: 'CASH',
      category: 'ASSET'
    }
  });

  const tuitionRevenue = await prisma.ledgerAccount.create({
    data: {
      schoolId: school.id,
      code: '4000',
      name: 'Tuition Revenue',
      type: 'REVENUE',
      category: 'REVENUE'
    }
  });
  console.log('✅ Chart of Accounts provisioned');

  // 7. Data Retention Policy (Governance)
  await prisma.dataRetentionPolicy.create({
    data: {
      schoolId: school.id,
      entityName: 'VisitorLog',
      retentionDays: 90,
      action: 'PURGE'
    }
  });
  console.log('✅ Governance Policies provisioned');

  console.log("🚀 Enterprise Database Seeding complete! Run 'npx prisma studio' to view data.");
}

main()
  .catch((e) => {
    console.error("❌ Seed Failed: ", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
