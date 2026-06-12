import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Minimal Seeding SSVM ERP database...");

  // Since we are iterating on the schema for Phase 2/3, we'll only seed the bare minimum
  // required to log in and use the Super Admin and ERP Admin portals.

  // 1. SCHOOL
  const school = await prisma.school.upsert({
    where: { code: "SSVM-CS" },
    update: {},
    create: {
      name: "SSVM College Square",
      code: "SSVM-CS",
      boardType: "CBSE",
      address: "College Square",
      city: "Cuttack",
      state: "Odisha",
      phone: "+91-671-2345678",
      email: "info@ssvm-cuttack.org",
      website: "https://ssvm-cuttack.org",
    },
  });
  console.log("✅ School created/found:", school.name);

  // 2. SUPER ADMIN
  const superadminEmail = "superadmin@ssvm-erp.com";
  await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {},
    create: {
      email: superadminEmail,
      password: await hash("superadmin123", 10),
      name: "Platform Admin",
      role: "SUPER_ADMIN",
      schoolId: school.id,
      isActive: true,
    },
  });
  console.log("✅ Super Admin created:", superadminEmail);

  // 3. ERP ADMIN
  const adminEmail = "admin@ssvm.edu.in";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: await hash("admin123", 10),
      name: "School Admin",
      role: "ERP_ADMIN",
      schoolId: school.id,
      isActive: true,
    },
  });
  console.log("✅ ERP Admin created:", adminEmail);

  console.log("✅ Minimal seed complete!\n");
}

main()
  .catch((e) => {
    console.error("❌ Minimal Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
