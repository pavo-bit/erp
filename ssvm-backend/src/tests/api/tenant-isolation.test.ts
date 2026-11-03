import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, getTestPrisma, createTestUser, createTestSchool } from "../helpers/testApp";

const app = createTestApp();
const prisma = getTestPrisma();

describe("Multi-Tenant Isolation across Core Modules (Restricted Role)", () => {
  const uid = Math.random().toString(36).substring(2, 8);

  let schoolAId: string;
  let schoolBId: string;

  let adminACookie: string;
  let adminBCookie: string;
  let adminAToken: string;
  let managerACookie: string;
  let managerBCookie: string;

  // Fixtures
  let studentAId: string;
  let studentBId: string;

  let invoiceAId: string;
  let invoiceBId: string;

  let docAId: string;
  let docBId: string;

  let bookAId: string;
  let bookBId: string;

  let examAId: string;
  let examBId: string;

  let noticeAId: string;
  let noticeBId: string;

  let alumniAId: string;
  let alumniBId: string;

  let itemAId: string;
  let itemBId: string;
  let locAId: string;
  let locBId: string;

  let prAId: string;
  let prBId: string;

  beforeAll(async () => {
    // 1. Schools
    const schoolA = await createTestSchool();
    const schoolB = await createTestSchool();
    schoolAId = schoolA.id;
    schoolBId = schoolB.id;

    // 2. Users
    const adminA = await createTestUser(Role.ERP_ADMIN, schoolAId);
    const adminB = await createTestUser(Role.ERP_ADMIN, schoolBId);
    adminACookie = adminA.cookie;
    adminBCookie = adminB.cookie;
    adminAToken = adminA.token;

    const managerA = await createTestUser(Role.ASSET_MANAGER, schoolAId);
    const managerB = await createTestUser(Role.ASSET_MANAGER, schoolBId);
    managerACookie = managerA.cookie;
    managerBCookie = managerB.cookie;

    // 3. Academic Structure & Students
    const sessionA = await prisma.academicSession.create({
      data: { name: `2026-A-${uid}`, startDate: new Date(), endDate: new Date(), schoolId: schoolAId },
    });
    const classA = await prisma.class.create({
      data: { name: `Class A-${uid}`, schoolId: schoolAId, sessionId: sessionA.id },
    });
    const sectionA = await prisma.section.create({
      data: { name: `Sec A-${uid}`, classId: classA.id },
    });
    const studentUserA = await createTestUser(Role.STUDENT, schoolAId);
    let studentA = await prisma.student.findFirst({ where: { userId: studentUserA.user.id } });
    if (!studentA) {
      studentA = await prisma.student.create({
        data: {
          schoolId: schoolAId,
          userId: studentUserA.user.id,
          name: `Student A ${uid}`,
          admissionNo: `ADM-A-${uid}`,
          rollNo: `ROLL-A-${uid}`,
          sectionId: sectionA.id,
        },
      });
    } else {
      await prisma.student.update({ where: { id: studentA.id }, data: { sectionId: sectionA.id } });
    }
    studentAId = studentA.id;

    const sessionB = await prisma.academicSession.create({
      data: { name: `2026-B-${uid}`, startDate: new Date(), endDate: new Date(), schoolId: schoolBId },
    });
    const classB = await prisma.class.create({
      data: { name: `Class B-${uid}`, schoolId: schoolBId, sessionId: sessionB.id },
    });
    const sectionB = await prisma.section.create({
      data: { name: `Sec B-${uid}`, classId: classB.id },
    });
    const studentUserB = await createTestUser(Role.STUDENT, schoolBId);
    let studentB = await prisma.student.findFirst({ where: { userId: studentUserB.user.id } });
    if (!studentB) {
      studentB = await prisma.student.create({
        data: {
          schoolId: schoolBId,
          userId: studentUserB.user.id,
          name: `Student B ${uid}`,
          admissionNo: `ADM-B-${uid}`,
          rollNo: `ROLL-B-${uid}`,
          sectionId: sectionB.id,
        },
      });
    } else {
      await prisma.student.update({ where: { id: studentB.id }, data: { sectionId: sectionB.id } });
    }
    studentBId = studentB.id;

    // 4. Invoices
    const invA = await prisma.invoice.create({
      data: {
        schoolId: schoolAId,
        studentId: studentAId,
        amount: 1500,
        amountPaid: 0,
        remainingAmount: 1500,
        status: "UNPAID",
        dueDate: new Date(),
        description: `Fee A ${uid}`,
      },
    });
    invoiceAId = invA.id;

    const invB = await prisma.invoice.create({
      data: {
        schoolId: schoolBId,
        studentId: studentBId,
        amount: 2500,
        amountPaid: 0,
        remainingAmount: 2500,
        status: "UNPAID",
        dueDate: new Date(),
        description: `Fee B ${uid}`,
      },
    });
    invoiceBId = invB.id;

    // 5. Attendance
    await prisma.attendance.create({
      data: {
        schoolId: schoolAId,
        studentId: studentAId,
        sectionId: sectionA.id,
        date: new Date(),
        status: "PRESENT",
      },
    });
    await prisma.attendance.create({
      data: {
        schoolId: schoolBId,
        studentId: studentBId,
        sectionId: sectionB.id,
        date: new Date(),
        status: "PRESENT",
      },
    });

    // 6. Exams
    const examA = await prisma.exam.create({
      data: {
        schoolId: schoolAId,
        classId: classA.id,
        name: `Midterm Exam A ${uid}`,
      },
    });
    examAId = examA.id;

    const examB = await prisma.exam.create({
      data: {
        schoolId: schoolBId,
        classId: classB.id,
        name: `Midterm Exam B ${uid}`,
      },
    });
    examBId = examB.id;

    // 7. Documents (DocumentRepository)
    const docA = await prisma.documentRepository.create({
      data: {
        schoolId: schoolAId,
        name: `Document A ${uid}`,
        category: "GENERAL",
        fileUrl: `/uploads/documents/docA_${uid}.pdf`,
        fileType: "application/pdf",
        studentId: studentAId,
      },
    });
    docAId = docA.id;

    const docB = await prisma.documentRepository.create({
      data: {
        schoolId: schoolBId,
        name: `Document B ${uid}`,
        category: "GENERAL",
        fileUrl: `/uploads/documents/docB_${uid}.pdf`,
        fileType: "application/pdf",
        studentId: studentBId,
      },
    });
    docBId = docB.id;

    // 8. Notices
    const noticeA = await prisma.notice.create({
      data: {
        schoolId: schoolAId,
        title: `Notice A ${uid}`,
        content: `Notice Content A ${uid}`,
        authorId: adminA.user.id,
        status: "PUBLISHED",
      },
    });
    noticeAId = noticeA.id;

    const noticeB = await prisma.notice.create({
      data: {
        schoolId: schoolBId,
        title: `Notice B ${uid}`,
        content: `Notice Content B ${uid}`,
        authorId: adminB.user.id,
        status: "PUBLISHED",
      },
    });
    noticeBId = noticeB.id;

    // 9. Inventory
    const locA = await prisma.inventoryLocation.create({
      data: { schoolId: schoolAId, name: `Warehouse A ${uid}` },
    });
    locAId = locA.id;
    const locB = await prisma.inventoryLocation.create({
      data: { schoolId: schoolBId, name: `Warehouse B ${uid}` },
    });
    locBId = locB.id;

    const itemA = await prisma.inventoryItem.create({
      data: { schoolId: schoolAId, sku: `SKU-A-${uid}`, name: `Item A ${uid}` },
    });
    itemAId = itemA.id;
    const itemB = await prisma.inventoryItem.create({
      data: { schoolId: schoolBId, sku: `SKU-B-${uid}`, name: `Item B ${uid}` },
    });
    itemBId = itemB.id;

    await prisma.inventoryStock.create({
      data: { schoolId: schoolAId, itemId: itemAId, locationId: locAId, quantity: 100 },
    });
    await prisma.inventoryStock.create({
      data: { schoolId: schoolBId, itemId: itemBId, locationId: locBId, quantity: 200 },
    });

    // 10. Procurement
    const prA = await prisma.purchaseRequest.create({
      data: {
        schoolId: schoolAId,
        requestNumber: `PR-A-${uid}`,
        requesterId: managerA.user.id,
        status: "PENDING_APPROVAL",
        totalEstAmount: 500,
        items: {
          create: [{ description: `Supplies A ${uid}`, quantity: 5, estimatedPrice: 100 }],
        },
      },
    });
    prAId = prA.id;

    const prB = await prisma.purchaseRequest.create({
      data: {
        schoolId: schoolBId,
        requestNumber: `PR-B-${uid}`,
        requesterId: managerB.user.id,
        status: "PENDING_APPROVAL",
        totalEstAmount: 800,
        items: {
          create: [{ description: `Supplies B ${uid}`, quantity: 8, estimatedPrice: 100 }],
        },
      },
    });
    prBId = prB.id;

    // 11. Alumni
    const alumniUserA = await createTestUser(Role.ALUMNI, schoolAId);
    const alumniA = await prisma.alumni.create({
      data: {
        userId: alumniUserA.user.id,
        batch: "2020",
        currentRole: "Engineer",
        company: `Company A ${uid}`,
      },
    });
    alumniAId = alumniA.id;

    const alumniUserB = await createTestUser(Role.ALUMNI, schoolBId);
    const alumniB = await prisma.alumni.create({
      data: {
        userId: alumniUserB.user.id,
        batch: "2021",
        currentRole: "Designer",
        company: `Company B ${uid}`,
      },
    });
    alumniBId = alumniB.id;

    // 12. Library
    const bookA = await prisma.book.create({
      data: {
        schoolId: schoolAId,
        title: `Book A ${uid}`,
        author: `Author A ${uid}`,
        totalCopies: 5,
        available: 5,
      },
    });
    bookAId = bookA.id;

    const bookB = await prisma.book.create({
      data: {
        schoolId: schoolBId,
        title: `Book B ${uid}`,
        author: `Author B ${uid}`,
        totalCopies: 10,
        available: 10,
      },
    });
    bookBId = bookB.id;
  });

  afterAll(async () => {
    // Teardown
    await prisma.school.deleteMany({
      where: { id: { in: [schoolAId, schoolBId] } },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. STUDENTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Students Isolation", () => {
    it("School A admin reads only School A students", async () => {
      const res = await request(app).get("/api/v1/students").set("Cookie", [adminACookie]);
      expect(res.status).toBe(200);
      const students = res.body.data.students || res.body.data;
      expect(students.length).toBeGreaterThan(0);
      expect(students.every((s: any) => s.schoolId === schoolAId)).toBe(true);
      expect(students.some((s: any) => s.schoolId === schoolBId)).toBe(false);
    });

    it("School A admin can get student A (200), but cannot get student B (404)", async () => {
      const ownRes = await request(app).get(`/api/v1/students/${studentAId}`).set("Cookie", [adminACookie]);
      expect(ownRes.status).toBe(200);
      expect(ownRes.body.data.id).toBe(studentAId);

      const crossRes = await request(app).get(`/api/v1/students/${studentBId}`).set("Cookie", [adminACookie]);
      expect([403, 404]).toContain(crossRes.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. INVOICES
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Invoices Isolation", () => {
    it("School A admin reads only School A invoices", async () => {
      const res = await request(app).get("/api/v1/invoices").set("Cookie", [adminACookie]);
      expect(res.status).toBe(200);
      const invoices = res.body.data.invoices || res.body.data;
      expect(invoices.length).toBeGreaterThan(0);
      expect(invoices.every((inv: any) => inv.schoolId === schoolAId)).toBe(true);
      expect(invoices.some((inv: any) => inv.schoolId === schoolBId)).toBe(false);
    });

    it("School A admin cannot read School B invoice by ID (404/403)", async () => {
      const crossRes = await request(app).get(`/api/v1/invoices/${invoiceBId}`).set("Cookie", [adminACookie]);
      expect([403, 404]).toContain(crossRes.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Payments Isolation", () => {
    it("School A admin cannot create payment order for School B invoice (403/404)", async () => {
      const crossRes = await request(app)
        .post("/api/v1/payments/create-order")
        .set("Cookie", [adminACookie])
        .send({ feeId: invoiceBId });

      // Must NEVER succeed (200) with another school's invoice.
      expect([403, 404, 503]).toContain(crossRes.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ATTENDANCE
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Attendance Isolation", () => {
    it("School A admin reads only School A attendance", async () => {
      const res = await request(app).get("/api/v1/attendance").set("Cookie", [adminACookie]);
      expect(res.status).toBe(200);
      const records = res.body.data || [];
      expect(records.length).toBeGreaterThan(0);
      expect(records.every((att: any) => att.schoolId === schoolAId)).toBe(true);
      expect(records.some((att: any) => att.schoolId === schoolBId)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. EXAMS & MARKS
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Exams Isolation", () => {
    it("School A admin reads only School A exams", async () => {
      const res = await request(app).get("/api/v1/exams").set("Cookie", [adminACookie]);
      expect(res.status).toBe(200);
      const exams = res.body.data || [];
      expect(exams.length).toBeGreaterThan(0);
      expect(exams.every((exam: any) => exam.schoolId === schoolAId)).toBe(true);
      expect(exams.some((exam: any) => exam.schoolId === schoolBId)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Documents Isolation", () => {
    it("School A admin lists only School A documents", async () => {
      const res = await request(app).get("/api/v1/documents").set("Cookie", [adminACookie]);
      expect(res.status).toBe(200);
      const docs = res.body.data || [];
      expect(docs.length).toBeGreaterThan(0);
      expect(docs.every((d: any) => d.schoolId === schoolAId)).toBe(true);
      expect(docs.some((d: any) => d.schoolId === schoolBId)).toBe(false);
    });

    it("School A admin cannot access School B document download (404)", async () => {
      const res = await request(app).get(`/api/v1/documents/${docBId}/download`).set("Cookie", [adminACookie]);
      expect([403, 404]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. USERS
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Users Isolation", () => {
    it("School A admin lists only School A users", async () => {
      const res = await request(app).get("/api/v1/users").set("Cookie", [adminACookie]);
      expect(res.status).toBe(200);
      const users = res.body.data || [];
      expect(users.length).toBeGreaterThan(0);
      // Verify no cross-tenant user is visible
      const leakedUser = users.find((u: any) => u.email.includes(`testuser_`) && u.schoolId === schoolBId);
      expect(leakedUser).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. NOTICES
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Notices Isolation", () => {
    it("School A admin can update own notice (200), but cannot update School B notice (404/500)", async () => {
      const ownRes = await request(app)
        .put(`/api/v1/notices/${noticeAId}`)
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({ title: `Updated Notice A ${uid}` });
      expect(ownRes.status).toBe(200);
      expect(ownRes.body.data.title).toBe(`Updated Notice A ${uid}`);

      const crossRes = await request(app)
        .put(`/api/v1/notices/${noticeBId}`)
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({ title: "Hacked Notice B" });
      expect([403, 404, 500]).toContain(crossRes.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. INVENTORY
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Inventory Isolation", () => {
    it("School A manager lists only School A stocks", async () => {
      const res = await request(app).get("/api/v1/inventory/stocks").set("Cookie", [managerACookie]);
      expect(res.status).toBe(200);
      const stocks = res.body.data || [];
      expect(stocks.length).toBeGreaterThan(0);
      expect(stocks.every((s: any) => s.schoolId === schoolAId)).toBe(true);
      expect(stocks.some((s: any) => s.schoolId === schoolBId)).toBe(false);
    });

    it("School A manager cannot record movements against School B items (403/404)", async () => {
      const res = await request(app)
        .post("/api/v1/inventory/movements")
        .set("Cookie", [managerACookie])
        .send({
          itemId: itemBId,
          locationId: locAId,
          movementType: "INWARD",
          quantity: 10,
        });
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. PROCUREMENT
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Procurement Isolation", () => {
    it("School A manager cannot approve School B purchase request (404/500)", async () => {
      const res = await request(app)
        .post(`/api/v1/procurement/requests/${prBId}/approve`)
        .set("Cookie", [managerACookie])
        .send({});
      expect([403, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. ALUMNI
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Alumni Isolation", () => {
    it("School A admin cannot update School B alumni record (404/500)", async () => {
      const res = await request(app)
        .put("/api/v1/alumni")
        .set("Cookie", [adminACookie])
        .send({ id: alumniBId, currentRole: "Hacked Role" });
      // RLS or route scoping prevents update; returns 404 or 500 (P2025 record not found)
      expect([403, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. LIBRARY
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Library Isolation", () => {
    it("School A admin lists only School A books", async () => {
      const res = await request(app).get("/api/v1/library/books").set("Cookie", [adminACookie]);
      expect(res.status).toBe(200);
      const books = res.body.data || [];
      expect(books.length).toBeGreaterThan(0);
      expect(books.every((b: any) => b.schoolId === schoolAId)).toBe(true);
      expect(books.some((b: any) => b.schoolId === schoolBId)).toBe(false);
    });

    it("School A admin cannot update School B book (404)", async () => {
      const res = await request(app)
        .put(`/api/v1/library/books/${bookBId}`)
        .set("Cookie", [adminACookie])
        .send({
          title: "Hijacked Title",
          author: "Hijacked Author",
          totalCopies: 20,
        });
      expect([403, 404]).toContain(res.status);
    });
  });
});
