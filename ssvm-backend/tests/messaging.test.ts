import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import prisma from "../src/lib/prisma";
import jwt from "jsonwebtoken";

describe("Messaging API E2E", () => {
  let server: any;
  let teacherToken: string;
  let parentToken: string;
  let schoolId: string;
  let teacherUserId: string;
  let parentUserId: string;
  let threadId: string;

  beforeAll(async () => {
    server = app.listen(0);

    // Create a school
    const school = await prisma.school.create({
      data: {
        name: "Test Messaging School",
        code: "MSG-SCH-1",
        address: "Test Address",
        email: "messaging@test.com",
        phone: "1234567890"
      }
    });
    schoolId = school.id;

    // Create Teacher User
    const teacherUser = await prisma.user.create({
      data: {
        email: "teacher.msg@test.com",
        name: "Teacher Msg",
        passwordHash: "hashedpassword",
        role: "TEACHER",
        schoolId,
      }
    });
    teacherUserId = teacherUser.id;

    // Create Parent User
    const parentUser = await prisma.user.create({
      data: {
        email: "parent.msg@test.com",
        name: "Parent Msg",
        passwordHash: "hashedpassword",
        role: "PARENT",
        schoolId,
      }
    });
    parentUserId = parentUser.id;

    // Generate Tokens
    teacherToken = jwt.sign({ userId: teacherUser.id, role: teacherUser.role, schoolId }, process.env.JWT_SECRET || "supersecret", { expiresIn: "1h" });
    parentToken = jwt.sign({ userId: parentUser.id, role: parentUser.role, schoolId }, process.env.JWT_SECRET || "supersecret", { expiresIn: "1h" });
  });

  afterAll(async () => {
    await prisma.messageParticipant.deleteMany({ where: { thread: { schoolId } } });
    await prisma.message.deleteMany({ where: { thread: { schoolId } } });
    await prisma.messageThread.deleteMany({ where: { schoolId } });
    await prisma.user.deleteMany({ where: { id: { in: [teacherUserId, parentUserId] } } });
    await prisma.school.delete({ where: { id: schoolId } });

    server.close();
    await prisma.$disconnect();
  });

  it("should start a new message thread", async () => {
    const res = await request(server)
      .post("/api/v1/messages/threads")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        subject: "Welcome to Class",
        participantIds: [parentUserId]
      });
      
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subject).toBe("Welcome to Class");
    threadId = res.body.data.id;
  });

  it("should fail to start a thread without participants", async () => {
    const res = await request(server)
      .post("/api/v1/messages/threads")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        subject: "No Participants",
        participantIds: []
      });
      
    expect(res.status).toBe(400);
  });

  it("should send a message in a thread", async () => {
    const res = await request(server)
      .post(`/api/v1/messages/${threadId}`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        content: "Hello Parent, how are you?"
      });
      
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe("Hello Parent, how are you?");
  });

  it("should fetch all message threads for user", async () => {
    const res = await request(server)
      .get("/api/v1/messages/threads")
      .set("Authorization", `Bearer ${parentToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].id).toBe(threadId);
  });

  it("should fetch all messages for a specific thread", async () => {
    const res = await request(server)
      .get(`/api/v1/messages/${threadId}`)
      .set("Authorization", `Bearer ${parentToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].content).toBe("Hello Parent, how are you?");
  });

  it("should prevent unauthorized user from viewing thread", async () => {
    // We create a random user
    const randomUser = await prisma.user.create({
      data: { email: `random.${Date.now()}@msg.test.com`, name: "Random", passwordHash: "pwd", role: "PARENT", schoolId }
    });
    const randomToken = jwt.sign({ userId: randomUser.id, role: randomUser.role, schoolId }, process.env.JWT_SECRET || "supersecret", { expiresIn: "1h" });

    const res = await request(server)
      .get(`/api/v1/messages/${threadId}`)
      .set("Authorization", `Bearer ${randomToken}`);
      
    expect(res.status).toBe(403);
    
    await prisma.user.delete({ where: { id: randomUser.id } });
  });

  it("should mark a thread as read", async () => {
    const res = await request(server)
      .put(`/api/v1/messages/${threadId}/read`)
      .set("Authorization", `Bearer ${parentToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    // Check DB
    const participant = await prisma.messageParticipant.findUnique({
      where: { threadId_userId: { threadId, userId: parentUserId } }
    });
    expect(participant?.lastReadAt).not.toBeNull();
  });
});
