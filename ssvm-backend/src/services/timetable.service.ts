import { Prisma } from "@prisma/client";
import { runWithTenantDatabaseTransaction } from "../lib/prisma";

export interface TimetableSlotInput {
  period: number;
  teacherSubjectAssignmentId: string;
  startTime: string; // "HH:MM" e.g. "09:00"
  endTime: string;   // "HH:MM" e.g. "09:45"
}

export interface CollisionReport {
  hasCollision: boolean;
  type?: "SECTION_COLLISION" | "TEACHER_COLLISION" | "INVALID_TIME" | "CROSS_TENANT_VIOLATION";
  message?: string;
  conflictingDetails?: {
    teacherId?: string;
    teacherName?: string;
    sectionId?: string;
    sectionName?: string;
    day?: string;
    period?: number;
    startTime?: string;
    endTime?: string;
  };
}

/**
 * Convert "HH:MM" to minutes from midnight for interval overlap calculations
 */
export function timeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(":");
  if (parts.length !== 2) return -1;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

/**
 * Check if two time intervals [startA, endA) and [startB, endB) overlap
 */
export function isTimeOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
  const minAStart = timeToMinutes(startA);
  const minAEnd = timeToMinutes(endA);
  const minBStart = timeToMinutes(startB);
  const minBEnd = timeToMinutes(endB);

  if (minAStart < 0 || minAEnd < 0 || minBStart < 0 || minBEnd < 0) return false;
  return Math.max(minAStart, minBStart) < Math.min(minAEnd, minBEnd);
}

/**
 * Validate slot array and detect internal collisions (same period or overlapping time in request)
 */
export function validateInternalSlots(slots: TimetableSlotInput[]): CollisionReport {
  const periodSet = new Set<number>();

  for (let i = 0; i < slots.length; i++) {
    const s1 = slots[i];
    const s1Start = timeToMinutes(s1.startTime);
    const s1End = timeToMinutes(s1.endTime);

    if (s1Start < 0 || s1End < 0 || s1Start >= s1End) {
      return {
        hasCollision: true,
        type: "INVALID_TIME",
        message: `Invalid slot timing: startTime (${s1.startTime}) must precede endTime (${s1.endTime}) for period ${s1.period}.`,
        conflictingDetails: { period: s1.period, startTime: s1.startTime, endTime: s1.endTime }
      };
    }

    if (periodSet.has(s1.period)) {
      return {
        hasCollision: true,
        type: "SECTION_COLLISION",
        message: `Duplicate period ${s1.period} defined in timetable payload.`,
        conflictingDetails: { period: s1.period }
      };
    }
    periodSet.add(s1.period);

    for (let j = i + 1; j < slots.length; j++) {
      const s2 = slots[j];
      if (isTimeOverlapping(s1.startTime, s1.endTime, s2.startTime, s2.endTime)) {
        return {
          hasCollision: true,
          type: "SECTION_COLLISION",
          message: `Time overlap detected between period ${s1.period} (${s1.startTime}-${s1.endTime}) and period ${s2.period} (${s2.startTime}-${s2.endTime}).`,
          conflictingDetails: { period: s1.period, startTime: s1.startTime, endTime: s1.endTime }
        };
      }
    }
  }

  return { hasCollision: false };
}

/**
 * Detect teacher and section double-booking collisions across the entire school
 */
