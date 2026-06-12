import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireSuperAdmin } from "../middleware/auth";

const router = Router();

// GET /api/schools — Super Admin: list all schools
router.get("/", authenticate, requireSuperAdmin(), async (_req: AuthRequest, res: Response) => {
  try {
    const schools = await prisma.school.findMany({
      include: {
        subscription: true,
        branches: true,
        _count: { select: { students: true, teachers: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: schools });
  } catch (e) {
    logger.error({ err: e }, "List schools error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/schools/:id — Get school details
router.get("/:id", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.params.id as string },
      include: {
        subscription: true,
        branches: true,
        _count: { select: { students: true, teachers: true, invoices: true, exams: true, admissions: true } },
      },
    });
    if (!school) { res.status(404).json({ success: false, error: "School not found" }); return; }
    res.json({ success: true, data: school });
  } catch (e) {
    logger.error({ err: e }, "Get school error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/schools — Create new school
router.post("/", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, address, city, state, phone, email, website } = req.body;
    if (!name || !code) {
      res.status(400).json({ success: false, error: "Name and code are required" }); return;
    }
    const existing = await prisma.school.findUnique({ where: { code } });
    if (existing) { res.status(409).json({ success: false, error: "School code already exists" }); return; }

    const school = await prisma.school.create({
      data: { name, code, address, city, state, phone, email, website },
    });
    logger.info({ schoolId: school.id }, "School created");
    res.status(201).json({ success: true, data: school });
  } catch (e) {
    logger.error({ err: e }, "Create school error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/schools/:id/setup — Onboarding wizard for new school
router.post("/:id/setup", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.params.id as string;
    const { academicSession, classes, feeCategories } = req.body;

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) { res.status(404).json({ success: false, error: "School not found" }); return; }
    if (school.onboardingDone) { res.status(400).json({ success: false, error: "School already setup" }); return; }

    await prisma.$transaction(async (tx) => {
      // 1. Create Academic Session
      const session = await tx.academicSession.create({
        data: {
          schoolId,
          name: academicSession.name,
          startDate: new Date(academicSession.startDate),
          endDate: new Date(academicSession.endDate),
          isCurrent: true,
        }
      });

      // 2. Create Classes & Sections
      if (classes && Array.isArray(classes)) {
        for (let i = 0; i < classes.length; i++) {
          const cls = classes[i];
          await tx.class.create({
            data: {
              schoolId,
              sessionId: session.id,
              name: cls.name,
              sortOrder: i,
              sections: {
                create: (cls.sections || ["A"]).map((sec: string) => ({ name: sec }))
              }
            }
          });
        }
      }

      // 3. Create Fee Categories
      if (feeCategories && Array.isArray(feeCategories)) {
        for (const cat of feeCategories) {
          await tx.feeCategory.create({
            data: { schoolId, name: cat }
          });
        }
      }

      // 4. Mark Onboarding Done
      await tx.school.update({
        where: { id: schoolId },
        data: { onboardingDone: true }
      });
    });

    res.json({ success: true, message: "School setup completed successfully" });
  } catch (e) {
    logger.error({ err: e }, "School setup error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/schools/:id — Update school
router.put("/:id", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, city, state, phone, email, website, isActive } = req.body;
    const school = await prisma.school.update({
      where: { id: req.params.id as string },
      data: { name, address, city, state, phone, email, website, isActive },
    });
    res.json({ success: true, data: school });
  } catch (e) {
    logger.error({ err: e }, "Update school error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/schools/:id — Deactivate school
router.delete("/:id", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.school.update({
      where: { id: req.params.id as string },
      data: { isActive: false },
    });
    res.json({ success: true, data: { message: "School deactivated" } });
  } catch (e) {
    logger.error({ err: e }, "Delete school error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/schools/:id/stats — School analytics
router.get("/:id/stats", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.params.id as string;
    const [studentCount, teacherCount, feeStats, admissionCount] = await Promise.all([
      prisma.student.count({ where: { schoolId, isActive: true } }),
      prisma.teacher.count({ where: { schoolId, isActive: true } }),
      prisma.invoice.groupBy({ by: ["status"], where: { schoolId }, _sum: { amount: true, amountPaid: true }, _count: true }),
      prisma.admission.count({ where: { schoolId, status: "PENDING" } }),
    ]);

    const totalCollected = feeStats.reduce((s, f) => s + (f._sum.amountPaid || 0), 0);
    const totalPending = feeStats.filter(f => f.status !== "PAID").reduce((s, f) => s + ((f._sum.amount || 0) - (f._sum.amountPaid || 0)), 0);

    res.json({
      success: true,
      data: { studentCount, teacherCount, totalCollected, totalPending, pendingAdmissions: admissionCount },
    });
  } catch (e) {
    logger.error({ err: e }, "School stats error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
