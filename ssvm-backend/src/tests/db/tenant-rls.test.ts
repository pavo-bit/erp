import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rlsTestPrisma as prisma } from "./setup";

interface ScopedCategoryRow {
  id: string;
  schoolId: string;
}

const suffix = randomUUID().replaceAll("-", "");
const schoolA = { id: `rls-test-a-${suffix}`, name: `RLS Test A ${suffix}`, code: `RLSA${suffix}` };
const schoolB = { id: `rls-test-b-${suffix}`, name: `RLS Test B ${suffix}`, code: `RLSB${suffix}` };
const categoryA = { id: `rls-category-a-${suffix}`, schoolId: schoolA.id, name: `RLS A ${suffix}` };
const categoryB = { id: `rls-category-b-${suffix}`, schoolId: schoolB.id, name: `RLS B ${suffix}` };

async function withTenant<T>(schoolId: string, callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw<string[]>`SELECT set_config('app.current_school_id', ${schoolId}, true)`;
    return callback(tx);
  });
}

async function selectFixtureCategories(tx: Prisma.TransactionClient): Promise<ScopedCategoryRow[]> {
  return tx.$queryRaw<ScopedCategoryRow[]>(Prisma.sql`
    SELECT id, "schoolId"
    FROM fee_categories
    WHERE id IN (${Prisma.join([categoryA.id, categoryB.id])})
    ORDER BY id
  `);
}

describe("PostgreSQL tenant RLS", () => {
  beforeAll(async () => {
    await prisma.school.createMany({ data: [schoolA, schoolB] });
    await withTenant(schoolA.id, async (tx) => {
      await tx.feeCategory.create({ data: categoryA });
    });
    await withTenant(schoolB.id, async (tx) => {
      await tx.feeCategory.create({ data: categoryB });
    });
  });

  afterAll(async () => {
    await withTenant(schoolA.id, (tx) => tx.feeCategory.deleteMany({ where: { id: categoryA.id } }));
    await withTenant(schoolB.id, (tx) => tx.feeCategory.deleteMany({ where: { id: categoryB.id } }));
    await prisma.school.deleteMany({ where: { id: { in: [schoolA.id, schoolB.id] } } });
    await prisma.$disconnect();
  });

  it("fails closed when a tenant setting is absent", async () => {
    const rows = await prisma.$transaction((tx) => selectFixtureCategories(tx));
    expect(rows).toEqual([]);
  });

  it("returns only the active tenant's rows", async () => {
    const rows = await withTenant(schoolA.id, selectFixtureCategories);
    expect(rows).toEqual([{ id: categoryA.id, schoolId: schoolA.id }]);
  });

  it("rejects a write for a different tenant", async () => {
    await expect(
      withTenant(schoolA.id, async (tx) => {
        await tx.feeCategory.create({ data: { ...categoryB, id: `rls-cross-write-${suffix}` } });
      })
    ).rejects.toBeDefined();
  });
});
