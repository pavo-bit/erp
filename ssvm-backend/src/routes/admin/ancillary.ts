import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../../middleware/auth';
import logger from '../../lib/logger';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// =====================================
// HOSTEL ERP
// =====================================

const roomSchema = z.object({
  building: z.string(),
  roomNumber: z.string(),
  capacity: z.number().int().positive(),
  gender: z.enum(['MALE', 'FEMALE', 'COED']),
  status: z.enum(['AVAILABLE', 'MAINTENANCE']).default('AVAILABLE'),
});

router.get('/hostel/rooms', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const rooms = await prisma.hostelRoom.findMany({
      where: { schoolId },
      include: { allocations: true },
      orderBy: [{ building: 'asc' }, { roomNumber: 'asc' }]
    });
    res.json({ success: true, data: rooms });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/hostel/rooms', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = roomSchema.parse(req.body);

    const room = await prisma.hostelRoom.create({
      data: { ...data, schoolId }
    });

    res.status(201).json({ success: true, data: room });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// --- Hostel Allocations ---

const allocateSchema = z.object({
  roomId: z.string(),
  studentId: z.string(),
  startDate: z.string().datetime().optional()
});

router.post('/hostel/allocate', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = allocateSchema.parse(req.body);

    const allocation = await prisma.$transaction(async (tx) => {
      // 1. Fetch Room and active allocations count
      const room = await tx.hostelRoom.findFirst({
        where: { id: data.roomId, schoolId },
        include: { _count: { select: { allocations: { where: { status: 'ACTIVE' } } } } }
      });

      if (!room) throw new Error("Room not found");
      
      // 2. Capacity Check
      if (room._count.allocations >= room.capacity) {
        throw new Error("Room is at full capacity");
      }

      // 3. Prevent duplicate active allocations
      const existing = await tx.hostelAllocation.findFirst({
        where: { studentId: data.studentId, status: 'ACTIVE' }
      });
      if (existing) throw new Error("Student already has an active room allocation");

      // 4. Create Allocation
      const newAlloc = await tx.hostelAllocation.create({
        data: {
          roomId: data.roomId,
          studentId: data.studentId,
          schoolId: schoolId,
          startDate: data.startDate ? new Date(data.startDate) : new Date(),
        }
      });

      return newAlloc;
    });

    res.status(201).json({ success: true, data: allocation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/hostel/allocations', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const allocations = await prisma.hostelAllocation.findMany({
      where: { room: { schoolId } },
      include: {
        room: true,
        student: { select: { id: true, admissionNo: true } }
      }
    });
    res.json({ success: true, data: allocations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/hostel/allocations/:id/checkout', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { id } = req.params;

    const allocation = await prisma.hostelAllocation.updateMany({
      where: { id: id as string, room: { schoolId }, status: 'ACTIVE' },
      data: { status: 'CHECKED_OUT', endDate: new Date() }
    });

    if (allocation.count === 0) {
      return res.status(404).json({ success: false, error: "Active allocation not found" });
    }

    res.json({ success: true, message: "Checkout processed" });
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
