import express, { Express } from 'express';
import { app } from '../../app'; // Import the main app (you might need to adjust export in index.ts)
import prisma from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { getEnv } from '../../config/env';

// If app is not exported from index.ts, you might need to export it there or recreate it here.
// For now, assuming index.ts exports the configured express `app`.

export function createTestApp(): Express {
  return app;
}

export function getTestPrisma() {
  return prisma;
}

export async function createTestUser(role: Role = Role.ERP_ADMIN, schoolId?: string) {
  const env = getEnv();
  
  // Use a deterministic email or random one
  const email = `testuser_${Date.now()}@example.com`;
  
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: 'hashedpassword',
      name: 'Test User',
      role,
      schoolId,
      isActive: true,
    }
  });

  // Generate an RS256 token (assuming env has ACCESS_TOKEN_PRIVATE_KEY)
  // For testing without the real env, we can fallback to a dummy if needed, but since we are running tests,
  // setup.ts should provide a mock key or we use the real one.
  let token = 'mock_token';
  try {
    if (env.ACCESS_TOKEN_PRIVATE_KEY) {
      token = jwt.sign({ userId: user.id, role: user.role, schoolId: user.schoolId }, env.ACCESS_TOKEN_PRIVATE_KEY, {
        algorithm: 'RS256',
        expiresIn: '1h',
      });
    }
  } catch (e) {
    // Ignore key errors in tests if testing without keys
  }

  const cookie = `access_token=${token}; HttpOnly; Path=/; SameSite=Lax`;
  return { user, cookie, token };
}

export async function createTestSchool() {
  return prisma.school.create({
    data: {
      code: `SCH-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: `Test School ${Date.now()}`,
      address: '123 Test St',
      isActive: true,
    }
  });
}

export async function createTestStudent(sectionId: string, schoolId: string) {
  return prisma.student.create({
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
