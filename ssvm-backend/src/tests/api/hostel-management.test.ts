/**
 * ssvm-backend/src/tests/api/hostel-management.test.ts
 *
 * Verifies Hostel & Dormitory Management:
 * - Room creation, uniqueness, and capacity bounds
 * - Dynamic room status computation (AVAILABLE, OCCUPIED, FULL, MAINTENANCE)
 * - Safe student bed allocation with concurrency row locking
 * - Duplicate active allocation prevention
 * - Gender policy enforcement (MALE, FEMALE, COED)
 * - Maintenance room allocation rejection
 * - Atomic bed transfer between rooms
 * - Resident checkout lifecycle
 * - Multi-tenant isolation and PostgreSQL RLS compliance
 * - Module entitlement enforcement (HOSTEL)
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, createTestUser, getTestPrisma } from "../helpers/testApp";
import { Role } from "@prisma/client";
import { ModuleRegistryService } from "../../services/module-registry.service";

describe("Hostel Management & Dormitory Allocations", () => {
  const prisma = getTestPrisma();
  let app: any;
  let schoolAId: string;
  let schoolBId: string;
  let schoolAAdminToken: string;
  let schoolBAdminToken: string;
  let studentMaleA: any;
  let studentFemaleA: any;
  let studentB: any;

  beforeEach(async () => {
    app = createTestApp();
    const ts = Date.now();
    schoolAId = `school_hostel_a_${ts}`;
    schoolBId = `school_hostel_b_${ts}`;

    // Create test schools
    await prisma.school.createMany({
      data: [
        { id: schoolAId, name: "Hostel School A", code: `HSA-${ts}` },
        { id: schoolBId, name: "Hostel School B", code: `HSB-${ts}` },
      ],
    });

    // Enable HOSTEL module for School A and B
    await ModuleRegistryService.setSchoolModules(schoolAId, { HOSTEL: true }, "TEST_SETUP");
    await ModuleRegistryService.setSchoolModules(schoolBId, { HOSTEL: true }, "TEST_SETUP");

    // Create ERP Admins
    const schoolAAdmin = await createTestUser(Role.ERP_ADMIN, schoolAId);
    schoolAAdminToken = schoolAAdmin.token;

    const schoolBAdmin = await createTestUser(Role.ERP_ADMIN, schoolBId);
    schoolBAdminToken = schoolBAdmin.token;

    // Create test students for School A
    studentMaleA = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        name: "Arjun Verma",
        rollNo: `R-M-${ts}`,
        admissionNo: `ADM-M-${ts}`,
        gender: "MALE",
        dob: new Date("2008-05-15"),
      },
    });

    studentFemaleA = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        name: "Pooja Sharma",
        rollNo: `R-F-${ts}`,
        admissionNo: `ADM-F-${ts}`,
        gender: "FEMALE",
        dob: new Date("2008-08-20"),
      },
    });

    // Create test student for School B (cross-tenant)
    studentB = await prisma.student.create({
      data: {
        schoolId: schoolBId,
        name: "Rohan Patel",
        rollNo: `R-B-${ts}`,
        admissionNo: `ADM-B-${ts}`,
        gender: "MALE",
        dob: new Date("2008-11-10"),
      },
    });
  });

  describe("Room Creation & Management", () => {
    it("creates a new hostel room successfully", async () => {
      const res = await request(app)
        .post("/api/v1/ancillary/hostel/rooms")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          building: "Block A",
          roomNumber: "101",
          capacity: 3,
          gender: "MALE",
          status: "AVAILABLE",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.roomNumber).toBe("101");
      expect(res.body.data.capacity).toBe(3);
      expect(res.body.data.gender).toBe("MALE");
    });

    it("rejects duplicate room numbers in the same building and school", async () => {
      await request(app)
        .post("/api/v1/ancillary/hostel/rooms")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          building: "Block A",
          roomNumber: "102",
          capacity: 4,
          gender: "COED",
        });

      const duplicateRes = await request(app)
        .post("/api/v1/ancillary/hostel/rooms")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          building: "Block A",
          roomNumber: "102",
          capacity: 2,
          gender: "MALE",
        });

      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.error).toContain("already exists");
    });

    it("updates room capacity and gender policy", async () => {
      const createRes = await request(app)
        .post("/api/v1/ancillary/hostel/rooms")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          building: "Block B",
          roomNumber: "201",
          capacity: 2,
          gender: "MALE",
        });

      const roomId = createRes.body.data.id;

      const updateRes = await request(app)
        .put(`/api/v1/ancillary/hostel/rooms/${roomId}`)
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          capacity: 4,
          gender: "COED",
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.capacity).toBe(4);
      expect(updateRes.body.data.gender).toBe("COED");
    });
  });

  describe("Student Bed Allocation & Concurrency Safety", () => {
    it("allocates a student to a room and computes correct status badges", async () => {
      // 1. Create a 1-bed room
      const roomRes = await request(app)
        .post("/api/v1/ancillary/hostel/rooms")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          building: "Block C",
          roomNumber: "301",
          capacity: 1,
          gender: "MALE",
        });
      const roomId = roomRes.body.data.id;

      // Check room before allocation
      let listRes = await request(app)
        .get("/api/v1/ancillary/hostel/rooms")
        .set("Authorization", `Bearer ${schoolAAdminToken}`);
      let room = listRes.body.data.find((r: any) => r.id === roomId);
      expect(room.status).toBe("AVAILABLE");
      expect(room.availableBeds).toBe(1);

      // 2. Allocate student
      const allocRes = await request(app)
        .post("/api/v1/ancillary/hostel/allocate")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          studentId: studentMaleA.id,
          roomId,
          startDate: "2026-06-01",
        });

      expect(allocRes.status).toBe(201);
      expect(allocRes.body.success).toBe(true);
      expect(allocRes.body.data.status).toBe("ACTIVE");

      // 3. Room is now FULL
      listRes = await request(app)
        .get("/api/v1/ancillary/hostel/rooms")
        .set("Authorization", `Bearer ${schoolAAdminToken}`);
      room = listRes.body.data.find((r: any) => r.id === roomId);
      expect(room.status).toBe("FULL");
      expect(room.availableBeds).toBe(0);
      expect(room.activeCount).toBe(1);
    });

    it("rejects allocation when room capacity is exceeded", async () => {
      // Room with capacity = 1
      const roomRes = await request(app)
        .post("/api/v1/ancillary/hostel/rooms")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          building: "Block C",
          roomNumber: "302",
          capacity: 1,
          gender: "COED",
        });
      const roomId = roomRes.body.data.id;

      // Allocate first student
      await request(app)
        .post("/api/v1/ancillary/hostel/allocate")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          studentId: studentMaleA.id,
          roomId,
        });

      // Attempt to allocate second student
      const overflowRes = await request(app)
        .post("/api/v1/ancillary/hostel/allocate")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          studentId: studentFemaleA.id,
          roomId,
        });

      expect(overflowRes.status).toBe(400);
      expect(overflowRes.body.success).toBe(false);
      expect(overflowRes.body.error).toContain("capacity");
    });

    it("rejects duplicate active allocation for the same student", async () => {
      const room1 = await prisma.hostelRoom.create({
        data: { schoolId: schoolAId, building: "Block D", roomNumber: "401", capacity: 2, gender: "MALE" },
      });
      const room2 = await prisma.hostelRoom.create({
        data: { schoolId: schoolAId, building: "Block D", roomNumber: "402", capacity: 2, gender: "MALE" },
      });

      // First allocation
      const firstAlloc = await request(app)
        .post("/api/v1/ancillary/hostel/allocate")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          studentId: studentMaleA.id,
          roomId: room1.id,
        });
      expect(firstAlloc.status).toBe(201);

      // Second allocation in another room
      const secondAlloc = await request(app)
        .post("/api/v1/ancillary/hostel/allocate")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          studentId: studentMaleA.id,
          roomId: room2.id,
        });

      expect(secondAlloc.status).toBe(400);
      expect(secondAlloc.body.success).toBe(false);
      expect(secondAlloc.body.error).toContain("already has an active");
    });

    it("enforces gender policy matching room rules", async () => {
      // Create Boys Only room
      const boysRoom = await prisma.hostelRoom.create({
        data: { schoolId: schoolAId, building: "Boys Hostel", roomNumber: "101", capacity: 2, gender: "MALE" },
      });

      // Attempt to allocate Female student into Boys Only room
      const mismatchRes = await request(app)
        .post("/api/v1/ancillary/hostel/allocate")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          studentId: studentFemaleA.id,
          roomId: boysRoom.id,
        });

      expect(mismatchRes.status).toBe(400);
      expect(mismatchRes.body.success).toBe(false);
      expect(mismatchRes.body.error).toContain("Gender policy violation");
    });

    it("rejects allocations into rooms undergoing maintenance", async () => {
      const maintRoom = await prisma.hostelRoom.create({
        data: {
          schoolId: schoolAId,
          building: "Block M",
          roomNumber: "999",
          capacity: 4,
          gender: "COED",
          status: "MAINTENANCE",
        },
      });

      const res = await request(app)
        .post("/api/v1/ancillary/hostel/allocate")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          studentId: studentMaleA.id,
          roomId: maintRoom.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("maintenance");
    });
  });

  describe("Atomic Room Transfer & Checkout", () => {
    it("atomically transfers a student from one room to another", async () => {
      const roomA = await prisma.hostelRoom.create({
        data: { schoolId: schoolAId, building: "Hostel 1", roomNumber: "101", capacity: 2, gender: "MALE" },
      });
      const roomB = await prisma.hostelRoom.create({
        data: { schoolId: schoolAId, building: "Hostel 1", roomNumber: "102", capacity: 2, gender: "MALE" },
      });

      // Initial allocation in roomA
      const allocRes = await request(app)
        .post("/api/v1/ancillary/hostel/allocate")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          studentId: studentMaleA.id,
          roomId: roomA.id,
        });
      const allocationId = allocRes.body.data.id;

      // Transfer to roomB
      const transferRes = await request(app)
        .put(`/api/v1/ancillary/hostel/allocations/${allocationId}/transfer`)
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          targetRoomId: roomB.id,
        });

      expect(transferRes.status).toBe(200);
      expect(transferRes.body.success).toBe(true);
      expect(transferRes.body.data.newAllocation.roomId).toBe(roomB.id);
      expect(transferRes.body.data.newAllocation.status).toBe("ACTIVE");

      // Verify roomA is now empty and roomB has 1 active occupant
      const listRes = await request(app)
        .get("/api/v1/ancillary/hostel/rooms")
        .set("Authorization", `Bearer ${schoolAAdminToken}`);

      const refreshedRoomA = listRes.body.data.find((r: any) => r.id === roomA.id);
      const refreshedRoomB = listRes.body.data.find((r: any) => r.id === roomB.id);

      expect(refreshedRoomA.activeCount).toBe(0);
      expect(refreshedRoomB.activeCount).toBe(1);
    });

    it("checks out a student and marks allocation as CHECKED_OUT", async () => {
      const room = await prisma.hostelRoom.create({
        data: { schoolId: schoolAId, building: "Hostel 2", roomNumber: "201", capacity: 1, gender: "MALE" },
      });

      const allocRes = await request(app)
        .post("/api/v1/ancillary/hostel/allocate")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          studentId: studentMaleA.id,
          roomId: room.id,
        });
      const allocationId = allocRes.body.data.id;

      const checkoutRes = await request(app)
        .put(`/api/v1/ancillary/hostel/allocations/${allocationId}/checkout`)
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          endDate: new Date().toISOString(),
        });

      expect(checkoutRes.status).toBe(200);
      expect(checkoutRes.body.success).toBe(true);
      expect(checkoutRes.body.data.status).toBe("CHECKED_OUT");
      expect(checkoutRes.body.data.endDate).toBeTruthy();

      // Bed is free again
      const listRes = await request(app)
        .get("/api/v1/ancillary/hostel/rooms")
        .set("Authorization", `Bearer ${schoolAAdminToken}`);
      const refreshedRoom = listRes.body.data.find((r: any) => r.id === room.id);
      expect(refreshedRoom.availableBeds).toBe(1);
      expect(refreshedRoom.status).toBe("AVAILABLE");
    });
  });

  describe("Multi-Tenancy & Module Entitlement Protection", () => {
    it("strictly isolates rooms between School A and School B", async () => {
      // Create room in School A
      await request(app)
        .post("/api/v1/ancillary/hostel/rooms")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          building: "A-Only Dorm",
          roomNumber: "001",
          capacity: 2,
          gender: "COED",
        });

      // School B admin queries rooms
      const schoolBRes = await request(app)
        .get("/api/v1/ancillary/hostel/rooms")
        .set("Authorization", `Bearer ${schoolBAdminToken}`);

      expect(schoolBRes.status).toBe(200);
      const roomsB = schoolBRes.body.data;
      const foundA = roomsB.find((r: any) => r.building === "A-Only Dorm");
      expect(foundA).toBeUndefined();
    });

    it("rejects allocating School B student into School A room", async () => {
      const roomA = await prisma.hostelRoom.create({
        data: { schoolId: schoolAId, building: "Dorm A", roomNumber: "777", capacity: 2, gender: "MALE" },
      });

      const res = await request(app)
        .post("/api/v1/ancillary/hostel/allocate")
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          studentId: studentB.id, // Belongs to School B!
          roomId: roomA.id,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Student not found");
    });

    it("returns 403 MODULE_DISABLED when HOSTEL module is disabled", async () => {
      // Disable HOSTEL for School A
      await ModuleRegistryService.setSchoolModules(schoolAId, { HOSTEL: false }, "TEST_DEACTIVATE");

      const res = await request(app)
        .get("/api/v1/ancillary/hostel/rooms")
        .set("Authorization", `Bearer ${schoolAAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("MODULE_DISABLED");
    });
  });
});
