import { Router, Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma";
import { DataRetentionService } from "../../services/DataRetentionService";

const router = Router();

// --- DATA RETENTION POLICIES ---

router.post("/retention-policies", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { schoolId, entityName, retentionDays, action } = req.body;

        const policy = await prisma.dataRetentionPolicy.create({
            data: {
                schoolId,
                entityName,
                retentionDays,
                action
            }
        });

        res.status(201).json({ success: true, data: policy });
    } catch (error) {
        next(error);
    }
});

router.get("/retention-policies", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const schoolId = req.query.schoolId as string;
        const policies = await prisma.dataRetentionPolicy.findMany({
            where: { schoolId }
        });
        res.json({ success: true, data: policies });
    } catch (error) {
        next(error);
    }
});

router.post("/retention-policies/execute", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Expose a manual trigger for the retention engine.
        // Usually, this runs automatically via a background cron job.
        await DataRetentionService.executePolicies();
        res.json({ success: true, message: "Retention Engine executed successfully." });
    } catch (error) {
        next(error);
    }
});

// --- CUSTOM WORKFLOWS ---

router.post("/workflows", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { schoolId, name, triggerEntity, triggerCondition, steps } = req.body;
        // steps: Array of { orderIndex, actionType, actionPayload }

        const workflow = await prisma.customWorkflow.create({
            data: {
                schoolId,
                name,
                triggerEntity,
                triggerCondition: JSON.stringify(triggerCondition),
                steps: {
                    create: steps.map((s: any) => ({
                        orderIndex: s.orderIndex,
                        actionType: s.actionType,
                        actionPayload: JSON.stringify(s.actionPayload)
                    }))
                }
            },
            include: { steps: true }
        });

        res.status(201).json({ success: true, data: workflow });
    } catch (error) {
        next(error);
    }
});

export default router;
