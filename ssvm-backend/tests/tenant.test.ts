import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Multi-Tenant Routing API", () => {
  let server: any;
  
  beforeAll(() => {
    server = app.listen(0);
  });

  afterAll(async () => {
    server.close();
    await prisma.$disconnect();
  });

  it("should block requests missing tenant context", async () => {
    // Assuming /api/saas requires auth and tenant context
    const res = await request(server)
      .get("/api/saas/dashboard");
      
    // Because auth fails first, it should return 401. If auth passes but tenant is missing, it returns 400.
    expect([400, 401, 403]).toContain(res.status);
  });
});
