
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function run() {
  const student = await prisma.student.findUnique({ where: { admissionNo: "DEMO-1001" } });
  console.log("Student userId:", student.userId);
  if (student.userId) {
    const user = await prisma.user.findUnique({ where: { id: student.userId } });
    console.log("User:", user ? "Found" : "NOT FOUND!");
    if (!user) {
      console.log("Creating new user...");
      const newUser = await prisma.user.create({
        data: {
          email: "demo-1001@demo.ssvm.edu",
          passwordHash: student.password,
          name: "Demo Student (DEMO-1001)",
          role: "STUDENT",
          schoolId: student.schoolId,
          isActive: true
        }
      });
      await prisma.student.update({ where: { id: student.id }, data: { userId: newUser.id } });
      console.log("Fixed student userId to", newUser.id);
    }
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
