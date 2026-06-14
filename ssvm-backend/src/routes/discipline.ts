import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest, requireRole } from "../middleware/auth";
import logger from "../lib/logger";
import { Role } from "@prisma/client";

const router = Router();

// =====================================
// DISCIPLINE & INCIDENT MANAGEMENT
// =====================================

const incidentSchema = z.object({
  studentId: z.string(),
  type: z.enum(["INFRACTION", "MERIT", "ACADEMIC_VIOLATION", "SAFETY"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  title: z.string().min(3),
  description: z.string().min(10),
  incidentDate: z.string().datetime().optional()
});

const resolveSchema = z.object({
  status: z.enum(["UNDER_INVESTIGATION", "RESOLVED"]),
  actionTaken: z.string().min(5)
});

// 1. List Incidents
router.get("/incidents", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { studentId, status } = req.query;
    
    const where: any = { schoolId };
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    // RBAC: Teachers only see their own reports
    if (req.user!.role === Role.TEACHER) {
      where.reporterId = req.user!.id;
    } else if (req.user!.role === Role.PARENT) {
      // Parents can only query by their children
      const guardian = await prisma.guardian.findUnique({
        where: { userId: req.user!.id },
        include: { students: true }
      });
      if (!guardian) return res.status(403).json({ success: false, error: "Guardian profile not found" });
      const childIds = guardian.students.map((c: any) => c.id);
      
      // If parent didn't specify a studentId or specified one that's not theirs
      if (studentId && !childIds.includes(studentId as string)) {
         return res.status(403).json({ success: false, error: "Unauthorized access to student" });
      } else if (!studentId) {
         where.studentId = { in: childIds };
      }
    }

    const incidents = await prisma.incidentReport.findMany({
      where,
      include: {
        student: { select: { id: true, admissionNo: true } },
        reporter: { select: { id: true, name: true, role: true } }
      },
      orderBy: { incidentDate: 'desc' }
    });

    res.json({ success: true, data: incidents });
  } catch (error: any) {
    logger.error({ err: error }, "List incidents error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 2. Create Incident
router.post("/incidents", authenticate, requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN, Role.TEACHER), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const data = incidentSchema.parse(req.body);

    const student = await prisma.student.findFirst({ where: { id: data.studentId, schoolId } });
    if (!student) return res.status(404).json({ success: false, error: "Student not found" });

    const incident = await prisma.$transaction(async (tx) => {
      const newIncident = await tx.incidentReport.create({
        data: {
          schoolId,
          studentId: data.studentId,
          reporterId: req.user!.id,
          type: data.type,
          severity: data.severity,
          title: data.title,
          description: data.description,
          incidentDate: data.incidentDate ? new Date(data.incidentDate) : new Date(),
        }
      });

      // Dispatch urgent notification for High/Critical incidents
      if (data.severity === "HIGH" || data.severity === "CRITICAL") {
         // Placeholder for DomainEvent Outbox linkage
      }

      return newIncident;
    });

    res.status(201).json({ success: true, data: incident });
  } catch (error: any) {
    logger.error({ err: error }, "Create incident error");
    res.status(400).json({ success: false, error: error.message });
  }
});

// 3. Resolve Incident
router.put("/incidents/:id/resolve", authenticate, requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN, Role.TEACHER), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { id } = req.params;
    const { status, actionTaken } = resolveSchema.parse(req.body);

    const incident = await prisma.incidentReport.findUnique({ where: { id: id as string } });
    if (!incident || incident.schoolId !== schoolId) {
      return res.status(404).json({ success: false, error: "Incident not found" });
    }

    // RBAC: Teacher can only resolve incidents they reported
    if (req.user!.role === Role.TEACHER && incident.reporterId !== req.user!.id) {
      return res.status(403).json({ success: false, error: "Only the original reporter or admin can resolve this incident" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.incidentReport.update({
        where: { id: id as string },
        data: { status, actionTaken }
      });

      if (status === "RESOLVED") {
        // Placeholder for outbox DomainEvent integration
      }

      return res;
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error({ err: error }, "Resolve incident error");
    res.status(400).json({ success: false, error: error.message });
  }
});

// 4. Student Behavior Summary
router.get("/incidents/student/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const studentId = req.params.id;

    // Same RBAC checks...
    if (req.user!.role === Role.PARENT) {
      const guardian = await prisma.guardian.findUnique({
        where: { userId: req.user!.id },
        include: { students: true }
      });
      if (!guardian || !guardian.students.find((c: any) => c.id === studentId)) {
        return res.status(403).json({ success: false, error: "Unauthorized access to student" });
      }
    }

    const summary = await prisma.incidentReport.groupBy({
      by: ['severity'],
      where: { studentId: studentId as string, schoolId },
      _count: { severity: true }
    });

    res.json({ success: true, data: summary });
  } catch (error: any) {
    logger.error({ err: error }, "Get student behavior summary error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
