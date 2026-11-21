import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

import * as bcrypt from 'bcryptjs';

const seedUrl = process.env.DIRECT_URL || process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: seedUrl } } });


async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Demo seeding is disabled. Set ALLOW_DEMO_SEED=true in a non-production environment to proceed.');
  }
  const adminEmail = process.env.SEED_SUPER_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 16) {
    throw new Error('Set SEED_SUPER_ADMIN_EMAIL and a unique SEED_SUPER_ADMIN_PASSWORD of at least 16 characters.');
  }
  console.log("🌱 Commencing SSVM Enterprise DB Seed Protocol...");

  // 1. Flush existing mock data (optional based on ENV)
  // For safety in production, we skip aggressive wiping unless specified
  
  // 2. Setup Super Admin
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      name: 'System SuperAdmin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('✅ SuperAdmin provisioned');

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

  // 5. Setup CRM Pipeline Stages (idempotent)
  const existingStages = await prisma.pipelineStage.findMany({ where: { schoolId: school.id } });
  if (existingStages.length === 0) {
    await prisma.pipelineStage.create({
      data: { schoolId: school.id, name: 'Lead Captured', orderIndex: 1 }
    });
    await prisma.pipelineStage.create({
      data: { schoolId: school.id, name: 'Campus Tour Booked', orderIndex: 2 }
    });
  }
  console.log('✅ CRM Pipeline provisioned');

  // 6. Setup Double-Entry Ledger System (Chart of Accounts - idempotent)
  await prisma.ledgerAccount.upsert({
    where: { schoolId_code: { schoolId: school.id, code: '1000' } },
    update: {},
    create: {
      schoolId: school.id,
      code: '1000',
      name: 'Main Operating Cash',
      type: 'CASH',
      category: 'ASSET'
    }
  });

  await prisma.ledgerAccount.upsert({
    where: { schoolId_code: { schoolId: school.id, code: '4000' } },
    update: {},
    create: {
      schoolId: school.id,
      code: '4000',
      name: 'Tuition Revenue',
      type: 'REVENUE',
      category: 'REVENUE'
    }
  });
  console.log('✅ Chart of Accounts provisioned');

  // 7. Data Retention Policy (Governance - idempotent)
  await prisma.dataRetentionPolicy.upsert({
    where: { schoolId_entityName: { schoolId: school.id, entityName: 'VisitorLog' } },
    update: {},
    create: {
      schoolId: school.id,
      entityName: 'VisitorLog',
      retentionDays: 90,
      action: 'PURGE'
    }
  });
  console.log('✅ Governance Policies provisioned');

  // E2E test fixtures (guarded by ALLOW_DEMO_SEED)
  const e2ePassword = "$argon2id$v=19$m=65536,t=3,p=4$EE7DgZ2brHz90WCitLoK1A$OjbQHdC/PaqrklVV11B2GNR/SUZrxyu4rPbIyUQO5jE";

  const schoolA = await prisma.school.upsert({
    where: { code: 'SSVMA' },
    update: {},
    create: {
      name: 'SSVM Test School A',
      code: 'SSVMA',
      address: '1 Test Street',
      phone: '+1 800 555 0100',
      email: 'contacta@ssvmtest.edu',
      status: 'ACTIVE',
    },
  });

  const schoolB = await prisma.school.upsert({
    where: { code: 'SSVMB' },
    update: {},
    create: {
      name: 'SSVM Test School B',
      code: 'SSVMB',
      address: '2 Test Street',
      phone: '+1 800 555 0101',
      email: 'contactb@ssvmtest.edu',
      status: 'ACTIVE',
    },
  });

  const sessionA = await prisma.academicSession.upsert({
    where: { schoolId_name: { schoolId: schoolA.id, name: '2026-2027' } },
    update: {},
    create: {
      schoolId: schoolA.id,
      name: '2026-2027',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-12-31'),
      isCurrent: true,
    },
  });

  const sessionB = await prisma.academicSession.upsert({
    where: { schoolId_name: { schoolId: schoolB.id, name: '2026-2027' } },
    update: {},
    create: {
      schoolId: schoolB.id,
      name: '2026-2027',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-12-31'),
      isCurrent: true,
    },
  });

  // Provision authoritative Classes and Sections for Academic Session 2026-2027
  const classA10 = await prisma.class.upsert({
    where: { schoolId_sessionId_name: { schoolId: schoolA.id, sessionId: sessionA.id, name: '10' } },
    update: {},
    create: {
      schoolId: schoolA.id,
      sessionId: sessionA.id,
      name: '10',
      sortOrder: 10,
    },
  });

  const sectionA10 = await prisma.section.upsert({
    where: { classId_name: { classId: classA10.id, name: 'A' } },
    update: {},
    create: {
      classId: classA10.id,
      name: 'A',
      capacity: 40,
    },
  });

  const classB10 = await prisma.class.upsert({
    where: { schoolId_sessionId_name: { schoolId: schoolB.id, sessionId: sessionB.id, name: '10' } },
    update: {},
    create: {
      schoolId: schoolB.id,
      sessionId: sessionB.id,
      name: '10',
      sortOrder: 10,
    },
  });

  await prisma.section.upsert({
    where: { classId_name: { classId: classB10.id, name: 'A' } },
    update: {},
    create: {
      classId: classB10.id,
      name: 'A',
      capacity: 40,
    },
  });

  const e2eUsers = [
    { email: 'erpadmin@ssvm.edu', role: 'ERP_ADMIN', schoolId: schoolA.id, name: 'ERP Admin A' },
    { email: 'superadmin@ssvm-erp.com', role: 'SUPER_ADMIN', schoolId: null, name: 'Super Admin' },
    { email: 'superadmin@ssvmerp.com', role: 'SUPER_ADMIN', schoolId: null, name: 'Super Admin' },
    { email: 'teacher1@ssvm.edu', role: 'TEACHER', schoolId: schoolA.id, name: 'Teacher One' },
    { email: 'student1@ssvm.edu', role: 'STUDENT', schoolId: schoolA.id, name: 'Student One' },
    { email: 'parent1@ssvm.edu', role: 'PARENT', schoolId: schoolA.id, name: 'Parent One' },
  ];

  const provisionedUsers: Array<{ id: string; email: string; role: string }> = [];

  for (const u of e2eUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: e2ePassword },
      create: {
        email: u.email,
        passwordHash: e2ePassword,
        name: u.name,
        role: u.role,
        schoolId: u.schoolId,
        isActive: true,
      },
    });
    provisionedUsers.push({ id: user.id, email: user.email, role: user.role });

    if (u.role === 'TEACHER' && u.schoolId) {
      const teacher = await prisma.teacher.upsert({
        where: { userId: user.id },
        update: { schoolId: u.schoolId },
        create: {
          userId: user.id,
          schoolId: u.schoolId,
          employeeId: 'EMP-001',
          designation: 'Senior Faculty',
          subjects: 'Mathematics, Science',
          isActive: true,
        },
      });

      await prisma.classTeacher.upsert({
        where: { sectionId_teacherId: { sectionId: sectionA10.id, teacherId: teacher.id } },
        update: { isPrimary: true },
        create: {
          sectionId: sectionA10.id,
          teacherId: teacher.id,
          isPrimary: true,
        },
      });
    }

    if (u.role === 'STUDENT' && u.schoolId) {
      const student = await prisma.student.upsert({
        where: { userId: user.id },
        update: { sectionId: sectionA10.id },
        create: {
          userId: user.id,
          schoolId: u.schoolId,
          sectionId: sectionA10.id,
          admissionNo: 'E2E-STU-001',
          name: u.name,
          rollNo: '1',
          isActive: true,
        },
      });

      await prisma.studentEnrollment.upsert({
        where: { id: `enroll-${student.id}-${sessionA.id}` },
        update: { classId: classA10.id, sectionId: sectionA10.id },
        create: {
          id: `enroll-${student.id}-${sessionA.id}`,
          schoolId: u.schoolId,
          studentId: student.id,
          sessionId: sessionA.id,
          classId: classA10.id,
          sectionId: sectionA10.id,
          rollNo: '1',
          status: 'ACTIVE',
        },
      }).catch(() => {});
    }

    if (u.role === 'PARENT' && u.schoolId) {
      const studentUser = await prisma.user.findUnique({ where: { email: 'student1@ssvm.edu' } });
      const student = studentUser
        ? await prisma.student.findUnique({ where: { userId: studentUser.id } })
        : null;
      const guardian = await prisma.guardian.upsert({
        where: { userId: user.id },
        update: { schoolId: u.schoolId, primaryName: u.name },
        create: {
          userId: user.id,
          schoolId: u.schoolId,
          primaryName: u.name,
          primaryPhone: '9999999999',
          primaryRelation: 'Father',
        },
      });
      if (student) {
        await prisma.student.update({ where: { id: student.id }, data: { guardianId: guardian.id } }).catch(() => {});
      }
    }
  }

  // Authoritative fixture contract consumed by the Playwright suite.
  const manifest = {
    generatedAt: new Date().toISOString(),
    schools: {
      schoolA: { id: schoolA.id, code: schoolA.code, name: schoolA.name, sessionId: sessionA.id },
      schoolB: { id: schoolB.id, code: schoolB.code, name: schoolB.name, sessionId: sessionB.id },
    },
    users: provisionedUsers,
  };
  const manifestDir = path.resolve(__dirname, '../../e2e-tests/fixtures');
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(path.join(manifestDir, 'seed-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`E2E fixture manifest written to ${path.join(manifestDir, 'seed-manifest.json')}`);
  console.log('E2E test principals provisioned');
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
