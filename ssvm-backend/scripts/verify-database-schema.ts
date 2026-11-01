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

  const paymentUniqueIndex = await prisma.$queryRaw<Array<{
    indexName: string;
    indexDefinition: string;
  }>>`
    SELECT indexname AS "indexName", indexdef AS "indexDefinition"
    FROM pg_catalog.pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'payment_transactions'
      AND indexname = 'payment_transactions_invoiceId_transactionId_key'
  `;
  if (
    paymentUniqueIndex.length !== 1 ||
    !paymentUniqueIndex[0].indexDefinition.startsWith("CREATE UNIQUE INDEX") ||
    !paymentUniqueIndex[0].indexDefinition.includes('("invoiceId", "transactionId")')
  ) {
    throw new Error("The payment invoiceId/transactionId composite unique index is missing from the migrated database.");
  }

  console.log(
    `Database schema contains all ${uniqueExpectedTables.size} Prisma model tables and the payment invoiceId/transactionId unique index.`
  );
}

verifyDatabaseSchema()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
