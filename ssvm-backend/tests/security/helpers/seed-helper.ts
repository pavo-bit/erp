import prisma from '../../../src/lib/prisma';

import crypto from "crypto";

// ═══════════════════════════════════════════
// Test Seed Helper (GAP 2)
// ═══════════════════════════════════════════
// Creates isolated test data for security tests.
// Each test run gets unique IDs to avoid conflicts.


export interface TestSchool {
  id: string;
  name: string;
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: string;
  schoolId: string;
}

export interface TestStudent {
  id: string;
  userId: string;
  schoolId: string;
}

export interface TestTenantData {
  school: TestSchool;
  admin: TestUser;
  teacher: TestUser;
  student: TestStudent;
  studentUser: TestUser;
}

/**
 * Create a complete tenant with school, admin, teacher, and student.
 * All IDs are unique per invocation to allow parallel test runs.
 */
export async function createTestTenant(prefix: string = "test"): Promise<TestTenantData> {
  const suffix = crypto.randomBytes(4).toString("hex");

  // Create school
  const school = await prisma.school.create({
    data: {
      name: `${prefix}-school-${suffix}`,
      code: `${prefix.toUpperCase()}-${suffix}`,
      email: `${prefix}-${suffix}@test.example.com`,
      phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      address: "Test Address",
      city: "Test City",
      state: "Test State",
      subscription: "BASIC",
    },
  });

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: `admin-${suffix}@${prefix}.test`,
      passwordHash: "$2a$12$test.hash.placeholder.for.security.tests",
      name: `Admin ${suffix}`,
      role: "ERP_ADMIN",
      schoolId: school.id,
      isActive: true,
    },
  });

  // Create teacher user + Teacher record
  const teacherUser = await prisma.user.create({
    data: {
      email: `teacher-${suffix}@${prefix}.test`,
      passwordHash: "$2a$12$test.hash.placeholder.for.security.tests",
      name: `Teacher ${suffix}`,
      role: "TEACHER",
      schoolId: school.id,
      isActive: true,
    },
  });

  await prisma.teacher.create({
    data: {
      userId: teacherUser.id,
      schoolId: school.id,
      name: teacherUser.name,
      email: teacherUser.email,
      phone: "+910000000000",
      joiningDate: new Date(),
    },
  });

  // Create student user + Student record
  const studentUser = await prisma.user.create({
    data: {
      email: `student-${suffix}@${prefix}.test`,
      passwordHash: "$2a$12$test.hash.placeholder.for.security.tests",
      name: `Student ${suffix}`,
      role: "STUDENT",
      schoolId: school.id,
      isActive: true,
    },
  });

  const student = await prisma.student.create({
    data: {
      userId: studentUser.id,
      schoolId: school.id,
      name: studentUser.name,
      admissionNo: `ADM-${suffix}`,
      dateOfBirth: new Date("2010-01-15"),
      gender: "Male",
    },
  });

  return {
    school: { id: school.id, name: school.name },
    admin: { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role, schoolId: school.id },
    teacher: { id: teacherUser.id, email: teacherUser.email, name: teacherUser.name, role: teacherUser.role, schoolId: school.id },
    student: { id: student.id, userId: studentUser.id, schoolId: school.id },
    studentUser: { id: studentUser.id, email: studentUser.email, name: studentUser.name, role: studentUser.role, schoolId: school.id },
  };
}

/**
 * Create a test invoice for a student (used in cross-tenant read tests).
 */
export async function createTestInvoice(schoolId: string, studentId: string): Promise<string> {
  const invoice = await prisma.invoice.create({
    data: {
      schoolId,
      studentId,
      amount: 5000,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      type: "MONTHLY",
      status: "PENDING",
      remainingAmount: 5000,
    },
  });
  return invoice.id;
}

/**
 * Cleanup all test data created by createTestTenant.
 * Cascading deletes should handle most related records via the School → cascades.
 */
export async function cleanupTestTenant(schoolId: string): Promise<void> {
  try {
    // Delete in reverse dependency order
    await prisma.student.deleteMany({ where: { schoolId } });
    await prisma.teacher.deleteMany({ where: { schoolId } });
    await prisma.user.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
  } catch (err) {
    // Best-effort cleanup — tests should still pass if cleanup partially fails
    console.warn(`Cleanup warning for school ${schoolId}:`, err);
  }
}

export { prisma };
