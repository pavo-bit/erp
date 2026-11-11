/**
 * ssvm-backend/src/services/import-framework/template-generator.ts
 *
 * Generates downloadable Excel (.xlsx) and CSV (.csv) template files
 * populated with canonical headers, field descriptions, and example data.
 */

import ExcelJS from "exceljs";
import { ModuleTemplateDefinition } from "./template-registry";

export class TemplateGeneratorService {
  /**
   * Generate an Excel (.xlsx) buffer with styled headers, descriptions, and sample row
   */
  public static async generateExcelTemplate(template: ModuleTemplateDefinition): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SSVM ERP Platform";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(template.moduleName, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    // Setup columns
    sheet.columns = template.fields.map((f) => ({
      header: f.label + (f.required ? " *" : ""),
      key: f.name,
      width: Math.max(f.label.length + 8, 18),
    }));

    // Style Header Row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Dark primary blue
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 26;

    // Add sample row
    const sampleData: Record<string, any> = {};
    template.fields.forEach((f) => {
      sampleData[f.name] = f.example;
    });
    const sampleRow = sheet.addRow(sampleData);
    sampleRow.font = { italic: true, color: { argb: "FF475569" } };
    sampleRow.alignment = { vertical: "middle", horizontal: "left" };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generate a CSV string with headers and sample row
   */
  public static generateCsvTemplate(template: ModuleTemplateDefinition): string {
    const headers = template.fields.map((f) => `"${f.label.replace(/"/g, '""')}"`);
    const examples = template.fields.map((f) => `"${String(f.example).replace(/"/g, '""')}"`);

    return `${headers.join(",")}\n${examples.join(",")}\n`;
  }
}

