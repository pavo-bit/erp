import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import prisma, { runWithTenantDatabaseTransaction } from '../../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../../middleware/auth';
import { requireModule } from '../../middleware/moduleGuard';
import { runWithSchoolContext } from '../../middleware/school-context.middleware';
import logger from '../../lib/logger';
import { getRedisClient, isRedisAvailable } from '../../lib/redis';
import { Role } from '@prisma/client';
import { CampusOperationsMetaService } from '../../services/campus-operations-meta.service';

const router = Router();

// =====================================
// Validation Schemas
// =====================================

const vehicleDocumentSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  category: z.string(),
  fileUrl: z.string(),
  uploadedAt: z.string().optional(),
});

const createVehicleSchema = z.object({
  registrationNumber: z.string().min(2),
  vehicleType: z.string().default('BUS'),
  capacity: z.number().int().positive(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).default('ACTIVE'),
  driverId: z.string().nullable().optional(),
  make: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  rcNumber: z.string().nullable().optional(),
  rcDocumentUrl: z.string().nullable().optional(),
  insurancePolicyNo: z.string().nullable().optional(),
  insuranceExpiry: z.string().nullable().optional(),
  insuranceDocumentUrl: z.string().nullable().optional(),
  fitnessExpiry: z.string().nullable().optional(),
  fitnessDocumentUrl: z.string().nullable().optional(),
  pucExpiry: z.string().nullable().optional(),
  pucDocumentUrl: z.string().nullable().optional(),
  documents: z.array(vehicleDocumentSchema).optional(),
});

const updateVehicleSchema = z.object({
  registrationNumber: z.string().min(2).optional(),
  vehicleType: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).optional(),
  driverId: z.string().nullable().optional(),
  make: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  rcNumber: z.string().nullable().optional(),
  rcDocumentUrl: z.string().nullable().optional(),
  insurancePolicyNo: z.string().nullable().optional(),
  insuranceExpiry: z.string().nullable().optional(),
  insuranceDocumentUrl: z.string().nullable().optional(),
  fitnessExpiry: z.string().nullable().optional(),
  fitnessDocumentUrl: z.string().nullable().optional(),
  pucExpiry: z.string().nullable().optional(),
  pucDocumentUrl: z.string().nullable().optional(),
  documents: z.array(vehicleDocumentSchema).optional(),
});

const createDriverSchema = z.object({
  userId: z.string().optional(),
  existingStaffId: z.string().optional(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  licenseNumber: z.string().nullable().optional(),
  licenseClass: z.string().nullable().optional(),
  licenseExpiry: z.string().nullable().optional(),
  licenseDocumentUrl: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  assignedVehicleId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

const updateDriverSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  licenseNumber: z.string().nullable().optional(),
  licenseClass: z.string().nullable().optional(),
  licenseExpiry: z.string().nullable().optional(),
  licenseDocumentUrl: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  assignedVehicleId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const createRouteSchema = z.object({
  name: z.string().min(2),
  description: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
});

const updateRouteSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
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

const updateStopSchema = z.object({
  name: z.string().min(2).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  pickupTime: z.string().optional(),
  dropoffTime: z.string().optional(),
  fare: z.number().nonnegative().optional(),
});

const allocateStudentSchema = z.object({
  studentId: z.string(),
  stopId: z.string(),
  monthCycle: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).default('ACTIVE'),
});

const updateAllocationSchema = z.object({
  stopId: z.string().optional(),
  monthCycle: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).optional(),
});

const telemetryPayloadSchema = z.object({
  latitude: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
  longitude: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
  speed: z.number().min(0, "Speed must be non-negative").max(180, "Speed cannot exceed 180 km/h").optional(),
  heading: z.number().min(0, "Heading must be between 0 and 360").max(360, "Heading must be between 0 and 360").optional(),
  timestamp: z.union([z.string(), z.number(), z.date()]).optional(),
});

// In-memory telemetry cache for live vehicle GPS coordinates
export const vehicleTelemetryStore = new Map<string, {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  recordedAt: Date;
}>();

// =====================================
// TRIP MANAGEMENT & GEOFENCING ENGINE
// =====================================

export type TripStatus =
  | 'SCHEDULED'
  | 'READY'
  | 'STARTED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'RESUMED'
  | 'COMPLETED'
  | 'CANCELLED';

export const VALID_TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  SCHEDULED: ['READY', 'STARTED', 'CANCELLED'],
  READY: ['STARTED', 'CANCELLED'],
  STARTED: ['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['RESUMED', 'CANCELLED'],
  RESUMED: ['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export interface TransportTripRecord {
  id: string;
  schoolId: string;
  routeId: string;
  vehicleId: string;
  driverId?: string;
  tripType: string;
  status: TripStatus;
  scheduledStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  geofenceEvents: Array<{
    stopId: string;
    stopName: string;
    eventType: 'GEOFENCE_ENTER' | 'GEOFENCE_EXIT';
    timestamp: string;
    dwellSeconds?: number;
    distanceMeters: number;
  }>;
  boardingLogs: Array<{
    studentId: string;
    stopId: string;
    action: 'BOARDED' | 'ALIGHTED' | 'ABSENT';
    timestamp: string;
    confirmedBy: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const activeTripsStore = new Map<string, TransportTripRecord>();

/**
 * Calculates distance in meters between two coordinates using the Haversine formula.
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

const createTripSchema = z.object({
  routeId: z.string().min(1),
  vehicleId: z.string().min(1),
  driverId: z.string().optional(),
  tripType: z.enum(['MORNING_PICKUP', 'AFTERNOON_DROPOFF', 'SPECIAL_EVENT']).default('MORNING_PICKUP'),
  scheduledStartTime: z.string().optional(),
});

const updateTripStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'READY', 'STARTED', 'IN_PROGRESS', 'PAUSED', 'RESUMED', 'COMPLETED', 'CANCELLED']),
  reason: z.string().optional(),
});

const confirmBoardingSchema = z.object({
  studentId: z.string().min(1),
  action: z.enum(['BOARDED', 'ALIGHTED', 'ABSENT']),
  notes: z.string().optional(),
});

// Helper to generate a valid hardware device token for a vehicle
export function generateVehicleHardwareToken(vehicleId: string, schoolId: string = ''): string {
  const secretKey = process.env.DEVICE_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error('DEVICE_TOKEN_SECRET or JWT_SECRET must be configured');
  }
  const secret = crypto
    .createHmac('sha256', secretKey)
    .update(`${schoolId}:${vehicleId}`)
    .digest('hex')
    .substring(0, 32);
  return schoolId ? `dev:${schoolId}:${vehicleId}:${secret}` : `dev:${vehicleId}:${secret}`;
}

/**
 * Hybrid authentication middleware for telemetry:
 * Accepts X-Device-Token from hardware units OR standard JWT from staff.
 */
async function authenticateDeviceOrAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const deviceToken = req.headers['x-device-token'] as string | undefined;

  if (deviceToken) {
    if (typeof deviceToken !== 'string' || deviceToken.length < 16) {
      res.status(401).json({ success: false, error: 'Invalid device token format' });
      return;
    }

    const vehicleId = req.params.id as string;
    const delimiter = deviceToken.includes(':') ? ':' : '_';
    const parts = deviceToken.split(delimiter);
    let tokenSchoolId: string | undefined;

    if (parts.length >= 4 && parts[0] === 'dev') {
      tokenSchoolId = parts[1];
    }

    if (!tokenSchoolId) {
      res.status(401).json({ success: false, error: 'Device token missing tenant context' });
      return;
    }

    const vehicle = await runWithTenantDatabaseTransaction(tokenSchoolId, (tx) =>
      tx.transportVehicle.findFirst({
        where: { id: vehicleId, schoolId: tokenSchoolId },
        select: { id: true, schoolId: true },
      })
    );

    if (!vehicle) {
      res.status(404).json({ success: false, error: 'Vehicle not found' });
      return;
    }

    const expectedToken = generateVehicleHardwareToken(vehicle.id, vehicle.schoolId);
    if (deviceToken !== expectedToken) {
      res.status(401).json({ success: false, error: 'Unauthorized hardware device token' });
      return;
    }

    (req as any).deviceAuth = {
      isDevice: true,
      schoolId: vehicle.schoolId,
      vehicleId: vehicle.id,
    };
    return next();
  }

  // Fallback to standard staff JWT
  authenticate(req as AuthRequest, res, () => {
    requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN)(req as AuthRequest, res, next);
  });
}

// Admin guard for vehicle management with module entitlement check
const adminGuard = [authenticate, requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), requireModule('TRANSPORT')];

// =====================================
// SCHEDULE CONFLICT HELPER
// =====================================

function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h * 60 + m;
}

