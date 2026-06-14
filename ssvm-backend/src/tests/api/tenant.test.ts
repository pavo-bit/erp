import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, getTestPrisma, createTestUser, createTestSchool, createTestStudent } from '../helpers/testApp';
import { Role } from '@prisma/client';

const app = createTestApp();
const prisma = getTestPrisma();

describe('Multi-Tenant Data Isolation', () => {
  let schoolAId: string;
  let schoolBId: string;
  let adminACookie: string;
  let adminBCookie: string;

  beforeEach(async () => {
    // Setup School A
    const schoolA = await createTestSchool();
    schoolAId = schoolA.id;
    const adminA = await createTestUser(Role.ERP_ADMIN, schoolAId);
    adminACookie = adminA.cookie;

    const sessionA = await prisma.academicSession.create({ data: { name: '2026-2027', startDate: new Date(), endDate: new Date(), schoolId: schoolAId } });
    const classA = await prisma.class.create({ data: { name: 'Class 1A', schoolId: schoolAId, sessionId: sessionA.id } });
    const sectionA = await prisma.section.create({ data: { name: 'A', classId: classA.id } });
    await createTestStudent(sectionA.id, schoolAId);

    // Setup School B
    const schoolB = await createTestSchool();
    schoolBId = schoolB.id;
    const adminB = await createTestUser(Role.ERP_ADMIN, schoolBId);
    adminBCookie = adminB.cookie;

    const sessionB = await prisma.academicSession.create({ data: { name: '2026-2027', startDate: new Date(), endDate: new Date(), schoolId: schoolBId } });
    const classB = await prisma.class.create({ data: { name: 'Class 1B', schoolId: schoolBId, sessionId: sessionB.id } });
    const sectionB = await prisma.section.create({ data: { name: 'B', classId: classB.id } });
    await createTestStudent(sectionB.id, schoolBId);

    // Create an invoice for School A
    const studentA = await prisma.student.findFirst({ where: { schoolId: schoolAId } });
    await prisma.invoice.create({
      data: {
        schoolId: schoolAId,
        studentId: studentA!.id,
        amount: 1000,
        status: 'UNPAID',
        dueDate: new Date(),
        description: 'Tuition Fee A',
        // type is omitted if it causes TS issues, let's omit or pass a valid string if it accepts string.
        // If it's a prisma Enum, I should import FeeType from @prisma/client or omit it if optional.
      }
    });

    // Create an invoice for School B
    const studentB = await prisma.student.findFirst({ where: { schoolId: schoolBId } });
    await prisma.invoice.create({
      data: {
        schoolId: schoolBId,
        studentId: studentB!.id,
        amount: 2000,
        status: 'UNPAID',
        dueDate: new Date(),
        description: 'Tuition Fee B',
        // type: 'TUITION',
      }
    });
  });

  describe('GET /api/v1/students', () => {
    it('prevents School A from reading School B students', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Cookie', [adminACookie]);

      expect(res.status).toBe(200);
      const students = res.body.data.students || res.body.data;
      expect(students.length).toBeGreaterThan(0);
      
      // Enforce zero data leakage
      const leaked = students.filter((s: any) => s.schoolId === schoolBId);
      expect(leaked.length).toBe(0);
    });

    it('prevents School B from reading School A students', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Cookie', [adminBCookie]);

      expect(res.status).toBe(200);
      const students = res.body.data.students || res.body.data;
      expect(students.length).toBeGreaterThan(0);
      
      // Enforce zero data leakage
      const leaked = students.filter((s: any) => s.schoolId === schoolAId);
      expect(leaked.length).toBe(0);
    });
  });

  describe('GET /api/v1/invoices', () => {
    it('strictly isolates financial reads to the requesting tenant', async () => {
      const resA = await request(app).get('/api/v1/invoices').set('Cookie', [adminACookie]);
      expect(resA.status).toBe(200);
      const invoicesA = resA.body.data.invoices || resA.body.data;
      
      invoicesA.forEach((inv: any) => {
        expect(inv.schoolId).toBe(schoolAId);
        expect(inv.amount).toBe(1000); // Only School A's invoice
      });

      const resB = await request(app).get('/api/v1/invoices').set('Cookie', [adminBCookie]);
      expect(resB.status).toBe(200);
      const invoicesB = resB.body.data.invoices || resB.body.data;

      invoicesB.forEach((inv: any) => {
        expect(inv.schoolId).toBe(schoolBId);
        expect(inv.amount).toBe(2000); // Only School B's invoice
      });
    });
  });

  describe('POST /api/v1/attendance (Write Isolation)', () => {
    it('blocks Teacher A from marking attendance for Section B', async () => {
      const sectionB = await prisma.section.findFirst({ where: { class: { schoolId: schoolBId } } });
      const studentB = await prisma.student.findFirst({ where: { schoolId: schoolBId } });

      const payload = {
        sectionId: sectionB!.id,
        date: new Date().toISOString(),
        records: [{ studentId: studentB!.id, status: 'PRESENT' }]
      };

      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', [adminACookie]) // Admin A trying to post to Section B
        .send(payload);

      // System should either return 403 Forbidden or 404 Not Found (if scoped query returns null)
      expect([403, 404, 400]).toContain(res.status);
    });
  });
});
