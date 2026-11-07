import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { Role, Prisma } from "@prisma/client";
import { createTestApp, getTestPrisma, createTestUser, createTestSchool } from "../helpers/testApp";
import { seedDefaultChartOfAccounts } from "../../lib/chartOfAccounts";

const app = createTestApp();
const prisma = getTestPrisma();

describe("Master Execution Verification: Business Modules Completion (Phases 2, 3, 4, 5, 6)", () => {
  const uid = Math.random().toString(36).substring(2, 7);

  let schoolId: string;
  let adminToken: string;
  let superAdminToken: string;
  let teacherToken: string;
  let teacherId: string;
  let studentId: string;
  let testClassId: string;

  beforeAll(async () => {
    // 1. Setup School
    const school = await createTestSchool();
    schoolId = school.id;
    await seedDefaultChartOfAccounts(prisma, schoolId);

    // 2. Setup Users
    const admin = await createTestUser(Role.ERP_ADMIN, schoolId);
    adminToken = admin.token;

    const superAdmin = await createTestUser(Role.SUPER_ADMIN);
    superAdminToken = superAdmin.token;

    const teacher = await createTestUser(Role.TEACHER, schoolId);
    teacherToken = teacher.token;

    // Create Teacher domain record
    const teacherRecord = await prisma.teacher.create({
      data: {
        schoolId,
        userId: teacher.user.id,
        qualification: "M.Sc B.Ed",
        isActive: true,
      },
    });
    teacherId = teacherRecord.id;

    // 3. Setup Class & Student
    const academicSession = await prisma.academicSession.create({
      data: {
        schoolId,
        name: `Session-${uid}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        isCurrent: true,
      },
    });

    const cls = await prisma.class.create({
      data: {
        schoolId,
        sessionId: academicSession.id,
        name: `Class 10-${uid}`,
        sortOrder: 1,
        sections: { create: [{ name: "A" }] },
      },
      include: { sections: true },
    });
    testClassId = cls.id;
    const sectionId = cls.sections[0].id;

    const guardian = await prisma.guardian.create({
      data: {
        schoolId,
        primaryName: `Guardian ${uid}`,
        primaryPhone: `9876${Math.floor(100000 + Math.random() * 900000)}`,
        primaryRelation: "Father",
      },
    });

    const student = await prisma.student.create({
      data: {
        schoolId,
        name: `Student ${uid}`,
        admissionNo: `ADM-${uid}`,
        rollNo: `R-${uid}`,
        sectionId,
        guardianId: guardian.id,
        isActive: true,
      },
    });
    studentId = student.id;
  });

  // ═════════════════════════════════════════════════════════════════════════
  // PHASE 2: FINANCE COMPLETION
  // ═════════════════════════════════════════════════════════════════════════
  describe("Phase 2: Fee Structures & Financial Statements", () => {
    let createdCategoryId: string;
    let createdStructureId: string;

    it("creates and retrieves fee categories scoped to tenant", async () => {
      const res = await request(app)
        .post("/api/v1/finance/fee-categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: `Tuition Fee ${uid}`, description: "Standard tuition" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(`Tuition Fee ${uid}`);
      createdCategoryId = res.body.data.id;

      const listRes = await request(app)
        .get("/api/v1/finance/fee-categories")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((c: any) => c.id === createdCategoryId)).toBe(true);
    });

    it("creates, queries and deletes fee structures with monetary precision", async () => {
      const res = await request(app)
        .post("/api/v1/finance/fee-structures")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          categoryId: createdCategoryId,
          classId: testClassId,
          amount: 4500.50,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.amount)).toBe(4500.50);
      createdStructureId = res.body.data.id;

      const listRes = await request(app)
        .get(`/api/v1/finance/fee-structures?classId=${testClassId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      // Clean up deletion test
      const delRes = await request(app)
        .delete(`/api/v1/finance/fee-structures/${createdStructureId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });

    it("computes double-entry balance sheet verifying Assets === Liabilities + Equity", async () => {
      const res = await request(app)
        .get("/api/v1/finance/ledger/balance-sheet")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isBalanced).toBe(true);
      expect(res.body.data.assets).toBeDefined();
      expect(res.body.data.liabilities).toBeDefined();
      expect(res.body.data.equity).toBeDefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // PHASE 3: CONFIGURABLE ACADEMIC ASSESSMENT
  // ═════════════════════════════════════════════════════════════════════════
  describe("Phase 3: Configurable Assessment Profiles", () => {
    it("exposes multi-board assessment profiles and grading scales", async () => {
      const res = await request(app)
        .get("/api/v1/academic/assessment-profiles")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.some((p: any) => p.board === "CBSE")).toBe(true);
      expect(res.body.data.some((p: any) => p.board === "ICSE")).toBe(true);

      const scalesRes = await request(app)
        .get("/api/v1/academic/grading-scales")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(scalesRes.status).toBe(200);
      expect(scalesRes.body.data.CBSE).toBeDefined();
      expect(scalesRes.body.data.ICSE).toBeDefined();
      expect(scalesRes.body.data.STATE_BOARD).toBeDefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // PHASE 4: HR, PROCUREMENT, LIBRARY & TRANSPORT
  // ═════════════════════════════════════════════════════════════════════════
  describe("Phase 4: Operations, Payroll, Library & Transport", () => {
    let salaryId: string;
    let vehicleId: string;

    it("posts salary payout to General Ledger (Salaries Expense -> Bank)", async () => {
      // Create pending salary record
      const salary = await prisma.salary.create({
        data: {
          schoolId,
          teacherId,
          month: 10,
          year: 2026,
          basicPay: 40000,
          allowances: 5000,
          deductions: 2000,
          netPay: 43000,
          status: "PENDING",
        },
      });
      salaryId = salary.id;

      const payRes = await request(app)
        .put(`/api/v1/hr/salaries/${salaryId}/pay`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ paymentMode: "BANK" });

      expect(payRes.status).toBe(200);
      expect(payRes.body.success).toBe(true);
      expect(payRes.body.data.status).toBe("PAID");

      // Verify Ledger Transaction posted
      const ledgerTx = await prisma.ledgerTransaction.findFirst({
        where: { schoolId, referenceType: "SALARY", referenceId: salaryId },
        include: { LedgerEntry: { include: { LedgerAccount: true } } },
      });

      expect(ledgerTx).not.toBeNull();
      const debitEntry = ledgerTx?.LedgerEntry.find((e: any) => e.LedgerAccount?.code === "5010-SAL");
      const creditEntry = ledgerTx?.LedgerEntry.find((e: any) => e.LedgerAccount?.code === "1010-BANK");
      expect(Number(debitEntry?.debitAmount)).toBe(43000);
      expect(Number(creditEntry?.creditAmount)).toBe(43000);

      // Verify printable payslip
      const slipRes = await request(app)
        .get(`/api/v1/hr/salaries/${salaryId}/payslip`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(slipRes.status).toBe(200);
      expect(slipRes.text).toContain("Payslip");
      expect(slipRes.text).toContain("43,000");
    });

    it("creates transport vehicle and ingests real-time GPS telemetry", async () => {
      const regNo = `KA-01-EXP-${Math.floor(1000 + Math.random() * 9000)}`;
      const createRes = await request(app)
        .post("/api/v1/transport/vehicles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          registrationNumber: regNo,
          vehicleType: "BUS",
          capacity: 45,
        });

      expect(createRes.status).toBe(201);
      vehicleId = createRes.body.data.id;

      // Ingest telemetry
      const telRes = await request(app)
        .post(`/api/v1/transport/vehicles/${vehicleId}/telemetry`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          latitude: 12.9716,
          longitude: 77.5946,
          speed: 42.5,
          heading: 180,
        });

      expect(telRes.status).toBe(200);
      expect(telRes.body.success).toBe(true);

      // Query live location
      const locRes = await request(app)
        .get(`/api/v1/transport/vehicles/${vehicleId}/location`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(locRes.status).toBe(200);
      expect(locRes.body.data.latitude).toBe(12.9716);
      expect(locRes.body.data.longitude).toBe(77.5946);
    });

    it("accrues overdue library fines and posts to student fee invoices", async () => {
      // 1. Create a book
      const book = await prisma.book.create({
        data: {
          schoolId,
          title: `Physics Mechanics ${uid}`,
          author: "H.C. Verma",
          category: "Science",
          totalCopies: 5,
          available: 4,
        },
      });

      // 2. Create an overdue issue
      const overdueDate = new Date(Date.now() - 5 * 24 * 3600 * 1000); // 5 days ago
      const issue = await prisma.bookIssue.create({
        data: {
          schoolId,
          bookId: book.id,
          userId: studentId,
          userType: "STUDENT",
          dueDate: overdueDate,
          status: "ISSUED",
        },
      });

      // 3. Calculate fines
      const fineRes = await request(app)
        .post("/api/v1/library/fines/calculate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ dailyFineRate: 10 }); // ₹10/day * 5 days = ₹50

      expect(fineRes.status).toBe(200);
      expect(fineRes.body.success).toBe(true);

      // 4. Verify student fee invoice was created
      const invoice = await prisma.invoice.findFirst({
        where: {
          schoolId,
          studentId,
          description: `Library Fine for Book Issue ID: ${issue.id}`,
        },
      });

      expect(invoice).not.toBeNull();
      expect(Number(invoice?.amount)).toBeGreaterThanOrEqual(50);
      expect(invoice?.type).toBe("MISCELLANEOUS");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // PHASE 5: COMMUNICATIONS & NOTIFICATIONS
  // ═════════════════════════════════════════════════════════════════════════
  describe("Phase 5: Notification Templates & Outbox Sweep", () => {
    it("creates templates and triggers outbox sweep", async () => {
      const tplRes = await request(app)
        .post("/api/v1/communications/templates")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: `Fee Reminder ${uid}`,
          channel: "SMS",
          subject: "Fee Due",
          content: "Dear Parent, fees of Rs {{amount}} are due on {{dueDate}}.",
          isActive: true,
        });

      expect(tplRes.status).toBe(200);
      expect(tplRes.body.success).toBe(true);

      // Outbox sweep trigger
      const sweepRes = await request(app)
        .post("/api/v1/communications/outbox/sweep")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(sweepRes.status).toBe(200);
      expect(sweepRes.body.success).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // PHASE 6: SAAS & MULTI-TENANT ADMINISTRATION
  // ═════════════════════════════════════════════════════════════════════════
  describe("Phase 6: Multi-Step School Provisioning & Platform Metrics", () => {
    it("provisions a complete school tenant with default modules in an atomic pipeline", async () => {
      const newSchoolName = `Delhi Public Academy ${uid}`;
      const newSchoolEmail = `contact-${uid}@dpa.edu`;

      const provRes = await request(app)
        .post("/api/v1/saas/provision")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          schoolName: newSchoolName,
          schoolCode: `DPA-${uid.toUpperCase()}`,
          email: newSchoolEmail,
          phone: "9123456789",
          principalName: `Dr. Sharma ${uid}`,
          adminPassword: "SecurePassword123!",
        });

      expect(provRes.status).toBe(201);
      expect(provRes.body.success).toBe(true);
      const provisionedSchool = provRes.body.data.school;

      // Verify Chart of Accounts was seeded
      const coaCount = await prisma.ledgerAccount.count({
        where: { schoolId: provisionedSchool.id },
      });
      expect(coaCount).toBeGreaterThanOrEqual(14);

      // Verify default Academic Session exists
      const sessionCount = await prisma.academicSession.count({
        where: { schoolId: provisionedSchool.id },
      });
      expect(sessionCount).toBe(1);

      // Verify default Classes & Sections exist
      const classCount = await prisma.class.count({
        where: { schoolId: provisionedSchool.id },
      });
      expect(classCount).toBe(10); // Class 1 to 10

      // Verify default ERP Admin user was created
      const adminUser = await prisma.user.findFirst({
        where: { schoolId: provisionedSchool.id, role: "ERP_ADMIN" },
      });
      expect(adminUser).not.toBeNull();
      expect(adminUser?.email).toBe(newSchoolEmail);
    });

    it("returns platform overview analytics and real-time metrics for Super Admin", async () => {
      const metricsRes = await request(app)
        .get("/api/v1/saas/metrics")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(metricsRes.status).toBe(200);
      expect(metricsRes.body.success).toBe(true);
      expect(metricsRes.body.data.schools.total).toBeGreaterThanOrEqual(1);
      expect(metricsRes.body.data.users.activeStudents).toBeDefined();
      expect(metricsRes.body.data.financials.totalRevenueCollected).toBeDefined();
    });
  });
});
