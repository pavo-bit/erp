import prisma from '../src/lib/prisma';
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";



describe("Authentication API", () => {
  let server: any;
  
  beforeAll(() => {
    server = app.listen(0);
  });

  afterAll(async () => {
    server.close();
    await prisma.$disconnect();
  });

  it("should return 400 for invalid login payload", async () => {
    const res = await request(server)
      .post("/api/public/login")
      .send({ email: "invalid" });
      
    expect(res.status).toBe(400);
  });
  
  it("should return 401 for wrong credentials", async () => {
    const res = await request(server)
      .post("/api/public/login")
      .send({ email: "wrong@test.com", password: "wrongpassword" });
      
    expect(res.status).toBe(401);
  });
});
