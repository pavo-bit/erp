/**
 * ssvm-backend/src/tests/api/transport-fleet-drivers.test.ts
 *
 * Verifies Transport & Vehicles Scope Alignment:
 * 1. Sequential fleet numbering (Vehicle 01, Vehicle 02) per school scope.
 * 2. Driver identity reuse: assigning existing school staff (User) as drivers without duplicate accounts.
 * 3. Driver creation with new staff credentials and license metadata.
 * 4. Schedule conflict algorithm: blocks overlapping route assignments for the same vehicle.
 * 5. Multi-route assignment permitted for non-overlapping schedule windows.
 * 6. Safe vehicle archiving: marks INACTIVE when referenced by routes to preserve historical records.
 * 7. Hard deletion permitted only when vehicle is unreferenced.
 * 8. Strict multi-tenant isolation across schools.
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, createTestUser, getTestPrisma } from "../helpers/testApp";
import { Role } from "@prisma/client";
import { ModuleRegistryService } from "../../services/module-registry.service";

describe("Transport Fleet & Driver Management", () => {
  const prisma = getTestPrisma();
  let app: any;
  let schoolAId: string;
  let schoolBId: string;
  let adminAToken: string;
  let adminBToken: string;
  let existingStaffA: any;

  beforeEach(async () => {
    app = createTestApp();
    const ts = Date.now();
    schoolAId = `school_trans_a_${ts}`;
    schoolBId = `school_trans_b_${ts}`;

    // Create test schools
    await prisma.school.createMany({
      data: [
        { id: schoolAId, name: "Transport School A", code: `TSA-${ts}` },
        { id: schoolBId, name: "Transport School B", code: `TSB-${ts}` },
      ],
    });

    // Entitle TRANSPORT module
    await ModuleRegistryService.setSchoolModules(schoolAId, { TRANSPORT: true }, "TEST_SETUP");
    await ModuleRegistryService.setSchoolModules(schoolBId, { TRANSPORT: true }, "TEST_SETUP");

    // Create Admins
    const adminA = await createTestUser(Role.ERP_ADMIN, schoolAId);
    adminAToken = adminA.token;

    const adminB = await createTestUser(Role.ERP_ADMIN, schoolBId);
    adminBToken = adminB.token;

    // Create existing staff member in School A
    existingStaffA = await prisma.user.create({
      data: {
        schoolId: schoolAId,
        email: `staff_${ts}@schoola.edu`,
        name: "Ramesh Sharma",
        role: Role.RECEPTIONIST,
        phone: "+919876543210",
        passwordHash: "hashedpassword",
      },
    });
  });

  describe("Sequential Fleet Numbering", () => {
    it("assigns monotonic sequential fleet numbers per school scope", async () => {
      const res1 = await request(app)
        .post("/api/v1/admin/transport/vehicles")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          registrationNumber: "KA-01-A-1001",
          vehicleType: "BUS",
          capacity: 40,
        });

      expect(res1.status).toBe(201);
      expect(res1.body.data.fleetNumber).toBe("Vehicle 01");

      const res2 = await request(app)
        .post("/api/v1/admin/transport/vehicles")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          registrationNumber: "KA-01-A-1002",
          vehicleType: "MINIVAN",
          capacity: 20,
        });

      expect(res2.status).toBe(201);
      expect(res2.body.data.fleetNumber).toBe("Vehicle 02");

      // School B must start its own counter independently
      const resB = await request(app)
        .post("/api/v1/admin/transport/vehicles")
        .set("Authorization", `Bearer ${adminBToken}`)
        .send({
          registrationNumber: "DL-01-B-2001",
          vehicleType: "BUS",
          capacity: 50,
        });

      expect(resB.status).toBe(201);
      expect(resB.body.data.fleetNumber).toBe("Vehicle 01");
    });
  });

  describe("Driver Identity & Staff Reuse", () => {
    it("reuses existing staff identity as a driver without creating duplicate accounts", async () => {
      const initialUsersCount = await prisma.user.count({ where: { schoolId: schoolAId } });

      const res = await request(app)
        .post("/api/v1/admin/transport/drivers")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          existingStaffId: existingStaffA.id,
          licenseNumber: "DL-0420110056789",
          licenseClass: "HMV",
          licenseExpiry: "2030-12-31",
          emergencyContactName: "Geeta Sharma",
          emergencyContactPhone: "+919876543211",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(existingStaffA.id);
      expect(res.body.data.name).toBe("Ramesh Sharma");
      expect(res.body.data.licenseNumber).toBe("DL-0420110056789");

      // Verify no duplicate User row was added
      const afterCount = await prisma.user.count({ where: { schoolId: schoolAId } });
      expect(afterCount).toBe(initialUsersCount);
    });

    it("creates a new driver profile with dedicated staff identity", async () => {
      const res = await request(app)
        .post("/api/v1/admin/transport/drivers")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          name: "Suresh Kumar",
          email: `suresh_${Date.now()}@transport.local`,
          phone: "+919123456780",
          licenseNumber: "DL-0420150099999",
          licenseClass: "HMV",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Suresh Kumar");
      expect(res.body.data.licenseNumber).toBe("DL-0420150099999");
    });
  });

  describe("Vehicle-Route Scheduling & Conflict Detection", () => {
    let vehicleA: any;

    beforeEach(async () => {
      const vRes = await request(app)
        .post("/api/v1/admin/transport/vehicles")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          registrationNumber: `KA-01-SCH-${Date.now()}`,
          vehicleType: "BUS",
          capacity: 40,
        });
      vehicleA = vRes.body.data;
    });

    it("rejects assigning a vehicle to a route with an overlapping schedule window", async () => {
      // 1. Create Route 1: Morning 07:00 - 08:30
      const r1Res = await request(app)
        .post("/api/v1/admin/transport/routes")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          name: "Morning Route 1",
          vehicleId: vehicleA.id,
        });
      const route1 = r1Res.body.data;

      // Add stops with timing 07:00 to 08:30
      await request(app)
        .post("/api/v1/admin/transport/stops")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          routeId: route1.id,
          name: "Start Stop",
          pickupTime: "07:00",
          dropoffTime: "15:00",
          fare: 1000,
        });

      await request(app)
        .post("/api/v1/admin/transport/stops")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          routeId: route1.id,
          name: "Campus Gate",
          pickupTime: "08:30",
          dropoffTime: "16:00",
          fare: 1000,
        });

      // 2. Create Route 2: Overlapping morning 08:00 - 09:15
      const r2Res = await request(app)
        .post("/api/v1/admin/transport/routes")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          name: "Overlapping Route 2",
        });
      const route2 = r2Res.body.data;

      await request(app)
        .post("/api/v1/admin/transport/stops")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          routeId: route2.id,
          name: "Overlap Stop 1",
          pickupTime: "08:00",
          dropoffTime: "15:30",
          fare: 1000,
        });

      await request(app)
        .post("/api/v1/admin/transport/stops")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          routeId: route2.id,
          name: "Overlap Campus Gate",
          pickupTime: "09:15",
          dropoffTime: "16:30",
          fare: 1000,
        });

      // 3. Attempt to assign vehicleA to Route 2 -> must be rejected with 400
      const conflictRes = await request(app)
        .put(`/api/v1/admin/transport/routes/${route2.id}`)
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          name: "Overlapping Route 2",
          vehicleId: vehicleA.id,
        });

      expect(conflictRes.status).toBe(400);
      expect(conflictRes.body.error).toContain("Schedule conflict");
    });

    it("permits assigning the same vehicle to non-overlapping schedule routes", async () => {
      // Route 1: Morning Shift 06:30 - 07:45
      const r1Res = await request(app)
        .post("/api/v1/admin/transport/routes")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          name: "Early Shift Route",
          vehicleId: vehicleA.id,
        });
      const route1 = r1Res.body.data;

      await request(app)
        .post("/api/v1/admin/transport/stops")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          routeId: route1.id,
          name: "Early Start",
          pickupTime: "06:30",
          dropoffTime: "13:00",
          fare: 1000,
        });

      await request(app)
        .post("/api/v1/admin/transport/stops")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          routeId: route1.id,
          name: "Early End",
          pickupTime: "07:45",
          dropoffTime: "14:00",
          fare: 1000,
        });

      // Route 2: Late Shift 08:30 - 09:30 (No overlap!)
      const r2Res = await request(app)
        .post("/api/v1/admin/transport/routes")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          name: "Late Shift Route",
          vehicleId: vehicleA.id,
        });
      const route2 = r2Res.body.data;

      await request(app)
        .post("/api/v1/admin/transport/stops")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          routeId: route2.id,
          name: "Late Start",
          pickupTime: "08:30",
          dropoffTime: "16:00",
          fare: 1000,
        });

      await request(app)
        .post("/api/v1/admin/transport/stops")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          routeId: route2.id,
          name: "Late End",
          pickupTime: "09:30",
          dropoffTime: "17:00",
          fare: 1000,
        });

      // Update route2 to vehicleA
      const assignRes = await request(app)
        .put(`/api/v1/admin/transport/routes/${route2.id}`)
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          name: "Late Shift Route",
          vehicleId: vehicleA.id,
        });

      expect(assignRes.status).toBe(200);
      expect(assignRes.body.data.vehicleId).toBe(vehicleA.id);
    });
  });

  describe("Safe Vehicle Archiving vs Deletion", () => {
    it("safely archives a vehicle to INACTIVE when assigned to routes to prevent data corruption", async () => {
      // Create vehicle
      const vRes = await request(app)
        .post("/api/v1/admin/transport/vehicles")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          registrationNumber: `KA-01-ARCH-${Date.now()}`,
          vehicleType: "BUS",
          capacity: 40,
        });
      const vehicle = vRes.body.data;

      // Assign to a route
      await request(app)
        .post("/api/v1/admin/transport/routes")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          name: "Active Fleet Route",
          vehicleId: vehicle.id,
        });

      // Attempt deletion
      const delRes = await request(app)
        .delete(`/api/v1/admin/transport/vehicles/${vehicle.id}`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.archived).toBe(true);

      // Verify status is now INACTIVE in database
      const dbVehicle = await prisma.transportVehicle.findUnique({ where: { id: vehicle.id } });
      expect(dbVehicle?.status).toBe("INACTIVE");
    });

    it("hard-deletes an unreferenced vehicle that has no assigned routes", async () => {
      const vRes = await request(app)
        .post("/api/v1/admin/transport/vehicles")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          registrationNumber: `KA-01-FREE-${Date.now()}`,
          vehicleType: "VAN",
          capacity: 12,
        });
      const vehicle = vRes.body.data;

      const delRes = await request(app)
        .delete(`/api/v1/admin/transport/vehicles/${vehicle.id}`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.deleted).toBe(true);

      const dbVehicle = await prisma.transportVehicle.findUnique({ where: { id: vehicle.id } });
      expect(dbVehicle).toBeNull();
    });
  });

  describe("Multi-Tenant Isolation", () => {
    it("prevents School B from viewing or updating School A vehicles", async () => {
      const vRes = await request(app)
        .post("/api/v1/admin/transport/vehicles")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          registrationNumber: `KA-01-ISOL-${Date.now()}`,
          vehicleType: "BUS",
          capacity: 35,
        });
      const vehicleA = vRes.body.data;

      // School B attempts to get vehicleA
      const getRes = await request(app)
        .get(`/api/v1/admin/transport/vehicles/${vehicleA.id}`)
        .set("Authorization", `Bearer ${adminBToken}`);

      expect(getRes.status).toBe(404);

      // School B attempts to update vehicleA
      const updateRes = await request(app)
        .put(`/api/v1/admin/transport/vehicles/${vehicleA.id}`)
        .set("Authorization", `Bearer ${adminBToken}`)
        .send({
          registrationNumber: "ATTACK-REG",
        });

      expect(updateRes.status).toBe(404);
    });
  });
});
