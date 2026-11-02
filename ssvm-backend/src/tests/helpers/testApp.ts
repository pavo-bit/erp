import express from 'express';
import type { Express, Request, Response, NextFunction } from 'express';
import { createApp } from '../../app';
import prisma from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { getEnv } from '../../config/env';

let applicationPromise: Promise<Express> | undefined;

/** Lazily create one app for each isolated test-file module. */
export function createTestApp(): Express {
  const testApp = express();
  testApp.use((req: Request, res: Response, next: NextFunction) => {
    applicationPromise ??= createApp();
    void applicationPromise.then((application) => application(req, res, next)).catch(next);
  });
  return testApp;
}

import { PrismaClient } from '@prisma/client';

let fixturePrismaClient: PrismaClient | null = null;
export function getTestPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL_TEST_FIXTURE || process.env.DATABASE_URL_TEST || (prisma as any)._activeUrl;
  if (!fixturePrismaClient || (fixturePrismaClient as any)._activeUrl !== url) {
    fixturePrismaClient = new PrismaClient({
      datasources: { db: { url } },
    });
    (fixturePrismaClient as any)._activeUrl = url;
  }
  return fixturePrismaClient;
}

import { generateAccessToken } from '../../lib/tokens';

export async function createTestUser(role: Role = Role.ERP_ADMIN, schoolId?: string) {
  const env = getEnv();
  const db = getTestPrisma();
  
  // Use a deterministic email or random one
  const email = `testuser_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@example.com`;
  
  const user = await db.user.create({
    data: {
      email,
      passwordHash: 'hashedpassword',
      name: 'Test User',
      role,
      schoolId,
      isActive: true,
    }
  });


  if (role === Role.STUDENT && schoolId) {
    await db.student.create({
      data: {
        userId: user.id,
        schoolId,
        rollNo: `R-${Date.now()}`,
        admissionNo: `ADM-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: user.name,
        isActive: true,
      }
    });
  }

  let token = 'mock_token';
  try {
    token = generateAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId ?? null,
      branchId: null,
      sid: `sid-${Date.now()}`,
      impersonated: false,
    }).token;
  } catch (e) {
    if (env.ACCESS_TOKEN_PRIVATE_KEY) {
      token = jwt.sign({ userId: user.id, role: user.role, schoolId: user.schoolId }, env.ACCESS_TOKEN_PRIVATE_KEY, {
        algorithm: 'RS256',
        expiresIn: '1h',
      });
    }
  }

  const cookie = `access_token=${token}; HttpOnly; Path=/; SameSite=Lax`;
  return { user, cookie, token };
}

export async function createTestSchool() {
  const db = getTestPrisma();
  const uid = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  return db.school.create({
    data: {
      code: `SCH-${uid}`,
      name: `Test School ${uid}`,
      address: '123 Test St',
      isActive: true,
    }
  });
}

export async function createTestStudent(sectionId: string, schoolId: string) {
  const db = getTestPrisma();
  return db.student.create({
    data: {
      admissionNo: `ADM-${Date.now()}`,
      rollNo: '1',
      name: 'Test Student',
      dob: new Date('2010-01-01'),
      gender: 'MALE',
      school: { connect: { id: schoolId } },
      sectionRef: { connect: { id: sectionId } },

      guardian: {
        create: {
          primaryName: 'Test Guardian',
          schoolId: schoolId,
          primaryPhone: '0987654321',
          primaryEmail: 'guardian@test.com',
        }
      }
    }
  });
}
