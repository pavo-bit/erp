
import { Router, Response } from "express";
import prisma, { runWithTenantDatabaseTransaction } from "../lib/prisma";
import { AuthRequest, authenticate, requireRole, requireAcademicAdmin, hashPassword } from "../middleware/auth";
import { parsePaginationParams, paginatedQuery } from "../lib/paginate";
import logger from "../lib/logger";

const router = Router();

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: VERIFY AUTHORIZED STUDENT ACCESS & SCOPE
// ═════════════════════════════════════════════════════════════════════════════

async function verifyStudentAccess(req: AuthRequest, res: Response, studentId: string): Promise<any | null> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Not authenticated" });
    return null;
  }

  const schoolId = req.user.schoolId;
  const role = req.user.role;

  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
      ...(role !== "SUPER_ADMIN" ? { schoolId: schoolId || "" } : {}),
      deletedAt: null,
    },
    include: {
      sectionRef: {
        include: {
          class: {
            include: { session: true },
          },
        },
      },
      guardian: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          students: {
            where: { id: { not: studentId }, deletedAt: null },
            select: {
              id: true,
              name: true,
              admissionNo: true,
              rollNo: true,
              sectionRef: { include: { class: true } },
            },
          },
        },
      },
      user: {
        select: { id: true, email: true, isActive: true, createdAt: true },
      },
      guardians: {
        include: {
          guardian: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              students: {
                where: { id: { not: studentId }, deletedAt: null },
                select: {
                  id: true,
                  name: true,
                  admissionNo: true,
                  rollNo: true,
                  sectionRef: { include: { class: true } },
                },
              },
            },
          },
        },
      },
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: {
          session: true,
          class: true,
          section: true,
          shift: true,
        },
      },
      facilityRequests: {
        orderBy: { createdAt: "desc" },
      },
      timelines: {
        orderBy: { date: "desc" },
      },
      school: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  if (!student) {
    res.status(404).json({ success: false, error: "Student not found" });
    return null;
  }

  // 1. Student self-access
  if (role === "STUDENT") {
    const tokenStudentId = (req.user as any).studentId;
    if (student.userId !== req.user.id && tokenStudentId !== student.id) {
      res.status(403).json({ success: false, error: "Forbidden: You can only access your own profile" });
      return null;
    }
  }

  // 2. Parent child-access
  if (role === "PARENT") {
    const isDirectGuardian = student.guardian?.userId === req.user.id;
    const isLinkedGuardian = (student.guardians || []).some(
      (sg: any) => sg.guardian?.userId === req.user.id
    );
    if (!isDirectGuardian && !isLinkedGuardian) {
      res.status(403).json({ success: false, error: "Forbidden: You can only access your children's profiles" });
      return null;
    }
  }

  // 3. Teacher assigned section access
  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findFirst({
      where: { schoolId: student.schoolId, userId: req.user.id },
    });
    if (teacher) {
      const assigned = await prisma.classTeacher.findMany({
        where: { teacherId: teacher.id },
        select: { sectionId: true },
      });
      if (assigned.length > 0) {
        const assignedSectionIds = assigned.map((a) => a.sectionId);
        if (student.sectionId && !assignedSectionIds.includes(student.sectionId)) {
          res.status(403).json({ success: false, error: "Forbidden: Student is not in your assigned class/section" });
          return null;
        }
      }
    }
  }

  return student;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET /api/v1/students/me — STUDENT ROLE SELF-PROFILE
// ═════════════════════════════════════════════════════════════════════════════

