import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Student, User, Invoice, PaymentTransaction } from "@prisma/client";
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
    } catch (err: unknown) {
      expect((err as Error).message).toBe("Intentional rollback for test");
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

  // (g) runWithTenantDatabaseTransaction cross-school nesting rejection
  it("(g) allows same-school nesting and rejects different-school nesting inside active transaction", async () => {
    // 1. Same-school nesting allowed
    const sameSchoolResult = await runWithTenantDatabaseTransaction(schoolA.id, async (tx1) => {
      const parentCat = await tx1.feeCategory.findFirst({ where: { id: categoryA.id } });
      return await runWithTenantDatabaseTransaction(schoolA.id, async (tx2) => {
        const cat = await tx2.feeCategory.findFirst({ where: { id: categoryA.id } });
        expect(cat?.id).toBe(parentCat?.id);
        return cat?.id;
      });
    });
    expect(sameSchoolResult).toBe(categoryA.id);

    // 2. Different-school nesting throws
    await expect(
      runWithTenantDatabaseTransaction(schoolA.id, async () => {
        return await runWithTenantDatabaseTransaction(schoolB.id, async (txB) => {
          return await txB.feeCategory.findMany();
        });
      })
    ).rejects.toThrow(/Cannot switch tenant context inside active transaction/i);
  });

  // (h) Soft delete as ssvm_app for Student, User, Invoice, PaymentTransaction
  describe("(h) Soft delete operations inside and outside runWithTenantDatabaseTransaction", () => {
    let studentA: Student, studentB: Student;
    let userA: User, userB: User;
    let invoiceA: Invoice, invoiceB: Invoice;
    let paymentA: PaymentTransaction, paymentB: PaymentTransaction;

    async function seedEntities() {
      const ts = Date.now();
      userA = await fixturePrisma.user.create({
        data: { id: `u_sd_a_${ts}`, schoolId: schoolA.id, email: `u_a_${ts}@test.org`, name: "User A", role: "TEACHER", passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$somehash$somehash" }
      });
      userB = await fixturePrisma.user.create({
        data: { id: `u_sd_b_${ts}`, schoolId: schoolB.id, email: `u_b_${ts}@test.org`, name: "User B", role: "TEACHER", passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$somehash$somehash" }
      });
      studentA = await fixturePrisma.student.create({
        data: { id: `s_sd_a_${ts}`, schoolId: schoolA.id, name: "Student A", rollNo: `A-${ts}`, userId: userA.id }
      });
      studentB = await fixturePrisma.student.create({
        data: { id: `s_sd_b_${ts}`, schoolId: schoolB.id, name: "Student B", rollNo: `B-${ts}`, userId: userB.id }
      });
      invoiceA = await fixturePrisma.invoice.create({
        data: { id: `inv_sd_a_${ts}`, schoolId: schoolA.id, studentId: studentA.id, amount: 1000, dueDate: new Date() }
      });
      invoiceB = await fixturePrisma.invoice.create({
        data: { id: `inv_sd_b_${ts}`, schoolId: schoolB.id, studentId: studentB.id, amount: 2000, dueDate: new Date() }
      });
      paymentA = await fixturePrisma.paymentTransaction.create({
        data: { id: `pt_sd_a_${ts}`, schoolId: schoolA.id, invoiceId: invoiceA.id, amountPaid: 1000, transactionId: `tx_a_${ts}` }
      });
      paymentB = await fixturePrisma.paymentTransaction.create({
        data: { id: `pt_sd_b_${ts}`, schoolId: schoolB.id, invoiceId: invoiceB.id, amountPaid: 2000, transactionId: `tx_b_${ts}` }
      });
    }

    async function cleanupEntities() {
      if (paymentA?.id) await fixturePrisma.paymentTransaction.deleteMany({ where: { id: { in: [paymentA.id, paymentB.id] } } });
      if (invoiceA?.id) await fixturePrisma.invoice.deleteMany({ where: { id: { in: [invoiceA.id, invoiceB.id] } } });
      if (studentA?.id) await fixturePrisma.student.deleteMany({ where: { id: { in: [studentA.id, studentB.id] } } });
      if (userA?.id) await fixturePrisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    }

    it("soft-deletes Student, User, Invoice, PaymentTransaction OUTSIDE transaction (School A context)", async () => {
      await seedEntities();
      try {
        await runWithSchoolContext(schoolA.id, async () => {
          // 1. Cross-school deletion attempts must fail with P2025
          await expect(prisma.student.delete({ where: { id: studentB.id } })).rejects.toThrow();
          await expect(prisma.user.delete({ where: { id: userB.id } })).rejects.toThrow();
          await expect(prisma.invoice.delete({ where: { id: invoiceB.id } })).rejects.toThrow();
          await expect(prisma.paymentTransaction.delete({ where: { id: paymentB.id } })).rejects.toThrow();

          // 2. Own-school deletion attempts must succeed as soft-delete
          const delStudent = await prisma.student.delete({ where: { id: studentA.id } });
          expect(delStudent.deletedAt).toBeDefined();

          const delUser = await prisma.user.delete({ where: { id: userA.id } });
          expect(delUser.deletedAt).toBeDefined();

          const delInvoice = await prisma.invoice.delete({ where: { id: invoiceA.id } });
          expect(delInvoice.deletedAt).toBeDefined();

          const delPayment = await prisma.paymentTransaction.delete({ where: { id: paymentA.id } });
          expect(delPayment.deletedAt).toBeDefined();
        });

        // Verify state via fixturePrisma
        const checkBStudent = await fixturePrisma.student.findUnique({ where: { id: studentB.id } });
        expect(checkBStudent?.deletedAt).toBeNull();

        const checkAStudent = await fixturePrisma.student.findUnique({ where: { id: studentA.id } });
        expect(checkAStudent?.deletedAt).not.toBeNull();
      } finally {
        await cleanupEntities();
      }
    });

    it("soft-deletes Student, User, Invoice, PaymentTransaction INSIDE runWithTenantDatabaseTransaction", async () => {
      await seedEntities();
      try {
        await runWithTenantDatabaseTransaction(schoolA.id, async (tx) => {
          // 1. Cross-school deletion attempts must fail with P2025
          await expect(tx.student.delete({ where: { id: studentB.id } })).rejects.toThrow();
          await expect(tx.user.delete({ where: { id: userB.id } })).rejects.toThrow();
          await expect(tx.invoice.delete({ where: { id: invoiceB.id } })).rejects.toThrow();
          await expect(tx.paymentTransaction.delete({ where: { id: paymentB.id } })).rejects.toThrow();

          // 2. Own-school deletion attempts succeed inside transaction
          const delStudent = await tx.student.delete({ where: { id: studentA.id } });
          expect(delStudent.deletedAt).toBeDefined();

          const delUser = await tx.user.delete({ where: { id: userA.id } });
          expect(delUser.deletedAt).toBeDefined();

          const delInvoice = await tx.invoice.delete({ where: { id: invoiceA.id } });
          expect(delInvoice.deletedAt).toBeDefined();

          const delPayment = await tx.paymentTransaction.delete({ where: { id: paymentA.id } });
          expect(delPayment.deletedAt).toBeDefined();
        });

        // Verify state via fixturePrisma
        const checkBStudent = await fixturePrisma.student.findUnique({ where: { id: studentB.id } });
        expect(checkBStudent?.deletedAt).toBeNull();

        const checkAStudent = await fixturePrisma.student.findUnique({ where: { id: studentA.id } });
        expect(checkAStudent?.deletedAt).not.toBeNull();
      } finally {
        await cleanupEntities();
      }
    });
  });
});
