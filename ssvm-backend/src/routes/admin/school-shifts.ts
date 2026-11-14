import { Router, Response } from "express";
import { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import logger from "../../lib/logger";
import { AuthRequest, authenticate, requireSuperAdmin } from "../../middleware/auth";

const router = Router({ mergeParams: true });

function parseParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
}

/**
 * Access guard: Super Admin can access any school; School Admin can only view their own school.
 */
function authorizeSchoolAccess(req: AuthRequest, res: Response, next: any) {
  const schoolId = parseParam(req.params.schoolId);
  if (!schoolId) {
    res.status(400).json({ success: false, error: "School ID is required." });
    return;
  }

  const isSuperAdmin = req.user?.role === "SUPER_ADMIN";
  const isSchoolAdmin =
    (req.user?.role === "ERP_ADMIN" || req.user?.role === "ADMIN") &&
    req.user?.schoolId === schoolId;

  if (!isSuperAdmin && !isSchoolAdmin) {
    res.status(403).json({ success: false, error: "Forbidden: Access denied to this institution." });
    return;
  }
  next();
}

/**
 * GET /api/v1/super-admin/schools/:schoolId/shifts
 * List all shifts for an institution, optionally filtered by academic session.
 */
router.get("/:schoolId/shifts", authenticate, authorizeSchoolAccess, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = parseParam(req.params.schoolId);
    const { sessionId } = req.query;

    const whereClause: any = { schoolId };
    if (sessionId && typeof sessionId === "string") {
      whereClause.sessionId = sessionId;
    }

    const shifts = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      return tx.schoolShift.findMany({
        where: whereClause,
        include: {
          session: { select: { id: true, name: true, isCurrent: true } },
          shiftClasses: {
            include: {
              class: { select: { id: true, name: true, sortOrder: true } },
            },
          },
        },
        orderBy: [{ sessionId: "asc" }, { startTime: "asc" }],
      });
    });

    res.json({ success: true, data: shifts });
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch school shifts");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/super-admin/schools/:schoolId/sessions
 * List academic sessions for the institution.
 */
router.get("/:schoolId/sessions", authenticate, authorizeSchoolAccess, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = parseParam(req.params.schoolId);
    const sessions = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      return tx.academicSession.findMany({
        where: { schoolId },
        orderBy: { startDate: "desc" },
      });
    });
    res.json({ success: true, data: sessions });
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch academic sessions");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/super-admin/schools/:schoolId/sessions/:sessionId/classes
 * List classes for a specific session with their current shift assignments.
 */