export async function detectTimetableCollisions(
  tx: Prisma.TransactionClient,
  schoolId: string,
  sectionId: string,
  day: string,
  slots: TimetableSlotInput[],
  excludeTimetableId?: string
): Promise<CollisionReport> {
  // 1. Validate internal slot consistency
  const internalCheck = validateInternalSlots(slots);
  if (internalCheck.hasCollision) return internalCheck;

  // 2. Fetch and verify all teacherSubjectAssignments belong to this school
  const assignmentIds = Array.from(new Set(slots.map(s => s.teacherSubjectAssignmentId)));
  const assignments = await tx.teacherSubjectAssignment.findMany({
    where: {
      id: { in: assignmentIds },
      schoolId
    },
    include: {
      teacher: { include: { user: { select: { name: true } } } },
      subject: { select: { name: true } },
      section: { select: { id: true, name: true } }
    }
  });

  if (assignments.length !== assignmentIds.length) {
    return {
      hasCollision: true,
      type: "CROSS_TENANT_VIOLATION",
      message: "One or more teacher subject assignments do not exist in this school."
    };
  }

  const assignmentMap = new Map<string, typeof assignments[0]>();
  for (const a of assignments) {
    assignmentMap.set(a.id, a);
  }

  // 3. Check for teacher collision within the request itself
  const teacherSlots = new Map<string, TimetableSlotInput[]>();
  for (const slot of slots) {
    const assignment = assignmentMap.get(slot.teacherSubjectAssignmentId)!;
    const existing = teacherSlots.get(assignment.teacherId) || [];
    for (const prior of existing) {
      if (prior.period === slot.period || isTimeOverlapping(prior.startTime, prior.endTime, slot.startTime, slot.endTime)) {
        const teacherName = assignment.teacher?.user?.name || "Teacher";
        return {
          hasCollision: true,
          type: "TEACHER_COLLISION",
          message: `Collision: Teacher ${teacherName} is assigned to multiple slots at the same time on ${day}.`,
          conflictingDetails: {
            teacherId: assignment.teacherId,
            teacherName,
            day,
            period: slot.period,
            startTime: slot.startTime,
            endTime: slot.endTime
          }
        };
      }
    }
    existing.push(slot);
    teacherSlots.set(assignment.teacherId, existing);
  }

  // 4. Query existing timetable slots across the entire school for the same day
  const teacherIds = Array.from(teacherSlots.keys());
  const existingOtherSlots = await tx.timetableSlot.findMany({
    where: {
      timetable: {
        schoolId,
        day,
        ...(excludeTimetableId ? { id: { not: excludeTimetableId } } : {}),
        sectionId: { not: sectionId } // check other sections
      },
      teacherSubjectAssignment: {
        teacherId: { in: teacherIds }
      }
    },
    include: {
      timetable: { include: { sectionRef: { select: { id: true, name: true } } } },
      teacherSubjectAssignment: {
        include: {
          teacher: { include: { user: { select: { name: true } } } },
          subject: { select: { name: true } }
        }
      }
    }
  });

  for (const existingSlot of existingOtherSlots) {
    const tId = existingSlot.teacherSubjectAssignment.teacherId;
    const requestingSlotsForTeacher = teacherSlots.get(tId) || [];

    for (const reqSlot of requestingSlotsForTeacher) {
      const periodConflict = existingSlot.period === reqSlot.period;
      const timeConflict = isTimeOverlapping(
        existingSlot.startTime,
        existingSlot.endTime,
        reqSlot.startTime,
        reqSlot.endTime
      );

      if (periodConflict || timeConflict) {
        const teacherName = existingSlot.teacherSubjectAssignment.teacher?.user?.name || "Teacher";
        const conflictSectionName = existingSlot.timetable?.sectionRef?.name || "another section";
        return {
          hasCollision: true,
          type: "TEACHER_COLLISION",
          message: `Collision: Teacher ${teacherName} is already scheduled in section ${conflictSectionName} on ${day} during period ${existingSlot.period} (${existingSlot.startTime}-${existingSlot.endTime}).`,
          conflictingDetails: {
            teacherId: tId,
            teacherName,
            sectionId: existingSlot.timetable.sectionId,
            sectionName: conflictSectionName,
            day,
            period: existingSlot.period,
            startTime: existingSlot.startTime,
            endTime: existingSlot.endTime
          }
        };
      }
    }
  }

  return { hasCollision: false };
}

/**
 * Upsert timetable for a section and day with atomic collision detection
 */
export async function saveTimetableWithCollisionGuard(
  schoolId: string,
  sectionId: string,
  day: string,
  slots: TimetableSlotInput[]
): Promise<unknown> {
  return await runWithTenantDatabaseTransaction(schoolId, async (tx: Prisma.TransactionClient) => {
    // Check if a timetable already exists for this section and day
    const existing = await tx.timetable.findFirst({
      where: { schoolId, sectionId, day }
    });

    // Detect collisions
    const collision = await detectTimetableCollisions(
      tx,
      schoolId,
      sectionId,
      day,
      slots,
      existing?.id
    );

    if (collision.hasCollision) {
      const err = new Error(collision.message || "Timetable collision detected") as Error & {
        status?: number;
        code?: string;
        details?: unknown;
      };
      err.status = 409;
      err.code = collision.type;
      err.details = collision.conflictingDetails;
      throw err;
    }

    // Clean up existing slots if updating
    if (existing) {
      await tx.timetableSlot.deleteMany({ where: { timetableId: existing.id } });
      await tx.timetable.delete({ where: { id: existing.id } });
    }

    // Create new timetable and its slots atomically
    const newTimetable = await tx.timetable.create({
      data: {
        schoolId,
        sectionId,
        day,
        slots: {
          create: slots.map(s => ({
            period: s.period,
            teacherSubjectAssignmentId: s.teacherSubjectAssignmentId,
            startTime: s.startTime,
            endTime: s.endTime
          }))
        }
      },
      include: {
        slots: {
          orderBy: { period: "asc" },
          include: {
            teacherSubjectAssignment: {
              include: {
                subject: true,
                teacher: { include: { user: { select: { name: true } } } }
              }
            }
          }
        }
      }
    });

    return newTimetable;
  });
}

