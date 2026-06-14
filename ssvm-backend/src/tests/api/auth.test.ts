import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, getTestPrisma } from '../helpers/testApp';
import { UserFactory, SchoolFactory, StudentFactory } from '../helpers/factories';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEnv } from '../../config/env';

const app = createTestApp();
const prisma = getTestPrisma();

describe('Auth API Routes', () => {
  let schoolId: string;
  let testUser: any;
  let testStudent: any;
  let validPassword = 'Password123!';

  beforeEach(async () => {
    // We assume the DB is truncated by setup.ts
    const school = await prisma.school.create({ data: SchoolFactory.build() });
    schoolId = school.id;

    const passwordHash = await bcrypt.hash(validPassword, 10);
    
    testUser = await prisma.user.create({
      data: UserFactory.build({ schoolId, passwordHash })
    });

    // Create a section for student
    const session = await prisma.academicSession.create({ data: { name: '2026-2027', startDate: new Date(), endDate: new Date(), schoolId } });
    const classRecord = await prisma.class.create({ data: { name: 'Class 1', schoolId, sessionId: session.id } });
    const section = await prisma.section.create({ data: { name: 'A', classId: classRecord.id } });

    testStudent = await prisma.student.create({
      data: StudentFactory.build({ 
        schoolId, 
        sectionId: section.id, 
        passwordHash,
        guardian: {
          create: {
            primaryPhone: '1234567890',
            primaryEmail: 'guardian@test.com',
            motherName: 'Mom',
            fatherName: 'Dad'
          }
        }
      })
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 200 and sets cookies for valid staff login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: validPassword });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.passwordHash).toBeUndefined(); // no password leaked
      
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('access_token='))).toBe(true);
      expect(cookies.some((c: string) => c.includes('refresh_token='))).toBe(true);
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });
      
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid credentials');
    });

    it('returns 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: validPassword });
      
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid credentials'); // same message
    });

    it('returns 401 for inactive user', async () => {
      await prisma.user.update({ where: { id: testUser.id }, data: { isActive: false } });
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: validPassword });
      
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Account is disabled');
    });

    it('returns 422 for missing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: validPassword });
      
      expect(res.status).toBe(422);
    });

    it('returns 422 for missing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email });
      
      expect(res.status).toBe(422);
    });

    it('returns 429 when rate limit is exceeded', async () => {
      // Assuming limit is 10. We send 11.
      for (let i = 0; i < 10; i++) {
        await request(app).post('/api/v1/auth/login').send({ email: testUser.email, password: 'wrongpassword' });
      }
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: validPassword });
      
      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Too many requests');
    });
  });

  describe('POST /api/v1/auth/student/login', () => {
    it('returns 200 for valid student login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/student/login')
        .send({ admissionNo: testStudent.admissionNo, password: validPassword });
      
      expect(res.status).toBe(200);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.role).toBe('STUDENT');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let validRefreshToken: string;

    beforeEach(() => {
      const env = getEnv();
      validRefreshToken = jwt.sign(
        { userId: testUser.id, role: testUser.role, schoolId: testUser.schoolId }, 
        env.REFRESH_TOKEN_PRIVATE_KEY, 
        { algorithm: 'RS256', expiresIn: '7d', jwtid: 'some-jti' }
      );
    });

    it('returns new access token for valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refresh_token=${validRefreshToken}`]);
      
      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c: string) => c.includes('access_token='))).toBe(true);
    });

    it('returns 401 for expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id }, 
        getEnv().REFRESH_TOKEN_PRIVATE_KEY, 
        { algorithm: 'RS256', expiresIn: '-1h', jwtid: 'some-jti2' }
      );
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refresh_token=${expiredToken}`]);
      
      expect(res.status).toBe(401);
    });
    
    // Note: Reused refresh token test depends on the specific Redis tracking implementation
  });

  describe('POST /api/v1/auth/logout', () => {
    it('clears cookies on logout', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c: string) => c.includes('access_token=;'))).toBe(true);
      expect(cookies.some((c: string) => c.includes('refresh_token=;'))).toBe(true);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 when no token provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns user data when authenticated', async () => {
      const token = jwt.sign(
        { userId: testUser.id, role: testUser.role, schoolId: testUser.schoolId },
        getEnv().ACCESS_TOKEN_PRIVATE_KEY,
        { algorithm: 'RS256', expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`access_token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(testUser.id);
    });
  });
});
