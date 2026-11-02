import { describe, expect, it } from "vitest";
import { flattenWhere, isCompoundUniqueKey } from "../../lib/prisma";

describe("flattenWhere compound-unique and relation filter handling", () => {
  it("recognizes genuine compound unique keys and flattens them", () => {
    const input = {
      threadId_userId: {
        threadId: "th_123",
        userId: "usr_456",
      },
    };

    expect(isCompoundUniqueKey("threadId_userId", input.threadId_userId)).toBe(true);

    const flattened = flattenWhere(input);
    expect(flattened).toEqual({
      threadId: "th_123",
      userId: "usr_456",
    });
  });

  it("recognizes compound unique keys with schoolId and field", () => {
    const input = {
      schoolId_code: {
        schoolId: "sch_1",
        code: "CODE123",
      },
    };

    expect(isCompoundUniqueKey("schoolId_code", input.schoolId_code)).toBe(true);
    expect(flattenWhere(input)).toEqual({
      schoolId: "sch_1",
      code: "CODE123",
    });
  });

  it("does NOT flatten relation filters containing underscores", () => {
    const input = {
      teacher_subjects: {
        some: {
          subjectId: "sub_1",
        },
      },
    };

    expect(isCompoundUniqueKey("teacher_subjects", input.teacher_subjects as any)).toBe(false);

    const flattened = flattenWhere(input);
    expect(flattened).toEqual({
      teacher_subjects: {
        some: {
          subjectId: "sub_1",
        },
      },
    });
  });

  it("does NOT flatten relation filters with nested is/isNot/every/none conditions", () => {
    const input = {
      student_marks: {
        every: {
          score: { gte: 50 },
        },
      },
      asset_assignments: {
        none: {
          returnedAt: null,
        },
      },
    };

    expect(isCompoundUniqueKey("student_marks", input.student_marks as any)).toBe(false);
    expect(isCompoundUniqueKey("asset_assignments", input.asset_assignments as any)).toBe(false);

    const flattened = flattenWhere(input);
    expect(flattened).toEqual(input);
  });

  it("preserves standard operator objects and scalar properties", () => {
    const input = {
      id: "id_123",
      status: { in: ["ACTIVE", "PENDING"] },
      name: { contains: "test", mode: "insensitive" },
    };

    const flattened = flattenWhere(input);
    expect(flattened).toEqual(input);
  });
});
