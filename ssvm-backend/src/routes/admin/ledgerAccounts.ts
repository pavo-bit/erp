import { Router, Response } from "express";
import { AuthRequest, authenticate, requireRole } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import logger from "../../lib/logger";

const router = Router();

const requireFinanceRole = requireRole("SUPER_ADMIN", "FINANCE_ADMIN");

// GET /api/v1/admin/ledger/accounts
router.get("/", authenticate, requireFinanceRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const accounts = await prisma.ledgerAccount.findMany({
      where: { schoolId },
      orderBy: [{ category: "asc" }, { code: "asc" }],
    });
    res.json({ success: true, accounts });
  } catch (error) {
    logger.error({ error }, "Error fetching ledger accounts");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/admin/ledger/accounts
router.post("/", authenticate, requireFinanceRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { code, name, category, type, parentAccountId } = req.body;

    if (!code || !name || !category || !type) {
      res.status(400).json({ success: false, error: "Code, name, category, and type are required" });
      return;
    }

    const account = await prisma.ledgerAccount.create({
      data: {
        schoolId,
        code,
        name,
        category,
        type,
        parentAccountId,
      },
    });

    res.status(201).json({ success: true, account });
  } catch (error: any) {
    logger.error({ error }, "Error creating ledger account");
    if (error.code === "P2002") {
      res.status(400).json({ success: false, error: "Account code already exists" });
      return;
    }
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/v1/admin/ledger/accounts/:id
router.put("/:id", authenticate, requireFinanceRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const id = req.params.id as string;
    const { name, category, parentAccountId } = req.body;

    const account = await prisma.ledgerAccount.findFirst({
      where: { id, schoolId },
    });

    if (!account) {
      res.status(404).json({ success: false, error: "Account not found" });
      return;
    }

    const updated = await prisma.ledgerAccount.update({
      where: { id },
      data: {
        name,
        category,
        type: req.body.type,
        parentAccountId,
      },
    });

    res.json({ success: true, account: updated });
  } catch (error) {
    logger.error({ error }, "Error updating ledger account");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
