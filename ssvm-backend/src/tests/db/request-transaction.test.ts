import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getTrustedPrisma,
  runWithTenantDatabaseTransaction,
  runWithTrustedDatabaseTransaction,
} from "../../lib/prisma";
import { rlsTestPrisma as prisma } from "./setup";

const suffix = randomUUID().replaceAll("-", "");
const schoolA = { id: `request-a-${suffix}`, name: `Request A ${suffix}`, code: `REQA${suffix}` };
const schoolB = { id: `request-b-${suffix}`, name: `Request B ${suffix}`, code: `REQB${suffix}` };
const categoryA = { id: `request-category-a-${suffix}`, schoolId: schoolA.id, name: `Request A ${suffix}` };
const categoryB = { id: `request-category-b-${suffix}`, schoolId: schoolB.id, name: `Request B ${suffix}` };

describe("request-bound tenant database transactions", () => {
  beforeAll(async () => {
    await prisma.school.createMany({ data: [schoolA, schoolB] });
    await runWithTenantDatabaseTransaction(schoolA.id, async () => {
      await prisma.feeCategory.create({ data: categoryA });
    });
    await runWithTenantDatabaseTransaction(schoolB.id, async () => {
      await prisma.feeCategory.create({ data: categoryB });
    });
  });

  afterAll(async () => {
    await runWithTrustedDatabaseTransaction({
      purpose: "worker",
      route: "request-transaction.test cleanup",
    }, async () => {
      await prisma.feeCategory.deleteMany({ where: { id: { in: [categoryA.id, categoryB.id] } } });
      await prisma.school.deleteMany({ where: { id: { in: [schoolA.id, schoolB.id] } } });
    });
  });

  it("sets the transaction-local tenant before application queries and keeps it through nested transaction calls", async () => {
    await runWithTenantDatabaseTransaction(schoolA.id, async () => {
      const setting = await prisma.$queryRaw<Array<{ tenantId: string }>>`
        SELECT current_setting('app.current_school_id', true) AS "tenantId"
      `;
      expect(setting[0]?.tenantId).toBe(schoolA.id);

      await prisma.$transaction(async () => {
        const nestedSetting = await prisma.$queryRaw<Array<{ tenantId: string }>>`
          SELECT current_setting('app.current_school_id', true) AS "tenantId"
        `;
        expect(nestedSetting[0]?.tenantId).toBe(schoolA.id);
      });
    });
  });

  it("returns only the authenticated tenant rows and fails closed without a setting", async () => {
    const tenantRows = await runWithTenantDatabaseTransaction(schoolA.id, () =>
      prisma.feeCategory.findMany({
        where: { id: { in: [categoryA.id, categoryB.id] } },
        select: { id: true, schoolId: true },
        orderBy: { id: "asc" },
      }),
    );
    expect(tenantRows).toEqual([{ id: categoryA.id, schoolId: schoolA.id }]);

    const unscopedRows = await prisma.$transaction((transaction) =>
      transaction.feeCategory.findMany({
        where: { id: { in: [categoryA.id, categoryB.id] } },
        select: { id: true, schoolId: true },
      }),
    );
    expect(unscopedRows).toEqual([]);
  });

  it("uses a separate non-superuser BYPASSRLS trusted role and audits super-admin access", async () => {
    const trustedPrisma = getTrustedPrisma();
    const [trustedRole] = await trustedPrisma.$queryRaw<Array<{
      roleName: string;
      isSuperuser: boolean;
      bypassRls: boolean;
    }>>`
      SELECT current_user AS "roleName",
             rolsuper AS "isSuperuser",
             rolbypassrls AS "bypassRls"
      FROM pg_roles
      WHERE rolname = current_user
    `;
    const [appRole] = await prisma.$queryRaw<Array<{ roleName: string }>>`
      SELECT current_user AS "roleName"
    `;
    expect(trustedRole?.roleName).toBeTruthy();
    expect(trustedRole?.roleName).not.toBe(appRole?.roleName);
    expect(trustedRole?.isSuperuser).toBe(false);
    expect(trustedRole?.bypassRls).toBe(true);

    const admin = await runWithTrustedDatabaseTransaction({
      purpose: "worker",
      route: "request-transaction.test actor setup",
    }, () => prisma.user.create({
      data: {
        email: `request-admin-${suffix}@test.invalid`,
        name: "Request transaction test admin",
        passwordHash: "test-only-hash",
        role: "SUPER_ADMIN",
      },
      select: { id: true },
    }));

    const visibleSchools = await runWithTrustedDatabaseTransaction({
      purpose: "super_admin",
      actorUserId: admin.id,
      reason: "Verify audited cross-tenant request transaction behavior in an isolated integration test.",
      route: "request-transaction.test super-admin visibility",
    }, () => prisma.school.count({ where: { id: { in: [schoolA.id, schoolB.id] } } }));
    expect(visibleSchools).toBe(2);

    await runWithTrustedDatabaseTransaction({
      purpose: "worker",
      route: "request-transaction.test actor cleanup",
    }, () => prisma.user.delete({ where: { id: admin.id } }));
  });
});
