import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest, authenticate, requireRole, requireAcademicAdmin, hashPassword } from "../middleware/auth";

import { parsePaginationParams, paginatedQuery } from "../lib/paginate";

const router = Router();

// GET /api/students/me — STUDENT role self-profile
router.get('/me', authenticate, requireRole('STUDENT'), async (req: AuthRequest, res: Response) => {
  try {
    const studentId = (req.user as any).studentId;
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID not found in token' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        sectionRef: {
          include: {
            class: {
              include: { session: true }
            }
          }
        },
        guardian: true,
        school: { select: { id: true, name: true, code: true } }
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student record not found' });
    }

    res.json({ success: true, data: student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/students
router.post("/", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { name, rollNo, class: className, section, session, guardianName, guardianPhone } = req.body;
    
    // Auto-generate dummy admission No and password
    const admissionNo = `ADM${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedPassword = await hashPassword(`SSVM@${Math.floor(1000 + Math.random() * 9000)}`);

    const schoolId = req.user!.schoolId || (await prisma.school.findFirst())?.id;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: "No school found to associate with" });
    }

    const clsName = className || "Class 1";
    const secName = section || "A";

    // Find or create class/section
    let sectionRec = await prisma.section.findFirst({
      where: { name: secName, class: { name: clsName, schoolId } },
      include: { class: true }
    });

    if (!sectionRec) {
      let classRec = await prisma.class.findFirst({ where: { name: clsName, schoolId } });
      if (!classRec) {
        // Find session
        let sessionRec = await prisma.academicSession.findFirst({ where: { name: session || "2025-26", schoolId } });
        if (!sessionRec) {
          sessionRec = await prisma.academicSession.create({
            data: { schoolId, name: session || "2025-26", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31") }
          });
        }
        classRec = await prisma.class.create({ data: { schoolId, name: clsName, sessionId: sessionRec.id } });
      }
      sectionRec = await prisma.section.create({ data: { classId: classRec.id, name: secName }, include: { class: true } });
    }

    let guardian = null;
    if (guardianName || guardianPhone) {
      guardian = await prisma.guardian.create({
        data: { schoolId, primaryName: guardianName || "Unknown", primaryPhone: guardianPhone || "0000000000" }
      });
    }

    const student = await prisma.student.create({
      data: {
        schoolId,
        name,
        rollNo,
        admissionNo,
        password: hashedPassword,
        sectionId: sectionRec!.id,
        guardianId: guardian?.id
      }
    });

    res.status(201).json({ success: true, data: student, message: "Student created successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

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
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { 
        id: req.params.id as string,
        ...(req.user!.role !== "SUPER_ADMIN" ? { schoolId: req.user!.schoolId! } : {})
      },
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
router.put("/:id", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
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
      where: { 
        id: req.params.id as string,
        ...(req.user!.role !== "SUPER_ADMIN" ? { schoolId: req.user!.schoolId! } : {})
      },
      data: dataToUpdate,
      include: { guardian: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    res.json({ success: true, data: student });
  } catch (e: any) { 
    if (e.code === 'P2002') {
      res.status(400).json({ success: false, error: "Admission number already exists" });
      return;
    }
    if (e.code === 'P2025') {
      res.status(404).json({ success: false, error: "Student not found" });
      return;
    }
    console.error(e); res.status(500).json({ success: false, error: "Server error" }); 
  }
});

export default router;
