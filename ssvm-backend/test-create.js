require('tsx/cjs');
const prisma = require('./src/lib/prisma').default;
prisma.user.create({ data: { email: 'testnew@test.com', name: 'Test', password: 'pwd', role: 'SUPER_ADMIN' } })
  .then(console.log)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
