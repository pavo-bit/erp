import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { TENANT_CLASSIFICATION } from "../src/generated/tenantClassification";
import { seedDefaultChartOfAccounts, DEFAULT_CHART_OF_ACCOUNTS } from "../src/lib/chartOfAccounts";

const PG_HOST = process.env.PGHOST || "localhost";
const PG_PORT = process.env.PGPORT || "5433";
const PG_USER = process.env.PGUSER || "postgres";
const PG_PASSWORD = process.env.PGPASSWORD || "postgres";
const APP_PASSWORD = process.env.APP_DB_PASSWORD || "app_pw";

const ADMIN_URL = process.env.DATABASE_URL_ADMIN || `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/postgres`;
const UPGRADE_DB_NAME = "ssvm_upgrade_test";
const UPGRADE_URL_POSTGRES = `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${UPGRADE_DB_NAME}?schema=public`;
const UPGRADE_URL_APP = `postgresql://ssvm_app:${APP_PASSWORD}@${PG_HOST}:${PG_PORT}/${UPGRADE_DB_NAME}?schema=public`;

async function main() {
  console.log("================================================================================");
  console.log("SSVM UPGRADE TEST: MIGRATING FROM remediation/80pct TO lane/a-db-spine");
  console.log("================================================================================");

  // 1. Connect to admin postgres database to drop & recreate upgrade test database
  console.log("\n[1/7] Initializing fresh upgrade database:", UPGRADE_DB_NAME);
  const adminPrisma = new PrismaClient({
    datasources: { db: { url: ADMIN_URL } },
  });

  try {
    await adminPrisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${UPGRADE_DB_NAME}' AND pid <> pg_backend_pid();
    `);
    await adminPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${UPGRADE_DB_NAME}";`);
    await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${UPGRADE_DB_NAME}";`);
    console.log("  ✓ Created clean database:", UPGRADE_DB_NAME);
  } finally {
    await adminPrisma.$disconnect();
  }

  // 2. Prepare temporary directory containing ONLY the 4 baseline migrations from remediation/80pct
  console.log("\n[2/7] Deploying baseline migrations from remediation/80pct...");
  const tempDir = path.join(__dirname, "..", "prisma-baseline-temp");
  const tempMigrationsDir = path.join(tempDir, "migrations");
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempMigrationsDir, { recursive: true });

  const baselineMigrationNames = [
    "20261101130000_full_schema_baseline",
    "20261101140000_full_text_search_indexes",
    "20261101145000_ledger_integrity",
    "20261101150000_generated_tenant_rls",
  ];

  for (const name of baselineMigrationNames) {
    const src = path.join(__dirname, "..", "prisma", "migrations", name);
    const dest = path.join(tempMigrationsDir, name);
    fs.cpSync(src, dest, { recursive: true });
  }
  fs.copyFileSync(
    path.join(__dirname, "..", "prisma", "migrations", "migration_lock.toml"),
    path.join(tempMigrationsDir, "migration_lock.toml")
  );
  fs.copyFileSync(
    path.join(__dirname, "..", "prisma", "schema.prisma"),
    path.join(tempDir, "schema.prisma")
  );

  const baselineDeployOutput = execSync(
    `npx prisma migrate deploy --schema="${path.join(tempDir, "schema.prisma")}"`,
    {
      env: {
        ...process.env,
        DATABASE_URL: UPGRADE_URL_POSTGRES,
        DIRECT_URL: UPGRADE_URL_POSTGRES,
      },
      encoding: "utf-8",
    }
  );
  console.log(baselineDeployOutput.trim());
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log("  ✓ Applied 4 baseline migrations successfully.");

  // 3. Connect as postgres to ssvm_upgrade_test and provision roles
  console.log("\n[3/7] Provisioning roles and permissions on upgrade database...");
  const postgresPrisma = new PrismaClient({
    datasources: { db: { url: UPGRADE_URL_POSTGRES } },
  });

  let provisionRolesSql = fs.readFileSync(
    path.join(__dirname, "db", "provision-roles.sql"),
    "utf-8"
  );
  // Strip psql meta-commands and set passwords explicitly
  provisionRolesSql = provisionRolesSql
    .replace(/\\if[\s\S]*?\\endif/g, "")
    .concat(`
      ALTER ROLE ssvm_app WITH PASSWORD '${APP_PASSWORD}';
      ALTER ROLE ssvm_auth WITH PASSWORD 'authpassword';
      ALTER ROLE ssvm_trusted WITH PASSWORD 'trustedpassword';
      ALTER ROLE ssvm_fixture WITH PASSWORD 'fixture_pw';
    `);
  const tempSqlFile = path.join(__dirname, "..", "temp-provision-roles.sql");
  fs.writeFileSync(tempSqlFile, provisionRolesSql, "utf-8");
  try {
    execSync(`npx prisma db execute --file="${tempSqlFile}" --url="${UPGRADE_URL_POSTGRES}"`, {
      encoding: "utf-8",
    });
  } finally {
    fs.rmSync(tempSqlFile, { force: true });
  }
  console.log("  ✓ Executed scripts/db/provision-roles.sql successfully.");

  // 4. Drop baseline global sku unique index to allow multi-tenant identical SKU fixture
  await postgresPrisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "InventoryItem_sku_key";`);

  // 5. Insert fixtures:
  // - 2 schools
  // - students with and without userId
  // - invoices with Float values (Double precision in baseline)
  // - inventory items with same SKU in 2 schools
  // - existing audit rows
  console.log("\n[4/7] Inserting test fixtures before migration...");

  const school1Id = "sch_upgrade_01";
  const school2Id = "sch_upgrade_02";

  await postgresPrisma.$executeRawUnsafe(`
    INSERT INTO "schools" ("id", "name", "code", "updatedAt")
    VALUES 
      ('${school1Id}', 'St. Mary High School', 'SMHS', NOW()),
      ('${school2Id}', 'Oakridge International School', 'OIS', NOW());
  `);

  // User for student with userId
  const existingUserId = "usr_student_existing";
  await postgresPrisma.$executeRawUnsafe(`
    INSERT INTO "users" ("id", "schoolId", "email", "name", "passwordHash", "role", "mustChangePassword", "updatedAt")
    VALUES ('${existingUserId}', '${school1Id}', 'student1@smhs.edu', 'Alice Student', '$argon2id$v=19$m=65536,t=3,p=4$somehash$somehash', 'STUDENT', false, NOW());
  `);

  // Students: 1 with userId, 2 without userId
  const student1Id = "stu_with_user";
  const student2Id = "stu_without_user_1";
  const student3Id = "stu_without_user_2";
  await postgresPrisma.$executeRawUnsafe(`
    INSERT INTO "students" ("id", "schoolId", "rollNo", "name", "userId", "updatedAt")
    VALUES 
      ('${student1Id}', '${school1Id}', 'R-101', 'Alice Student', '${existingUserId}', NOW()),
      ('${student2Id}', '${school1Id}', 'R-102', 'Bob Student', NULL, NOW()),
      ('${student3Id}', '${school2Id}', 'R-201', 'Charlie Student', NULL, NOW());
  `);

  // Invoices with Float values
  const inv1Id = "inv_upgrade_01";
  const inv2Id = "inv_upgrade_02";
  await postgresPrisma.$executeRawUnsafe(`
    INSERT INTO "invoices" ("id", "schoolId", "studentId", "amount", "amountPaid", "remainingAmount", "dueDate", "updatedAt")
    VALUES 
      ('${inv1Id}', '${school1Id}', '${student1Id}', 1250.50, 500.25, 750.25, NOW(), NOW()),
      ('${inv2Id}', '${school2Id}', '${student3Id}', 999.95, 0.00, 999.95, NOW(), NOW());
  `);

  // Inventory items with SAME SKU across both schools
  const sharedSku = "SKU-UNIFORM-TIE";
  const item1Id = "item_upgrade_01";
  const item2Id = "item_upgrade_02";
  await postgresPrisma.$executeRawUnsafe(`
    INSERT INTO "InventoryItem" ("id", "schoolId", "sku", "name", "reorderLevel", "updatedAt")
    VALUES 
      ('${item1Id}', '${school1Id}', '${sharedSku}', 'School Tie Navy', 25.5, NOW()),
      ('${item2Id}', '${school2Id}', '${sharedSku}', 'School Tie Maroon', 50.0, NOW());
  `);

  // Existing audit rows
  await postgresPrisma.$executeRawUnsafe(`
    INSERT INTO "audit_logs" ("id", "schoolId", "userId", "action", "entity", "entityId", "createdAt")
    VALUES 
      ('audit_upgrade_01', '${school1Id}', '${existingUserId}', 'CREATE', 'Student', '${student1Id}', NOW()),
      ('audit_upgrade_02', '${school2Id}', NULL, 'CREATE', 'Student', '${student3Id}', NOW());
  `);

  // Record baseline row counts
  const beforeCounts = {
    schools: await postgresPrisma.school.count(),
    users: await postgresPrisma.user.count(),
    students: await postgresPrisma.student.count(),
    invoices: await postgresPrisma.invoice.count(),
    inventoryItems: await postgresPrisma.inventoryItem.count(),
    auditLogs: await postgresPrisma.auditLog.count(),
  };

  console.log("  Pre-migration row counts:");
  console.table(beforeCounts);

  // 6. Run `prisma migrate deploy` with this branch's migrations
  console.log("\n[5/7] Running `prisma migrate deploy` with branch migrations...");
  const migrateDeployOutput = execSync("npx prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: UPGRADE_URL_POSTGRES,
      DIRECT_URL: UPGRADE_URL_POSTGRES,
    },
    encoding: "utf-8",
  });
  console.log(migrateDeployOutput.trim());
  console.log("  ✓ `prisma migrate deploy` succeeded without errors.");

  // 7. Verify upgrade assertions
  console.log("\n[6/7] Verifying upgrade data integrity and invariants...");

  // (a) Row counts unchanged (except users backfilled for students without userId)
  const afterCounts = {
    schools: await postgresPrisma.school.count(),
    users: await postgresPrisma.user.count(),
    students: await postgresPrisma.student.count(),
    invoices: await postgresPrisma.invoice.count(),
    inventoryItems: await postgresPrisma.inventoryItem.count(),
    auditLogs: await postgresPrisma.auditLog.count(),
  };
  console.log("  Post-migration row counts:");
  console.table(afterCounts);

  if (afterCounts.schools !== beforeCounts.schools) throw new Error("Schools count changed!");
  if (afterCounts.students !== beforeCounts.students) throw new Error("Students count changed!");
  if (afterCounts.invoices !== beforeCounts.invoices) throw new Error("Invoices count changed!");
  if (afterCounts.inventoryItems !== beforeCounts.inventoryItems) throw new Error("InventoryItem count changed!");
  if (afterCounts.auditLogs !== beforeCounts.auditLogs) throw new Error("AuditLog count changed!");
  // 2 students lacked userId, so exactly 2 users should have been created by backfill
  if (afterCounts.users !== beforeCounts.users + 2) {
    throw new Error(`Expected exactly 2 users backfilled; before=${beforeCounts.users}, after=${afterCounts.users}`);
  }
  console.log("  ✓ Row counts verified (entities preserved, exactly 2 users backfilled).");

  // (b) Decimal values exact
  const inv1 = await postgresPrisma.invoice.findUniqueOrThrow({ where: { id: inv1Id } });
  const inv2 = await postgresPrisma.invoice.findUniqueOrThrow({ where: { id: inv2Id } });
  if (inv1.amount.toString() !== "1250.5" && inv1.amount.toString() !== "1250.50") {
    throw new Error(`Invoice 1 amount mismatch: got ${inv1.amount.toString()}`);
  }
  if (inv1.amountPaid.toString() !== "500.25") {
    throw new Error(`Invoice 1 amountPaid mismatch: got ${inv1.amountPaid.toString()}`);
  }
  if (inv2.amount.toString() !== "999.95") {
    throw new Error(`Invoice 2 amount mismatch: got ${inv2.amount.toString()}`);
  }

  const item1 = await postgresPrisma.inventoryItem.findUniqueOrThrow({ where: { id: item1Id } });
  const item2 = await postgresPrisma.inventoryItem.findUniqueOrThrow({ where: { id: item2Id } });
  if (item1.reorderLevel.toString() !== "25.5" && item1.reorderLevel.toString() !== "25.50") {
    throw new Error(`Item 1 reorderLevel mismatch: got ${item1.reorderLevel.toString()}`);
  }
  if (item2.reorderLevel.toString() !== "50" && item2.reorderLevel.toString() !== "50.00") {
    throw new Error(`Item 2 reorderLevel mismatch: got ${item2.reorderLevel.toString()}`);
  }
  console.log("  ✓ Decimal conversions exact (invoices: 1250.50, 500.25, 999.95; inventory: 25.50, 50.00).");

  // (c) Backfilled users have non-empty passwordHash with mustChangePassword=true
  const student2 = await postgresPrisma.student.findUniqueOrThrow({ where: { id: student2Id } });
  const student3 = await postgresPrisma.student.findUniqueOrThrow({ where: { id: student3Id } });
  if (!student2.userId) throw new Error("Student 2 was not backfilled with a userId!");
  if (!student3.userId) throw new Error("Student 3 was not backfilled with a userId!");

  const backfilledUser2 = await postgresPrisma.user.findUniqueOrThrow({ where: { id: student2.userId } });
  const backfilledUser3 = await postgresPrisma.user.findUniqueOrThrow({ where: { id: student3.userId } });

  for (const u of [backfilledUser2, backfilledUser3]) {
    if (!u.passwordHash || u.passwordHash.length === 0) {
      throw new Error(`Backfilled user ${u.id} has empty passwordHash!`);
    }
    if (!u.passwordHash.startsWith("$argon2id$")) {
      throw new Error(`Backfilled user ${u.id} passwordHash is not argon2id format: ${u.passwordHash}`);
    }
    if (u.mustChangePassword !== true) {
      throw new Error(`Backfilled user ${u.id} mustChangePassword is not true!`);
    }
    if (u.role !== "STUDENT") {
      throw new Error(`Backfilled user ${u.id} role is not STUDENT!`);
    }
  }
  console.log("  ✓ Backfilled users verified (non-empty argon2id hash, mustChangePassword=true, role=STUDENT).");

  // (d) Chart of Accounts created once per school (run twice to prove idempotency)
  console.log("\n[7/7] Testing Chart of Accounts idempotency & RLS enforcement...");
  await seedDefaultChartOfAccounts(postgresPrisma, school1Id);
  await seedDefaultChartOfAccounts(postgresPrisma, school2Id);

  const coaCountPass1School1 = await postgresPrisma.ledgerAccount.count({ where: { schoolId: school1Id } });
  const coaCountPass1School2 = await postgresPrisma.ledgerAccount.count({ where: { schoolId: school2Id } });
  if (coaCountPass1School1 !== DEFAULT_CHART_OF_ACCOUNTS.length) {
    throw new Error(`Expected ${DEFAULT_CHART_OF_ACCOUNTS.length} accounts for school 1, got ${coaCountPass1School1}`);
  }
  if (coaCountPass1School2 !== DEFAULT_CHART_OF_ACCOUNTS.length) {
    throw new Error(`Expected ${DEFAULT_CHART_OF_ACCOUNTS.length} accounts for school 2, got ${coaCountPass1School2}`);
  }

  // Run second time
  await seedDefaultChartOfAccounts(postgresPrisma, school1Id);
  await seedDefaultChartOfAccounts(postgresPrisma, school2Id);

  const coaCountPass2School1 = await postgresPrisma.ledgerAccount.count({ where: { schoolId: school1Id } });
  const coaCountPass2School2 = await postgresPrisma.ledgerAccount.count({ where: { schoolId: school2Id } });
  if (coaCountPass2School1 !== DEFAULT_CHART_OF_ACCOUNTS.length) {
    throw new Error(`Idempotency failed: school 1 count changed to ${coaCountPass2School1}`);
  }
  if (coaCountPass2School2 !== DEFAULT_CHART_OF_ACCOUNTS.length) {
    throw new Error(`Idempotency failed: school 2 count changed to ${coaCountPass2School2}`);
  }
  console.log(`  ✓ Chart of Accounts created once per school and verified idempotent (${DEFAULT_CHART_OF_ACCOUNTS.length} accounts/school).`);

  // (e) RLS enabled + forced on all tenant tables
  const rlsStatus = await postgresPrisma.$queryRaw<Array<{
    tablename: string;
    rowsecurity: boolean;
    forcerowsecurity: boolean;
  }>>`
    SELECT c.relname AS tablename, c.relrowsecurity AS rowsecurity, c.relforcerowsecurity AS forcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r';
  `;
  const rlsMap = new Map(rlsStatus.map((r) => [r.tablename, r]));

  const tenantTables = Object.values(TENANT_CLASSIFICATION)
    .filter((entry) => entry.classification === "direct" || entry.classification === "indirect")
    .map((entry) => entry.table);

  const uniqueTenantTables = Array.from(new Set(tenantTables));
  for (const table of uniqueTenantTables) {
    const status = rlsMap.get(table);
    if (!status) throw new Error(`Tenant table ${table} not found in database!`);
    if (!status.rowsecurity) throw new Error(`RLS not enabled on ${table}!`);
    if (!status.forcerowsecurity) throw new Error(`RLS not forced on ${table}!`);
  }
  console.log(`  ✓ RLS enabled and forced on all ${uniqueTenantTables.length} tenant tables in database.`);

  // Test live querying as ssvm_app role
  const appPrisma = new PrismaClient({
    datasources: { db: { url: UPGRADE_URL_APP } },
  });

  try {
    // School 1 context
    await appPrisma.$executeRawUnsafe(`SELECT set_config('app.current_school_id', '${school1Id}', false);`);
    const s1Students = await appPrisma.student.findMany();
    const s1Invoices = await appPrisma.invoice.findMany();
    const s1Items = await appPrisma.inventoryItem.findMany();

    if (s1Students.length !== 2 || s1Students.some((s) => s.schoolId !== school1Id)) {
      throw new Error(`ssvm_app isolated student query failed for school 1`);
    }
    if (s1Invoices.length !== 1 || s1Invoices[0].schoolId !== school1Id) {
      throw new Error(`ssvm_app isolated invoice query failed for school 1`);
    }
    if (s1Items.length !== 1 || s1Items[0].schoolId !== school1Id) {
      throw new Error(`ssvm_app isolated inventory query failed for school 1`);
    }

    // School 2 context
    await appPrisma.$executeRawUnsafe(`SELECT set_config('app.current_school_id', '${school2Id}', false);`);
    const s2Students = await appPrisma.student.findMany();
    const s2Invoices = await appPrisma.invoice.findMany();
    const s2Items = await appPrisma.inventoryItem.findMany();

    if (s2Students.length !== 1 || s2Students[0].schoolId !== school2Id) {
      throw new Error(`ssvm_app isolated student query failed for school 2`);
    }
    if (s2Invoices.length !== 1 || s2Invoices[0].schoolId !== school2Id) {
      throw new Error(`ssvm_app isolated invoice query failed for school 2`);
    }
    if (s2Items.length !== 1 || s2Items[0].schoolId !== school2Id) {
      throw new Error(`ssvm_app isolated inventory query failed for school 2`);
    }

    // No context (fail-closed)
    await appPrisma.$executeRawUnsafe(`SELECT set_config('app.current_school_id', '', false);`);
    const noContextStudents = await appPrisma.student.findMany();
    const noContextInvoices = await appPrisma.invoice.findMany();
    const noContextItems = await appPrisma.inventoryItem.findMany();

    if (noContextStudents.length !== 0 || noContextInvoices.length !== 0 || noContextItems.length !== 0) {
      throw new Error(`ssvm_app without tenant context did not fail-closed!`);
    }

    console.log("  ✓ ssvm_app queries verified: strict isolation across schools and fail-closed with empty context.");
  } finally {
    await appPrisma.$disconnect();
    await postgresPrisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log("ALL UPGRADE VERIFICATIONS PASSED!");
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("UPGRADE TEST FAILED:", err);
  process.exit(1);
});
