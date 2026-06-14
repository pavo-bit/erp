import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

const router = Router();

// 1. Capture New Lead (Admission Enquiry)
router.post("/leads", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { schoolId, studentName, parentName, phone, email, applyingForClass, source, campaignId } = req.body;

        // Auto-assign to the first Pipeline Stage
        const firstStage = await prisma.pipelineStage.findFirst({
            where: { schoolId },
            orderBy: { orderIndex: 'asc' }
        });

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
    } catch (error) {
        next(error);
    }
});

// 2. Log Interaction (Call, Email, WhatsApp)
router.post("/leads/:id/interactions", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const leadId = req.params.id as string;
        const { type, notes, performedBy } = req.body; 
        // type: "EMAIL", "CALL", "WHATSAPP", "IN_PERSON"

        const interaction = await prisma.leadInteraction.create({
            data: {
                leadId,
                type,
                notes,
                performedBy
            }
        });

        // Optionally, if the interaction implies progress, you might check if SLA is met.
        
        res.status(201).json({ success: true, data: interaction });
    } catch(error) {
        next(error);
    }
});

// 3. Move Lead to Next Stage (Drag and Drop in UI)
router.put("/leads/:id/stage", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const leadId = req.params.id as string;
        const { pipelineStageId } = req.body;

        const updatedLead = await prisma.admissionEnquiry.update({
            where: { id: leadId },
            data: { pipelineStageId }
        });

        res.json({ success: true, data: updatedLead });
    } catch (error) {
        next(error);
    }
});

// 4. Get Pipeline Dashboard
router.get("/pipeline", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const schoolId = req.query.schoolId as string;
        
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
    } catch(error) {
        next(error);
    }
});

export default router;
