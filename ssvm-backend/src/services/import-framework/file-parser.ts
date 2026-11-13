/**
 * ssvm-backend/src/services/import-framework/file-parser.ts
 *
 * Universal file parser for Excel (.xlsx) and CSV (.csv).
 * INVARIANT: Never compacts rows. An empty cell strictly maintains its
 * original column position and returns null (never shifting subsequent columns).
 */

import ExcelJS from "exceljs";
import Papa from "papaparse";
import logger from "../../lib/logger";

export interface ParsedRow {
  rowNumber: number; // 1-based index in original file
  rawValues: Record<string, any>; // keyed by original header string
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
}

export class FileParserService {
  /**
   * Parse either an Excel buffer (.xlsx) or CSV buffer (.csv)
   */
  public static async parseBuffer(buffer: Buffer, filename: string): Promise<ParseResult> {
    const isExcel = filename.endsWith(".xlsx") || filename.endsWith(".xls");
    const isCsv = filename.endsWith(".csv") || filename.endsWith(".txt");

    if (!isExcel && !isCsv) {
      throw new Error("Unsupported file format. Please upload an Excel (.xlsx) or CSV (.csv) file.");
    }

    if (isExcel) {
      return this.parseExcelBuffer(buffer);
    } else {
      return this.parseCsvBuffer(buffer);
    }
  }

  /**
   * Parse Excel (.xlsx) with strict column position tracking
   */
  private static async parseExcelBuffer(buffer: Buffer): Promise<ParseResult> {
    const workbook = new ExcelJS.Workbook();
    // @ts-ignore buffer is ArrayBuffer/Buffer
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount === 0) {
      throw new Error("Uploaded Excel workbook contains no data or empty worksheets.");
    }

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    const colIndexToHeader: Record<number, string> = {};

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      let headerText = "";
      if (typeof cell.value === "string") {
        headerText = cell.value.trim();
      } else if (cell.value && typeof cell.value === "object" && "richText" in cell.value) {
        headerText = (cell.value as any).richText.map((t: any) => t.text).join("").trim();
      } else if (cell.value !== null && cell.value !== undefined) {
        headerText = String(cell.value).trim();
      }

      if (headerText) {
        headers.push(headerText);
        colIndexToHeader[colNumber] = headerText;
      }
    });

    if (headers.length === 0) {
      throw new Error("Unable to locate valid column headers in row 1 of the Excel sheet.");
    }

    const rows: ParsedRow[] = [];
    const totalColumns = headerRow.cellCount;

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      // Check if entire row is empty
      let hasAnyValue = false;
      const rawValues: Record<string, any> = {};

      for (let c = 1; c <= totalColumns; c++) {
        const header = colIndexToHeader[c];
        if (!header) continue;

        const cell = row.getCell(c);
        let cellVal: any = null;

        if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === "object") {
            if ("text" in cell.value) {
              cellVal = (cell.value as any).text;
            } else if ("result" in cell.value) {
              // formula result
              cellVal = (cell.value as any).result;
            } else if (cell.value instanceof Date) {
              cellVal = cell.value.toISOString().split("T")[0];
            } else {
              cellVal = String(cell.value);
            }
          } else {
            cellVal = cell.value;
          }
        }

        // Clean cell value
        if (cellVal !== null && cellVal !== undefined) {
          if (typeof cellVal === "string") {
            const trimmed = cellVal.trim();
            if (trimmed === "" || trimmed.toUpperCase() === "N/A" || trimmed.toUpperCase() === "NULL") {
              cellVal = null; // NEVER store "N/A" or empty string as non-null
            } else {
              cellVal = trimmed;
              hasAnyValue = true;
            }
          } else {
            hasAnyValue = true;
          }
        } else {
          cellVal = null;
        }

        rawValues[header] = cellVal;
      }

      if (hasAnyValue) {
        rows.push({
          rowNumber: r,
          rawValues,
        });
      }
    }

    return {
      headers,
      rows,
      totalRows: rows.length,
    };
  }

  /**
   * Parse CSV with strict column alignment (empty tokens ,, remain null)
   */
  private static async parseCsvBuffer(buffer: Buffer): Promise<ParseResult> {
    const csvContent = buffer.toString("utf-8");

    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
    });

    if (parsed.errors && parsed.errors.length > 0) {
      // If critical error
      const fatal = parsed.errors.find((e) => e.type === "Delimiter" || e.code === "UndetectableDelimiter");
      if (fatal) {
        throw new Error(`CSV Parsing error: ${fatal.message}`);
      }
    }

    const headers = (parsed.meta.fields || []).map((h) => h.trim()).filter(Boolean);
    if (headers.length === 0) {
      throw new Error("No column headers detected in CSV file.");
    }

    const rows: ParsedRow[] = [];

    parsed.data.forEach((rawRow: any, idx: number) => {
      let hasAnyValue = false;
      const rawValues: Record<string, any> = {};

      headers.forEach((h) => {
        let val = rawRow[h];
        if (val === undefined || val === null) {
          rawValues[h] = null;
        } else if (typeof val === "string") {
          const trimmed = val.trim();
          if (trimmed === "" || trimmed.toUpperCase() === "N/A" || trimmed.toUpperCase() === "NULL") {
            rawValues[h] = null;
          } else {
            rawValues[h] = trimmed;
            hasAnyValue = true;
          }
        } else {
          rawValues[h] = val;
          hasAnyValue = true;
        }
      });

      if (hasAnyValue) {
        rows.push({
          rowNumber: idx + 2, // header is row 1
          rawValues,
        });
      }
    });

    return {
      headers,
      rows,
      totalRows: rows.length,
    };
  }
}

