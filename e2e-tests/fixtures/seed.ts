import fs from 'node:fs';
import path from 'node:path';

/**
 * Authoritative E2E fixture contract.
 *
 * `ssvm-backend/prisma/seed.ts` writes `seed-manifest.json` next to this file
 * whenever the demo seed runs with ALLOW_DEMO_SEED=true. The Playwright suite
 * reads database-generated identifiers (schools, users) from that manifest
 * instead of hardcoding them.
 */

interface ManifestUser {
  id: string;
  email: string;
  role: string;
}

interface ManifestSchool {
  id: string;
  code: string;
  name: string;
  sessionId?: string;
}

interface SeedManifest {
  generatedAt: string;
  schools: {
    schoolA: ManifestSchool;
    schoolB: ManifestSchool;
  };
  users: ManifestUser[];
}

const manifestPath =
  process.env.E2E_SEED_MANIFEST || path.resolve(__dirname, 'seed-manifest.json');

function loadManifest(): SeedManifest {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `E2E seed manifest not found at ${manifestPath}. ` +
        'Run the backend seed with ALLOW_DEMO_SEED=true before running Playwright.'
    );
  }

  const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Partial<SeedManifest>;
  if (!parsed.schools?.schoolA?.id || !parsed.schools?.schoolB?.id) {
    throw new Error(`E2E seed manifest at ${manifestPath} is missing school identifiers.`);
  }
  if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
    throw new Error(`E2E seed manifest at ${manifestPath} is missing test principals.`);
  }
  return parsed as SeedManifest;
}

export const seedManifest = loadManifest();

export const SCHOOL_A_ID = seedManifest.schools.schoolA.id;
export const SCHOOL_B_ID = seedManifest.schools.schoolB.id;
export const SESSION_A_ID = seedManifest.schools.schoolA.sessionId;
export const SESSION_B_ID = seedManifest.schools.schoolB.sessionId;

/** Shared password for all seeded E2E principals (CI demo data only). */
export const E2E_PASSWORD = 'Admin@123';

function requireUser(email: string): ManifestUser {
  const user = seedManifest.users.find((candidate) => candidate.email === email);
  if (!user) {
    throw new Error(`E2E seed manifest is missing required principal ${email}.`);
  }
  return user;
}

export const E2E_USERS = {
  erpAdmin: requireUser('erpadmin@ssvm.edu'),
  superAdmin: requireUser('superadmin@ssvm-erp.com'),
  teacher: requireUser('teacher1@ssvm.edu'),
  student: requireUser('student1@ssvm.edu'),
  parent: requireUser('parent1@ssvm.edu'),
};
