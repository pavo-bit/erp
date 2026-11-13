import "../db/env-setup";
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, createTestUser } from "../helpers/testApp";
import prisma, { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import { signToken } from "../../middleware/auth";

describe("SSVM ERP — Student Management & Canonical Profile Acceptance Suite", () => {
  const app = createTestApp();

  let schoolAId: string;
  let schoolBId: string;
  let adminAToken: string;
  let adminBToken: string;
  let teacherAToken: string;
  let parentAToken: string;
  let studentAToken: string;

  let sessionAId: string;
  let class1Id: string;
  let sec1Id: string;
  let sec2Id: string;

  let student1Id: string;
  let student2Id: string;
  let student3Id: string;
  let studentBId: string;
  let guardian1Id: string;

  beforeAll(async () => {
    const uid = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    // 1. Create School A & School B (Global tables)
    const schoolA = await prisma.school.create({
      data: {
        name: `SSVM Public School Alpha ${uid}`,
        code: `SCH-A-${uid}`,
        status: "ACTIVE",
        tenantState: "ACTIVE",
      },
    });
    schoolAId = schoolA.id;

    const schoolB = await prisma.school.create({
      data: {
        name: `SSVM Public School Beta ${uid}`,
        code: `SCH-B-${uid}`,
        status: "ACTIVE",
        tenantState: "ACTIVE",
      },
    });
    schoolBId = schoolB.id;

    // 2. Create Users & Tokens for various roles
    const adminA = await createTestUser(Role.ERP_ADMIN, schoolAId);
    adminAToken = adminA.token;

    const adminB = await createTestUser(Role.ERP_ADMIN, schoolBId);
    adminBToken = adminB.token;

    const teacherA = await createTestUser(Role.TEACHER, schoolAId);
    teacherAToken = teacherA.token;

    const parentA = await createTestUser(Role.PARENT, schoolAId);
    parentAToken = parentA.token;

    // 3. Set up School A tenant tables inside runWithTenantDatabaseTransaction
    await runWithTenantDatabaseTransaction(schoolAId, async (tx: any) => {
      // Academic Session
      const sessionA = await tx.academicSession.create({
        data: {
          name: `2026-2027-${uid}`,
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
          isCurrent: true,
          schoolId: schoolAId,
        },
      });
      sessionAId = sessionA.id;

      // Class 10
      const class1 = await tx.class.create({
        data: {
          name: "Class 10",
          schoolId: schoolAId,
          sessionId: sessionAId,
        },
      });
      class1Id = class1.id;

      // Sections A & B
      const sec1 = await tx.section.create({
        data: { name: "A", classId: class1Id },
      });
      sec1Id = sec1.id;

      const sec2 = await tx.section.create({
        data: { name: "B", classId: class1Id },
      });
      sec2Id = sec2.id;

      // Teacher record
      const teacherRec = await tx.teacher.create({
        data: {
          schoolId: schoolAId,
          userId: teacherA.user.id,
          employeeId: `EMP-${uid}`,
        },
      });

      // Assign Teacher A as primary class teacher of Section A
      await tx.classTeacher.create({
        data: {
          sectionId: sec1Id,
          teacherId: teacherRec.id,
          isPrimary: true,
        },
      });

      // Guardian 1 (Linked to parentA.user.id)
      const guardian1 = await tx.guardian.create({
        data: {
          schoolId: schoolAId,
          userId: parentA.user.id,
          primaryName: "Rajesh Sharma",
          primaryPhone: "9876543210",
          primaryEmail: parentA.user.email,
          primaryRelation: "Father",
          secondaryName: "Sunita Sharma",
          secondaryPhone: "9876543211",
          address: "42 MG Road, Bangalore",
        },
      });
      guardian1Id = guardian1.id;

      // Guardian 2 (for Student 3)
      const guardian2 = await tx.guardian.create({
        data: {
          schoolId: schoolAId,
          primaryName: "Sanjay Patel",
          primaryPhone: "9123456789",
          primaryEmail: `patel_${uid}@gmail.com`,
          primaryRelation: "Father",
          address: "88 Residency Road, Bangalore",
        },
      });

      // Student 1 User Account
      const stu1User = await tx.user.create({
        data: {
          schoolId: schoolAId,
          email: `aarav_sharma_${uid}@student.ssvm`,
          name: "Aarav Sharma",
          passwordHash: "dummyhash",
          role: Role.STUDENT,
          isActive: true,
        },
      });
      studentAToken = signToken({
        userId: stu1User.id,
        email: stu1User.email,
        name: stu1User.name,
        role: "STUDENT",
        schoolId: schoolAId,
      });

      // Student 1: New Admission (Aarav Sharma)
      const s1 = await tx.student.create({
        data: {
          schoolId: schoolAId,
          name: "Aarav Sharma",
          admissionNo: `ADM-2026-0001-${uid}`,
          rollNo: "1",
          dob: new Date("2011-05-15"),
          gender: "MALE",
          bloodGroup: "O+",
          address: "42 MG Road, Bangalore",
          sectionId: sec1Id,
          guardianId: guardian1Id,
          userId: stu1User.id,
          isActive: true,
        },
      });
      student1Id = s1.id;

      await tx.studentTimeline.create({
        data: {
          studentId: student1Id,
          title: "New Admission Enrolled",
          type: "NEW_ADMISSION",
          description: "Official new student admission into Class 10 - Section A.",
        },
      });

      await tx.invoice.create({
        data: {
          schoolId: schoolAId,
          studentId: student1Id,
          amount: 25000,
          amountPaid: 20000,
          remainingAmount: 5000,
          status: "PARTIAL",
          dueDate: new Date("2026-06-30"),
          receiptNo: `REC-${uid}-001`,
        },
      });

      await tx.attendance.create({
        data: {
          schoolId: schoolAId,
          studentId: student1Id,
          sectionId: sec1Id,
          date: new Date("2026-05-01"),
          status: "PRESENT",
        },
      });

      await tx.document.create({
        data: {
          schoolId: schoolAId,
          ownerType: "STUDENT",
          ownerId: student1Id,
          category: "BIRTH_CERTIFICATE",
          title: "Aarav Birth Certificate",
          fileUrl: "https://ssvm.internal/docs/birth_cert.pdf",
        },
      });

      // Student 2: Re-admission (Aarav Verma) — Sibling sharing Guardian 1!
      const s2 = await tx.student.create({
        data: {
          schoolId: schoolAId,
          name: "Aarav Verma",
          admissionNo: `ADM-2026-0002-${uid}`,
          rollNo: "2",
          dob: new Date("2013-08-20"),
          gender: "MALE",
          bloodGroup: "B+",
          address: "42 MG Road, Bangalore",
          sectionId: sec1Id,
          guardianId: guardian1Id,
          isActive: true,
        },
      });
      student2Id = s2.id;

      await tx.studentTimeline.create({
        data: {
          studentId: student2Id,
          title: "Student Re-Admitted",
          type: "READMISSION",
          description: "Re-admission recorded for session 2026-2027.",
        },
      });

      // Student 3: Transfer Admission (Diya Patel)
      const s3 = await tx.student.create({
        data: {
          schoolId: schoolAId,
          name: "Diya Patel",
          admissionNo: `ADM-2026-0003-${uid}`,
          rollNo: "1",
          dob: new Date("2012-02-10"),
          gender: "FEMALE",
          bloodGroup: "A+",
          address: "88 Residency Road, Bangalore",
          sectionId: sec2Id,
          guardianId: guardian2.id,
          isActive: true,
        },
      });
      student3Id = s3.id;

      await tx.studentTimeline.create({
        data: {
          studentId: student3Id,
          title: "Incoming Transfer Admission",
          type: "TRANSFER_ADMISSION",
          description: "Admitted via inter-state transfer from Delhi Public School.",
        },
      });
    });

    // 4. Set up School B student inside School B transaction
    await runWithTenantDatabaseTransaction(schoolBId, async (tx: any) => {
      const sB = await tx.student.create({
        data: {
          schoolId: schoolBId,
          name: "Rohan Beta",
          admissionNo: `ADM-B-2026-${uid}`,
          rollNo: "1",
          dob: new Date("2011-01-01"),
          gender: "MALE",
          isActive: true,
        },
      });
      studentBId = sB.id;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. STUDENT DIRECTORY TESTS
  // ─────────────────────────────────────────────────────────────────────────

  describe("1. Student Directory API (GET /api/v1/students)", () => {
    it("returns paginated student directory for authorized school administrator", async () => {
      const res = await request(app)
        .get("/api/v1/students?page=1&limit=10")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it("searches students by name returning distinct records for same first name", async () => {
      const res = await request(app)
        .get("/api/v1/students?search=Aarav")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      const names = res.body.data.map((s: any) => s.name);
      expect(names).toContain("Aarav Sharma");
      expect(names).toContain("Aarav Verma");
      const ids = new Set(res.body.data.map((s: any) => s.id));
      expect(ids.size).toBe(res.body.data.length);
    });

    it("searches students by admission number returning exact match", async () => {
      const res = await request(app)
        .get(`/api/v1/students?search=ADM-2026-0001`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Aarav Sharma");
    });

    it("searches students by primary guardian phone number", async () => {
      const res = await request(app)
        .get("/api/v1/students?search=9876543210")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it("filters directory by admissionType=READMISSION", async () => {
      const res = await request(app)
        .get("/api/v1/students?admissionType=READMISSION")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      const studentNames = res.body.data.map((s: any) => s.name);
      expect(studentNames).toContain("Aarav Verma");
      expect(studentNames).not.toContain("Aarav Sharma");
    });

    it("filters directory by status=ACTIVE and status=INACTIVE", async () => {
      const res = await request(app)
        .get("/api/v1/students?status=ACTIVE")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((s: any) => s.isActive === true)).toBe(true);
    });

    it("enforces strict multi-tenant isolation (School B cannot see School A students)", async () => {
      const res = await request(app)
        .get("/api/v1/students")
        .set("Authorization", `Bearer ${adminBToken}`);

      expect(res.status).toBe(200);
      const schoolBIds = res.body.data.map((s: any) => s.id);
      expect(schoolBIds).toContain(studentBId);
      expect(schoolBIds).not.toContain(student1Id);
      expect(schoolBIds).not.toContain(student2Id);
      expect(schoolBIds).not.toContain(student3Id);
    });

    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/v1/students");
      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CANONICAL STUDENT PROFILE TESTS
  // ─────────────────────────────────────────────────────────────────────────

  describe("2. Canonical Student Profile API (GET /api/v1/students/:id)", () => {
    it("returns comprehensive canonical profile with all peripheral relations", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student1Id}`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const s = res.body.data;
      expect(s.id).toBe(student1Id);
      expect(s.name).toBe("Aarav Sharma");
      expect(s.bloodGroup).toBe("O+");
      expect(s.gender).toBe("MALE");
      expect(s.admissionType).toBe("NEW");

      // Relations
      expect(s.sectionRef).toBeDefined();
      expect(s.sectionRef.class.name).toBe("Class 10");
      expect(s.guardian).toBeDefined();
      expect(s.guardian.primaryName).toBe("Rajesh Sharma");
      expect(s.user).toBeDefined();

      // Summaries
      expect(s.attendanceSummary).toBeDefined();
      expect(s.attendanceSummary.presentDays).toBe(1);
      expect(s.feeSummary).toBeDefined();
      expect(s.feeSummary.totalInvoiced).toBe(25000);
      expect(s.feeSummary.outstandingBalance).toBe(5000);
      expect(s.documents.length).toBeGreaterThanOrEqual(1);
    });

    it("returns HTTP 404 for non-existent student identifier", async () => {
      const res = await request(app)
        .get("/api/v1/students/non_existent_cuid_999")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });

    it("strictly rejects cross-tenant student profile access (School B cannot open School A student)", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student1Id}`)
        .set("Authorization", `Bearer ${adminBToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. GRANULAR SUB-RESOURCE ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  describe("3. Granular Sub-Resource Profile Endpoints", () => {
    it("GET /:id/personal returns personal demographics and account status", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student1Id}/personal`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Aarav Sharma");
      expect(res.body.data.bloodGroup).toBe("O+");
      expect(res.body.data.user.email).toBeDefined();
    });

    it("GET /:id/guardians returns guardian details and sibling relationships", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student1Id}/guardians`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.guardian.primaryName).toBe("Rajesh Sharma");
      expect(res.body.data.siblings).toBeDefined();
      expect(res.body.data.siblings.length).toBe(1);
      expect(res.body.data.siblings[0].id).toBe(student2Id);
      expect(res.body.data.siblings[0].name).toBe("Aarav Verma");
    });

    it("GET /:id/academics returns placement standards and class teachers", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student1Id}/academics`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.placement.class).toBe("Class 10");
      expect(res.body.data.placement.section).toBe("A");
      expect(res.body.data.classTeachers.length).toBeGreaterThanOrEqual(1);
    });

    it("GET /:id/admission returns admission metadata and type", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student1Id}/admission`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.admissionType).toBe("NEW");
      expect(res.body.data.timelineRecord).toBeDefined();
    });

    it("GET /:id/fees returns financial summary, invoices, and payment receipts", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student1Id}/fees`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalInvoiced).toBe(25000);
      expect(res.body.data.summary.totalPaid).toBe(20000);
      expect(res.body.data.invoices.length).toBe(1);
    });

    it("GET /:id/attendance returns attendance summary and recent roll-call records", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student1Id}/attendance`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalDays).toBe(1);
      expect(res.body.data.summary.presentDays).toBe(1);
      expect(res.body.data.recentRecords.length).toBe(1);
    });

    it("GET /:id/documents returns verified documents and certificates", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student1Id}/documents`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.documents.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.documents[0].category).toBe("BIRTH_CERTIFICATE");
    });

    it("GET /:id/history returns chronological student timelines and audit log entries", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student1Id}/history`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.timelines.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.timelines[0].type).toBe("NEW_ADMISSION");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS
  // ─────────────────────────────────────────────────────────────────────────

  describe("4. Role-Based Access Control & Scope Verification", () => {
    it("allows a Student to view their own profile", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student1Id}`)
        .set("Authorization", `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(student1Id);
    });

    it("strictly forbids a Student from viewing another student's profile (403 Forbidden)", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student2Id}`)
        .set("Authorization", `Bearer ${studentAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Forbidden");
    });

    it("allows a Parent to view their own child's profile", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student1Id}`)
        .set("Authorization", `Bearer ${parentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Aarav Sharma");
    });

    it("strictly forbids a Parent from viewing an unrelated student's profile (403 Forbidden)", async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student3Id}`)
        .set("Authorization", `Bearer ${parentAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Forbidden");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. LIFECYCLE MUTATIONS & SOFT-DELETE
  // ─────────────────────────────────────────────────────────────────────────

  describe("5. Profile Mutations & Fail-Closed Soft Delete", () => {
    it("PUT /api/v1/students/:id updates student attributes, records timeline, and logs audit", async () => {
      const res = await request(app)
        .put(`/api/v1/students/${student1Id}`)
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          name: "Aarav Sharma (Updated)",
          bloodGroup: "A+",
          address: "50 New Airport Road, Bangalore",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Aarav Sharma (Updated)");
      expect(res.body.data.bloodGroup).toBe("A+");

      const auditLog = await prisma.auditLog.findFirst({
        where: { entity: "STUDENT", entityId: student1Id, action: "STUDENT_UPDATED" },
      });
      expect(auditLog).toBeDefined();
    });

    it("DELETE /api/v1/students/:id soft-deletes student and archives record", async () => {
      const delRes = await request(app)
        .delete(`/api/v1/students/${student3Id}`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const getRes = await request(app)
        .get(`/api/v1/students/${student3Id}`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(getRes.status).toBe(404);

      const dirRes = await request(app)
        .get("/api/v1/students")
        .set("Authorization", `Bearer ${adminAToken}`);

      const ids = dirRes.body.data.map((s: any) => s.id);
      expect(ids).not.toContain(student3Id);

      // 4. Verify database row still exists in database with deletedAt set (safe retention without physical deletion)
      await runWithTenantDatabaseTransaction(schoolAId, async (tx: any) => {
        const rawRows = await tx.$queryRaw<any[]>`SELECT id, "deletedAt", "isActive" FROM students WHERE id = ${student3Id}`;
        expect(rawRows.length).toBe(1);
        expect(rawRows[0].deletedAt).not.toBeNull();
        expect(rawRows[0].isActive).toBe(false);
      });
    });
  });
});
