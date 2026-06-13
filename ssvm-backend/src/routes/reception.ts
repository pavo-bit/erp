import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";
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
router.get("/enquiries", authenticate, requireRole("RECEPTIONIST", "SUPER_ADMIN", "ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
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
router.post("/enquiries", authenticate, requireRole("RECEPTIONIST", "SUPER_ADMIN", "ADMIN", "ERP_ADMIN"), validate(enquirySchema), async (req: AuthRequest, res: Response) => {
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

// GET /api/v1/reception/visitors
router.get("/visitors", authenticate, requireRole("RECEPTIONIST", "SUPER_ADMIN", "ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
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
router.post("/visitors", authenticate, requireRole("RECEPTIONIST", "SUPER_ADMIN", "ADMIN", "ERP_ADMIN"), validate(visitorSchema), async (req: AuthRequest, res: Response) => {
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

export default router;
