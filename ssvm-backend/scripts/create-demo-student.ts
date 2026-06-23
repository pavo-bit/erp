import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("Generating demo student account...");

  // 1. Get the primary school
  const school = await prisma.school.findFirst();
  if (!school) {
    throw new Error("No school found. Please seed the database first.");
  }

  // 2. Hash password
  const rawPassword = "password123";
  const hashedPassword = await bcrypt.hash(rawPassword, 10);
  const admissionNo = "DEMO-1001";
  const studentEmail = "demo.student@example.com";

  // 3. Create Student User
  const studentUser = await prisma.user.upsert({
    where: { email: studentEmail },
    update: { passwordHash: hashedPassword },
    create: {
      email: studentEmail,
      passwordHash: hashedPassword,
      name: "Demo Student",
      role: "STUDENT",
      schoolId: school.id,
      isActive: true,
    },
  });

  // 4. Create Student Record
  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: { admissionNo: admissionNo },
    create: {
      userId: studentUser.id,
      schoolId: school.id,
      name: studentUser.name,
      admissionNo: admissionNo,
      dob: new Date("2010-05-15"),
      gender: "Male",
      rollNo: "1",
    },
  });

  console.log("\n=================================");
  console.log("Demo Student Created Successfully!");
  console.log("=================================");
  console.log(`Admission Number: ${admissionNo}`);
  console.log(`Password: ${rawPassword}`);
  console.log(`Email: ${studentEmail}`);
  console.log("=================================\n");
}

main()
  .catch((e) => {
    console.error("Failed to create demo student:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
