import prisma from '../src/lib/prisma';




async function main() {
  const student = await prisma.student.findUnique({
    where: { admissionNo: "DEMO-1001" },
    include: { school: true }
  });

  if (!student) {
    console.error("Student DEMO-1001 not found");
    return;
  }

  console.log(`Generating invoices for student ${student.name}...`);

  // Create Tuition Fee Invoice
  await prisma.invoice.create({
    data: {
      studentId: student.id,
      schoolId: student.schoolId,
      amount: 5000,
      remainingAmount: 5000,
      type: "MONTHLY",
      description: "Tuition Fee - June 2026",
      status: "PENDING",
      dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
    }
  });

  // Create Transport Fee Invoice
  await prisma.invoice.create({
    data: {
      studentId: student.id,
      schoolId: student.schoolId,
      amount: 1500,
      remainingAmount: 1500,
      type: "TRANSPORT",
      description: "Transport Fee - June 2026",
      status: "PENDING",
      dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
    }
  });

  console.log("Successfully generated 2 pending invoices for checkout testing.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
