import prisma from "../src/lib/prisma";
import { TENANT_CLASSIFICATION } from "../src/generated/tenantClassification";

interface PublicTable {
  tableName: string;
}

async function verifyDatabaseSchema(): Promise<void> {
  const expectedTables = Object.values(TENANT_CLASSIFICATION).map((model) => model.table);
  const uniqueExpectedTables = new Set(expectedTables);
  if (expectedTables.length !== 205 || uniqueExpectedTables.size !== expectedTables.length) {
    throw new Error(
      `Expected 205 unique Prisma model tables; found ${expectedTables.length} model entries and ${uniqueExpectedTables.size} unique tables.`
    );
  }

  const actualTables = await prisma.$queryRaw<PublicTable[]>`
    SELECT tablename AS "tableName"
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
  `;
  const actualTableNames = new Set(actualTables.map((table) => table.tableName));
  const missingTables = [...uniqueExpectedTables].filter((table) => !actualTableNames.has(table));
  if (missingTables.length > 0) {
    throw new Error(`Missing Prisma model tables after migration deploy: ${missingTables.join(", ")}`);
  }

  console.log(`Database schema contains all ${uniqueExpectedTables.size} Prisma model tables.`);
}

verifyDatabaseSchema()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
