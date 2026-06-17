import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireAcademicAdmin, requireTeacherOrAdmin, requireSchoolAccess, hashPassword } from "../middleware/auth";
import { parsePaginationParams, paginatedQuery } from "../lib/paginate";

const router = Router();

// GET /api/teachers — List teachers (scoped to school)
router.get("/", authenticate, requireTeacherOrAdmin(), requireSchoolAccess(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
    if (!schoolId) { res.status(400).json({ success: false, error: "School ID required" }); return; }

    const paginationParams = parsePaginationParams(req.query, ['joiningDate', 'experience', 'createdAt']);

    const where: any = { schoolId, isActive: true };
    if (req.user!.branchId) where.branchId = req.user!.branchId;

    const result = await paginatedQuery(
      prisma.teacher,
      where,
      { user: { select: { id: true, name: true, email: true, phone: true, avatar: true, isActive: true } } },
      paginationParams
    );

    res.json(result);
  } catch (e) {
    logger.error({ err: e }, "List teachers error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/teachers/:id — Get teacher details
router.get("/:id", authenticate, requireTeacherOrAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: req.params.id as string },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        salaries: { orderBy: { year: "desc" }, take: 12 },
        leaveRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!teacher) { res.status(404).json({ success: false, error: "Teacher not found" }); return; }
    res.json({ success: true, data: teacher });
  } catch (e) {
    logger.error({ err: e }, "Get teacher error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/teachers — Create teacher with user account
router.post("/", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, password, department, designation, qualification, experience, subjects, employeeId } = req.body;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;

    if (!name || !email || !schoolId) {
      res.status(400).json({ success: false, error: "Name, email, and school are required" }); return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(409).json({ success: false, error: "Email already registered" }); return; }

    const hashed = await hashPassword(password || "teacher123");
    const user = await prisma.user.create({
      data: {
        email, passwordHash: hashed, name, role: "TEACHER", phone: phone || null, schoolId,
        teacher: {
          create: {
            schoolId, departmentId: department || null, designation, qualification, experience,
            subjects: Array.isArray(subjects) ? subjects.join(", ") : (subjects || ""), employeeId,
            joiningDate: new Date(),
          },
        },
      },
      include: { teacher: true },
    });

    const { passwordHash: _, ...safe } = user;
    logger.info({ userId: user.id, teacherId: (user as any).teacher?.id }, "Teacher created");
    res.status(201).json({ success: true, data: safe });
  } catch (e) {
    logger.error({ err: e }, "Create teacher error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/teachers/:id — Update teacher
router.put("/:id", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { department, designation, qualification, experience, subjects, isActive } = req.body;
    const teacher = await prisma.teacher.update({
      where: { id: req.params.id as string },
      data: { departmentId: department || null, designation, qualification, experience, subjects: Array.isArray(subjects) ? subjects.join(", ") : (subjects || ""), isActive },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json({ success: true, data: teacher });
  } catch (e) {
    logger.error({ err: e }, "Update teacher error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/teachers/:id — Deactivate teacher
router.delete("/:id", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { id: req.params.id as string } });
    if (!teacher) { res.status(404).json({ success: false, error: "Teacher not found" }); return; }

    await prisma.$transaction([
      prisma.teacher.update({ where: { id: req.params.id as string }, data: { isActive: false } }),
      prisma.user.update({ where: { id: teacher.userId }, data: { isActive: false } }),
    ]);
    res.json({ success: true, data: { message: "Teacher deactivated" } });
  } catch (e) {
    logger.error({ err: e }, "Delete teacher error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
