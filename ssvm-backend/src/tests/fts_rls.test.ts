import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app";
import prisma from "../lib/prisma";
import { generateAccessToken } from "../lib/tokens";

// Fixtures are shared across this suite's beforeAll/afterAll lifecycle.
// The global integration setup truncates before each individual test.
process.env.SKIP_TRUNCATE = "true";

describe("FTS and Search API E2E", () => {
  let server: any;
  let adminToken: string;
  let schoolId: string;
  let adminUserId: string;

  beforeAll(async () => {
    server = app.listen(0);

    const uid = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const school = await prisma.school.create({
      data: {
        name: "FTS Test School",
        code: `FTS-${uid}`,
        address: "Test Address",
        email: `fts_${uid}@test.com`,
        phone: "1234567890"
      }
    });
    schoolId = school.id;

    const adminUser = await prisma.user.create({
      data: {
        email: `admin.fts.${uid}@test.com`,
        name: "Admin FTS",
        passwordHash: "pwd",
        role: "ERP_ADMIN",
        schoolId,
      }
    });
    adminUserId = adminUser.id;

    adminToken = generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
      schoolId,
      branchId: null,
      sid: `fts-${Date.now()}`,
      impersonated: false,
    }).token;

    // Seed some data for FTS
    await prisma.student.create({
      data: {
        admissionNo: `FTS-ST-${uid}`,
        name: "Johnathan Searchable Doe",
        schoolId,
        password: "pwd",
        isActive: true,
        rollNo: "R-1"
      }
    });

    await prisma.documentRepository.create({
      data: {
        name: "Financial Docs",
        category: "FINANCIAL",
        fileUrl: "s3://dummy/doc",
        fileType: "application/pdf",
        schoolId,
        uploadedById: adminUserId
      }
    });
  });

  afterAll(async () => {
    if (schoolId) {
      await prisma.documentRepository.deleteMany({ where: { schoolId } });
      await prisma.student.deleteMany({ where: { schoolId } });
      if (adminUserId) {
        await prisma.user.deleteMany({ where: { id: adminUserId } });
      }
      await prisma.school.delete({ where: { id: schoolId } });
    }

    server?.close();
    await prisma.$disconnect();
  });

  it("should find student via FTS partial name query", async () => {
    const res = await request(server)
      .get("/api/v1/search?q=Johnathan")
      .set("Authorization", `Bearer ${adminToken}`);
      
    expect(res.status).toBe(200);
    // Note: FTS query matches exact lexemes, "Johnathan" should match.
    // However, if the trigger hasn't fired or test uses different Prisma config, it might be empty.
    // If it works, data.students should have 1 item.
    expect(res.body.data.students).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Johnathan Searchable Doe" })])
    );
  });

  it("should find document via FTS category or title", async () => {
    const res = await request(server)
      .get("/api/v1/search?q=Financial")
      .set("Authorization", `Bearer ${adminToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.data.documents).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Financial Docs" })])
    );
  });

  it("has trigram indexes supporting the route's substring search on a migrated database", async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_catalog.pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'idx_students_name_trgm',
          'idx_users_name_trgm',
          'idx_notices_title_trgm',
          'idx_events_title_trgm'
        )
    `;
    expect(indexes.map((index) => index.indexname).sort()).toEqual([
      "idx_events_title_trgm",
      "idx_notices_title_trgm",
      "idx_students_name_trgm",
      "idx_users_name_trgm",
    ]);
  });
});
