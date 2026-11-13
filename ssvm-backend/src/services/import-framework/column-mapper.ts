/**
 * ssvm-backend/src/services/import-framework/column-mapper.ts
 *
 * Intelligent column header mapper:
 * Automatically associates uploaded file headers with canonical module fields.
 */

import { ModuleTemplateDefinition, FieldDefinition } from "./template-registry";

export interface ColumnMappingResult {
  // Mapping from original file header to canonical field name
  headerToField: Record<string, string>;
  // File headers that could not be automatically mapped
  unmappedHeaders: string[];
  // Canonical fields that are missing from the uploaded file
  missingRequiredFields: string[];
  // Missing optional fields
  missingOptionalFields: string[];
}

export class ColumnMapperService {
  /**
   * Automatically detect column mapping based on field names and aliases
   */
  public static autoMap(
    fileHeaders: string[],
    template: ModuleTemplateDefinition,
    userOverrides: Record<string, string> = {}
  ): ColumnMappingResult {
    const headerToField: Record<string, string> = {};
    const mappedFields = new Set<string>();
    const unmappedHeaders: string[] = [];

    // Apply explicit user overrides first
    for (const [fileHeader, targetField] of Object.entries(userOverrides)) {
      if (template.fields.some((f) => f.name === targetField)) {
        headerToField[fileHeader] = targetField;
        mappedFields.add(targetField);
      }
    }

    // Process remaining headers with alias normalization
    for (const rawHeader of fileHeaders) {
      if (headerToField[rawHeader]) continue; // already mapped

      const normalized = rawHeader.toLowerCase().replace(/[^a-z0-9]/g, "");

      // 1. Exact match on field.name
      let match = template.fields.find(
        (f) => !mappedFields.has(f.name) && f.name.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized
      );

      // 2. Exact match on field.label
      if (!match) {
        match = template.fields.find(
          (f) => !mappedFields.has(f.name) && f.label.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized
        );
      }

      // 3. Match on registered aliases
      if (!match) {
        match = template.fields.find((f) =>
          !mappedFields.has(f.name) &&
          f.aliases.some((alias) => alias.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized)
        );
      }

      if (match) {
        headerToField[rawHeader] = match.name;
        mappedFields.add(match.name);
      } else {
        unmappedHeaders.push(rawHeader);
      }
    }

    const missingRequiredFields: string[] = [];
    const missingOptionalFields: string[] = [];

    for (const field of template.fields) {
      if (!mappedFields.has(field.name)) {
        if (field.required) {
          missingRequiredFields.push(field.label);
        } else {
          missingOptionalFields.push(field.label);
        }
      }
    }

    return {
      headerToField,
      unmappedHeaders,
      missingRequiredFields,
      missingOptionalFields,
    };
  }

  /**
   * Transform raw row using the verified column map
   */
  public static mapRow(rawValues: Record<string, any>, headerToField: Record<string, string>): Record<string, any> {
    const mapped: Record<string, any> = {};

    for (const [header, val] of Object.entries(rawValues)) {
      const fieldName = headerToField[header];
      if (fieldName) {
        mapped[fieldName] = val;
      }
    }

    return mapped;
  }
}

