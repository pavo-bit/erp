/**
 * ssvm-backend/src/services/import-framework/duplicate-detector.ts
 *
 * Identifies intra-file duplicates and determines whether rows represent
 * inserts (ACTION_CREATE) or updates (ACTION_UPDATE).
 */

import prisma from "../../lib/prisma";
import { runWithSchoolContext } from "../../middleware/school-context.middleware";
import { ModuleTemplateDefinition } from "./template-registry";
import { RowValidationResult } from "./validation-engine";

export type RowAction = "CREATE" | "UPDATE" | "DUPLICATE_FILE" | "INVALID";

export interface ClassifiedRow extends RowValidationResult {
  action: RowAction;
  existingRecordId?: string;
}

export class DuplicateDetectorService {
  public static async classifyRows(
    schoolId: string,
    validatedRows: RowValidationResult[],
    template: ModuleTemplateDefinition
  ): Promise<ClassifiedRow[]> {
    const uniqueKey = template.uniqueIdentifier;
    const seenFileKeys = new Set<string>();

    // Collect all unique keys from valid rows to batch query DB
    const keysToCheck: string[] = [];
    for (const r of validatedRows) {
      if (r.isValid) {
        const keyVal = r.sanitizedValues[uniqueKey];
        if (keyVal) keysToCheck.push(String(keyVal).toUpperCase());
      }
    }

    // Preload existing DB records for this unique key
    const existingMap = await this.loadExistingRecordsMap(schoolId, template.moduleId, keysToCheck);

    const classified: ClassifiedRow[] = [];

    for (const r of validatedRows) {
      if (!r.isValid) {
        classified.push({
          ...r,
          action: "INVALID",
        });
        continue;
      }

      const keyVal = r.sanitizedValues[uniqueKey] ? String(r.sanitizedValues[uniqueKey]).toUpperCase() : null;

      // 1. Intra-file duplicate check
      if (keyVal) {
        if (seenFileKeys.has(keyVal)) {
          r.errors.push({
            field: uniqueKey,
            fieldLabel: uniqueKey,
            value: keyVal,
            message: `Duplicate entry in file: Value "${keyVal}" appears multiple times.`,
          });
          classified.push({
            ...r,
            isValid: false,
            action: "DUPLICATE_FILE",
          });
          continue;
        }
        seenFileKeys.add(keyVal);
      }

      // 2. Existing database check
      const existingId = keyVal ? existingMap.get(keyVal) : null;
      if (existingId) {
        classified.push({
          ...r,
          action: "UPDATE",
          existingRecordId: existingId,
        });
      } else {
        classified.push({
          ...r,
          action: "CREATE",
        });
      }
    }

    return classified;
  }

  private static async loadExistingRecordsMap(
    schoolId: string,
    moduleId: string,
    keys: string[]
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (keys.length === 0) return map;

    return runWithSchoolContext(schoolId, async () => {
      switch (moduleId) {
        case "students": {
          const existing = await prisma.student.findMany({
            where: { schoolId, rollNo: { in: keys, mode: "insensitive" } },
            select: { id: true, rollNo: true },
          });
          existing.forEach((e) => e.rollNo && map.set(e.rollNo.toUpperCase(), e.id));
          break;
        }

        case "staff": {
          const existing = await prisma.user.findMany({
            where: { schoolId, employeeId: { in: keys, mode: "insensitive" } },
            select: { id: true, employeeId: true },
          });
          existing.forEach((e) => e.employeeId && map.set(e.employeeId.toUpperCase(), e.id));
          break;
        }

        case "classes": {
          const existing = await prisma.class.findMany({
            where: { schoolId, name: { in: keys, mode: "insensitive" } },
            select: { id: true, name: true },
          });
          existing.forEach((e) => map.set(e.name.toUpperCase(), e.id));
          break;
        }

        case "subjects": {
          const existing = await prisma.subject.findMany({
            where: { schoolId, code: { in: keys, mode: "insensitive" } },
            select: { id: true, code: true },
          });
          existing.forEach((e) => {
            if (e.code) map.set(e.code.toUpperCase(), e.id);
          });
          break;
        }

        case "fees": {
          const existing = await prisma.feeCategory.findMany({
            where: { schoolId, name: { in: keys, mode: "insensitive" } },
            select: { id: true, name: true },
          });
          existing.forEach((e) => map.set(e.name.toUpperCase(), e.id));
          break;
        }

        default:
          break;
      }

      return map;
    });
  }
}

