/**
 * ssvm-backend/src/services/import-framework/validation-engine.ts
 *
 * Robust validation engine checking required fields, data types, formats,
 * enums, foreign keys in tenant context, and business constraints.
 */

import prisma from "../../lib/prisma";
import { runWithSchoolContext } from "../../middleware/school-context.middleware";
import { ModuleTemplateDefinition, FieldDefinition } from "./template-registry";

export interface CellError {
  field: string;
  fieldLabel: string;
  value: any;
  message: string;
}

export interface RowValidationResult {
  rowNumber: number;
  isValid: boolean;
  sanitizedValues: Record<string, any>;
  errors: CellError[];
}

export class ValidationEngineService {
  /**
   * Validate an entire array of mapped rows against the module template and tenant scope
   */
  public static async validateRows(
    schoolId: string,
    rows: Array<{ rowNumber: number; mappedValues: Record<string, any> }>,
    template: ModuleTemplateDefinition
  ): Promise<RowValidationResult[]> {
    // 1. Preload tenant relational reference caches to avoid N+1 DB queries
    const cache = await this.preloadTenantCache(schoolId, template);

    const results: RowValidationResult[] = [];

    for (const r of rows) {
      const rowResult = this.validateSingleRow(r.rowNumber, r.mappedValues, template, cache);
      results.push(rowResult);
    }

    return results;
  }

  /**
   * Preload classes, sections, etc., for the tenant
   */
  private static async preloadTenantCache(schoolId: string, template: ModuleTemplateDefinition): Promise<Record<string, any>> {
    return runWithSchoolContext(schoolId, async () => {
      const cache: Record<string, any> = {};

      if (template.moduleId === "students" || template.moduleId === "classes") {
        const classes = await prisma.class.findMany({
          where: { schoolId },
          include: { sections: true },
        });
        cache.classes = classes;
      }

      if (template.moduleId === "guardians" || template.moduleId === "attendance") {
        const students = await prisma.student.findMany({
          where: { schoolId },
          select: { id: true, rollNo: true, name: true, sectionId: true, sectionRef: { select: { classId: true } } },
        });
        cache.studentsByRoll = new Map(students.map((s) => [s.rollNo?.toUpperCase(), s]));
      }

      return cache;
    });
  }

  /**
   * Validate a single row
   */
  public static validateSingleRow(
    rowNumber: number,
    mappedValues: Record<string, any>,
    template: ModuleTemplateDefinition,
    cache: Record<string, any> = {}
  ): RowValidationResult {
    const errors: CellError[] = [];
    const sanitizedValues: Record<string, any> = {};

    for (const field of template.fields) {
      const rawVal = mappedValues[field.name];

      // Missing or empty check
      if (rawVal === undefined || rawVal === null || String(rawVal).trim() === "") {
        if (field.required) {
          errors.push({
            field: field.name,
            fieldLabel: field.label,
            value: null,
            message: `Mandatory field "${field.label}" is missing or empty.`,
          });
        }
        sanitizedValues[field.name] = null;
        continue;
      }

      // Type and format validation
      const sanitized = this.validateAndSanitizeField(field, rawVal, errors);
      sanitizedValues[field.name] = sanitized;
    }

    // Module-specific relational validations
    this.validateRelationalConstraints(sanitizedValues, template, cache, errors);

    return {
      rowNumber,
      isValid: errors.length === 0,
      sanitizedValues,
      errors,
    };
  }

