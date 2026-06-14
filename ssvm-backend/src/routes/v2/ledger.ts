import { Router, Response } from "express";
import { AuthRequest, authenticate, requireRole } from "../../middleware/auth";
import { LedgerService } from "../../services/ledger.service";
import logger from "../../lib/logger";

const router = Router();

// GET /api/v2/ledger/hash-chain-verification
// Verify the cryptographic integrity of the entire ledger chain
router.get("/hash-chain-verification", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) { res.status(400).json({ success: false, error: "School ID missing" }); return; }

    const verification = await LedgerService.verifyHashChain(schoolId);

    if (verification.isValid) {
      res.json({
        success: true,
        message: "Ledger integrity confirmed. Hash chain is valid and unbroken.",
        data: verification
      });
    } else {
      res.status(409).json({
        success: false,
        message: `CRITICAL INTEGRITY FAILURE: Ledger hash chain broken at transaction ${verification.brokenAt}`,
        data: verification
      });
    }
  } catch(e) {
    logger.error({ err: e }, "Ledger hash chain verification error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
