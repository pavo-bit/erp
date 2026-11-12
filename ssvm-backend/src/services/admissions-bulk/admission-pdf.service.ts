/**
 * ssvm-backend/src/services/admissions-bulk/admission-pdf.service.ts
 *
 * Generates genuine, standards-compliant binary PDF documents (%PDF-1.4)
 * for official SSVM ERP paper admission forms with authoritative snapshot
 * metadata resolution and zero client-side fee overrides.
 */

import prisma from "../../lib/prisma";
import { AdmissionFeeConfigService } from "./admission-fee-config.service";
import { AdmissionPaperFormsService } from "./admission-paper-forms.service";
import logger from "../../lib/logger";

export interface AdmissionPdfOptions {
  applicationFee?: number;
  formNumber?: string;
  academicSession?: string;
}

export class AdmissionPdfService {
  /**
   * Generates a genuine, standards-compliant A4 portrait binary PDF Buffer (%PDF-1.4)
   * for New Admission, Re-admission, or Transfer Admission.
   */
  public static async generateFormPdf(
    schoolId: string,
    formType: "NEW" | "READMISSION" | "TRANSFER",
    options: AdmissionPdfOptions = {}
  ): Promise<Buffer> {
    let school = null;
    try {
      school = await prisma.school.findUnique({ where: { id: schoolId } });
    } catch (err) {
      logger.warn({ err, schoolId }, "Failed to find school for PDF generation, using fallback");
    }
    const schoolName = (school?.name || "Shri Shiksha Vikash Mandir (SSVM)").toUpperCase();
    const affiliation = school?.code || "SSVM-ODISHA";

    // Authoritatively resolve fee and metadata from snapshot or active configuration
    const resolved = await AdmissionPaperFormsService.resolveFormOptions(schoolId, formType, {
      academicSession: options.academicSession,
      formNumber: options.formNumber,
    });

    const fee = resolved.fee;
    const sessionName = resolved.sessionName;
    const formNumber = resolved.formNumber;
    const applicantName = resolved.applicantName;
    const isIssued = resolved.isIssued;

    // Build the visual text content and vector drawing commands
    const title =
      formType === "NEW"
        ? "STUDENT ADMISSION APPLICATION FORM (NEW ADMISSION)"
        : formType === "READMISSION"
        ? "STUDENT RE-ADMISSION APPLICATION FORM"
        : "INCOMING TRANSFER STUDENT ADMISSION FORM";

    const streams: string[] = [];

    // PDF Graphic stream
    // Page dimensions: 595.28 x 841.89 (A4 Portrait)
    // Origin (0,0) is bottom-left. Top margin starts around y = 810.
    let s = "";

    // Helper closures
    const strokeRect = (x: number, y: number, w: number, h: number, lineWidth = 1) => {
      s += `${lineWidth} w 0.2 0.2 0.2 RG ${x} ${y} ${w} ${h} re S\n`;
    };
    const fillRect = (x: number, y: number, w: number, h: number, r: number, g: number, b: number) => {
      s += `${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f\n`;
    };
    const drawLine = (x1: number, y1: number, x2: number, y2: number, lineWidth = 0.5) => {
      s += `${lineWidth} w 0.4 0.4 0.4 RG ${x1} ${y1} m ${x2} ${y2} l S\n`;
    };
    const drawText = (text: string, x: number, y: number, size = 9, font = "/F1", color = "0.05 0.09 0.16") => {
      const clean = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      s += `BT ${font} ${size} Tf ${color} rg ${x} ${y} Td (${clean}) Tj ET\n`;
    };

    // 1. Outer Border
    strokeRect(28, 28, 539.28, 785.89, 1.5);

    // 2. Header Area
    drawText(schoolName, 297.64 - (schoolName.length * 3.8), 790, 14, "/F2", "0.06 0.09 0.16");
    const sub = `Affiliation / Code: ${affiliation}  |  Academic Session: ${sessionName}`;
    drawText(sub, 297.64 - (sub.length * 2.2), 776, 8, "/F1", "0.28 0.33 0.41");

    // Title banner
    fillRect(36, 750, 523.28, 18, 0.06, 0.09, 0.16);
    drawText(title, 297.64 - (title.length * 2.6), 755, 9.5, "/F2", "1 1 1");

    // Fee Notice banner (Right top)
    const feeNotice = `Application Fee: INR ${fee} (Non-refundable)`;
    drawText(feeNotice, 370, 776, 8, "/F2", "0.02 0.47 0.34");

    // 2.1 Issuance Serial & Applicant Bar
    if (isIssued) {
      drawText(`Official Form Serial: ${formNumber} (OFFICIALLY ISSUED)`, 42, 736, 8, "/F2", "0.06 0.25 0.5");
      if (applicantName) {
        drawText(`Candidate: ${applicantName}`, 290, 736, 8, "/F2", "0.06 0.25 0.5");
      }
    } else {
      drawText("Form Serial: [ BLANK OFFICIAL TEMPLATE - NOT ISSUED ]", 42, 736, 7.5, "/F1", "0.45 0.45 0.45");
    }

    // 3. Photo Box (Right side: 32mm x 40mm => ~91 x 113 pt)
    strokeRect(465, 620, 90, 113, 1);
    drawText("Affix Recent", 486, 680, 7.5, "/F1", "0.4 0.4 0.4");
    drawText("Passport Photo", 482, 668, 7.5, "/F1", "0.4 0.4 0.4");
    drawText("(32mm x 40mm)", 483, 656, 6.5, "/F1", "0.5 0.5 0.5");

    // 4. Section 1: Placement & Student Information
    drawText("1. Class Applied For: [ Prarambha / Bodha / Class 1 to 12 ]", 42, 720, 8.5, "/F2");
    drawLine(42, 705, 450, 705);
    drawText("2. Student Full Name (in BLOCK LETTERS as per Birth Certificate):", 42, 708, 8, "/F1");

    drawText("3. Date of Birth (DD/MM/YYYY):", 42, 685, 8, "/F1");
    strokeRect(170, 680, 100, 16);
    drawText("4. Gender: [ ] Male   [ ] Female   [ ] Other", 285, 685, 8, "/F1");

    drawText("5. Blood Group: [ A+ / A- / B+ / B- / AB+ / AB- / O+ / O- ]", 42, 662, 8, "/F1");
    drawText("6. Nationality: Indian", 285, 662, 8, "/F1");

    drawText("7. Mother Tongue: ____________________", 42, 639, 8, "/F1");
    drawText("8. Category: [ ] Gen  [ ] OBC  [ ] SC  [ ] ST", 285, 639, 8, "/F1");

    drawText("9. Permanent Education Number (PEN) (if allotted): ________________________", 42, 616, 8, "/F1");

    // Re-admission / Transfer specific banner
    if (formType === "READMISSION") {
      fillRect(42, 594, 510, 16, 0.94, 0.96, 1.0);
      drawText("* Permanent SSVM Identity: Existing Admission No: __________________ (Retained)", 48, 598, 8, "/F2", "0.12 0.25 0.69");
    } else if (formType === "TRANSFER") {
      fillRect(42, 594, 510, 16, 0.94, 0.99, 0.96);
      drawText("* Transfer Background: Previous School: _______________________ TC No: ______________", 48, 598, 8, "/F2", "0.02 0.37 0.24");
    }

    // 5. Parent / Guardian Section
    const parentSectionY = formType === "NEW" ? 594 : 574;
    fillRect(36, parentSectionY, 523.28, 14, 0.94, 0.95, 0.96);
    drawText("PARENT & GUARDIAN INFORMATION", 42, parentSectionY + 3.5, 8, "/F2", "0.06 0.09 0.16");

    // Table Header
    strokeRect(42, parentSectionY - 65, 510, 60);
    drawLine(42, parentSectionY - 20, 552, parentSectionY - 20);
    drawLine(42, parentSectionY - 35, 552, parentSectionY - 35);
    drawLine(42, parentSectionY - 50, 552, parentSectionY - 50);

    // Columns
    drawLine(150, parentSectionY - 65, 150, parentSectionY - 5);
    drawLine(285, parentSectionY - 65, 285, parentSectionY - 5);
    drawLine(420, parentSectionY - 65, 420, parentSectionY - 5);

    drawText("Particulars", 50, parentSectionY - 16, 7.5, "/F2");
    drawText("Father", 160, parentSectionY - 16, 7.5, "/F2");
    drawText("Mother", 295, parentSectionY - 16, 7.5, "/F2");
    drawText("Local Guardian", 430, parentSectionY - 16, 7.5, "/F2");

    drawText("Full Name", 50, parentSectionY - 31, 7.5, "/F1");
    drawText("Primary Phone", 50, parentSectionY - 46, 7.5, "/F1");
    drawText("Occupation & Income", 50, parentSectionY - 61, 7.5, "/F1");

    // 6. Address & Jurisdiction
    const addrY = parentSectionY - 85;
    fillRect(36, addrY, 523.28, 14, 0.94, 0.95, 0.96);
    drawText("RESIDENTIAL ADDRESS & CONTACT DETAILS", 42, addrY + 3.5, 8, "/F2", "0.06 0.09 0.16");

    strokeRect(42, addrY - 45, 250, 40);
    drawText("Present Residential Address:", 46, addrY - 12, 7.5, "/F2");
    drawText("Police Station: ______________ Dist: ____________ PIN: ______", 46, addrY - 40, 7, "/F1");

    strokeRect(302, addrY - 45, 250, 40);
    drawText("Permanent Address:", 306, addrY - 12, 7.5, "/F2");
    drawText("State: ___________________ Emergency Mobile: ____________", 306, addrY - 40, 7, "/F1");

    // 7. Facilities & Document Checklist
    const facY = addrY - 65;
    fillRect(36, facY, 523.28, 14, 0.94, 0.95, 0.96);
    drawText("INSTITUTIONAL FACILITIES & SUPPORTING DOCUMENTS", 42, facY + 3.5, 8, "/F2", "0.06 0.09 0.16");

    drawText("[ ] Transport Facility (Stop: ____________)   [ ] Hostel Facility   [ ] Special Dietary / Medical", 42, facY - 14, 7.5, "/F1");
    drawText("Document Checklist: [ ] Birth Cert   [ ] Aadhaar   [ ] Previous Report Card   [ ] Photos (4)   [ ] TC", 42, facY - 26, 7.5, "/F1");

    // 8. Declaration & Signatures
    const decY = facY - 45;
    drawText("PARENT / GUARDIAN DECLARATION:", 42, decY, 8, "/F2");
    const dec1 = "I declare that all particulars furnished above are authentic and complete. I agree to abide by the institutional";
    const dec2 = "code of conduct and acknowledge that admission is subject to physical verification of original records.";
    drawText(dec1, 42, decY - 11, 7, "/F1");
    drawText(dec2, 42, decY - 20, 7, "/F1");

    // Signature lines
    drawLine(42, decY - 50, 160, decY - 50);
    drawText("Date & Place", 75, decY - 60, 7.5, "/F2");

    drawLine(220, decY - 50, 350, decY - 50);
    drawText("Signature of Father", 240, decY - 60, 7.5, "/F2");

    drawLine(410, decY - 50, 540, decY - 50);
    drawText("Signature of Mother / Guardian", 420, decY - 60, 7.5, "/F2");

    // 9. Office Use Only Box (Mandatory Bottom Section)
    const offY = decY - 78;
    strokeRect(36, offY - 65, 523.28, 70, 1.2);
    fillRect(36, offY - 3, 523.28, 12, 0.1, 0.15, 0.22);
    drawText("FOR OFFICIAL SCHOOL OFFICE USE ONLY (PHYSICAL ADMISSION REGISTER VERIFICATION)", 75, offY, 7.5, "/F2", "1 1 1");

    const appRefText = isIssued ? `Application Ref: ${formNumber}` : "Application Ref: ______________________";
    drawText(appRefText, 44, offY - 17, 7.5, "/F2");
    drawText("Admission Date: ____________________", 215, offY - 17, 7.5, "/F1");
    drawText("Allotted Class & Sec: _______________", 380, offY - 17, 7.5, "/F1");

    drawText("Approval Status: [ ] Approved  [ ] Rejected", 44, offY - 32, 7.5, "/F1");
    drawText("Allotted Roll No: __________________", 215, offY - 32, 7.5, "/F1");
    drawText("Fee Receipt / Ref No: _______________", 380, offY - 32, 7.5, "/F1");

    drawText("Permanent Admission No: ___________________________ (Assigned upon physical approval)", 44, offY - 47, 7.5, "/F2", "0.06 0.25 0.5");

    drawText("Physical School Seal", 44, offY - 60, 6.5, "/F1", "0.4 0.4 0.4");
    drawText(`Application Fee: INR ${fee} (Non-refundable)`, 215, offY - 60, 7.5, "/F2", "0.02 0.47 0.34");
    drawText("Authorized Signature of Principal / Admission Incharge", 360, offY - 60, 7, "/F2");

    // 10. Footer
    drawText(`Form Reference: SSVM-ADM-${formType} | Serial: ${formNumber || "BLANK-UNISSUED"}`, 36, 16, 7, "/F1", "0.5 0.5 0.5");
    drawText(`Printed / Issued on: ${new Date().toLocaleDateString("en-IN")}`, 240, 16, 7, "/F1", "0.5 0.5 0.5");
    drawText("Page 1 of 1 (Official)", 495, 16, 7, "/F1", "0.5 0.5 0.5");

    streams.push(s);

    // Assemble PDF 1.4 objects
    return this.assemblePdfBuffer(streams);
  }

