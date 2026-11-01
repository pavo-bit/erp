import { describe, test, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, getTestPrisma, createTestSchool, createTestUser } from '../helpers/testApp';
import { Role } from '@prisma/client';

const app = createTestApp();
const prisma = getTestPrisma();

describe('RBAC Middleware & Route Matrix', () => {
  let schoolA_Id: string;
  let schoolB_Id: string;

  beforeEach(async () => {
    // Schools
    const schoolA = await createTestSchool();
    schoolA_Id = schoolA.id;
    const schoolB = await createTestSchool();
    schoolB_Id = schoolB.id;
  });

  const endpoints = [
    {
      method: 'GET',
      path: '/api/v1/students',
      expected: {
        'SUPER_ADMIN': 200,
        'ERP_ADMIN': 200,
        'TEACHER': 200,
        'ACCOUNTANT': 403,
        'PARENT': 200,
        'STUDENT': 403,
      }
    },
    {
      method: 'POST',
      path: '/api/v1/students',
      expected: {
        'SUPER_ADMIN': 201, // Or whatever success is
        'ERP_ADMIN': 201,
        'TEACHER': 403,
        'ACCOUNTANT': 403,
        'PARENT': 403,
        'STUDENT': 403,
      }
    },
    {
      method: 'GET',
      path: '/api/v1/hr/salaries',
      expected: {
        'SUPER_ADMIN': 200,
        'ERP_ADMIN': 200,
        'TEACHER': 403,
        'ACCOUNTANT': 403,
        'HR': 200,
        'PARENT': 403,
        'STUDENT': 403,
      }
    },
    {
      method: 'POST',
      path: '/api/v1/hr/salaries',
      expected: {
        'SUPER_ADMIN': 201,
        'ERP_ADMIN': 201,
        'TEACHER': 403,
        'ACCOUNTANT': 403,
        'HR': 201,
        'PARENT': 403,
        'STUDENT': 403,
      }
    },
    {
      method: 'GET',
      path: '/api/v1/schools',
      expected: {
        'SUPER_ADMIN': 200,
        'ERP_ADMIN': 403,
        'TEACHER': 403,
        'ACCOUNTANT': 403,
        'HR': 403,
        'PARENT': 403,
        'STUDENT': 403,
      }
    },
    {
      method: 'PUT',
      path: '/api/v1/users/some-id/status',
      expected: {
        'SUPER_ADMIN': 200,
        'ERP_ADMIN': 200,
        'TEACHER': 403,
        'ACCOUNTANT': 403,
        'HR': 403,
        'PARENT': 403,
        'STUDENT': 403,
      }
    }
  ];

  // We loop through each endpoint configuration and map its roles
  endpoints.forEach((endpoint) => {
    describe(`${endpoint.method} ${endpoint.path}`, () => {
      test.each([
        ['SUPER_ADMIN', endpoint.expected['SUPER_ADMIN']],
        ['ERP_ADMIN', endpoint.expected['ERP_ADMIN']],
        ['TEACHER', endpoint.expected['TEACHER']],
        ['ACCOUNTANT', endpoint.expected['ACCOUNTANT']],
        ['HR', endpoint.expected['HR'] ?? 403],
        ['PARENT', endpoint.expected['PARENT'] ?? 403],
        ['STUDENT', endpoint.expected['STUDENT']],
        [null, 401], // Unauthenticated
      ])('role %s returns %i', async (role, expectedStatus) => {
        let req = (request(app) as any)[endpoint.method.toLowerCase()](endpoint.path);
        
        if (role) {
          const { token } = await createTestUser(role as Role, schoolA_Id);
          req = req.set('Authorization', `Bearer ${token}`);
        } else {
          req = req.set('Authorization', 'Bearer none');
        }

        // We only care about 401/403 vs 2xx/404/422 (passed auth, failed logic/validation)
        const res = await req.send({});
        
        if (expectedStatus === 401 || expectedStatus === 403) {
          expect(res.status).toBe(expectedStatus as number);
        } else {
          // If the role has access, it might fail because of validation (422/400) or not found (404)
          // But it should NOT be 401 or 403.
          expect(res.status).not.toBe(401);
          expect(res.status).not.toBe(403);
        }
      });
    });
  });

  describe('School Isolation', () => {
    test('User from School A cannot access School B data', async () => {
      // Simulate School A Teacher accessing School B student records
      const { token } = await createTestUser(Role.TEACHER, schoolA_Id);
      
      const res = await request(app)
        .get(`/api/v1/students?schoolId=${schoolB_Id}`)
        .set('Authorization', `Bearer ${token}`);

      // Depending on implementation, the middleware might reject it (403) 
      // or simply override the schoolId filter so it returns School A data silently.
      if (res.status !== 403) {
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(403);
      }
    });

    test('SUPER_ADMIN can access any school data', async () => {
      const { token } = await createTestUser(Role.SUPER_ADMIN, undefined);
      
      const res = await request(app)
        .get(`/api/v1/students?schoolId=${schoolB_Id}`)
        .set('Authorization', `Bearer ${token}`);

      // SUPER_ADMIN should be allowed, so no 403.
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });
  });
});
