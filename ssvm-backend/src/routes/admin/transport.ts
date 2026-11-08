import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import prisma, { runWithTenantDatabaseTransaction } from '../../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../../middleware/auth';
import { requireModule } from '../../middleware/moduleGuard';
import { runAsSuperAdmin, runWithSchoolContext } from '../../middleware/school-context.middleware';
import logger from '../../lib/logger';
import { getRedisClient, isRedisAvailable } from '../../lib/redis';
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
  const secret = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'device-secret-key-salt')
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
    let tokenSchoolId: string | undefined = req.headers['x-school-id'] as string | undefined;

    if (parts.length >= 4 && parts[0] === 'dev') {
      tokenSchoolId = tokenSchoolId || parts[1];
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
// VEHICLES
// =====================================

router.get('/vehicles', adminGuard, async (req: AuthRequest, res: Response) => {
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

router.post('/vehicles', adminGuard, async (req: AuthRequest, res: Response) => {
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

router.get('/routes', adminGuard, async (req: AuthRequest, res: Response) => {
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

router.post('/routes', adminGuard, async (req: AuthRequest, res: Response) => {
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

router.post('/stops', adminGuard, async (req: AuthRequest, res: Response) => {
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
                  },
                },
              },
            },
          },
        },
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

router.post('/vehicles/:id/telemetry', authenticateDeviceOrAdmin, requireModule('TRANSPORT'), async (req: Request, res: Response) => {
  try {
    const vehicleId = req.params.id as string;
    const parseResult = telemetryPayloadSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid telemetry payload',
        details: parseResult.error.flatten().fieldErrors,
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
      for (const [tripId, trip] of activeTripsStore.entries()) {
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

  let vehicle: { id: string; schoolId: string } | null = null;
  const userSchoolId = user?.schoolId;
  if (userSchoolId) {
    vehicle = await runWithTenantDatabaseTransaction(userSchoolId, (tx) =>
      tx.transportVehicle.findFirst({
        where: { id: vehicleId, schoolId: userSchoolId },
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
    } catch (e) {}
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
      res.status(400).json({ success: false, error: 'Invalid trip payload', details: parsed.error.flatten().fieldErrors });
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
      res.status(400).json({ success: false, error: 'Invalid status', details: parsed.error.flatten().fieldErrors });
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
      res.status(400).json({ success: false, error: 'Invalid boarding payload', details: parsed.error.flatten().fieldErrors });
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
