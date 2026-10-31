import { Router, Response, NextFunction } from "express";
import prisma from "../../lib/prisma";
import { DataRetentionService } from "../../services/DataRetentionService";
import { AuthRequest, authenticate, requireRole } from "../../middleware/auth";

const router = Router();
const RETENTION_ENTITIES = new Set(["VisitorLog", "AuditLog"]);

interface WorkflowStepInput {
    orderIndex: number;
    actionType: string;
    actionPayload: unknown;
}

// --- DATA RETENTION POLICIES ---

const governanceAdmin = [authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN")];

router.post("/retention-policies", ...governanceAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { entityName, retentionDays, action } = req.body;
        const schoolId = req.user?.role === "SUPER_ADMIN" ? req.body.schoolId : req.user?.schoolId;
        if (!schoolId || typeof entityName !== "string" || !RETENTION_ENTITIES.has(entityName) || !Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650 || !["PURGE", "ARCHIVE"].includes(action)) {
            res.status(400).json({ success: false, error: "Invalid retention policy" });
            return;
        }

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

router.get("/retention-policies", ...governanceAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const schoolId = req.user?.role === "SUPER_ADMIN" ? req.query.schoolId as string : req.user?.schoolId;
        if (!schoolId) { res.status(400).json({ success: false, error: "School scope is required" }); return; }
        const policies = await prisma.dataRetentionPolicy.findMany({
            where: { schoolId }
        });
        res.json({ success: true, data: policies });
    } catch (error) {
        next(error);
    }
});

router.post("/retention-policies/execute", authenticate, requireRole("SUPER_ADMIN"), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { schoolId, dryRun, global } = req.body || {};
        if ((dryRun !== undefined && typeof dryRun !== "boolean") || (global !== undefined && typeof global !== "boolean") || (schoolId !== undefined && (typeof schoolId !== "string" || !schoolId.trim()))) {
            res.status(400).json({ success: false, error: "Invalid retention execution options" });
            return;
        }
        if (global === true && schoolId) {
            res.status(400).json({ success: false, error: "Choose one school or explicitly request a global run" });
            return;
        }
        if (global !== true && !schoolId) {
            res.status(400).json({ success: false, error: "Provide a schoolId or set global=true" });
            return;
        }
        const results = await DataRetentionService.executePolicies({
            schoolId,
            dryRun: dryRun !== false,
            operatorId: req.user!.id,
        });
        const failedCount = results.filter(result => result.status === "FAILED").length;
        res.status(failedCount ? 207 : 200).json({
            success: failedCount === 0,
            mode: dryRun === false ? "EXECUTE" : "PREVIEW",
            data: results,
        });
    } catch (error) {
        next(error);
    }
});

// --- CUSTOM WORKFLOWS ---

router.post("/workflows", ...governanceAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, triggerEntity, triggerCondition } = req.body;
        const schoolId = req.user?.role === "SUPER_ADMIN" ? req.body.schoolId : req.user?.schoolId;
        const steps = Array.isArray(req.body.steps) ? req.body.steps as WorkflowStepInput[] : null;
        if (!schoolId || typeof name !== "string" || !name.trim() || !steps || steps.length > 50 || steps.some(step => !step || !Number.isInteger(step.orderIndex) || typeof step.actionType !== "string" || !step.actionType.trim())) {
            res.status(400).json({ success: false, error: "Invalid workflow" });
            return;
        }
        // steps: Array of { orderIndex, actionType, actionPayload }

        const workflow = await prisma.customWorkflow.create({
            data: {
                schoolId,
                name,
                triggerEntity,
                triggerCondition: JSON.stringify(triggerCondition),
                steps: {
                    create: steps.map((s) => ({
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
