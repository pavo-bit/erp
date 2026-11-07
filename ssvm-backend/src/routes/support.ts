/**
 * ssvm-backend/src/routes/support.ts
 * Role-Specific Issue Submission & Self-Service Support for Parents, Students & Teachers
 */

import { Router, Response } from "express";
import { z } from "zod";
import { authenticate, AuthRequest } from "../middleware/auth";
import { DiagnosticEventService } from "../services/diagnostic-event.service";
import { IncidentService } from "../services/incident.service";

const router = Router();

router.use(authenticate);

// In-memory support inquiry store (mapped by inquiry ID)
interface SupportInquiry {
  id: string;
  userId: string;
  userRole: string;
  userName: string;
  schoolId: string | null;
  category: "PAYMENT" | "ACADEMIC" | "TRANSPORT" | "PORTAL" | "OTHER";
  subject: string;
  description: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "RESOLVED";
  customerMessage: string;
  relatedReference?: string;
  incidentId?: string;
  createdAt: string;
  updatedAt: string;
}

const inquiries: SupportInquiry[] = [];

/**
 * POST /api/v1/support/issues
 * Submit an operational or payment issue
 */
router.post("/issues", async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      category: z.enum(["PAYMENT", "ACADEMIC", "TRANSPORT", "PORTAL", "OTHER"]),
      subject: z.string().min(1).max(200),
      description: z.string().min(1).max(2000),
      relatedReference: z.string().optional(),
    });

    const parsed = schema.parse(req.body);
    const user = req.user!;
    const inquiryId = `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // Ingest as diagnostic event into SHFI
    const diagEvent = await DiagnosticEventService.ingest({
      eventType: `SUPPORT_ISSUE_${parsed.category}`,
      schoolId: user.schoolId || null,
      module: parsed.category === "PAYMENT" ? "FINANCE" : "OPERATIONS",
      service: "support-portal",
      severity: parsed.category === "PAYMENT" ? "MEDIUM" : "LOW",
      errorCode: `USER_REPORTED_${parsed.category}`,
      sanitizedDescription: `User reported issue: ${parsed.subject}`,
      relatedOperationRef: parsed.relatedReference || null,
      evidence: {
        inquiryId,
        userRole: user.role,
        userId: user.id,
        category: parsed.category,
      },
    });

    const inquiry: SupportInquiry = {
      id: inquiryId,
      userId: user.id,
      userRole: user.role,
      userName: user.name || "User",
      schoolId: user.schoolId || null,
      category: parsed.category,
      subject: parsed.subject,
      description: parsed.description,
      status: "SUBMITTED",
      customerMessage:
        "Your report has been logged and shared with the school administrative office. You will be notified as soon as an update is available.",
      relatedReference: parsed.relatedReference,
      incidentId: diagEvent.correlationId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    inquiries.unshift(inquiry);
    res.status(201).json({ success: true, data: inquiry });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/support/issues/my
 * View permitted self-service inquiries submitted by the current authenticated user
 */
router.get("/issues/my", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const userInquiries = inquiries.filter((inq) => inq.userId === user.id);

    // Provide friendly customer status without exposing internal error codes or stack traces
    const safeData = userInquiries.map((inq) => ({
      id: inq.id,
      category: inq.category,
      subject: inq.subject,
      status: inq.status,
      customerMessage: inq.customerMessage,
      relatedReference: inq.relatedReference,
      createdAt: inq.createdAt,
      updatedAt: inq.updatedAt,
    }));

    res.json({ success: true, data: safeData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

