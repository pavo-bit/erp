import { execSync } from 'child_process';

async function main() {
  console.log('Seeding E2E database...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  execSync('npx prisma db seed', { stdio: 'inherit' });
  console.log('E2E seed complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});