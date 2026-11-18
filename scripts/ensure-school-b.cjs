const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/ssvm_platform?schema=public'
    }
  }
});

async function main() {
  let b = await prisma.school.findFirst({ where: { code: 'BRANCH_B' } });
  if (!b) {
    b = await prisma.school.create({
      data: {
        name: 'SSVM Branch School B',
        code: 'BRANCH_B',
        status: 'ACTIVE',
        address: 'Branch Campus B',
        phone: '9876543210',
        email: 'branchb@ssvm.edu'
      }
    });
    console.log('Created School B:', b.id);
  } else {
    console.log('School B exists:', b.id);
  }

  let userB = await prisma.user.findFirst({ where: { email: 'admin.b@ssvm.edu' } });
  if (!userB) {
    const hash = await bcrypt.hash('admin123', 10);
    userB = await prisma.user.create({
      data: {
        email: 'admin.b@ssvm.edu',
        passwordHash: hash,
        name: 'School B Admin',
        role: 'ERP_ADMIN',
        schoolId: b.id,
        isActive: true
      }
    });
    console.log('Created User B:', userB.id);
  } else {
    console.log('User B exists:', userB.id);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
