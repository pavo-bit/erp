/**
 * ssvm-backend/src/tests/api/transport-telemetry.test.ts
 * Verifies hardware device authentication (X-Device-Token), telemetry bounds,
 * freshness validation, Redis/memory caching, and cross-tenant isolation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, createTestUser, getTestPrisma } from "../helpers/testApp";
import { Role } from "@prisma/client";
import { generateVehicleHardwareToken, vehicleTelemetryStore } from "../../routes/admin/transport";

describe("Transport Telemetry & Hardware Device Authentication", () => {
  const prisma = getTestPrisma();
  let app: any;
  let superAdminToken: string;
  let schoolAId: string;
  let schoolBId: string;
  let schoolAAdminToken: string;
  let schoolBAdminToken: string;
  let vehicleAId: string;
  let vehicleBId: string;

  beforeEach(async () => {
    app = createTestApp();
    vehicleTelemetryStore.clear();

    schoolAId = `school_trans_a_${Date.now()}`;
    schoolBId = `school_trans_b_${Date.now()}`;

    // Create test schools
    await prisma.school.createMany({
      data: [
        { id: schoolAId, name: "Transport Test School A", code: `TSA-${Date.now()}` },
        { id: schoolBId, name: "Transport Test School B", code: `TSB-${Date.now()}` },
      ],
    });

    const superAdmin = await createTestUser(Role.SUPER_ADMIN);
    superAdminToken = superAdmin.token;

    const schoolAAdmin = await createTestUser(Role.ERP_ADMIN, schoolAId);
    schoolAAdminToken = schoolAAdmin.token;

    const schoolBAdmin = await createTestUser(Role.ERP_ADMIN, schoolBId);
    schoolBAdminToken = schoolBAdmin.token;

    // Create test vehicles
    const vehicleA = await prisma.transportVehicle.create({
      data: {
        schoolId: schoolAId,
        registrationNumber: `KA-01-DR-${Date.now()}`,
        vehicleType: "BUS",
        capacity: 40,
        status: "ACTIVE",
      },
    });
    vehicleAId = vehicleA.id;

    const vehicleB = await prisma.transportVehicle.create({
      data: {
        schoolId: schoolBId,
        registrationNumber: `KA-02-DR-${Date.now()}`,
        vehicleType: "VAN",
        capacity: 15,
        status: "ACTIVE",
      },
    });
    vehicleBId = vehicleB.id;
  });

  it("rejects telemetry request without any authentication header", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/transport/vehicles/${vehicleAId}/telemetry`)
      .send({
        latitude: 12.9716,
        longitude: 77.5946,
        speed: 45,
      });

    expect(res.status).toBe(401);
  });

  it("authenticates physical hardware using valid X-Device-Token without user session", async () => {
    const hardwareToken = generateVehicleHardwareToken(vehicleAId, schoolAId);

    const res = await request(app)
      .post(`/api/v1/admin/transport/vehicles/${vehicleAId}/telemetry`)
      .set("X-Device-Token", hardwareToken)
      .send({
        latitude: 12.9716,
        longitude: 77.5946,
        speed: 35.5,
        heading: 180,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.location.latitude).toBe(12.9716);
    expect(res.body.location.longitude).toBe(77.5946);
    expect(res.body.location.speed).toBe(35.5);
  });

  it("rejects invalid or forged X-Device-Token", async () => {
    const forgedToken = `dev:${schoolAId}:${vehicleAId}:fake1234567890abcdef1234567890`;

    const res = await request(app)
      .post(`/api/v1/admin/transport/vehicles/${vehicleAId}/telemetry`)
      .set("X-Device-Token", forgedToken)
      .send({
        latitude: 12.9716,
        longitude: 77.5946,
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects out-of-range GPS coordinates", async () => {
    const hardwareToken = generateVehicleHardwareToken(vehicleAId, schoolAId);

    // Latitude > 90
    const res1 = await request(app)
      .post(`/api/v1/admin/transport/vehicles/${vehicleAId}/telemetry`)
      .set("X-Device-Token", hardwareToken)
      .send({
        latitude: 95.0,
        longitude: 77.5946,
      });
    expect(res1.status).toBe(400);

    // Longitude > 180
    const res2 = await request(app)
      .post(`/api/v1/admin/transport/vehicles/${vehicleAId}/telemetry`)
      .set("X-Device-Token", hardwareToken)
      .send({
        latitude: 12.9716,
        longitude: 195.0,
      });
    expect(res2.status).toBe(400);
  });

  it("rejects unrealistic vehicle speeds exceeding 180 km/h", async () => {
    const hardwareToken = generateVehicleHardwareToken(vehicleAId, schoolAId);

    const res = await request(app)
      .post(`/api/v1/admin/transport/vehicles/${vehicleAId}/telemetry`)
      .set("X-Device-Token", hardwareToken)
      .send({
        latitude: 12.9716,
        longitude: 77.5946,
        speed: 240, // 240 km/h is unrealistic for a school bus
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects stale or excessively drifted timestamps (> 5 minutes)", async () => {
    const hardwareToken = generateVehicleHardwareToken(vehicleAId, schoolAId);
    const staleTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago

    const res = await request(app)
      .post(`/api/v1/admin/transport/vehicles/${vehicleAId}/telemetry`)
      .set("X-Device-Token", hardwareToken)
      .send({
        latitude: 12.9716,
        longitude: 77.5946,
        timestamp: staleTime,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("drift");
  });

  it("prevents ERP_ADMIN from sending telemetry to vehicle of another school (Tenant Isolation)", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/transport/vehicles/${vehicleBId}/telemetry`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({
        latitude: 12.9716,
        longitude: 77.5946,
        speed: 25,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("allows querying live vehicle location after telemetry ingestion", async () => {
    const hardwareToken = generateVehicleHardwareToken(vehicleAId, schoolAId);

    // Ingest telemetry
    await request(app)
      .post(`/api/v1/admin/transport/vehicles/${vehicleAId}/telemetry`)
      .set("X-Device-Token", hardwareToken)
      .send({
        latitude: 13.0827,
        longitude: 80.2707,
        speed: 40,
        heading: 90,
      });

    // Query location
    const res = await request(app)
      .get(`/api/v1/admin/transport/vehicles/${vehicleAId}/location`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.latitude).toBe(13.0827);
    expect(res.body.data.longitude).toBe(80.2707);
    expect(res.body.data.speed).toBe(40);
  });
});