  /**
   * Pure Node.js standards-compliant PDF assembler
   */
  private static assemblePdfBuffer(pageStreams: string[]): Buffer {
    const objects: string[] = [];
    const pageCount = pageStreams.length;

    // Object 1: Catalog
    objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");

    // Object 2: Pages
    const kids = Array.from({ length: pageCount }, (_, i) => `${i * 3 + 3} 0 R`).join(" ");
    objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj`);

    // For each page: Page Object, Content Stream Object, Font Objects
    for (let i = 0; i < pageCount; i++) {
      const pageObjNum = i * 3 + 3;
      const contentObjNum = i * 3 + 4;
      const fontObjNum = i * 3 + 5;
      const fontBoldObjNum = i * 3 + 6;

      const content = `q\n${pageStreams[i]}\nQ`;

      objects.push(
        `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R /F2 ${fontBoldObjNum} 0 R >> >> >>\nendobj`
      );

      objects.push(
        `${contentObjNum} 0 obj\n<< /Length ${Buffer.byteLength(content, "utf-8")} >>\nstream\n${content}\nendstream\nendobj`
      );

      objects.push(
        `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`
      );

      objects.push(
        `${fontBoldObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`
      );
    }

    let body = "%PDF-1.4\n";
    const xref: number[] = [0];

    for (const obj of objects) {
      xref.push(Buffer.byteLength(body, "utf-8"));
      body += obj + "\n";
    }

    const xrefOffset = Buffer.byteLength(body, "utf-8");
    body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

    for (let i = 1; i <= objects.length; i++) {
      body += `${String(xref[i]).padStart(10, "0")} 00000 n \n`;
    }

    body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(body, "utf-8");
  }
}
