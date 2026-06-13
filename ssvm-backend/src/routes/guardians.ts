import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

const router = Router();

// Middleware: All guardian endpoints require auth
router.use(authenticate);

/**
 * GET /api/v1/guardians/me/students
 * Fetch all students linked to the current logged-in guardian
 */
router.get("/me/students", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const schoolId = req.user!.schoolId || undefined;

    // First find the guardian profile
    const guardian = await prisma.guardian.findFirst({
      where: { userId, schoolId }
    });

    if (!guardian) {
      return res.status(404).json({ success: false, error: "Guardian profile not found" });
    }

    const students = await prisma.student.findMany({
      where: { guardianId: guardian.id, schoolId },
      include: {
        sectionRef: true // removed class include because it's not present or wrong type
      }
    });

    res.json({ success: true, data: students });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch linked students");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/v1/guardians/me/fees
 * Consolidated fee view for all linked students
 */
router.get("/me/fees", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const schoolId = req.user!.schoolId || undefined;

    const guardian = await prisma.guardian.findFirst({
      where: { userId, schoolId }
    });

    if (!guardian) {
      return res.status(404).json({ success: false, error: "Guardian profile not found" });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        student: { guardianId: guardian.id },
        schoolId
      },
      include: {
        student: { select: { name: true, admissionNo: true } }
      },
      orderBy: { dueDate: "asc" }
    });

    res.json({ success: true, data: invoices });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch consolidated fees");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