async function getRouteTimeWindow(routeId: string): Promise<{ startMin: number; endMin: number } | null> {
  const stops = await prisma.transportStop.findMany({
    where: { routeId },
    select: { pickupTime: true, dropoffTime: true },
  });

  const minutes: number[] = [];
  for (const s of stops) {
    const p = parseTimeToMinutes(s.pickupTime);
    if (p !== null) minutes.push(p);
    const d = parseTimeToMinutes(s.dropoffTime);
    if (d !== null) minutes.push(d);
  }

  if (minutes.length === 0) return null;
  return {
    startMin: Math.min(...minutes),
    endMin: Math.max(...minutes),
  };
}

async function validateVehicleScheduleConflict(
  schoolId: string,
  vehicleId: string,
  targetRouteId?: string
): Promise<void> {
  if (!targetRouteId) return;
  const targetWindow = await getRouteTimeWindow(targetRouteId);
  if (!targetWindow) return;

  const otherRoutes = await prisma.transportRoute.findMany({
    where: {
      schoolId,
      vehicleId,
      id: { not: targetRouteId },
    },
    select: { id: true, name: true },
  });

  for (const other of otherRoutes) {
    const otherWindow = await getRouteTimeWindow(other.id);
    if (!otherWindow) continue;

    const isOverlapping = !(targetWindow.endMin <= otherWindow.startMin || targetWindow.startMin >= otherWindow.endMin);
    if (isOverlapping) {
      const formatTime = (min: number) => {
        const h = String(Math.floor(min / 60)).padStart(2, '0');
        const m = String(min % 60).padStart(2, '0');
        return `${h}:${m}`;
      };
      throw new Error(
        `Schedule conflict: Vehicle is already scheduled on route '${other.name}' (${formatTime(otherWindow.startMin)} - ${formatTime(otherWindow.endMin)}), which overlaps with target route timing (${formatTime(targetWindow.startMin)} - ${formatTime(targetWindow.endMin)}).`
      );
    }
  }
}

// =====================================
// OPERATIONAL OVERVIEW
// =====================================