  /**
   * Type cast and sanitize individual field
   */
  private static validateAndSanitizeField(
    field: FieldDefinition,
    val: any,
    errors: CellError[]
  ): any {
    const strVal = String(val).trim();

    switch (field.type) {
      case "string":
        return strVal;

      case "number": {
        const num = Number(strVal);
        if (isNaN(num)) {
          errors.push({
            field: field.name,
            fieldLabel: field.label,
            value: val,
            message: `Field "${field.label}" must be a valid number.`,
          });
          return null;
        }
        return num;
      }

      case "boolean": {
        const lower = strVal.toLowerCase();
        if (["true", "yes", "1", "y"].includes(lower)) return true;
        if (["false", "no", "0", "n"].includes(lower)) return false;
        errors.push({
          field: field.name,
          fieldLabel: field.label,
          value: val,
          message: `Field "${field.label}" must be a boolean (TRUE or FALSE).`,
        });
        return null;
      }

      case "email": {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(strVal)) {
          errors.push({
            field: field.name,
            fieldLabel: field.label,
            value: val,
            message: `Invalid email address format for "${field.label}".`,
          });
          return null;
        }
        return strVal.toLowerCase();
      }

      case "phone": {
        const cleanedPhone = strVal.replace(/[^\d+]/g, "");
        if (cleanedPhone.length < 7 || cleanedPhone.length > 16) {
          errors.push({
            field: field.name,
            fieldLabel: field.label,
            value: val,
            message: `Invalid phone number format for "${field.label}".`,
          });
          return null;
        }
        return cleanedPhone;
      }

      case "date": {
        const d = this.parseDate(strVal);
        if (!d || isNaN(d.getTime())) {
          errors.push({
            field: field.name,
            fieldLabel: field.label,
            value: val,
            message: `Invalid date format for "${field.label}". Please use YYYY-MM-DD or DD/MM/YYYY.`,
          });
          return null;
        }
        return d.toISOString().split("T")[0];
      }

      case "enum": {
        const normalized = strVal.toUpperCase();
        if (field.enumValues && !field.enumValues.includes(normalized)) {
          errors.push({
            field: field.name,
            fieldLabel: field.label,
            value: val,
            message: `"${val}" is not a valid option for "${field.label}". Allowed: [${field.enumValues.join(", ")}].`,
          });
          return null;
        }
        return normalized;
      }

      default:
        return strVal;
    }
  }

  /**
   * Safe date parsing supporting multiple formats (ISO, DD/MM/YYYY, MM/DD/YYYY)
   */
  private static parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Check YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    }

    // Check DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }

    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  /**
   * Validate cross-record relations
   */
  private static validateRelationalConstraints(
    sanitized: Record<string, any>,
    template: ModuleTemplateDefinition,
    cache: Record<string, any>,
    errors: CellError[]
  ): void {
    if (template.moduleId === "students") {
      const className = sanitized.className;
      if (className && cache.classes) {
        const matchingClass = cache.classes.find(
          (c: any) => c.name.toLowerCase() === String(className).toLowerCase()
        );
        if (!matchingClass) {
          errors.push({
            field: "className",
            fieldLabel: "Class Name",
            value: className,
            message: `Class "${className}" does not exist in this institution. Please configure it under Institution Setup first.`,
          });
        } else {
          sanitized._resolvedClassId = matchingClass.id;

          const sectionName = sanitized.sectionName;
          if (sectionName) {
            const matchingSection = matchingClass.sections.find(
              (s: any) => s.name.toLowerCase() === String(sectionName).toLowerCase()
            );
            if (!matchingSection) {
              errors.push({
                field: "sectionName",
                fieldLabel: "Section Name",
                value: sectionName,
                message: `Section "${sectionName}" does not exist in Class "${matchingClass.name}".`,
              });
            } else {
              sanitized._resolvedSectionId = matchingSection.id;
            }
          }
        }
      }
    }

    if (template.moduleId === "guardians" || template.moduleId === "attendance") {
      const rollNo = sanitized.studentRollNo || sanitized.rollNo;
      if (rollNo && cache.studentsByRoll) {
        const student = cache.studentsByRoll.get(String(rollNo).toUpperCase());
        if (!student) {
          errors.push({
            field: sanitized.studentRollNo ? "studentRollNo" : "rollNo",
            fieldLabel: "Student Roll Number",
            value: rollNo,
            message: `No active student found with Roll Number "${rollNo}" in this school.`,
          });
        } else {
          sanitized._resolvedStudentId = student.id;
        }
      }
    }
  }
}

