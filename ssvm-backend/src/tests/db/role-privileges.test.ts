import { describe, it, expect, beforeAll } from "vitest";
import { PrismaClient, Role } from "@prisma/client";
import { getTestPrisma } from "../helpers/testApp";
import { SchoolFactory, UserFactory } from "../helpers/factories";
import { getAuthPrisma } from "../../lib/authPrisma";
import prisma, { runWithTenantDatabaseTransaction } from "../../lib/prisma";

describe("A3: Role Privileges & Negative Security Enforcement", () => {
  const fixturePrisma = getTestPrisma();
  let authPrisma: PrismaClient;
  let schoolA: any;
  let schoolB: any;
  let userA: any;

  beforeAll(async () => {
    authPrisma = getAuthPrisma();

    // Create two schools using fixture prisma
    schoolA = await fixturePrisma.school.create({ data: SchoolFactory.build() });
    schoolB = await fixturePrisma.school.create({ data: SchoolFactory.build() });

    // Seed a user in School A using runWithTenantDatabaseTransaction
    userA = await runWithTenantDatabaseTransaction(schoolA.id, async (tx) => {
      return await tx.user.create({
        data: UserFactory.build({ schoolId: schoolA.id, role: "TEACHER" }),
      });
    });

    // Seed a student and invoice in School B
    await runWithTenantDatabaseTransaction(schoolB.id, async (tx) => {
      const studentB = await tx.student.create({
        data: {
          schoolId: schoolB.id,
          name: "Student B",
          rollNo: "B-101",
          admissionNo: `ADM-B-${Date.now()}`,
        },
      });

      await tx.invoice.create({
        data: {
          schoolId: schoolB.id,
          studentId: studentB.id,
          amount: 5000,
          status: "PENDING",
          dueDate: new Date(),
        },
      });
    });
  });

  describe("1. ssvm_auth Least-Privilege & Table Access Denial", () => {
    it("runs as dedicated ssvm_auth role (NOSUPERUSER, NOBYPASSRLS)", async () => {
      const rows = await authPrisma.$queryRawUnsafe<
        Array<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>
      >("SELECT current_user, r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user");

      expect(rows).toHaveLength(1);
      expect(rows[0].current_user).toBe("ssvm_auth");
      expect(rows[0].rolsuper).toBe(false);
      expect(rows[0].rolbypassrls).toBe(false);
    });

    it("DENIES ssvm_auth direct SELECT on invoices", async () => {
      await expect(
        authPrisma.$queryRawUnsafe("SELECT * FROM invoices LIMIT 1")
      ).rejects.toThrow(/permission denied/i);
    });

    it("DENIES ssvm_auth direct INSERT into users", async () => {
      await expect(
        authPrisma.$executeRawUnsafe(
          `INSERT INTO users (id, email, name, role, "schoolId") VALUES ('hacker_1', 'hacker@evil.com', 'Hacker', 'SUPER_ADMIN', '${schoolA.id}')`
        )
      ).rejects.toThrow(/permission denied/i);
    });

    it("DENIES ssvm_auth direct UPDATE on users.role", async () => {
      await expect(
        authPrisma.$executeRawUnsafe(`UPDATE users SET role = 'SUPER_ADMIN' WHERE id = '${userA.id}'`)
      ).rejects.toThrow(/permission denied/i);
    });

    it("ALLOWS ssvm_auth to call auth_find_user_by_email function", async () => {
      const rows = await authPrisma.$queryRawUnsafe<Array<{ auth_find_user_by_email: any }>>(
        `SELECT auth_find_user_by_email($1) AS auth_find_user_by_email`,
        userA.email
      );
      expect(rows[0]?.auth_find_user_by_email).toBeDefined();
      expect(rows[0]?.auth_find_user_by_email.id).toBe(userA.id);
      expect(rows[0]?.auth_find_user_by_email.email).toBe(userA.email);
    });
  });

  describe("2. ssvm_app Tenant Isolation & Role Escalation Guards", () => {
    it("runs as dedicated ssvm_app role (NOSUPERUSER, NOBYPASSRLS)", async () => {
      const rows = await prisma.$queryRawUnsafe<
        Array<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>
      >("SELECT current_user, r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user");

      expect(rows).toHaveLength(1);
      expect(rows[0].current_user).toBe("ssvm_app");
      expect(rows[0].rolsuper).toBe(false);
      expect(rows[0].rolbypassrls).toBe(false);
    });

    it("prevents ssvm_app from reading other tenants' rows (School A cannot see School B invoices)", async () => {
      const invoicesInA = await runWithTenantDatabaseTransaction(schoolA.id, async (tx) => {
        return await tx.invoice.findMany();
      });
      expect(invoicesInA).toHaveLength(0);

      const invoicesInB = await runWithTenantDatabaseTransaction(schoolB.id, async (tx) => {
        return await tx.invoice.findMany();
      });
      expect(invoicesInB.length).toBeGreaterThan(0);
    });

    it("prevents ssvm_app from creating SUPER_ADMIN users (trigger guard)", async () => {
      await expect(
        runWithTenantDatabaseTransaction(schoolA.id, async (tx) => {
          return await tx.user.create({
            data: UserFactory.build({
              schoolId: schoolA.id,
              role: Role.SUPER_ADMIN,
            }),
          });
        })
      ).rejects.toThrow(/permission denied: role SUPER_ADMIN cannot be created/i);
    });

    it("prevents ssvm_app from creating ERP_ADMIN users (trigger guard)", async () => {
      await expect(
        runWithTenantDatabaseTransaction(schoolA.id, async (tx) => {
          return await tx.user.create({
            data: UserFactory.build({
              schoolId: schoolA.id,
              role: Role.ERP_ADMIN,
            }),
          });
        })
      ).rejects.toThrow(/permission denied: role ERP_ADMIN cannot be created/i);
    });

    it("allows ssvm_app to create STUDENT users inside tenant context", async () => {
      const studentUser = await runWithTenantDatabaseTransaction(schoolA.id, async (tx) => {
        return await tx.user.create({
          data: UserFactory.build({
            schoolId: schoolA.id,
            role: Role.STUDENT,
          }),
        });
      });
      expect(studentUser.id).toBeDefined();
      expect(studentUser.role).toBe("STUDENT");
      expect(studentUser.schoolId).toBe(schoolA.id);
    });

    it("prevents ssvm_app from modifying users.role", async () => {
      await expect(
        runWithTenantDatabaseTransaction(schoolA.id, async (tx) => {
          return await tx.user.update({
            where: { id: userA.id },
            data: { role: Role.ACCOUNTANT },
          });
        })
      ).rejects.toThrow(/permission denied: cannot modify users\.role/i);
    });

    it("prevents ssvm_app from modifying users.schoolId", async () => {
      await expect(
        runWithTenantDatabaseTransaction(schoolA.id, async (tx) => {
          return await tx.user.update({
            where: { id: userA.id },
            data: { schoolId: schoolB.id },
          });
        })
      ).rejects.toThrow(/permission denied: cannot modify users\.schoolId|row-level security policy/i);
    });
  });

  describe("3. ssvm_trusted Zero USING (true) Policies Catalog Gate", () => {
    it("proves ssvm_trusted has zero USING (true) policies in pg_policy", async () => {
      const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
        SELECT count(*)::int AS count
        FROM pg_policy p
        JOIN pg_roles r ON p.polroles @> ARRAY[r.oid]
        WHERE r.rolname = 'ssvm_trusted'
          AND pg_get_expr(p.polqual, p.polrelid) = 'true'
      `);
      expect(Number(rows[0]?.count)).toBe(0);
    });

    it("proves ssvm_trusted has zero policies of any kind in pg_policy", async () => {
      const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
        SELECT count(*)::int AS count
        FROM pg_policy p
        JOIN pg_roles r ON p.polroles @> ARRAY[r.oid]
        WHERE r.rolname IN ('ssvm_trusted', 'ssvm_trusted_group')
      `);
      expect(Number(rows[0]?.count)).toBe(0);
    });
  });
});
