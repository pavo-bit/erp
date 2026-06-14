import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../../middleware/auth';
import logger from '../../lib/logger';
import { Role } from '@prisma/client';

const router = Router();

// Middleware: Strictly Super Admin or ERP Admin
router.use(authenticate);
router.use(requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN));

// =====================================
// DATA GOVERNANCE (Classifications)
// =====================================

const classificationSchema = z.object({
  tableName: z.string(),
  columnName: z.string(),
  privacyTier: z.enum(['PII', 'FINANCIAL', 'PUBLIC', 'INTERNAL']),
});

router.get('/classifications', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const classifications = await prisma.dataClassification.findMany({
      where: { schoolId }
    });
    res.json({ success: true, data: classifications });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch data classifications');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/classifications', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = classificationSchema.parse(req.body);

    const classification = await prisma.dataClassification.upsert({
      where: {
        schoolId_tableName_columnName: {
          schoolId,
          tableName: data.tableName,
          columnName: data.columnName
        }
      },
      update: { privacyTier: data.privacyTier },
      create: { ...data, schoolId }
    });

    res.status(201).json({ success: true, data: classification });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// =====================================
// FINANCIAL CLOSE (Fiscal Periods)
// =====================================

const periodSchema = z.object({
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

router.get('/financial-periods', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const periods = await prisma.financialPeriod.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' }
    });
    res.json({ success: true, data: periods });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/financial-periods', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = periodSchema.parse(req.body);

    const period = await prisma.financialPeriod.create({
      data: {
        schoolId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: 'OPEN'
      }
    });

    res.status(201).json({ success: true, data: period });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/financial-periods/:id/close', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const periodId = req.params.id as string;

    const period = await prisma.financialPeriod.findFirst({
      where: { id: periodId, schoolId }
    });

    if (!period) return res.status(404).json({ success: false, error: 'Period not found' });
    if (period.status === 'CLOSED') return res.status(400).json({ success: false, error: 'Period is already closed' });

    const updated = await prisma.financialPeriod.update({
      where: { id: period.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedById: req.user!.id
      }
    });

    logger.info({ periodId, schoolId, userId: req.user!.id }, 'Financial Period Closed');
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// =====================================
// ARCHIVAL JOBS
// =====================================

router.post('/archives/trigger', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { jobType } = req.body; // e.g., 'END_OF_YEAR'

    const job = await prisma.archiveJobLog.create({
      data: {
        schoolId,
        jobType: jobType || 'MANUAL_ARCHIVE',
        status: 'PENDING'
      }
    });

    // In a real scenario, this would drop a message into a BullMQ or SQS queue 
    // to orchestrate an AWS Glacier dump.
    res.status(202).json({ success: true, message: 'Archive job queued successfully', data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
