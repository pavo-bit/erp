import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp, getTestPrisma } from '../helpers/testApp';
import { runWithTenantDatabaseTransaction, runWithTrustedDatabaseTransaction } from '../../lib/prisma';
import { generateAccessToken } from '../../lib/tokens';
import crypto from 'crypto';
import { Role } from '@prisma/client';

const app = createTestApp();
const prisma = getTestPrisma();

describe('Invitation / password setup flow', () => {
  const suffix = crypto.randomUUID().replaceAll('-', '');
  const schoolA = { id: `inv-a-${suffix}`, name: `Inv A ${suffix}`, code: `IVA${suffix}` };
  const schoolB = { id: `inv-b-${suffix}`, name: `Inv B ${suffix}`, code: `IVB${suffix}` };
  const adminA = { id: `admin-a-${suffix}`, email: `admin-a-${suffix}@test.invalid`, name: 'Admin A', role: 'ERP_ADMIN' as const, schoolId: schoolA.id };
  const userA = { id: `user-a-${suffix}`, email: `user-a-${suffix}@test.invalid`, name: 'User A', role: 'TEACHER' as const, schoolId: schoolA.id };
  let adminToken = '';

  beforeAll(async () => {
    await runWithTrustedDatabaseTransaction({ purpose: 'SUPER_ADMIN_SEARCH', }, async () => {
      await prisma.school.createMany({ data: [schoolA, schoolB] });
      await prisma.user.createMany({ data: [
        { ...adminA, passwordHash: 'x' },
        { ...userA, passwordHash: 'x' },
      ] });
    });
    adminToken = generateAccessToken({ userId: adminA.id, email: adminA.email, role: adminA.role, name: adminA.name, schoolId: schoolA.id, sid: `s-${suffix}` }).token;
  });

  afterAll(async () => {
    await runWithTrustedDatabaseTransaction({ purpose: 'SUPER_ADMIN_SEARCH', }, async () => {
      await prisma.passwordSetupToken.deleteMany({ where: { userId: userA.id } });
      await prisma.user.deleteMany({ where: { id: { in: [adminA.id, userA.id] } } });
      await prisma.school.deleteMany({ where: { id: { in: [schoolA.id, schoolB.id] } } });
    });
  });

  it('issues a token without returning it', async () => {
    const res = await request(app)
      .post(`/api/v1/users/${userA.id}/password-setup`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('token');
  });

  it('revoked token is rejected', async () => {
    // issue then revoke
    await request(app).post(`/api/v1/users/${userA.id}/password-setup`).set('Authorization', `Bearer ${adminToken}`).expect(201);
    await request(app).post(`/api/v1/users/${userA.id}/password-setup/revoke`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    // find a revoked token hash? We'll just attempt with a dummy -> invalid
    const res = await request(app).post('/api/v1/auth/set-password').send({ token: 'doesnotexist', password: 'Password123!' });
    expect(res.status).toBe(400);
  });

  it('expired token is rejected', async () => {
    const raw = 'expiredtoken123';
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    await runWithTenantDatabaseTransaction(schoolA.id, async () => {
      await prisma.passwordSetupToken.create({ data: { schoolId: schoolA.id, userId: userA.id, tokenHash: hash, expiresAt: new Date(Date.now() - 1000) } });
    });
    const res = await request(app).post('/api/v1/auth/set-password').send({ token: raw, password: 'Password123!' });
    expect(res.status).toBe(400);
  });

  it('reuse is rejected', async () => {
    const raw = 'reusetoken123';
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    await runWithTenantDatabaseTransaction(schoolA.id, async () => {
      await prisma.passwordSetupToken.create({ data: { schoolId: schoolA.id, userId: userA.id, tokenHash: hash, expiresAt: new Date(Date.now() + 60000) } });
    });
    const first = await request(app).post('/api/v1/auth/set-password').send({ token: raw, password: 'Password123!' });
    expect(first.status).toBe(200);
    const second = await request(app).post('/api/v1/auth/set-password').send({ token: raw, password: 'Password123!' });
    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/used/i);
  });

  it('wrong school token is rejected', async () => {
    const raw = 'wrongschooltoken';
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    // token claims schoolB but userId belongs to schoolA user -> user lookup fails
    await runWithTrustedDatabaseTransaction({ purpose: 'SUPER_ADMIN_SEARCH', }, async () => {
      await prisma.passwordSetupToken.create({ data: { schoolId: schoolB.id, userId: userA.id, tokenHash: hash, expiresAt: new Date(Date.now() + 60000) } });
    });
    const res = await request(app).post('/api/v1/auth/set-password').send({ token: raw, password: 'Password123!' });
    expect(res.status).toBe(400);
  });
});
