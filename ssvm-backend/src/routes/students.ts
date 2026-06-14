import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest, authenticate, requireRole, hashPassword } from "../middleware/auth";

import { parsePaginationParams, paginatedQuery } from "../lib/paginate";

const router = Router();

// GET /api/students
router.get("/", authenticate, requireRole("ADMIN", "PARENT", "ERP_ADMIN", "SUPER_ADMIN", "TEACHER"), async (req: AuthRequest, res: Response) => {
  try {
    const { classId, sectionId, search } = req.query as Record<string, string | undefined>;
    const paginationParams = parsePaginationParams(req.query, ['name', 'rollNo', 'admissionNo', 'createdAt']);

    const where: any = {};
    if (req.user!.role !== "SUPER_ADMIN") where.schoolId = req.user!.schoolId;
    if (req.user!.branchId) where.branchId = req.user!.branchId;
    
    if (classId) {
      // Find sections for this class
      const sections = await prisma.section.findMany({ where: { classId } });
      where.sectionId = { in: sections.map(s => s.id) };
    }
    if (sectionId) where.sectionId = sectionId;
    if (search) where.OR = [
      { name: { contains: search, mode: "insensitive" } }, 
      { rollNo: { contains: search, mode: "insensitive" } }
    ];
    
    if (req.user!.role === "PARENT") {
      const guardian = await prisma.guardian.findFirst({ where: { userId: req.user!.id } });
      if (guardian) where.guardianId = guardian.id;
    }

    const result = await paginatedQuery(
      prisma.student,
      where,
      { guardian: { include: { user: { select: { name: true, phone: true } } } }, sectionRef: { include: { class: true } } },
      paginationParams
    );

    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

// GET /api/students/:id
router.get("/:id", authenticate, async (req, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id as string },
      include: { 
        guardian: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
        sectionRef: { include: { class: true } }
      },
    });
    if (!student) { res.status(404).json({ success: false, error: "Not found" }); return; }
    res.json({ success: true, data: student });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

// PUT /api/students/:id
router.put("/:id", authenticate, requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body;
    let dataToUpdate: any = { 
      ...(b.sectionId && { sectionId: b.sectionId }), 
      ...(b.rollNo && { rollNo: b.rollNo }), 
      ...(b.guardianId !== undefined && { guardianId: b.guardianId }),
      ...(b.admissionNo && { admissionNo: b.admissionNo })
    };

    if (b.password) {
      dataToUpdate.password = await hashPassword(b.password);
    }

    const student = await prisma.student.update({
      where: { id: req.params.id as string },
      data: dataToUpdate,
      include: { guardian: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    res.json({ success: true, data: student });
  } catch (e: any) { 
    if (e.code === 'P2002') {
      res.status(400).json({ success: false, error: "Admission number already exists" });
      return;
    }
    console.error(e); res.status(500).json({ success: false, error: "Server error" }); 
  }
});

export default router;