router.get(
  "/:schoolId/sessions/:sessionId/classes",
  authenticate,
  authorizeSchoolAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const schoolId = parseParam(req.params.schoolId);
      const sessionId = parseParam(req.params.sessionId);

      const formatted = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
        // Verify session belongs to school
        const session = await tx.academicSession.findFirst({
          where: { id: sessionId, schoolId },
        });
        if (!session) return null;

        const classes = await tx.class.findMany({
          where: { schoolId, sessionId },
          include: {
            schoolShiftClasses: {
              where: { sessionId, isActive: true },
              include: { shift: { select: { id: true, name: true, type: true, startTime: true, endTime: true } } },
            },
            _count: { select: { studentEnrollments: { where: { sessionId, status: "ACTIVE" } } } },
          },
          orderBy: { sortOrder: "asc" },
        });

        return classes.map((c) => ({
          id: c.id,
          name: c.name,
          sortOrder: c.sortOrder,
          activeStudents: c._count.studentEnrollments,
          assignedShift: c.schoolShiftClasses[0]?.shift || null,
        }));
      });

      if (!formatted) {
        res.status(404).json({ success: false, error: "Academic session not found for this institution." });
        return;
      }

      res.json({ success: true, data: formatted });
    } catch (err: any) {
      logger.error({ err }, "Failed to fetch classes for shift assignment");
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /api/v1/super-admin/schools/:schoolId/shifts
 * Create a new shift and assign classes (Super Admin only).
 */
router.post("/:schoolId/shifts", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = parseParam(req.params.schoolId);
    const { name, type, startTime, endTime, sessionId, classIds = [], effectiveFrom, effectiveTo } = req.body;

    if (!name || !type || !startTime || !endTime || !sessionId) {
      res.status(400).json({
        success: false,
        error: "Missing required shift fields: name, type, startTime, endTime, sessionId.",
      });
      return;
    }

    if (!["MORNING", "DAY", "EVENING"].includes(type)) {
      res.status(400).json({ success: false, error: "Invalid shift type. Must be MORNING, DAY, or EVENING." });
      return;
    }

    if (startTime >= endTime) {
      res.status(400).json({ success: false, error: "Shift start time must be earlier than end time." });
      return;
    }

    const createdShift = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      // Verify session belongs to school
      const session = await tx.academicSession.findFirst({
        where: { id: sessionId, schoolId },
      });
      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }

      // Validate classes if supplied
      if (classIds.length > 0) {
        const validClasses = await tx.class.findMany({
          where: { id: { in: classIds }, schoolId, sessionId },
        });
        if (validClasses.length !== classIds.length) {
          throw new Error("INVALID_CLASSES");
        }
      }

      // Create shift record
      const shift = await tx.schoolShift.create({
        data: {
          schoolId,
          sessionId,
          name,
          type,
          applicableClasses: "",
          startTime,
          endTime,
          isActive: true,
          configurationVersion: 1,
          publicationStatus: "DRAFT",
          createdById: req.user!.id,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        },
      });

      // Link classes
      if (classIds.length > 0) {
        for (const classId of classIds) {
          await tx.schoolShiftClass.upsert({
            where: {
              schoolId_sessionId_classId: {
                schoolId,
                sessionId,
                classId,
              },
            },
            create: {
              schoolId,
              sessionId,
              shiftId: shift.id,
              classId,
              isActive: true,
            },
            update: {
              shiftId: shift.id,
              isActive: true,
            },
          });
        }
      }

      // Record audit log
      await tx.auditLog.create({
        data: {
          schoolId,
          action: "CREATE",
          entity: "SchoolShift",
          entityId: shift.id,
          userId: req.user!.id,
          details: `Super Admin created shift ${name} (${type}) for session ${session.name}.`,
        },
      });

      return shift;
    });

    res.status(201).json({ success: true, data: createdShift });
  } catch (err: any) {
    if (err.message === "SESSION_NOT_FOUND") {
      res.status(404).json({ success: false, error: "Academic session not found for this institution." });
      return;
    }
    if (err.message === "INVALID_CLASSES") {
      res.status(400).json({
        success: false,
        error: "One or more classes do not belong to this institution and academic session.",
      });
      return;
    }
    logger.error({ err }, "Failed to create school shift");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/v1/super-admin/schools/:schoolId/shifts/:shiftId
 * Update an existing shift and its class assignments (Super Admin only).
 */
router.put("/:schoolId/shifts/:shiftId", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = parseParam(req.params.schoolId);
    const shiftId = parseParam(req.params.shiftId);
    const { name, type, startTime, endTime, classIds, effectiveFrom, effectiveTo, isActive } = req.body;

    if (startTime && endTime && startTime >= endTime) {
      res.status(400).json({ success: false, error: "Shift start time must be earlier than end time." });
      return;
    }

    const updatedShift = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      const existingShift = await tx.schoolShift.findFirst({
        where: { id: shiftId, schoolId },
      });
      if (!existingShift) {
        throw new Error("SHIFT_NOT_FOUND");
      }

      const sessionId = existingShift.sessionId;

      if (Array.isArray(classIds) && sessionId) {
        const validClasses = await tx.class.findMany({
          where: { id: { in: classIds }, schoolId, sessionId },
        });
        if (validClasses.length !== classIds.length) {
          throw new Error("INVALID_CLASSES");
        }
      }

      const updateData: any = {
        updatedById: req.user!.id,
        updatedAt: new Date(),
      };
      if (name !== undefined) updateData.name = name;
      if (type !== undefined) updateData.type = type;
      if (startTime !== undefined) updateData.startTime = startTime;
      if (endTime !== undefined) updateData.endTime = endTime;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (effectiveFrom !== undefined) updateData.effectiveFrom = effectiveFrom ? new Date(effectiveFrom) : null;
      if (effectiveTo !== undefined) updateData.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;

      const shift = await tx.schoolShift.update({
        where: { id: shiftId },
        data: updateData,
      });

      if (Array.isArray(classIds) && sessionId) {
        // Remove old classes for this shift
        await tx.schoolShiftClass.deleteMany({
          where: { shiftId, schoolId, sessionId },
        });

        // Re-assign classes
        for (const classId of classIds) {
          await tx.schoolShiftClass.upsert({
            where: {
              schoolId_sessionId_classId: {
                schoolId,
                sessionId,
                classId,
              },
            },
            create: {
              schoolId,
              sessionId,
              shiftId: shift.id,
              classId,
              isActive: true,
            },
            update: {
              shiftId: shift.id,
              isActive: true,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          schoolId,
          action: "UPDATE",
          entity: "SchoolShift",
          entityId: shift.id,
          userId: req.user!.id,
          details: `Super Admin updated shift ${shift.name}.`,
        },
      });

      return shift;
    });

    res.json({ success: true, data: updatedShift });
  } catch (err: any) {
    if (err.message === "SHIFT_NOT_FOUND") {
      res.status(404).json({ success: false, error: "Shift not found for this institution." });
      return;
    }
    if (err.message === "INVALID_CLASSES") {
      res.status(400).json({
        success: false,
        error: "One or more classes do not belong to this institution and academic session.",
      });
      return;
    }
    logger.error({ err }, "Failed to update school shift");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/v1/super-admin/schools/:schoolId/shifts/:shiftId
 * Delete a shift configuration (Super Admin only).
 */
router.delete("/:schoolId/shifts/:shiftId", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = parseParam(req.params.schoolId);
    const shiftId = parseParam(req.params.shiftId);

    await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      const existingShift = await tx.schoolShift.findFirst({
        where: { id: shiftId, schoolId },
      });
      if (!existingShift) {
        throw new Error("SHIFT_NOT_FOUND");
      }

      await tx.schoolShiftClass.deleteMany({ where: { shiftId } });
      await tx.schoolShift.delete({ where: { id: shiftId } });

      await tx.auditLog.create({
        data: {
          schoolId,
          action: "DELETE",
          entity: "SchoolShift",
          entityId: shiftId,
          userId: req.user!.id,
          details: `Super Admin deleted shift ${existingShift.name}.`,
        },
      });
    });

    res.json({ success: true, message: "Shift configuration deleted successfully." });
  } catch (err: any) {
    if (err.message === "SHIFT_NOT_FOUND") {
      res.status(404).json({ success: false, error: "Shift not found for this institution." });
      return;
    }
    logger.error({ err }, "Failed to delete school shift");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/super-admin/schools/:schoolId/shifts/validate
 * Validates shift configuration completeness and conflicts for a session.
 */
router.post("/:schoolId/shifts/validate", authenticate, authorizeSchoolAccess, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = parseParam(req.params.schoolId);
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({ success: false, error: "Academic session ID is required." });
      return;
    }

    const report = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      const session = await tx.academicSession.findFirst({
        where: { id: sessionId, schoolId },
      });
      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }

      const classes = await tx.class.findMany({
        where: { schoolId, sessionId },
        orderBy: { sortOrder: "asc" },
      });

      const shifts = await tx.schoolShift.findMany({
        where: { schoolId, sessionId, isActive: true },
        include: {
          shiftClasses: {
            where: { isActive: true },
            include: { class: true },
          },
        },
      });

      const errors: string[] = [];
      const warnings: string[] = [];

      if (shifts.length === 0) {
        errors.push("No active shifts have been created for this academic session.");
      }

      // Verify time logic
      for (const shift of shifts) {
        if (shift.startTime >= shift.endTime) {
          errors.push(`Shift "${shift.name}" has invalid timings: start (${shift.startTime}) must be earlier than end (${shift.endTime}).`);
        }
      }

      // Map class assignments
      const classShiftMap = new Map<string, string[]>();
      for (const shift of shifts) {
        for (const sc of shift.shiftClasses) {
          const existing = classShiftMap.get(sc.classId) || [];
          existing.push(shift.name);
          classShiftMap.set(sc.classId, existing);
        }
      }

      // Check duplicate assignments
      for (const [classId, shiftNames] of classShiftMap.entries()) {
        if (shiftNames.length > 1) {
          const cls = classes.find((c) => c.id === classId);
          errors.push(`Class "${cls?.name || classId}" is assigned to multiple shifts: ${shiftNames.join(", ")}.`);
        }
      }

      // Check unassigned classes
      const unassignedClasses: string[] = [];
      for (const cls of classes) {
        if (!classShiftMap.has(cls.id) || classShiftMap.get(cls.id)!.length === 0) {
          unassignedClasses.push(cls.name);
        }
      }

      if (unassignedClasses.length > 0) {
        warnings.push(`The following classes have no shift assignment: ${unassignedClasses.join(", ")}.`);
      }

      const isValid = errors.length === 0;

      return {
        isValid,
        errors,
        warnings,
        summary: {
          totalClasses: classes.length,
          assignedClasses: classes.length - unassignedClasses.length,
          unassignedClasses: unassignedClasses.length,
          unassignedClassNames: unassignedClasses,
          totalShifts: shifts.length,
        },
      };
    });

    res.json({ success: true, data: report });
  } catch (err: any) {
    if (err.message === "SESSION_NOT_FOUND") {
      res.status(404).json({ success: false, error: "Academic session not found." });
      return;
    }
    logger.error({ err }, "Failed to validate school shift configuration");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/super-admin/schools/:schoolId/shifts/publish
 * Publishes the validated shift configuration (Super Admin only).
 */
router.post("/:schoolId/shifts/publish", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = parseParam(req.params.schoolId);
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({ success: false, error: "Academic session ID is required." });
      return;
    }

    const publishedAt = new Date();
    const publishedById = req.user!.id;

    const result = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      const session = await tx.academicSession.findFirst({
        where: { id: sessionId, schoolId },
      });
      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }

      const shifts = await tx.schoolShift.findMany({
        where: { schoolId, sessionId, isActive: true },
        include: { shiftClasses: true },
      });

      if (shifts.length === 0) {
        throw new Error("NO_SHIFTS_TO_PUBLISH");
      }

      // Find current max version
      const maxVersionShift = await tx.schoolShift.findFirst({
        where: { schoolId, sessionId },
        orderBy: { configurationVersion: "desc" },
      });
      const nextVersion = (maxVersionShift?.configurationVersion || 0) + 1;

      // Update all shifts for this session to PUBLISHED with incremented version
      await tx.schoolShift.updateMany({
        where: { schoolId, sessionId },
        data: {
          publicationStatus: "PUBLISHED",
          publishedAt,
          publishedById,
          configurationVersion: nextVersion,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          schoolId,
          action: "PUBLISH",
          entity: "SchoolShift",
          userId: publishedById,
          details: `Super Admin published Shift Configuration v${nextVersion} for session ${session.name}.`,
        },
      });

      return { version: nextVersion, publishedAt, count: shifts.length };
    });

    res.json({
      success: true,
      message: `Shift configuration v${result.version} published successfully.`,
      data: result,
    });
  } catch (err: any) {
    if (err.message === "SESSION_NOT_FOUND") {
      res.status(404).json({ success: false, error: "Academic session not found." });
      return;
    }
    if (err.message === "NO_SHIFTS_TO_PUBLISH") {
      res.status(400).json({
        success: false,
        error: "Cannot publish: No shifts found for this academic session.",
      });
      return;
    }
    logger.error({ err }, "Failed to publish school shift configuration");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/super-admin/schools/:schoolId/shifts/history
 * Audit trail of shift publications and changes.
 */
router.get("/:schoolId/shifts/history", authenticate, authorizeSchoolAccess, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = parseParam(req.params.schoolId);
    const history = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      return tx.auditLog.findMany({
        where: {
          schoolId,
          entity: "SchoolShift",
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });
    res.json({ success: true, data: history });
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch shift configuration history");
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
