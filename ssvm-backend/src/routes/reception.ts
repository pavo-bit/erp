import { createAuditLog } from "../lib/audit";
import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireRole, requireOperationsAdmin } from "../middleware/auth";
import { z } from "zod";
import { validate } from "../middleware/validate";

const router = Router();

// Enquiry Schema
const enquirySchema = z.object({
  studentName: z.string().min(2),
  parentName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  applyingForClass: z.string().optional(),
  source: z.string().optional(),
  remarks: z.string().optional(),
});

// Visitor Log Schema
const visitorSchema = z.object({
  visitorName: z.string().min(2),
  phone: z.string().min(10),
  purpose: z.string().min(2),
  personToMeet: z.string().optional(),
  remarks: z.string().optional(),
});

// GET /api/v1/reception/enquiries
router.get("/enquiries", authenticate, requireOperationsAdmin("RECEPTIONIST"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.query.schoolId : req.user!.schoolId) as string;
    const enquiries = await prisma.admissionEnquiry.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data: enquiries });
  } catch (e) {
    logger.error({ err: e }, "List enquiries error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/reception/enquiries
router.post("/enquiries", authenticate, requireOperationsAdmin("RECEPTIONIST"), validate(enquirySchema), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId) as string;
    const enquiry = await prisma.admissionEnquiry.create({
      data: {
        ...req.body,
        schoolId,
      }
    });
    res.status(201).json({ success: true, data: enquiry });
  } catch (e) {
    logger.error({ err: e }, "Create enquiry error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/v1/reception/enquiries/:id
router.put("/enquiries/:id", authenticate, requireOperationsAdmin("RECEPTIONIST"), async (req: AuthRequest, res: Response) => {
  try {
    const enquiryId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { status, remarks } = req.body;

    const enquiry = await prisma.admissionEnquiry.findUnique({ where: { id: enquiryId } });
    if (!enquiry || enquiry.schoolId !== schoolId) {
      res.status(404).json({ success: false, error: "Enquiry not found" });
      return;
    }

    const updated = await prisma.admissionEnquiry.update({
      where: { id: enquiryId },
      data: { status, remarks },
    });

    await createAuditLog({
      data: {
        schoolId,
        userId: req.user!.id,
        action: "UPDATE_ENQUIRY",
        entity: "AdmissionEnquiry",
        entityId: enquiryId,
        details: JSON.stringify({ status, remarks })
      }
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    logger.error({ err: e }, "Update enquiry error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/v1/reception/visitors
router.get("/visitors", authenticate, requireOperationsAdmin("RECEPTIONIST"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.query.schoolId : req.user!.schoolId) as string;
    const logs = await prisma.visitorLog.findMany({
      where: { schoolId },
      orderBy: { checkIn: "desc" }
    });
    res.json({ success: true, data: logs });
  } catch (e) {
    logger.error({ err: e }, "List visitors error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/reception/visitors
router.post("/visitors", authenticate, requireOperationsAdmin("RECEPTIONIST"), validate(visitorSchema), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId) as string;
    const log = await prisma.visitorLog.create({
      data: {
        ...req.body,
        schoolId,
      }
    });
    res.status(201).json({ success: true, data: log });
  } catch (e) {
    logger.error({ err: e }, "Create visitor log error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/v1/reception/visitors/:id - Update visitor (check-out, notes)
router.put("/visitors/:id", authenticate, requireOperationsAdmin("RECEPTIONIST"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { checkOut, remarks } = req.body;

    const visitor = await prisma.visitorLog.update({
      where: { id: id as string },
      data: { 
        checkOut: checkOut ? new Date(checkOut) : undefined,
        remarks
      }
    });

    res.json({ success: true, data: visitor });
  } catch (e) {
    logger.error({ err: e }, "Update visitor error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════
// COMPLAINTS
// ═══════════════════════════════════════════

// Complaint Schema
const complaintSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  subject: z.string().min(2),
  description: z.string().min(2),
});

// GET /api/v1/reception/complaints - List complaints
router.get("/complaints", authenticate, requireOperationsAdmin("RECEPTIONIST"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.query.schoolId : req.user!.schoolId) as string;
    const { status } = req.query;

    const where: any = { schoolId };
    if (status) where.status = status;

    const complaints = await prisma.receptionComplaint.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: complaints });
  } catch (e) {
    logger.error({ err: e }, "List complaints error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/reception/complaints - Create complaint
router.post("/complaints", authenticate, requireOperationsAdmin("RECEPTIONIST"), validate(complaintSchema), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId) as string;
    const { name, phone, subject, description } = req.body;

    const complaint = await prisma.receptionComplaint.create({
      data: {
        schoolId,
        name,
        phone,
        subject,
        description
      }
    });

    res.status(201).json({ success: true, data: complaint });
  } catch (e) {
    logger.error({ err: e }, "Create complaint error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/v1/reception/complaints/:id - Update complaint status
router.put("/complaints/:id", authenticate, requireOperationsAdmin("RECEPTIONIST"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, resolvedBy } = req.body;

    const data: any = { status };
    if (status === "RESOLVED" || status === "CLOSED") {
      data.resolvedAt = new Date();
      if (resolvedBy) data.resolvedBy = resolvedBy;
    }

    const complaint = await prisma.receptionComplaint.update({
      where: { id: id as string },
      data
    });

    res.json({ success: true, data: complaint });
  } catch (e) {
    logger.error({ err: e }, "Update complaint error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════
// CALL LOGS
// ═══════════════════════════════════════════

// Call Log Schema
const callLogSchema = z.object({
  callerName: z.string().min(2),
  callerPhone: z.string().min(10),
  purpose: z.string().min(2),
  handledBy: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// GET /api/v1/reception/calls - List call logs
router.get("/calls", authenticate, requireOperationsAdmin("RECEPTIONIST"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.query.schoolId : req.user!.schoolId) as string;
    const { from, to } = req.query;

    const where: any = { schoolId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    const callLogs = await prisma.receptionCallLog.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: callLogs });
  } catch (e) {
    logger.error({ err: e }, "List call logs error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/reception/calls - Log a call
router.post("/calls", authenticate, requireOperationsAdmin("RECEPTIONIST"), validate(callLogSchema), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId) as string;
    const { callerName, callerPhone, purpose, handledBy, followUpDate, notes } = req.body;

    const callLog = await prisma.receptionCallLog.create({
      data: {
        schoolId,
        callerName,
        callerPhone,
        purpose,
        handledBy,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes
      }
    });

    res.status(201).json({ success: true, data: callLog });
  } catch (e) {
    logger.error({ err: e }, "Log call error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/v1/reception/calls/:id - Update call log
router.put("/calls/:id", authenticate, requireOperationsAdmin("RECEPTIONIST"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { handledBy, followUpDate, notes } = req.body;

    const callLog = await prisma.receptionCallLog.update({
      where: { id: id as string },
      data: {
        handledBy,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        notes
      }
    });

    res.json({ success: true, data: callLog });
  } catch (e) {
    logger.error({ err: e }, "Update call log error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
