import prisma from './src/lib/prisma';

async function main() {
  const students = await prisma.student.findMany();
  console.log(students.map(s => s.name));
}
main().finally(() => prisma.$disconnect());
