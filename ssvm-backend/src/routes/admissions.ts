import crypto from "crypto";
import { Router, Response } from "express";
import prisma, { runWithTenantDatabaseTransaction } from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireAdmissionsAdmin, hashPassword } from "../middleware/auth";
import { parsePaginationParams, paginatedQuery } from "../lib/paginate";
import { admissionsApplyLimiter } from "../middleware/rateLimiter";
import { verifyTurnstile, spamQualityValidation, PublicFormRequest } from "../middleware/turnstile";
import mailService from "../services/mail.service";

const router = Router();

// GET /api/admissions — Admin: list applications
router.get("/", authenticate, requireAdmissionsAdmin(), async (req: AuthRequest, res: Response) => {
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
router.post("/apply", admissionsApplyLimiter, verifyTurnstile, spamQualityValidation, async (req: PublicFormRequest, res: Response) => {
  try {
    // If honeypot caught a bot, silently return success without saving
    if (req.spamSuspected) {
      res.status(201).json({ success: true, message: "Application submitted successfully!" });
      return;
    }

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
router.put("/:id/review", authenticate, requireAdmissionsAdmin(), async (req: AuthRequest, res: Response) => {
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
router.post("/:id/enroll", authenticate, requireAdmissionsAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const admission = await prisma.admission.findUnique({ where: { id: req.params.id as string } });
    if (!admission) { res.status(404).json({ success: false, error: "Admission not found" }); return; }
    if (admission.status !== "APPROVED") {
      res.status(400).json({ success: false, error: "Only approved admissions can be enrolled" }); return;
    }

    const { rollNo, sectionId, admissionNo } = req.body;
    if (!rollNo) {
      res.status(400).json({ success: false, error: "Roll number is required" }); return;
    }

    const currentYear = new Date().getFullYear();

    const result = await runWithTenantDatabaseTransaction(admission.schoolId, async (tx: any) => {
      // 1. Monotonic admission number from SequenceCounter
      let finalAdmissionNo = admissionNo;
      if (!finalAdmissionNo) {
        const counterKey = `ADMISSION_${currentYear}`;
        const counter = await tx.sequenceCounter.upsert({
          where: { schoolId_key: { schoolId: admission.schoolId, key: counterKey } },
          update: { currentValue: { increment: 1 } },
          create: { schoolId: admission.schoolId, key: counterKey, currentValue: 1 },
        });
        finalAdmissionNo = `ADM-${currentYear}-${String(counter.currentValue).padStart(4, "0")}`;
      }

      // 2. Guardian creation
      const guardian = await tx.guardian.create({
        data: {
          schoolId: admission.schoolId,
          primaryName: admission.parentName,
          primaryPhone: admission.parentPhone,
          primaryEmail: admission.parentEmail,
        },
      });

      // 3. User account with unusable password and password-setup token
      const cleanAdNo = finalAdmissionNo.toLowerCase().replace(/[^a-z0-9]/g, "");
      const studentEmail = admission.parentEmail || `${cleanAdNo}_${admission.schoolId.slice(-6)}@student.ssvm`;
      const unusableSecret = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await hashPassword(unusableSecret);

      const user = await tx.user.create({
        data: {
          schoolId: admission.schoolId,
          email: studentEmail,
          name: admission.applicantName,
          passwordHash: hashedPassword,
          role: "STUDENT",
          mustChangePassword: true,
          isActive: true,
        },
      });

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await tx.passwordSetupToken.create({
        data: {
          schoolId: admission.schoolId,
          userId: user.id,
          tokenHash,
          expiresAt,
          createdBy: req.user!.id,
        },
      });

      const setupLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/set-password?token=${rawToken}`;
      try {
        await mailService.sendPasswordSetupEmail(studentEmail, setupLink);
      } catch (mailErr) {
        logger.warn({ mailErr, studentEmail }, "Failed to send student password setup email");
      }

      // 4. Student record
      const student = await tx.student.create({
        data: {
          schoolId: admission.schoolId,
          userId: user.id,
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
        select: {
          id: true,
          schoolId: true,
          name: true,
          rollNo: true,
          admissionNo: true,
          sectionId: true,
          dob: true,
          gender: true,
          guardianId: true,
          address: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // 5. Update admission status
      await tx.admission.update({
        where: { id: admission.id },
        data: { status: "ENROLLED" },
      });

      return student;
    });

    logger.info({ studentId: result.id, admissionId: admission.id }, "Student enrolled from admission");
    res.status(201).json({ success: true, data: result, message: "Student enrolled successfully" });
  } catch (e: any) {
    logger.error({ err: e }, "Enroll error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/admissions/:id
router.delete("/:id", authenticate, requireAdmissionsAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.admission.update({ 
      where: { id: req.params.id as string },
      data: { deletedAt: new Date(), deletedById: req.user!.id }
    });
    res.json({ success: true, data: { message: "Admission deleted" } });
  } catch (e) {
    logger.error({ err: e }, "Delete admission error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
