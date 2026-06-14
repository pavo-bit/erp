import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Zod schemas for validation
const delegationSchema = z.object({
  delegateeId: z.string(),
  permissionGroupId: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  reason: z.string().min(5),
  endDate: z.string().datetime(),
});

const reviewSchema = z.object({
  targetUserId: z.string(),
  scheduledDate: z.string().datetime(),
});

const reviewActionSchema = z.object({
  status: z.enum(["APPROVED", "REVOKED"]),
  comments: z.string().optional()
});

// Create a new delegation (e.g., temporary access)
router.post('/delegations', authenticate, requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const data = delegationSchema.parse(req.body);
    const delegatorId = req.user!.id;
    const schoolId = req.user!.schoolId!;

    const delegation = await prisma.userDelegation.create({
      data: {
        schoolId,
        delegatorId,
        delegateeId: data.delegateeId,
        permissionGroupId: data.permissionGroupId,
        role: data.role,
        reason: data.reason,
        endDate: new Date(data.endDate),
        isActive: true,
      }
    });

    res.status(201).json({ success: true, data: delegation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// List all active delegations
router.get('/delegations', authenticate, requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const delegations = await prisma.userDelegation.findMany({
      where: {
        schoolId,
        isActive: true,
        endDate: { gt: new Date() } // JIT Expiration
      },
      include: {
        delegatee: { select: { id: true, name: true, email: true } },
        delegator: { select: { id: true, name: true, email: true } },
        permissionGroup: true
      }
    });

    res.json({ success: true, data: delegations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Schedule a permission review
router.post('/reviews', authenticate, requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const data = reviewSchema.parse(req.body);
    const reviewerId = req.user!.id;
    const schoolId = req.user!.schoolId!;

    const review = await prisma.accessReview.create({
      data: {
        schoolId,
        reviewerId,
        targetUserId: data.targetUserId,
        scheduledDate: new Date(data.scheduledDate),
        status: "PENDING"
      }
    });

    res.status(201).json({ success: true, data: review });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Complete an access review
router.put('/reviews/:id', authenticate, requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = reviewActionSchema.parse(req.body);
    
    const review = await prisma.accessReview.update({
      where: { id: id as string },
      data: {
        status: data.status,
        comments: data.comments,
        reviewDate: new Date()
      }
    });

    // If revoked, automatically disable all active delegations for this target user
    if (data.status === 'REVOKED') {
      await prisma.userDelegation.updateMany({
        where: {
          delegateeId: review.targetUserId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });
    }

    res.json({ success: true, data: review });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
