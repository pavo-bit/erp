import { randomUUID } from "node:crypto";
import crypto from "node:crypto";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma, { runWithTenantDatabaseTransaction, runWithTrustedDatabaseTransaction } from "../../lib/prisma";
import { generateAccessToken } from "../../lib/tokens";
import { authenticate, AuthRequest } from "../../middleware/auth";
import { getCurrentSchoolId } from "../../middleware/school-context.middleware";

const keyPair = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_PRIVATE_KEY = keyPair.privateKey;
process.env.ACCESS_TOKEN_PUBLIC_KEY = keyPair.publicKey;
process.env.REFRESH_TOKEN_PRIVATE_KEY = keyPair.privateKey;
process.env.REFRESH_TOKEN_PUBLIC_KEY = keyPair.publicKey;
process.env.FIELD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.FRONTEND_URL = "http://localhost:3000";

const suffix = randomUUID().replaceAll("-", "");
const schoolA = { id: `api-a-${suffix}`, name: `API A ${suffix}`, code: `APIA${suffix}` };
const schoolB = { id: `api-b-${suffix}`, name: `API B ${suffix}`, code: `APIB${suffix}` };
const userA = {
  id: `api-user-a-${suffix}`,
  email: `api-a-${suffix}@test.invalid`,
  name: "Authenticated Tenant A",
  role: "ERP_ADMIN" as const,
  schoolId: schoolA.id,
};
const userWithoutSchool = {
  id: `api-user-none-${suffix}`,
  email: `api-none-${suffix}@test.invalid`,
  name: "Unassigned Authenticated User",
  role: "ERP_ADMIN" as const,
  schoolId: null,
};
const categoryA = { id: `api-category-a-${suffix}`, schoolId: schoolA.id, name: `Category A ${suffix}` };
const categoryB = { id: `api-category-b-${suffix}`, schoolId: schoolB.id, name: `Category B ${suffix}` };
const transactionTag = `c-auth-api-${suffix}`;

let tenantToken = "";
let missingSchoolToken = "";
let routeInvocations = 0;

const app = express();
app.get("/tenant-categories", authenticate, async (req: AuthRequest, res) => {
  routeInvocations += 1;
  const tag = req.get("x-test-transaction-tag");
  const [transactionContext] = await prisma.$queryRaw<Array<{ applicationName: string; schoolId: string }>>`
    SELECT set_config('application_name', ${tag || "c-auth-api-unmarked"}, true) AS "applicationName",
           current_setting('app.current_school_id', true) AS "schoolId"
  `;
  const categories = await prisma.feeCategory.findMany({
    where: { id: { in: [categoryA.id, categoryB.id] } },
    select: { id: true, schoolId: true },
    orderBy: { id: "asc" },
  });
  res.json({
    userId: req.user?.id,
    schoolId: getCurrentSchoolId(),
    transactionSchoolId: transactionContext?.schoolId,
    categories,
  });
});

describe("authenticated tenant API isolation (real PostgreSQL required)", () => {
  beforeAll(async () => {
    const [appRole] = await prisma.$queryRaw<Array<{
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
    if (!appRole) throw new Error("Could not resolve the authenticated API app role.");
    expect(appRole.roleName).toBeTruthy();
    expect(appRole.isSuperuser).toBe(false);
    expect(appRole.bypassRls).toBe(false);

    await runWithTrustedDatabaseTransaction({
      purpose: "worker",
      route: "authenticated-tenant-api.test setup",
    }, async () => {
      await prisma.school.createMany({ data: [schoolA, schoolB] });
      await prisma.user.createMany({
        data: [
          { ...userA, passwordHash: "test-only-hash" },
          { ...userWithoutSchool, passwordHash: "test-only-hash" },
        ],
      });
    });
    await runWithTenantDatabaseTransaction(schoolA.id, () => prisma.feeCategory.create({ data: categoryA }));
    await runWithTenantDatabaseTransaction(schoolB.id, () => prisma.feeCategory.create({ data: categoryB }));

    tenantToken = generateAccessToken({
      userId: userA.id,
      email: userA.email,
      role: userA.role,
      name: userA.name,
      schoolId: schoolA.id,
      sid: `api-session-a-${suffix}`,
    }).token;
    missingSchoolToken = generateAccessToken({
      userId: userWithoutSchool.id,
      email: userWithoutSchool.email,
      role: userWithoutSchool.role,
      name: userWithoutSchool.name,
      sid: `api-session-none-${suffix}`,
    }).token;
  });

  afterAll(async () => {
    await runWithTrustedDatabaseTransaction({
      purpose: "worker",
      route: "authenticated-tenant-api.test cleanup",
    }, async () => {
      await prisma.feeCategory.deleteMany({ where: { id: { in: [categoryA.id, categoryB.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [userA.id, userWithoutSchool.id] } } });
      await prisma.school.deleteMany({ where: { id: { in: [schoolA.id, schoolB.id] } } });
    });
  });

  it("authenticates the user, sets tenant context, and exposes only that tenant's rows", async () => {
    const response = await request(app)
      .get("/tenant-categories")
      .set("Authorization", `Bearer ${tenantToken}`)
      .set("X-Test-Transaction-Tag", transactionTag)
      .expect(200);

    expect(response.body.userId).toBe(userA.id);
    expect(response.body.schoolId).toBe(schoolA.id);
    expect(response.body.transactionSchoolId).toBe(schoolA.id);
    expect(response.body.categories).toEqual([{ id: categoryA.id, schoolId: schoolA.id }]);

    await expect.poll(async () => {
      const [activeTransactions] = await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT count(*)::int AS "count"
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND application_name = ${transactionTag}
      `;
      return activeTransactions?.count ?? -1;
    }, { timeout: 5000, interval: 25 }).toBe(0);
  });

  it("rejects an authenticated identity without a school before calling the route", async () => {
    const previousInvocations = routeInvocations;
    await request(app)
      .get("/tenant-categories")
      .set("Authorization", `Bearer ${missingSchoolToken}`)
      .expect(403);

    expect(routeInvocations).toBe(previousInvocations);
  });
});