router.get("/me", authenticate, requireRole("STUDENT"), async (req: AuthRequest, res: Response) => {
  try {
    const studentId = (req.user as any).studentId;
    let student = null;

    if (studentId) {
      student = await prisma.student.findUnique({
        where: { id: studentId, deletedAt: null },
        include: {
          sectionRef: {
            include: {
              class: {
                include: { session: true },
              },
            },
          },
          guardian: true,
          school: { select: { id: true, name: true, code: true } },
          timelines: { orderBy: { date: "desc" } },
        },
      });
    }

    if (!student && req.user?.id) {
      student = await prisma.student.findFirst({
        where: { userId: req.user.id, deletedAt: null },
        include: {
          sectionRef: {
            include: {
              class: {
                include: { session: true },
              },
            },
          },
          guardian: true,
          school: { select: { id: true, name: true, code: true } },
          timelines: { orderBy: { date: "desc" } },
        },
      });
    }

    if (!student) {
      return res.status(404).json({ success: false, error: "Student record not found" });
    }

    res.json({ success: true, data: student });
  } catch (err) {
    logger.error({ err }, "Error fetching student self-profile");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. GET /api/v1/students — STUDENT DIRECTORY (SEARCH, FILTERS, PAGINATION)
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/",
  authenticate,
  requireRole(
    "ADMIN",
    "ERP_ADMIN",
    "SUPER_ADMIN",
    "TEACHER",
    "PARENT",
    "RECEPTIONIST",
    "ACCOUNTANT",
    "LIBRARIAN",
    "STUDENT"
  ),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        classId,
        sectionId,
        search,
        status,
        admissionType,
        gender,
        sessionId,
      } = req.query as Record<string, string | undefined>;

      const paginationParams = parsePaginationParams(req.query, ["name", "rollNo", "admissionNo", "createdAt"]);

      const where: any = {
        deletedAt: null,
      };

      if (req.user!.role !== "SUPER_ADMIN") {
        where.schoolId = req.user!.schoolId;
      }
      if (req.user!.branchId) {
        where.branchId = req.user!.branchId;
      }

      // Role-specific scope
      if (req.user!.role === "PARENT") {
        const guardian = await prisma.guardian.findFirst({
          where: { schoolId: req.user!.schoolId, userId: req.user!.id },
        });
        if (guardian) {
          where.guardianId = guardian.id;
        } else {
          where.id = "NONE";
        }
      } else if (req.user!.role === "STUDENT") {
        where.userId = req.user!.id;
      } else if (req.user!.role === "TEACHER") {
        const teacher = await prisma.teacher.findFirst({
          where: { schoolId: req.user!.schoolId, userId: req.user!.id },
        });
        if (teacher) {
          const assigned = await prisma.classTeacher.findMany({
            where: { teacherId: teacher.id },
            select: { sectionId: true },
          });
          if (assigned.length > 0 && req.query.assignedOnly === "true") {
            where.sectionId = { in: assigned.map((a) => a.sectionId) };
          }
        }
      }

      // Status Filter
      if (status === "ACTIVE") {
        where.isActive = true;
      } else if (status === "INACTIVE") {
        where.isActive = false;
      }

      // Gender Filter
      if (gender) {
        where.gender = { equals: gender, mode: "insensitive" };
      }

      // Class / Section Filter
      if (sectionId) {
        where.sectionId = sectionId;
      } else if (classId) {
        where.sectionRef = { classId };
      }

      // Academic Session Filter
      if (sessionId) {
        where.sectionRef = {
          ...(where.sectionRef || {}),
          class: {
            ...(where.sectionRef?.class || {}),
            sessionId,
          },
        };
      }

      // Admission Type Filter (derived from student timelines)
      if (admissionType) {
        const typeMap: Record<string, string> = {
          NEW: "NEW_ADMISSION",
          READMISSION: "READMISSION",
          TRANSFER: "TRANSFER_ADMISSION",
        };
        const timelineType = typeMap[admissionType.toUpperCase()] || admissionType;
        where.timelines = {
          some: {
            type: timelineType,
          },
        };
      }

      // Search Query: Student Name, Admission No, Roll No, Guardian Name, Guardian Phone
      if (search && search.trim()) {
        const term = search.trim();
        where.OR = [
          { name: { contains: term, mode: "insensitive" } },
          { admissionNo: { contains: term, mode: "insensitive" } },
          { rollNo: { contains: term, mode: "insensitive" } },
          {
            guardian: {
              is: {
                primaryName: { contains: term, mode: "insensitive" },
              },
            },
          },
          {
            guardian: {
              is: {
                primaryPhone: { contains: term },
              },
            },
          },
        ];
      }

      const include = {
        sectionRef: {
          include: {
            class: {
              include: {
                session: true,
              },
            },
          },
        },
        guardian: {
          select: {
            id: true,
            primaryName: true,
            primaryPhone: true,
            primaryEmail: true,
            primaryRelation: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
        timelines: {
          orderBy: { date: "desc" as const },
          take: 1,
          select: {
            type: true,
            title: true,
            date: true,
          },
        },
      };

      const result = await paginatedQuery(prisma.student, where, include, paginationParams);

      // Enhance output with formatted canonical attributes
      const formattedData = result.data.map((s: any) => {
        let resolvedAdmissionType = "NEW";
        const latestTimeline = s.timelines?.[0];
        if (latestTimeline?.type === "READMISSION") {
          resolvedAdmissionType = "READMISSION";
        } else if (latestTimeline?.type === "TRANSFER_ADMISSION") {
          resolvedAdmissionType = "TRANSFER";
        }

        return {
          ...s,
          admissionType: resolvedAdmissionType,
          className: s.sectionRef?.class?.name || null,
          sectionName: s.sectionRef?.name || null,
          sessionName: s.sectionRef?.class?.session?.name || null,
          guardianName: s.guardian?.primaryName || null,
          guardianPhone: s.guardian?.primaryPhone || null,
        };
      });

      res.json({
        ...result,
        data: formattedData,
      });
    } catch (e) {
      logger.error({ err: e }, "Error fetching student directory");
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// 3. POST /api/v1/students — CREATE SINGLE STUDENT (CANONICAL IDENTITY)
// ═════════════════════════════════════════════════════════════════════════════

router.post("/", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      rollNo,
      class: className,
      section,
      session,
      guardianName,
      guardianPhone,
      guardianEmail,
      guardianRelation,
      sectionId,
      dob,
      gender,
      bloodGroup,
      address,
    } = req.body;

    const schoolId = req.user!.schoolId || (await prisma.school.findFirst())?.id;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: "No school found to associate with" });
    }

    const currentYear = new Date().getFullYear();
    const admissionNo = req.body.admissionNo || `ADM-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;
    const rawPassword = req.body.password || `SSVM@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await hashPassword(rawPassword);

    let createdStudent: any = null;

    await runWithTenantDatabaseTransaction(schoolId, async (tx: any) => {
      // 1. Resolve Section & Class
      let resolvedSectionId = sectionId;
      if (!resolvedSectionId) {
        const clsName = className || "Class 1";
        const secName = section || "A";

        let sectionRec = await tx.section.findFirst({
          where: { name: secName, class: { name: clsName, schoolId } },
          include: { class: true },
        });

        if (!sectionRec) {
          let classRec = await tx.class.findFirst({ where: { name: clsName, schoolId } });
          if (!classRec) {
            let sessionRec = await tx.academicSession.findFirst({
              where: { name: session || `${currentYear}-${currentYear + 1}`, schoolId },
            });
            if (!sessionRec) {
              sessionRec = await tx.academicSession.create({
                data: {
                  schoolId,
                  name: session || `${currentYear}-${currentYear + 1}`,
                  startDate: new Date(`${currentYear}-04-01`),
                  endDate: new Date(`${currentYear + 1}-03-31`),
                },
              });
            }
            classRec = await tx.class.create({
              data: { schoolId, name: clsName, sessionId: sessionRec.id },
            });
          }
          sectionRec = await tx.section.create({
            data: { classId: classRec.id, name: secName },
            include: { class: true },
          });
        }
        resolvedSectionId = sectionRec.id;
      }

      // 2. Resolve or Create Guardian (Deduplicate by phone)
      let guardianId = req.body.guardianId || null;
      if (!guardianId && (guardianName || guardianPhone)) {
        let existingGrd = null;
        if (guardianPhone) {
          existingGrd = await tx.guardian.findFirst({
            where: { schoolId, primaryPhone: guardianPhone },
          });
        }
        if (existingGrd) {
          guardianId = existingGrd.id;
        } else {
          const newGrd = await tx.guardian.create({
            data: {
              schoolId,
              primaryName: guardianName || "Guardian",
              primaryPhone: guardianPhone || "0000000000",
              primaryEmail: guardianEmail || null,
              primaryRelation: guardianRelation || "Father",
              address: address || null,
            },
          });
          guardianId = newGrd.id;
        }
      }

      // 3. Create User Account for Student Portal
      const cleanAdNo = admissionNo.toLowerCase().replace(/[^a-z0-9]/g, "");
      const studentEmail = `${cleanAdNo}_${schoolId.slice(-6)}@student.ssvm`;

      const user = await tx.user.create({
        data: {
          email: studentEmail,
          name: name || "Student",
          passwordHash: hashedPassword,
          role: "STUDENT",
          schoolId,
          isActive: true,
        },
      });

      // 4. Create Canonical Student Record
      createdStudent = await tx.student.create({
        data: {
          schoolId,
          name: name || "Student",
          rollNo: rollNo || "1",
          admissionNo,
          password: hashedPassword,
          dob: dob ? new Date(dob) : null,
          gender: gender || "OTHER",
          bloodGroup: bloodGroup || null,
          address: address || null,
          sectionId: resolvedSectionId,
          guardianId,
          userId: user.id,
          isActive: true,
        },
        include: {
          sectionRef: { include: { class: true } },
          guardian: true,
          user: { select: { id: true, email: true } },
        },
      });

      // 5. Create Initial Timeline Event
      await tx.studentTimeline.create({
        data: {
          studentId: createdStudent.id,
          title: "Student Registered",
          type: "NEW_ADMISSION",
          description: `Canonical student profile created with Admission No ${admissionNo}.`,
        },
      });

      // 6. Record Audit Log
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: req.user!.id,
          action: "STUDENT_CREATED",
          entity: "STUDENT",
          entityId: createdStudent.id,
          details: `Student ${createdStudent.name} (Adm: ${admissionNo}) registered by ${req.user!.name || "Staff"}.`,
        },
      });
    });

    res.status(201).json({
      success: true,
      data: createdStudent,
      message: "Student created successfully",
    });
  } catch (e: any) {
    if (e.code === "P2002") {
      return res.status(400).json({ success: false, error: "Admission number or user email already exists" });
    }
    logger.error({ err: e }, "Failed to create student");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. GET /api/v1/students/:id — CANONICAL COMPLETE STUDENT PROFILE
// ═════════════════════════════════════════════════════════════════════════════

router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const student = await verifyStudentAccess(req, res, req.params.id as string);
    if (!student) return;

    // Concurrently fetch peripheral details for complete profile overview
    const [
      documents,
      admissionRecord,
      auditLogs,
      invoices,
      feeReceipts,
      advanceCredits,
      attendanceRecords,
      issuedCertificates,
      marks,
      submissions,
    ] = await Promise.all([
      prisma.document.findMany({
        where: { schoolId: student.schoolId, ownerType: "STUDENT", ownerId: student.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.admission.findFirst({
        where: { schoolId: student.schoolId, applicantName: student.name },
        include: { logs: { orderBy: { createdAt: "desc" } } },
      }),
      prisma.auditLog.findMany({
        where: { schoolId: student.schoolId, entity: "STUDENT", entityId: student.id },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      prisma.invoice.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.feeReceipt.findMany({
        where: { studentId: student.id },
        orderBy: { paidAt: "desc" },
        take: 20,
      }),
      prisma.studentAdvanceCredit.findMany({
        where: { studentId: student.id },
      }),
      prisma.attendance.findMany({
        where: { studentId: student.id },
        orderBy: { date: "desc" },
        take: 60,
      }),
      prisma.issuedCertificate.findMany({
        where: { studentId: student.id },
        orderBy: { issuedAt: "desc" },
      }),
      prisma.studentMark.findMany({
        where: { studentId: student.id },
        include: { examSubject: { include: { exam: true, subject: true } } },
        take: 30,
      }),
      prisma.assignmentSubmission.findMany({
        where: { studentId: student.id },
        include: { assignment: true },
        orderBy: { submittedAt: "desc" },
        take: 15,
      }),
    ]);

    // Attendance Summary
    const totalAttendance = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((a) => a.status === "PRESENT").length;
    const absentCount = attendanceRecords.filter((a) => a.status === "ABSENT").length;
    const lateCount = attendanceRecords.filter((a) => a.status === "LATE").length;
    const attendancePercentage =
      totalAttendance > 0 ? Math.round(((presentCount + lateCount * 0.5) / totalAttendance) * 100) : 100;

    // Financial Summary
    let totalInvoiced = 0;
    let totalPaid = 0;
    let outstandingBalance = 0;
    invoices.forEach((inv) => {
      totalInvoiced += Number(inv.amount || 0);
      totalPaid += Number((inv as any).amountPaid ?? (inv as any).paidAmount ?? 0);
      outstandingBalance += Number((inv as any).remainingAmount ?? (inv as any).balance ?? 0);
    });

    // Derive Admission Type
    let admissionType = "NEW";
    const latestTimeline = student.timelines?.[0];
    if (latestTimeline?.type === "READMISSION") {
      admissionType = "READMISSION";
    } else if (latestTimeline?.type === "TRANSFER_ADMISSION") {
      admissionType = "TRANSFER";
    }

    res.json({
      success: true,
      data: {
        ...student,
        admissionType,
        documents,
        admissionRecord,
        auditLogs,
        invoices,
        feeReceipts,
        advanceCredits,
        attendance: attendanceRecords,
        issuedCertificates,
        marks,
        submissions,
        attendanceSummary: {
          totalDays: totalAttendance,
          presentDays: presentCount,
          absentDays: absentCount,
          lateDays: lateCount,
          percentage: attendancePercentage,
        },
        feeSummary: {
          totalInvoiced,
          totalPaid,
          outstandingBalance,
        },
      },
    });
  } catch (e) {
    logger.error({ err: e }, "Failed to fetch student profile");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. GRANULAR SUB-RESOURCE PROFILE ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// 5.1 GET /api/v1/students/:id/personal — Personal Information
router.get("/:id/personal", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const student = await verifyStudentAccess(req, res, req.params.id as string);
    if (!student) return;

    res.json({
      success: true,
      data: {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        admissionNo: student.admissionNo,
        dob: student.dob,
        gender: student.gender,
        bloodGroup: student.bloodGroup,
        address: student.address,
        photo: student.photo,
        pen: student.pen,
        category: student.category,
        religion: student.religion,
        nationality: student.nationality,
        motherTongue: student.motherTongue,
        locality: student.locality,
        pincode: student.pincode,
        landmark: student.landmark,
        medicalInfo: student.medicalInfo,
        emergencyPhone: student.emergencyPhone,
        isActive: student.isActive,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
        user: student.user,
        school: student.school,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 5.2 GET /api/v1/students/:id/guardians — Parent & Guardian Information (Normalized)
router.get("/:id/guardians", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const student = await verifyStudentAccess(req, res, req.params.id as string);
    if (!student) return;

    // Resolve all siblings through any shared guardian
    const allGuardianIds = [
      ...(student.guardianId ? [student.guardianId] : []),
      ...((student.guardians || []).map((sg: any) => sg.guardianId)),
    ];
    const uniqueGuardianIds = Array.from(new Set(allGuardianIds));

    const siblings = await prisma.student.findMany({
      where: {
        schoolId: student.schoolId,
        id: { not: student.id },
        deletedAt: null,
        OR: [
          { guardianId: { in: uniqueGuardianIds } },
          { guardians: { some: { guardianId: { in: uniqueGuardianIds } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        admissionNo: true,
        rollNo: true,
        sectionRef: { include: { class: true } },
      },
    });

    res.json({
      success: true,
      data: {
        guardian: student.guardian,
        guardians: (student.guardians || []).map((sg: any) => ({
          id: sg.id,
          guardianId: sg.guardianId,
          name: sg.guardian.primaryName,
          phone: sg.guardian.primaryPhone,
          email: sg.guardian.primaryEmail,
          relationship: sg.relationship,
          isPrimary: sg.isPrimary,
          isEmergencyContact: sg.isEmergencyContact,
          address: sg.guardian.address,
        })),
        siblings,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 5.3 GET /api/v1/students/:id/academics — Academic Placement, Shift, Marks & LMS
router.get("/:id/academics", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const student = await verifyStudentAccess(req, res, req.params.id as string);
    if (!student) return;

    const [marks, submissions, classTeachers] = await Promise.all([
      prisma.studentMark.findMany({
        where: { studentId: student.id },
        include: { examSubject: { include: { exam: true, subject: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.assignmentSubmission.findMany({
        where: { studentId: student.id },
        include: { assignment: true },
        orderBy: { submittedAt: "desc" },
      }),
      student.sectionId
        ? prisma.classTeacher.findMany({
            where: { sectionId: student.sectionId },
            include: { teacher: { include: { user: { select: { name: true, email: true } } } } },
          })
        : [],
    ]);

    const activeEnrollment =
      (student.enrollments || []).find((e: any) => e.status === "ACTIVE") ||
      student.enrollments?.[0];

    res.json({
      success: true,
      data: {
        placement: {
          class: student.sectionRef?.class?.name || activeEnrollment?.class?.name || null,
          section: student.sectionRef?.name || activeEnrollment?.section?.name || null,
          session:
            student.sectionRef?.class?.session?.name ||
            activeEnrollment?.session?.name ||
            null,
          rollNo: student.rollNo,
          sectionId: student.sectionId,
          shiftName: activeEnrollment?.shift?.name || "Morning Batch",
          shiftTime: activeEnrollment?.shift
            ? `${activeEnrollment.shift.startTime} - ${activeEnrollment.shift.endTime}`
            : "07:30 - 12:30",
        },
        enrollments: student.enrollments || [],
        classTeachers,
        marks,
        submissions,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 5.4 GET /api/v1/students/:id/admission — Admission Details, Transfer & History
router.get("/:id/admission", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const student = await verifyStudentAccess(req, res, req.params.id as string);
    if (!student) return;

    const [admissionRecord, admissionDocuments] = await Promise.all([
      prisma.admission.findFirst({
        where: { schoolId: student.schoolId, applicantName: student.name },
        include: { logs: { orderBy: { createdAt: "desc" } } },
      }),
      prisma.document.findMany({
        where: {
          schoolId: student.schoolId,
          ownerType: "STUDENT",
          ownerId: student.id,
          category: { in: ["ADMISSION_FORM", "TC", "BIRTH_CERTIFICATE"] },
        },
      }),
    ]);

    let admissionType = "NEW";
    const admissionTimeline = student.timelines.find((t: any) =>
      ["NEW_ADMISSION", "READMISSION", "TRANSFER_ADMISSION"].includes(t.type)
    );
    if (admissionTimeline?.type === "READMISSION") admissionType = "READMISSION";
    if (admissionTimeline?.type === "TRANSFER_ADMISSION") admissionType = "TRANSFER";

    res.json({
      success: true,
      data: {
        admissionNo: student.admissionNo,
        admissionType,
        enrolledAt: student.createdAt,
        transferDetails: {
          previousSchool: student.previousSchool,
          previousBoard: student.previousBoard,
          previousClass: student.previousClass,
          previousSession: student.previousSession,
          previousRollNo: student.previousRollNo,
          tcNumber: student.tcNumber,
          tcDate: student.tcDate,
          tcStatus: student.tcStatus,
        },
        admissionRecord,
        admissionDocuments,
        timelineRecord: admissionTimeline,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 5.5 GET /api/v1/students/:id/facilities — Facility Requirements & Allocations
router.get("/:id/facilities", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const student = await verifyStudentAccess(req, res, req.params.id as string);
    if (!student) return;

    const [requests, transportAllocations, hostelAllocations] = await Promise.all([
      prisma.facilityRequest.findMany({
        where: { schoolId: student.schoolId, studentId: student.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.transportAllocation.findMany({
        where: { studentId: student.id, status: "ACTIVE" },
        include: {
          stop: { include: { route: true } },
        },
      }),
      prisma.hostelAllocation.findMany({
        where: { studentId: student.id, status: "ACTIVE" },
        include: {
          room: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        requests,
        activeAllocations: {
          transport: transportAllocations,
          hostel: hostelAllocations,
        },
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 5.5 GET /api/v1/students/:id/fees — Fees & Financial Ledger
router.get("/:id/fees", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const student = await verifyStudentAccess(req, res, req.params.id as string);
    if (!student) return;

    const [invoices, receipts, advanceCredits] = await Promise.all([
      prisma.invoice.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.feeReceipt.findMany({
        where: { studentId: student.id },
        orderBy: { paidAt: "desc" },
      }),
      prisma.studentAdvanceCredit.findMany({
        where: { studentId: student.id },
      }),
    ]);

    let totalInvoiced = 0;
    let totalPaid = 0;
    let outstandingBalance = 0;
    invoices.forEach((inv) => {
      totalInvoiced += Number(inv.amount || 0);
      totalPaid += Number((inv as any).amountPaid || (inv as any).paidAmount || 0);
      outstandingBalance += Number((inv as any).remainingAmount || (inv as any).balance || 0);
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalInvoiced,
          totalPaid,
          outstandingBalance,
        },
        invoices,
        receipts,
        advanceCredits,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 5.6 GET /api/v1/students/:id/attendance — Attendance Metrics & Records
router.get("/:id/attendance", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const student = await verifyStudentAccess(req, res, req.params.id as string);
    if (!student) return;

    const attendanceRecords = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: "desc" },
      take: 90,
    });

    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((a) => a.status === "PRESENT").length;
    const absent = attendanceRecords.filter((a) => a.status === "ABSENT").length;
    const late = attendanceRecords.filter((a) => a.status === "LATE").length;
    const percentage = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 100;

    res.json({
      success: true,
      data: {
        summary: {
          totalDays: total,
          presentDays: present,
          absentDays: absent,
          lateDays: late,
          percentage,
        },
        recentRecords: attendanceRecords,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 5.7 GET /api/v1/students/:id/documents — Documents & Issued Certificates
router.get("/:id/documents", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const student = await verifyStudentAccess(req, res, req.params.id as string);
    if (!student) return;

    const [documents, certificates] = await Promise.all([
      prisma.document.findMany({
        where: { schoolId: student.schoolId, ownerType: "STUDENT", ownerId: student.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.issuedCertificate.findMany({
        where: { studentId: student.id },
        orderBy: { issuedAt: "desc" },
      }),
    ]);

    res.json({
      success: true,
      data: {
        documents,
        certificates,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 5.8 GET /api/v1/students/:id/history — Lifecycle Timelines & Audit Logs
router.get("/:id/history", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const student = await verifyStudentAccess(req, res, req.params.id as string);
    if (!student) return;

    const [timelines, auditLogs] = await Promise.all([
      prisma.studentTimeline.findMany({
        where: { studentId: student.id },
        orderBy: { date: "desc" },
      }),
      prisma.auditLog.findMany({
        where: { schoolId: student.schoolId, entity: "STUDENT", entityId: student.id },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({
      success: true,
      data: {
        timelines,
        auditLogs,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. PUT /api/v1/students/:id — UPDATE STUDENT PROFILE
// ═════════════════════════════════════════════════════════════════════════════

router.put("/:id", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.params.id as string;
    const b = req.body;
    const schoolId = req.user!.schoolId;

    const existingStudent = await prisma.student.findUnique({
      where: {
        id: studentId,
        ...(req.user!.role !== "SUPER_ADMIN" ? { schoolId: schoolId || "" } : {}),
      },
    });

    if (!existingStudent) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    let dataToUpdate: any = {
      ...(b.name && { name: b.name }),
      ...(b.sectionId && { sectionId: b.sectionId }),
      ...(b.rollNo && { rollNo: b.rollNo }),
      ...(b.guardianId !== undefined && { guardianId: b.guardianId }),
      ...(b.admissionNo && { admissionNo: b.admissionNo }),
      ...(b.dob && { dob: new Date(b.dob) }),
      ...(b.gender && { gender: b.gender }),
      ...(b.bloodGroup !== undefined && { bloodGroup: b.bloodGroup }),
      ...(b.address !== undefined && { address: b.address }),
      ...(b.isActive !== undefined && { isActive: Boolean(b.isActive) }),
    };

    if (b.password) {
      dataToUpdate.password = await hashPassword(b.password);
    }

    let updatedStudent: any = null;

    await runWithTenantDatabaseTransaction(existingStudent.schoolId, async (tx: any) => {
      updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: dataToUpdate,
        include: {
          guardian: { include: { user: { select: { id: true, name: true, email: true } } } },
          sectionRef: { include: { class: true } },
        },
      });

      // If status changed or section changed, create timeline event
      if (b.sectionId && b.sectionId !== existingStudent.sectionId) {
        await tx.studentTimeline.create({
          data: {
            studentId,
            title: "Academic Section Reassigned",
            type: "ACADEMIC_REASSIGNMENT",
            description: `Section updated by ${req.user!.name || "Staff"}.`,
          },
        });
      }

      if (b.isActive !== undefined && b.isActive !== existingStudent.isActive) {
        await tx.studentTimeline.create({
          data: {
            studentId,
            title: b.isActive ? "Student Status Activated" : "Student Status Deactivated",
            type: "STATUS_CHANGE",
            description: `Status changed to ${b.isActive ? "ACTIVE" : "INACTIVE"} by ${req.user!.name || "Staff"}.`,
          },
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: existingStudent.schoolId,
          userId: req.user!.id,
          action: "STUDENT_UPDATED",
          entity: "STUDENT",
          entityId: studentId,
          details: `Student profile updated by ${req.user!.name || "Staff"}.`,
        },
      });
    });

    res.json({ success: true, data: updatedStudent, message: "Student profile updated successfully" });
  } catch (e: any) {
    if (e.code === "P2002") {
      return res.status(400).json({ success: false, error: "Admission number already exists" });
    }
    logger.error({ err: e }, "Failed to update student");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. DELETE /api/v1/students/:id — SOFT-DELETE STUDENT (FAIL-CLOSED TENANCY)
// ═════════════════════════════════════════════════════════════════════════════

router.delete("/:id", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.params.id as string;
    const schoolId = req.user!.schoolId;

    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
        ...(req.user!.role !== "SUPER_ADMIN" ? { schoolId: schoolId || "" } : {}),
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    await runWithTenantDatabaseTransaction(student.schoolId, async (tx: any) => {
      // Soft-delete
      await tx.student.update({
        where: { id: studentId },
        data: {
          deletedAt: new Date(),
          deletedById: req.user!.id,
          isActive: false,
        },
      });

      // Record Timeline Event
      await tx.studentTimeline.create({
        data: {
          studentId,
          title: "Student Record Archived",
          type: "ARCHIVED",
          description: `Student archived/soft-deleted by ${req.user!.name || "Administrator"}.`,
        },
      });

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: student.schoolId,
          userId: req.user!.id,
          action: "STUDENT_DELETED",
          entity: "STUDENT",
          entityId: studentId,
          details: `Student ${student.name} (${student.admissionNo || "No AdmNo"}) soft-deleted by ${req.user!.name || "Staff"}.`,
        },
      });
    });

    res.json({ success: true, message: "Student archived successfully" });
  } catch (e) {
    logger.error({ err: e }, "Failed to soft-delete student");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
