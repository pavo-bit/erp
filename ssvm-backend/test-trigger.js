require('tsx/cjs');
const prisma = require('./src/lib/prisma').default;

async function main() {
  await prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS tsvectorupdate ON public.users CASCADE;");
  await prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS users_search_trigger CASCADE;");
  console.log("Trigger dropped.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
