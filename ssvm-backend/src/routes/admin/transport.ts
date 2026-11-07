import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../../middleware/auth';
import logger from '../../lib/logger';
import { Role } from '@prisma/client';

const router = Router();

// =====================================
// Validation Schemas
// =====================================

const createVehicleSchema = z.object({
  registrationNumber: z.string().min(2),
  vehicleType: z.string(),
  capacity: z.number().int().positive(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).default('ACTIVE'),
  driverId: z.string().optional(),
});

const createRouteSchema = z.object({
  name: z.string().min(2),
  vehicleId: z.string().optional(),
});

const createStopSchema = z.object({
  routeId: z.string(),
  name: z.string().min(2),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  pickupTime: z.string().optional(),
  dropoffTime: z.string().optional(),
  fare: z.number().nonnegative().default(0),
});

const allocateStudentSchema = z.object({
  studentId: z.string(),
  stopId: z.string(),
  monthCycle: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).default('ACTIVE'),
});

// In-memory telemetry cache for live vehicle GPS coordinates
const vehicleTelemetryStore = new Map<string, {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  recordedAt: Date;
}>();

// Middleware: Strictly Admin and Super Admin
router.use(authenticate);
router.use(requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN));

// =====================================
// VEHICLES
// =====================================

router.get('/vehicles', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const vehicles = await prisma.transportVehicle.findMany({
      where: { schoolId },
      include: { driver: { select: { id: true, name: true } } },
      orderBy: { registrationNumber: 'asc' }
    });
    res.json({ success: true, data: vehicles });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch transport vehicles');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/vehicles', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = createVehicleSchema.parse(req.body);

    const vehicle = await prisma.transportVehicle.create({
      data: { ...data, schoolId }
    });
    res.status(201).json({ success: true, data: vehicle });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// =====================================
// ROUTES
// =====================================

router.get('/routes', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const routes = await prisma.transportRoute.findMany({
      where: { schoolId },
      include: { stops: true, vehicle: true },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: routes });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch transport routes');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/routes', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = createRouteSchema.parse(req.body);

    const route = await prisma.transportRoute.create({
      data: { ...data, schoolId }
    });
    res.status(201).json({ success: true, data: route });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// =====================================
// STOPS
// =====================================

router.post('/stops', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = createStopSchema.parse(req.body);

    // Verify route belongs to school
    const route = await prisma.transportRoute.findFirst({
      where: { id: data.routeId, schoolId }
    });

    if (!route) return res.status(404).json({ success: false, error: "Route not found" });

    const stop = await prisma.transportStop.create({ data });
    res.status(201).json({ success: true, data: stop });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// =====================================
// ALLOCATIONS (Student -> Stop mapping)
// =====================================

router.post('/allocate', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = allocateStudentSchema.parse(req.body);

    // Verify student belongs to school
    const student = await prisma.student.findFirst({ where: { id: data.studentId, schoolId } });
    if (!student) return res.status(404).json({ success: false, error: "Student not found" });

    // Check if allocation already exists for this student and stop
    const existing = await prisma.transportAllocation.findFirst({
      where: { studentId: data.studentId, stopId: data.stopId, schoolId }
    });

    let allocation;
    if (existing) {
      allocation = await prisma.transportAllocation.update({
        where: { id: existing.id },
        data
      });
    } else {
      allocation = await prisma.transportAllocation.create({
        data: { ...data, schoolId }
      });
    }

    res.status(201).json({ success: true, data: allocation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/allocations', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { studentId, stopId } = req.query as Record<string, string | undefined>;
    const where: any = { schoolId };
    if (studentId) where.studentId = studentId;
    if (stopId) where.stopId = stopId;

    const allocations = await prisma.transportAllocation.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, rollNo: true } },
        stop: { select: { id: true, name: true, pickupTime: true, dropoffTime: true, fare: true, route: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: allocations });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch transport allocations');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// =====================================
// TELEMETRY & GPS REAL-TIME TRACKING
// =====================================

router.post('/vehicles/:id/telemetry', async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = req.params.id as string;
    const { latitude, longitude, speed, heading } = req.body;

    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ success: false, error: 'latitude and longitude are required' });
      return;
    }

    const vehicle = await prisma.transportVehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, schoolId: true, registrationNumber: true },
    });

    if (!vehicle) {
      res.status(404).json({ success: false, error: 'Vehicle not found' });
      return;
    }

    const telemetryData = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      speed: speed !== undefined ? Number(speed) : undefined,
      heading: heading !== undefined ? Number(heading) : undefined,
      recordedAt: new Date(),
    };

    vehicleTelemetryStore.set(vehicleId, telemetryData);

    res.json({
      success: true,
      message: 'Telemetry ingested successfully',
      vehicleId,
      location: telemetryData,
    });
  } catch (e) {
    logger.error({ err: e }, 'Ingest vehicle telemetry error');
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/vehicles/:id/location', async (req: AuthRequest, res: Response) => {
  const vehicleId = req.params.id as string;
  const telemetry = vehicleTelemetryStore.get(vehicleId);

  if (!telemetry) {
    res.status(404).json({ success: false, error: 'No telemetry reported for this vehicle yet' });
    return;
  }

  res.json({ success: true, data: telemetry });
});

export default router;
