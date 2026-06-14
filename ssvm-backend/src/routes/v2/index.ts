import { Router } from "express";
import ledgerRoutes from "./ledger";

const router = Router();

// V2 Enterprise APIs
router.use("/ledger", ledgerRoutes);

// More V2 routes will be mounted here as they are developed:
// router.use("/event-store", eventStoreRoutes);
// router.use("/workflow", workflowRoutes);
// router.use("/policy", policyRoutes);

export default router;
