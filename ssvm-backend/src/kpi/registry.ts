import { PrismaClient } from "@prisma/client";

export type KpiScope = "SCHOOL" | "PLATFORM";
export type KpiPeriodType = "REALTIME" | "DAILY" | "MONTHLY" | "ACADEMIC_YEAR";
export type KpiUnit = "count" | "percentage" | "currency" | "ratio";
export type KpiStatus = "OK" | "NO_DATA" | "MODULE_DISABLED";

export interface KpiComputeContext {
  prisma: PrismaClient;
  schoolId?: string;
  userId?: string;
  role?: string;
  targetDate?: Date;
  periodStart?: Date;
  periodEnd?: Date;
  activeModules?: string[];
}

export interface KpiDefinition {
  id: string;
  name: string;
  ownerModule: string;
  formula: string;
  periodType: KpiPeriodType;
  scope: KpiScope;
  requiredModule?: string;
  unit: KpiUnit;
  compute: (context: KpiComputeContext) => Promise<number | null>;
}

export interface KpiResult {
  id: string;
  name: string;
  ownerModule: string;
  value: number | null;
  unit: KpiUnit;
  asOf: string;
  period: KpiPeriodType;
  status: KpiStatus;
  reason?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPI DEFINITION REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const KPI_REGISTRY: KpiDefinition[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // 1. School Operational & Academic KPIs (K3)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "kpi_school_admissions",
    name: "New Student Admissions",
    ownerModule: "ACADEMICS",
    formula: "COUNT(Student) WHERE admissionDate >= periodStart AND admissionDate <= periodEnd AND deletedAt IS NULL",
    periodType: "ACADEMIC_YEAR",
    scope: "SCHOOL",
    unit: "count",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const totalStudents = await ctx.prisma.student.count({
        where: { schoolId: ctx.schoolId, deletedAt: null },
      });
      if (totalStudents === 0) return null;

      const filter: Record<string, unknown> = {
        schoolId: ctx.schoolId,
        deletedAt: null,
      };
      if (ctx.periodStart && ctx.periodEnd) {
        filter.admissionDate = { gte: ctx.periodStart, lte: ctx.periodEnd };
      } else if (ctx.periodStart) {
        filter.admissionDate = { gte: ctx.periodStart };
      }
      const count = await ctx.prisma.student.count({ where: filter });
      return count;
    },
  },
  {
    id: "kpi_school_active_students",
    name: "Enrolled Active Students",
    ownerModule: "ACADEMICS",
    formula: "COUNT(Student) WHERE isActive = true AND deletedAt IS NULL",
    periodType: "REALTIME",
    scope: "SCHOOL",
    unit: "count",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const total = await ctx.prisma.student.count({
        where: { schoolId: ctx.schoolId, deletedAt: null },
      });
      if (total === 0) return null;
      const activeCount = await ctx.prisma.student.count({
        where: { schoolId: ctx.schoolId, isActive: true, deletedAt: null },
      });
      return activeCount;
    },
  },
  {
    id: "kpi_school_student_attendance_rate",
    name: "Student Attendance Rate",
    ownerModule: "ACADEMICS",
    formula: "(COUNT(Attendance WHERE status = 'PRESENT') / COUNT(Attendance)) * 100",
    periodType: "MONTHLY",
    scope: "SCHOOL",
    unit: "percentage",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const filter: Record<string, unknown> = { schoolId: ctx.schoolId };
      if (ctx.periodStart && ctx.periodEnd) {
        filter.date = { gte: ctx.periodStart, lte: ctx.periodEnd };
      }
      const total = await ctx.prisma.attendance.count({ where: filter });
      if (total === 0) return null;
      const present = await ctx.prisma.attendance.count({
        where: { ...filter, status: "PRESENT" },
      });
      return Math.round((present / total) * 10000) / 100;
    },
  },
  {
    id: "kpi_school_staff_attendance_rate",
    name: "Staff Attendance Rate",
    ownerModule: "HR_PAYROLL",
    formula: "(COUNT(TeacherAttendance WHERE status = 'PRESENT') / COUNT(TeacherAttendance)) * 100",
    periodType: "MONTHLY",
    scope: "SCHOOL",
    unit: "percentage",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const filter: Record<string, unknown> = { teacher: { schoolId: ctx.schoolId } };
      if (ctx.periodStart && ctx.periodEnd) {
        filter.date = { gte: ctx.periodStart, lte: ctx.periodEnd };
      }
      const total = await ctx.prisma.teacherAttendance.count({ where: filter });
      if (total === 0) return null;
      const present = await ctx.prisma.teacherAttendance.count({
        where: { ...filter, status: "PRESENT" },
      });
      return Math.round((present / total) * 10000) / 100;
    },
  },
  {
    id: "kpi_school_exam_pass_rate",
    name: "Examination Pass Rate",
    ownerModule: "EXAMS",
    formula: "(COUNT(StudentMark WHERE marksObtained >= examSubject.passMarks) / COUNT(StudentMark)) * 100",
    periodType: "ACADEMIC_YEAR",
    scope: "SCHOOL",
    unit: "percentage",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const marks = await ctx.prisma.studentMark.findMany({
        where: { student: { schoolId: ctx.schoolId, deletedAt: null } },
        select: {
          marksObtained: true,
          examSubject: { select: { passMarks: true, maxMarks: true } },
        },
      });
      if (marks.length === 0) return null;
      const passedCount = marks.filter((m) => {
        const threshold = m.examSubject?.passMarks ?? 33;
        return m.marksObtained >= threshold;
      }).length;
      return Math.round((passedCount / marks.length) * 10000) / 100;
    },
  },
  {
    id: "kpi_school_fee_collection_efficiency",
    name: "Fee Collection Efficiency",
    ownerModule: "FINANCE",
    formula: "(SUM(Invoice.amountPaid) / SUM(Invoice.amount)) * 100",
    periodType: "ACADEMIC_YEAR",
    scope: "SCHOOL",
    unit: "percentage",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const invoices = await ctx.prisma.invoice.findMany({
        where: { schoolId: ctx.schoolId, isVoided: false },
        select: { amount: true, amountPaid: true },
      });
      if (invoices.length === 0) return null;
      const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
      if (totalBilled <= 0) return null;
      const totalCollected = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
      return Math.round((totalCollected / totalBilled) * 10000) / 100;
    },
  },
  {
    id: "kpi_school_fee_dues",
    name: "Outstanding Student Fee Dues",
    ownerModule: "FINANCE",
    formula: "SUM(Invoice.remainingAmount WHERE status IN ('PENDING', 'PARTIAL', 'OVERDUE') AND isVoided = false)",
    periodType: "REALTIME",
    scope: "SCHOOL",
    unit: "currency",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const invoices = await ctx.prisma.invoice.findMany({
        where: {
          schoolId: ctx.schoolId,
          isVoided: false,
          status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
        },
        select: { remainingAmount: true },
      });
      if (invoices.length === 0) {
        const anyInvoices = await ctx.prisma.invoice.count({
          where: { schoolId: ctx.schoolId, isVoided: false },
        });
        if (anyInvoices === 0) return null;
        return 0;
      }
      const sum = invoices.reduce((acc, inv) => acc + Number(inv.remainingAmount), 0);
      return Math.round(sum * 100) / 100;
    },
  },
  {
    id: "kpi_school_fee_defaulters",
    name: "Fee Defaulter Student Count",
    ownerModule: "FINANCE",
    formula: "COUNT(DISTINCT studentId FROM Invoice WHERE isOverdue = true OR (dueDate < NOW() AND remainingAmount > 0 AND isVoided = false))",
    periodType: "REALTIME",
    scope: "SCHOOL",
    unit: "count",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const anyInvoices = await ctx.prisma.invoice.count({
        where: { schoolId: ctx.schoolId, isVoided: false },
      });
      if (anyInvoices === 0) return null;

      const overdueInvoices = await ctx.prisma.invoice.findMany({
        where: {
          schoolId: ctx.schoolId,
          isVoided: false,
          remainingAmount: { gt: 0 },
          OR: [{ isOverdue: true }, { dueDate: { lt: new Date() } }],
        },
        select: { studentId: true },
        distinct: ["studentId"],
      });
      return overdueInvoices.length;
    },
  },
  {
    id: "kpi_school_refund_rate",
    name: "Fee Refund Ratio",
    ownerModule: "FINANCE",
    formula: "(SUM(DailyRevenueProjection.totalRefunded) / SUM(DailyRevenueProjection.totalCollected)) * 100",
    periodType: "ACADEMIC_YEAR",
    scope: "SCHOOL",
    unit: "percentage",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const projections = await ctx.prisma.dailyRevenueProjection.findMany({
        where: { schoolId: ctx.schoolId },
        select: { totalCollected: true, totalRefunded: true },
      });
      if (projections.length === 0) return null;
      const collected = projections.reduce((acc, p) => acc + p.totalCollected, 0);
      if (collected <= 0) return null;
      const refunded = projections.reduce((acc, p) => acc + p.totalRefunded, 0);
      return Math.round((refunded / collected) * 10000) / 100;
    },
  },
  {
    id: "kpi_school_monthly_payroll_cost",
    name: "Monthly Staff Payroll Cost",
    ownerModule: "HR_PAYROLL",
    formula: "SUM(Salary.netPay WHERE month = currentMonth AND year = currentYear AND status = 'PAID')",
    periodType: "MONTHLY",
    scope: "SCHOOL",
    unit: "currency",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const now = ctx.targetDate || new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const salaries = await ctx.prisma.salary.findMany({
        where: {
          schoolId: ctx.schoolId,
          month: currentMonth,
          year: currentYear,
          status: "PAID",
        },
        select: { netPay: true },
      });
      if (salaries.length === 0) {
        const anySalaries = await ctx.prisma.salary.count({
          where: { schoolId: ctx.schoolId },
        });
        if (anySalaries === 0) return null;
        return 0;
      }
      const sum = salaries.reduce((acc, s) => acc + Number(s.netPay), 0);
      return Math.round(sum * 100) / 100;
    },
  },
  {
    id: "kpi_school_hostel_occupancy",
    name: "Hostel Bed Occupancy Rate",
    ownerModule: "HOSTEL",
    formula: "(COUNT(HostelAllocation WHERE status = 'ACTIVE') / SUM(HostelRoom.capacity)) * 100",
    periodType: "REALTIME",
    scope: "SCHOOL",
    requiredModule: "HOSTEL",
    unit: "percentage",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const rooms = await ctx.prisma.hostelRoom.findMany({
        where: { schoolId: ctx.schoolId },
        select: { capacity: true },
      });
      if (rooms.length === 0) return null;
      const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
      if (totalCapacity <= 0) return null;
      const activeAllocations = await ctx.prisma.hostelAllocation.count({
        where: { schoolId: ctx.schoolId, status: "ACTIVE" },
      });
      return Math.round((activeAllocations / totalCapacity) * 10000) / 100;
    },
  },
  {
    id: "kpi_school_library_circulation",
    name: "Active Library Book Circulations",
    ownerModule: "LIBRARY",
    formula: "COUNT(BookIssue WHERE status = 'ISSUED' AND returnDate IS NULL)",
    periodType: "REALTIME",
    scope: "SCHOOL",
    requiredModule: "LIBRARY",
    unit: "count",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const anyBooks = await ctx.prisma.book.count({
        where: { schoolId: ctx.schoolId },
      });
      if (anyBooks === 0) return null;
      const activeCirculation = await ctx.prisma.bookIssue.count({
        where: { schoolId: ctx.schoolId, status: "ISSUED", returnDate: null },
      });
      return activeCirculation;
    },
  },
  {
    id: "kpi_school_inventory_low_stock",
    name: "Inventory Low Stock Alerts",
    ownerModule: "INVENTORY",
    formula: "COUNT(InventoryItem WHERE isActive = true AND quantity <= reorderLevel)",
    periodType: "REALTIME",
    scope: "SCHOOL",
    requiredModule: "INVENTORY",
    unit: "count",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const items = await ctx.prisma.inventoryItem.findMany({
        where: { schoolId: ctx.schoolId, isActive: true },
        select: { quantity: true, reorderLevel: true },
      });
      if (items.length === 0) return null;
      const lowStockCount = items.filter(
        (i) => Number(i.quantity) <= Number(i.reorderLevel)
      ).length;
      return lowStockCount;
    },
  },
  {
    id: "kpi_school_notification_delivery_rate",
    name: "Notification Delivery Success Rate",
    ownerModule: "COMMUNICATIONS",
    formula: "(COUNT(Notification WHERE status = 'SENT') / COUNT(Notification)) * 100",
    periodType: "MONTHLY",
    scope: "SCHOOL",
    requiredModule: "COMMUNICATIONS",
    unit: "percentage",
    compute: async (ctx) => {
      if (!ctx.schoolId) return null;
      const filter: Record<string, unknown> = { schoolId: ctx.schoolId };
      if (ctx.periodStart && ctx.periodEnd) {
        filter.createdAt = { gte: ctx.periodStart, lte: ctx.periodEnd };
      }
      const total = await ctx.prisma.notification.count({ where: filter });
      if (total === 0) return null;
      const delivered = await ctx.prisma.notification.count({
        where: { ...filter, status: "SENT" },
      });
      return Math.round((delivered / total) * 10000) / 100;
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Role-Scoped KPIs (K4: Teacher, Student, Parent)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "kpi_teacher_classes_count",
    name: "Teacher Assigned Sections Count",
    ownerModule: "ACADEMICS",
    formula: "COUNT(TeacherSubjectAssignment WHERE teacherId = :teacherId)",
    periodType: "REALTIME",
    scope: "SCHOOL",
    unit: "count",
    compute: async (ctx) => {
      if (!ctx.schoolId || !ctx.userId) return null;
      const teacher = await ctx.prisma.teacher.findFirst({
        where: { userId: ctx.userId, schoolId: ctx.schoolId },
      });
      if (!teacher) return null;
      const count = await ctx.prisma.teacherSubjectAssignment.count({
        where: { teacherId: teacher.id },
      });
      return count;
    },
  },
  {
    id: "kpi_teacher_class_attendance_rate",
    name: "Teacher Classroom Student Attendance Rate",
    ownerModule: "ACADEMICS",
    formula: "(COUNT(Attendance WHERE status = 'PRESENT' AND sectionId IN (:teacherSections)) / COUNT(Attendance)) * 100",
    periodType: "MONTHLY",
    scope: "SCHOOL",
    unit: "percentage",
    compute: async (ctx) => {
      if (!ctx.schoolId || !ctx.userId) return null;
      const teacher = await ctx.prisma.teacher.findFirst({
        where: { userId: ctx.userId, schoolId: ctx.schoolId },
      });
      if (!teacher) return null;

      const assignments = await ctx.prisma.teacherSubjectAssignment.findMany({
        where: { teacherId: teacher.id },
        select: { sectionId: true },
      });
      const sectionIds = assignments.map((a) => a.sectionId);
      if (sectionIds.length === 0) return null;

      const total = await ctx.prisma.attendance.count({
        where: { sectionId: { in: sectionIds } },
      });
      if (total === 0) return null;
      const present = await ctx.prisma.attendance.count({
        where: { sectionId: { in: sectionIds }, status: "PRESENT" },
      });
      return Math.round((present / total) * 10000) / 100;
    },
  },
  {
    id: "kpi_student_own_attendance_rate",
    name: "Student Personal Attendance Rate",
    ownerModule: "ACADEMICS",
    formula: "(COUNT(Attendance WHERE studentId = :studentId AND status = 'PRESENT') / COUNT(Attendance)) * 100",
    periodType: "MONTHLY",
    scope: "SCHOOL",
    unit: "percentage",
    compute: async (ctx) => {
      if (!ctx.schoolId || !ctx.userId) return null;
      const student = await ctx.prisma.student.findFirst({
        where: { OR: [{ userId: ctx.userId }, { id: ctx.userId }], schoolId: ctx.schoolId },
      });
      if (!student) return null;
      const total = await ctx.prisma.attendance.count({
        where: { studentId: student.id },
      });
      if (total === 0) return null;
      const present = await ctx.prisma.attendance.count({
        where: { studentId: student.id, status: "PRESENT" },
      });
      return Math.round((present / total) * 10000) / 100;
    },
  },
  {
    id: "kpi_student_own_fee_due",
    name: "Student Personal Outstanding Fee Dues",
    ownerModule: "FINANCE",
    formula: "SUM(Invoice.remainingAmount WHERE studentId = :studentId AND isVoided = false)",
    periodType: "REALTIME",
    scope: "SCHOOL",
    unit: "currency",
    compute: async (ctx) => {
      if (!ctx.schoolId || !ctx.userId) return null;
      const student = await ctx.prisma.student.findFirst({
        where: { OR: [{ userId: ctx.userId }, { id: ctx.userId }], schoolId: ctx.schoolId },
      });
      if (!student) return null;
      const invoices = await ctx.prisma.invoice.findMany({
        where: { studentId: student.id, isVoided: false },
        select: { remainingAmount: true },
      });
      if (invoices.length === 0) return null;
      const sum = invoices.reduce((acc, inv) => acc + Number(inv.remainingAmount), 0);
      return Math.round(sum * 100) / 100;
    },
  },
  {
    id: "kpi_student_own_average_marks",
    name: "Student Personal Academic Average Marks",
    ownerModule: "EXAMS",
    formula: "AVG((StudentMark.marksObtained / ExamSubject.maxMarks) * 100)",
    periodType: "ACADEMIC_YEAR",
    scope: "SCHOOL",
    unit: "percentage",
    compute: async (ctx) => {
      if (!ctx.schoolId || !ctx.userId) return null;
      const student = await ctx.prisma.student.findFirst({
        where: { OR: [{ userId: ctx.userId }, { id: ctx.userId }], schoolId: ctx.schoolId },
      });
      if (!student) return null;
      const marks = await ctx.prisma.studentMark.findMany({
        where: { studentId: student.id },
        select: { marksObtained: true, examSubject: { select: { maxMarks: true } } },
      });
      if (marks.length === 0) return null;
      const valid = marks.filter((m) => (m.examSubject?.maxMarks ?? 0) > 0);
      if (valid.length === 0) return null;
      const percentages = valid.map(
        (m) => (m.marksObtained / m.examSubject!.maxMarks) * 100
      );
      const avg = percentages.reduce((a, b) => a + b, 0) / valid.length;
      return Math.round(avg * 100) / 100;
    },
  },
  {
    id: "kpi_student_own_books_borrowed",
    name: "Student Active Borrowed Books Count",
    ownerModule: "LIBRARY",
    formula: "COUNT(BookIssue WHERE userId = :studentId AND status = 'ISSUED')",
    periodType: "REALTIME",
    scope: "SCHOOL",
    requiredModule: "LIBRARY",
    unit: "count",
    compute: async (ctx) => {
      if (!ctx.schoolId || !ctx.userId) return null;
      const student = await ctx.prisma.student.findFirst({
        where: { OR: [{ userId: ctx.userId }, { id: ctx.userId }], schoolId: ctx.schoolId },
      });
      if (!student) return null;
      const count = await ctx.prisma.bookIssue.count({
        where: { userId: student.id, status: "ISSUED" },
      });
      return count;
    },
  },
  {
    id: "kpi_parent_children_count",
    name: "Parent Enrolled Wards Count",
    ownerModule: "ACADEMICS",
    formula: "COUNT(StudentGuardian WHERE guardianId = :guardianId)",
    periodType: "REALTIME",
    scope: "SCHOOL",
    unit: "count",
    compute: async (ctx) => {
      if (!ctx.schoolId || !ctx.userId) return null;
      const guardian = await ctx.prisma.guardian.findFirst({
        where: { OR: [{ userId: ctx.userId }, { id: ctx.userId }], schoolId: ctx.schoolId },
      });
      if (!guardian) return null;
      const count = await ctx.prisma.studentGuardian.count({
        where: { guardianId: guardian.id },
      });
      return count;
    },
  },
  {
    id: "kpi_parent_total_fee_due",
    name: "Parent Wards Total Outstanding Fee Dues",
    ownerModule: "FINANCE",
    formula: "SUM(Invoice.remainingAmount WHERE studentId IN (:wardIds) AND isVoided = false)",
    periodType: "REALTIME",
    scope: "SCHOOL",
    unit: "currency",
    compute: async (ctx) => {
      if (!ctx.schoolId || !ctx.userId) return null;
      const guardian = await ctx.prisma.guardian.findFirst({
        where: { OR: [{ userId: ctx.userId }, { id: ctx.userId }], schoolId: ctx.schoolId },
        include: { studentGuardians: { select: { studentId: true } } },
      });
      if (!guardian || guardian.studentGuardians.length === 0) return null;
      const studentIds = guardian.studentGuardians.map((sg) => sg.studentId);
      const invoices = await ctx.prisma.invoice.findMany({
        where: { studentId: { in: studentIds }, isVoided: false },
        select: { remainingAmount: true },
      });
      if (invoices.length === 0) return 0;
      const sum = invoices.reduce((acc, inv) => acc + Number(inv.remainingAmount), 0);
      return Math.round(sum * 100) / 100;
    },
  },
  {
    id: "kpi_parent_average_children_attendance",
    name: "Parent Wards Average Attendance Rate",
    ownerModule: "ACADEMICS",
    formula: "(COUNT(Attendance WHERE studentId IN (:wardIds) AND status = 'PRESENT') / COUNT(Attendance)) * 100",
    periodType: "MONTHLY",
    scope: "SCHOOL",
    unit: "percentage",
    compute: async (ctx) => {
      if (!ctx.schoolId || !ctx.userId) return null;
      const guardian = await ctx.prisma.guardian.findFirst({
        where: { OR: [{ userId: ctx.userId }, { id: ctx.userId }], schoolId: ctx.schoolId },
        include: { studentGuardians: { select: { studentId: true } } },
      });
      if (!guardian || guardian.studentGuardians.length === 0) return null;
      const studentIds = guardian.studentGuardians.map((sg) => sg.studentId);
      const total = await ctx.prisma.attendance.count({
        where: { studentId: { in: studentIds } },
      });
      if (total === 0) return null;
      const present = await ctx.prisma.attendance.count({
        where: { studentId: { in: studentIds }, status: "PRESENT" },
      });
      return Math.round((present / total) * 10000) / 100;
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Platform Health & Lifecycle KPIs (K5)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "kpi_platform_schools_total",
    name: "Platform Registered Schools",
    ownerModule: "PLATFORM",
    formula: "COUNT(School WHERE deletedAt IS NULL)",
    periodType: "REALTIME",
    scope: "PLATFORM",
    unit: "count",
    compute: async (ctx) => {
      const count = await ctx.prisma.school.count({ where: { deletedAt: null } });
      return count === 0 ? null : count;
    },
  },
  {
    id: "kpi_platform_schools_active",
    name: "Platform Active Schools",
    ownerModule: "PLATFORM",
    formula: "COUNT(School WHERE status = 'ACTIVE' AND deletedAt IS NULL)",
    periodType: "REALTIME",
    scope: "PLATFORM",
    unit: "count",
    compute: async (ctx) => {
      const count = await ctx.prisma.school.count({
        where: { status: "ACTIVE", deletedAt: null },
      });
      return count;
    },
  },
  {
    id: "kpi_platform_schools_suspended",
    name: "Platform Suspended Schools",
    ownerModule: "PLATFORM",
    formula: "COUNT(School WHERE status = 'SUSPENDED' AND deletedAt IS NULL)",
    periodType: "REALTIME",
    scope: "PLATFORM",
    unit: "count",
    compute: async (ctx) => {
      const count = await ctx.prisma.school.count({
        where: { status: "SUSPENDED", deletedAt: null },
      });
      return count;
    },
  },
  {
    id: "kpi_platform_module_adoption_rate",
    name: "Platform Average Module Adoption Rate",
    ownerModule: "PLATFORM",
    formula: "(COUNT(SchoolFeature WHERE isEnabled = true) / (COUNT(School) * totalRegistryModules)) * 100",
    periodType: "REALTIME",
    scope: "PLATFORM",
    unit: "percentage",
    compute: async (ctx) => {
      const totalSchools = await ctx.prisma.school.count({ where: { deletedAt: null } });
      if (totalSchools === 0) return null;
      const totalEntitlements = await ctx.prisma.schoolFeature.count({
        where: { isEnabled: true },
      });
      const REGISTRY_MODULE_COUNT = 10;
      const potential = totalSchools * REGISTRY_MODULE_COUNT;
      if (potential === 0) return null;
      return Math.round((totalEntitlements / potential) * 10000) / 100;
    },
  },
  {
    id: "kpi_platform_daily_active_users",
    name: "Platform Daily Active Users (DAU)",
    ownerModule: "PLATFORM",
    formula: "COUNT(DISTINCT userId FROM User WHERE lastLogin >= NOW() - 24 HOURS AND isActive = true)",
    periodType: "DAILY",
    scope: "PLATFORM",
    unit: "count",
    compute: async (ctx) => {
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const count = await ctx.prisma.user.count({
        where: { lastLogin: { gte: past24h }, isActive: true, deletedAt: null },
      });
      return count;
    },
  },
  {
    id: "kpi_platform_support_sessions_active",
    name: "Platform Active Support Sessions",
    ownerModule: "PLATFORM",
    formula: "COUNT(SupportSessions WHERE status = 'ACTIVE' AND expiresAt > NOW())",
    periodType: "REALTIME",
    scope: "PLATFORM",
    unit: "count",
    compute: async () => {
      // In-memory support session service tracks active sessions
      const { SupportSessionService } = await import("../services/support-session.service");
      return SupportSessionService.getActiveSessionCount();
    },
  },
  {
    id: "kpi_platform_api_error_rate",
    name: "Platform 24-Hour API Error Rate",
    ownerModule: "PLATFORM",
    formula: "(SUM(ssvm_http_requests_total{status=~'5..'}) / SUM(ssvm_http_requests_total)) * 100",
    periodType: "DAILY",
    scope: "PLATFORM",
    unit: "percentage",
    compute: async (ctx) => {
      // Approximate from AuditLog / System metrics
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const totalRequests = await ctx.prisma.auditLog.count({
        where: { createdAt: { gte: past24h } },
      });
      if (totalRequests === 0) return null;
      const errorLogs = await ctx.prisma.auditLog.count({
        where: {
          createdAt: { gte: past24h },
          action: { in: ["API_ERROR", "AUTH_FAILURE", "CRITICAL_SECURITY_ALERT"] },
        },
      });
      return Math.round((errorLogs / totalRequests) * 10000) / 100;
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY UTILITIES & EVALUATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class KpiRegistry {
  private static items = new Map<string, KpiDefinition>(
    KPI_REGISTRY.map((kpi) => [kpi.id, kpi])
  );

  public static getAll(): KpiDefinition[] {
    return Array.from(this.items.values());
  }

  public static getById(id: string): KpiDefinition | undefined {
    return this.items.get(id);
  }

  public static getByScope(scope: KpiScope): KpiDefinition[] {
    return this.getAll().filter((kpi) => kpi.scope === scope);
  }

  public static async evaluateKpi(
    definition: KpiDefinition,
    context: KpiComputeContext
  ): Promise<KpiResult> {
    const asOf = (context.targetDate || new Date()).toISOString();

    // 1. Module Entitlement Check
    if (definition.requiredModule) {
      const active = context.activeModules || [];
      if (!active.includes(definition.requiredModule)) {
        return {
          id: definition.id,
          name: definition.name,
          ownerModule: definition.ownerModule,
          value: null,
          unit: definition.unit,
          asOf,
          period: definition.periodType,
          status: "MODULE_DISABLED",
          reason: `Module '${definition.requiredModule}' is not enabled for this institution`,
        };
      }
    }

    // 2. Execution & Error Handling
    try {
      const computedValue = await definition.compute(context);
      if (computedValue === null || computedValue === undefined || Number.isNaN(computedValue)) {
        return {
          id: definition.id,
          name: definition.name,
          ownerModule: definition.ownerModule,
          value: null,
          unit: definition.unit,
          asOf,
          period: definition.periodType,
          status: "NO_DATA",
          reason: "No data available for the requested period",
        };
      }

      return {
        id: definition.id,
        name: definition.name,
        ownerModule: definition.ownerModule,
        value: computedValue,
        unit: definition.unit,
        asOf,
        period: definition.periodType,
        status: "OK",
        reason: null,
      };
    } catch (err: unknown) {
      return {
        id: definition.id,
        name: definition.name,
        ownerModule: definition.ownerModule,
        value: null,
        unit: definition.unit,
        asOf,
        period: definition.periodType,
        status: "NO_DATA",
        reason: err instanceof Error ? err.message : "Computation failed",
      };
    }
  }
}
