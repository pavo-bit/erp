import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app";
import prisma from "../lib/prisma";
import { generateAccessToken } from "../lib/tokens";

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

    const uid = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    // Create a school
    const school = await prisma.school.create({
      data: {
        name: "Test Messaging School",
        code: `MSG-${uid}`,
        address: "Test Address",
        email: `messaging_${uid}@test.com`,
        phone: "1234567890"
      }
    });
    schoolId = school.id;

    // Create Teacher User
    const teacherUser = await prisma.user.create({
      data: {
        email: `teacher.msg.${uid}@test.com`,
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
        email: `parent.msg.${uid}@test.com`,
        name: "Parent Msg",
        passwordHash: "hashedpassword",
        role: "PARENT",
        schoolId,
      }
    });
    parentUserId = parentUser.id;

    // Generate Tokens
    teacherToken = generateAccessToken({
      userId: teacherUser.id,
      email: teacherUser.email,
      name: teacherUser.name,
      role: teacherUser.role,
      schoolId,
      branchId: null,
      sid: "mock-session-teacher",
      impersonated: false,
    }).token;

    parentToken = generateAccessToken({
      userId: parentUser.id,
      email: parentUser.email,
      name: parentUser.name,
      role: parentUser.role,
      schoolId,
      branchId: null,
      sid: "mock-session-parent",
      impersonated: false,
    }).token;

    // Pre-create initial thread and message so tests can run in any sequence under shuffle
    const initialThread = await prisma.messageThread.create({
      data: {
        schoolId,
        subject: "Welcome to Class",
        participants: {
          create: [
            { userId: teacherUserId },
            { userId: parentUserId }
          ]
        },
        messages: {
          create: [
            {
              senderId: teacherUserId,
              content: "Hello Parent, how are you?"
            }
          ]
        }
      }
    });
    threadId = initialThread.id;
  });

  afterAll(async () => {
    if (schoolId) {
      await prisma.messageParticipant.deleteMany({ where: { thread: { schoolId } } });
      await prisma.message.deleteMany({ where: { thread: { schoolId } } });
      await prisma.messageThread.deleteMany({ where: { schoolId } });
      const userIds = [teacherUserId, parentUserId].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
      await prisma.school.delete({ where: { id: schoolId } });
    }

    server?.close();
    await prisma.$disconnect();
  });

  it("should start a new message thread", async () => {
    const res = await request(server)
      .post("/api/v1/messages/threads")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        subject: "New Topic Thread",
        participantIds: [parentUserId]
      });
      
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subject).toBe("New Topic Thread");
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
    expect(res.body.data.some((t: any) => t.id === threadId)).toBe(true);
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
    const randomToken = generateAccessToken({
      userId: randomUser.id,
      email: randomUser.email,
      name: randomUser.name,
      role: randomUser.role,
      schoolId,
      branchId: null,
      sid: "mock-session-random",
      impersonated: false,
    }).token;

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
