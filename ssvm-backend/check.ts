import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const students = await prisma.student.findMany();
  console.log(students.map(s => s.name));
}
main().finally(() => prisma.$disconnect());
