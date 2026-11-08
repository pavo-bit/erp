/**
 * ssvm-backend/src/tests/api/library-management.test.ts
 * Enterprise Library Management System & Permanent Student Borrowing History Test Suite
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, getTestPrisma } from "../helpers/testApp";
import { hashPassword, signToken } from "../../middleware/auth";
import { ModuleRegistryService } from "../../services/module-registry.service";

const app = createTestApp();
const prisma = getTestPrisma();

describe("Library Management, Physical Copy Circulation & Permanent Student History", () => {
  const uid = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  let schoolAId: string;
  let schoolBId: string;

  let schoolAAdminToken: string;
  let schoolBAdminToken: string;
  let studentAToken: string;
  let studentAId: string;
  let studentBId: string;

  let bookTitleId: string;
  let copyId1: string;
  let copyId2: string;
  let copyId3: string;
  let activeIssueId: string;

  beforeAll(async () => {
    // 1. Create School A & School B
    const schoolA = await prisma.school.create({
      data: {
        name: `Library School A ${uid}`,
        code: `LSA-${uid}`.substring(0, 10).toUpperCase(),
        status: "ACTIVE",
        isActive: true,
      },
    });
    schoolAId = schoolA.id;

    const schoolB = await prisma.school.create({
      data: {
        name: `Library School B ${uid}`,
        code: `LSB-${uid}`.substring(0, 10).toUpperCase(),
        status: "ACTIVE",
        isActive: true,
      },
    });
    schoolBId = schoolB.id;

    // 2. Enable LIBRARY on School A, but DISABLE on School B
    await ModuleRegistryService.setSchoolEntitlement(schoolAId, "LIBRARY", true, "SUPER_ADMIN");
    await ModuleRegistryService.setSchoolEntitlement(schoolBId, "LIBRARY", false, "SUPER_ADMIN");

    // 3. Create Admin Users
    const pwd = await hashPassword("Password@123");

    const adminUserA = await prisma.user.create({
      data: {
        email: `adminA_${uid}@ssvm.org`,
        name: "Librarian Admin A",
        passwordHash: pwd,
        role: Role.ERP_ADMIN,
        schoolId: schoolAId,
        isActive: true,
      },
    });
    schoolAAdminToken = signToken({
      userId: adminUserA.id,
      email: adminUserA.email,
      name: adminUserA.name,
      role: adminUserA.role,
      schoolId: schoolAId,
    });

    const adminUserB = await prisma.user.create({
      data: {
        email: `adminB_${uid}@ssvm.org`,
        name: "Librarian Admin B",
        passwordHash: pwd,
        role: Role.ERP_ADMIN,
        schoolId: schoolBId,
        isActive: true,
      },
    });
    schoolBAdminToken = signToken({
      userId: adminUserB.id,
      email: adminUserB.email,
      name: adminUserB.name,
      role: adminUserB.role,
      schoolId: schoolBId,
    });

    // 4. Create Students in School A
    const studentUserA = await prisma.user.create({
      data: {
        email: `studentA_${uid}@ssvm.org`,
        name: "Arjun Sharma",
        passwordHash: pwd,
        role: Role.STUDENT,
        schoolId: schoolAId,
        isActive: true,
      },
    });
    studentAToken = signToken({
      userId: studentUserA.id,
      email: studentUserA.email,
      name: studentUserA.name,
      role: studentUserA.role,
      schoolId: schoolAId,
    });

    const studentRecordA = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        userId: studentUserA.id,
        name: "Arjun Sharma",
        rollNo: `R-101-${uid}`,
        admissionNo: `ADM-101-${uid}`,
        isActive: true,
      },
    });
    studentAId = studentRecordA.id;

    const studentRecordB = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        name: "Priya Patel",
        rollNo: `R-102-${uid}`,
        admissionNo: `ADM-102-${uid}`,
        isActive: true,
      },
    });
    studentBId = studentRecordB.id;
  });

  // ═════════════════════════════════════════════════════════════
  // 1. CATALOGUE & PHYSICAL COPY TESTS
  // ═════════════════════════════════════════════════════════════

  it("1. registers a new book title and automatically generates physical copies with unique accession numbers", async () => {
    const res = await request(app)
      .post("/api/v1/library/books")
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        title: `Concepts of Physics Vol 1 ${uid}`,
        author: "Dr. H. C. Verma",
        isbn: `978-81-${uid.slice(0, 5)}`,
        publisher: "Bharati Bhawan",
        category: "Physics",
        subject: "Science",
        language: "English",
        initialCopies: 3,
        shelfLocation: "Shelf-P1",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toContain("Concepts of Physics");
    expect(res.body.data.totalCopies).toBe(3);
    expect(res.body.data.available).toBe(3);

    bookTitleId = res.body.data.id;

    // Verify physical copies were generated in database
    const copies = await prisma.bookCopy.findMany({
      where: { bookId: bookTitleId, schoolId: schoolAId },
      orderBy: { copyNumber: "asc" },
    });

    expect(copies.length).toBe(3);
    expect(copies[0].status).toBe("AVAILABLE");
    expect(copies[0].condition).toBe("GOOD");
    expect(copies[0].accessionNumber).toMatch(/^ACC-/);

    copyId1 = copies[0].id;
    copyId2 = copies[1].id;
    copyId3 = copies[2].id;
  });

  it("2. allows adding an individual physical copy to an existing book title", async () => {
    const res = await request(app)
      .post("/api/v1/library/copies")
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        bookId: bookTitleId,
        shelfLocation: "Shelf-P2",
        condition: "NEW",
        price: 450,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.copyNumber).toBe(4);

    // Verify book total count updated
    const book = await prisma.book.findUnique({ where: { id: bookTitleId } });
    expect(book?.totalCopies).toBe(4);
    expect(book?.available).toBe(4);
  });

  // ═════════════════════════════════════════════════════════════
  // 2. BORROWING POLICIES & SNAPSHOT TESTS
  // ═════════════════════════════════════════════════════════════

  it("3. configures a custom borrowing policy for primary wing", async () => {
    const res = await request(app)
      .post("/api/v1/library/policies")
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        name: "Standard 7-Day Student Policy",
        targetGroup: "STUDENT",
        maxActiveBooks: 2,
        maxDurationDays: 7,
        durationUnit: "CALENDAR_DAYS",
        renewalAllowance: true,
        maxRenewalCount: 1,
        renewalDurationDays: 5,
        dailyFineRate: 10,
        gracePeriodDays: 1,
        blockOverdueBorrowing: true,
        blockFineBorrowing: true,
        isDefault: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.maxDurationDays).toBe(7);
  });

  // ═════════════════════════════════════════════════════════════
  // 3. BOOK ISSUANCE WORKFLOW & ACTIVE CARDS
  // ═════════════════════════════════════════════════════════════

  it("4. issues physical copy 1 to Student A and snapshots the applicable borrowing policy", async () => {
    const res = await request(app)
      .post("/api/v1/library/issues")
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        bookId: bookTitleId,
        copyId: copyId1,
        userId: studentAId,
        userType: "STUDENT",
        notes: "Classroom reference lending",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ISSUED");
    expect(res.body.data.copyId).toBe(copyId1);
    expect(res.body.data.policySnapshot).toBeDefined();
    expect(res.body.data.policySnapshot.maxDurationDays).toBe(7);
    expect(res.body.data.policySnapshot.dailyFineRate).toBe(10);

    activeIssueId = res.body.data.id;

    // Verify copy status is now ISSUED
    const copy = await prisma.bookCopy.findUnique({ where: { id: copyId1 } });
    expect(copy?.status).toBe("ISSUED");

    // Verify book available copies decremented
    const book = await prisma.book.findUnique({ where: { id: bookTitleId } });
    expect(book?.available).toBe(3);
  });

  it("5. prevents duplicate issuance of an already-issued physical copy", async () => {
    const res = await request(app)
      .post("/api/v1/library/issues")
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        bookId: bookTitleId,
        copyId: copyId1, // already issued to Student A!
        userId: studentBId,
        userType: "STUDENT",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("not available");
  });

  it("6. lists active issue cards with student information and countdown", async () => {
    const res = await request(app)
      .get("/api/v1/library/active-cards")
      .set("Authorization", `Bearer ${schoolAAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const card = res.body.data.find((c: any) => c.id === activeIssueId);
    expect(card).toBeDefined();
    expect(card.studentName).toBe("Arjun Sharma");
    expect(card.status).toBe("ISSUED");
  });

  // ═════════════════════════════════════════════════════════════
  // 4. RENEWALS & AUDIT LOGS
  // ═════════════════════════════════════════════════════════════

  it("7. renews an active issue card and logs the renewal event", async () => {
    const res = await request(app)
      .post(`/api/v1/library/issues/${activeIssueId}/renew`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({ reason: "Exam revision extension" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.issue.renewalCount).toBe(1);
    expect(res.body.data.renewal.renewalNumber).toBe(1);

    // Try a second renewal (policy allows max 1 renewal)
    const secondRenew = await request(app)
      .post(`/api/v1/library/issues/${activeIssueId}/renew`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({ reason: "Another extension" });

    expect(secondRenew.status).toBe(400);
    expect(secondRenew.body.error).toContain("limit");
  });

  // ═════════════════════════════════════════════════════════════
  // 5. BOOK RETURN, OVERDUE FINES & CONDITION INSPECTION
  // ═════════════════════════════════════════════════════════════

  it("8. successfully returns copy 1 in GOOD condition and makes copy AVAILABLE again", async () => {
    const res = await request(app)
      .post(`/api/v1/library/issues/${activeIssueId}/return`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        condition: "GOOD",
        returnNotes: "Returned in perfect condition",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("RETURNED");
    expect(res.body.data.conditionOnReturn).toBe("GOOD");

    // Copy is back to AVAILABLE
    const copy = await prisma.bookCopy.findUnique({ where: { id: copyId1 } });
    expect(copy?.status).toBe("AVAILABLE");

    // Book available count restored
    const book = await prisma.book.findUnique({ where: { id: bookTitleId } });
    expect(book?.available).toBe(4);
  });

  it("9. simulates late return with damaged condition and generates fine invoice", async () => {
    // 1. Issue copy 2
    const issueRes = await request(app)
      .post("/api/v1/library/issues")
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        bookId: bookTitleId,
        copyId: copyId2,
        userId: studentAId,
        userType: "STUDENT",
      });

    const lateIssueId = issueRes.body.data.id;

    // Simulate due date was 5 days ago
    const pastDue = new Date();
    pastDue.setDate(pastDue.getDate() - 5);
    await prisma.bookIssue.update({
      where: { id: lateIssueId },
      data: { dueDate: pastDue },
    });

    // 2. Return copy 2 with MINOR_DAMAGE
    const returnRes = await request(app)
      .post(`/api/v1/library/issues/${lateIssueId}/return`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        condition: "MINOR_DAMAGE",
        damageNotes: "Back cover torn",
      });

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.success).toBe(true);
    expect(returnRes.body.data.status).toBe("RETURNED_DAMAGED");
    expect(returnRes.body.data.fineAmount).toBeGreaterThan(0);

    // Copy marked UNDER_REPAIR (does NOT become available)
    const copy2 = await prisma.bookCopy.findUnique({ where: { id: copyId2 } });
    expect(copy2?.status).toBe("UNDER_REPAIR");

    // Invoice was generated for student
    const invoice = await prisma.invoice.findFirst({
      where: { schoolId: schoolAId, studentId: studentAId, description: { contains: lateIssueId } },
    });
    expect(invoice).not.toBeNull();
    expect(Number(invoice?.amount)).toBe(returnRes.body.data.fineAmount);
  });

  // ═════════════════════════════════════════════════════════════
  // 6. PERMANENT STUDENT BORROWING HISTORY & STATS
  // ═════════════════════════════════════════════════════════════

  it("10. calculates permanent student library statistics with on-time return percentage", async () => {
    const res = await request(app)
      .get(`/api/v1/library/students/${studentAId}/profile`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const stats = res.body.data.stats;
    expect(stats.totalBorrowingTransactions).toBe(2); // 2 issues completed
    expect(stats.returnedOnTimeCount).toBe(1); // 1 on time
    expect(stats.returnedLateCount).toBe(1); // 1 late
    expect(stats.onTimeReturnPercentage).toBe(50.0); // 1/2 = 50.0%
    expect(stats.damagedReturnsCount).toBe(1); // 1 damaged
    expect(stats.totalFinesAssessed).toBeGreaterThan(0);

    // Verify all history records are permanently preserved
    expect(res.body.data.completeHistory.length).toBe(2);
  });

  it("11. allows Student Portal self-service access to active books and borrowing history", async () => {
    const res = await request(app)
      .get("/api/v1/library/my-books")
      .set("Authorization", `Bearer ${studentAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.stats.totalBorrowingTransactions).toBe(2);
  });

  // ═════════════════════════════════════════════════════════════
  // 7. MULTI-TENANT ISOLATION & ENTITLEMENTS
  // ═════════════════════════════════════════════════════════════

  it("12. rejects library access when school does not have LIBRARY module entitlement", async () => {
    const res = await request(app)
      .get("/api/v1/library/books")
      .set("Authorization", `Bearer ${schoolBAdminToken}`); // School B has LIBRARY disabled!

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("MODULE_DISABLED");
  });

  it("13. prevents cross-school borrowing and inspection", async () => {
    // School B admin tries to access School A's student profile
    const res = await request(app)
      .get(`/api/v1/library/students/${studentAId}/profile`)
      .set("Authorization", `Bearer ${schoolBAdminToken}`);

    expect(res.status).toBe(403); // blocked by module guard or tenant isolation
  });
});
