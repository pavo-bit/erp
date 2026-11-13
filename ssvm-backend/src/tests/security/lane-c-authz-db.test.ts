import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp, getTestPrisma } from '../helpers/testApp';
import { runWithTenantDatabaseTransaction, runWithTrustedDatabaseTransaction } from '../../lib/prisma';
import { generateAccessToken } from '../../lib/tokens';
import crypto from 'crypto';

const app = createTestApp();
const prisma = getTestPrisma();

describe('Lane C DB-backed authz', () => {
  const suffix = crypto.randomUUID().replaceAll('-', '');
  const schoolA = { id: `lc-a-${suffix}`, name: `LC A ${suffix}`, code: `LCA${suffix}` };
  const schoolB = { id: `lc-b-${suffix}`, name: `LC B ${suffix}`, code: `LCB${suffix}` };
  const adminA = { id: `lc-admin-${suffix}`, email: `lc-admin-${suffix}@t.invalid`, name: 'Admin', role: 'ERP_ADMIN' as const, schoolId: schoolA.id };
  const targetB = { id: `lc-target-${suffix}`, email: `lc-target-${suffix}@t.invalid`, name: 'Target', role: 'TEACHER' as const, schoolId: schoolB.id };
  const superAdmin = { id: `lc-sa-${suffix}`, email: `lc-sa-${suffix}@t.invalid`, name: 'SA', role: 'SUPER_ADMIN' as const, schoolId: null };
  let tokenA = '';

  beforeAll(async () => {
    await runWithTrustedDatabaseTransaction({ purpose: 'SUPER_ADMIN_SEARCH' }, async () => {
      await prisma.school.createMany({ data: [schoolA, schoolB] });
      await prisma.user.createMany({ data: [
        { ...adminA, passwordHash: 'x' },
        { ...targetB, passwordHash: 'x' },
        { ...superAdmin, passwordHash: 'x' },
      ] });
    });
    tokenA = generateAccessToken({ userId: adminA.id, email: adminA.email, role: adminA.role, name: adminA.name, schoolId: schoolA.id, sid: `s-${suffix}` }).token;
  });

  it('school-scoped write to another school returns 404 and no change', async () => {
    const res = await request(app)
      .put(`/api/v1/users/${targetB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(404);
    const unchanged = await runWithTrustedDatabaseTransaction({ purpose: 'SUPER_ADMIN_SEARCH' }, async () => {
      return prisma.user.findUnique({ where: { id: targetB.id } });
    });
    expect(unchanged?.name).toBe('Target');
  });

  it('protected account (SUPER_ADMIN) mutation is refused', async () => {
    const saToken = generateAccessToken({ userId: superAdmin.id, email: superAdmin.email, role: superAdmin.role, name: superAdmin.name, schoolId: null, sid: `s2-${suffix}` }).token;
    // create a protected super admin in school A? superAdmin has no school; use adminA token to try mutate superAdmin (different school/null) -> 404 or 403
    const res = await request(app)
      .put(`/api/v1/users/${superAdmin.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Changed' });
    expect([403, 404]).toContain(res.status);
  });

  it('assignable-role matrix: ERP_ADMIN cannot assign SUPER_ADMIN', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ email: `new-${suffix}@t.invalid`, name: 'New', role: 'SUPER_ADMIN' });
    expect(res.status).toBe(403);
  });
});
