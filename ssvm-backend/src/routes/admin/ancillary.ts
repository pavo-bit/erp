import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma, { runWithTenantDatabaseTransaction } from '../../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../../middleware/auth';
import { requireModule } from '../../middleware/moduleGuard';
import logger from '../../lib/logger';
import { Role } from '@prisma/client';
import { CampusOperationsMetaService } from '../../services/campus-operations-meta.service';

const router = Router();

router.use(authenticate);
router.use('/hostel', requireModule('HOSTEL'));

// =====================================
// HOSTEL ERP
// =====================================

const roomSchema = z.object({
  building: z.string().min(1, "Building name is required"),
  roomNumber: z.string().min(1, "Room number is required"),
  capacity: z.number().int().positive("Capacity must be positive"),
  gender: z.enum(['MALE', 'FEMALE', 'COED']).default('COED'),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'OCCUPIED', 'FULL']).default('AVAILABLE'),
  floor: z.string().nullable().optional(),
  roomType: z.string().nullable().optional(),
});

const updateRoomSchema = z.object({
  building: z.string().min(1).optional(),
  roomNumber: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'COED']).optional(),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'OCCUPIED', 'FULL']).optional(),
  floor: z.string().nullable().optional(),
  roomType: z.string().nullable().optional(),
});

// GET /api/v1/ancillary/hostel/stats — Overview Statistics
router.get('/hostel/stats', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const rooms = await prisma.hostelRoom.findMany({
      where: { schoolId },
      include: {
        _count: {
          select: { allocations: { where: { status: 'ACTIVE' } } }
        }
      }
    });

    const totalRooms = rooms.length;
    const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
    const occupiedBeds = rooms.reduce((acc, r) => acc + r._count.allocations, 0);
    const availableBeds = Math.max(0, totalCapacity - occupiedBeds);
    const buildings = new Set(rooms.map(r => r.building));
    const fullRooms = rooms.filter(r => r._count.allocations >= r.capacity).length;
    const maintenanceRooms = rooms.filter(r => r.status === 'MAINTENANCE').length;

    res.json({
      success: true,
      data: {
        totalBuildings: buildings.size,
        totalRooms,
        totalCapacity,
        occupiedBeds,
        availableBeds,
        fullRooms,
        maintenanceRooms,
        activeAllocations: occupiedBeds,
      }
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Fetch hostel stats error');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/v1/ancillary/hostel/rooms — List all rooms with active members
router.get('/hostel/rooms', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { building, gender, status, search } = req.query as Record<string, string | undefined>;

    const where: any = { schoolId };
    if (building) where.building = building;
    if (gender) where.gender = gender;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { roomNumber: { contains: search, mode: 'insensitive' } },
        { building: { contains: search, mode: 'insensitive' } },
      ];
    }

    const rooms = await prisma.hostelRoom.findMany({
      where,
      include: {
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                rollNo: true,
                admissionNo: true,
                gender: true,
                photo: true,
                sectionRef: {
                  include: { class: { select: { name: true } } }
                }
              }
            }
          }
        }
      },
      orderBy: [{ building: 'asc' }, { roomNumber: 'asc' }]
    });

    // Derive computed dynamic status for each room
    const enhancedRooms = await Promise.all(
      rooms.map(async (room) => {
        const activeCount = room.allocations.length;
        let computedStatus = room.status;
        if (room.status !== 'MAINTENANCE') {
          if (activeCount >= room.capacity) {
            computedStatus = 'FULL';
          } else if (activeCount > 0) {
            computedStatus = 'OCCUPIED';
          } else {
            computedStatus = 'AVAILABLE';
          }
        }
        const meta = await CampusOperationsMetaService.getRoomMeta(schoolId, room.id);
        return {
          ...room,
          baseStatus: room.status,
          status: computedStatus,
          activeCount,
          occupiedBeds: activeCount,
          availableBeds: Math.max(0, room.capacity - activeCount),
          computedStatus,
          floor: meta.floor ?? null,
          roomType: meta.roomType ?? null,
        };
      })
    );

    res.json({ success: true, data: enhancedRooms });
  } catch (error: any) {
    logger.error({ err: error }, 'Fetch hostel rooms error');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/v1/ancillary/hostel/rooms/:id — Room detail with members & allocation history
router.get('/hostel/rooms/:id', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const room = await prisma.hostelRoom.findFirst({
      where: { id: req.params.id as string, schoolId },
      include: {
        allocations: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                rollNo: true,
                admissionNo: true,
                gender: true,
                photo: true,
                dob: true,
                sectionRef: {
                  include: {
                    class: {
                      select: { name: true, session: { select: { name: true } } }
                    }
                  }
                },
                guardian: {
                  select: { primaryName: true, primaryPhone: true }
                }
              }
            }
          },
          orderBy: { startDate: 'desc' }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const activeAllocations = room.allocations.filter(a => a.status === 'ACTIVE');
    const pastAllocations = room.allocations.filter(a => a.status !== 'ACTIVE');

    const activeCount = activeAllocations.length;
    let computedStatus = room.status;
    if (room.status !== 'MAINTENANCE') {
      if (activeCount >= room.capacity) {
        computedStatus = 'FULL';
      } else if (activeCount > 0) {
        computedStatus = 'OCCUPIED';
      } else {
        computedStatus = 'AVAILABLE';
      }
    }

    const meta = await CampusOperationsMetaService.getRoomMeta(schoolId, room.id);

    res.json({
      success: true,
      data: {
        ...room,
        baseStatus: room.status,
        status: computedStatus,
        activeCount,
        occupiedBeds: activeCount,
        availableBeds: Math.max(0, room.capacity - activeCount),
        computedStatus,
        floor: meta.floor ?? null,
        roomType: meta.roomType ?? null,
        activeAllocations,
        pastAllocations,
      }
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Fetch room detail error');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/v1/ancillary/hostel/rooms — Create new room
router.post('/hostel/rooms', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = roomSchema.parse(req.body);

    const existing = await prisma.hostelRoom.findUnique({
      where: {
        schoolId_building_roomNumber: {
          schoolId,
          building: data.building,
          roomNumber: data.roomNumber
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Room ${data.roomNumber} in building '${data.building}' already exists`
      });
    }

    const { floor, roomType, ...prismaRoomData } = data;

    const room = await prisma.hostelRoom.create({
      data: { ...prismaRoomData, schoolId }
    });

    if (floor !== undefined || roomType !== undefined) {
      await CampusOperationsMetaService.setRoomMeta(schoolId, room.id, {
        floor: floor ?? null,
        roomType: roomType ?? null,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        ...room,
        floor: floor ?? null,
        roomType: roomType ?? null,
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/ancillary/hostel/rooms/:id — Update existing room
router.put('/hostel/rooms/:id', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { id } = req.params;
    const data = updateRoomSchema.parse(req.body);

    const room = await prisma.hostelRoom.findFirst({
      where: { id: id as string, schoolId },
      include: { _count: { select: { allocations: { where: { status: 'ACTIVE' } } } } }
    });

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    if (data.capacity !== undefined && data.capacity < room._count.allocations) {
      return res.status(400).json({
        success: false,
        error: `Cannot reduce capacity to ${data.capacity}. Current active occupants: ${room._count.allocations}.`
      });
    }

    const { floor, roomType, ...prismaUpdateData } = data;

    const updated = await prisma.hostelRoom.update({
      where: { id: id as string },
      data: prismaUpdateData,
    });

    let meta: any = {};
    if (floor !== undefined || roomType !== undefined) {
      meta = await CampusOperationsMetaService.setRoomMeta(schoolId, id as string, {
        ...(floor !== undefined && { floor: floor ?? null }),
        ...(roomType !== undefined && { roomType: roomType ?? null }),
      });
    } else {
      meta = await CampusOperationsMetaService.getRoomMeta(schoolId, id as string);
    }

    res.json({
      success: true,
      data: {
        ...updated,
        floor: meta.floor ?? null,
        roomType: meta.roomType ?? null,
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// --- Hostel Allocations ---

const allocateSchema = z.object({
  roomId: z.string().min(1),
  studentId: z.string().min(1),
  startDate: z.string().optional(),
});

router.post('/hostel/allocate', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = allocateSchema.parse(req.body);

    const allocation = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      // 1. Concurrency lock on target room row
      await tx.$queryRaw`SELECT id FROM hostel_rooms WHERE id = ${data.roomId} AND "schoolId" = ${schoolId} FOR UPDATE`;

      // 2. Fetch Room and active allocations count
      const room = await tx.hostelRoom.findFirst({
        where: { id: data.roomId, schoolId },
        include: { _count: { select: { allocations: { where: { status: 'ACTIVE' } } } } }
      });

      if (!room) {
        const err: any = new Error("Room not found");
        err.statusCode = 404;
        throw err;
      }
      
      if (room.status === 'MAINTENANCE') {
        throw new Error("Cannot allocate: Room is currently under maintenance");
      }

      // 3. Capacity Check
      if (room._count.allocations >= room.capacity) {
        throw new Error("Room is at full capacity");
      }

      // 4. Verify student exists in this school
      const student = await tx.student.findFirst({
        where: { id: data.studentId, schoolId },
        select: { id: true, name: true, gender: true }
      });
      if (!student) {
        const err: any = new Error("Student not found in this school");
        err.statusCode = 404;
        throw err;
      }

      // 5. Gender Policy Check
      if (room.gender !== 'COED' && student.gender) {
        const studentGender = student.gender.toUpperCase();
        if (room.gender === 'MALE' && !['MALE', 'M', 'BOY'].includes(studentGender)) {
          throw new Error(`Gender policy violation: Room is designated for ${room.gender} only.`);
        }
        if (room.gender === 'FEMALE' && !['FEMALE', 'F', 'GIRL'].includes(studentGender)) {
          throw new Error(`Gender policy violation: Room is designated for ${room.gender} only.`);
        }
      }

      // 6. Prevent duplicate active allocations
      const existing = await tx.hostelAllocation.findFirst({
        where: { studentId: data.studentId, status: 'ACTIVE' }
      });
      if (existing) throw new Error("Student already has an active room allocation");

      // 7. Create Allocation
      const newAlloc = await tx.hostelAllocation.create({
        data: {
          roomId: data.roomId,
          studentId: data.studentId,
          schoolId: schoolId,
          startDate: data.startDate ? new Date(data.startDate) : new Date(),
        },
        include: {
          room: true,
          student: {
            select: {
              id: true,
              name: true,
              admissionNo: true,
              rollNo: true,
              gender: true
            }
          }
        }
      });

      return newAlloc;
    });

    res.status(201).json({ success: true, data: allocation, message: "Student allocated successfully" });
  } catch (error: any) {
    const status = error.statusCode || 400;
    res.status(status).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/ancillary/hostel/allocations/:id/transfer — Transfer student to new room
router.put('/hostel/allocations/:id/transfer', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { id } = req.params;
    const { targetRoomId } = req.body;

    if (!targetRoomId) {
      return res.status(400).json({ success: false, error: "targetRoomId is required" });
    }

    const result = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      // 1. Lock target room row
      await tx.$queryRaw`SELECT id FROM hostel_rooms WHERE id = ${targetRoomId} AND "schoolId" = ${schoolId} FOR UPDATE`;

      // 2. Fetch existing active allocation
      const currentAlloc = await tx.hostelAllocation.findFirst({
        where: { id: id as string, schoolId, status: 'ACTIVE' },
        include: { student: true, room: true }
      });
      if (!currentAlloc) throw new Error("Active allocation not found");

      if (currentAlloc.roomId === targetRoomId) {
        throw new Error("Student is already allocated to this room");
      }

      // 3. Verify target room capacity & status
      const targetRoom = await tx.hostelRoom.findFirst({
        where: { id: targetRoomId, schoolId },
        include: { _count: { select: { allocations: { where: { status: 'ACTIVE' } } } } }
      });
      if (!targetRoom) throw new Error("Target room not found");
      if (targetRoom.status === 'MAINTENANCE') throw new Error("Target room is under maintenance");
      if (targetRoom._count.allocations >= targetRoom.capacity) throw new Error("Target room is at full capacity");

      // 4. Gender check
      if (targetRoom.gender !== 'COED' && currentAlloc.student.gender) {
        const studentGender = currentAlloc.student.gender.toUpperCase();
        if (targetRoom.gender === 'MALE' && !['MALE', 'M', 'BOY'].includes(studentGender)) {
          throw new Error(`Gender policy violation: Target room is designated for ${targetRoom.gender} only.`);
        }
        if (targetRoom.gender === 'FEMALE' && !['FEMALE', 'F', 'GIRL'].includes(studentGender)) {
          throw new Error(`Gender policy violation: Target room is designated for ${targetRoom.gender} only.`);
        }
      }

      // 5. Checkout current allocation
      await tx.hostelAllocation.update({
        where: { id: currentAlloc.id },
        data: { status: 'CHECKED_OUT', endDate: new Date() }
      });

      // 6. Create new allocation in target room
      const newAllocation = await tx.hostelAllocation.create({
        data: {
          schoolId,
          studentId: currentAlloc.studentId,
          roomId: targetRoomId,
          startDate: new Date(),
          status: 'ACTIVE'
        },
        include: { room: true, student: true }
      });

      return { previousRoom: currentAlloc.room.roomNumber, newAllocation };
    });

    res.json({ success: true, data: result, message: "Student transferred successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/v1/ancillary/hostel/allocations — List allocations
router.get('/hostel/allocations', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { status, studentId, roomId } = req.query as Record<string, string | undefined>;

    const where: any = { schoolId };
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;
    if (roomId) where.roomId = roomId;

    const allocations = await prisma.hostelAllocation.findMany({
      where,
      include: {
        room: true,
        student: {
          select: {
            id: true,
            name: true,
            admissionNo: true,
            rollNo: true,
            gender: true,
            photo: true,
            sectionRef: {
              include: { class: true }
            }
          }
        }
      },
      orderBy: { startDate: 'desc' }
    });
    res.json({ success: true, data: allocations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/v1/ancillary/hostel/allocations/:id/checkout — Check out student from room
router.put('/hostel/allocations/:id/checkout', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { id } = req.params;

    const existing = await prisma.hostelAllocation.findFirst({
      where: { id: id as string, schoolId, status: 'ACTIVE' },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: "Active allocation not found" });
    }

    const updated = await prisma.hostelAllocation.update({
      where: { id: id as string },
      data: { status: 'CHECKED_OUT', endDate: new Date() }
    });

    res.json({ success: true, message: "Checkout processed successfully", data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


// =====================================
// HELPDESK TICKETS
// =====================================

const ticketSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.enum(['IT', 'MAINTENANCE', 'BILLING']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

router.get('/helpdesk/tickets', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    
    // Non-admins only see their own tickets
    let whereClause: any = { schoolId };
    if (!['SUPER_ADMIN', 'ERP_ADMIN', 'SCHOOL_ADMIN'].includes(req.user!.role)) {
      whereClause.requesterId = req.user!.id;
    }

    const tickets = await prisma.helpdeskTicket.findMany({
      where: whereClause,
      include: {
        requester: { select: { id: true, name: true, role: true } },
        assignee: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: tickets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/helpdesk/tickets', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = ticketSchema.parse(req.body);

    const ticket = await prisma.helpdeskTicket.create({
      data: {
        ...data,
        schoolId,
        requesterId: req.user!.id,
        status: 'OPEN'
      }
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
