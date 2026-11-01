import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import prisma from "../src/lib/prisma";
import jwt from "jsonwebtoken";

describe("FTS and Search API E2E", () => {
  let server: any;
  let adminToken: string;
  let schoolId: string;
  let adminUserId: string;

  beforeAll(async () => {
    server = app.listen(0);

    const school = await prisma.school.create({
      data: {
        name: "FTS Test School",
        code: "FTS-SCH-1",
        address: "Test Address",
        email: "fts@test.com",
        phone: "1234567890"
      }
    });
    schoolId = school.id;

    const adminUser = await prisma.user.create({
      data: {
        email: "admin.fts@test.com",
        name: "Admin FTS",
        passwordHash: "pwd",
        role: "ERP_ADMIN",
        schoolId,
      }
    });
    adminUserId = adminUser.id;

    adminToken = jwt.sign({ userId: adminUser.id, role: adminUser.role, schoolId }, process.env.JWT_SECRET || "supersecret", { expiresIn: "1h" });

    // Seed some data for FTS
    await prisma.student.create({
      data: {
        admissionNo: "FTS-ST-001",
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
    await prisma.documentRepository.deleteMany({ where: { schoolId } });
    await prisma.student.deleteMany({ where: { schoolId } });
    await prisma.user.deleteMany({ where: { id: adminUserId } });
    await prisma.school.delete({ where: { id: schoolId } });

    server.close();
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
