import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest, authenticate, requireAdmissionsAdmin } from "../middleware/auth";

const router = Router();
router.use(authenticate, requireAdmissionsAdmin());

function resolveSchoolId(req: AuthRequest, requestedSchoolId?: unknown): string | null {
    const schoolId = req.user?.role === "SUPER_ADMIN" ? requestedSchoolId : req.user?.schoolId;
    return typeof schoolId === "string" && schoolId.trim() ? schoolId : null;
}

// 1. Capture New Lead (Admission Enquiry)
router.post("/leads", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { studentName, parentName, phone, email, applyingForClass, source, campaignId } = req.body;
        const schoolId = resolveSchoolId(req, req.body?.schoolId);
        if (!schoolId) {
            res.status(400).json({ success: false, error: "School scope is required" });
            return;
        }
        if (typeof studentName !== "string" || !studentName.trim() || typeof parentName !== "string" || !parentName.trim() || typeof phone !== "string" || !phone.trim()) {
            res.status(400).json({ success: false, error: "Student name, parent name, and phone are required" });
            return;
        }

        // Auto-assign to the first Pipeline Stage
        const firstStage = await prisma.pipelineStage.findFirst({
            where: { schoolId, isActive: true },
            orderBy: { orderIndex: 'asc' }
        });
        if (campaignId) {
            const campaign = await prisma.marketingCampaign.findFirst({ where: { id: campaignId, schoolId }, select: { id: true } });
            if (!campaign) {
                res.status(404).json({ success: false, error: "Campaign not found" });
                return;
            }
        }

        const lead = await prisma.admissionEnquiry.create({
            data: {
                schoolId,
                studentName,
                parentName,
                phone,
                email,
                applyingForClass,
                source,
                campaignId,
                pipelineStageId: firstStage?.id,
                status: "OPEN"
            }
        });

        res.status(201).json({ success: true, data: lead });
    } catch {
        res.status(500).json({ success: false, error: "Unable to create lead" });
    }
});

// 2. Log Interaction (Call, Email, WhatsApp)
router.post("/leads/:id/interactions", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const leadId = req.params.id as string;
        const { type, notes } = req.body;
        const schoolId = resolveSchoolId(req, req.body?.schoolId);
        if (!schoolId) {
            res.status(400).json({ success: false, error: "School scope is required" });
            return;
        }
        const lead = await prisma.admissionEnquiry.findFirst({ where: { id: leadId, schoolId }, select: { id: true } });
        if (!lead) {
            res.status(404).json({ success: false, error: "Lead not found" });
            return;
        }
        if (typeof type !== "string" || !type.trim()) {
            res.status(400).json({ success: false, error: "Interaction type is required" });
            return;
        }
        // type: "EMAIL", "CALL", "WHATSAPP", "IN_PERSON"

        const interaction = await prisma.leadInteraction.create({
            data: {
                leadId,
                type,
                notes,
                performedBy: req.user!.id
            }
        });

        // Optionally, if the interaction implies progress, you might check if SLA is met.
        
        res.status(201).json({ success: true, data: interaction });
    } catch {
        res.status(500).json({ success: false, error: "Unable to record lead interaction" });
    }
});

// 3. Move Lead to Next Stage (Drag and Drop in UI)
router.put("/leads/:id/stage", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const leadId = req.params.id as string;
        const { pipelineStageId } = req.body;
        const schoolId = resolveSchoolId(req, req.body?.schoolId);
        if (!schoolId) {
            res.status(400).json({ success: false, error: "School scope is required" });
            return;
        }
        if (typeof pipelineStageId !== "string" || !pipelineStageId) {
            res.status(400).json({ success: false, error: "Pipeline stage is required" });
            return;
        }
        const [lead, stage] = await Promise.all([
            prisma.admissionEnquiry.findFirst({ where: { id: leadId, schoolId }, select: { id: true } }),
            prisma.pipelineStage.findFirst({ where: { id: pipelineStageId, schoolId, isActive: true }, select: { id: true } }),
        ]);
        if (!lead || !stage) {
            res.status(404).json({ success: false, error: "Lead or pipeline stage not found" });
            return;
        }

        const updatedLead = await prisma.admissionEnquiry.update({
            where: { id: leadId },
            data: { pipelineStageId }
        });

        res.json({ success: true, data: updatedLead });
    } catch {
        res.status(500).json({ success: false, error: "Unable to update lead stage" });
    }
});

// 4. Get Pipeline Dashboard
router.get("/pipeline", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const schoolId = resolveSchoolId(req, req.query.schoolId);
        if (!schoolId) {
            res.status(400).json({ success: false, error: "School scope is required" });
            return;
        }
        
        const stages = await prisma.pipelineStage.findMany({
            where: { schoolId },
            orderBy: { orderIndex: 'asc' },
            include: {
                leads: {
                    include: { interactions: true }
                }
            }
        });

        res.json({ success: true, data: stages });
    } catch {
        res.status(500).json({ success: false, error: "Unable to load CRM pipeline" });
    }
});

export default router;
