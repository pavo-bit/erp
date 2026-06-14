import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireAdmin, hashPassword } from "../middleware/auth";
import { parsePaginationParams, paginatedQuery } from "../lib/paginate";

const router = Router();

// GET /api/admissions — Admin: list applications
router.get("/", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
    const { status } = req.query;
    const paginationParams = parsePaginationParams(req.query, ['appliedAt', 'applicantName']);

    const where: Record<string, unknown> = { schoolId };
    if (status) where.status = status;

    const result = await paginatedQuery(
      prisma.admission,
      where,
      undefined,
      paginationParams
    );
    res.json(result);
  } catch (e) {
    logger.error({ err: e }, "List admissions error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/admissions/apply — Public application
router.post("/apply", async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId, applicantName, applyingForClass, dob, gender, parentName, parentPhone, parentEmail, address, previousSchool } = req.body;

    if (!schoolId || !applicantName || !applyingForClass || !parentName || !parentPhone) {
      res.status(400).json({ success: false, error: "Required fields: schoolId, applicantName, applyingForClass, parentName, parentPhone" });
      return;
    }

    const admission = await prisma.admission.create({
      data: {
        schoolId,
        applicantName,
        applyingForClass,
        dob: dob ? new Date(dob) : null,
        gender,
        parentName,
        parentPhone,
        parentEmail,
        address,
        previousSchool,
        status: "PENDING",
      },
    });

    logger.info({ admissionId: admission.id }, "New admission application");
    res.status(201).json({ success: true, data: admission, message: "Application submitted successfully!" });
  } catch (e) {
    logger.error({ err: e }, "Apply admission error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/admissions/:id/review — Admin: approve/reject
router.put("/:id/review", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { status, remarks } = req.body;

    if (!["UNDER_REVIEW", "APPROVED", "REJECTED"].includes(status)) {
      res.status(400).json({ success: false, error: "Invalid status" }); return;
    }

    const admission = await prisma.admission.update({
      where: { id: req.params.id as string },
      data: { status, remarks, reviewedById: req.user!.id },
    });
    res.json({ success: true, data: admission });
  } catch (e) {
    logger.error({ err: e }, "Review admission error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/admissions/:id/enroll — Convert approved admission to student
router.post("/:id/enroll", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const admission = await prisma.admission.findUnique({ where: { id: req.params.id as string } });
    if (!admission) { res.status(404).json({ success: false, error: "Admission not found" }); return; }
    if (admission.status !== "APPROVED") {
      res.status(400).json({ success: false, error: "Only approved admissions can be enrolled" }); return;
    }

    const { rollNo, sectionId, admissionNo, password } = req.body;
    if (!rollNo) {
      res.status(400).json({ success: false, error: "Roll number is required" }); return;
    }

    const guardian = await prisma.guardian.create({
      data: { schoolId: admission.schoolId, primaryName: admission.parentName, primaryPhone: admission.parentPhone, primaryEmail: admission.parentEmail },
    });

    const finalAdmissionNo = admissionNo || `ADM${Math.floor(100000 + Math.random() * 900000)}`;
    const plainPassword = password || `SSVM@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await hashPassword(plainPassword);

    const student = await prisma.student.create({
      data: {
        schoolId: admission.schoolId,
        name: admission.applicantName,
        rollNo,
        admissionNo: finalAdmissionNo,
        password: hashedPassword,
        sectionId: sectionId || null,
        dob: admission.dob,
        gender: admission.gender,
        guardianId: guardian.id,
        address: admission.address,
      },
    });

    await prisma.admission.update({
      where: { id: req.params.id as string },
      data: { status: "ENROLLED" },
    });

    logger.info({ studentId: student.id, admissionId: admission.id }, "Student enrolled from admission");
    res.status(201).json({ success: true, data: student, message: "Student enrolled successfully" });
  } catch (e) {
    logger.error({ err: e }, "Enroll error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/admissions/:id
router.delete("/:id", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.admission.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, data: { message: "Admission deleted" } });
  } catch (e) {
    logger.error({ err: e }, "Delete admission error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
