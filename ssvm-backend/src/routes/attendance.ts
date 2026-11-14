import { Router, Response, Request } from "express";
import crypto from "crypto";
import { z } from "zod";
import prisma, { runWithTenantDatabaseTransaction } from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";
import { requireModule } from "../middleware/moduleGuard";
import { runWithSchoolContext } from "../middleware/school-context.middleware";
import { paginateCursor } from "../lib/paginate";
import { getRedisClient, isRedisAvailable } from "../lib/redis";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, month, date, classId } = req.query as Record<string, string | undefined>;
    const where: any = { schoolId: req.user!.schoolId! };

    if (studentId) where.studentId = studentId;
    if (classId) where.sectionId = classId;

    // If STUDENT, force studentId filter to their own record
    if (req.user!.role === "STUDENT") {
      const studentIdFromToken = (req.user as any).studentId;
      if (!studentIdFromToken) {
        return res.status(400).json({ success: false, error: 'Student ID not found in token' });
      }
      where.studentId = studentIdFromToken;
    }

    if (req.user!.role === "PARENT") {
      const p = await prisma.guardian.findUnique({ where: { userId: req.user!.id }, include: { students: { select: { id: true } } } });
      if (p) where.studentId = { in: p.students.map((c: any) => c.id) };
    }

    if (month) {
      const [y, m] = month.split("-").map(Number);
      where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    if (date) where.date = new Date(date);

    const { cursor, limit = "50" } = req.query;

    const result = await paginateCursor(
      prisma.attendance,
      where,
      cursor,
      parseInt(limit as string, 10),
      { student: { select: { name: true, rollNo: true } } },
      { date: "desc" }
    );

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/", authenticate, requireRole("ADMIN", "TEACHER"), async (req: AuthRequest, res: Response) => {
  try {
    const { records, sectionId, date } = req.body;
    const schoolId = req.user!.schoolId!;
    const markedById = req.user!.id;

    if (!records?.length || !sectionId || !date) {
      res.status(400).json({ success: false, error: "Records, sectionId and date required" });
      return;
    }

    const created = await prisma.$transaction(
      records.map((r: any) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: r.studentId, date: new Date(date) } },
          create: {
            schoolId,
            sectionId,
            studentId: r.studentId,
            date: new Date(date),
            status: r.status,
            remarks: r.remarks || null,
            markedById
          },
          update: {
            status: r.status,
            remarks: r.remarks || null,
            markedById
          }
        })
      )
    );

    res.json({ success: true, data: created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/attendance/teachers
router.get("/teachers", authenticate, requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { month, date, teacherId } = req.query as Record<string, string | undefined>;
    const where: any = { schoolId: req.user!.schoolId! };

    if (teacherId) where.teacherId = teacherId;

    if (month) {
      const [y, m] = month.split("-").map(Number);
      where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    if (date) where.date = new Date(date);

    const { cursor, limit = "50" } = req.query;

    const result = await paginateCursor(
      prisma.teacherAttendance,
      where,
      cursor,
      parseInt(limit as string, 10),
      { teacher: { select: { employeeId: true, user: { select: { name: true } } } } },
      { date: "desc" }
    );

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/attendance/teachers
router.post("/teachers", authenticate, requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { records, date } = req.body;
    const schoolId = req.user!.schoolId!;

    if (!records?.length || !date) {
      res.status(400).json({ success: false, error: "Records and date required" });
      return;
    }

    const created = await prisma.$transaction(
      records.map((r: any) =>
        prisma.teacherAttendance.upsert({
          where: { teacherId_date: { teacherId: r.teacherId, date: new Date(date) } },
          create: {
            teacherId: r.teacherId,
            date: new Date(date),
            status: r.status,
            remarks: r.remarks || null,
          },
          update: {
            status: r.status,
            remarks: r.remarks || null,
          }
        })
      )
    );

    res.json({ success: true, data: created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// =====================================
// BIOMETRIC FINGERPRINT ATTENDANCE
// =====================================

export const processedBiometricEvents = new Set<string>();

export interface BiometricDevice {
  id: string; // deviceId
  schoolId: string;
  name: string;
  model: string;
  location: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'REVOKED';
  credentialState: 'REGISTERED' | 'PENDING';
  lastCommunication?: string;
  totalPunchesRecorded: number;
  supportedVerification: string[];
  createdAt: string;
  updatedAt: string;
}

export const biometricDeviceRegistry = new Map<string, BiometricDevice>();

export interface BiometricTeacherMapping {
  id: string;
  schoolId: string;
  deviceUserId: string;
  teacherId: string;
  employeeId: string;
  teacherName: string;
  createdAt: string;
}

export const biometricTeacherMappingStore = new Map<string, BiometricTeacherMapping>();

export function generateBiometricHardwareToken(deviceId: string, schoolId: string = ''): string {
  const secret = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'device-secret-key-salt')
    .update(`biometric:${schoolId}:${deviceId}`)
    .digest('hex')
    .substring(0, 32);
  return schoolId ? `bio:${schoolId}:${deviceId}:${secret}` : `bio:${deviceId}:${secret}`;
}

async function authenticateBiometricDeviceOrStaff(req: Request, res: Response, next: any): Promise<void> {
  const deviceToken = req.headers['x-device-token'] as string | undefined;
  if (deviceToken) {
    if (typeof deviceToken !== 'string' || deviceToken.length < 8) {
      res.status(401).json({ success: false, error: 'Invalid device token format' });
      return;
    }

    const parts = deviceToken.split(':');
    let tokenSchoolId: string | undefined;
    let tokenDeviceId: string | undefined;

    if (parts.length === 4 && parts[0] === 'bio') {
      tokenSchoolId = parts[1];
      tokenDeviceId = parts[2];
    }

    if (!tokenSchoolId || !tokenDeviceId) {
      res.status(401).json({ success: false, error: 'Device token missing tenant context' });
      return;
    }

    const expected = generateBiometricHardwareToken(tokenDeviceId, tokenSchoolId);

    if (deviceToken !== expected) {
      res.status(401).json({ success: false, error: 'Unauthorized hardware device token' });
      return;
    }

    if (req.body?.schoolId && req.body.schoolId !== tokenSchoolId) {
      res.status(403).json({ success: false, error: 'Cross-tenant hardware ingestion rejected' });
      return;
    }

    (req as any).deviceAuth = { isDevice: true, schoolId: tokenSchoolId, deviceId: tokenDeviceId };
    return next();
  }

  // Fallback to staff JWT
  authenticate(req as AuthRequest, res, () => {
    requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN")(req as AuthRequest, res, next);
  });
}

const biometricEventSchema = z.object({
  deviceId: z.string().min(2),
  schoolId: z.string().min(2),
  events: z.array(z.object({
    eventId: z.string().min(1),
    employeeId: z.string().min(1),
    timestamp: z.string(),
    eventType: z.enum(['CHECK_IN', 'CHECK_OUT', 'PUNCH']).default('CHECK_IN'),
    verificationMethod: z.enum(['FINGERPRINT_ON_DEVICE', 'RFID_CARD', 'FACE_ON_DEVICE']).default('FINGERPRINT_ON_DEVICE'),
  })).min(1),
});

// POST /api/v1/attendance/biometric/event — Ingest Biometric Punches
router.post(
  "/biometric/event",
  authenticateBiometricDeviceOrStaff,
  requireModule("BIOMETRIC_ATTENDANCE"),
  async (req: Request, res: Response) => {
    try {
      const parsed = biometricEventSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "Invalid biometric payload",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { deviceId, schoolId, events } = parsed.data;
      const results: Array<{
        eventId: string;
        employeeId: string;
        status: string;
        attendanceStatus?: string;
        timestamp: string;
      }> = [];

      let processedCount = 0;
      let ignoredCount = 0;

      await runWithSchoolContext(schoolId, async () => {
        for (const event of events) {
          // 1. Idempotency & deduplication check
          let isDuplicate = processedBiometricEvents.has(event.eventId);
          if (!isDuplicate && isRedisAvailable()) {
            try {
              const redis = getRedisClient();
              if (redis) {
                const exists = await redis.get(`bio:evt:${event.eventId}`);
                if (exists) isDuplicate = true;
              }
            } catch (e) {}
          }

          if (isDuplicate) {
            ignoredCount++;
            results.push({
              eventId: event.eventId,
              employeeId: event.employeeId,
              status: "DUPLICATE_IGNORED",
              timestamp: event.timestamp,
            });
            continue;
          }

          // 2. Resolve teacher by employeeId, id, or mapped deviceUserId within school
          let targetEmployeeId = event.employeeId;
          const mapped = Array.from(biometricTeacherMappingStore.values()).find(
            (m) => m.schoolId === schoolId && (m.deviceUserId === event.employeeId || m.employeeId === event.employeeId)
          );
          if (mapped) {
            targetEmployeeId = mapped.employeeId;
          }

          const teacher = await prisma.teacher.findFirst({
            where: {
              schoolId,
              OR: [
                { employeeId: targetEmployeeId },
                { id: targetEmployeeId },
              ],
            },
            select: { id: true, employeeId: true },
          });

          if (!teacher) {
            results.push({
              eventId: event.eventId,
              employeeId: event.employeeId,
              status: "EMPLOYEE_NOT_FOUND",
              timestamp: event.timestamp,
            });
            continue;
          }

          // 3. Process Attendance with shift rules & leave detection
          const eventDate = new Date(event.timestamp);
          const normalizedDate = new Date(Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate()));

          // Check if teacher has an approved leave request on this date
          const onLeave = await prisma.leaveRequest.findFirst({
            where: {
              requesterId: teacher.id,
              status: 'APPROVED',
              startDate: { lte: eventDate },
              endDate: { gte: eventDate },
            },
          });

          // Morning Shift Rule: 08:30 shift start + 15 min grace period = 08:45
          // After 08:45 is LATE, otherwise PRESENT
          const eventHours = eventDate.getUTCHours();
          const eventMinutes = eventDate.getUTCMinutes();
          const isLate = eventHours > 8 || (eventHours === 8 && eventMinutes > 45);
          const attendanceStatus = onLeave ? 'PRESENT' : isLate ? 'LATE' : 'PRESENT';

          const remarks = `Biometric ${event.eventType}: ${eventDate.toISOString()} [Device: ${deviceId}, Verification: ${event.verificationMethod}]${
            isLate ? ' (Late Arrival)' : ''
          }`;

          await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
            await tx.teacherAttendance.upsert({
              where: { teacherId_date: { teacherId: teacher.id, date: normalizedDate } },
              create: {
                teacherId: teacher.id,
                date: normalizedDate,
                status: attendanceStatus,
                remarks,
              },
              update: {
                remarks,
              },
            });
          });

          // Update device stats
          const registeredDevice = biometricDeviceRegistry.get(deviceId);
          if (registeredDevice) {
            registeredDevice.totalPunchesRecorded++;
            registeredDevice.lastCommunication = new Date().toISOString();
          }

          // 4. Mark processed in Redis and memory
          processedBiometricEvents.add(event.eventId);
          if (isRedisAvailable()) {
            try {
              const redis = getRedisClient();
              if (redis) {
                await redis.setex(`bio:evt:${event.eventId}`, 604800, '1'); // 7 days TTL
              }
            } catch (e) {}
          }

          processedCount++;
          results.push({
            eventId: event.eventId,
            employeeId: event.employeeId,
            status: "RECORDED",
            attendanceStatus,
            timestamp: event.timestamp,
          });
        }
      });

      res.status(200).json({
        success: true,
        deviceId,
        schoolId,
        processedCount,
        ignoredCount,
        results,
      });
    } catch (e: any) {
      logger.error({ err: e }, "Biometric event processing error");
      res.status(500).json({ success: false, error: "Internal server error processing biometric event" });
    }
  }
);

// Alias /biometric/sync to /biometric/event for hardware terminal sync
router.post(
  "/biometric/sync",
  authenticateBiometricDeviceOrStaff,
  requireModule("BIOMETRIC_ATTENDANCE"),
  async (req: Request, res: Response) => {
    // Re-route to same logic
    (router.stack as any)
      .find((layer: any) => layer.route?.path === "/biometric/event" && layer.route?.methods?.post)
      ?.handle(req, res);
  }
);

// GET /api/v1/attendance/biometric/status — Hardware & Readiness status
router.get(
  "/biometric/status",
  authenticate,
  requireModule("BIOMETRIC_ATTENDANCE"),
  async (_req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      data: {
        module: "BIOMETRIC_ATTENDANCE",
        status: "ENABLED",
        hardwareIntegrationStatus: "BLOCKED_EXTERNAL",
        externalBlockerReason: "Physical ZKTeco / eSSL biometric scanner hardware not physically attached; software contract fully simulated and ready for terminal sync",
        supportedProtocols: ["REST_JSON_PUSH", "REST_JSON_PULL", "SOAP_ZKTECO_ADMS"],
        privacyCompliance: "ON_DEVICE_TEMPLATE_MATCHING",
        privacyNotes: "Minutiae and biometric vectors are never transmitted or stored off-device. Only anonymized employee ID punches are processed.",
      },
    });
  }
);

// =====================================
// BIOMETRIC DEVICE REGISTRY & MAPPINGS
// =====================================

const registerDeviceSchema = z.object({
  deviceId: z.string().min(2),
  name: z.string().min(2),
  model: z.string().default('ZKTeco K40 / eSSL Standalone'),
  location: z.string().default('Main Campus Entrance'),
});

const createTeacherMappingSchema = z.object({
  deviceUserId: z.string().min(1),
  teacherId: z.string().min(1),
});

// POST /api/v1/attendance/biometric/devices — Register Biometric Terminal
router.post(
  "/biometric/devices",
  authenticate,
  requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"),
  requireModule("BIOMETRIC_ATTENDANCE"),
  async (req: AuthRequest, res: Response) => {
    try {
      const schoolId = req.user!.schoolId!;
      const parsed = registerDeviceSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: "Invalid device payload", details: parsed.error.flatten().fieldErrors });
        return;
      }

      const { deviceId, name, model, location } = parsed.data;
      const device: BiometricDevice = {
        id: deviceId,
        schoolId,
        name,
        model,
        location,
        status: "ACTIVE",
        credentialState: "REGISTERED",
        totalPunchesRecorded: 0,
        supportedVerification: ["FINGERPRINT_ON_DEVICE", "RFID_CARD"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      biometricDeviceRegistry.set(deviceId, device);

      res.status(201).json({ success: true, message: "Biometric terminal registered successfully", data: device });
    } catch (e: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// GET /api/v1/attendance/biometric/devices — List Terminals for School
router.get(
  "/biometric/devices",
  authenticate,
  requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"),
  requireModule("BIOMETRIC_ATTENDANCE"),
  async (req: AuthRequest, res: Response) => {
    try {
      const schoolId = req.user!.schoolId!;
      const devices = Array.from(biometricDeviceRegistry.values()).filter((d) => d.schoolId === schoolId);
      res.json({ success: true, count: devices.length, data: devices });
    } catch (e: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// DELETE /api/v1/attendance/biometric/devices/:id — Revoke Device Terminal
router.delete(
  "/biometric/devices/:id",
  authenticate,
  requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"),
  requireModule("BIOMETRIC_ATTENDANCE"),
  async (req: AuthRequest, res: Response) => {
    try {
      const deviceId = req.params.id as string;
      const device = biometricDeviceRegistry.get(deviceId);
      if (!device || (req.user?.role !== "SUPER_ADMIN" && device.schoolId !== req.user?.schoolId)) {
        res.status(404).json({ success: false, error: "Device terminal not found" });
        return;
      }

      device.status = "REVOKED";
      device.updatedAt = new Date().toISOString();
      res.json({ success: true, message: "Device terminal revoked successfully", data: device });
    } catch (e: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// POST /api/v1/attendance/biometric/mappings — Map Device User ID to ERP Teacher
router.post(
  "/biometric/mappings",
  authenticate,
  requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"),
  requireModule("BIOMETRIC_ATTENDANCE"),
  async (req: AuthRequest, res: Response) => {
    try {
      const schoolId = req.user!.schoolId!;
      const parsed = createTeacherMappingSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: "Invalid mapping payload", details: parsed.error.flatten().fieldErrors });
        return;
      }

      const { deviceUserId, teacherId } = parsed.data;

      // Validate teacher belongs to caller's school
      const teacher = await prisma.teacher.findFirst({
        where: { id: teacherId, schoolId },
        include: { user: { select: { name: true } } },
      });

      if (!teacher) {
        res.status(404).json({ success: false, error: "Teacher not found in your school" });
        return;
      }

      const mappingId = `map_${Date.now()}_${deviceUserId}`;
      const mappingRecord: BiometricTeacherMapping = {
        id: mappingId,
        schoolId,
        deviceUserId,
        teacherId: teacher.id,
        employeeId: teacher.employeeId || teacher.id,
        teacherName: teacher.user.name,
        createdAt: new Date().toISOString(),
      };

      biometricTeacherMappingStore.set(mappingId, mappingRecord);

      res.status(201).json({ success: true, message: "Biometric badge mapped to teacher", data: mappingRecord });
    } catch (e: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// GET /api/v1/attendance/biometric/mappings — List Mappings for School
router.get(
  "/biometric/mappings",
  authenticate,
  requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"),
  requireModule("BIOMETRIC_ATTENDANCE"),
  async (req: AuthRequest, res: Response) => {
    try {
      const schoolId = req.user!.schoolId!;
      const mappings = Array.from(biometricTeacherMappingStore.values()).filter((m) => m.schoolId === schoolId);
      res.json({ success: true, count: mappings.length, data: mappings });
    } catch (e: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

export default router;
