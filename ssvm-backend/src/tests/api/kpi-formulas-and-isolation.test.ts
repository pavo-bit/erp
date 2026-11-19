import "../db/env-setup";
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createTestApp, getTestPrisma, createTestSchool, createTestUser } from "../helpers/testApp";
import { Role } from "@prisma/client";
import { ModuleRegistryService } from "../../services/module-registry.service";
import { KpiRegistry } from "../../kpi/registry";

interface KpiPayloadItem {
  id: string;
  name: string;
  value: number | null;
  unit: string;
  asOf: string;
  period: string;
  status: string;
  reason?: string | null;
}

describe("K6 — KPI Deterministic Formulas, Tenancy Isolation & Legacy Deprecation", { timeout: 30000 }, () => {
  let app: ReturnType<typeof createTestApp>;
  let prisma: ReturnType<typeof getTestPrisma>;

  let schoolA: Awaited<ReturnType<typeof createTestSchool>>;
  let adminAToken: string;

  let schoolB: Awaited<ReturnType<typeof createTestSchool>>;
  let adminBToken: string;

  let schoolEmpty: Awaited<ReturnType<typeof createTestSchool>>;
  let adminEmptyToken: string;
  let superAdminToken: string;

  beforeAll(async () => {
    app = createTestApp();
    prisma = getTestPrisma();

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Setup School A with Deterministic Fixtures
    // ─────────────────────────────────────────────────────────────────────────
    schoolA = await createTestSchool();
    const adminAData = await createTestUser(Role.ERP_ADMIN, schoolA.id);
    adminAToken = adminAData.token;

    // Enable Modules for School A: HOSTEL, LIBRARY, INVENTORY, COMMUNICATIONS
    await ModuleRegistryService.setSchoolEntitlement(schoolA.id, "HOSTEL", true);
    await ModuleRegistryService.setSchoolEntitlement(schoolA.id, "LIBRARY", true);
    await ModuleRegistryService.setSchoolEntitlement(schoolA.id, "INVENTORY", true);
    await ModuleRegistryService.setSchoolEntitlement(schoolA.id, "COMMUNICATIONS", true);

    const now = new Date();
    const currentYear = now.getFullYear();

    // Students: 4 active, 1 inactive
    const students = await Promise.all([
      prisma.student.create({
        data: {
          schoolId: schoolA.id,
          name: "Alice A",
          rollNo: "R01",
          admissionNo: `ADM_A1_${Date.now()}`,
          createdAt: new Date(currentYear, 1, 10),
          isActive: true,
        },
      }),
      prisma.student.create({
        data: {
          schoolId: schoolA.id,
          name: "Bob A",
          rollNo: "R02",
          admissionNo: `ADM_A2_${Date.now()}`,
          createdAt: new Date(currentYear, 2, 15),
          isActive: true,
        },
      }),
      prisma.student.create({
        data: {
          schoolId: schoolA.id,
          name: "Charlie A",
          rollNo: "R03",
          admissionNo: `ADM_A3_${Date.now()}`,
          createdAt: new Date(currentYear, 3, 20),
          isActive: true,
        },
      }),
      prisma.student.create({
        data: {
          schoolId: schoolA.id,
          name: "Diana A",
          rollNo: "R04",
          admissionNo: `ADM_A4_${Date.now()}`,
          createdAt: new Date(currentYear, 4, 25),
          isActive: true,
        },
      }),
      prisma.student.create({
        data: {
          schoolId: schoolA.id,
          name: "Inactive A",
          rollNo: "R05",
          admissionNo: `ADM_A5_${Date.now()}`,
          createdAt: new Date(currentYear, 0, 5),
          isActive: false,
        },
      }),
    ]);

    // Student Attendance: 3 PRESENT, 1 ABSENT -> 75%
    await Promise.all([
      prisma.attendance.create({
        data: { schoolId: schoolA.id, studentId: students[0].id, date: now, status: "PRESENT" },
      }),
      prisma.attendance.create({
        data: { schoolId: schoolA.id, studentId: students[1].id, date: now, status: "PRESENT" },
      }),
      prisma.attendance.create({
        data: { schoolId: schoolA.id, studentId: students[2].id, date: now, status: "PRESENT" },
      }),
      prisma.attendance.create({
        data: { schoolId: schoolA.id, studentId: students[3].id, date: now, status: "ABSENT" },
      }),
    ]);

    // Teacher & Staff Attendance: 1 Teacher, 1 PRESENT -> 100%
    const teacherUser = await createTestUser(Role.TEACHER, schoolA.id);
    const teacher = await prisma.teacher.create({
      data: {
        userId: teacherUser.user.id,
        schoolId: schoolA.id,
        isActive: true,
      },
    });
    await prisma.teacherAttendance.create({
      data: { teacherId: teacher.id, date: now, status: "PRESENT" },
    });

    // Academic Session, Class, Exam, ExamSubject
    const session = await prisma.academicSession.create({
      data: {
        schoolId: schoolA.id,
        name: `${currentYear}-${currentYear + 1}`,
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31),
        isCurrent: true,
      },
    });

    const cls = await prisma.class.create({
      data: {
        schoolId: schoolA.id,
        sessionId: session.id,
        name: "Class 10",
      },
    });

    const exam = await prisma.exam.create({
      data: {
        schoolId: schoolA.id,
        classId: cls.id,
        name: "Midterm Exams",
      },
    });

    const subject = await prisma.subject.create({
      data: {
        schoolId: schoolA.id,
        name: "Mathematics",
        code: `MATH_${Date.now()}`,
      },
    });

    const examSub = await prisma.examSubject.create({
      data: {
        examId: exam.id,
        subjectId: subject.id,
        maxMarks: 100,
        passMarks: 35,
      },
    });

    // Marks: Alice (70 -> PASS), Bob (20 -> FAIL) -> 50% Pass Rate
    await prisma.studentMark.create({
      data: { studentId: students[0].id, examSubjectId: examSub.id, marksObtained: 70 },
    });
    await prisma.studentMark.create({
      data: { studentId: students[1].id, examSubjectId: examSub.id, marksObtained: 20 },
    });

    // Invoices:
    // Invoice 1: amount 1000, amountPaid 1000, remaining 0 (PAID)
    // Invoice 2: amount 1000, amountPaid 500, remaining 500 (OVERDUE)
    // Total Billed = 2000, Total Collected = 1500 -> Collection Efficiency = 75%
    // Outstanding Dues = 500, Defaulters = 1
    await prisma.invoice.create({
      data: {
        schoolId: schoolA.id,
        studentId: students[0].id,
        amount: 1000,
        amountPaid: 1000,
        remainingAmount: 0,
        status: "PAID",
        dueDate: new Date(currentYear, 2, 1),
      },
    });
    await prisma.invoice.create({
      data: {
        schoolId: schoolA.id,
        studentId: students[1].id,
        amount: 1000,
        amountPaid: 500,
        remainingAmount: 500,
        status: "OVERDUE",
        isOverdue: true,
        dueDate: new Date(currentYear, 1, 1),
      },
    });

    // Payroll: 1 salary netPay 45,000 (PAID) -> 45,000
    await prisma.salary.create({
      data: {
        schoolId: schoolA.id,
        teacherId: teacher.id,
        month: now.getMonth() + 1,
        year: currentYear,
        basicPay: 40000,
        netPay: 45000,
        status: "PAID",
      },
    });

    // Hostel: Room capacity 10, 5 active allocations -> 50%
    const room = await prisma.hostelRoom.create({
      data: {
        schoolId: schoolA.id,
        building: "Block A",
        roomNumber: "101",
        capacity: 10,
        gender: "BOYS",
      },
    });
    for (let i = 0; i < 5; i++) {
      await prisma.hostelAllocation.create({
        data: {
          schoolId: schoolA.id,
          studentId: students[i % 4].id,
          roomId: room.id,
          startDate: now,
          status: "ACTIVE",
        },
      });
    }

    // Library: 2 books, 2 active issues -> 2
    const book = await prisma.book.create({
      data: {
        schoolId: schoolA.id,
        title: "Clean Code",
        author: "Robert Martin",
        isbn: `ISBN_${Date.now()}`,
      },
    });
    await prisma.bookIssue.create({
      data: {
        schoolId: schoolA.id,
        bookId: book.id,
        userId: students[0].id,
        dueDate: new Date(Date.now() + 7 * 86400000),
        status: "ISSUED",
      },
    });
    await prisma.bookIssue.create({
      data: {
        schoolId: schoolA.id,
        bookId: book.id,
        userId: students[1].id,
        dueDate: new Date(Date.now() + 7 * 86400000),
        status: "ISSUED",
      },
    });

    // Inventory: item with qty 2, reorderLevel 5 -> 1 low stock item
    await prisma.inventoryItem.create({
      data: {
        schoolId: schoolA.id,
        name: "Notebooks",
        sku: `SKU_NB_${Date.now()}`,
        quantity: 2,
        reorderLevel: 5,
        isActive: true,
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Setup School B (Separate Tenant)
    // ─────────────────────────────────────────────────────────────────────────
    schoolB = await createTestSchool();
    const adminBData = await createTestUser(Role.ERP_ADMIN, schoolB.id);
    adminBToken = adminBData.token;

    // School B has 1 active student and zero attendance/invoices
    await prisma.student.create({
      data: {
        schoolId: schoolB.id,
        name: "Student B",
        rollNo: "RB01",
        admissionNo: `ADM_B_${Date.now()}`,
        isActive: true,
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Setup School Empty (Zero Data)
    // ─────────────────────────────────────────────────────────────────────────
    schoolEmpty = await createTestSchool();
    const adminEmptyData = await createTestUser(Role.ERP_ADMIN, schoolEmpty.id);
    adminEmptyToken = adminEmptyData.token;

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Setup Super Admin with PLATFORM Token
    // ─────────────────────────────────────────────────────────────────────────
    const superAdminData = await createTestUser(Role.SUPER_ADMIN);
    superAdminToken = superAdminData.token;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Formula & Value Verification
  // ───────────────────────────────────────────────────────────────────────────

  it("verifies exact deterministic formula results for School A", async () => {
    const res = await request(app)
      .get("/api/v1/kpi/school")
      .set("Authorization", `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.schoolId).toBe(schoolA.id);

    const kpiMap = new Map<string, KpiPayloadItem>(res.body.data.map((k: KpiPayloadItem) => [k.id, k]));

    // 1. Admissions: 5 students created in current year
    expect(kpiMap.get("kpi_school_admissions")?.value).toBe(5);
    expect(kpiMap.get("kpi_school_admissions")?.status).toBe("OK");

    // 2. Active Students: 4 active
    expect(kpiMap.get("kpi_school_active_students")?.value).toBe(4);
    expect(kpiMap.get("kpi_school_active_students")?.status).toBe("OK");

    // 3. Student Attendance: 3 present out of 4 = 75.00%
    expect(kpiMap.get("kpi_school_student_attendance_rate")?.value).toBe(75);
    expect(kpiMap.get("kpi_school_student_attendance_rate")?.status).toBe("OK");

    // 4. Staff Attendance: 1 present out of 1 = 100.00%
    expect(kpiMap.get("kpi_school_staff_attendance_rate")?.value).toBe(100);
    expect(kpiMap.get("kpi_school_staff_attendance_rate")?.status).toBe("OK");

    // 5. Exam Pass Rate: 1 passed (70 >= 35), 1 failed (20 < 35) = 50.00%
    expect(kpiMap.get("kpi_school_exam_pass_rate")?.value).toBe(50);
    expect(kpiMap.get("kpi_school_exam_pass_rate")?.status).toBe("OK");

    // 6. Fee Collection Efficiency: 1500 collected / 2000 billed = 75.00%
    expect(kpiMap.get("kpi_school_fee_collection_efficiency")?.value).toBe(75);
    expect(kpiMap.get("kpi_school_fee_collection_efficiency")?.status).toBe("OK");

    // 7. Outstanding Fee Dues: 500
    expect(kpiMap.get("kpi_school_fee_dues")?.value).toBe(500);
    expect(kpiMap.get("kpi_school_fee_dues")?.status).toBe("OK");

    // 8. Fee Defaulters: 1
    expect(kpiMap.get("kpi_school_fee_defaulters")?.value).toBe(1);
    expect(kpiMap.get("kpi_school_fee_defaulters")?.status).toBe("OK");

    // 9. Payroll Cost & Net Cash Flow: marked NO_DATA with 'payroll not enabled'
    expect(kpiMap.get("kpi_school_monthly_payroll_cost")?.value).toBeNull();
    expect(kpiMap.get("kpi_school_monthly_payroll_cost")?.status).toBe("NO_DATA");
    expect(kpiMap.get("kpi_school_monthly_payroll_cost")?.reason).toBe("payroll not enabled");
    expect(kpiMap.get("kpi_school_net_cash_flow")?.value).toBeNull();
    expect(kpiMap.get("kpi_school_net_cash_flow")?.status).toBe("NO_DATA");
    expect(kpiMap.get("kpi_school_net_cash_flow")?.reason).toBe("payroll not enabled");

    // 10. Hostel Occupancy: 5 allocated / 10 capacity = 50.00%
    expect(kpiMap.get("kpi_school_hostel_occupancy")?.value).toBe(50);
    expect(kpiMap.get("kpi_school_hostel_occupancy")?.status).toBe("OK");

    // 11. Library Circulation: 2 books issued
    expect(kpiMap.get("kpi_school_library_circulation")?.value).toBe(2);
    expect(kpiMap.get("kpi_school_library_circulation")?.status).toBe("OK");

    // 12. Inventory Low Stock: 1 low stock item
    expect(kpiMap.get("kpi_school_inventory_low_stock")?.value).toBe(1);
    expect(kpiMap.get("kpi_school_inventory_low_stock")?.status).toBe("OK");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Multi-Tenancy Isolation
  // ───────────────────────────────────────────────────────────────────────────

  it("ensures School B never sees School A's data under RLS", async () => {
    const resB = await request(app)
      .get("/api/v1/kpi/school")
      .set("Authorization", `Bearer ${adminBToken}`);

    expect(resB.status).toBe(200);
    expect(resB.body.schoolId).toBe(schoolB.id);

    const kpiMapB = new Map<string, KpiPayloadItem>(resB.body.data.map((k: KpiPayloadItem) => [k.id, k]));

    // School B has 1 student, 0 invoices, 0 marks, 0 attendance
    expect(kpiMapB.get("kpi_school_active_students")?.value).toBe(1);

    // Attendance rate for School B must be NO_DATA (never School A's 75%)
    expect(kpiMapB.get("kpi_school_student_attendance_rate")?.status).toBe("NO_DATA");
    expect(kpiMapB.get("kpi_school_student_attendance_rate")?.value).toBeNull();

    // Fee dues for School B must be NO_DATA (never School A's 500)
    expect(kpiMapB.get("kpi_school_fee_dues")?.status).toBe("NO_DATA");
    expect(kpiMapB.get("kpi_school_fee_dues")?.value).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Empty School Returns NO_DATA (Never 0 or Fake Defaults)
  // ───────────────────────────────────────────────────────────────────────────

  it("returns NO_DATA (never 0 or fake defaults) for an empty school", async () => {
    const res = await request(app)
      .get("/api/v1/kpi/school")
      .set("Authorization", `Bearer ${adminEmptyToken}`);

    expect(res.status).toBe(200);
    const kpiMap = new Map<string, KpiPayloadItem>(res.body.data.map((k: KpiPayloadItem) => [k.id, k]));

    // When there are no students, exams, or attendance, status is NO_DATA
    expect(kpiMap.get("kpi_school_active_students")?.status).toBe("NO_DATA");
    expect(kpiMap.get("kpi_school_active_students")?.value).toBeNull();

    expect(kpiMap.get("kpi_school_student_attendance_rate")?.status).toBe("NO_DATA");
    expect(kpiMap.get("kpi_school_student_attendance_rate")?.value).toBeNull();

    expect(kpiMap.get("kpi_school_exam_pass_rate")?.status).toBe("NO_DATA");
    expect(kpiMap.get("kpi_school_exam_pass_rate")?.value).toBeNull();

    expect(kpiMap.get("kpi_school_fee_collection_efficiency")?.status).toBe("NO_DATA");
    expect(kpiMap.get("kpi_school_fee_collection_efficiency")?.value).toBeNull();

    expect(kpiMap.get("kpi_school_fee_dues")?.status).toBe("NO_DATA");
    expect(kpiMap.get("kpi_school_fee_dues")?.value).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Disabled Module Returns MODULE_DISABLED
  // ───────────────────────────────────────────────────────────────────────────

  it("returns MODULE_DISABLED when optional module is not enabled", async () => {
    // Disable HOSTEL for School A
    await ModuleRegistryService.setSchoolEntitlement(schoolA.id, "HOSTEL", false);

    const res = await request(app)
      .get("/api/v1/kpi/school")
      .set("Authorization", `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    const kpiMap = new Map<string, KpiPayloadItem>(res.body.data.map((k: KpiPayloadItem) => [k.id, k]));

    const hostelKpi = kpiMap.get("kpi_school_hostel_occupancy");
    expect(hostelKpi?.status).toBe("MODULE_DISABLED");
    expect(hostelKpi?.value).toBeNull();
    expect(hostelKpi?.reason).toContain("HOSTEL");

    // Re-enable HOSTEL
    await ModuleRegistryService.setSchoolEntitlement(schoolA.id, "HOSTEL", true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Old Stats Routes Deprecation Checks
  // ───────────────────────────────────────────────────────────────────────────

  it("verifies deleted /stats/detailed and /stats/finance return 404", async () => {
    const resDetailed = await request(app).get("/api/v1/stats/detailed");
    expect(resDetailed.status).toBe(404);

    const resFinance = await request(app)
      .get("/api/v1/stats/finance")
      .set("Authorization", `Bearer ${adminAToken}`);
    expect(resFinance.status).toBe(404);
  });

  it("verifies /stats/public returns explicit aggregate data without fake defaults", async () => {
    const res = await request(app)
      .get(`/api/v1/stats/public?schoolId=${schoolA.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isPublic).toBe(true);
    expect(res.body.scope).toBe("PUBLIC_AGGREGATE");
    expect(res.headers["cache-control"]).toContain("public");

    // Real computed pass rate: 50% (never fake 98%)
    expect(res.body.data.passRate).toBe(50);
    expect(res.body.data.studentCount).toBe(4);
    expect(res.body.data.teacherCount).toBe(1);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Payroll & Cash Flow Legacy Isolation
  // ───────────────────────────────────────────────────────────────────────────

  it("verifies payroll cost and net cash flow return NO_DATA with 'payroll not enabled'", async () => {
    const res = await request(app)
      .get("/api/v1/kpi/school")
      .set("Authorization", `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    const kpiMap = new Map<string, KpiPayloadItem>(res.body.data.map((k: KpiPayloadItem) => [k.id, k]));

    const payrollKpi = kpiMap.get("kpi_school_monthly_payroll_cost");
    expect(payrollKpi?.status).toBe("NO_DATA");
    expect(payrollKpi?.value).toBeNull();
    expect(payrollKpi?.reason).toBe("payroll not enabled");

    const cashFlowKpi = kpiMap.get("kpi_school_net_cash_flow");
    expect(cashFlowKpi?.status).toBe("NO_DATA");
    expect(cashFlowKpi?.value).toBeNull();
    expect(cashFlowKpi?.reason).toBe("payroll not enabled");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Computation Error Handling
  // ───────────────────────────────────────────────────────────────────────────

  it("returns status ERROR with reason (never NO_DATA) when a KPI computation fails", async () => {
    const faultyKpi = {
      id: "kpi_test_faulty",
      name: "Faulty Test KPI",
      ownerModule: "TEST",
      formula: "1 / 0 (crash)",
      periodType: "REALTIME" as const,
      scope: "SCHOOL" as const,
      unit: "count" as const,
      compute: async () => {
        throw new Error("Simulated database timeout or calculation crash");
      },
    };

    const result = await KpiRegistry.evaluateKpi(faultyKpi, { prisma });
    expect(result.status).toBe("ERROR");
    expect(result.value).toBeNull();
    expect(result.reason).toBe("Simulated database timeout or calculation crash");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Platform KPIs & Prometheus Metrics
  // ───────────────────────────────────────────────────────────────────────────

  it("verifies GET /api/v1/platform/kpi returns real numbers for platform KPIs and Prometheus metrics", async () => {
    const res = await request(app)
      .get("/api/v1/platform/kpi")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.audience).toBe("PLATFORM");

    // Platform Health Prometheus metric summary
    expect(typeof res.body.data.platformHealth.prometheus.http_requests_total).toBe("number");
    expect(res.body.data.platformHealth.prometheus.http_requests_total).toBeGreaterThanOrEqual(1);

    // Platform KPI array
    const platformKpis = res.body.data.kpis as KpiPayloadItem[];
    const kpiMap = new Map<string, KpiPayloadItem>(platformKpis.map((k) => [k.id, k]));

    // kpi_platform_support_sessions_active must return a real number
    const supportSessionsKpi = kpiMap.get("kpi_platform_support_sessions_active");
    expect(supportSessionsKpi).toBeDefined();
    expect(supportSessionsKpi?.status).toBe("OK");
    expect(typeof supportSessionsKpi?.value).toBe("number");
    expect(supportSessionsKpi?.value).toBeGreaterThanOrEqual(0);

    // kpi_platform_api_error_rate must return a real number
    const apiErrorRateKpi = kpiMap.get("kpi_platform_api_error_rate");
    expect(apiErrorRateKpi).toBeDefined();
    expect(apiErrorRateKpi?.status).toBe("OK");
    expect(typeof apiErrorRateKpi?.value).toBe("number");
    expect(apiErrorRateKpi?.value).toBeGreaterThanOrEqual(0);
  });
});