router.get('/overview', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;

    const [totalVehicles, activeVehicles, maintenanceVehicles, inactiveVehicles, totalRoutes, routesWithVehicle, allDrivers] = await Promise.all([
      prisma.transportVehicle.count({ where: { schoolId } }),
      prisma.transportVehicle.count({ where: { schoolId, status: 'ACTIVE' } }),
      prisma.transportVehicle.count({ where: { schoolId, status: 'MAINTENANCE' } }),
      prisma.transportVehicle.count({ where: { schoolId, status: 'INACTIVE' } }),
      prisma.transportRoute.count({ where: { schoolId } }),
      prisma.transportRoute.count({ where: { schoolId, vehicleId: { not: null } } }),
      prisma.user.count({
        where: {
          schoolId,
          OR: [
            { department: { equals: 'Transport', mode: 'insensitive' } },
            { transportVehicles: { some: { schoolId } } },
          ],
        },
      }),
    ]);

    const assignedVehiclesCount = await prisma.transportVehicle.count({
      where: {
        schoolId,
        routes: { some: {} },
      },
    });

    const unassignedVehiclesCount = Math.max(0, totalVehicles - assignedVehiclesCount);
    const routesWithoutVehicleCount = Math.max(0, totalRoutes - routesWithVehicle);

    res.json({
      success: true,
      data: {
        totalVehicles,
        activeVehicles,
        maintenanceVehicles,
        inactiveVehicles: inactiveVehicles + maintenanceVehicles,
        totalDrivers: Math.max(allDrivers, 0),
        totalRoutes,
        assignedVehiclesCount,
        unassignedVehiclesCount,
        routesWithoutVehicleCount,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch transport overview statistics');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// =====================================
// VEHICLES
// =====================================

router.get('/vehicles', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const rawVehicles = await prisma.transportVehicle.findMany({
      where: { schoolId },
      include: {
        driver: { select: { id: true, name: true, phone: true, email: true, employeeId: true, department: true } },
        routes: { select: { id: true, name: true, stops: { select: { id: true, name: true, pickupTime: true, dropoffTime: true } } } },
      },
      orderBy: { registrationNumber: 'asc' },
    });

    const vehicles = await Promise.all(
      rawVehicles.map(async (v) => {
        const meta = await CampusOperationsMetaService.getVehicleMeta(schoolId, v.id);
        const fleetNumber = meta.fleetNumber || (await CampusOperationsMetaService.getOrGenerateFleetNumber(schoolId, v.id));

        return {
          ...v,
          fleetNumber,
          make: meta.make ?? null,
          model: meta.model ?? null,
          photoUrl: meta.photoUrl ?? null,
          rcNumber: meta.rcNumber ?? null,
          rcDocumentUrl: meta.rcDocumentUrl ?? null,
          insurancePolicyNo: meta.insurancePolicyNo ?? null,
          insuranceExpiry: meta.insuranceExpiry ?? null,
          insuranceDocumentUrl: meta.insuranceDocumentUrl ?? null,
          fitnessExpiry: meta.fitnessExpiry ?? null,
          fitnessDocumentUrl: meta.fitnessDocumentUrl ?? null,
          pucExpiry: meta.pucExpiry ?? null,
          pucDocumentUrl: meta.pucDocumentUrl ?? null,
          documents: meta.documents ?? [],
        };
      })
    );

    res.json({ success: true, data: vehicles });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch transport vehicles');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/vehicles/:id', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const vehicleId = req.params.id as string;

    const v = await prisma.transportVehicle.findFirst({
      where: { id: vehicleId, schoolId },
      include: {
        driver: { select: { id: true, name: true, phone: true, email: true, employeeId: true, department: true } },
        routes: { select: { id: true, name: true, stops: { select: { id: true, name: true, pickupTime: true, dropoffTime: true } } } },
      },
    });

    if (!v) {
      res.status(404).json({ success: false, error: 'Vehicle not found' });
      return;
    }

    const meta = await CampusOperationsMetaService.getVehicleMeta(schoolId, v.id);
    const fleetNumber = meta.fleetNumber || (await CampusOperationsMetaService.getOrGenerateFleetNumber(schoolId, v.id));

    res.json({
      success: true,
      data: {
        ...v,
        fleetNumber,
        make: meta.make ?? null,
        model: meta.model ?? null,
        photoUrl: meta.photoUrl ?? null,
        rcNumber: meta.rcNumber ?? null,
        rcDocumentUrl: meta.rcDocumentUrl ?? null,
        insurancePolicyNo: meta.insurancePolicyNo ?? null,
        insuranceExpiry: meta.insuranceExpiry ?? null,
        insuranceDocumentUrl: meta.insuranceDocumentUrl ?? null,
        fitnessExpiry: meta.fitnessExpiry ?? null,
        fitnessDocumentUrl: meta.fitnessDocumentUrl ?? null,
        pucExpiry: meta.pucExpiry ?? null,
        pucDocumentUrl: meta.pucDocumentUrl ?? null,
        documents: meta.documents ?? [],
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/vehicles', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = createVehicleSchema.parse(req.body);

    const duplicate = await prisma.transportVehicle.findFirst({
      where: { registrationNumber: data.registrationNumber },
    });
    if (duplicate) {
      res.status(400).json({ success: false, error: 'A vehicle with this registration number already exists' });
      return;
    }

    if (data.driverId) {
      const driver = await prisma.user.findFirst({
        where: { id: data.driverId, schoolId, isActive: true },
      });
      if (!driver) {
        res.status(400).json({ success: false, error: 'Selected driver not found or is inactive in this school' });
        return;
      }
    }

    const {
      make,
      model,
      photoUrl,
      rcNumber,
      rcDocumentUrl,
      insurancePolicyNo,
      insuranceExpiry,
      insuranceDocumentUrl,
      fitnessExpiry,
      fitnessDocumentUrl,
      pucExpiry,
      pucDocumentUrl,
      documents,
      ...prismaFields
    } = data;

    const vehicle = await prisma.transportVehicle.create({
      data: {
        ...prismaFields,
        schoolId,
        driverId: data.driverId || null,
      },
      include: { driver: { select: { id: true, name: true, phone: true } } },
    });

    const fleetNumber = await CampusOperationsMetaService.getOrGenerateFleetNumber(schoolId, vehicle.id);

    await CampusOperationsMetaService.setVehicleMeta(schoolId, vehicle.id, {
      fleetNumber,
      make: make ?? null,
      model: model ?? null,
      photoUrl: photoUrl ?? null,
      rcNumber: rcNumber ?? null,
      rcDocumentUrl: rcDocumentUrl ?? null,
      insurancePolicyNo: insurancePolicyNo ?? null,
      insuranceExpiry: insuranceExpiry ?? null,
      insuranceDocumentUrl: insuranceDocumentUrl ?? null,
      fitnessExpiry: fitnessExpiry ?? null,
      fitnessDocumentUrl: fitnessDocumentUrl ?? null,
      pucExpiry: pucExpiry ?? null,
      pucDocumentUrl: pucDocumentUrl ?? null,
      documents: documents ?? [],
    });

    res.status(201).json({
      success: true,
      data: {
        ...vehicle,
        fleetNumber,
        make: make ?? null,
        model: model ?? null,
        photoUrl: photoUrl ?? null,
        rcNumber: rcNumber ?? null,
        rcDocumentUrl: rcDocumentUrl ?? null,
        insurancePolicyNo: insurancePolicyNo ?? null,
        insuranceExpiry: insuranceExpiry ?? null,
        insuranceDocumentUrl: insuranceDocumentUrl ?? null,
        fitnessExpiry: fitnessExpiry ?? null,
        fitnessDocumentUrl: fitnessDocumentUrl ?? null,
        pucExpiry: pucExpiry ?? null,
        pucDocumentUrl: pucDocumentUrl ?? null,
        documents: documents ?? [],
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/vehicles/:id', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const vehicleId = req.params.id as string;
    const data = updateVehicleSchema.parse(req.body);

    const existing = await prisma.transportVehicle.findFirst({
      where: { id: vehicleId, schoolId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Vehicle not found' });
      return;
    }

    if (data.registrationNumber && data.registrationNumber !== existing.registrationNumber) {
      const duplicate = await prisma.transportVehicle.findFirst({
        where: { registrationNumber: data.registrationNumber, id: { not: vehicleId } },
      });
      if (duplicate) {
        res.status(400).json({ success: false, error: 'A vehicle with this registration number already exists' });
        return;
      }
    }

    if (data.driverId) {
      const driver = await prisma.user.findFirst({
        where: { id: data.driverId, schoolId, isActive: true },
      });
      if (!driver) {
        res.status(400).json({ success: false, error: 'Selected driver not found or is inactive in this school' });
        return;
      }
    }

    const {
      make,
      model,
      photoUrl,
      rcNumber,
      rcDocumentUrl,
      insurancePolicyNo,
      insuranceExpiry,
      insuranceDocumentUrl,
      fitnessExpiry,
      fitnessDocumentUrl,
      pucExpiry,
      pucDocumentUrl,
      documents,
      ...prismaFields
    } = data;

    const updated = await prisma.transportVehicle.update({
      where: { id: vehicleId },
      data: {
        ...(prismaFields.registrationNumber !== undefined && { registrationNumber: prismaFields.registrationNumber }),
        ...(prismaFields.vehicleType !== undefined && { vehicleType: prismaFields.vehicleType }),
        ...(prismaFields.capacity !== undefined && { capacity: prismaFields.capacity }),
        ...(prismaFields.status !== undefined && { status: prismaFields.status }),
        ...(prismaFields.driverId !== undefined && { driverId: prismaFields.driverId }),
      },
      include: { driver: { select: { id: true, name: true, phone: true } } },
    });

    const meta = await CampusOperationsMetaService.setVehicleMeta(schoolId, vehicleId, {
      ...(make !== undefined && { make: make ?? null }),
      ...(model !== undefined && { model: model ?? null }),
      ...(photoUrl !== undefined && { photoUrl: photoUrl ?? null }),
      ...(rcNumber !== undefined && { rcNumber: rcNumber ?? null }),
      ...(rcDocumentUrl !== undefined && { rcDocumentUrl: rcDocumentUrl ?? null }),
      ...(insurancePolicyNo !== undefined && { insurancePolicyNo: insurancePolicyNo ?? null }),
      ...(insuranceExpiry !== undefined && { insuranceExpiry: insuranceExpiry ?? null }),
      ...(insuranceDocumentUrl !== undefined && { insuranceDocumentUrl: insuranceDocumentUrl ?? null }),
      ...(fitnessExpiry !== undefined && { fitnessExpiry: fitnessExpiry ?? null }),
      ...(fitnessDocumentUrl !== undefined && { fitnessDocumentUrl: fitnessDocumentUrl ?? null }),
      ...(pucExpiry !== undefined && { pucExpiry: pucExpiry ?? null }),
      ...(pucDocumentUrl !== undefined && { pucDocumentUrl: pucDocumentUrl ?? null }),
      ...(documents !== undefined && { documents }),
    });

    const fleetNumber = meta.fleetNumber || (await CampusOperationsMetaService.getOrGenerateFleetNumber(schoolId, vehicleId));

    res.json({
      success: true,
      data: {
        ...updated,
        fleetNumber,
        make: meta.make ?? null,
        model: meta.model ?? null,
        photoUrl: meta.photoUrl ?? null,
        rcNumber: meta.rcNumber ?? null,
        rcDocumentUrl: meta.rcDocumentUrl ?? null,
        insurancePolicyNo: meta.insurancePolicyNo ?? null,
        insuranceExpiry: meta.insuranceExpiry ?? null,
        insuranceDocumentUrl: meta.insuranceDocumentUrl ?? null,
        fitnessExpiry: meta.fitnessExpiry ?? null,
        fitnessDocumentUrl: meta.fitnessDocumentUrl ?? null,
        pucExpiry: meta.pucExpiry ?? null,
        pucDocumentUrl: meta.pucDocumentUrl ?? null,
        documents: meta.documents ?? [],
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/vehicles/:id', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const vehicleId = req.params.id as string;

    const existing = await prisma.transportVehicle.findFirst({
      where: { id: vehicleId, schoolId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Vehicle not found' });
      return;
    }

    const assignedRoutes = await prisma.transportRoute.count({
      where: { vehicleId, schoolId },
    });

    // Check if allocations or routes are referencing this vehicle
    if (assignedRoutes > 0) {
      // Safe deactivation / archiving strategy
      await prisma.transportVehicle.update({
        where: { id: vehicleId },
        data: { status: 'INACTIVE' },
      });

      res.json({
        success: true,
        data: { archived: true, vehicleId },
        archived: true,
        message: `Vehicle archived and marked INACTIVE to preserve historical data (${assignedRoutes} assigned routes).`,
      });
      return;
    }

    await prisma.transportVehicle.delete({
      where: { id: vehicleId },
    });

    res.json({
      success: true,
      data: { deleted: true, vehicleId },
      deleted: true,
      message: 'Vehicle deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// =====================================
// DRIVERS / STAFF IDENTITY REUSE
// =====================================

router.get('/drivers', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const users = await prisma.user.findMany({
      where: {
        schoolId,
        OR: [
          { department: { equals: 'Transport', mode: 'insensitive' } },
          { transportVehicles: { some: { schoolId } } },
          { role: { in: [Role.RECEPTIONIST, Role.ACCOUNTANT, Role.ASSET_MANAGER, Role.ERP_ADMIN] } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        employeeId: true,
        department: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    const drivers = await Promise.all(
      users.map(async (u) => {
        const meta = await CampusOperationsMetaService.getDriverMeta(schoolId, u.id);
        const assignedVehicle = await prisma.transportVehicle.findFirst({
          where: { driverId: u.id, schoolId },
          select: { id: true, registrationNumber: true, vehicleType: true, status: true },
        });

        let vehicleFleetNumber: string | null = null;
        if (assignedVehicle) {
          const vMeta = await CampusOperationsMetaService.getVehicleMeta(schoolId, assignedVehicle.id);
          vehicleFleetNumber = vMeta.fleetNumber || null;
        }

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone ?? null,
          avatar: u.avatar ?? null,
          employeeId: u.employeeId ?? null,
          department: u.department ?? 'Transport',
          isActive: u.isActive,
          address: meta.address ?? null,
          emergencyContactName: meta.emergencyContactName ?? null,
          emergencyContactPhone: meta.emergencyContactPhone ?? null,
          licenseNumber: meta.licenseNumber ?? null,
          licenseClass: meta.licenseClass ?? null,
          licenseExpiry: meta.licenseExpiry ?? null,
          licenseDocumentUrl: meta.licenseDocumentUrl ?? null,
          photoUrl: meta.photoUrl ?? u.avatar ?? null,
          assignedVehicle: assignedVehicle
            ? {
                id: assignedVehicle.id,
                registrationNumber: assignedVehicle.registrationNumber,
                fleetNumber: vehicleFleetNumber,
                vehicleType: assignedVehicle.vehicleType,
                status: assignedVehicle.status,
              }
            : null,
          documents: meta.documents ?? [],
        };
      })
    );

    res.json({ success: true, data: drivers });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch drivers');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/drivers/:id', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const driverId = req.params.id as string;

    const u = await prisma.user.findFirst({
      where: { id: driverId, schoolId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        employeeId: true,
        department: true,
        isActive: true,
      },
    });

    if (!u) {
      res.status(404).json({ success: false, error: 'Driver profile not found' });
      return;
    }

    const meta = await CampusOperationsMetaService.getDriverMeta(schoolId, u.id);
    const assignedVehicle = await prisma.transportVehicle.findFirst({
      where: { driverId: u.id, schoolId },
      select: { id: true, registrationNumber: true, vehicleType: true, status: true },
    });

    res.json({
      success: true,
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? null,
        avatar: u.avatar ?? null,
        employeeId: u.employeeId ?? null,
        department: u.department ?? 'Transport',
        isActive: u.isActive,
        address: meta.address ?? null,
        emergencyContactName: meta.emergencyContactName ?? null,
        emergencyContactPhone: meta.emergencyContactPhone ?? null,
        licenseNumber: meta.licenseNumber ?? null,
        licenseClass: meta.licenseClass ?? null,
        licenseExpiry: meta.licenseExpiry ?? null,
        licenseDocumentUrl: meta.licenseDocumentUrl ?? null,
        photoUrl: meta.photoUrl ?? u.avatar ?? null,
        assignedVehicle: assignedVehicle || null,
        documents: meta.documents ?? [],
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/drivers', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = createDriverSchema.parse(req.body);

    let user: any;

    const targetUserId = data.userId || data.existingStaffId;

    if (targetUserId) {
      // Reuse canonical staff / employee identity
      user = await prisma.user.findFirst({
        where: { id: targetUserId, schoolId },
      });
      if (!user) {
        res.status(404).json({ success: false, error: 'Specified staff member not found in this school' });
        return;
      }
      user = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.phone && { phone: data.phone }),
          department: user.department || 'Transport',
          isActive: data.isActive,
        },
      });
    } else {
      if (!data.name) {
        res.status(400).json({ success: false, error: 'Driver name is required for new driver profile' });
        return;
      }
      // Create dedicated driver profile within existing User model
      const email = data.email || `driver.${Date.now()}@school.internal`;
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: crypto.randomBytes(16).toString('hex'),
          name: data.name,
          phone: data.phone ?? null,
          role: Role.RECEPTIONIST,
          department: 'Transport',
          schoolId,
          isActive: data.isActive,
        },
      });
    }

    await CampusOperationsMetaService.setDriverMeta(schoolId, user.id, {
      address: data.address ?? null,
      emergencyContactName: data.emergencyContactName ?? null,
      emergencyContactPhone: data.emergencyContactPhone ?? null,
      licenseNumber: data.licenseNumber ?? null,
      licenseClass: data.licenseClass ?? null,
      licenseExpiry: data.licenseExpiry ?? null,
      licenseDocumentUrl: data.licenseDocumentUrl ?? null,
      photoUrl: data.photoUrl ?? null,
    });

    if (data.assignedVehicleId) {
      await prisma.transportVehicle.update({
        where: { id: data.assignedVehicleId },
        data: { driverId: user.id },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        ...data,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        department: user.department,
        isActive: user.isActive,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/drivers/:id', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const driverId = req.params.id as string;
    const data = updateDriverSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { id: driverId, schoolId },
    });
    if (!user) {
      res.status(404).json({ success: false, error: 'Driver not found' });
      return;
    }

    await prisma.user.update({
      where: { id: driverId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email || user.email }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    const meta = await CampusOperationsMetaService.setDriverMeta(schoolId, driverId, {
      ...(data.address !== undefined && { address: data.address }),
      ...(data.emergencyContactName !== undefined && { emergencyContactName: data.emergencyContactName }),
      ...(data.emergencyContactPhone !== undefined && { emergencyContactPhone: data.emergencyContactPhone }),
      ...(data.licenseNumber !== undefined && { licenseNumber: data.licenseNumber }),
      ...(data.licenseClass !== undefined && { licenseClass: data.licenseClass }),
      ...(data.licenseExpiry !== undefined && { licenseExpiry: data.licenseExpiry }),
      ...(data.licenseDocumentUrl !== undefined && { licenseDocumentUrl: data.licenseDocumentUrl }),
      ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
    });

    if (data.assignedVehicleId !== undefined) {
      // Clear previous assignment
      await prisma.transportVehicle.updateMany({
        where: { driverId, schoolId },
        data: { driverId: null },
      });
      // Set new assignment
      if (data.assignedVehicleId) {
        await prisma.transportVehicle.update({
          where: { id: data.assignedVehicleId },
          data: { driverId },
        });
      }
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: data.name ?? user.name,
        phone: data.phone ?? user.phone,
        email: data.email ?? user.email,
        isActive: data.isActive ?? user.isActive,
        ...meta,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/drivers/:id/status', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const driverId = req.params.id as string;
    const { isActive } = req.body;

    const user = await prisma.user.findFirst({
      where: { id: driverId, schoolId },
    });
    if (!user) {
      res.status(404).json({ success: false, error: 'Driver not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: driverId },
      data: { isActive: Boolean(isActive) },
    });

    res.json({ success: true, data: { id: updated.id, isActive: updated.isActive } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// =====================================
// ROUTES & STOPS
// =====================================

router.get('/routes', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const rawRoutes = await prisma.transportRoute.findMany({
      where: { schoolId },
      include: {
        stops: { orderBy: { pickupTime: 'asc' } },
        vehicle: {
          select: {
            id: true,
            registrationNumber: true,
            vehicleType: true,
            status: true,
            driver: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const routes = await Promise.all(
      rawRoutes.map(async (r) => {
        const meta = await CampusOperationsMetaService.getRouteMeta(schoolId, r.id);
        let vehicleFleetNumber: string | null = null;
        if (r.vehicle) {
          const vMeta = await CampusOperationsMetaService.getVehicleMeta(schoolId, r.vehicle.id);
          vehicleFleetNumber = vMeta.fleetNumber || null;
        }

        return {
          ...r,
          description: meta.description ?? null,
          vehicle: r.vehicle
            ? {
                ...r.vehicle,
                fleetNumber: vehicleFleetNumber,
              }
            : null,
        };
      })
    );

    res.json({ success: true, data: routes });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch transport routes');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/routes', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = createRouteSchema.parse(req.body);

    if (data.vehicleId) {
      const vehicle = await prisma.transportVehicle.findFirst({
        where: { id: data.vehicleId, schoolId },
      });
      if (!vehicle) {
        res.status(400).json({ success: false, error: 'Vehicle not found in this school' });
        return;
      }
    }

    const { description, ...prismaData } = data;

    const route = await prisma.transportRoute.create({
      data: {
        ...prismaData,
        schoolId,
        vehicleId: data.vehicleId || null,
      },
      include: { stops: true, vehicle: true },
    });

    if (description) {
      await CampusOperationsMetaService.setRouteMeta(schoolId, route.id, { description });
    }

    res.status(201).json({
      success: true,
      data: {
        ...route,
        description: description ?? null,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/routes/:id', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const routeId = req.params.id as string;
    const data = updateRouteSchema.parse(req.body);

    const existing = await prisma.transportRoute.findFirst({
      where: { id: routeId, schoolId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Route not found' });
      return;
    }

    if (data.vehicleId && data.vehicleId !== existing.vehicleId) {
      const vehicle = await prisma.transportVehicle.findFirst({
        where: { id: data.vehicleId, schoolId },
      });
      if (!vehicle) {
        res.status(400).json({ success: false, error: 'Vehicle not found in this school' });
        return;
      }
      // Schedule conflict validation!
      await validateVehicleScheduleConflict(schoolId, data.vehicleId, routeId);
    }

    const { description, ...prismaData } = data;

    const updated = await prisma.transportRoute.update({
      where: { id: routeId },
      data: {
        ...(prismaData.name !== undefined && { name: prismaData.name }),
        ...(prismaData.vehicleId !== undefined && { vehicleId: prismaData.vehicleId }),
      },
      include: { stops: true, vehicle: true },
    });

    let meta: any = {};
    if (description !== undefined) {
      meta = await CampusOperationsMetaService.setRouteMeta(schoolId, routeId, { description });
    } else {
      meta = await CampusOperationsMetaService.getRouteMeta(schoolId, routeId);
    }

    res.json({
      success: true,
      data: {
        ...updated,
        description: meta.description ?? null,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/routes/:id', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const routeId = req.params.id as string;

    const existing = await prisma.transportRoute.findFirst({
      where: { id: routeId, schoolId },
      include: { stops: { select: { id: true } } },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Route not found' });
      return;
    }

    const stopIds = existing.stops.map((s) => s.id);
    if (stopIds.length > 0) {
      const activeAllocations = await prisma.transportAllocation.count({
        where: { stopId: { in: stopIds }, schoolId, status: 'ACTIVE' },
      });
      if (activeAllocations > 0) {
        res.status(400).json({
          success: false,
          error: `Cannot delete route with ${activeAllocations} active student allocation(s). Please reassign or cancel allocations first.`,
        });
        return;
      }
    }

    await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      await tx.transportStop.deleteMany({ where: { routeId } });
      await tx.transportRoute.delete({ where: { id: routeId } });
    });

    res.json({ success: true, message: 'Route and stops deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// =====================================
// STOPS
// =====================================

router.get('/stops', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { routeId } = req.query as { routeId?: string };

    const where: any = {
      route: { schoolId },
    };
    if (routeId) {
      where.routeId = routeId;
    }

    const stops = await prisma.transportStop.findMany({
      where,
      include: {
        route: { select: { id: true, name: true, vehicleId: true } },
        allocations: {
          select: { id: true, studentId: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: stops });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch transport stops');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/stops', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = createStopSchema.parse(req.body);

    // Verify route belongs to school
    const route = await prisma.transportRoute.findFirst({
      where: { id: data.routeId, schoolId }
    });

    if (!route) return res.status(404).json({ success: false, error: "Route not found" });

    const stop = await prisma.transportStop.create({
      data,
      include: { route: { select: { id: true, name: true } } },
    });
    res.status(201).json({ success: true, data: stop });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/stops/:id', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const stopId = req.params.id as string;
    const data = updateStopSchema.parse(req.body);

    const existing = await prisma.transportStop.findFirst({
      where: { id: stopId, route: { schoolId } },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Stop not found' });
      return;
    }

    const updated = await prisma.transportStop.update({
      where: { id: stopId },
      data,
      include: { route: { select: { id: true, name: true } } },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/stops/:id', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const stopId = req.params.id as string;

    const existing = await prisma.transportStop.findFirst({
      where: { id: stopId, route: { schoolId } },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Stop not found' });
      return;
    }

    const activeAllocations = await prisma.transportAllocation.count({
      where: { stopId, schoolId, status: 'ACTIVE' },
    });
    if (activeAllocations > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete stop. There are ${activeAllocations} active student allocation(s) for this stop.`,
      });
      return;
    }

    await prisma.transportStop.delete({
      where: { id: stopId },
    });

    res.json({ success: true, message: 'Stop deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// =====================================
// ALLOCATIONS (Student -> Stop mapping)
// =====================================

router.post('/allocate', adminGuard, async (req: AuthRequest, res: Response) => {
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

    const allocation = existing
      ? await prisma.transportAllocation.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.transportAllocation.create({
          data: { ...data, schoolId },
        });

    res.status(201).json({ success: true, data: allocation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/allocations', authenticate, requireModule('TRANSPORT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const schoolId = user.schoolId;
    const { studentId, stopId } = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;

    if (user.role === Role.PARENT) {
      const guardian = await prisma.guardian.findFirst({
        where: {
          OR: [
            { userId: (user as any).userId || (user as any).id },
            { primaryEmail: (user as any).email || '' },
          ],
        },
        include: { students: { select: { id: true } } },
      });

      const allowedStudentIds = guardian?.students.map((s) => s.id) || [];
      if (studentId) {
        if (!allowedStudentIds.includes(studentId) && allowedStudentIds.length > 0) {
          res.status(403).json({ success: false, error: 'Unauthorized to view this student allocation' });
          return;
        }
        where.studentId = studentId;
      } else {
        where.studentId = { in: allowedStudentIds };
      }
    } else if (user.role === Role.STUDENT) {
      const student = await prisma.student.findFirst({
        where: { userId: (user as any).userId || (user as any).id },
        select: { id: true },
      });
      if (student) {
        where.studentId = student.id;
      }
    } else if (user.role !== Role.SUPER_ADMIN && user.role !== Role.ERP_ADMIN) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    } else {
      if (studentId) where.studentId = studentId;
    }

    if (stopId) where.stopId = stopId;

    const allocations = await prisma.transportAllocation.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, rollNo: true } },
        stop: {
          select: {
            id: true,
            name: true,
            pickupTime: true,
            dropoffTime: true,
            fare: true,
            route: {
              select: {
                id: true,
                name: true,
                vehicleId: true,
                vehicle: {
                  select: {
                    id: true,
                    registrationNumber: true,
                    vehicleType: true,
                    status: true,
                    driver: {
                      select: {
                        id: true,
                        name: true,
                        phone: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedAllocations = await Promise.all(
      allocations.map(async (alloc) => {
        const v = alloc.stop?.route?.vehicle;
        if (!v || !schoolId) return alloc;
        const meta = await CampusOperationsMetaService.getVehicleMeta(schoolId, v.id);
        return {
          ...alloc,
          stop: {
            ...alloc.stop,
            route: {
              ...alloc.stop.route,
              vehicle: {
                ...v,
                fleetNumber: meta?.fleetNumber ?? null,
              },
            },
          },
        };
      })
    );

    res.json({ success: true, data: enrichedAllocations });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch transport allocations');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/allocations/:id', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const allocationId = req.params.id as string;
    const data = updateAllocationSchema.parse(req.body);

    const existing = await prisma.transportAllocation.findFirst({
      where: { id: allocationId, schoolId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Allocation not found' });
      return;
    }

    if (data.stopId && data.stopId !== existing.stopId) {
      const stop = await prisma.transportStop.findFirst({
        where: { id: data.stopId, route: { schoolId } },
      });
      if (!stop) {
        res.status(400).json({ success: false, error: 'Stop not found in this school' });
        return;
      }
    }

    const updated = await prisma.transportAllocation.update({
      where: { id: allocationId },
      data,
      include: {
        student: { select: { id: true, name: true, rollNo: true } },
        stop: { select: { id: true, name: true, pickupTime: true, dropoffTime: true, fare: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/allocations/:id', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const allocationId = req.params.id as string;

    const existing = await prisma.transportAllocation.findFirst({
      where: { id: allocationId, schoolId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Allocation not found' });
      return;
    }

    await prisma.transportAllocation.delete({
      where: { id: allocationId },
    });

    res.json({ success: true, message: 'Allocation removed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// =====================================
// TELEMETRY & GPS REAL-TIME TRACKING
// =====================================

router.post('/vehicles/:id/telemetry', authenticateDeviceOrAdmin, requireModule('TRANSPORT'), async (req: Request, res: Response) => {
  try {
    const vehicleId = req.params.id as string;
    const parseResult = telemetryPayloadSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid telemetry payload',
        details: parseResult.error.issues,
      });
      return;
    }

    const { latitude, longitude, speed, heading, timestamp } = parseResult.data;

    // Validate timestamp freshness (must not drift by > 5 minutes)
    const recordedAt = timestamp ? new Date(timestamp) : new Date();
    const timeDiffMs = Math.abs(Date.now() - recordedAt.getTime());
    if (isNaN(recordedAt.getTime()) || timeDiffMs > 5 * 60 * 1000) {
      res.status(400).json({
        success: false,
        error: 'Telemetry timestamp expired or excessive clock drift (> 5 minutes)',
      });
      return;
    }

    const user = (req as AuthRequest).user;
    const deviceAuth = (req as any).deviceAuth;
    const vehicleSchoolId = deviceAuth?.schoolId || user?.schoolId;

    let vehicle: { id: string; schoolId: string } | null = null;
    if (deviceAuth) {
      vehicle = { id: deviceAuth.vehicleId, schoolId: deviceAuth.schoolId };
    } else if (vehicleSchoolId) {
      const targetSchoolId = vehicleSchoolId;
      vehicle = await runWithTenantDatabaseTransaction(targetSchoolId, (tx) =>
        tx.transportVehicle.findFirst({
          where: { id: vehicleId, schoolId: targetSchoolId },
          select: { id: true, schoolId: true },
        })
      );
    } else {
      vehicle = await prisma.transportVehicle.findFirst({
        where: { id: vehicleId },
        select: { id: true, schoolId: true },
      });
    }

    if (!vehicle) {
      if (user && user.role === Role.ERP_ADMIN) {
        res.status(403).json({ success: false, error: 'Unauthorized: Vehicle belongs to another school' });
        return;
      }
      res.status(404).json({ success: false, error: 'Vehicle not found' });
      return;
    }

    const telemetryData = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      speed: speed !== undefined ? Number(speed) : undefined,
      heading: heading !== undefined ? Number(heading) : undefined,
      recordedAt,
    };

    // 1. In-memory fallback
    vehicleTelemetryStore.set(vehicleId, telemetryData);

    // 2. Redis 15-minute TTL cache
    if (isRedisAvailable()) {
      try {
        const redis = getRedisClient();
        if (redis) {
          await redis.setex(`transport:vehicle:${vehicleId}:telemetry`, 900, JSON.stringify(telemetryData));
        }
      } catch (err: any) {
        logger.warn({ err: err.message, vehicleId }, 'Failed to cache vehicle telemetry in Redis');
      }
    }

    // 3. Geofence evaluation for active trips
    await runWithSchoolContext(vehicle.schoolId, async () => {
      for (const trip of activeTripsStore.values()) {
        if (trip.vehicleId === vehicleId && (trip.status === 'STARTED' || trip.status === 'IN_PROGRESS')) {
          const routeStops = await prisma.transportStop.findMany({
            where: { routeId: trip.routeId },
            select: { id: true, name: true, latitude: true, longitude: true },
          });

          for (const stop of routeStops) {
            if (stop.latitude !== null && stop.longitude !== null) {
              const distance = calculateDistanceMeters(Number(latitude), Number(longitude), stop.latitude, stop.longitude);
              const lastEvent = trip.geofenceEvents
                .filter((e) => e.stopId === stop.id)
                .slice(-1)[0];

              if (distance <= 50) {
                if (!lastEvent || lastEvent.eventType === 'GEOFENCE_EXIT') {
                  trip.geofenceEvents.push({
                    stopId: stop.id,
                    stopName: stop.name,
                    eventType: 'GEOFENCE_ENTER',
                    timestamp: recordedAt.toISOString(),
                    distanceMeters: distance,
                  });
                }
              } else if (distance > 50) {
                if (lastEvent && lastEvent.eventType === 'GEOFENCE_ENTER') {
                  const dwellSeconds = Math.round((recordedAt.getTime() - new Date(lastEvent.timestamp).getTime()) / 1000);
                  trip.geofenceEvents.push({
                    stopId: stop.id,
                    stopName: stop.name,
                    eventType: 'GEOFENCE_EXIT',
                    timestamp: recordedAt.toISOString(),
                    dwellSeconds: Math.max(0, dwellSeconds),
                    distanceMeters: distance,
                  });
                }
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Telemetry ingested successfully',
      vehicleId,
      location: telemetryData,
    });
  } catch (e: any) {
    logger.error({ err: e }, 'Ingest vehicle telemetry error');
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/vehicles/:id/location', authenticate, requireModule('TRANSPORT'), async (req: AuthRequest, res: Response) => {
  const vehicleId = req.params.id as string;
  const user = req.user;

  const userSchoolId = user?.schoolId;
  const vehicle = userSchoolId
    ? await runWithTenantDatabaseTransaction(userSchoolId, (tx) =>
        tx.transportVehicle.findFirst({
          where: { id: vehicleId, schoolId: userSchoolId },
          select: { id: true, schoolId: true },
        })
      )
    : await prisma.transportVehicle.findFirst({
        where: { id: vehicleId },
        select: { id: true, schoolId: true },
      });

  if (!vehicle) {
    if (user && user.role === Role.ERP_ADMIN) {
      res.status(403).json({ success: false, error: 'Unauthorized: Vehicle belongs to another school' });
      return;
    }
    res.status(404).json({ success: false, error: 'Vehicle not found' });
    return;
  }

  // Try Redis first
  if (isRedisAvailable()) {
    try {
      const redis = getRedisClient();
      if (redis) {
        const cached = await redis.get(`transport:vehicle:${vehicleId}:telemetry`);
        if (cached) {
          const parsed = JSON.parse(cached);
          res.json({ success: true, data: parsed });
          return;
        }
      }
    } catch {
      // Redis retrieval failed, fallback to memory store
    }
  }

  const telemetry = vehicleTelemetryStore.get(vehicleId);
  if (!telemetry) {
    res.status(404).json({ success: false, error: 'No telemetry reported for this vehicle yet' });
    return;
  }

  res.json({ success: true, data: telemetry });
});

// =====================================
// TRIP LIFECYCLE & FLEET MONITORING
// =====================================

// POST /api/v1/transport/trips — Schedule or Start a Trip
router.post('/trips', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const parsed = createTripSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid trip payload', details: parsed.error.issues });
      return;
    }

    const { routeId, vehicleId, driverId, tripType, scheduledStartTime } = parsed.data;

    // Validate route and vehicle belong to this school
    const [route, vehicle] = await Promise.all([
      prisma.transportRoute.findFirst({ where: { id: routeId, schoolId } }),
      prisma.transportVehicle.findFirst({ where: { id: vehicleId, schoolId } }),
    ]);

    if (!route || !vehicle) {
      res.status(404).json({ success: false, error: 'Route or vehicle not found in your school' });
      return;
    }

    const tripId = `trip_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const tripRecord: TransportTripRecord = {
      id: tripId,
      schoolId,
      routeId,
      vehicleId,
      driverId: driverId || vehicle.driverId || undefined,
      tripType,
      status: 'SCHEDULED',
      scheduledStartTime: scheduledStartTime || new Date().toISOString(),
      geofenceEvents: [],
      boardingLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    activeTripsStore.set(tripId, tripRecord);

    res.status(201).json({ success: true, data: tripRecord });
  } catch (err: any) {
    logger.error({ err }, 'Create transport trip error');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/v1/transport/trips — List Trips for School
router.get('/trips', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { status, vehicleId, routeId } = req.query as Record<string, string | undefined>;

    let trips = Array.from(activeTripsStore.values()).filter((t) => t.schoolId === schoolId);
    if (status) trips = trips.filter((t) => t.status === status);
    if (vehicleId) trips = trips.filter((t) => t.vehicleId === vehicleId);
    if (routeId) trips = trips.filter((t) => t.routeId === routeId);

    res.json({ success: true, data: trips });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/v1/transport/trips/:id — Specific Trip details with live status
router.get('/trips/:id', authenticate, requireModule('TRANSPORT'), async (req: AuthRequest, res: Response) => {
  try {
    const trip = activeTripsStore.get(req.params.id as string);
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found' });
      return;
    }

    if (req.user?.role !== Role.SUPER_ADMIN && req.user?.schoolId !== trip.schoolId) {
      res.status(403).json({ success: false, error: 'Unauthorized to view trip from another school' });
      return;
    }

    const liveTelemetry = vehicleTelemetryStore.get(trip.vehicleId);

    res.json({
      success: true,
      data: {
        ...trip,
        currentLocation: liveTelemetry || null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/v1/transport/trips/:id/status — Transition Trip State
router.put('/trips/:id/status', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const trip = activeTripsStore.get(req.params.id as string);
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found' });
      return;
    }

    if (req.user?.role !== Role.SUPER_ADMIN && req.user?.schoolId !== trip.schoolId) {
      res.status(403).json({ success: false, error: 'Unauthorized to modify trip of another school' });
      return;
    }

    const parsed = updateTripStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid status', details: parsed.error.issues });
      return;
    }

    const { status: targetStatus } = parsed.data;
    const allowedTransitions = VALID_TRIP_TRANSITIONS[trip.status];

    if (!allowedTransitions || !allowedTransitions.includes(targetStatus)) {
      res.status(400).json({
        success: false,
        error: `Invalid state transition from '${trip.status}' to '${targetStatus}'. Allowed: ${allowedTransitions?.join(', ') || 'none'}`,
      });
      return;
    }

    trip.status = targetStatus;
    trip.updatedAt = new Date().toISOString();

    if (targetStatus === 'STARTED' && !trip.actualStartTime) {
      trip.actualStartTime = new Date().toISOString();
    } else if (targetStatus === 'COMPLETED' || targetStatus === 'CANCELLED') {
      trip.actualEndTime = new Date().toISOString();
    }

    res.json({ success: true, message: `Trip status transitioned to ${targetStatus}`, data: trip });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/v1/transport/trips/:id/stops/:stopId/confirm-boarding — Boarding/Alighting Confirmation
router.post('/trips/:id/stops/:stopId/confirm-boarding', authenticate, requireModule('TRANSPORT'), async (req: AuthRequest, res: Response) => {
  try {
    const trip = activeTripsStore.get(req.params.id as string);
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found' });
      return;
    }

    if (req.user?.role !== Role.SUPER_ADMIN && req.user?.schoolId !== trip.schoolId) {
      res.status(403).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const parsed = confirmBoardingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid boarding payload', details: parsed.error.issues });
      return;
    }

    const { studentId, action, notes } = parsed.data;
    const stopId = req.params.stopId as string;

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: trip.schoolId },
      select: { id: true, name: true, rollNo: true },
    });

    if (!student) {
      res.status(404).json({ success: false, error: 'Student not found in this school' });
      return;
    }

    const logEntry = {
      studentId: student.id,
      stopId,
      action,
      notes,
      timestamp: new Date().toISOString(),
      confirmedBy: req.user?.id || 'STAFF',
    };

    trip.boardingLogs.push(logEntry);
    trip.updatedAt = new Date().toISOString();

    res.json({ success: true, message: `Student ${action.toLowerCase()} recorded`, data: logEntry });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/v1/transport/fleet/overview — Admin Fleet Tracking Overview
router.get('/fleet/overview', adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;

    const vehicles = await prisma.transportVehicle.findMany({
      where: { schoolId },
      include: {
        driver: { select: { id: true, name: true, email: true } },
        routes: { select: { id: true, name: true, stops: { select: { id: true, name: true, pickupTime: true } } } },
      },
      orderBy: { registrationNumber: 'asc' },
    });

    const now = Date.now();
    const fleetStatus = vehicles.map((v) => {
      const live = vehicleTelemetryStore.get(v.id);
      let freshness: 'ONLINE_ACTIVE' | 'STALE' | 'OFFLINE' = 'OFFLINE';
      let ageSeconds: number | null = null;

      if (live) {
        ageSeconds = Math.round((now - live.recordedAt.getTime()) / 1000);
        if (ageSeconds <= 120) {
          freshness = 'ONLINE_ACTIVE';
        } else if (ageSeconds <= 900) {
          freshness = 'STALE';
        } else {
          freshness = 'OFFLINE';
        }
      }

      const activeTrip = Array.from(activeTripsStore.values()).find(
        (t) => t.vehicleId === v.id && (t.status === 'STARTED' || t.status === 'IN_PROGRESS' || t.status === 'READY')
      );

      return {
        id: v.id,
        registrationNumber: v.registrationNumber,
        vehicleType: v.vehicleType,
        capacity: v.capacity,
        vehicleStatus: v.status,
        driver: v.driver ? { id: v.driver.id, name: v.driver.name } : null,
        routes: v.routes,
        telemetry: live || null,
        freshness,
        ageSeconds,
        activeTrip: activeTrip ? { id: activeTrip.id, status: activeTrip.status, tripType: activeTrip.tripType } : null,
      };
    });

    res.json({
      success: true,
      totalVehicles: vehicles.length,
      onlineCount: fleetStatus.filter((f) => f.freshness === 'ONLINE_ACTIVE').length,
      staleCount: fleetStatus.filter((f) => f.freshness === 'STALE').length,
      offlineCount: fleetStatus.filter((f) => f.freshness === 'OFFLINE').length,
      fleet: fleetStatus,
    });
  } catch (err: any) {
    logger.error({ err }, 'Fleet overview error');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
