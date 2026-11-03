import prisma from './src/lib/prisma';

import * as bcrypt from 'bcryptjs';


async function main() {
  const school = await prisma.school.findFirst();
  if (!school) throw new Error("No school found!");

  const hashedPassword = await bcrypt.hash('student123', 10);

  const studentUser = await prisma.user.upsert({
    where: { email: 'student@ssvm-cuttack.org' },
    update: { passwordHash: hashedPassword },
    create: {
      email: 'student@ssvm-cuttack.org',
      passwordHash: hashedPassword,
      name: 'Demo Student',
      role: 'STUDENT',
      isActive: true,
    },
  });

  const student = await prisma.student.upsert({
    where: { admissionNo: 'ADM2026001' },
    update: { password: hashedPassword },
    create: {
      id: studentUser.id,
      schoolId: school.id,
      admissionNo: 'ADM2026001',
      rollNo: '1',
      name: 'Demo Student',
      dob: new Date('2010-01-01'),
      isActive: true,
      password: hashedPassword,
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      schoolId: school.id,
      studentId: student.id,
      amount: 5000,
      remainingAmount: 5000,
      dueDate: new Date(Date.now() + 86400000 * 7),
      status: 'PENDING',
      type: 'MONTHLY'
    }
  });

  console.log("✅ Demo Student Created!");
  console.log("Admission No: ADM2026001");
  console.log("Password: student123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
