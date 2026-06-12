import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireRole, requireSuperAdmin } from "../middleware/auth";

const router = Router();

// ==========================================
// SUPER ADMIN: PLAN MANAGEMENT
// ==========================================

// GET /api/subscriptions/plans
router.get("/plans", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const plans = await prisma.subscriptionPlanConfig.findMany({
      orderBy: { fixedPrice: "asc" }
    });
    res.json({ success: true, data: plans });
  } catch (e) {
    logger.error({ err: e }, "List plans error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/subscriptions/stats
// SUPER ADMIN DASHBOARD WIDGETS
router.get("/stats", authenticate, requireSuperAdmin(), async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const [activeSchools, expiredSchools, upcomingRenewals, recentPayments] = await Promise.all([
      prisma.subscription.count({ where: { status: "ACTIVE", endDate: { gt: now } } }),
      prisma.subscription.count({ where: { status: "EXPIRED" } }),
      prisma.subscription.count({ where: { status: "ACTIVE", endDate: { lte: thirtyDaysFromNow, gt: now } } }),
      prisma.subscriptionPayment.aggregate({ _sum: { amountPaid: true }, where: { paymentDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }) // Total payments this month
    ]);

    res.json({
      success: true,
      data: {
        activeSchools,
        expiredSchools,
        upcomingRenewals,
        recentPayments: recentPayments._sum.amountPaid || 0
      }
    });
  } catch (e) {
    logger.error({ err: e }, "Subscription stats error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/subscriptions/plans
router.post("/plans", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, fixedPrice, billingCycle, features } = req.body;
    const plan = await prisma.subscriptionPlanConfig.create({
      data: { name, description, fixedPrice, billingCycle, features: JSON.stringify(features || []) }
    });
    res.status(201).json({ success: true, data: plan });
  } catch (e) {
    logger.error({ err: e }, "Create plan error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/subscriptions/plans/:id
router.put("/plans/:id", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, fixedPrice, billingCycle, features, isActive } = req.body;
    const plan = await prisma.subscriptionPlanConfig.update({
      where: { id: req.params.id as string },
      data: { name, description, fixedPrice, billingCycle, features: features ? JSON.stringify(features) : undefined, isActive }
    });
    res.json({ success: true, data: plan });
  } catch (e) {
    logger.error({ err: e }, "Update plan error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/subscriptions/plans/:id
router.delete("/plans/:id", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.subscriptionPlanConfig.update({
      where: { id: req.params.id as string },
      data: { isActive: false }
    });
    res.json({ success: true, message: "Plan disabled" });
  } catch (e) {
    logger.error({ err: e }, "Delete plan error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ==========================================
// SUPER ADMIN: SCHOOL SUBSCRIPTION MANAGEMENT
// ==========================================

// POST /api/subscriptions/assign
router.post("/assign", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId, planId, amount, startDate, endDate } = req.body;
    
    // Check if subscription exists
    const existing = await prisma.subscription.findUnique({ where: { schoolId } });
    if (existing) {
      const updated = await prisma.subscription.update({
        where: { schoolId },
        data: { planId, amount, startDate: new Date(startDate), endDate: new Date(endDate), status: "ACTIVE" }
      });
      res.json({ success: true, data: updated });
      return;
    }

    const sub = await prisma.subscription.create({
      data: { schoolId, planId, amount, startDate: new Date(startDate), endDate: new Date(endDate), status: "ACTIVE" }
    });
    res.status(201).json({ success: true, data: sub });
  } catch (e) {
    logger.error({ err: e }, "Assign subscription error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/subscriptions/:id/renew
router.put("/:id/renew", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { endDate } = req.body;
    const sub = await prisma.subscription.update({
      where: { id: req.params.id as string },
      data: { endDate: new Date(endDate), status: "ACTIVE" }
    });
    res.json({ success: true, data: sub });
  } catch (e) {
    logger.error({ err: e }, "Renew subscription error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/subscriptions/:id/suspend
router.put("/:id/suspend", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const sub = await prisma.subscription.update({
      where: { id: req.params.id as string },
      data: { status: "SUSPENDED" }
    });
    res.json({ success: true, data: sub });
  } catch (e) {
    logger.error({ err: e }, "Suspend subscription error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/subscriptions/sync-expiries
router.post("/sync-expiries", authenticate, requireSuperAdmin(), async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const { count } = await prisma.subscription.updateMany({
      where: { endDate: { lt: now }, status: "ACTIVE" },
      data: { status: "EXPIRED" }
    });
    res.json({ success: true, message: `Synced expiries. ${count} subscriptions expired.` });
  } catch (e) {
    logger.error({ err: e }, "Sync expiries error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ==========================================
// SUPER ADMIN: PAYMENTS
// ==========================================

// GET /api/subscriptions/payments
router.get("/payments", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId } = req.query as Record<string, string>;
    const where = schoolId ? { schoolId } : {};
    
    const payments = await prisma.subscriptionPayment.findMany({
      where,
      include: { school: { select: { name: true } }, subscription: { include: { planConfig: { select: { name: true } } } } },
      orderBy: { paymentDate: "desc" }
    });
    res.json({ success: true, data: payments });
  } catch (e) {
    logger.error({ err: e }, "Get payments error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/subscriptions/payments
router.post("/payments", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId, subscriptionId, amountPaid, paymentMethod, transactionRef, paymentDate, remarks } = req.body;
    
    const payment = await prisma.subscriptionPayment.create({
      data: {
        schoolId,
        subscriptionId,
        amountPaid: parseFloat(amountPaid),
        paymentMethod,
        transactionRef,
        paymentDate: paymentDate ? new Date(paymentDate) : undefined,
        remarks
      }
    });
    res.status(201).json({ success: true, data: payment });
  } catch (e) {
    logger.error({ err: e }, "Record payment error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ==========================================
// SCHOOL ADMIN VIEW
// ==========================================

// GET /api/subscriptions/my
router.get("/my", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) {
      res.status(400).json({ success: false, error: "No school ID associated with user" });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { schoolId },
      include: { planConfig: true, payments: { orderBy: { paymentDate: "desc" } } }
    });

    if (!subscription) {
      res.status(404).json({ success: false, error: "No subscription found" });
      return;
    }

    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      data: {
        ...subscription,
        daysRemaining
      }
    });
  } catch (e) {
    logger.error({ err: e }, "Get my subscription error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
