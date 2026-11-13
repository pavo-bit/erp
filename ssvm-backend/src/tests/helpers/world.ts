import { createTestSchool, createTestUser } from './testApp';
import { Role } from '@prisma/client';

export interface TestWorld {
  school: any;
  admin: { id: string; email: string; role: Role };
  adminCookie: string;
}

/**
 * Builds a minimal, isolated test world (school + admin user) that other
 * integration tests can extend. Keeps factories centralized so tests stop
 * hand-rolling school/user creation.
 */
export async function createWorld(): Promise<TestWorld> {
  const school = await createTestSchool();
  const { user, cookie } = await createTestUser(Role.ERP_ADMIN, school.id);
  return {
    school,
    admin: { id: user.id, email: user.email, role: user.role },
    adminCookie: cookie,
  };
}

export default createWorld;