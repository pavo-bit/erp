import { describe, it, expect, beforeAll } from "vitest";
import { PrismaClient, Role, School, User } from "@prisma/client";
import { getTestPrisma } from "../helpers/testApp";
import { SchoolFactory, UserFactory } from "../helpers/factories";
import { getAuthPrisma } from "../../lib/authPrisma";
import prisma, { runWithTenantDatabaseTransaction, runWithTrustedDatabaseTransaction } from "../../lib/prisma";

describe("A3: Role Privileges & Negative Security Enforcement", () => {
  const fixturePrisma = getTestPrisma();
  let authPrisma: PrismaClient;
  let schoolA: School;
  let schoolB: School;
  let userA: User;

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
      const rows = await authPrisma.$queryRawUnsafe<Array<{ auth_find_user_by_email: Record<string, unknown> }>>(
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

  describe("4. PAYMENTS_WEBHOOK & SUPER_ADMIN_SEARCH Database-Level Negative Enforcement", () => {
    it("PAYMENTS_WEBHOOK: direct queries without tenant context return 0 rows (fail-closed)", async () => {
      const rows = await prisma.paymentTransaction.findMany();
      expect(rows).toHaveLength(0);

      const rawRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        "SELECT * FROM payment_transactions"
      );
      expect(rawRows).toHaveLength(0);
    });

    it("PAYMENTS_WEBHOOK: resolve_payment_school returns NULL for invalid orderId and correct schoolId for valid orderId", async () => {
      // 1. Invalid order id returns NULL
      const nullRows = await prisma.$queryRawUnsafe<Array<{ resolve_payment_school: string | null }>>(
        "SELECT resolve_payment_school('nonexistent_order_12345') AS resolve_payment_school"
      );
      expect(nullRows[0]?.resolve_payment_school).toBeNull();

      // 2. Valid transaction seeded in School A
      const std = await fixturePrisma.student.create({
        data: {
          id: `std_wh_${Date.now()}`,
          schoolId: schoolA.id,
          name: "Webhook Student",
          rollNo: `W-${Date.now()}`,
        }
      });
      const inv = await fixturePrisma.invoice.create({
        data: {
          id: `inv_wh_${Date.now()}`,
          schoolId: schoolA.id,
          studentId: std.id,
          amount: 2500,
          status: "PAID",
          dueDate: new Date(),
        }
      });
      const txRecord = await fixturePrisma.paymentTransaction.create({
        data: {
          id: `pt_${Date.now()}`,
          schoolId: schoolA.id,
          invoiceId: inv.id,
          amountPaid: 2500,
          gateway: "RAZORPAY",
          transactionId: `order_webhook_${Date.now()}`,
        }
      });

      const resolved = await prisma.$queryRawUnsafe<Array<{ resolve_payment_school: string | null }>>(
        "SELECT resolve_payment_school($1) AS resolve_payment_school",
        txRecord.transactionId
      );
      expect(resolved[0]?.resolve_payment_school).toBe(schoolA.id);

      // Clean up
      await fixturePrisma.paymentTransaction.delete({ where: { id: txRecord.id } });
      await fixturePrisma.invoice.delete({ where: { id: inv.id } });
      await fixturePrisma.student.delete({ where: { id: std.id } });
    });

    it("SUPER_ADMIN_SEARCH: trusted transaction without school context returns 0 rows on tenant tables", async () => {
      await runWithTrustedDatabaseTransaction({ purpose: "SUPER_ADMIN_SEARCH" }, async (tx) => {
        // Direct query on tenant tables returns 0 rows because app.current_school_id is unset
        const students = await tx.student.findMany();
        expect(students).toHaveLength(0);

        const invoices = await tx.invoice.findMany();
        expect(invoices).toHaveLength(0);
      });
    });

    it("SUPER_ADMIN_SEARCH: rejects unauthorized or unknown trusted purposes", async () => {
      await expect(
        runWithTrustedDatabaseTransaction({ purpose: "UNAUTHORIZED_HACKER_PURPOSE" }, async (tx) => {
          return await tx.student.findMany();
        })
      ).rejects.toThrow(/Unauthorized or unknown trusted purpose/i);
    });
  });

  describe("5. Student User Backfill SQL Password & Reset Invariant", () => {
    it("ensures student user records created via backfill have non-empty passwordHash and mustChangePassword=true", async () => {
      // Create student without userId in School A
      const rawStudent = await fixturePrisma.student.create({
        data: {
          id: `std_bf_${Date.now()}`,
          schoolId: schoolA.id,
          name: "Backfill Test Student",
          rollNo: `BF-${Date.now()}`,
          admissionNo: `ADM-BF-${Date.now()}`,
        }
      });

      // Execute backfill SQL block (same as migration)
      await fixturePrisma.$executeRawUnsafe(`
        DO $student_user_backfill$
        DECLARE
          st RECORD;
          v_user_id text;
          v_email text;
        BEGIN
          FOR st IN SELECT id, "schoolId", name, "admissionNo" FROM students WHERE id = '${rawStudent.id}' AND "userId" IS NULL LOOP
            v_user_id := 'usr_' || substr(md5(st.id || clock_timestamp()::text), 1, 20);
            v_email := lower(regexp_replace(COALESCE(st."admissionNo", 'std_' || st.id), '[^a-zA-Z0-9]', '', 'g')) 
                       || '_' || right(st."schoolId", 6) || '@student.school';
            
            IF EXISTS (SELECT 1 FROM users WHERE email = v_email) THEN
              v_email := lower(regexp_replace(COALESCE(st."admissionNo", 'std_' || st.id), '[^a-zA-Z0-9]', '', 'g')) 
                         || '_' || substr(md5(st.id), 1, 6) || '@student.school';
            END IF;

            INSERT INTO users (id, "schoolId", email, name, role, "passwordHash", "mustChangePassword", "isActive", "createdAt", "updatedAt")
            VALUES (
              v_user_id,
              st."schoolId",
              v_email,
              COALESCE(st.name, 'Student'),
              'STUDENT',
              '$argon2id$v=19$m=65536,t=3,p=4$RESET_REQUIRED$RESET_REQUIRED',
              true,
              true,
              NOW(),
              NOW()
            );

            UPDATE students SET "userId" = v_user_id WHERE id = st.id;
          END LOOP;
        END;
        $student_user_backfill$;
      `);

      // Verify via fixturePrisma
      const updatedStudent = await fixturePrisma.student.findUnique({
        where: { id: rawStudent.id },
        include: { user: true }
      });

      expect(updatedStudent?.userId).toBeDefined();
      expect(updatedStudent?.user?.passwordHash).toBeDefined();
      expect(updatedStudent?.user?.passwordHash).toMatch(/^\$argon2id\$/);
      expect(updatedStudent?.user?.passwordHash.length).toBeGreaterThan(20);
      expect(updatedStudent?.user?.mustChangePassword).toBe(true);

      // Clean up
      if (updatedStudent?.userId) {
        await fixturePrisma.student.delete({ where: { id: rawStudent.id } });
        await fixturePrisma.user.delete({ where: { id: updatedStudent.userId } });
      }
    });
  });
});
