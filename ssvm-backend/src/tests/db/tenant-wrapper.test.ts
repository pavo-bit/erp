import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma, { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import { runWithSchoolContext } from "../../middleware/school-context.middleware";
import { randomUUID } from "crypto";
import { getTestPrisma } from "../helpers/testApp";

const fixturePrisma = getTestPrisma();

describe("Tenant Wrapper & RLS Enforcement (as ssvm_app)", () => {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
  const schoolA = { id: `tw-sch-a-${suffix}`, name: `Wrapper A ${suffix}`, code: `WRA${suffix}` };
  const schoolB = { id: `tw-sch-b-${suffix}`, name: `Wrapper B ${suffix}`, code: `WRB${suffix}` };
  const categoryA = { id: `tw-cat-a-${suffix}`, schoolId: schoolA.id, name: `Fee Cat A ${suffix}` };
  const categoryB = { id: `tw-cat-b-${suffix}`, schoolId: schoolB.id, name: `Fee Cat B ${suffix}` };

  beforeAll(async () => {
    // Seed fixtures via fixture role (bypassrls)
    await fixturePrisma.school.createMany({ data: [schoolA, schoolB] });
    await fixturePrisma.feeCategory.createMany({ data: [categoryA, categoryB] });
  });

  afterAll(async () => {
    await fixturePrisma.feeCategory.deleteMany({ where: { id: { in: [categoryA.id, categoryB.id] } } });
    await fixturePrisma.school.deleteMany({ where: { id: { in: [schoolA.id, schoolB.id] } } });
  });

  // (a) no context -> 0 rows
  it("(a) returns 0 rows when queried outside a tenant context", async () => {
    const rows = await prisma.feeCategory.findMany({
      where: { id: { in: [categoryA.id, categoryB.id] } }
    });
    expect(rows).toEqual([]);

    const count = await prisma.feeCategory.count({
      where: { id: { in: [categoryA.id, categoryB.id] } }
    });
    expect(count).toBe(0);

    const single = await prisma.feeCategory.findUnique({
      where: { id: categoryA.id }
    });
    expect(single).toBeNull();
  });

  // (b) context A -> only A
  it("(b) returns only tenant A rows when executed in context A", async () => {
    await runWithTenantDatabaseTransaction(schoolA.id, async (tx) => {
      const rows = await tx.feeCategory.findMany({
        where: { id: { in: [categoryA.id, categoryB.id] } }
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(categoryA.id);
      expect(rows[0].schoolId).toBe(schoolA.id);
    });

    await runWithSchoolContext(schoolA.id, async () => {
      const rows = await prisma.feeCategory.findMany({
        where: { id: { in: [categoryA.id, categoryB.id] } }
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(categoryA.id);
      expect(rows[0].schoolId).toBe(schoolA.id);
    });
  });

  // (c) pool reuse after commit and after rollback -> no leakage
  it("(c) ensures connection pool reuse after commit and rollback does not leak tenant context", async () => {
    // 1. Successful commit in School A
    await runWithTenantDatabaseTransaction(schoolA.id, async (tx) => {
      const cat = await tx.feeCategory.findFirst({ where: { id: categoryA.id } });
      expect(cat?.id).toBe(categoryA.id);
    });

    // Verify immediately outside: 0 rows
    const afterCommit = await prisma.feeCategory.findMany({
      where: { id: { in: [categoryA.id, categoryB.id] } }
    });
    expect(afterCommit).toEqual([]);

    // 2. Rolled back transaction in School A
    try {
      await runWithTenantDatabaseTransaction(schoolA.id, async (tx) => {
        const cat = await tx.feeCategory.findFirst({ where: { id: categoryA.id } });
        expect(cat?.id).toBe(categoryA.id);
        throw new Error("Intentional rollback for test");
      });
    } catch (err: any) {
      expect(err.message).toBe("Intentional rollback for test");
    }

    // Verify immediately outside: 0 rows
    const afterRollback = await prisma.feeCategory.findMany({
      where: { id: { in: [categoryA.id, categoryB.id] } }
    });
    expect(afterRollback).toEqual([]);
  });

  // (d) concurrent requests for A and B interleaved 200 times -> no cross-leak
  it("(d) maintains strict tenant isolation across 200 concurrent interleaved requests", async () => {
    const tasks = Array.from({ length: 200 }, (_, i) => {
      const targetSchool = i % 2 === 0 ? schoolA : schoolB;
      const expectedId = i % 2 === 0 ? categoryA.id : categoryB.id;

      return runWithSchoolContext(targetSchool.id, async () => {
        const rows = await prisma.feeCategory.findMany({
          where: { id: { in: [categoryA.id, categoryB.id] } }
        });
        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe(expectedId);
        expect(rows[0].schoolId).toBe(targetSchool.id);
        return rows[0].id;
      });
    });

    const results = await Promise.all(tasks);
    expect(results).toHaveLength(200);
    const countA = results.filter((id) => id === categoryA.id).length;
    const countB = results.filter((id) => id === categoryB.id).length;
    expect(countA).toBe(100);
    expect(countB).toBe(100);
  });

  // (e) nested transactions
  it("(e) supports nested tenant database transactions without deadlocks or context corruption", async () => {
    const result = await runWithTenantDatabaseTransaction(schoolA.id, async (tx1) => {
      const outerCat = await tx1.feeCategory.findFirst({ where: { id: categoryA.id } });
      expect(outerCat?.id).toBe(categoryA.id);

      // Nested invocation with same school
      const innerResult = await runWithTenantDatabaseTransaction(schoolA.id, async (tx2) => {
        const innerCat = await tx2.feeCategory.findFirst({ where: { id: categoryA.id } });
        expect(innerCat?.id).toBe(categoryA.id);
        return innerCat;
      });

      return innerResult;
    });

    expect(result?.id).toBe(categoryA.id);
  });

  // (f) a worker job for A then B
  it("(f) runs consecutive worker jobs for tenant A then tenant B without state leakage", async () => {
    async function simulateWorkerJob(schoolId: string, expectedCategoryId: string) {
      return runWithTenantDatabaseTransaction(schoolId, async (tx) => {
        const rows = await tx.feeCategory.findMany({
          where: { id: { in: [categoryA.id, categoryB.id] } }
        });
        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe(expectedCategoryId);
        return rows[0];
      });
    }

    const jobA = await simulateWorkerJob(schoolA.id, categoryA.id);
    expect(jobA.id).toBe(categoryA.id);
    expect(jobA.schoolId).toBe(schoolA.id);

    const jobB = await simulateWorkerJob(schoolB.id, categoryB.id);
    expect(jobB.id).toBe(categoryB.id);
    expect(jobB.schoolId).toBe(schoolB.id);
  });
});
