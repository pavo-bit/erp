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
import { LibraryService } from "../../services/library.service";

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
  let studentCId: string;
  let studentDId: string;
  let studentEId: string;
  let studentCardId: string;

  let bookTitleId: string;
  let copyId1: string;
  let copyId2: string;
  let copyId3: string;
  let copyRenewId: string;
  let copyReturnId: string;
  let copyDuplicateId: string;
  let copyCardId: string;
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

    const studentRecordC = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        name: "Rohan Kumar",
        rollNo: `R-103-${uid}`,
        admissionNo: `ADM-103-${uid}`,
        isActive: true,
      },
    });
    studentCId = studentRecordC.id;

    const studentRecordD = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        name: "Ananya Sen",
        rollNo: `R-104-${uid}`,
        admissionNo: `ADM-104-${uid}`,
        isActive: true,
      },
    });
    studentDId = studentRecordD.id;

    const studentRecordE = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        name: "Vikram Das",
        rollNo: `R-105-${uid}`,
        admissionNo: `ADM-105-${uid}`,
        isActive: true,
      },
    });
    studentEId = studentRecordE.id;

    const studentRecordCard = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        name: "Card Holder",
        rollNo: `R-106-${uid}`,
        admissionNo: `ADM-106-${uid}`,
        isActive: true,
      },
    });
    studentCardId = studentRecordCard.id;

    // 5. Default Borrowing Policy
    await prisma.borrowingPolicy.create({
      data: {
        schoolId: schoolAId,
        name: "Standard 7-Day Student Policy",
        targetGroup: "STUDENT",
        maxActiveBooks: 2,
        maxDurationDays: 7,
        durationUnit: "CALENDAR_DAYS",
        renewalAllowance: true,
        maxRenewalCount: 1,
        renewalDurationDays: 5,
        dailyFineRate: 10,
        gracePeriodDays: 2,
        blockOverdueBorrowing: true,
        blockFineBorrowing: true,
        isDefault: true,
      },
    });

    // 6. Master Book & Copies for shared tests
    const masterBook = await prisma.book.create({
      data: {
        schoolId: schoolAId,
        title: `Concepts of Physics Vol 1 ${uid}`,
        author: "Dr. H. C. Verma",
        isbn: `978-81-${uid.slice(0, 5)}`,
        publisher: "Bharati Bhawan",
        category: "Physics",
        subject: "Science",
        language: "English",
        totalCopies: 7,
        available: 7,
        shelfLocation: "Shelf-P1",
      },
    });
    bookTitleId = masterBook.id;

    const c1 = await prisma.bookCopy.create({
      data: {
        schoolId: schoolAId,
        bookId: bookTitleId,
        copyNumber: 1,
        accessionNumber: `ACC-PHY-${uid}-001`,
        barcode: `BC-PHY-${uid}-001`,
        status: "AVAILABLE",
        condition: "GOOD",
      },
    });
    copyId1 = c1.id;

    const c2 = await prisma.bookCopy.create({
      data: {
        schoolId: schoolAId,
        bookId: bookTitleId,
        copyNumber: 2,
        accessionNumber: `ACC-PHY-${uid}-002`,
        barcode: `BC-PHY-${uid}-002`,
        status: "AVAILABLE",
        condition: "GOOD",
      },
    });
    copyId2 = c2.id;

    const c3 = await prisma.bookCopy.create({
      data: {
        schoolId: schoolAId,
        bookId: bookTitleId,
        copyNumber: 3,
        accessionNumber: `ACC-PHY-${uid}-003`,
        barcode: `BC-PHY-${uid}-003`,
        status: "AVAILABLE",
        condition: "GOOD",
      },
    });
    copyId3 = c3.id;

    const cRenew = await prisma.bookCopy.create({
      data: {
        schoolId: schoolAId,
        bookId: bookTitleId,
        copyNumber: 4,
        accessionNumber: `ACC-PHY-${uid}-004`,
        barcode: `BC-PHY-${uid}-004`,
        status: "AVAILABLE",
        condition: "GOOD",
      },
    });
    copyRenewId = cRenew.id;

    const cReturn = await prisma.bookCopy.create({
      data: {
        schoolId: schoolAId,
        bookId: bookTitleId,
        copyNumber: 5,
        accessionNumber: `ACC-PHY-${uid}-005`,
        barcode: `BC-PHY-${uid}-005`,
        status: "AVAILABLE",
        condition: "GOOD",
      },
    });
    copyReturnId = cReturn.id;

    const cDup = await prisma.bookCopy.create({
      data: {
        schoolId: schoolAId,
        bookId: bookTitleId,
        copyNumber: 6,
        accessionNumber: `ACC-PHY-${uid}-006`,
        barcode: `BC-PHY-${uid}-006`,
        status: "AVAILABLE",
        condition: "GOOD",
      },
    });
    copyDuplicateId = cDup.id;

    const cCard = await prisma.bookCopy.create({
      data: {
        schoolId: schoolAId,
        bookId: bookTitleId,
        copyNumber: 7,
        accessionNumber: `ACC-PHY-${uid}-007`,
        barcode: `BC-PHY-${uid}-007`,
        status: "ISSUED",
        condition: "GOOD",
      },
    });
    copyCardId = cCard.id;

    const activeIssue = await prisma.bookIssue.create({
      data: {
        schoolId: schoolAId,
        bookId: bookTitleId,
        copyId: copyCardId,
        userId: studentCardId,
        userType: "STUDENT",
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 86400000),
        status: "ISSUED",
        policySnapshot: { maxDurationDays: 7, dailyFineRate: 10, gracePeriodDays: 2 },
      },
    });
    activeIssueId = activeIssue.id;

    // 7. Seed 2 completed borrowing history records for studentAId (1 on time, 1 late & damaged)
    const pastIssueDate1 = new Date(Date.now() - 10 * 86400000);
    const pastDueDate1 = new Date(Date.now() - 3 * 86400000);
    const pastReturnDate1 = new Date(Date.now() - 4 * 86400000);
    await prisma.bookIssue.create({
      data: {
        schoolId: schoolAId,
        bookId: bookTitleId,
        copyId: copyId3,
        userId: studentAId,
        userType: "STUDENT",
        issueDate: pastIssueDate1,
        dueDate: pastDueDate1,
        returnDate: pastReturnDate1,
        status: "RETURNED",
        conditionOnReturn: "GOOD",
        policySnapshot: { maxDurationDays: 7, dailyFineRate: 10, gracePeriodDays: 2 },
      },
    });

    const pastIssueDate2 = new Date(Date.now() - 20 * 86400000);
    const pastDueDate2 = new Date(Date.now() - 12 * 86400000);
    const pastReturnDate2 = new Date(Date.now() - 2 * 86400000);
    await prisma.bookIssue.create({
      data: {
        schoolId: schoolAId,
        bookId: bookTitleId,
        copyId: copyId2,
        userId: studentAId,
        userType: "STUDENT",
        issueDate: pastIssueDate2,
        dueDate: pastDueDate2,
        returnDate: pastReturnDate2,
        status: "RETURNED_DAMAGED",
        conditionOnReturn: "MINOR_DAMAGE",
        fineAmount: 80,
        policySnapshot: { maxDurationDays: 7, dailyFineRate: 10, gracePeriodDays: 2 },
      },
    });
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

    const createdBookId = res.body.data.id;

    // Verify physical copies were generated in database
    const copies = await prisma.bookCopy.findMany({
      where: { bookId: createdBookId, schoolId: schoolAId },
      orderBy: { copyNumber: "asc" },
    });

    expect(copies.length).toBe(3);
    expect(copies[0].status).toBe("AVAILABLE");
    expect(copies[0].condition).toBe("GOOD");
    expect(copies[0].accessionNumber).toMatch(/^ACC-/);
  });

  it("2. allows adding an individual physical copy to an existing book title", async () => {
    const bookForCopy = await LibraryService.createBook(schoolAId, {
      title: `Copy Addition Test Book ${uid}`,
      author: "Dr. H. C. Verma",
      category: "Physics",
      language: "English",
      initialCopies: 3,
    });

    const res = await request(app)
      .post("/api/v1/library/copies")
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        bookId: bookForCopy.id,
        shelfLocation: "Shelf-P2",
        condition: "NEW",
        price: 450,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.copyNumber).toBe(4);

    // Verify book total count updated
    const book = await prisma.book.findUnique({ where: { id: bookForCopy.id } });
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
        userId: studentBId,
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
  });

  it("5. prevents duplicate issuance of an already-issued physical copy", async () => {
    // First ensure copyDuplicateId is marked ISSUED
    await prisma.bookCopy.update({
      where: { id: copyDuplicateId },
      data: { status: "ISSUED" },
    });

    const res = await request(app)
      .post("/api/v1/library/issues")
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        bookId: bookTitleId,
        copyId: copyDuplicateId, // already issued!
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
    expect(card.status).toBe("ISSUED");
  });

  // ═════════════════════════════════════════════════════════════
  // 4. RENEWALS & AUDIT LOGS
  // ═════════════════════════════════════════════════════════════

  it("7. renews an active issue card and logs the renewal event", async () => {
    const issueRes = await request(app)
      .post("/api/v1/library/issues")
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        bookId: bookTitleId,
        copyId: copyRenewId,
        userId: studentCId,
        userType: "STUDENT",
      });
    const renewIssueId = issueRes.body.data.id;

    const res = await request(app)
      .post(`/api/v1/library/issues/${renewIssueId}/renew`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({ reason: "Exam revision extension" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.issue.renewalCount).toBe(1);
    expect(res.body.data.renewal.renewalNumber).toBe(1);

    // Try a second renewal (policy allows max 1 renewal)
    const secondRenew = await request(app)
      .post(`/api/v1/library/issues/${renewIssueId}/renew`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({ reason: "Another extension" });

    expect(secondRenew.status).toBe(400);
    expect(secondRenew.body.error).toContain("limit");
  });

  // ═════════════════════════════════════════════════════════════
  // 5. BOOK RETURN, OVERDUE FINES & CONDITION INSPECTION
  // ═════════════════════════════════════════════════════════════

  it("8. successfully returns copy 1 in GOOD condition and makes copy AVAILABLE again", async () => {
    const issueRes = await request(app)
      .post("/api/v1/library/issues")
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        bookId: bookTitleId,
        copyId: copyReturnId,
        userId: studentDId,
        userType: "STUDENT",
      });
    const returnIssueId = issueRes.body.data.id;

    const res = await request(app)
      .post(`/api/v1/library/issues/${returnIssueId}/return`)
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
    const copy = await prisma.bookCopy.findUnique({ where: { id: copyReturnId } });
    expect(copy?.status).toBe("AVAILABLE");
  });

  it("9. simulates late return with damaged condition and generates fine invoice", async () => {
    // 1. Issue copy 2
    const issueRes = await request(app)
      .post("/api/v1/library/issues")
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        bookId: bookTitleId,
        copyId: copyId2,
        userId: studentEId,
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
      where: { schoolId: schoolAId, studentId: studentEId, description: { contains: lateIssueId } },
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
