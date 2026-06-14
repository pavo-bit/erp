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

export default router;
