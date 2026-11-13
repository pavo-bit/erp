/**
 * ssvm-backend/src/tests/api/transport-trips-biometrics.test.ts
 * Targeted verification for:
 *   - Transport Trip Lifecycle State Machine
 *   - Geofencing Proximity & Event Detection
 *   - Boarding/Alighting Confirmation
 *   - Fleet Overview & Staleness Monitoring
 *   - Biometric Terminal Device Registry
 *   - Terminal Badge to Teacher Mapping
 *   - Morning Shift Rules & Deduplication
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';
import { createTestApp, getTestPrisma } from '../helpers/testApp';
import { hashPassword, signToken } from '../../middleware/auth';
import {
  calculateDistanceMeters,
  generateVehicleHardwareToken,
  vehicleTelemetryStore,
  activeTripsStore,
} from '../../routes/admin/transport';
import {
  generateBiometricHardwareToken,
  biometricDeviceRegistry,
  biometricTeacherMappingStore,
  processedBiometricEvents,
} from '../../routes/attendance';
import { ModuleRegistryService } from '../../services/module-registry.service';

const app = createTestApp();
const prisma = getTestPrisma();

describe('Transport Trips, Geofencing & Biometric Device Registry Tests', () => {
  const uid = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  let schoolId: string;
  let adminToken: string;
  let teacherId: string;
  let teacherEmployeeId: string;
  let studentId: string;
  let vehicleId: string;
  let routeId: string;
  let stopId: string;
  let tripId: string;

  beforeAll(async () => {
    vehicleTelemetryStore.clear();
    activeTripsStore.clear();
    biometricDeviceRegistry.clear();
    biometricTeacherMappingStore.clear();
    processedBiometricEvents.clear();

    // 1. Create School
    const school = await prisma.school.create({
      data: {
        name: `Fleet Bio School ${uid}`,
        code: `FBS_${uid}`,
        status: 'ACTIVE',
        tenantState: 'ACTIVE',
      },
    });
    schoolId = school.id;

    // 2. Enable HR_PAYROLL, TRANSPORT and BIOMETRIC_ATTENDANCE
    const modRes = await ModuleRegistryService.setSchoolModules(
      schoolId,
      { HR_PAYROLL: true, TRANSPORT: true, BIOMETRIC_ATTENDANCE: true },
      'TEST_SETUP'
    );
    expect(modRes.success).toBe(true);

    // 3. Admin user
    const adminUser = await prisma.user.create({
      data: {
        email: `admin_${uid}@fleet.edu`,
        name: 'Admin Fleet',
        passwordHash: await hashPassword('Admin@123'),
        role: Role.ERP_ADMIN,
        schoolId,
        isActive: true,
      },
    });
    adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
      schoolId,
    });

    // 4. Academic session and class
    const session = await prisma.academicSession.create({
      data: {
        schoolId,
        name: `Session ${uid}`,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        isCurrent: true,
      },
    });
    const cls = await prisma.class.create({
      data: { name: `Grade 9 ${uid}`, schoolId, sessionId: session.id },
    });
    const sec = await prisma.section.create({
      data: { name: 'Sec A', classId: cls.id },
    });

    // 5. Student
    const studentUser = await prisma.user.create({
      data: {
        email: `student_${uid}@fleet.edu`,
        name: 'Student Fleet',
        passwordHash: await hashPassword('Pass@123'),
        role: Role.STUDENT,
        schoolId,
        isActive: true,
      },
    });
    const studentRecord = await prisma.student.create({
      data: {
        userId: studentUser.id,
        schoolId,
        name: 'Student Fleet',
        rollNo: '501',
        sectionId: sec.id,
      },
    });
    studentId = studentRecord.id;

    // 6. Teacher
    const teacherUser = await prisma.user.create({
      data: {
        email: `teacher_${uid}@fleet.edu`,
        name: 'Teacher Fleet',
        passwordHash: await hashPassword('Pass@123'),
        role: Role.TEACHER,
        schoolId,
        isActive: true,
      },
    });
    teacherEmployeeId = `EMP-FB-${uid}`;
    const teacherRecord = await prisma.teacher.create({
      data: {
        userId: teacherUser.id,
        schoolId,
        employeeId: teacherEmployeeId,
      },
    });
    teacherId = teacherRecord.id;

    // 7. Vehicle, Route, Stop
    const vehicle = await prisma.transportVehicle.create({
      data: {
        schoolId,
        registrationNumber: `KA-01-FB-${uid}`,
        vehicleType: 'BUS',
        capacity: 45,
        status: 'ACTIVE',
      },
    });
    vehicleId = vehicle.id;

    const route = await prisma.transportRoute.create({
      data: {
        schoolId,
        name: `North Campus Route ${uid}`,
        vehicleId,
      },
    });
    routeId = route.id;

    const stop = await prisma.transportStop.create({
      data: {
        routeId,
        name: 'Station Square',
        latitude: 12.9716,
        longitude: 77.5946,
      },
    });
    stopId = stop.id;
  });

  // ═════════════════════════════════════════════════════════════════════
  // WORKSTREAM D: TRANSPORT TRIPS, GEOFENCING & FLEET TESTS
  // ═════════════════════════════════════════════════════════════════════

  it('calculates Haversine distance correctly', () => {
    // Distance between (12.9716, 77.5946) and (12.9720, 77.5946) is ~44.4 meters
    const dist = calculateDistanceMeters(12.9716, 77.5946, 12.972, 77.5946);
    expect(dist).toBeGreaterThan(40);
    expect(dist).toBeLessThan(50);
  });

  it('creates and schedules a transport trip', async () => {
    const res = await request(app)
      .post('/api/v1/admin/transport/trips')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        routeId,
        vehicleId,
        tripType: 'MORNING_PICKUP',
        scheduledStartTime: new Date().toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SCHEDULED');
    expect(res.body.data.vehicleId).toBe(vehicleId);
    tripId = res.body.data.id;
  });

  it('rejects invalid trip state transitions (e.g. SCHEDULED directly to COMPLETED)', async () => {
    const res = await request(app)
      .put(`/api/v1/admin/transport/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid state transition');
  });

  it('executes valid state transitions: SCHEDULED -> READY -> STARTED -> IN_PROGRESS', async () => {
    // 1. SCHEDULED -> READY
    let res = await request(app)
      .put(`/api/v1/admin/transport/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'READY' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('READY');

    // 2. READY -> STARTED
    res = await request(app)
      .put(`/api/v1/admin/transport/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'STARTED' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('STARTED');
    expect(res.body.data.actualStartTime).toBeDefined();

    // 3. STARTED -> IN_PROGRESS
    res = await request(app)
      .put(`/api/v1/admin/transport/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_PROGRESS');
  });

  it('records GEOFENCE_ENTER when vehicle reaches stop coordinates (< 50m)', async () => {
    const deviceToken = generateVehicleHardwareToken(vehicleId, schoolId);

    // Send telemetry directly at the stop coordinates (12.9716, 77.5946)
    const res = await request(app)
      .post(`/api/v1/admin/transport/vehicles/${vehicleId}/telemetry`)
      .set('X-Device-Token', deviceToken)
      .send({
        latitude: 12.9716,
        longitude: 77.5946,
        speed: 15.0,
        heading: 90,
      });

    expect(res.status).toBe(200);

    // Query trip details to assert geofence event
    const tripRes = await request(app)
      .get(`/api/v1/admin/transport/trips/${tripId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(tripRes.status).toBe(200);
    const geofenceEvents = tripRes.body.data.geofenceEvents;
    expect(geofenceEvents.length).toBeGreaterThanOrEqual(1);
    expect(geofenceEvents[0].eventType).toBe('GEOFENCE_ENTER');
    expect(geofenceEvents[0].stopId).toBe(stopId);
    expect(geofenceEvents[0].distanceMeters).toBeLessThanOrEqual(50);
  });

  it('records student boarding confirmation independently of geofence arrival', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/transport/trips/${tripId}/stops/${stopId}/confirm-boarding`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId,
        action: 'BOARDED',
        notes: 'Card scanned by conductor',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.studentId).toBe(studentId);
    expect(res.body.data.action).toBe('BOARDED');
  });

  it('provides admin fleet overview with live telemetry and ONLINE_ACTIVE freshness', async () => {
    const res = await request(app)
      .get('/api/v1/admin/transport/fleet/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalVehicles).toBeGreaterThanOrEqual(1);
    expect(res.body.onlineCount).toBeGreaterThanOrEqual(1);

    const vehicleEntry = res.body.fleet.find((v: any) => v.id === vehicleId);
    expect(vehicleEntry).toBeDefined();
    expect(vehicleEntry.freshness).toBe('ONLINE_ACTIVE');
    expect(vehicleEntry.telemetry.latitude).toBe(12.9716);
    expect(vehicleEntry.activeTrip.id).toBe(tripId);
  });

  // ═════════════════════════════════════════════════════════════════════
  // WORKSTREAM E: BIOMETRIC DEVICE REGISTRY & TEACHER MAPPING TESTS
  // ═════════════════════════════════════════════════════════════════════

  it('registers a physical biometric terminal device in the registry', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/biometric/devices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deviceId: 'ZKT-EAST-01',
        name: 'East Wing Terminal',
        model: 'ZKTeco K40 Pro',
        location: 'Staff Entrance East',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('ZKT-EAST-01');
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('lists registered biometric devices for the school', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/biometric/devices')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].id).toBe('ZKT-EAST-01');
  });

  it('maps terminal device badge number to ERP teacher record', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/biometric/mappings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deviceUserId: 'BADGE-999',
        teacherId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceUserId).toBe('BADGE-999');
    expect(res.body.data.employeeId).toBe(teacherEmployeeId);
  });

  it('processes biometric punch using mapped badge ID with shift rules and idempotency', async () => {
    const eventId = `bio-evt-map-${Date.now()}`;
    const deviceToken = generateBiometricHardwareToken('ZKT-EAST-01', schoolId);

    // Punch at 08:35 UTC (within morning shift grace period -> PRESENT)
    const punchRes = await request(app)
      .post('/api/v1/attendance/biometric/event')
      .set('X-Device-Token', deviceToken)
      .send({
        deviceId: 'ZKT-EAST-01',
        schoolId,
        events: [
          {
            eventId,
            employeeId: 'BADGE-999', // Mapped badge ID
            timestamp: new Date('2026-11-08T08:35:00.000Z').toISOString(),
            eventType: 'CHECK_IN',
            verificationMethod: 'FINGERPRINT_ON_DEVICE',
          },
        ],
      });

    expect(punchRes.status).toBe(200);
    expect(punchRes.body.processedCount).toBe(1);
    expect(punchRes.body.results[0].status).toBe('RECORDED');
    expect(punchRes.body.results[0].attendanceStatus).toBe('PRESENT');

    // Replay identical event -> Assert DUPLICATE_IGNORED
    const replayRes = await request(app)
      .post('/api/v1/attendance/biometric/event')
      .set('X-Device-Token', deviceToken)
      .send({
        deviceId: 'ZKT-EAST-01',
        schoolId,
        events: [
          {
            eventId,
            employeeId: 'BADGE-999',
            timestamp: new Date('2026-11-08T08:35:00.000Z').toISOString(),
            eventType: 'CHECK_IN',
            verificationMethod: 'FINGERPRINT_ON_DEVICE',
          },
        ],
      });

    expect(replayRes.status).toBe(200);
    expect(replayRes.body.processedCount).toBe(0);
    expect(replayRes.body.ignoredCount).toBe(1);
    expect(replayRes.body.results[0].status).toBe('DUPLICATE_IGNORED');
  });

  it('revokes a biometric terminal device', async () => {
    const res = await request(app)
      .delete('/api/v1/attendance/biometric/devices/ZKT-EAST-01')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('REVOKED');
  });
});

